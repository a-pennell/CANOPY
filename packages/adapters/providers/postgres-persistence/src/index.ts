import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  CanonicalObjectQuery,
  CanonicalObjectSnapshot,
  CanonicalObjectWrite,
  PersistenceAdapter
} from "@canopy/contracts-adapters";
import type {
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export interface PostgresPersistencePrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedSnapshots?: readonly CanonicalObjectSnapshot[];
}

export interface PostgresObjectSnapshotRow {
  readonly refKey: string;
  readonly ref: ObjectRef;
  readonly objectType: ObjectRef["type"];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly contentHash?: string;
  readonly schemaVersion: number;
  readonly updatedAt?: IsoDateTime;
  readonly authorityRefs: readonly ObjectRef[];
  readonly idempotencyKey?: string;
  readonly revision: number;
}

export interface PostgresPersistencePrototypeTables {
  readonly objectSnapshots: readonly PostgresObjectSnapshotRow[];
}

export const postgresPersistenceAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "persistence";
} = {
  id: "adapter.provider.postgres.persistence",
  kind: "persistence",
  name: "Postgres persistence adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "transaction", "audit"],
  supportedObjectTypes: [],
  supportedEventTypes: []
};

export const postgresPersistenceAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.persistence.postgres",
  descriptor: postgresPersistenceAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/postgres-persistence",
  conformanceSuiteKind: "persistence",
  productionGates: [
    "adapter.persistence.object-ref-integrity",
    "adapter.persistence.stewardship-metadata-preserved"
  ]
};

export function postgresPersistenceAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresPersistenceAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the postgres-shaped in-memory prototype; no external Postgres client is bound."
    ]
  };
}

export function createPostgresPersistenceAdapter(
  options: PostgresPersistencePrototypeOptions = {}
): PostgresPersistenceAdapter {
  return new PostgresPersistenceAdapter(options);
}

export class PostgresPersistenceAdapter implements PersistenceAdapter {
  readonly descriptor = postgresPersistenceAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly snapshots = new Map<string, PostgresObjectSnapshotRow>();
  private readonly idempotencyKeys = new Map<string, string>();
  private transactionSequence = 0;
  private revisionSequence = 0;

