import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  AppendEventRequest,
  EventQuery,
  EventReplayCursor,
  EventStoreAdapter
} from "@canopy/contracts-adapters";
import type {
  CanopyEvent,
  CanopyEventType,
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

export interface PostgresEventStorePrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedEvents?: readonly CanopyEvent[];
}

export interface PostgresEventRow {
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly occurredAt: IsoDateTime;
  readonly recordedAt: IsoDateTime;
  readonly event: CanopyEvent;
  readonly sequence: number;
  readonly idempotencyKey?: string;
}

export interface PostgresEventStorePrototypeTables {
  readonly events: readonly PostgresEventRow[];
}

export const postgresEventStoreAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "event-store";
} = {
  id: "adapter.provider.postgres.event-store",
  kind: "event-store",
  name: "Postgres event store adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["append", "read", "replay", "transaction", "audit"],
  supportedObjectTypes: [],
  supportedEventTypes: []
};

export const postgresEventStoreAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.event-store.postgres",
  descriptor: postgresEventStoreAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/postgres-event-store",
  conformanceSuiteKind: "event-store",
  productionGates: [
    "adapter.event-store.append-only",
    "adapter.event-store.event-order-stable"
  ]
};

export function postgresEventStoreAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresEventStoreAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the postgres-shaped in-memory prototype; no external Postgres client is bound."
    ]
  };
}

export function createPostgresEventStoreAdapter(
  options: PostgresEventStorePrototypeOptions = {}
): PostgresEventStoreAdapter {
  return new PostgresEventStoreAdapter(options);
}

export class PostgresEventStoreAdapter implements EventStoreAdapter {
  readonly descriptor = postgresEventStoreAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly events = new Map<CanopyId, PostgresEventRow>();
  private readonly idempotencyKeys = new Map<string, CanopyId>();
  private sequence = 0;

  constructor(options: PostgresEventStorePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const event of options.seedEvents ?? []) {
      const row = this.rowFromEvent({ event }, this.nextSequence());
      this.events.set(event.id, row);
    }
  }

  async health(): Promise<AdapterHealth> {
    return postgresEventStoreAdapterHealth(this.now());
  }

  async appendEvent(request: AppendEventRequest): Promise<AdapterResult<CanopyEvent>> {
    const idempotentEventId =
      request.idempotencyKey === undefined
        ? undefined
        : this.idempotencyKeys.get(request.idempotencyKey);

    if (idempotentEventId !== undefined) {
      const existing = this.events.get(idempotentEventId);
      if (
        existing !== undefined &&
        stableStringify(existing.event) === stableStringify(request.event)
      ) {
        return ok(cloneEvent(existing.event));
      }

      return failure(
        "conflict",
        "Idempotency key was already used for a different event append.",
        ["idempotencyKey"]
      );
    }

    const existing = this.events.get(request.event.id);
    if (existing !== undefined) {
      if (stableStringify(existing.event) === stableStringify(request.event)) {
        if (request.idempotencyKey !== undefined) {
          this.idempotencyKeys.set(request.idempotencyKey, request.event.id);
        }
        return ok(cloneEvent(existing.event));
      }

      return failure(
        "append_only_violation",
        `Event ${request.event.id} already exists and cannot be mutated.`,
        ["event", "id"]
      );
    }

    const previous = this.eventsForObject(request.event.objectRef).at(-1);
    if (
      request.expectedPreviousEventId !== undefined &&
      previous?.eventId !== request.expectedPreviousEventId
    ) {
      return failure("conflict", "Expected previous event did not match.", [
        "expectedPreviousEventId"
      ]);
    }

    const row = this.rowFromEvent(request, this.nextSequence());
    this.events.set(row.eventId, row);
    if (request.idempotencyKey !== undefined) {
      this.idempotencyKeys.set(request.idempotencyKey, row.eventId);
    }

    return ok(cloneEvent(row.event));
  }

  async getEvent(eventId: CanopyId): Promise<AdapterResult<CanopyEvent | undefined>> {
    return ok(cloneOptionalEvent(this.events.get(eventId)?.event));
  }

  async queryEvents(query: EventQuery): Promise<AdapterResult<AdapterPage<CanopyEvent>>> {
    const rows = this.sortedEvents()
      .filter((row) => query.objectRef === undefined || sameRef(row.objectRef, query.objectRef))
      .filter(
        (row) =>
          query.relatedRef === undefined ||
          row.relatedRefs.some((ref) => sameRef(ref, query.relatedRef as ObjectRef))
      )
      .filter(
        (row) => query.eventTypes === undefined || query.eventTypes.includes(row.eventType)
      )
      .filter(
        (row) => query.occurredAfter === undefined || row.occurredAt > query.occurredAfter
      )
      .filter(
        (row) => query.occurredBefore === undefined || row.occurredAt < query.occurredBefore
      );

    return ok(page(rows.map((row) => cloneEvent(row.event)), query.page));
  }

  async *replay(cursor: EventReplayCursor): AsyncIterable<AdapterResult<CanopyEvent>> {
    const offset = cursor.cursor === undefined ? 0 : Number.parseInt(cursor.cursor, 10);
    const startOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const events = this.sortedEvents().filter(
      (row) => cursor.fromOccurredAt === undefined || row.occurredAt > cursor.fromOccurredAt
    );
    const fromEventOffset =
      cursor.fromEventId === undefined
        ? startOffset
        : Math.max(
            startOffset,
            events.findIndex((row) => row.eventId === cursor.fromEventId) + 1
          );

    for (const row of events.slice(fromEventOffset)) {
      yield ok(cloneEvent(row.event));
    }
  }

  snapshotTables(): PostgresEventStorePrototypeTables {
    return {
      events: this.sortedEvents().map((row) => freeze(row))
    };
  }

  private rowFromEvent(
    request: AppendEventRequest,
    sequence: number
  ): PostgresEventRow {
    return freeze(
      withoutUndefined({
      eventId: request.event.id,
      eventType: request.event.type,
      objectRef: cloneRef(request.event.objectRef),
      relatedRefs: request.event.relatedRefs.map(cloneRef),
      occurredAt: request.event.occurredAt,
      recordedAt: this.now(),
      event: cloneEvent(request.event),
      sequence,
      idempotencyKey: request.idempotencyKey
      }) as PostgresEventRow
    );
  }

  private eventsForObject(ref: ObjectRef): readonly PostgresEventRow[] {
    return this.sortedEvents().filter((row) => sameRef(row.objectRef, ref));
  }

  private sortedEvents(): readonly PostgresEventRow[] {
    return [...this.events.values()].sort(compareEventRows);
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
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

function compareEventRows(left: PostgresEventRow, right: PostgresEventRow): number {
  const occurred = compareStrings(left.occurredAt, right.occurredAt);
  if (occurred !== 0) {
    return occurred;
  }

  return left.sequence - right.sequence;
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(ref);
}

function cloneEvent(event: CanopyEvent): CanopyEvent {
  return freeze(event);
}

function cloneOptionalEvent(event: CanopyEvent | undefined): CanopyEvent | undefined {
  return event === undefined ? undefined : cloneEvent(event);
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
