import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventType,
  CanopyObjectType,
  LifecycleStatus,
  LocalSourcePointer,
  ObjectRef,
  SourceProject,
} from "@canopy/contracts-kernel";
import type {
  CanonicalMappingCandidate,
  ImportDryRunConfidence,
  ImportDryRunDisposition,
  ImportDryRunProhibitedOutcome,
  ImportDryRunResult,
  ImportDryRunWarning,
  ImportPlanTemplate,
  LegacySourceRecord,
  ProhibitedOutcome,
  SourceObjectPlan,
  TargetCanonicalObjectPlan,
} from "./types.js";

const dryRunOccurredAt = "1970-01-01T00:00:00.000Z";

export function sourceObjectKind(record: LegacySourceRecord): string {
  return (
    textField(record, [
      "sourceObject",
      "source_object",
      "recordType",
      "record_type",
      "entity",
      "entityType",
      "entity_type",
      "kind",
      "type",
    ]) ?? "record"
  ).toLowerCase();
}

export function sourceIdFor(
  record: LegacySourceRecord,
  sourceEntity: string,
  index: number,
): string {
  return (
    textField(record, ["sourceId", "source_id", "id", "uuid", "key", "slug"]) ??
    `${sourceEntity}-${index + 1}`
  );
}

export function textField(
  record: LegacySourceRecord,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }
  }
  return undefined;
}

export function numberField(
  record: LegacySourceRecord,
  names: readonly string[],
): number | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function hasAnyField(
  record: LegacySourceRecord,
  names: readonly string[],
): boolean {
  return names.some((name) => {
    const value = record[name];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim().length > 0;
  });
}

export function hasAuthority(record: LegacySourceRecord): boolean {
  return hasAnyField(record, [
    "authority",
    "authorityRef",
    "authorityRefs",
    "authority_basis",
    "authorityBasis",
    "authorizedBy",
    "authorized_by",
    "policy",
    "policyRef",
    "agreement",
    "agreementRef",
    "decision",
    "decisionRef",
    "mandate",
    "mandateRef",
    "delegatedBy",
    "delegated_by",
    "reviewer",
    "steward",
  ]);
}

export function containsToken(value: string | undefined, token: string): boolean {
  return value?.toLowerCase().includes(token.toLowerCase()) ?? false;
}

export function sourcePointer(
  sourceProject: SourceProject,
  sourceEntity: string,
  sourceId: string,
  record: LegacySourceRecord,
): LocalSourcePointer {
  const sourceVersion = textField(record, ["sourceVersion", "source_version", "version"]);
  if (sourceVersion === undefined) {
    return { sourceProject, sourceEntity, sourceId };
  }
  return { sourceProject, sourceEntity, sourceId, sourceVersion };
}

export function objectRef(
  sourceProject: SourceProject,
  sourceEntity: string,
  sourceId: string,
  canonicalType: CanopyObjectType,
  record: LegacySourceRecord,
): ObjectRef {
  return {
    id: canonicalId(sourceProject, canonicalType, sourceEntity, sourceId),
    type: canonicalType,
    namespace: "canopy",
    lifecycleStatus: lifecycleStatus(record),
    source: sourcePointer(sourceProject, sourceEntity, sourceId, record),
  };
}

export function mappingCandidate(args: {
  readonly sourceProject: SourceProject;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly canonicalType: CanopyObjectType;
  readonly record: LegacySourceRecord;
  readonly targetPlan?: TargetCanonicalObjectPlan | undefined;
  readonly sourcePlan?: SourceObjectPlan | undefined;
  readonly disposition?: ImportDryRunDisposition | undefined;
  readonly confidence?: ImportDryRunConfidence | undefined;
  readonly rationale: string;
}): CanonicalMappingCandidate {
  return {
    source: sourcePointer(args.sourceProject, args.sourceEntity, args.sourceId, args.record),
    canonicalRef: objectRef(
      args.sourceProject,
      args.sourceEntity,
      args.sourceId,
      args.canonicalType,
      args.record,
    ),
    canonicalType: args.canonicalType,
    disposition: args.disposition ?? "create",
    confidence: args.confidence ?? "medium",
    rationale: args.rationale,
    requiredRelationships: args.targetPlan?.requiredRelationships ?? [],
    authorityHints: args.sourcePlan?.authorityHints ?? [],
  };
}

export function candidateEvent(args: {
  readonly sourceProject: SourceProject;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly canonicalRef: ObjectRef;
  readonly type: CanopyEventType;
  readonly sourceCapability: CanopyCapability;
  readonly record: LegacySourceRecord;
  readonly payload?: Readonly<Record<string, unknown>>;
}): CanopyEvent {
  return {
    id: eventId(args.sourceProject, args.sourceEntity, args.sourceId, args.type),
    type: args.type,
    occurredAt:
      textField(args.record, [
        "occurredAt",
        "occurred_at",
        "postedAt",
        "posted_at",
        "createdAt",
        "created_at",
        "completedAt",
        "completed_at",
      ]) ?? dryRunOccurredAt,
    systemActor: "importer",
    objectRef: args.canonicalRef,
    relatedRefs: [],
    authorityRefs: [],
    sourceCapability: args.sourceCapability,
    payload: {
      dryRun: true,
      sourceProject: args.sourceProject,
      sourceEntity: args.sourceEntity,
      sourceId: args.sourceId,
      legacyRecord: { ...args.record },
      ...args.payload,
    },
    schemaVersion: 1,
    visibility: "role_restricted",
    dataState: "unverified",
  };
}

