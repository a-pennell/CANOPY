import type {
  AdapterAuditRecord,
  CanonicalDatabaseRecord,
  CanonicalMappingRecord,
  CanonicalObjectRefRecord,
  CanonicalScope,
  EventRecord,
  JsonValue,
  OutboxRecord,
  ProjectionStateRecord
} from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyId,
  ContentHash,
  IsoDateTime,
  ObjectRef,
  RelationshipRef
} from "@canopy/contracts-kernel";

export type CanonicalPersistenceErrorCode =
  | "record-not-found"
  | "event-already-exists"
  | "append-only-violation";

export class CanonicalPersistenceError extends Error {
  readonly code: CanonicalPersistenceErrorCode;

  constructor(code: CanonicalPersistenceErrorCode, message: string) {
    super(message);
    this.name = "CanonicalPersistenceError";
    this.code = code;
  }
}

export interface CanonicalEventQuery {
  readonly objectRef?: ObjectRef;
  readonly relatedRef?: ObjectRef;
  readonly eventTypes?: readonly string[];
  readonly occurredAfter?: IsoDateTime;
  readonly occurredBefore?: IsoDateTime;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface CanonicalObjectRefQuery {
  readonly objectRefs?: readonly ObjectRef[];
  readonly objectTypes?: readonly ObjectRef["type"][];
  readonly lifecycleStatuses?: readonly ObjectRef["lifecycleStatus"][];
  readonly limit?: number;
  readonly cursor?: string;
}

export interface CanonicalPage<TValue> {
  readonly items: readonly TValue[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface CanonicalRecordCounts {
  readonly objectRefs: number;
  readonly mappings: number;
  readonly events: number;
  readonly outbox: number;
  readonly projectionStates: number;
  readonly adapterAudits: number;
}

export interface CanonicalPersistenceRuntime {
  upsertObjectRef(
    ref: ObjectRef,
    options?: UpsertObjectRefOptions
  ): CanonicalObjectRefRecord;
  getObjectRef(ref: ObjectRef): CanonicalObjectRefRecord | undefined;
  queryObjectRefs(query?: CanonicalObjectRefQuery): CanonicalPage<CanonicalObjectRefRecord>;
  putMapping(record: CanonicalMappingRecord): CanonicalMappingRecord;
  getMapping(id: CanopyId): CanonicalMappingRecord | undefined;
  listMappings(): readonly CanonicalMappingRecord[];
  appendEvent(event: CanopyEvent, options?: AppendCanonicalEventOptions): EventRecord;
  getEvent(eventId: CanopyId): EventRecord | undefined;
  queryEvents(query?: CanonicalEventQuery): CanonicalPage<EventRecord>;
  putOutbox(record: OutboxRecord): OutboxRecord;
  getOutbox(id: CanopyId): OutboxRecord | undefined;
  listOutbox(): readonly OutboxRecord[];
  putProjectionState(record: ProjectionStateRecord): ProjectionStateRecord;
  getProjectionState(id: CanopyId): ProjectionStateRecord | undefined;
  listProjectionStates(): readonly ProjectionStateRecord[];
  putAdapterAudit(record: AdapterAuditRecord): AdapterAuditRecord;
  listAdapterAudits(): readonly AdapterAuditRecord[];
  listRecords(): readonly CanonicalDatabaseRecord[];
  counts(): CanonicalRecordCounts;
}

export interface UpsertObjectRefOptions {
  readonly createdAt?: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
  readonly relationshipRefs?: readonly RelationshipRef[];
  readonly scope?: CanonicalScope;
  readonly contentHash?: ContentHash;
}

export interface AppendCanonicalEventOptions {
  readonly recordedAt?: IsoDateTime;
  readonly scope?: CanonicalScope;
  readonly contentHash?: ContentHash;
}

export interface InMemoryCanonicalPersistenceOptions {
  readonly now?: () => IsoDateTime;
  readonly records?: readonly CanonicalDatabaseRecord[];
}

export type CanonicalSqlTableName =
  | "canopy_object_refs"
  | "canopy_canonical_mappings"
  | "canopy_events"
  | "canopy_outbox"
  | "canopy_projection_state"
  | "canopy_adapter_audit";

export interface CanonicalSqlStatement {
  readonly tableName: CanonicalSqlTableName;
  readonly operation: "insert";
  readonly text: string;
  readonly params: readonly JsonValue[];
  readonly recordId: CanopyId;
  readonly appendOnly: boolean;
}

export interface CanonicalSqlExecutionPlan {
  readonly dialect: "postgres";
  readonly migrationArtifact: "packages/database/migrations/sql/0000_canonical_homes.sql";
  readonly statements: readonly CanonicalSqlStatement[];
  readonly appendOnlyTables: readonly CanonicalSqlTableName[];
}

export interface CanonicalSqlExecutor {
  execute(statement: CanonicalSqlStatement): Promise<void>;
}

export interface PostgresCanonicalSqlClient {
  query(text: string, params?: readonly JsonValue[]): Promise<unknown>;
}

export interface PostgresCanonicalSqlExecutionOptions {
  readonly requireMigrationReady?: boolean;
  readonly useTransaction?: boolean;
}

export interface PostgresCanonicalMigrationReadiness {
  readonly status: "ready" | "missing";
  readonly checkedTables: readonly CanonicalSqlTableName[];
  readonly missingTables: readonly CanonicalSqlTableName[];
}

const defaultNow = (): IsoDateTime => new Date().toISOString();
const canonicalSqlMigrationArtifact =
  "packages/database/migrations/sql/0000_canonical_homes.sql" as const;
const canonicalSqlTables: readonly CanonicalSqlTableName[] = [
  "canopy_object_refs",
  "canopy_canonical_mappings",
  "canopy_events",
  "canopy_outbox",
  "canopy_projection_state",
  "canopy_adapter_audit"
];
const appendOnlySqlTables: readonly CanonicalSqlTableName[] = [
  "canopy_events",
  "canopy_outbox",
  "canopy_adapter_audit"
];

export function createInMemoryCanonicalPersistence(
  options: InMemoryCanonicalPersistenceOptions = {}
): CanonicalPersistenceRuntime {
  return new InMemoryCanonicalPersistence(options);
}

export function createCanonicalSqlExecutionPlan(
  records: readonly CanonicalDatabaseRecord[]
): CanonicalSqlExecutionPlan {
  return {
    dialect: "postgres",
    migrationArtifact: canonicalSqlMigrationArtifact,
    statements: records.map(canonicalRecordToSqlStatement),
    appendOnlyTables: appendOnlySqlTables
  };
}

export async function executeCanonicalSqlPlan(
  executor: CanonicalSqlExecutor,
  plan: CanonicalSqlExecutionPlan
): Promise<void> {
  for (const statement of plan.statements) {
    await executor.execute(statement);
  }
}

export async function checkPostgresCanonicalMigrationReadiness(
  client: PostgresCanonicalSqlClient
): Promise<PostgresCanonicalMigrationReadiness> {
  const missingTables: CanonicalSqlTableName[] = [];

  for (const tableName of canonicalSqlTables) {
    const result = await client.query("SELECT to_regclass($1) AS table_name", [tableName]);
    if (firstResultValue(result) !== tableName) {
      missingTables.push(tableName);
    }
  }

  return {
    status: missingTables.length === 0 ? "ready" : "missing",
    checkedTables: canonicalSqlTables,
    missingTables
  };
}

export async function executeCanonicalSqlPlanWithPostgres(
  client: PostgresCanonicalSqlClient,
  plan: CanonicalSqlExecutionPlan,
  options: PostgresCanonicalSqlExecutionOptions = {}
): Promise<void> {
  if (options.requireMigrationReady ?? true) {
    const readiness = await checkPostgresCanonicalMigrationReadiness(client);
    if (readiness.status !== "ready") {
      throw new CanonicalPersistenceError(
        "record-not-found",
        `Canonical Postgres migration is not ready; missing tables: ${readiness.missingTables.join(", ")}.`
      );
    }
  }

  const useTransaction = options.useTransaction ?? true;
  if (useTransaction) {
    await client.query("BEGIN");
  }

  try {
    for (const statement of plan.statements) {
      await client.query(statement.text, statement.params);
    }

    if (useTransaction) {
      await client.query("COMMIT");
    }
  } catch (error) {
    if (useTransaction) {
      await client.query("ROLLBACK");
    }
    throw normalizePostgresExecutionError(error);
  }
}

export class InMemoryCanonicalPersistence implements CanonicalPersistenceRuntime {
  private readonly objectRefs = new Map<string, CanonicalObjectRefRecord>();
  private readonly mappings = new Map<CanopyId, CanonicalMappingRecord>();
  private readonly events = new Map<CanopyId, EventRecord>();
  private readonly outbox = new Map<CanopyId, OutboxRecord>();
  private readonly projectionStates = new Map<CanopyId, ProjectionStateRecord>();
  private readonly adapterAudits = new Map<CanopyId, AdapterAuditRecord>();
  private readonly now: () => IsoDateTime;

  constructor(options: InMemoryCanonicalPersistenceOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const record of options.records ?? []) {
      this.seed(record);
    }
  }

  upsertObjectRef(
    ref: ObjectRef,
    options: UpsertObjectRefOptions = {}
  ): CanonicalObjectRefRecord {
    const key = refKey(ref);
    const existing = this.objectRefs.get(key);
    const createdAt = existing?.createdAt ?? options.createdAt ?? this.now();
    const updatedAt = options.updatedAt ?? this.now();
    const record: CanonicalObjectRefRecord = freezeRecord(
      withoutUndefined({
      id: `object-ref.${ref.namespace}.${ref.type}.${ref.id}`,
      kind: "canonical-object-ref" as const,
      schemaVersion: 1,
      createdAt,
      updatedAt,
      contentHash: options.contentHash ?? existing?.contentHash,
      ref: cloneRef(ref),
      objectId: ref.id,
      objectType: ref.type,
      namespace: ref.namespace,
      lifecycleStatus: ref.lifecycleStatus,
      source: ref.source,
      supersedes: ref.supersedes ?? [],
      relationshipRefs: options.relationshipRefs ?? existing?.relationshipRefs ?? [],
      scope: options.scope ?? existing?.scope
      }) as CanonicalObjectRefRecord
    );

    this.objectRefs.set(key, record);
    return record;
  }

  getObjectRef(ref: ObjectRef): CanonicalObjectRefRecord | undefined {
    return this.objectRefs.get(refKey(ref));
  }

  queryObjectRefs(query: CanonicalObjectRefQuery = {}): CanonicalPage<CanonicalObjectRefRecord> {
    const refs = query.objectRefs?.map(refKey);
    const items = [...this.objectRefs.values()]
      .filter((record) => refs === undefined || refs.includes(refKey(record.ref)))
      .filter(
        (record) =>
          query.objectTypes === undefined || query.objectTypes.includes(record.objectType)
      )
      .filter(
        (record) =>
          query.lifecycleStatuses === undefined ||
          query.lifecycleStatuses.includes(record.lifecycleStatus)
      )
      .sort((left, right) => compareStrings(refKey(left.ref), refKey(right.ref)));

    return page(items, query);
  }

  putMapping(record: CanonicalMappingRecord): CanonicalMappingRecord {
    const stored = freezeRecord(record);
    this.mappings.set(stored.id, stored);
    return stored;
  }

  getMapping(id: CanopyId): CanonicalMappingRecord | undefined {
    return this.mappings.get(id);
  }

  listMappings(): readonly CanonicalMappingRecord[] {
    return sortedById(this.mappings.values());
  }

  appendEvent(event: CanopyEvent, options: AppendCanonicalEventOptions = {}): EventRecord {
    const existing = this.events.get(event.id);
    if (existing !== undefined) {
      if (stableStringify(existing.event) === stableStringify(event)) {
        return existing;
      }

      throw new CanonicalPersistenceError(
        "event-already-exists",
        `Event ${event.id} already exists and cannot be mutated.`
      );
    }

    this.upsertObjectRef(event.objectRef, { scope: eventScope(event) });
    for (const ref of [
      ...optionalRef(event.actorRef),
      ...event.relatedRefs,
      ...event.authorityRefs
    ]) {
      this.upsertObjectRef(ref, { scope: eventScope(event) });
    }

    const recordedAt = options.recordedAt ?? this.now();
    const record: EventRecord = freezeRecord(
      withoutUndefined({
      id: `event.${event.id}`,
      kind: "event" as const,
      schemaVersion: 1,
      createdAt: recordedAt,
      updatedAt: recordedAt,
      contentHash: options.contentHash ?? event.contentHash,
      eventId: event.id,
      eventType: event.type,
      occurredAt: event.occurredAt,
      recordedAt,
      actorRef: event.actorRef,
      systemActor: event.systemActor,
      objectRef: cloneRef(event.objectRef),
      relatedRefs: event.relatedRefs.map(cloneRef),
      authorityRefs: event.authorityRefs.map(cloneRef),
      scope: options.scope ?? eventScope(event),
      sourceCapability: event.sourceCapability,
      visibility: event.visibility,
      dataState: event.dataState,
      payload: toJsonValue(event.payload),
      supersedesEventId: event.supersedesEventId ?? event.supersession?.supersedesEventId,
      supersededByEventId: event.supersession?.supersededByEventId,
      redactionEventId: event.redaction?.redactionEventId,
      event: cloneEvent(event)
      }) as EventRecord
    );

    this.events.set(event.id, record);
    return record;
  }

  getEvent(eventId: CanopyId): EventRecord | undefined {
    return this.events.get(eventId);
  }

  queryEvents(query: CanonicalEventQuery = {}): CanonicalPage<EventRecord> {
    const items = [...this.events.values()]
      .filter(
        (record) =>
          query.objectRef === undefined || sameRef(record.objectRef, query.objectRef)
      )
      .filter(
        (record) =>
          query.relatedRef === undefined ||
          record.relatedRefs.some((ref) => sameOptionalRef(ref, query.relatedRef))
      )
      .filter(
        (record) =>
          query.eventTypes === undefined || query.eventTypes.includes(record.eventType)
      )
      .filter(
        (record) =>
          query.occurredAfter === undefined || record.occurredAt > query.occurredAfter
      )
      .filter(
        (record) =>
          query.occurredBefore === undefined || record.occurredAt < query.occurredBefore
      )
      .sort(compareEventRecords);

    return page(items, query);
  }

  putOutbox(record: OutboxRecord): OutboxRecord {
    const stored = freezeRecord(record);
    this.outbox.set(stored.id, stored);
    return stored;
  }

  getOutbox(id: CanopyId): OutboxRecord | undefined {
    return this.outbox.get(id);
  }

  listOutbox(): readonly OutboxRecord[] {
    return sortedById(this.outbox.values());
  }

  putProjectionState(record: ProjectionStateRecord): ProjectionStateRecord {
    const stored = freezeRecord(record);
    this.projectionStates.set(stored.id, stored);
    return stored;
  }

  getProjectionState(id: CanopyId): ProjectionStateRecord | undefined {
    return this.projectionStates.get(id);
  }

  listProjectionStates(): readonly ProjectionStateRecord[] {
    return sortedById(this.projectionStates.values());
  }

  putAdapterAudit(record: AdapterAuditRecord): AdapterAuditRecord {
    const stored = freezeRecord(record);
    this.adapterAudits.set(stored.id, stored);
    return stored;
  }

  listAdapterAudits(): readonly AdapterAuditRecord[] {
    return sortedById(this.adapterAudits.values());
  }

  listRecords(): readonly CanonicalDatabaseRecord[] {
    return [
      ...this.queryObjectRefs().items,
      ...this.listMappings(),
      ...this.queryEvents().items,
      ...this.listOutbox(),
      ...this.listProjectionStates(),
      ...this.listAdapterAudits()
    ];
  }

  counts(): CanonicalRecordCounts {
    return {
      objectRefs: this.objectRefs.size,
      mappings: this.mappings.size,
      events: this.events.size,
      outbox: this.outbox.size,
      projectionStates: this.projectionStates.size,
      adapterAudits: this.adapterAudits.size
    };
  }

  private seed(record: CanonicalDatabaseRecord): void {
    if (record.kind === "canonical-object-ref") {
      this.objectRefs.set(refKey(record.ref), freezeRecord(record));
    } else if (record.kind === "canonical-mapping") {
      this.mappings.set(record.id, freezeRecord(record));
    } else if (record.kind === "event") {
      this.events.set(record.eventId, freezeRecord(record));
    } else if (record.kind === "outbox") {
      this.outbox.set(record.id, freezeRecord(record));
    } else if (record.kind === "projection-state") {
      this.projectionStates.set(record.id, freezeRecord(record));
    } else {
      this.adapterAudits.set(record.id, freezeRecord(record));
    }
  }
}

function canonicalRecordToSqlStatement(record: CanonicalDatabaseRecord): CanonicalSqlStatement {
  if (record.kind === "canonical-object-ref") {
    return sqlInsert(
      "canopy_object_refs",
      record.id,
      {
        object_ref: refKey(record.ref),
        object_kind: record.objectType,
        namespace: record.namespace,
        created_at: record.createdAt,
        created_by:
          record.source === undefined
            ? undefined
            : `${record.source.sourceProject}:${record.source.sourceEntity}:${record.source.sourceId}`,
        metadata_text: stableStringify({
          id: record.id,
          lifecycleStatus: record.lifecycleStatus,
          source: record.source,
          supersedes: record.supersedes,
          relationshipRefs: record.relationshipRefs,
          scope: record.scope,
          contentHash: record.contentHash,
          updatedAt: record.updatedAt
        })
      },
      false
    );
  }

  if (record.kind === "canonical-mapping") {
    return sqlInsert(
      "canopy_canonical_mappings",
      record.id,
      {
        mapping_ref: record.id,
        source_system: record.source.sourceProject,
        source_ref: `${record.source.sourceEntity}:${record.source.sourceId}`,
        object_ref: refKey(record.canonicalRef),
        mapping_kind: record.disposition,
        valid_from: record.createdAt,
        valid_to: record.status === "retired" ? record.reviewedAt : undefined,
        metadata_text: stableStringify({
          source: record.source,
          sourcePointer: record.sourcePointer,
          localLabel: record.localLabel,
          localType: record.localType,
          canonicalType: record.canonicalType,
          status: record.status,
          confidence: record.confidence,
          mappedByRef: record.mappedByRef,
          authorityRefs: record.authorityRefs,
          evidenceRefs: record.evidenceRefs,
          supersedesMappingId: record.supersedesMappingId,
          reviewedAt: record.reviewedAt
        })
      },
      false
    );
  }

  if (record.kind === "event") {
    return sqlInsert(
      "canopy_events",
      record.id,
      {
        event_ref: record.eventId,
        object_ref: refKey(record.objectRef),
        event_type: record.eventType,
        event_version: record.schemaVersion,
        occurred_at: record.occurredAt,
        recorded_at: record.recordedAt,
        causation_ref: record.supersedesEventId,
        correlation_ref: record.redactionEventId ?? record.supersededByEventId,
        actor_ref: record.actorRef === undefined ? record.systemActor : refKey(record.actorRef),
        payload_text: stableStringify(record.payload),
        metadata_text: stableStringify({
          id: record.id,
          relatedRefs: record.relatedRefs,
          authorityRefs: record.authorityRefs,
          scope: record.scope,
          sourceCapability: record.sourceCapability,
          visibility: record.visibility,
          dataState: record.dataState,
          supersededByEventId: record.supersededByEventId,
          redactionEventId: record.redactionEventId,
          contentHash: record.contentHash,
          event: record.event
        })
      },
      true
    );
  }

  if (record.kind === "outbox") {
    return sqlInsert(
      "canopy_outbox",
      record.id,
      {
        outbox_ref: record.id,
        event_ref: record.eventId,
        destination: `${record.destination.kind}:${record.destination.name}`,
        message_type: record.eventType,
        message_text: stableStringify(record.payload),
        status: record.status,
        available_at: record.nextAttemptAt ?? record.createdAt,
        claimed_at: record.leasedAt,
        completed_at: record.acknowledgedAt ?? record.publishedAt,
        failure_text: record.lastError,
        metadata_text: stableStringify({
          destination: record.destination,
          dedupeKey: record.dedupeKey,
          attemptCount: record.attemptCount,
          maxAttempts: record.maxAttempts,
          leasedBy: record.leasedBy,
          contentHash: record.contentHash,
          updatedAt: record.updatedAt
        })
      },
      true
    );
  }

  if (record.kind === "projection-state") {
    return sqlInsert(
      "canopy_projection_state",
      record.id,
      {
        projector_ref: record.id,
        projection_name: record.projectionName,
        last_event_ref: record.checkpoint.eventId,
        last_event_recorded_at: record.checkpoint.processedAt,
        rebuild_ref: record.rebuildRequestedAt,
        checkpoint_text: stableStringify({
          projectionVersion: record.projectionVersion,
          status: record.status,
          scope: record.scope,
          checkpoint: record.checkpoint,
          processedEventCount: record.processedEventCount,
          lastError: record.lastError,
          rebuiltAt: record.rebuiltAt,
          contentHash: record.contentHash
        }),
        updated_at: record.updatedAt ?? record.createdAt
      },
      false
    );
  }

  return sqlInsert(
    "canopy_adapter_audit",
    record.id,
    {
      audit_ref: record.id,
      adapter_ref: record.adapterName,
      operation_kind: record.operation,
      object_ref: record.targetRef === undefined ? undefined : refKey(record.targetRef),
      external_ref:
        record.externalRef === undefined
          ? undefined
          : `${record.externalRef.provider}:${record.externalRef.resourceType}:${record.externalRef.resourceId}`,
      event_ref: record.eventIds[0],
      occurred_at: record.startedAt,
      evidence_text: stableStringify({
        status: record.status,
        direction: record.direction,
        completedAt: record.completedAt,
        actorRef: record.actorRef,
        systemActor: record.systemActor,
        eventIds: record.eventIds,
        outboxIds: record.outboxIds,
        requestHash: record.requestHash,
        responseHash: record.responseHash,
        warnings: record.warnings,
        errors: record.errors,
        metadata: record.metadata
      }),
      metadata_text: stableStringify({
        id: record.id,
        contentHash: record.contentHash,
        updatedAt: record.updatedAt
      })
    },
    true
  );
}

function sqlInsert(
  tableName: CanonicalSqlTableName,
  recordId: CanopyId,
  columns: Readonly<Record<string, JsonValue | undefined>>,
  appendOnly: boolean
): CanonicalSqlStatement {
  const entries = Object.entries(columns).filter(([, value]) => value !== undefined);
  return {
    tableName,
    operation: "insert",
    text: `INSERT INTO ${tableName} (${entries.map(([column]) => column).join(", ")}) VALUES (${entries
      .map((_entry, index) => `$${index + 1}`)
      .join(", ")})`,
    params: entries.map(([, value]) => value ?? null),
    recordId,
    appendOnly
  };
}

function firstResultValue(result: unknown): unknown {
  const rows = typeof result === "object" && result !== null && "rows" in result
    ? (result as { readonly rows?: readonly unknown[] }).rows
    : undefined;
  const firstRow = rows?.[0];
  if (typeof firstRow !== "object" || firstRow === null) {
    return undefined;
  }
  return Object.values(firstRow as Record<string, unknown>)[0];
}

function normalizePostgresExecutionError(error: unknown): Error {
  if (isAppendOnlyPostgresError(error)) {
    return new CanonicalPersistenceError(
      "append-only-violation",
      "Canonical Postgres append-only enforcement rejected a historical mutation."
    );
  }

  return error instanceof Error ? error : new Error(String(error));
}

function isAppendOnlyPostgresError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const value = error as {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly routine?: unknown;
  };
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  return (
    value.code === "P0001" ||
    value.code === "23514" ||
    value.routine === "canopy_reject_historical_mutation" ||
    message.includes("append-only") ||
    message.includes("historical facts")
  );
}

function eventScope(event: CanopyEvent): CanonicalScope {
  return withoutUndefined({
    orgId: event.orgId,
    placeId: event.placeId,
    commonsId: event.commonsId,
    livingSystemId: event.livingSystemId
  }) as CanonicalScope;
}

function page<TValue>(
  values: readonly TValue[],
  request: { readonly limit?: number; readonly cursor?: string }
): CanonicalPage<TValue> {
  const start = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const limit = request.limit ?? values.length;
  const items = values.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < values.length;

  return hasMore ? { items, nextCursor: String(nextOffset), hasMore } : { items, hasMore };
}

function compareEventRecords(left: EventRecord, right: EventRecord): number {
  return (
    compareStrings(left.occurredAt, right.occurredAt) ||
    compareStrings(left.recordedAt, right.recordedAt) ||
    compareStrings(left.eventId, right.eventId)
  );
}

function sortedById<TValue extends { readonly id: string }>(
  values: Iterable<TValue>
): readonly TValue[] {
  return [...values].sort((left, right) => compareStrings(left.id, right.id));
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function sameOptionalRef(left: ObjectRef, right: ObjectRef | undefined): boolean {
  return right !== undefined && sameRef(left, right);
}

function optionalRef(ref: ObjectRef | undefined): readonly ObjectRef[] {
  return ref === undefined ? [] : [ref];
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freezeRecord(ref);
}

function cloneEvent(event: CanopyEvent): CanopyEvent {
  return freezeRecord(event);
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, child) => {
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      return Object.fromEntries(
        Object.entries(child as Record<string, unknown>).sort(([left], [right]) =>
          compareStrings(left, right)
        )
      );
    }

    return child;
  });
}

function withoutUndefined<TValue extends Record<string, unknown>>(value: TValue): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as TValue;
}

function freezeRecord<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeRecord(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        copy[key] = freezeRecord(entry);
      }
    }
    return Object.freeze(copy) as TValue;
  }

  return value;
}
