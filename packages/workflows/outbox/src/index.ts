import type {
  AdapterAuditRecord,
  AdapterAuditStatus,
  JsonValue,
  OutboxDestination,
  OutboxRecord,
  OutboxStatus
} from "@canopy/contracts-database";
import type { CanopyEventType, CanopyId, IsoDateTime } from "@canopy/contracts-kernel";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import {
  rebuildAndPersistAllProjections,
  type PersistentProjectionRebuildResult
} from "@canopy/workflows-projection-rebuild";

export type OutboxErrorCode =
  | "outbox-record-not-found"
  | "outbox-record-not-leased"
  | "outbox-record-not-published"
  | "outbox-record-terminal"
  | "outbox-record-not-retryable";

export class OutboxError extends Error {
  readonly code: OutboxErrorCode;

  constructor(code: OutboxErrorCode, message: string) {
    super(message);
    this.name = "OutboxError";
    this.code = code;
  }
}

export interface EnqueueOutboxRecordInput {
  readonly id?: CanopyId;
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly destination: OutboxDestination;
  readonly payload: JsonValue;
  readonly dedupeKey?: string;
  readonly maxAttempts?: number;
  readonly nextAttemptAt?: IsoDateTime;
  readonly createdAt?: IsoDateTime;
}

export interface LeaseOutboxOptions {
  readonly leasedBy: string;
  readonly limit?: number;
  readonly now?: IsoDateTime;
  readonly leaseDurationMs?: number;
  readonly destination?: OutboxDestination;
}

export interface FailOutboxOptions {
  readonly error: string;
  readonly nextAttemptAt?: IsoDateTime;
  readonly now?: IsoDateTime;
}

export interface RetryOutboxOptions {
  readonly nextAttemptAt?: IsoDateTime;
  readonly now?: IsoDateTime;
}

export interface ReconcileOutboxOptions {
  readonly now?: IsoDateTime;
  readonly leaseTimeoutMs?: number;
}

export interface OutboxReconciliationSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<OutboxStatus, number>>;
  readonly readyToLease: number;
  readonly delayed: number;
  readonly expiredLeases: number;
  readonly exhaustedFailures: number;
  readonly dedupeKeys: number;
}

export interface InMemoryOutboxOptions {
  readonly records?: readonly OutboxRecord[];
  readonly now?: () => IsoDateTime;
  readonly createId?: () => CanopyId;
}

export interface PersistentOutboxOptions extends Omit<InMemoryOutboxOptions, "records"> {
  readonly runtime: CanonicalPersistenceRuntime;
}

export interface OutboxRuntime {
  enqueue(input: EnqueueOutboxRecordInput): OutboxRecord;
  lease(options: LeaseOutboxOptions): readonly OutboxRecord[];
  publish(id: CanopyId, now?: IsoDateTime): OutboxRecord;
  acknowledge(id: CanopyId, now?: IsoDateTime): OutboxRecord;
  fail(id: CanopyId, options: FailOutboxOptions): OutboxRecord;
  retry(id: CanopyId, options?: RetryOutboxOptions): OutboxRecord;
  deadLetter(id: CanopyId, error?: string, now?: IsoDateTime): OutboxRecord;
  cancel(id: CanopyId, now?: IsoDateTime): OutboxRecord;
  reconcile(options?: ReconcileOutboxOptions): OutboxReconciliationSummary;
  get(id: CanopyId): OutboxRecord | undefined;
  list(): readonly OutboxRecord[];
}

export interface OutboxDispatchContext {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox: OutboxRuntime;
  readonly workerId: string;
  readonly now: IsoDateTime;
}

export interface OutboxDispatchResult {
  readonly status?: AdapterAuditStatus;
  readonly eventIds?: readonly CanopyId[];
  readonly metadata?: JsonValue;
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
}

export type OutboxDispatchHandler = (
  record: OutboxRecord,
  context: OutboxDispatchContext
) => OutboxDispatchResult | Promise<OutboxDispatchResult>;

export interface OutboxWorkerOptions {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox?: OutboxRuntime;
  readonly workerId: string;
  readonly now?: IsoDateTime;
  readonly limit?: number;
  readonly leaseDurationMs?: number;
  readonly destination?: OutboxDestination;
  readonly handlers?: readonly OutboxDispatchHandler[];
  readonly writeAudit?: boolean;
}

