import type {
  AdapterError,
  AdapterPageRequest,
  FederationTransportAdapter,
  FederationTransportMessage
} from "@canopy/contracts-adapters";
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

export type FederationImportTrustStatus = "trusted" | "warning" | "rejected";

export type FederationImportTrustIssueCode =
  | "sender_authority_missing"
  | "schema_incompatible"
  | "federation_rule_mismatch"
  | "stewardship_agreement_missing"
  | "signature_required";

export interface FederationImportTrustPolicy {
  readonly allowedSenderRefs?: readonly ObjectRef[];
  readonly allowedSchemaVersions?: readonly number[];
  readonly expectedFederationRuleRefs?: readonly ObjectRef[];
  readonly requireEnvelopeFederationRule?: boolean;
  readonly requireDataStewardshipAgreement?: boolean;
  readonly requireSignedRequiredEvents?: boolean;
}

export interface FederationImportTrustIssue {
  readonly code: FederationImportTrustIssueCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly path: readonly string[];
  readonly affectedRef?: ObjectRef;
  readonly eventId?: CanopyId;
  readonly recommendedAction: string;
}

export interface FederationImportTrustAssessment {
  readonly status: FederationImportTrustStatus;
  readonly checkedAt: IsoDateTime;
  readonly issues: readonly FederationImportTrustIssue[];
  readonly warnings: readonly ImportWarning[];
}

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
  readonly trustPolicy?: FederationImportTrustPolicy;
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
  readonly trustAssessment: FederationImportTrustAssessment;
  readonly importReport: CanopyImportReport;
  readonly envelope: CanopyExportEnvelope;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly lifecycleEventRecords: readonly EventRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly adapterAuditRecords: readonly AdapterAuditRecord[];
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
}

export interface ReceiveAndReconcileFederationImportsInput
  extends Omit<FederationReconciliationInput, "message"> {
  readonly transport: FederationTransportAdapter;
  readonly page?: AdapterPageRequest;
  readonly acknowledgeMessages?: boolean;
  readonly acknowledgementAuthorityRefs?: readonly ObjectRef[];
}

export interface ReceiveAndReconcileFederationImportsResult {
  readonly receivedMessageCount: number;
  readonly reconciliations: readonly FederationReconciliationResult[];
  readonly acknowledgedMessageIds: readonly CanopyId[];
  readonly errors: readonly AdapterError[];
  readonly hasMore: boolean;
  readonly nextCursor?: string;
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

