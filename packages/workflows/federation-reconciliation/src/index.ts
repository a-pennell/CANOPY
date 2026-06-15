import type { FederationTransportMessage } from "@canopy/contracts-adapters";
import type {
  AdapterAuditRecord,
  CanonicalMappingRecord,
  EventRecord,
  JsonValue,
  OutboxDestination,
  OutboxRecord
} from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyExportEnvelope,
  CanopyId,
  CanopyImportReport,
  ContentHash,
  ImportWarning,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import {
  createPersistentOutbox,
  type OutboxRuntime
} from "@canopy/workflows-outbox";
import {
  rebuildAndPersistAllProjections,
  type PersistentProjectionRebuildOptions,
  type PersistentProjectionRebuildResult
} from "@canopy/workflows-projection-rebuild";

export type FederationReconciliationEventDisposition =
  | "accepted"
  | "duplicate"
  | "quarantined";

export type FederationReconciliationStatus =
  | "applied"
  | "duplicates-only"
  | "quarantined"
  | "partial";

export type FederationReconciliationErrorCode =
  | "missing-envelope"
  | "missing-events"
  | "content-hash-mismatch";

export class FederationReconciliationError extends Error {
  readonly code: FederationReconciliationErrorCode;

  constructor(code: FederationReconciliationErrorCode, message: string) {
    super(message);
    this.name = "FederationReconciliationError";
    this.code = code;
  }
}

export interface FederationReconciliationInput {
  readonly message: FederationTransportMessage;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly receivedAt?: IsoDateTime;
  readonly importedByRef?: ObjectRef;
  readonly outbox?: OutboxRuntime;
  readonly enqueueProjectionRebuild?: boolean;
  readonly outboxDestination?: OutboxDestination;
  readonly writeAudit?: boolean;
  readonly rebuildProjections?: boolean;
  readonly projectionRebuildOptions?: Omit<PersistentProjectionRebuildOptions, "events">;
}

export interface FederationReconciliationEventDecision {
  readonly sourceEventId: CanopyId;
  readonly localEventId: CanopyId;
  readonly disposition: FederationReconciliationEventDisposition;
  readonly objectRef: ObjectRef;
  readonly warnings: readonly ImportWarning[];
}

export interface FederationReconciliationResult {
  readonly status: FederationReconciliationStatus;
  readonly importReport: CanopyImportReport;
  readonly envelope: CanopyExportEnvelope;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly adapterAuditRecords: readonly AdapterAuditRecord[];
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
}

interface FederationPayload {
  readonly envelope: CanopyExportEnvelope;
  readonly events: readonly CanopyEvent[];
}

const defaultProjectionRebuildDestination: OutboxDestination = {
  kind: "workflow",
  name: "projection-rebuild"
};

