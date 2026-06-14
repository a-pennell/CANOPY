import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  ConsentRecord,
  ConsentRule,
  ContentHash,
  DataStewardshipAgreement,
  DataStewardshipExportFormat,
  DataUse,
  DataVisibility,
  DisclosureRule,
  ExportRule,
  IsoDateTime,
  ObjectRef,
  RedactionMetadata,
  RedactionMethod,
  RedactionReason
} from "@canopy/contracts-kernel";
import type {
  CivicMemoryAppendResult,
  CivicMemoryService
} from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

const SOURCE_CAPABILITY = "data-stewardship" as const;
const SCHEMA_VERSION = 1 as const;
const DEFAULT_VISIBILITY = "commons" as const;
const DEFAULT_DATA_STATE = "locally_verified" as const;
const REDACTION_DATA_STATE = "sensitive" as const;

export type DataStewardshipCommandErrorCode =
  | "missing-authority"
  | "missing-consenting-ref"
  | "missing-consent-record"
  | "missing-redaction-target"
  | "missing-redaction-fields"
  | "missing-export-scope"
  | "unknown-event";

export class DataStewardshipCommandError extends Error {
  readonly code: DataStewardshipCommandErrorCode;

  constructor(code: DataStewardshipCommandErrorCode, message: string) {
    super(message);
    this.name = "DataStewardshipCommandError";
    this.code = code;
  }
}