  constructor(options: PostgresPersistencePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const snapshot of options.seedSnapshots ?? []) {
      const row = this.rowFromWrite(
        {
          snapshot,
          authorityRefs: []
        },
        this.nextRevision()
      );
      this.snapshots.set(row.refKey, row);
    }
  }

  async health(): Promise<AdapterHealth> {
    return postgresPersistenceAdapterHealth(this.now());
  }

  async readObject(
    ref: ObjectRef
  ): Promise<AdapterResult<CanonicalObjectSnapshot | undefined>> {
    const row = this.snapshots.get(refKey(ref));
    return ok(row === undefined ? undefined : this.snapshotFromRow(row));
  }

  async queryObjects(
    query: CanonicalObjectQuery
  ): Promise<AdapterResult<AdapterPage<CanonicalObjectSnapshot>>> {
    const requestedRefs = query.refs?.map(refKey);
    const rows = [...this.snapshots.values()]
      .filter((row) => requestedRefs === undefined || requestedRefs.includes(row.refKey))
      .filter(
        (row) =>
          query.objectTypes === undefined || query.objectTypes.includes(row.objectType)
      )
      .filter(
        (row) =>
          query.lifecycleStatuses === undefined ||
          query.lifecycleStatuses.includes(row.ref.lifecycleStatus)
      )
      .filter(
        (row) => query.updatedAfter === undefined || (row.updatedAt ?? "") > query.updatedAfter
      )
      .sort((left, right) => compareStrings(left.refKey, right.refKey));

    return ok(page(rows.map((row) => this.snapshotFromRow(row)), query.page));
  }

  async writeObject(
    write: CanonicalObjectWrite
  ): Promise<AdapterResult<CanonicalObjectSnapshot>> {
    if (write.authorityRefs.length === 0) {
      return failure("forbidden", "Postgres persistence writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const key = refKey(write.snapshot.ref);
    const existing = this.snapshots.get(key);

    if (
      write.idempotencyKey !== undefined &&
      this.idempotencyKeys.get(write.idempotencyKey) === key &&
      existing !== undefined
    ) {
      return ok(this.snapshotFromRow(existing));
    }

    if (
      write.expectedVersion !== undefined &&
      existing !== undefined &&
      existing.revision !== write.expectedVersion
    ) {
      return failure(
        "conflict",
        `Expected object revision ${write.expectedVersion} but found ${existing.revision}.`,
        ["expectedVersion"]
      );
    }

    if (write.expectedVersion !== undefined && existing === undefined && write.expectedVersion !== 0) {
      return failure(
        "conflict",
        "Expected an existing object revision but no object row exists.",
        ["expectedVersion"]
      );
    }

    const row = this.rowFromWrite(write, this.nextRevision());
    this.snapshots.set(key, row);
    if (write.idempotencyKey !== undefined) {
      this.idempotencyKeys.set(write.idempotencyKey, key);
    }

    return ok(this.snapshotFromRow(row));
  }

  async withTransaction<TValue>(
    authorityRefs: readonly ObjectRef[],
    work: (transaction: {
      readonly id: CanopyId;
      readonly startedAt: IsoDateTime;
      readonly authorityRefs: readonly ObjectRef[];
    }) => Promise<TValue>
  ): Promise<AdapterResult<TValue>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Postgres persistence transactions require authority refs.", [
        "authorityRefs"
      ]);
    }

    try {
      return ok(
        await work({
          id: `postgres.transaction.${++this.transactionSequence}`,
          startedAt: this.now(),
          authorityRefs: authorityRefs.map(cloneRef)
        })
      );
    } catch (error) {
      return failure(
        "transaction_failed",
        error instanceof Error ? error.message : "Postgres persistence transaction failed.",
        ["transaction"],
        true
      );
    }
  }

  snapshotTables(): PostgresPersistencePrototypeTables {
    return {
      objectSnapshots: [...this.snapshots.values()]
        .sort((left, right) => compareStrings(left.refKey, right.refKey))
        .map((row) => freeze(row))
    };
  }

  private rowFromWrite(
    write: CanonicalObjectWrite,
    revision: number
  ): PostgresObjectSnapshotRow {
    return freeze(
      withoutUndefined({
      refKey: refKey(write.snapshot.ref),
      ref: cloneRef(write.snapshot.ref),
      objectType: write.snapshot.ref.type,
      payload: cloneRecord(write.snapshot.payload),
      contentHash: write.snapshot.contentHash,
      schemaVersion: write.snapshot.schemaVersion,
      updatedAt: write.snapshot.updatedAt,
      authorityRefs: write.authorityRefs.map(cloneRef),
      idempotencyKey: write.idempotencyKey,
      revision
      }) as PostgresObjectSnapshotRow
    );
  }

  private snapshotFromRow(row: PostgresObjectSnapshotRow): CanonicalObjectSnapshot {
    return freeze(
      withoutUndefined({
      ref: cloneRef(row.ref),
      objectType: row.objectType,
      payload: cloneRecord(row.payload),
      contentHash: row.contentHash,
      schemaVersion: row.schemaVersion,
      updatedAt: row.updatedAt
      }) as CanonicalObjectSnapshot
    );
  }

  private nextRevision(): number {
    this.revisionSequence += 1;
    return this.revisionSequence;
  }
}

const defaultNow = (): IsoDateTime => new Date().toISOString();

function ok<TValue>(value: TValue): AdapterResult<TValue> {
  return { ok: true, value, errors: [] };
}

function failure<TValue>(
  code: AdapterError["code"],
  message: string,
  path: readonly string[],
  retryable = false
): AdapterResult<TValue> {
  return {
    ok: false,
    errors: [{ code, message, path, retryable }]
  };
}

function page<TValue>(
  values: readonly TValue[],
  request: AdapterPageRequest = {}
): AdapterPage<TValue> {
  const start = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const limit = request.limit ?? values.length;
  const items = values.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < values.length;
  return hasMore ? { items, nextCursor: String(nextOffset), hasMore } : { items, hasMore };
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(ref);
}

function cloneRecord<TValue extends Readonly<Record<string, unknown>>>(value: TValue): TValue {
  return freeze(value);
}

function withoutUndefined<TValue extends Record<string, unknown>>(value: TValue): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as TValue;
}

function freeze<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freeze(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        copy[key] = freeze(entry);
      }
    }
    return Object.freeze(copy) as TValue;
  }

  return value;
}