export interface OutboxWorkerRecordResult {
  readonly recordId: CanopyId;
  readonly eventId: CanopyId;
  readonly destination: OutboxDestination;
  readonly status: "acknowledged" | "failed";
  readonly auditRecord: AdapterAuditRecord;
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
  readonly error?: string;
}

export interface OutboxWorkerResult {
  readonly workerId: string;
  readonly leasedCount: number;
  readonly acknowledgedCount: number;
  readonly failedCount: number;
  readonly records: readonly OutboxWorkerRecordResult[];
}

type OutboxRecordPatch = {
  readonly [Key in keyof Omit<
    OutboxRecord,
    "id" | "kind" | "schemaVersion" | "createdAt"
  >]?: OutboxRecord[Key] | undefined;
};

const terminalStatuses: readonly OutboxStatus[] = [
  "acknowledged",
  "dead-lettered",
  "cancelled"
];

const defaultNow = (): IsoDateTime => new Date().toISOString();
const defaultCreateId = (): CanopyId =>
  `outbox.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`;

export function createInMemoryOutbox(
  options: InMemoryOutboxOptions = {}
): OutboxRuntime {
  return new InMemoryOutbox(options);
}

export function createPersistentOutbox(options: PersistentOutboxOptions): OutboxRuntime {
  return new PersistentOutbox(options);
}