export function warning(args: {
  readonly code: string;
  readonly message: string;
  readonly source?: LocalSourcePointer;
  readonly severity?: ImportDryRunWarning["severity"];
}): ImportDryRunWarning {
  const base = {
    code: args.code,
    severity: args.severity ?? "warning",
    message: args.message,
  };
  if (args.source === undefined) {
    return base;
  }
  return { ...base, source: args.source };
}

export function prohibitedOutcome(
  outcome: ProhibitedOutcome,
  source: LocalSourcePointer,
  triggeredBy: string,
): ImportDryRunProhibitedOutcome {
  return {
    ...outcome,
    source,
    triggeredBy,
  };
}

export function requiredFieldWarnings(
  sourcePlan: SourceObjectPlan | undefined,
  record: LegacySourceRecord,
  source: LocalSourcePointer,
): readonly ImportDryRunWarning[] {
  if (sourcePlan === undefined) {
    return [];
  }
  return sourcePlan.requiredFields
    .filter((field) => !hasAnyField(record, fieldAliases(field)))
    .map((field) =>
      warning({
        code: "missing-required-field",
        source,
        message: `Legacy ${sourcePlan.sourceObject} record is missing required field: ${field}.`,
      }),
    );
}

export function buildDryRunResult(args: {
  readonly plan: ImportPlanTemplate;
  readonly mappingCandidates: readonly CanonicalMappingCandidate[];
  readonly warnings: readonly ImportDryRunWarning[];
  readonly prohibitedOutcomes: readonly ImportDryRunProhibitedOutcome[];
  readonly candidateEvents: readonly CanopyEvent[];
}): ImportDryRunResult {
  const hasBlocker =
    args.prohibitedOutcomes.length > 0 ||
    args.warnings.some((item) => item.severity === "blocker");
  return {
    importPlanId: args.plan.id,
    sourceProject: args.plan.sourceProject,
    sourceTreatment: "folded-source",
    canonicalNamespace: "canopy",
    status: hasBlocker ? "blocked" : args.warnings.length > 0 ? "warn" : "pass",
    mappingCandidates: args.mappingCandidates,
    warnings: args.warnings,
    prohibitedOutcomes: args.prohibitedOutcomes,
    candidateEvents: args.candidateEvents,
  };
}

export function planSourceObject(
  plan: ImportPlanTemplate,
  sourceObject: string,
): SourceObjectPlan | undefined {
  return plan.sourceObjects.find((item) => item.sourceObject === sourceObject);
}

export function planTargetObject(
  plan: ImportPlanTemplate,
  objectType: CanopyObjectType,
): TargetCanonicalObjectPlan | undefined {
  return plan.targetCanonicalObjects.find((item) => item.objectType === objectType);
}

export function planProhibitedOutcome(
  plan: ImportPlanTemplate,
  match: string,
): ProhibitedOutcome {
  return (
    plan.prohibitedOutcomes.find((item) => item.outcome.includes(match)) ??
    plan.prohibitedOutcomes[0] ??
    {
      outcome: "import would violate plan constraints",
      reason: "The source record triggered a dry-run safety check.",
    }
  );
}

function canonicalId(
  sourceProject: SourceProject,
  canonicalType: CanopyObjectType,
  sourceEntity: string,
  sourceId: string,
): string {
  return [
    "canopy",
    canonicalType,
    sourceProject,
    sourceEntity,
    sourceId,
  ].map(slug).join(".");
}

function eventId(
  sourceProject: SourceProject,
  sourceEntity: string,
  sourceId: string,
  eventType: CanopyEventType,
): string {
  return [
    "event",
    "import-dry-run",
    sourceProject,
    sourceEntity,
    sourceId,
    eventType,
  ].map(slug).join(".");
}

function lifecycleStatus(record: LegacySourceRecord): LifecycleStatus {
  const status = textField(record, ["status", "state", "lifecycleStatus", "lifecycle_status"]);
  if (status === undefined) {
    return "draft";
  }
  if (containsToken(status, "active") || containsToken(status, "posted")) {
    return "active";
  }
  if (containsToken(status, "revoked") || containsToken(status, "retired")) {
    return "retired";
  }
  if (containsToken(status, "superseded")) {
    return "superseded";
  }
  if (containsToken(status, "paused")) {
    return "paused";
  }
  if (containsToken(status, "redacted")) {
    return "redacted";
  }
  return "draft";
}

function fieldAliases(field: string): readonly string[] {
  const compact = field
    .replaceAll(" or ", " ")
    .replaceAll(" and ", " ")
    .replaceAll("/", " ")
    .split(/\s+/)
    .filter(Boolean);
  return [
    field,
    field.replaceAll(" ", "_"),
    field.replaceAll(" ", ""),
    ...compact,
    ...compact.map((part) => part.replaceAll("-", "_")),
  ];
}

function slug(value: string): string {
  const slugged = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slugged.length > 0 ? slugged : "unknown";
}