export function reconcileFederationImport(
  input: FederationReconciliationInput
): FederationReconciliationResult {
  const receivedAt = input.receivedAt ?? input.message.receivedAt ?? defaultReceivedAt(input.message);
  const payload = federationPayload(input.message);
  const envelopeHash = input.message.contentHash ?? payload.envelope.contentHash;

  if (input.message.contentHash !== undefined && input.message.contentHash !== payload.envelope.contentHash) {
    throw new FederationReconciliationError(
      "content-hash-mismatch",
      `Federation message ${input.message.id} content hash does not match envelope ${payload.envelope.id}.`
    );
  }

  const acceptedEvents: CanopyEvent[] = [];
  const decisions = payload.events.map((event) => {
    const localEvent = materializeFederatedEvent(event, {
      envelope: payload.envelope,
      message: input.message,
      receivedAt
    });
    const warnings = warningsForFederatedEvent(event, payload.envelope, input.message);
    const existing = input.runtime.getEvent(localEvent.id);
    const conflictingSource = input.runtime.getEvent(event.id);
    const blockingWarnings = warnings.filter((item) => item.severity === "error");

    if (existing !== undefined) {
      return eventDecision({
        sourceEventId: event.id,
        localEventId: localEvent.id,
        disposition: "duplicate",
        objectRef: event.objectRef,
        warnings
      });
    }

    if (conflictingSource !== undefined) {
      return eventDecision({
        sourceEventId: event.id,
        localEventId: localEvent.id,
        disposition: "quarantined",
        objectRef: event.objectRef,
        warnings: [
          ...warnings,
          warning({
            code: "federation_rule_conflict",
            severity: "error",
            message: `Source event id ${event.id} already exists locally and must be reconciled by governance.`,
            path: ["events", event.id],
            affectedRef: event.objectRef,
            recommendedAction: "Preserve the remote event as quarantined evidence and open governance reconciliation."
          })
        ]
      });
    }

    if (event.visibility === "private" || event.visibility === "sealed") {
      return eventDecision({
        sourceEventId: event.id,
        localEventId: localEvent.id,
        disposition: "quarantined",
        objectRef: event.objectRef,
        warnings: [
          ...warnings,
          warning({
            code: "stewardship_rule_conflict",
            severity: "error",
            message: `Remote event ${event.id} is ${event.visibility} and cannot be imported without stewardship review.`,
            path: ["events", event.id, "visibility"],
            affectedRef: event.objectRef,
            recommendedAction: "Require local data-stewardship review before import."
          })
        ]
      });
    }

    if (blockingWarnings.length > 0) {
      return eventDecision({
        sourceEventId: event.id,
        localEventId: localEvent.id,
        disposition: "quarantined",
        objectRef: event.objectRef,
        warnings
      });
    }

    acceptedEvents.push(localEvent);
    return eventDecision({
      sourceEventId: event.id,
      localEventId: localEvent.id,
      disposition: "accepted",
      objectRef: event.objectRef,
      warnings
    });
  });

  const mappingRecords = writeFederationMappings({
    runtime: input.runtime,
    envelope: payload.envelope,
    message: input.message,
    decisions,
    receivedAt,
    ...optionalImportedByRef(input.importedByRef)
  });
  const eventRecords = acceptedEvents.map((event) =>
    input.runtime.appendEvent(event, { recordedAt: receivedAt })
  );
  const outboxRecords =
    input.enqueueProjectionRebuild === false
      ? []
      : enqueueProjectionRebuilds({
          runtime: input.runtime,
          eventRecords,
          destination: input.outboxDestination ?? defaultProjectionRebuildDestination,
          receivedAt,
          ...optionalOutbox(input.outbox)
        });
  const projectionRebuild =
    input.rebuildProjections === false || eventRecords.length === 0
      ? undefined
      : rebuildAndPersistAllProjections(input.runtime, {
          rebuiltAt: receivedAt,
          ...input.projectionRebuildOptions
        });
  const importReport = buildImportReport({
    message: input.message,
    envelope: payload.envelope,
    decisions,
    receivedAt,
    ...optionalImportedByRef(input.importedByRef),
    sourceContentHash: envelopeHash
  });
  const adapterAuditRecords = writeAuditRecord({
    runtime: input.runtime,
    message: input.message,
    report: importReport,
    decisions,
    eventRecords,
    outboxRecords,
    receivedAt,
    writeAudit: input.writeAudit ?? true
  });

  return optionalResult({
    status: reconciliationStatus(decisions),
    importReport,
    envelope: payload.envelope,
    decisions,
    mappingRecords,
    eventRecords,
    outboxRecords,
    adapterAuditRecords,
    ...optionalProjectionRebuild(projectionRebuild)
  });
}

export function materializeFederatedEvent(
  event: CanopyEvent,
  input: {
    readonly envelope: CanopyExportEnvelope;
    readonly message: FederationTransportMessage;
    readonly receivedAt: IsoDateTime;
  }
): CanopyEvent {
  return optionalEvent({
    ...event,
    id: federatedLocalEventId(input.envelope.id, event.id),
    relatedRefs: dedupeRefs([
      ...event.relatedRefs,
      input.envelope.scopeRef,
      input.message.federationRuleRef
    ]),
    payload: {
      ...event.payload,
      importedFromFederationEnvelopeId: input.envelope.id,
      importedFromFederationMessageId: input.message.id,
      importedFromFederationEventId: event.id,
      importedAt: input.receivedAt
    },
    provenance: {
      ...event.provenance,
      kind: "federated",
      sourceEventId: event.id,
      sourceEnvelopeId: input.envelope.id,
      sourceContentHash: input.envelope.contentHash,
      importedAt: input.receivedAt
    }
  });
}