  const trustAssessment = assessFederationImportTrust({
    message: input.message,
    envelope: payload.envelope,
    events: payload.events,
    checkedAt: receivedAt,
    ...optionalTrustPolicy(input.trustPolicy)
  });
  const acceptedEvents: CanopyEvent[] = [];
  const decisions = payload.events.map((event) => {
    const localEvent = materializeFederatedEvent(event, {
      envelope: payload.envelope,
      message: input.message,
      receivedAt
    });
    const warnings = [
      ...trustWarningsForEvent(trustAssessment, event),
      ...warningsForFederatedEvent(event, payload.envelope, input.message)
    ];
    const existing = input.runtime.getEvent(localEvent.id);
    const conflictingSource = input.runtime.getEvent(event.id);
    const blockingWarnings = warnings.filter((item) => item.severity === "error");

    if (trustAssessment.status === "rejected") {
      return eventDecision({
        sourceEventId: event.id,
        localEventId: localEvent.id,
        disposition: "quarantined",
        objectRef: event.objectRef,
        warnings
      });
    }

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
  const receivedEventRecord = input.runtime.appendEvent(
    buildFederationImportReceivedEvent({
      message: input.message,
      envelope: payload.envelope,
      events: payload.events,
      receivedAt
    }),
    { recordedAt: receivedAt }
  );
  const eventRecords = acceptedEvents.map((event) =>
    input.runtime.appendEvent(event, { recordedAt: receivedAt })
  );
  const importReport = buildImportReport({
    message: input.message,
    envelope: payload.envelope,
    decisions,
    receivedAt,
    ...optionalImportedByRef(input.importedByRef),
    sourceContentHash: envelopeHash
  });
  const completedEventRecord = input.runtime.appendEvent(
    buildFederationReconciliationCompletedEvent({
      message: input.message,
      envelope: payload.envelope,
      trustAssessment,
      decisions,
      importReport,
      mappingRecords,
      receivedAt
    }),
    { recordedAt: receivedAt }
  );
  const lifecycleEventRecords = [receivedEventRecord, completedEventRecord];
  const projectionEventRecords = [...lifecycleEventRecords, ...eventRecords];
  const outboxRecords =
    input.enqueueProjectionRebuild === false
      ? []
      : enqueueProjectionRebuilds({
          runtime: input.runtime,
          eventRecords: projectionEventRecords,
          destination: input.outboxDestination ?? defaultProjectionRebuildDestination,
          receivedAt,
          ...optionalOutbox(input.outbox)
        });
  const projectionRebuild =
    input.rebuildProjections === false || projectionEventRecords.length === 0
      ? undefined
      : rebuildAndPersistAllProjections(input.runtime, {
          rebuiltAt: receivedAt,
          ...input.projectionRebuildOptions
        });
  const adapterAuditRecords = writeAuditRecord({
    runtime: input.runtime,
    message: input.message,
    report: importReport,
    decisions,
    eventRecords: projectionEventRecords,
    outboxRecords,
    receivedAt,
    writeAudit: input.writeAudit ?? true
  });

  return optionalResult({
    status: reconciliationStatus(decisions),
    trustAssessment,
    importReport,
    envelope: payload.envelope,
    decisions,
    mappingRecords,
    lifecycleEventRecords,
    eventRecords,
    outboxRecords,
    adapterAuditRecords,
    ...optionalProjectionRebuild(projectionRebuild)
  });
}

export async function receiveAndReconcileFederationImports(
  input: ReceiveAndReconcileFederationImportsInput
): Promise<ReceiveAndReconcileFederationImportsResult> {
  const received = await input.transport.receive(input.page);

  if (!received.ok || received.value === undefined) {
    return optionalReceiveResult({
      receivedMessageCount: 0,
      reconciliations: [],
      acknowledgedMessageIds: [],
      errors: received.errors,
      hasMore: false
    });
  }

  const reconciliations: FederationReconciliationResult[] = [];
  const acknowledgedMessageIds: CanopyId[] = [];
  const errors: AdapterError[] = [];

  for (const message of received.value.items) {
    try {
      const reconciliation = reconcileFederationImport({
        message,
        runtime: input.runtime,
        ...optionalReceivedAt(input.receivedAt),
        ...optionalImportedByRef(input.importedByRef),
        ...optionalTrustPolicy(input.trustPolicy),
        ...optionalOutbox(input.outbox),
        ...optionalBoolean("enqueueProjectionRebuild", input.enqueueProjectionRebuild),
        ...optionalOutboxDestination(input.outboxDestination),
        ...optionalBoolean("writeAudit", input.writeAudit),
        ...optionalBoolean("rebuildProjections", input.rebuildProjections),
        ...optionalProjectionRebuildOptions(input.projectionRebuildOptions)
      });
      reconciliations.push(reconciliation);

      if (input.acknowledgeMessages !== false && reconciliation.status !== "quarantined") {
        const acknowledgement = await input.transport.acknowledge(
          message.id,
          input.acknowledgementAuthorityRefs ?? reconciliation.envelope.authorityRefs
        );
        if (acknowledgement.ok) {
          acknowledgedMessageIds.push(message.id);
        } else {
          errors.push(...acknowledgement.errors);
        }
      }
    } catch (error) {
      errors.push(adapterErrorFromReconciliation(message, error));
    }
  }

  return optionalReceiveResult({
    receivedMessageCount: received.value.items.length,
    reconciliations,
    acknowledgedMessageIds,
    errors,
    hasMore: received.value.hasMore,
    ...optionalNextCursor(received.value.nextCursor)
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

export function buildFederationImportReceivedEvent(input: {
  readonly message: FederationTransportMessage;
  readonly envelope: CanopyExportEnvelope;
  readonly events: readonly CanopyEvent[];
  readonly receivedAt: IsoDateTime;
}): CanopyEvent {
  return optionalEvent({
    id: `event.federation.import.received.${idToken(input.message.id)}`,
    type: "federation.import.received",
    occurredAt: input.receivedAt,
    systemActor: "federation_peer",
    objectRef: input.envelope.scopeRef,
    relatedRefs: dedupeRefs([
      input.message.federationRuleRef,
      input.envelope.exportedByRef,
      ...input.message.objectRefs
    ]),
    authorityRefs: input.envelope.authorityRefs,
    sourceCapability: "federation",
    payload: {
      messageId: input.message.id,
      sourceEnvelopeId: input.envelope.id,
      sourceContentHash: input.envelope.contentHash,
      eventIds: input.events.map((event) => event.id),
      objectRefs: input.message.objectRefs,
      schemaVersion: input.envelope.schemaVersion,
      receivedAt: input.receivedAt
    },
    schemaVersion: 1,
    visibility: "commons",
    provenance: {
      kind: "federated",
      sourceEnvelopeId: input.envelope.id,
      sourceContentHash: input.envelope.contentHash,
      importedAt: input.receivedAt
    }
  });
}

export function buildFederationReconciliationCompletedEvent(input: {
  readonly message: FederationTransportMessage;
  readonly envelope: CanopyExportEnvelope;
  readonly trustAssessment: FederationImportTrustAssessment;
  readonly decisions: readonly FederationReconciliationEventDecision[];
  readonly importReport: CanopyImportReport;
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly receivedAt: IsoDateTime;
}): CanopyEvent {
  const status = reconciliationStatus(input.decisions);
  const acceptedEventIds = input.decisions
    .filter((decision) => decision.disposition === "accepted")
    .map((decision) => decision.localEventId);
  const duplicateEventIds = input.decisions
    .filter((decision) => decision.disposition === "duplicate")
    .map((decision) => decision.localEventId);
  const quarantinedDecisions = input.decisions.filter(
    (decision) => decision.disposition === "quarantined"
  );
  const quarantinedEventIds = quarantinedDecisions.map((decision) => decision.localEventId);
  const warnings = input.importReport.warnings.map((item) => item.message);

  return optionalEvent({
    id: `event.federation.reconciliation.completed.${idToken(input.message.id)}.${status}`,
    type: "federation.reconciliation.completed",
    occurredAt: input.receivedAt,
    systemActor: "federation_peer",
    objectRef: input.envelope.scopeRef,
    relatedRefs: dedupeRefs([
      input.message.federationRuleRef,
      input.envelope.exportedByRef,
      ...input.decisions.map((decision) => decision.objectRef)
    ]),
    authorityRefs: input.envelope.authorityRefs,
    sourceCapability: "federation",
    payload: {
      status,
      messageId: input.message.id,
      importReportId: input.importReport.id,
      sourceEnvelopeId: input.envelope.id,
      sourceContentHash: input.envelope.contentHash,
      trustStatus: input.trustAssessment.status,
      trustIssueCodes: input.trustAssessment.issues.map((issue) => issue.code),
      acceptedEventIds,
      duplicateEventIds,
      quarantinedEventIds,
      localMappingCount: input.mappingRecords.length,
      warnings,
      quarantineReview: quarantinedDecisions.map(toQuarantineReviewPayload),
      learningOutputs: federationLearningOutputs({
        status,
        acceptedEventIds,
        duplicateEventIds,
        quarantinedEventIds,
        warnings,
        trustAssessment: input.trustAssessment
      })
    },
    schemaVersion: 1,
    visibility: "commons",
    provenance: {
      kind: "system_generated",
      generatedAt: input.receivedAt,
      notes: "Generated by the federation reconciliation workflow."
    }
  });
}

function toQuarantineReviewPayload(
  decision: FederationReconciliationEventDecision
): JsonValue {
  const highestSeverity = decision.warnings.some((item) => item.severity === "error")
    ? "error"
    : decision.warnings.some((item) => item.severity === "warning")
      ? "warning"
      : "info";

  return {
    sourceEventId: decision.sourceEventId,
    localEventId: decision.localEventId,
    objectRef: objectRefJson(decision.objectRef),
    warningCodes: decision.warnings.map((item) => item.code),
    severity: highestSeverity,
    recommendedAction:
      decision.warnings.find((item) => item.recommendedAction !== undefined)?.recommendedAction ??
      "Review this quarantined import before accepting it into local projections.",
    nextAction: quarantineNextAction(decision.warnings)
  };
}

function objectRefJson(ref: ObjectRef): JsonValue {
  return {
    id: ref.id,
    type: ref.type,
    namespace: ref.namespace,
    lifecycleStatus: ref.lifecycleStatus,
    supersedes: ref.supersedes ?? []
  };
}

function quarantineNextAction(
  warnings: readonly ImportWarning[]
): "accept" | "reject" | "remediate" {
  if (warnings.some((item) => item.code === "unsupported_event_type")) {
    return "reject";
  }

  if (warnings.some((item) => item.severity === "error")) {
    return "remediate";
  }

  return "accept";
}

function federationLearningOutputs(input: {
  readonly status: FederationReconciliationStatus;
  readonly acceptedEventIds: readonly CanopyId[];
  readonly duplicateEventIds: readonly CanopyId[];
  readonly quarantinedEventIds: readonly CanopyId[];
  readonly warnings: readonly string[];
  readonly trustAssessment: FederationImportTrustAssessment;
}): readonly JsonValue[] {
  return [
    {
      label: "import_status",
      value: input.status
    },
    {
      label: "accepted_events",
      value: String(input.acceptedEventIds.length)
    },
    {
      label: "duplicate_events",
      value: String(input.duplicateEventIds.length)
    },
    {
      label: "quarantined_events",
      value: String(input.quarantinedEventIds.length)
    },
    {
      label: "trust_status",
      value: input.trustAssessment.status
    },
    {
      label: "warning_count",
      value: String(input.warnings.length)
    }
  ];
}

export function assessFederationImportTrust(input: {
  readonly message: FederationTransportMessage;
  readonly envelope: CanopyExportEnvelope;
  readonly events: readonly CanopyEvent[];
  readonly checkedAt: IsoDateTime;
  readonly trustPolicy?: FederationImportTrustPolicy;
}): FederationImportTrustAssessment {
  const policy = input.trustPolicy ?? {};
  const issues: FederationImportTrustIssue[] = [];

  if (
    policy.allowedSenderRefs !== undefined &&
    policy.allowedSenderRefs.length > 0 &&
    !hasRef(policy.allowedSenderRefs, input.envelope.exportedByRef)
  ) {
    issues.push(
      trustIssue({
        code: "sender_authority_missing",
        severity: "error",
        message: `Envelope ${input.envelope.id} was exported by ${input.envelope.exportedByRef.id}, which is not an allowed sender.`,
        path: ["envelope", "exportedByRef"],
        affectedRef: input.envelope.exportedByRef,
        recommendedAction: "Reject the import until the sender is authorized for this federation route."
      })
    );
  }

  if (input.envelope.authorityRefs.length === 0) {
    issues.push(
      trustIssue({
        code: "sender_authority_missing",
        severity: "error",
        message: `Envelope ${input.envelope.id} does not declare authority refs for import.`,
        path: ["envelope", "authorityRefs"],
        affectedRef: input.envelope.scopeRef,
        recommendedAction: "Require the sending commons to attach mandate, agreement, or policy authority."
      })
    );
  }

  if (input.message.schemaVersion !== input.envelope.schemaVersion) {
    issues.push(
      trustIssue({
        code: "schema_incompatible",
        severity: "error",
        message: `Message schema version ${input.message.schemaVersion} does not match envelope schema version ${input.envelope.schemaVersion}.`,
        path: ["message", "schemaVersion"],
        affectedRef: input.envelope.scopeRef,
        recommendedAction: "Quarantine the import and request a compatible export envelope."
      })
    );
  }

  if (
    policy.allowedSchemaVersions !== undefined &&
    !policy.allowedSchemaVersions.includes(input.envelope.schemaVersion)
  ) {
    issues.push(
      trustIssue({
        code: "schema_incompatible",
        severity: "error",
        message: `Envelope schema version ${input.envelope.schemaVersion} is not allowed by local import policy.`,
        path: ["envelope", "schemaVersion"],
        affectedRef: input.envelope.scopeRef,
        recommendedAction: "Run a schema compatibility review before accepting the import."
      })
    );
  }

  if (policy.requireEnvelopeFederationRule !== false && input.envelope.federationRuleRef === undefined) {
    issues.push(
      trustIssue({
        code: "federation_rule_mismatch",
        severity: "error",
        message: `Envelope ${input.envelope.id} does not declare a federation rule ref.`,
        path: ["envelope", "federationRuleRef"],
        affectedRef: input.envelope.scopeRef,
        recommendedAction: "Require the sender to bind the export to a federation rule."
      })
    );
  }

  if (
    input.envelope.federationRuleRef !== undefined &&
    !sameRef(input.message.federationRuleRef, input.envelope.federationRuleRef)
  ) {
    issues.push(
      trustIssue({
        code: "federation_rule_mismatch",
        severity: "error",
        message: `Message ${input.message.id} uses federation rule ${input.message.federationRuleRef.id}, but envelope ${input.envelope.id} uses ${input.envelope.federationRuleRef.id}.`,
        path: ["message", "federationRuleRef"],
        affectedRef: input.message.federationRuleRef,
        recommendedAction: "Reject the import until message and envelope federation rules agree."
      })
    );
  }

  if (
    policy.expectedFederationRuleRefs !== undefined &&
    policy.expectedFederationRuleRefs.length > 0 &&
    !hasRef(policy.expectedFederationRuleRefs, input.message.federationRuleRef)
  ) {
    issues.push(
      trustIssue({
        code: "federation_rule_mismatch",
        severity: "error",
        message: `Message ${input.message.id} is not bound to an expected local federation rule.`,
        path: ["message", "federationRuleRef"],
        affectedRef: input.message.federationRuleRef,
        recommendedAction: "Route this message through the correct federation agreement or quarantine it."
      })
    );
  }

  if (
    policy.requireDataStewardshipAgreement === true &&
    input.envelope.dataStewardshipAgreements.length === 0
  ) {
    issues.push(
      trustIssue({
        code: "stewardship_agreement_missing",
        severity: "error",
        message: `Envelope ${input.envelope.id} does not include a data stewardship agreement.`,
        path: ["envelope", "dataStewardshipAgreements"],
        affectedRef: input.envelope.scopeRef,
        recommendedAction: "Require a data stewardship agreement before importing governed records."
      })
    );
  }

  if (policy.requireSignedRequiredEvents !== false) {
    for (const event of input.events) {
      if (
        event.signingIntent?.requiredForFederation === true &&
        (event.signingIntent.status !== "signed" || event.signingIntent.signature === undefined)
      ) {
        issues.push(
          trustIssue({
            code: "signature_required",
            severity: "error",
            message: `Event ${event.id} requires a federation signature but is not signed.`,
            path: ["events", event.id, "signingIntent"],
            affectedRef: event.objectRef,
            eventId: event.id,
            recommendedAction: "Quarantine the event until the sender supplies a verifiable signature."
          })
        );
      }
    }
  }

  const warnings = issues.map((issue) => importWarningFromTrustIssue(issue, input.envelope.scopeRef));
  const status =
    issues.some((issue) => issue.severity === "error")
      ? "rejected"
      : issues.length > 0
        ? "warning"
        : "trusted";

  return optionalTrustAssessment({
    status,
    checkedAt: input.checkedAt,
    issues,
    warnings
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

function trustIssue(input: FederationImportTrustIssue): FederationImportTrustIssue {
  const optionalFields: {
    affectedRef?: ObjectRef;
    eventId?: CanopyId;
  } = {};

  if (input.affectedRef !== undefined) {
    optionalFields.affectedRef = input.affectedRef;
  }
  if (input.eventId !== undefined) {
    optionalFields.eventId = input.eventId;
  }

  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    path: input.path,
    recommendedAction: input.recommendedAction,
    ...optionalFields
  };
}

function importWarningFromTrustIssue(
  issue: FederationImportTrustIssue,
  fallbackRef: ObjectRef
): ImportWarning {
  return warning({
    code: importWarningCodeForTrustIssue(issue.code),
    severity: issue.severity,
    message: issue.message,
    path: issue.path,
    affectedRef: issue.affectedRef ?? fallbackRef,
    recommendedAction: issue.recommendedAction
  });
}

function importWarningCodeForTrustIssue(
  code: FederationImportTrustIssueCode
): ImportWarning["code"] {
  switch (code) {
    case "sender_authority_missing":
    case "signature_required":
      return "authority_refs_missing";
    case "schema_incompatible":
      return "schema_version_mismatch";
    case "federation_rule_mismatch":
      return "federation_rule_conflict";
    case "stewardship_agreement_missing":
      return "stewardship_rule_conflict";
  }
}

function trustWarningsForEvent(
  assessment: FederationImportTrustAssessment,
  event: CanopyEvent
): readonly ImportWarning[] {
  return assessment.warnings.filter(
    (item) =>
      item.path.length < 2 ||
      item.path[0] !== "events" ||
      item.path[1] === event.id
  );
}

function optionalImportedByRef(
  importedByRef: ObjectRef | undefined
): { readonly importedByRef?: ObjectRef } {
  return importedByRef === undefined ? {} : { importedByRef };
}

function optionalReceivedAt(
  receivedAt: IsoDateTime | undefined
): { readonly receivedAt?: IsoDateTime } {
  return receivedAt === undefined ? {} : { receivedAt };
}

function optionalTrustPolicy(
  trustPolicy: FederationImportTrustPolicy | undefined
): { readonly trustPolicy?: FederationImportTrustPolicy } {
  return trustPolicy === undefined ? {} : { trustPolicy };
}

function optionalOutbox(
  outbox: OutboxRuntime | undefined
): { readonly outbox?: OutboxRuntime } {
  return outbox === undefined ? {} : { outbox };
}

function optionalOutboxDestination(
  outboxDestination: OutboxDestination | undefined
): { readonly outboxDestination?: OutboxDestination } {
  return outboxDestination === undefined ? {} : { outboxDestination };
}

function optionalBoolean<TKey extends "enqueueProjectionRebuild" | "writeAudit" | "rebuildProjections">(
  key: TKey,
  value: boolean | undefined
): { readonly [K in TKey]?: boolean } {
  return value === undefined ? {} : ({ [key]: value } as { readonly [K in TKey]?: boolean });
}

function optionalProjectionRebuildOptions(
  projectionRebuildOptions:
    | Omit<PersistentProjectionRebuildOptions, "events">
    | undefined
): { readonly projectionRebuildOptions?: Omit<PersistentProjectionRebuildOptions, "events"> } {
  return projectionRebuildOptions === undefined ? {} : { projectionRebuildOptions };
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

function optionalTrustAssessment(
  assessment: FederationImportTrustAssessment
): FederationImportTrustAssessment {
  return JSON.parse(JSON.stringify(assessment)) as FederationImportTrustAssessment;
}

function optionalResult(result: FederationReconciliationResult): FederationReconciliationResult {
  return JSON.parse(JSON.stringify(result)) as FederationReconciliationResult;
}

function optionalReceiveResult(
  result: ReceiveAndReconcileFederationImportsResult
): ReceiveAndReconcileFederationImportsResult {
  return JSON.parse(JSON.stringify(result)) as ReceiveAndReconcileFederationImportsResult;
}

function optionalNextCursor(nextCursor: string | undefined): { readonly nextCursor?: string } {
  return nextCursor === undefined ? {} : { nextCursor };
}

function adapterErrorFromReconciliation(
  message: FederationTransportMessage,
  error: unknown
): AdapterError {
  if (error instanceof FederationReconciliationError) {
    return {
      code: error.code === "content-hash-mismatch" ? "validation_failed" : "schema_mismatch",
      message: error.message,
      retryable: false,
      path: ["message", message.id]
    };
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : `Failed to reconcile ${message.id}.`,
    retryable: false,
    path: ["message", message.id]
  };
}

function idToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function hasRef(refs: readonly ObjectRef[], target: ObjectRef): boolean {
  return refs.some((ref) => sameRef(ref, target));
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  const byKey = new Map<string, ObjectRef>();
  for (const ref of refs) {
    byKey.set(refKey(ref), ref);
  }
  return [...byKey.values()].sort((left, right) => refKey(left).localeCompare(refKey(right)));
}
