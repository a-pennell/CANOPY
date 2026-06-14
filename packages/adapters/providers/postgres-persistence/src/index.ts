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
  AdapterAuditRecord,
  CanonicalObjectRefRecord,
  JsonValue,
  ProjectionStateRecord
} from "@canopy/contracts-database";
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

export interface PostgresIdempotencyRow {
  readonly idempotencyKey: string;
  readonly refKey: string;
  readonly requestHash: string;
}

export interface PostgresPersistencePrototypeTables {
  readonly objectSnapshots: readonly PostgresObjectSnapshotRow[];
  readonly objectRefs: readonly CanonicalObjectRefRecord[];
  readonly idempotencyKeys: readonly PostgresIdempotencyRow[];
  readonly projectionStates: readonly ProjectionStateRecord[];
  readonly adapterAudits: readonly AdapterAuditRecord[];
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
  private readonly objectRefs = new Map<string, CanonicalObjectRefRecord>();
  private readonly idempotencyKeys = new Map<string, PostgresIdempotencyRow>();
  private readonly projectionStates = new Map<CanopyId, ProjectionStateRecord>();
  private readonly adapterAudits = new Map<CanopyId, AdapterAuditRecord>();
  private transactionSequence = 0;
  private revisionSequence = 0;
  private auditSequence = 0;