function federationPayload(message: FederationTransportMessage): FederationPayload {
  const envelope = message.payload["envelope"];
  const events = message.payload["events"];

  if (!isCanopyExportEnvelope(envelope)) {
    throw new FederationReconciliationError(
      "missing-envelope",
      `Federation message ${message.id} does not include a Canopy export envelope.`
    );
  }

  if (!Array.isArray(events) || !events.every(isCanopyEvent)) {
    throw new FederationReconciliationError(
      "missing-events",
      `Federation message ${message.id} does not include importable Canopy events.`
    );
  }

  return { envelope, events };
}

function warningsForFederatedEvent(
  event: CanopyEvent,
  envelope: CanopyExportEnvelope,
  message: FederationTransportMessage
): readonly ImportWarning[] {
  const warnings: ImportWarning[] = [];

  if (!message.eventIds.includes(event.id)) {
    warnings.push(
      warning({
        code: "content_hash_mismatch",
        severity: "warning",
        message: `Event ${event.id} is present in payload but absent from the transport event id list.`,
        path: ["message", "eventIds"],
        affectedRef: event.objectRef,
        recommendedAction: "Verify the sender's export manifest before trusting derived projections."
      })
    );
  }

  if (!envelope.includes.includes(event.objectRef.type)) {
    warnings.push(
      warning({
        code: "unsupported_event_type",
        severity: "error",
        message: `Envelope ${envelope.id} does not list object type ${event.objectRef.type}.`,
        path: ["envelope", "includes"],
        affectedRef: event.objectRef,
        recommendedAction: "Quarantine or request a corrected export envelope."
      })
    );
  }

  if (event.authorityRefs.length === 0 && event.type.startsWith("federation.")) {
    warnings.push(
      warning({
        code: "authority_refs_missing",
        severity: "warning",
        message: `Federation event ${event.id} has no authority refs.`,
        path: ["events", event.id, "authorityRefs"],
        affectedRef: event.objectRef,
        recommendedAction: "Require governance review before acting on this event."
      })
    );
  }

  if (event.redaction?.isRedactedStub === true || event.payload["method"] === "stub_only") {
    warnings.push(
      warning({
        code: "redaction_stub_only",
        severity: "info",
        message: `Event ${event.id} is a redaction stub and must remain non-reidentifying.`,
        path: ["events", event.id, "redaction"],
        affectedRef: event.objectRef,
        recommendedAction: "Preserve the stub and do not request sealed fields unless authorized."
      })
    );
  }

  if (event.schemaVersion !== envelope.schemaVersion) {
    warnings.push(
      warning({
        code: "schema_version_mismatch",
        severity: "warning",
        message: `Event ${event.id} schema version ${event.schemaVersion} differs from envelope version ${envelope.schemaVersion}.`,
        path: ["events", event.id, "schemaVersion"],
        affectedRef: event.objectRef,
        recommendedAction: "Keep the event but flag projection compatibility review."
      })
    );
  }

  return warnings;
}

function writeFederationMappings(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly envelope: CanopyExportEnvelope;
  readonly message: FederationTransportMessage;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly receivedAt: IsoDateTime;
  readonly importedByRef?: ObjectRef;
}): readonly CanonicalMappingRecord[] {
  const acceptedRefs = dedupeRefs(
    input.decisions
      .filter((decision) => decision.disposition !== "quarantined")
      .map((decision) => decision.objectRef)
  );

  return acceptedRefs.map((ref) =>
    input.runtime.putMapping(
      optionalMappingRecord({
        id: `mapping.federation.${idToken(input.envelope.id)}.${idToken(refKey(ref))}`,
        kind: "canonical-mapping",
        schemaVersion: 1,
        createdAt: input.receivedAt,
        updatedAt: input.receivedAt,
        source: {
          sourceProject: "canopy",
          sourceEntity: "federation-object",
          sourceId: refKey(ref),
          sourceVersion: input.envelope.contentHash
        },
        sourcePointer: {
          sourceProject: "canopy",
          sourceEntity: "federation-object",
          sourceId: refKey(ref),
          sourceVersion: input.envelope.contentHash,
          importedAt: input.receivedAt
        },
        localLabel: ref.id,
        localType: ref.type,
        canonicalRef: ref,
        canonicalType: ref.type,
        disposition: "artifact",
        status: "approved",
        confidence: 1,
        mappedByRef: input.importedByRef ?? input.message.federationRuleRef,
        authorityRefs: input.envelope.authorityRefs,
        evidenceRefs: [input.message.federationRuleRef],
        reviewedAt: input.receivedAt,
        contentHash: input.envelope.contentHash
      })
    )
  );
}

