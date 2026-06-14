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
  AdapterAuditRecord,
  CanonicalDatabaseRecord,
  CanonicalObjectRefRecord,
  CanonicalScope,
  EventRecord,
  JsonValue,
  OutboxRecord,
  ProjectionStateRecord
} from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import {
  createCanonicalSqlExecutionPlan,
  type CanonicalSqlExecutionPlan
} from "@canopy/database-runtime";

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
  readonly eventRecords: readonly EventRecord[];
  readonly objectRefs: readonly CanonicalObjectRefRecord[];
  readonly outbox: readonly OutboxRecord[];
  readonly projectionStates: readonly ProjectionStateRecord[];
  readonly adapterAudits: readonly AdapterAuditRecord[];
  readonly canonicalSqlPlan: CanonicalSqlExecutionPlan;
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
  private readonly eventRecords = new Map<CanopyId, EventRecord>();
  private readonly objectRefs = new Map<string, CanonicalObjectRefRecord>();
  private readonly outbox = new Map<CanopyId, OutboxRecord>();
  private readonly projectionStates = new Map<CanopyId, ProjectionStateRecord>();
  private readonly adapterAudits = new Map<CanopyId, AdapterAuditRecord>();
  private readonly idempotencyKeys = new Map<string, CanopyId>();
  private sequence = 0;
  private auditSequence = 0;

  constructor(options: PostgresEventStorePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const event of options.seedEvents ?? []) {
      const row = this.rowFromEvent({ event }, this.nextSequence(), this.now());
      this.events.set(event.id, row);
      this.indexCanonicalAppend(row, undefined);
    }
  }

  async health(): Promise<AdapterHealth> {
    return postgresEventStoreAdapterHealth(this.now());
  }

  async appendEvent(request: AppendEventRequest): Promise<AdapterResult<CanopyEvent>> {
    const startedAt = this.now();
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
        this.auditAppend(request, "skipped", startedAt, {
          eventIds: [existing.eventId],
          metadata: {
            reason: "idempotent-replay",
            idempotencyKey: request.idempotencyKey ?? null,
            sequence: existing.sequence
          }
        });
        return ok(cloneEvent(existing.event));
      }

      const message = "Idempotency key was already used for a different event append.";
      this.auditAppend(request, "failed", startedAt, {
        errors: [message],
        metadata: {
          reason: "idempotency-key-conflict",
          idempotencyKey: request.idempotencyKey ?? null
        }
      });
      return failure(
        "conflict",
        message,
        ["idempotencyKey"]
      );
    }

    const existing = this.events.get(request.event.id);
    if (existing !== undefined) {
      if (stableStringify(existing.event) === stableStringify(request.event)) {
        if (request.idempotencyKey !== undefined) {
          this.idempotencyKeys.set(request.idempotencyKey, request.event.id);
        }
        this.auditAppend(request, "skipped", startedAt, {
          eventIds: [existing.eventId],
          metadata: { reason: "duplicate-event", sequence: existing.sequence }
        });
        return ok(cloneEvent(existing.event));
      }

      const message = `Event ${request.event.id} already exists and cannot be mutated.`;
      this.auditAppend(request, "failed", startedAt, {
        eventIds: [request.event.id],
        errors: [message],
        metadata: { reason: "append-only-violation" }
      });
      return failure(
        "append_only_violation",
        message,
        ["event", "id"]
      );
    }

    const previous = this.eventsForObject(request.event.objectRef).at(-1);
    if (
      request.expectedPreviousEventId !== undefined &&
      previous?.eventId !== request.expectedPreviousEventId
    ) {
      const message = "Expected previous event did not match.";
      this.auditAppend(request, "failed", startedAt, {
        errors: [message],
        metadata: {
          reason: "expected-previous-event-conflict",
          expectedPreviousEventId: request.expectedPreviousEventId,
          actualPreviousEventId: previous?.eventId ?? null
        }
      });
      return failure("conflict", "Expected previous event did not match.", [
        "expectedPreviousEventId"
      ]);
    }

    const row = this.rowFromEvent(request, this.nextSequence(), startedAt);
    this.events.set(row.eventId, row);
    if (request.idempotencyKey !== undefined) {
      this.idempotencyKeys.set(request.idempotencyKey, row.eventId);
    }
    const outboxRecord = this.indexCanonicalAppend(row, request.idempotencyKey);
    this.auditAppend(request, "succeeded", startedAt, {
      eventIds: [row.eventId],
      outboxIds: [outboxRecord.id],
      metadata: {
        idempotencyKey: request.idempotencyKey ?? null,
        sequence: row.sequence
      }
    });

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
    const canonicalRecords = this.canonicalRecords();

    return {
      events: this.sortedEvents().map((row) => freeze(row)),
      eventRecords: this.sortedEvents()
        .map((row) => this.eventRecords.get(row.eventId))
        .filter((record): record is EventRecord => record !== undefined)
        .map((record) => freeze(record)),
      objectRefs: sortedById(this.objectRefs.values()).map((record) => freeze(record)),
      outbox: sortedById(this.outbox.values()).map((record) => freeze(record)),
      projectionStates: sortedById(this.projectionStates.values()).map((record) => freeze(record)),
      adapterAudits: sortedById(this.adapterAudits.values()).map((record) => freeze(record)),
      canonicalSqlPlan: createCanonicalSqlExecutionPlan(canonicalRecords)
    };
  }

  canonicalRecords(): readonly CanonicalDatabaseRecord[] {
    return [
      ...sortedById(this.objectRefs.values()),
      ...this.sortedEvents()
        .map((row) => this.eventRecords.get(row.eventId))
        .filter((record): record is EventRecord => record !== undefined),
      ...sortedById(this.outbox.values()),
      ...sortedById(this.projectionStates.values()),
      ...sortedById(this.adapterAudits.values())
    ];
  }

  canonicalSqlPlan(): CanonicalSqlExecutionPlan {
    return createCanonicalSqlExecutionPlan(this.canonicalRecords());
  }

  private rowFromEvent(
    request: AppendEventRequest,
    sequence: number,
    recordedAt: IsoDateTime
  ): PostgresEventRow {
    return freeze(
      withoutUndefined({
      eventId: request.event.id,
      eventType: request.event.type,
      objectRef: cloneRef(request.event.objectRef),
      relatedRefs: request.event.relatedRefs.map(cloneRef),
      occurredAt: request.event.occurredAt,
      recordedAt,
      event: cloneEvent(request.event),
      sequence,
      idempotencyKey: request.idempotencyKey
      }) as PostgresEventRow
    );
  }

  private indexCanonicalAppend(
    row: PostgresEventRow,
    idempotencyKey: string | undefined
  ): OutboxRecord {
    const scope = eventScope(row.event);
    this.upsertObjectRef(row.objectRef, row.recordedAt, scope);
    for (const ref of [
      ...optionalRef(row.event.actorRef),
      ...row.relatedRefs,
      ...row.event.authorityRefs
    ]) {
      this.upsertObjectRef(ref, row.recordedAt, scope);
    }

    const eventRecord: EventRecord = freeze(
      withoutUndefined({
        id: `event.${row.eventId}`,
        kind: "event" as const,
        schemaVersion: 1,
        createdAt: row.recordedAt,
        updatedAt: row.recordedAt,
        contentHash: row.event.contentHash,
        eventId: row.eventId,
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        recordedAt: row.recordedAt,
        actorRef: row.event.actorRef,
        systemActor: row.event.systemActor,
        objectRef: cloneRef(row.objectRef),
        relatedRefs: row.relatedRefs.map(cloneRef),
        authorityRefs: row.event.authorityRefs.map(cloneRef),
        scope,
        sourceCapability: row.event.sourceCapability,
        visibility: row.event.visibility,
        dataState: row.event.dataState,
        payload: toJsonValue(row.event.payload),
        supersedesEventId: row.event.supersedesEventId ?? row.event.supersession?.supersedesEventId,
        supersededByEventId: row.event.supersession?.supersededByEventId,
        redactionEventId: row.event.redaction?.redactionEventId,
        event: cloneEvent(row.event)
      }) as EventRecord
    );
    this.eventRecords.set(row.eventId, eventRecord);

    const outboxRecord: OutboxRecord = freeze({
      id: `outbox.${row.eventId}.canonical-event-log`,
      kind: "outbox",
      schemaVersion: 1,
      createdAt: row.recordedAt,
      eventId: row.eventId,
      eventType: row.eventType,
      destination: { kind: "projection", name: "canonical-event-log" },
      status: "pending",
      payload: {
        eventId: row.eventId,
        eventType: row.eventType,
        sequence: row.sequence,
        recordedAt: row.recordedAt
      },
      dedupeKey: idempotencyKey ?? `event:${row.eventId}:canonical-event-log`,
      attemptCount: 0
    });
    this.outbox.set(outboxRecord.id, outboxRecord);
    this.updateProjectionState(row);
    return outboxRecord;
  }

  private upsertObjectRef(
    ref: ObjectRef,
    updatedAt: IsoDateTime,
    scope: CanonicalScope
  ): CanonicalObjectRefRecord {
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
        relationshipRefs: existing?.relationshipRefs ?? [],
        scope
      }) as CanonicalObjectRefRecord
    );
    this.objectRefs.set(key, record);
    return record;
  }

  private updateProjectionState(row: PostgresEventRow): ProjectionStateRecord {
    const record: ProjectionStateRecord = freeze({
      id: "projection-state.postgres-event-store.event-log",
      kind: "projection-state",
      schemaVersion: 1,
      createdAt:
        this.projectionStates.get("projection-state.postgres-event-store.event-log")
          ?.createdAt ?? row.recordedAt,
      updatedAt: row.recordedAt,
      projectionName: "postgres-event-store.event-log",
      projectionVersion: postgresEventStoreAdapterDescriptor.version,
      status: "current",
      checkpoint: {
        eventId: row.eventId,
        occurredAt: row.occurredAt,
        processedAt: row.recordedAt,
        cursor: String(row.sequence),
        sequence: row.sequence
      },
      processedEventCount: row.sequence,
      rebuiltAt: row.recordedAt
    });
    this.projectionStates.set(record.id, record);
    return record;
  }

  private auditAppend(
    request: AppendEventRequest,
    status: AdapterAuditRecord["status"],
    startedAt: IsoDateTime,
    details: {
      readonly eventIds?: readonly CanopyId[];
      readonly outboxIds?: readonly CanopyId[];
      readonly errors?: readonly string[];
      readonly warnings?: readonly string[];
      readonly metadata?: JsonValue;
    } = {}
  ): AdapterAuditRecord {
    const completedAt = this.now();
    const record: AdapterAuditRecord = freeze({
      id: `adapter-audit.postgres-event-store.${++this.auditSequence}`,
      kind: "adapter-audit",
      schemaVersion: 1,
      createdAt: completedAt,
      adapterName: postgresEventStoreAdapterDescriptor.id,
      direction: "ingress",
      operation: "appendEvent",
      status,
      startedAt,
      completedAt,
      targetRef: cloneRef(request.event.objectRef),
      eventIds: details.eventIds ?? [],
      outboxIds: details.outboxIds ?? [],
      warnings: details.warnings ?? [],
      errors: details.errors ?? [],
      metadata: details.metadata ?? {}
    });
    this.adapterAudits.set(record.id, record);
    return record;
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

function eventScope(event: CanopyEvent): CanonicalScope {
  return withoutUndefined({
    orgId: event.orgId,
    placeId: event.placeId,
    commonsId: event.commonsId,
    livingSystemId: event.livingSystemId
  }) as CanonicalScope;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedById<TValue extends { readonly id: string }>(
  values: Iterable<TValue>
): readonly TValue[] {
  return [...values].sort((left, right) => compareStrings(left.id, right.id));
}

function optionalRef(ref: ObjectRef | undefined): readonly ObjectRef[] {
  return ref === undefined ? [] : [ref];
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

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    const record: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined && typeof child !== "function" && typeof child !== "symbol") {
        record[key] = toJsonValue(child);
      }
    }
    return record;
  }

  return null;
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