export interface DataStewardshipServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface EventEnvelopeInput {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface SetVisibilityRuleCommand extends EventEnvelopeInput {
  readonly agreementRef: ObjectRef;
  readonly governedRef: ObjectRef;
  readonly stewardRefs?: readonly ObjectRef[];
  readonly visibility: DataVisibility;
  readonly allowedUses?: readonly DataUse[];
  readonly prohibitedUses?: readonly DataUse[];
  readonly consentRequired?: boolean;
  readonly disclosureRule?: DisclosureRule;
  readonly agreement?: Partial<DataStewardshipAgreement>;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly note?: string;
}

export interface RecordConsentCommand extends EventEnvelopeInput {
  readonly consentRef: ObjectRef;
  readonly ruleRef: ObjectRef;
  readonly rule: ConsentRule;
  readonly consentingRef: ObjectRef;
  readonly subjectRef?: ObjectRef;
  readonly evidenceRefs?: readonly ObjectRef[];
  readonly status?: ConsentRecord["status"];
  readonly expiresAt?: IsoDateTime;
  readonly note?: string;
}

export interface RevokeConsentCommand extends EventEnvelopeInput {
  readonly consentRef: ObjectRef;
  readonly ruleRef: ObjectRef;
  readonly consentingRef: ObjectRef;
  readonly supersedesConsentRecordId: CanopyId;
  readonly revocationReason?: string;
  readonly note?: string;
}

export interface RequestRedactionCommand extends EventEnvelopeInput {
  readonly requestRef: ObjectRef;
  readonly targetRef: ObjectRef;
  readonly targetEventId?: CanopyId;
  readonly reason: RedactionReason;
  readonly method: RedactionMethod;
  readonly requestedFields: readonly string[];
  readonly preservedFields?: readonly string[];
  readonly dataStewardshipAgreementRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly note?: string;
}

export interface ApplyRedactionCommand extends EventEnvelopeInput {
  readonly redactionRef: ObjectRef;
  readonly originalEventId: CanopyId;
  readonly targetRef: ObjectRef;
  readonly reason: RedactionReason;
  readonly method: RedactionMethod;
  readonly redactedFields: readonly string[];
  readonly preservedFields: readonly string[];
  readonly originalContentHash?: ContentHash;
  readonly redactedContentHash?: ContentHash;
  readonly dataStewardshipAgreementRef?: ObjectRef;
  readonly note?: string;
}

export interface ApproveExportCommand extends EventEnvelopeInput {
  readonly exportRef: ObjectRef;
  readonly exportRule: ExportRule;
  readonly recipientRef: ObjectRef;
  readonly objectRefs: readonly ObjectRef[];
  readonly format: DataStewardshipExportFormat;
  readonly includeRedactionStubs?: boolean;
  readonly note?: string;
}

export interface DataStewardshipCommandResult {
  readonly append: CivicMemoryAppendResult;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
}

export function setVisibilityRule(
  services: DataStewardshipServices,
  command: SetVisibilityRuleCommand
): DataStewardshipCommandResult {
  assertNonEmptyRefs(
    command.authorityRefs,
    "missing-authority",
    "Visibility changes require explicit authorityRefs."
  );

  const objectRef = services.registry.register(command.agreementRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.governedRef,
    ...(command.stewardRefs ?? []),
    ...(command.disclosureRule?.authorityRefs ?? []),
    ...(command.disclosureRule?.recipientRefs ?? []),
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.governedRef,
    ...(command.stewardRefs ?? []),
    ...(command.disclosureRule?.recipientRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "stewardship.data_visibility_rule.set",
    objectRef,
    relatedRefs,
    authorityRefs,
    visibility: command.visibility,
    payload: compactPayload({
      agreementRefId: objectRef.id,
      governedRefId: command.governedRef.id,
      stewardRefIds: (command.stewardRefs ?? []).map((ref) => ref.id),
      visibility: command.visibility,
      allowedUses: command.allowedUses,
      prohibitedUses: command.prohibitedUses,
      consentRequired: command.consentRequired,
      disclosureRule: disclosureRulePayload(command.disclosureRule),
      agreement: command.agreement,
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      note: command.note
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function recordConsent(
  services: DataStewardshipServices,
  command: RecordConsentCommand
): DataStewardshipCommandResult {
  assertRef(
    command.consentingRef,
    "missing-consenting-ref",
    "Consent records require a consentingRef."
  );

  const objectRef = services.registry.register(command.consentRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.ruleRef,
    command.consentingRef,
    command.subjectRef,
    command.rule.subjectRef,
    ...(command.rule.consentingRefs ?? []),
    ...(command.rule.evidenceRefs ?? []),
    ...(command.evidenceRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const evidenceRefs = canonicalRefs(services.registry, [
    ...(command.rule.evidenceRefs ?? []),
    ...(command.evidenceRefs ?? [])
  ]);
  const relatedRefs = canonicalRefs(services.registry, [
    command.ruleRef,
    command.consentingRef,
    command.subjectRef,
    command.rule.subjectRef,
    ...evidenceRefs
  ]);
  const consentRecord: ConsentRecord = {
    id: command.consentRef.id,
    ruleRef: command.ruleRef,
    consentingRef: command.consentingRef,
    status: command.status ?? "granted",
    recordedAt: command.occurredAt,
    authorityRefs,
    ...(command.actorRef === undefined ? {} : { recordedByRef: command.actorRef }),
    ...(command.note === undefined ? {} : { note: command.note })
  };
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "stewardship.consent.recorded",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: {
      consentRecord: consentRecordPayload(consentRecord),
      consentRule: consentRulePayload(command.rule),
      expiresAt: command.expiresAt,
      evidenceRefIds: evidenceRefs.map((ref) => ref.id)
    }
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function revokeConsent(
  services: DataStewardshipServices,
  command: RevokeConsentCommand
): DataStewardshipCommandResult {
  if (!command.supersedesConsentRecordId) {
    throw new DataStewardshipCommandError(
      "missing-consent-record",
      "Consent revocations must name the consent record they supersede."
    );
  }

  const objectRef = services.registry.register(command.consentRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.ruleRef,
    command.consentingRef,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.ruleRef,
    command.consentingRef
  ]);
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "stewardship.consent.revoked",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      consentRecordId: command.consentRef.id,
      ruleRefId: command.ruleRef.id,
      consentingRefId: command.consentingRef.id,
      status: "revoked",
      revokedAt: command.occurredAt,
      supersedesConsentRecordId: command.supersedesConsentRecordId,
      revocationReason: command.revocationReason,
      note: command.note
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function requestRedaction(
  services: DataStewardshipServices,
  command: RequestRedactionCommand
): DataStewardshipCommandResult {
  assertNonEmptyStrings(
    command.requestedFields,
    "missing-redaction-fields",
    "Redaction requests require at least one requested field."
  );

  const objectRef = services.registry.register(command.requestRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.targetRef,
    command.dataStewardshipAgreementRef,
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.targetRef,
    command.dataStewardshipAgreementRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "stewardship.redaction.requested",
    objectRef,
    relatedRefs,
    authorityRefs,
    dataState: REDACTION_DATA_STATE,
    payload: compactPayload({
      requestRefId: objectRef.id,
      targetRefId: command.targetRef.id,
      targetEventId: command.targetEventId,
      reason: command.reason,
      method: command.method,
      requestedFields: [...command.requestedFields],
      preservedFields: command.preservedFields,
      dataStewardshipAgreementRefId: command.dataStewardshipAgreementRef?.id,
      note: command.note
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function applyRedaction(
  services: DataStewardshipServices,
  command: ApplyRedactionCommand
): DataStewardshipCommandResult {
  assertNonEmptyRefs(
    command.authorityRefs,
    "missing-authority",
    "Redaction approval and application require explicit authorityRefs."
  );
  assertNonEmptyStrings(
    command.redactedFields,
    "missing-redaction-fields",
    "Applied redactions require at least one redacted field."
  );
  assertNonEmptyStrings(
    command.preservedFields,
    "missing-redaction-fields",
    "Applied redactions must declare preserved envelope fields."
  );

  const originalEvent = services.memory.getEvent(command.originalEventId);
  if (originalEvent === undefined) {
    throw new DataStewardshipCommandError(
      "unknown-event",
      `Original event ${command.originalEventId} is not present in civic memory.`
    );
  }

  const objectRef = services.registry.register(command.redactionRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.targetRef,
    command.dataStewardshipAgreementRef,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.targetRef,
    originalEvent.objectRef,
    command.dataStewardshipAgreementRef
  ]);
  const redaction = redactionMetadata(command, authorityRefs);
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "system.redaction.applied",
    objectRef,
    relatedRefs,
    authorityRefs,
    visibility: originalEvent.visibility,
    dataState: REDACTION_DATA_STATE,
    redaction: redactionContinuity(command, originalEvent),
    payload: compactPayload({
      redaction: redactionPayload(redaction),
      originalEventId: command.originalEventId,
      originalEventPreserved: true,
      targetRefId: command.targetRef.id,
      method: command.method,
      removedPayloadKeys: [...command.redactedFields],
      preservedFields: [...command.preservedFields],
      note: command.note
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function approveExport(
  services: DataStewardshipServices,
  command: ApproveExportCommand
): DataStewardshipCommandResult {
  assertNonEmptyRefs(
    command.authorityRefs,
    "missing-authority",
    "Export approvals require explicit authorityRefs."
  );

  if (command.objectRefs.length === 0) {
    throw new DataStewardshipCommandError(
      "missing-export-scope",
      "Export approvals require at least one objectRef."
    );
  }

  const objectRef = services.registry.register(command.exportRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.recipientRef,
    ...command.objectRefs,
    ...command.exportRule.allowedRecipientRefs,
    ...command.exportRule.prohibitedRecipientRefs,
    ...command.exportRule.authorityRefs,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.recipientRef,
    ...command.objectRefs
  ]);
  const append = appendDataStewardshipEvent(services.memory, {
    command,
    type: "federation.export.approved",
    objectRef,
    relatedRefs,
    authorityRefs,
    visibility: "federation",
    payload: compactPayload({
      exportRefId: objectRef.id,
      recipientRefId: command.recipientRef.id,
      objectRefIds: command.objectRefs.map((ref) => ref.id),
      format: command.format,
      includeRedactionStubs:
        command.includeRedactionStubs ?? command.exportRule.includeRedactionStubs,
      exportRule: exportRulePayload(command.exportRule),
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      note: command.note
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

function appendDataStewardshipEvent(
  memory: CivicMemoryService,
  input: {
    readonly command: EventEnvelopeInput;
    readonly type: CanopyEventType;
    readonly objectRef: ObjectRef;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly visibility?: CanopyEvent["visibility"];
    readonly dataState?: CanopyEvent["dataState"];
    readonly redaction?: CanopyEvent["redaction"];
  }
): CivicMemoryAppendResult {
  const event = compactEvent({
    id: input.command.eventId,
    type: input.type,
    occurredAt: input.command.occurredAt,
    actorRef: input.command.actorRef,
    objectRef: input.objectRef,
    relatedRefs: input.relatedRefs,
    authorityRefs: input.authorityRefs,
    orgId: input.command.orgId,
    placeId: input.command.placeId,
    commonsId: input.command.commonsId,
    livingSystemId: input.command.livingSystemId,
    sourceCapability: SOURCE_CAPABILITY,
    payload: compactPayload(input.payload),
    schemaVersion: SCHEMA_VERSION,
    visibility: input.visibility ?? DEFAULT_VISIBILITY,
    dataState: input.dataState ?? DEFAULT_DATA_STATE,
    redaction: input.redaction
  });

  return memory.appendEvent(event);
}

function redactionMetadata(
  command: ApplyRedactionCommand,
  authorityRefs: readonly ObjectRef[]
): RedactionMetadata {
  return {
    id: command.redactionRef.id,
    targetRef: command.targetRef,
    redactedAt: command.occurredAt,
    authorityRefs,
    reason: command.reason,
    method: command.method,
    redactedFields: [...command.redactedFields],
    preservedFields: [...command.preservedFields],
    redactionEventId: command.eventId,
    ...(command.actorRef === undefined ? {} : { redactedByRef: command.actorRef }),
    ...(command.originalContentHash === undefined
      ? {}
      : { originalContentHash: command.originalContentHash }),
    ...(command.redactedContentHash === undefined
      ? {}
      : { redactedContentHash: command.redactedContentHash }),
    ...(command.dataStewardshipAgreementRef === undefined
      ? {}
      : { dataStewardshipAgreementRef: command.dataStewardshipAgreementRef }),
    ...(command.note === undefined ? {} : { note: command.note })
  };
}

function redactionContinuity(
  command: ApplyRedactionCommand,
  originalEvent: CanopyEvent
): CanopyEvent["redaction"] {
  const originalContentHash = command.originalContentHash ?? originalEvent.contentHash;

  return {
    isRedactedStub: false,
    originalEventId: command.originalEventId,
    redactionEventId: command.eventId,
    redactedAt: command.occurredAt,
    reason: command.reason,
    preservedFields: [...command.preservedFields],
    removedPayloadKeys: [...command.redactedFields],
    ...(originalContentHash === undefined ? {} : { originalContentHash }),
    ...(command.redactedContentHash === undefined
      ? {}
      : { redactedContentHash: command.redactedContentHash }),
    ...(command.dataStewardshipAgreementRef === undefined
      ? {}
      : { dataStewardshipAgreementRef: command.dataStewardshipAgreementRef })
  };
}

function consentRulePayload(rule: ConsentRule): Readonly<Record<string, unknown>> {
  return compactPayload({
    id: rule.id,
    status: rule.status,
    scope: rule.scope,
    subjectRefId: rule.subjectRef?.id,
    consentingRefIds: rule.consentingRefs.map((ref) => ref.id),
    purpose: rule.purpose,
    allowedUses: [...rule.allowedUses],
    expiresAt: rule.expiresAt,
    revocable: rule.revocable,
    revocationProcessRefId: rule.revocationProcessRef?.id,
    evidenceRefIds: rule.evidenceRefs.map((ref) => ref.id)
  });
}

function consentRecordPayload(
  record: ConsentRecord
): Readonly<Record<string, unknown>> {
  return compactPayload({
    id: record.id,
    ruleRefId: record.ruleRef.id,
    consentingRefId: record.consentingRef.id,
    status: record.status,
    recordedAt: record.recordedAt,
    recordedByRefId: record.recordedByRef?.id,
    authorityRefIds: record.authorityRefs.map((ref) => ref.id),
    supersedesConsentRecordId: record.supersedesConsentRecordId,
    note: record.note
  });
}

function disclosureRulePayload(
  rule: DisclosureRule | undefined
): Readonly<Record<string, unknown>> | undefined {
  if (rule === undefined) {
    return undefined;
  }

  return compactPayload({
    id: rule.id,
    audience: rule.audience,
    visibility: rule.visibility,
    purpose: rule.purpose,
    allowedUses: [...rule.allowedUses],
    prohibitedUses: [...rule.prohibitedUses],
    recipientRefIds: rule.recipientRefs.map((ref) => ref.id),
    authorityRefIds: rule.authorityRefs.map((ref) => ref.id),
    consentRequired: rule.consentRequired,
    startsAt: rule.startsAt,
    expiresAt: rule.expiresAt,
    reviewAt: rule.reviewAt
  });
}

function exportRulePayload(rule: ExportRule): Readonly<Record<string, unknown>> {
  return compactPayload({
    id: rule.id,
    exportAllowed: rule.exportAllowed,
    allowedFormats: [...rule.allowedFormats],
    allowedObjectTypes: [...rule.allowedObjectTypes],
    allowedRecipientRefIds: rule.allowedRecipientRefs.map((ref) => ref.id),
    prohibitedRecipientRefIds: rule.prohibitedRecipientRefs.map((ref) => ref.id),
    includeRedactionStubs: rule.includeRedactionStubs,
    consentRequired: rule.consentRequired,
    authorityRefIds: rule.authorityRefs.map((ref) => ref.id),
    reviewAt: rule.reviewAt
  });
}

function redactionPayload(
  metadata: RedactionMetadata
): Readonly<Record<string, unknown>> {
  return compactPayload({
    id: metadata.id,
    targetRefId: metadata.targetRef.id,
    redactedAt: metadata.redactedAt,
    redactedByRefId: metadata.redactedByRef?.id,
    authorityRefIds: metadata.authorityRefs.map((ref) => ref.id),
    reason: metadata.reason,
    method: metadata.method,
    redactedFields: [...metadata.redactedFields],
    preservedFields: [...metadata.preservedFields],
    originalContentHash: metadata.originalContentHash,
    redactedContentHash: metadata.redactedContentHash,
    redactionEventId: metadata.redactionEventId,
    replacementEventId: metadata.replacementEventId,
    dataStewardshipAgreementRefId: metadata.dataStewardshipAgreementRef?.id,
    note: metadata.note
  });
}

function assertRef(
  ref: ObjectRef | undefined,
  code: DataStewardshipCommandErrorCode,
  message: string
): asserts ref is ObjectRef {
  if (ref === undefined) {
    throw new DataStewardshipCommandError(code, message);
  }
}

function assertNonEmptyRefs(
  refs: readonly ObjectRef[] | undefined,
  code: DataStewardshipCommandErrorCode,
  message: string
): void {
  if ((refs ?? []).length === 0) {
    throw new DataStewardshipCommandError(code, message);
  }
}

function assertNonEmptyStrings(
  values: readonly string[],
  code: DataStewardshipCommandErrorCode,
  message: string
): void {
  if (values.length === 0 || values.some((value) => value.trim().length === 0)) {
    throw new DataStewardshipCommandError(code, message);
  }
}

function registerRefs(
  registry: ObjectRegistry,
  refs: readonly (ObjectRef | undefined)[]
): void {
  for (const ref of refs) {
    if (ref !== undefined) {
      registry.register(ref);
    }
  }
}

function canonicalRefs(
  registry: ObjectRegistry,
  refs: readonly (ObjectRef | undefined)[]
): readonly ObjectRef[] {
  const canonicalRefsById = new Map<CanopyId, ObjectRef>();

  for (const ref of refs) {
    if (ref !== undefined) {
      const canonical = registry.require(ref);
      canonicalRefsById.set(canonical.id, canonical);
    }
  }

  return [...canonicalRefsById.values()];
}

function compactPayload(
  payload: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function compactEvent(event: Readonly<Record<string, unknown>>): CanopyEvent {
  return Object.fromEntries(
    Object.entries(event).filter(([, value]) => value !== undefined)
  ) as unknown as CanopyEvent;
}