function enqueueProjectionRebuilds(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly eventRecords: readonly EventRecord[];
  readonly destination: OutboxDestination;
  readonly receivedAt: IsoDateTime;
  readonly outbox?: OutboxRuntime;
}): readonly OutboxRecord[] {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });

  return input.eventRecords.map((record) =>
    outbox.enqueue({
      eventId: record.eventId,
      eventType: record.eventType,
      destination: input.destination,
      payload: {
        source: "federation-reconciliation",
        eventId: record.eventId,
        eventType: record.eventType,
        objectRefId: record.objectRef.id
      },
      dedupeKey: `event:${record.eventId}:projection-rebuild`,
      createdAt: input.receivedAt
    })
  );
}

function buildImportReport(input: {
  readonly message: FederationTransportMessage;
  readonly envelope: CanopyExportEnvelope;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly receivedAt: IsoDateTime;
  readonly importedByRef?: ObjectRef;
  readonly sourceContentHash: ContentHash;
}): CanopyImportReport {
  const accepted = input.decisions.filter((decision) => decision.disposition === "accepted");

  return optionalImportReport({
    id: `import-report.federation.${idToken(input.envelope.id)}.${idToken(input.message.id)}`,
    importedAt: input.receivedAt,
    ...optionalImportedByRef(input.importedByRef),
    sourceEnvelopeId: input.envelope.id,
    sourceContentHash: input.sourceContentHash,
    acceptedObjectRefs: dedupeRefs(accepted.map((decision) => decision.objectRef)),
    acceptedEventIds: accepted.map((decision) => decision.localEventId),
    localMappings: input.envelope.localMappings,
    warnings: input.decisions.flatMap((decision) => decision.warnings),
    schemaVersion: 1
  });
}

function writeAuditRecord(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly message: FederationTransportMessage;
  readonly report: CanopyImportReport;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly receivedAt: IsoDateTime;
  readonly writeAudit: boolean;
}): readonly AdapterAuditRecord[] {
  if (!input.writeAudit) {
    return [];
  }

  const status = auditStatus(input.decisions);
  const targetRef = input.message.objectRefs[0];
  const record = optionalAuditRecord({
    id: `adapter-audit.federation-reconciliation.${idToken(input.message.id)}`,
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: input.receivedAt,
    updatedAt: input.receivedAt,
    adapterName: "workflow.federation-reconciliation",
    direction: "reconciliation",
    operation: "federation.import.reconcile",
    status,
    startedAt: input.receivedAt,
    completedAt: input.receivedAt,
    ...(targetRef === undefined ? {} : { targetRef }),
    externalRef: {
      provider: "canopy-federation",
      resourceType: "federation-message",
      resourceId: input.message.id,
      sourceProject: "canopy"
    },
    eventIds: input.eventRecords.map((event) => event.eventId),
    outboxIds: input.outboxRecords.map((outbox) => outbox.id),
    ...(input.message.contentHash === undefined ? {} : { requestHash: input.message.contentHash }),
    responseHash: input.report.sourceContentHash,
    warnings: input.report.warnings.map((item) => item.message),
    errors: input.decisions
      .filter((decision) => decision.disposition === "quarantined")
      .map((decision) => `Quarantined ${decision.sourceEventId}.`),
    metadata: {
      importReportId: input.report.id,
      acceptedEventIds: input.report.acceptedEventIds,
      dispositions: input.decisions.map((decision) => ({
        sourceEventId: decision.sourceEventId,
        localEventId: decision.localEventId,
        disposition: decision.disposition
      }))
    }
  });

  return [input.runtime.putAdapterAudit(record)];
}

function reconciliationStatus(
  decisions: readonly FederationReconciliationEventDecision[]
): FederationReconciliationStatus {
  const acceptedCount = decisions.filter((decision) => decision.disposition === "accepted").length;
  const duplicateCount = decisions.filter((decision) => decision.disposition === "duplicate").length;
  const quarantinedCount = decisions.filter((decision) => decision.disposition === "quarantined").length;

  if (acceptedCount > 0 && quarantinedCount > 0) {
    return "partial";
  }

  if (acceptedCount > 0) {
    return "applied";
  }

  if (duplicateCount > 0 && quarantinedCount === 0) {
    return "duplicates-only";
  }

  return "quarantined";
}