  constructor(options: PostgresPersistencePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const snapshot of options.seedSnapshots ?? []) {
      const writtenAt = snapshot.updatedAt ?? this.now();
      const row = this.rowFromWrite(
        {
          snapshot,
          authorityRefs: []
        },
        this.nextRevision()
      );
      this.snapshots.set(row.refKey, row);
      this.upsertObjectRef(snapshot.ref, writtenAt);
      this.updateProjectionState(row, writtenAt);
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
    const scopeRefs = query.scopeRefs?.map(refKey);
    const rows = [...this.snapshots.values()]
      .filter((row) => requestedRefs === undefined || requestedRefs.includes(row.refKey))
      .filter(
        (row) =>
          scopeRefs === undefined ||
          scopeRefs.includes(row.refKey) ||
          row.authorityRefs.some((ref) => scopeRefs.includes(refKey(ref)))
      )
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
    const startedAt = this.now();
    if (write.snapshot.objectType !== write.snapshot.ref.type) {
      const message = "Snapshot objectType must match the canonical object ref type.";
      this.auditWrite(write, "failed", startedAt, {
        errors: [message],
        metadata: { reason: "object-type-mismatch" }
      });
      return failure("validation_failed", message, ["snapshot", "objectType"]);
    }

    if (write.authorityRefs.length === 0) {
      const message = "Postgres persistence writes require authority refs.";
      this.auditWrite(write, "failed", startedAt, {
        errors: [message],
        metadata: { reason: "missing-authority-refs" }
      });
      return failure("forbidden", "Postgres persistence writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const key = refKey(write.snapshot.ref);
    const existing = this.snapshots.get(key);
    const requestHash = stableStringify(write);
    const idempotency = write.idempotencyKey === undefined
      ? undefined
      : this.idempotencyKeys.get(write.idempotencyKey);

    if (idempotency !== undefined) {
      if (idempotency.refKey === key && idempotency.requestHash === requestHash && existing !== undefined) {
        this.auditWrite(write, "skipped", startedAt, {
          metadata: {
            reason: "idempotent-replay",
            idempotencyKey: write.idempotencyKey ?? null
          }
        });
        return ok(this.snapshotFromRow(existing));
      }

      const message = "Idempotency key was already used for a different object write.";
      this.auditWrite(write, "failed", startedAt, {
        errors: [message],
        metadata: {
          reason: "idempotency-key-conflict",
          idempotencyKey: write.idempotencyKey ?? null
        }
      });
      return failure("conflict", message, ["idempotencyKey"]);
    }

    if (
      write.expectedVersion !== undefined &&
      existing !== undefined &&
      existing.revision !== write.expectedVersion
    ) {
      const message = `Expected object revision ${write.expectedVersion} but found ${existing.revision}.`;
      this.auditWrite(write, "failed", startedAt, {
        errors: [message],
        metadata: { reason: "expected-version-conflict" }
      });
      return failure(
        "conflict",
        message,
        ["expectedVersion"]
      );
    }

    if (write.expectedVersion !== undefined && existing === undefined && write.expectedVersion !== 0) {
      const message = "Expected an existing object revision but no object row exists.";
      this.auditWrite(write, "failed", startedAt, {
        errors: [message],
        metadata: { reason: "missing-expected-row" }
      });
      return failure(
        "conflict",
        message,
        ["expectedVersion"]
      );
    }

    const row = this.rowFromWrite(write, this.nextRevision());
    this.snapshots.set(key, row);
    this.upsertObjectRef(row.ref, row.updatedAt ?? startedAt);
    for (const authorityRef of row.authorityRefs) {
      this.upsertObjectRef(authorityRef, row.updatedAt ?? startedAt);
    }
    this.updateProjectionState(row, row.updatedAt ?? startedAt);
    if (write.idempotencyKey !== undefined) {
      this.idempotencyKeys.set(write.idempotencyKey, freeze({
        idempotencyKey: write.idempotencyKey,
        refKey: key,
        requestHash
      }));
    }
    this.auditWrite(write, "succeeded", startedAt, {
      metadata: {
        idempotencyKey: write.idempotencyKey ?? null,
        revision: row.revision
      }
    });

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
        .map((row) => freeze(row)),
      objectRefs: sortedById(this.objectRefs.values()).map((record) => freeze(record)),
      idempotencyKeys: sortedByString(
        this.idempotencyKeys.values(),
        (row) => row.idempotencyKey
      ).map((row) => freeze(row)),
      projectionStates: sortedById(this.projectionStates.values()).map((record) => freeze(record)),
      adapterAudits: sortedById(this.adapterAudits.values()).map((record) => freeze(record))
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

  private upsertObjectRef(ref: ObjectRef, updatedAt: IsoDateTime): CanonicalObjectRefRecord {
    const key = refKey(ref);
    const existing = this.objectRefs.get(key);
    const record: CanonicalObjectRefRecord = freeze(
      withoutUndefined({
        id: `object-ref.${ref.namespace}.${ref.type}.${ref.id}`,
        kind: "canonical-object-ref" as const,
        schemaVersion: 1,
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
        ref: cloneRef(ref),
        objectId: ref.id,
        objectType: ref.type,
        namespace: ref.namespace,
        lifecycleStatus: ref.lifecycleStatus,
        source: ref.source,
        supersedes: ref.supersedes ?? [],
        relationshipRefs: existing?.relationshipRefs ?? []
      }) as CanonicalObjectRefRecord
    );
    this.objectRefs.set(key, record);
    return record;
  }

  private updateProjectionState(
    row: PostgresObjectSnapshotRow,
    processedAt: IsoDateTime
  ): ProjectionStateRecord {
    const record: ProjectionStateRecord = freeze({
      id: "projection-state.postgres-persistence.object-snapshots",
      kind: "projection-state",
      schemaVersion: 1,
      createdAt:
        this.projectionStates.get("projection-state.postgres-persistence.object-snapshots")
          ?.createdAt ?? processedAt,
      updatedAt: processedAt,
      projectionName: "postgres-persistence.object-snapshots",
      projectionVersion: postgresPersistenceAdapterDescriptor.version,
      status: "current",
      checkpoint: {
        processedAt,
        cursor: String(row.revision),
        sequence: row.revision
      },
      processedEventCount: row.revision,
      rebuiltAt: processedAt
    });
    this.projectionStates.set(record.id, record);
    return record;
  }

  private auditWrite(
    write: CanonicalObjectWrite,
    status: AdapterAuditRecord["status"],
    startedAt: IsoDateTime,
    details: {
      readonly errors?: readonly string[];
      readonly warnings?: readonly string[];
      readonly metadata?: JsonValue;
    } = {}
  ): AdapterAuditRecord {
    const completedAt = this.now();
    const record: AdapterAuditRecord = freeze({
      id: `adapter-audit.postgres-persistence.${++this.auditSequence}`,
      kind: "adapter-audit",
      schemaVersion: 1,
      createdAt: completedAt,
      adapterName: postgresPersistenceAdapterDescriptor.id,
      direction: "ingress",
      operation: "writeObject",
      status,
      startedAt,
      completedAt,
      targetRef: cloneRef(write.snapshot.ref),
      eventIds: [],
      outboxIds: [],
      warnings: details.warnings ?? [],
      errors: details.errors ?? [],
      metadata: details.metadata ?? {}
    });
    this.adapterAudits.set(record.id, record);
    return record;
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

function sortedById<TValue extends { readonly id: string }>(
  values: Iterable<TValue>
): readonly TValue[] {
  return sortedByString(values, (value) => value.id);
}

function sortedByString<TValue>(
  values: Iterable<TValue>,
  value: (entry: TValue) => string
): readonly TValue[] {
  return [...values].sort((left, right) => compareStrings(value(left), value(right)));
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(ref);
}

function cloneRecord<TValue extends Readonly<Record<string, unknown>>>(value: TValue): TValue {
  return freeze(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
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