export async function runOutboxWorker(
  options: OutboxWorkerOptions
): Promise<OutboxWorkerResult> {
  const now = options.now ?? defaultNow();
  const outbox = options.outbox ?? createPersistentOutbox({ runtime: options.runtime });
  const leased = outbox.lease(
    outboxLeaseOptions({
      leasedBy: options.workerId,
      limit: options.limit,
      now,
      leaseDurationMs: options.leaseDurationMs,
      destination: options.destination
    })
  );
  const handlers = options.handlers ?? defaultOutboxHandlers;
  const results: OutboxWorkerRecordResult[] = [];

  for (const record of leased) {
    const handler = handlers.find((candidate) => canHandleOutboxRecord(candidate, record));
    if (handler === undefined) {
      const error = `No outbox handler registered for ${record.destination.kind}:${record.destination.name}.`;
      outbox.fail(record.id, { error, now });
      results.push(
        workerRecordResult({
          record,
          status: "failed",
          auditRecord: writeOutboxAudit(options.runtime, {
            record,
            status: "failed",
            startedAt: now,
            completedAt: now,
            error,
            metadata: { reason: "missing-handler" },
            ...optionalWriteAudit(options.writeAudit)
          }),
          error
        })
      );
      continue;
    }

    try {
      const dispatch = await handler(record, {
        runtime: options.runtime,
        outbox,
        workerId: options.workerId,
        now
      });
      outbox.publish(record.id, now);
      outbox.acknowledge(record.id, now);
      results.push(
        workerRecordResult({
          record,
          status: "acknowledged",
          auditRecord: writeOutboxAudit(options.runtime, {
            record,
            status: dispatch.status ?? "succeeded",
            startedAt: now,
            completedAt: now,
            ...optionalAuditEventIds(dispatch.eventIds),
            ...optionalAuditMetadata(dispatch.metadata),
            ...optionalWriteAudit(options.writeAudit)
          }),
          ...optionalWorkerProjectionRebuild(dispatch.projectionRebuild)
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outbox.fail(record.id, { error: message, now });
      results.push(
        workerRecordResult({
          record,
          status: "failed",
          auditRecord: writeOutboxAudit(options.runtime, {
            record,
            status: "failed",
            startedAt: now,
            completedAt: now,
            error: message,
            metadata: { reason: "handler-error" },
            ...optionalWriteAudit(options.writeAudit)
          }),
          error: message
        })
      );
    }
  }

  return {
    workerId: options.workerId,
    leasedCount: leased.length,
    acknowledgedCount: results.filter((result) => result.status === "acknowledged").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    records: results
  };
}

export const projectionRebuildOutboxHandler: OutboxDispatchHandler = (
  record,
  context
) => {
  if (!isProjectionRebuildDestination(record.destination)) {
    throw new Error(
      `Projection rebuild handler cannot process ${record.destination.kind}:${record.destination.name}.`
    );
  }

  const projectionRebuild = rebuildAndPersistAllProjections(context.runtime, {
    rebuiltAt: context.now
  });

  return {
    status: "succeeded",
    eventIds: [record.eventId],
    metadata: {
      handler: "projection-rebuild",
      persistedProjectionStates: projectionRebuild.persistedStates.map((state) => state.id),
      persistedProjectionDocuments: projectionRebuild.persistedDocuments.map(
        (document) => document.id
      )
    },
    projectionRebuild
  };
};

export const defaultOutboxHandlers: readonly OutboxDispatchHandler[] = [
  projectionRebuildOutboxHandler
];

export class PersistentOutbox implements OutboxRuntime {
  private readonly runtime: CanonicalPersistenceRuntime;
  private readonly memory: OutboxRuntime;

  constructor(options: PersistentOutboxOptions) {
    this.runtime = options.runtime;
    this.memory = createInMemoryOutbox(withDefinedFields({
      records: options.runtime.listOutbox(),
      now: options.now,
      createId: options.createId
    }) as InMemoryOutboxOptions);
  }

  enqueue(input: EnqueueOutboxRecordInput): OutboxRecord {
    return this.persist(this.memory.enqueue(input));
  }

  lease(options: LeaseOutboxOptions): readonly OutboxRecord[] {
    return this.memory.lease(options).map((record) => this.persist(record));
  }

  publish(id: CanopyId, now?: IsoDateTime): OutboxRecord {
    return this.persist(this.memory.publish(id, now));
  }

  acknowledge(id: CanopyId, now?: IsoDateTime): OutboxRecord {
    return this.persist(this.memory.acknowledge(id, now));
  }

  fail(id: CanopyId, options: FailOutboxOptions): OutboxRecord {
    return this.persist(this.memory.fail(id, options));
  }

  retry(id: CanopyId, options?: RetryOutboxOptions): OutboxRecord {
    return this.persist(this.memory.retry(id, options));
  }

  deadLetter(id: CanopyId, error?: string, now?: IsoDateTime): OutboxRecord {
    return this.persist(this.memory.deadLetter(id, error, now));
  }

  cancel(id: CanopyId, now?: IsoDateTime): OutboxRecord {
    return this.persist(this.memory.cancel(id, now));
  }

  reconcile(options?: ReconcileOutboxOptions): OutboxReconciliationSummary {
    return this.memory.reconcile(options);
  }

  get(id: CanopyId): OutboxRecord | undefined {
    return this.runtime.getOutbox(id) ?? this.memory.get(id);
  }

  list(): readonly OutboxRecord[] {
    return this.runtime.listOutbox();
  }

  private persist(record: OutboxRecord): OutboxRecord {
    return this.runtime.putOutbox(record);
  }
}

export class InMemoryOutbox implements OutboxRuntime {
  private readonly recordsById = new Map<CanopyId, OutboxRecord>();
  private readonly recordIdsByDedupeKey = new Map<string, CanopyId>();
  private readonly leaseExpiresAtById = new Map<CanopyId, IsoDateTime>();
  private readonly now: () => IsoDateTime;
  private readonly createId: () => CanopyId;

  constructor(options: InMemoryOutboxOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.createId = options.createId ?? defaultCreateId;

    for (const record of options.records ?? []) {
      const frozen = freezeRecord(record);
      this.recordsById.set(frozen.id, frozen);
      if (frozen.dedupeKey !== undefined) {
        this.recordIdsByDedupeKey.set(frozen.dedupeKey, frozen.id);
      }
    }
  }

  enqueue(input: EnqueueOutboxRecordInput): OutboxRecord {
    if (input.dedupeKey !== undefined) {
      const existingId = this.recordIdsByDedupeKey.get(input.dedupeKey);
      if (existingId !== undefined) {
        return this.require(existingId);
      }
    }

    const createdAt = input.createdAt ?? this.now();
    const record = freezeRecord(
      withDefinedFields({
        id: input.id ?? this.createId(),
        kind: "outbox",
        schemaVersion: 1,
        createdAt,
        eventId: input.eventId,
        eventType: input.eventType,
        destination: cloneDestination(input.destination),
        status: "pending",
        payload: cloneJson(input.payload),
        dedupeKey: input.dedupeKey,
        attemptCount: 0,
        maxAttempts: input.maxAttempts,
        nextAttemptAt: input.nextAttemptAt
      })
    );

    this.recordsById.set(record.id, record);
    if (record.dedupeKey !== undefined) {
      this.recordIdsByDedupeKey.set(record.dedupeKey, record.id);
    }

    return record;
  }

  lease(options: LeaseOutboxOptions): readonly OutboxRecord[] {
    const now = options.now ?? this.now();
    const limit = options.limit ?? 1;
    if (limit <= 0) {
      return [];
    }

    const leased: OutboxRecord[] = [];
    for (const record of this.recordsById.values()) {
      if (leased.length >= limit) {
        break;
      }

      if (!isLeaseEligible(record, now, options.destination)) {
        continue;
      }

      const updated = this.replace(record.id, {
        status: "leased",
        updatedAt: now,
        leasedAt: now,
        leasedBy: options.leasedBy,
        attemptCount: record.attemptCount + 1
      });
      if (options.leaseDurationMs !== undefined) {
        this.leaseExpiresAtById.set(
          updated.id,
          addMilliseconds(now, options.leaseDurationMs)
        );
      } else {
        this.leaseExpiresAtById.delete(updated.id);
      }
      leased.push(updated);
    }

    return leased;
  }

  publish(id: CanopyId, now = this.now()): OutboxRecord {
    const record = this.require(id);
    assertNotTerminal(record);
    if (record.status !== "leased") {
      throw new OutboxError(
        "outbox-record-not-leased",
        `Outbox record ${id} must be leased before publish.`
      );
    }

    this.leaseExpiresAtById.delete(id);
    return this.replace(id, {
      status: "published",
      updatedAt: now,
      publishedAt: now
    });
  }

  acknowledge(id: CanopyId, now = this.now()): OutboxRecord {
    const record = this.require(id);
    assertNotTerminal(record);
    if (record.status !== "published") {
      throw new OutboxError(
        "outbox-record-not-published",
        `Outbox record ${id} must be published before acknowledge.`
      );
    }

    return this.replace(id, {
      status: "acknowledged",
      updatedAt: now,
      acknowledgedAt: now
    });
  }

  fail(id: CanopyId, options: FailOutboxOptions): OutboxRecord {
    const now = options.now ?? this.now();
    const record = this.require(id);
    assertNotTerminal(record);

    if (isAttemptExhausted(record)) {
      return this.deadLetter(id, options.error, now);
    }

    this.leaseExpiresAtById.delete(id);
    return this.replace(id, {
      status: "failed",
      updatedAt: now,
      nextAttemptAt: options.nextAttemptAt,
      lastError: options.error
    });
  }

  retry(id: CanopyId, options: RetryOutboxOptions = {}): OutboxRecord {
    const now = options.now ?? this.now();
    const record = this.require(id);
    if (record.status !== "failed" && record.status !== "dead-lettered") {
      throw new OutboxError(
        "outbox-record-not-retryable",
        `Outbox record ${id} is not retryable from ${record.status}.`
      );
    }

    this.leaseExpiresAtById.delete(id);
    return this.replace(id, {
      status: "pending",
      updatedAt: now,
      nextAttemptAt: options.nextAttemptAt,
      leasedAt: undefined,
      leasedBy: undefined,
      publishedAt: undefined,
      acknowledgedAt: undefined,
      lastError: undefined
    });
  }

  deadLetter(id: CanopyId, error?: string, now = this.now()): OutboxRecord {
    const record = this.require(id);
    if (record.status === "acknowledged" || record.status === "cancelled") {
      throw new OutboxError(
        "outbox-record-terminal",
        `Outbox record ${id} is already ${record.status}.`
      );
    }

    this.leaseExpiresAtById.delete(id);
    return this.replace(id, {
      status: "dead-lettered",
      updatedAt: now,
      lastError: error ?? record.lastError
    });
  }

  cancel(id: CanopyId, now = this.now()): OutboxRecord {
    const record = this.require(id);
    if (record.status === "acknowledged" || record.status === "dead-lettered") {
      throw new OutboxError(
        "outbox-record-terminal",
        `Outbox record ${id} is already ${record.status}.`
      );
    }

    this.leaseExpiresAtById.delete(id);
    return this.replace(id, {
      status: "cancelled",
      updatedAt: now
    });
  }

  reconcile(options: ReconcileOutboxOptions = {}): OutboxReconciliationSummary {
    const now = options.now ?? this.now();
    const byStatus = emptyStatusCounts();
    let readyToLease = 0;
    let delayed = 0;
    let expiredLeases = 0;
    let exhaustedFailures = 0;

    for (const record of this.recordsById.values()) {
      byStatus[record.status] += 1;
      if (isLeaseEligible(record, now)) {
        readyToLease += 1;
      }
      if (
        (record.status === "pending" || record.status === "failed") &&
        record.nextAttemptAt !== undefined &&
        record.nextAttemptAt > now
      ) {
        delayed += 1;
      }
      if (record.status === "leased" && this.isLeaseExpired(record, now, options)) {
        expiredLeases += 1;
      }
      if (record.status === "failed" && isAttemptExhausted(record)) {
        exhaustedFailures += 1;
      }
    }

    return Object.freeze({
      total: this.recordsById.size,
      byStatus: Object.freeze(byStatus),
      readyToLease,
      delayed,
      expiredLeases,
      exhaustedFailures,
      dedupeKeys: this.recordIdsByDedupeKey.size
    });
  }

  get(id: CanopyId): OutboxRecord | undefined {
    return this.recordsById.get(id);
  }

  list(): readonly OutboxRecord[] {
    return [...this.recordsById.values()];
  }

  private require(id: CanopyId): OutboxRecord {
    const record = this.recordsById.get(id);
    if (record === undefined) {
      throw new OutboxError(
        "outbox-record-not-found",
        `Outbox record ${id} was not found.`
      );
    }

    return record;
  }

  private replace(
    id: CanopyId,
    patch: OutboxRecordPatch
  ): OutboxRecord {
    const current = this.require(id);
    const next = freezeRecord(withDefinedFields({ ...current, ...patch }));
    this.recordsById.set(id, next);
    return next;
  }

  private isLeaseExpired(
    record: OutboxRecord,
    now: IsoDateTime,
    options: ReconcileOutboxOptions
  ): boolean {
    const storedExpiry = this.leaseExpiresAtById.get(record.id);
    if (storedExpiry !== undefined) {
      return storedExpiry <= now;
    }
    if (options.leaseTimeoutMs !== undefined && record.leasedAt !== undefined) {
      return addMilliseconds(record.leasedAt, options.leaseTimeoutMs) <= now;
    }

    return false;
  }
}

function isLeaseEligible(
  record: OutboxRecord,
  now: IsoDateTime,
  destination?: OutboxDestination
): boolean {
  if (destination !== undefined && !sameDestination(record.destination, destination)) {
    return false;
  }
  if (record.status !== "pending" && record.status !== "failed") {
    return false;
  }
  if (record.maxAttempts !== undefined && record.attemptCount >= record.maxAttempts) {
    return false;
  }

  return record.nextAttemptAt === undefined || record.nextAttemptAt <= now;
}

function isAttemptExhausted(record: OutboxRecord): boolean {
  return record.maxAttempts !== undefined && record.attemptCount >= record.maxAttempts;
}

function assertNotTerminal(record: OutboxRecord): void {
  if (terminalStatuses.includes(record.status)) {
    throw new OutboxError(
      "outbox-record-terminal",
      `Outbox record ${record.id} is already ${record.status}.`
    );
  }
}

function emptyStatusCounts(): Record<OutboxStatus, number> {
  return {
    pending: 0,
    leased: 0,
    published: 0,
    acknowledged: 0,
    failed: 0,
    "dead-lettered": 0,
    cancelled: 0
  };
}

function sameDestination(
  left: OutboxDestination,
  right: OutboxDestination
): boolean {
  return (
    left.kind === right.kind &&
    left.name === right.name &&
    left.targetRef?.id === right.targetRef?.id
  );
}

function canHandleOutboxRecord(
  handler: OutboxDispatchHandler,
  record: OutboxRecord
): boolean {
  return handler === projectionRebuildOutboxHandler
    ? isProjectionRebuildDestination(record.destination)
    : true;
}

function outboxLeaseOptions(options: {
  readonly leasedBy: string;
  readonly limit: number | undefined;
  readonly now: IsoDateTime;
  readonly leaseDurationMs: number | undefined;
  readonly destination: OutboxDestination | undefined;
}): LeaseOutboxOptions {
  const optionalFields: {
    limit?: number;
    leaseDurationMs?: number;
    destination?: OutboxDestination;
  } = {};

  if (options.limit !== undefined) {
    optionalFields.limit = options.limit;
  }

  if (options.leaseDurationMs !== undefined) {
    optionalFields.leaseDurationMs = options.leaseDurationMs;
  }

  if (options.destination !== undefined) {
    optionalFields.destination = options.destination;
  }

  return {
    leasedBy: options.leasedBy,
    now: options.now,
    ...optionalFields
  };
}

function optionalAuditEventIds(
  eventIds: readonly CanopyId[] | undefined
): { readonly eventIds?: readonly CanopyId[] } {
  return eventIds === undefined ? {} : { eventIds };
}

function optionalAuditMetadata(
  metadata: JsonValue | undefined
): { readonly metadata?: JsonValue } {
  return metadata === undefined ? {} : { metadata };
}

function optionalWriteAudit(
  writeAudit: boolean | undefined
): { readonly writeAudit?: boolean } {
  return writeAudit === undefined ? {} : { writeAudit };
}

function optionalWorkerProjectionRebuild(
  projectionRebuild: PersistentProjectionRebuildResult | undefined
): { readonly projectionRebuild?: PersistentProjectionRebuildResult } {
  return projectionRebuild === undefined ? {} : { projectionRebuild };
}

function isProjectionRebuildDestination(destination: OutboxDestination): boolean {
  return destination.kind === "workflow" && destination.name === "projection-rebuild";
}

function workerRecordResult(input: {
  readonly record: OutboxRecord;
  readonly status: OutboxWorkerRecordResult["status"];
  readonly auditRecord: AdapterAuditRecord;
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
  readonly error?: string;
}): OutboxWorkerRecordResult {
  const optionalFields: {
    projectionRebuild?: PersistentProjectionRebuildResult;
    error?: string;
  } = {};

  if (input.projectionRebuild !== undefined) {
    optionalFields.projectionRebuild = input.projectionRebuild;
  }

  if (input.error !== undefined) {
    optionalFields.error = input.error;
  }

  return {
    recordId: input.record.id,
    eventId: input.record.eventId,
    destination: input.record.destination,
    status: input.status,
    auditRecord: input.auditRecord,
    ...optionalFields
  };
}

function writeOutboxAudit(
  runtime: CanonicalPersistenceRuntime,
  input: {
    readonly record: OutboxRecord;
    readonly status: AdapterAuditStatus;
    readonly startedAt: IsoDateTime;
    readonly completedAt: IsoDateTime;
    readonly eventIds?: readonly CanopyId[];
    readonly metadata?: JsonValue;
    readonly error?: string;
    readonly writeAudit?: boolean;
  }
): AdapterAuditRecord {
  const audit = outboxAuditRecord(input);

  return input.writeAudit === false ? audit : runtime.putAdapterAudit(audit);
}

function outboxAuditRecord(input: {
  readonly record: OutboxRecord;
  readonly status: AdapterAuditStatus;
  readonly startedAt: IsoDateTime;
  readonly completedAt: IsoDateTime;
  readonly eventIds?: readonly CanopyId[];
  readonly metadata?: JsonValue;
  readonly error?: string;
}): AdapterAuditRecord {
  const optionalFields: {
    targetRef?: NonNullable<OutboxDestination["targetRef"]>;
  } = {};

  if (input.record.destination.targetRef !== undefined) {
    optionalFields.targetRef = input.record.destination.targetRef;
  }

  return {
    id: `adapter-audit.outbox.${input.record.id}.${input.status}`,
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: input.completedAt,
    adapterName: `outbox.${input.record.destination.kind}.${input.record.destination.name}`,
    direction: "reconciliation",
    operation: "outbox.dispatch",
    status: input.status,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    ...optionalFields,
    eventIds: input.eventIds ?? [input.record.eventId],
    outboxIds: [input.record.id],
    warnings: [],
    errors: input.error === undefined ? [] : [input.error],
    metadata: input.metadata ?? {
      destinationKind: input.record.destination.kind,
      destinationName: input.record.destination.name
    }
  };
}

function addMilliseconds(value: IsoDateTime, milliseconds: number): IsoDateTime {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

function withDefinedFields(record: Record<string, unknown>): OutboxRecord {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned as unknown as OutboxRecord;
}

function freezeRecord(record: OutboxRecord): OutboxRecord {
  return Object.freeze({
    ...record,
    destination: cloneDestination(record.destination),
    payload: cloneJson(record.payload)
  });
}

function cloneDestination(destination: OutboxDestination): OutboxDestination {
  if (destination.targetRef === undefined) {
    return Object.freeze({
      kind: destination.kind,
      name: destination.name
    });
  }

  return Object.freeze({
    kind: destination.kind,
    name: destination.name,
    targetRef: Object.freeze({ ...destination.targetRef })
  });
}

function cloneJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneJson(item)));
  }
  if (value !== null && typeof value === "object") {
    const copy: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      copy[key] = cloneJson(child);
    }
    return Object.freeze(copy);
  }

  return value;
}