function auditStatus(
  decisions: readonly FederationReconciliationEventDecision[]
): AdapterAuditRecord["status"] {
  const status = reconciliationStatus(decisions);
  if (status === "applied") {
    return "succeeded";
  }
  if (status === "duplicates-only") {
    return "skipped";
  }
  if (status === "partial") {
    return "partial";
  }
  return "failed";
}

function eventDecision(
  input: FederationReconciliationEventDecision
): FederationReconciliationEventDecision {
  return {
    sourceEventId: input.sourceEventId,
    localEventId: input.localEventId,
    disposition: input.disposition,
    objectRef: input.objectRef,
    warnings: input.warnings
  };
}

function warning(input: ImportWarning): ImportWarning {
  const optionalFields: {
    affectedRef?: ObjectRef;
    source?: NonNullable<ImportWarning["source"]>;
    localMappingId?: CanopyId;
    recommendedAction?: string;
  } = {};

  if (input.affectedRef !== undefined) {
    optionalFields.affectedRef = input.affectedRef;
  }
  if (input.source !== undefined) {
    optionalFields.source = input.source;
  }
  if (input.localMappingId !== undefined) {
    optionalFields.localMappingId = input.localMappingId;
  }
  if (input.recommendedAction !== undefined) {
    optionalFields.recommendedAction = input.recommendedAction;
  }

  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    path: input.path,
    ...optionalFields
  };
}

function optionalImportedByRef(
  importedByRef: ObjectRef | undefined
): { readonly importedByRef?: ObjectRef } {
  return importedByRef === undefined ? {} : { importedByRef };
}

function optionalOutbox(
  outbox: OutboxRuntime | undefined
): { readonly outbox?: OutboxRuntime } {
  return outbox === undefined ? {} : { outbox };
}

function optionalProjectionRebuild(
  projectionRebuild: PersistentProjectionRebuildResult | undefined
): { readonly projectionRebuild?: PersistentProjectionRebuildResult } {
  return projectionRebuild === undefined ? {} : { projectionRebuild };
}

function federatedLocalEventId(envelopeId: CanopyId, sourceEventId: CanopyId): CanopyId {
  return `event.federation.import.${idToken(envelopeId)}.${idToken(sourceEventId)}`;
}

function defaultReceivedAt(message: FederationTransportMessage): IsoDateTime {
  return message.sentAt ?? new Date(0).toISOString();
}

function isCanopyExportEnvelope(value: unknown): value is CanopyExportEnvelope {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.exportedAt === "string" &&
    isObjectRef(value.scopeRef) &&
    typeof value.contentHash === "string" &&
    Array.isArray(value.includes) &&
    Array.isArray(value.authorityRefs)
  );
}

function isCanopyEvent(value: unknown): value is CanopyEvent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.occurredAt === "string" &&
    isObjectRef(value.objectRef) &&
    Array.isArray(value.relatedRefs) &&
    value.relatedRefs.every(isObjectRef) &&
    Array.isArray(value.authorityRefs) &&
    value.authorityRefs.every(isObjectRef) &&
    typeof value.sourceCapability === "string" &&
    isRecord(value.payload) &&
    typeof value.schemaVersion === "number"
  );
}

function isObjectRef(value: unknown): value is ObjectRef {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.namespace === "string" &&
    typeof value.lifecycleStatus === "string"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalEvent(event: CanopyEvent): CanopyEvent {
  return JSON.parse(JSON.stringify(event)) as CanopyEvent;
}

function optionalMappingRecord(record: CanonicalMappingRecord): CanonicalMappingRecord {
  return JSON.parse(JSON.stringify(record)) as CanonicalMappingRecord;
}

function optionalAuditRecord(record: AdapterAuditRecord): AdapterAuditRecord {
  return JSON.parse(JSON.stringify(record)) as AdapterAuditRecord;
}

function optionalImportReport(report: CanopyImportReport): CanopyImportReport {
  return JSON.parse(JSON.stringify(report)) as CanopyImportReport;
}

function optionalResult(result: FederationReconciliationResult): FederationReconciliationResult {
  return JSON.parse(JSON.stringify(result)) as FederationReconciliationResult;
}

function idToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  const byKey = new Map<string, ObjectRef>();
  for (const ref of refs) {
    byKey.set(refKey(ref), ref);
  }
  return [...byKey.values()].sort((left, right) => refKey(left).localeCompare(refKey(right)));
}
