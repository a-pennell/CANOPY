import type { CanonicalMappingRecord } from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef,
  SourceProject
} from "@canopy/contracts-kernel";
import {
  dryRunSensemakingImport,
  dryRunStewardshipImport,
  sourceIdFor,
  sourceObjectKind,
  type CanonicalMappingCandidate,
  type ImportDryRunResult,
  type LegacySourceRecord
} from "@canopy/database-import-plans";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import {
  validateFoldIn,
  type FoldInValidationReport
} from "@canopy/evaluation-fold-in-validation";
import {
  createImportReviewReport,
  executeReviewedImport,
  type ImportExecutionResult,
  type ImportReviewReport
} from "@canopy/workflows-import-execution";
import {
  createInMemoryMaterializedProjectionStore,
  readMaterializedProjection,
  type MaterializedProjectionDocument,
  type MaterializedProjectionStore,
  type ProjectionDocumentPayload,
  type ProjectionRebuilderName
} from "@canopy/workflows-projection-rebuild";

export type LegacyCapabilityWrapperKind = "resource-care" | "claims-evidence";

export interface LegacyCapabilityWrapperFixture {
  readonly kind: LegacyCapabilityWrapperKind;
  readonly sourceProject: Extract<SourceProject, "stewardship" | "sensemaking">;
  readonly rows: readonly LegacySourceRecord[];
}

export interface UnknownLocalSubtypeReviewItem {
  readonly sourceProject: SourceProject;
  readonly sourceObject: string;
  readonly sourceId: string;
  readonly reason: string;
}

export interface LegacyCapabilityWrapperExecution {
  readonly kind: LegacyCapabilityWrapperKind;
  readonly sourceProject: SourceProject;
  readonly dryRun: ImportDryRunResult;
  readonly review: ImportReviewReport;
  readonly execution: ImportExecutionResult;
  readonly materializedProjections: MaterializedProjectionStore;
  readonly validation: FoldInValidationReport;
  readonly objectRefs: readonly ObjectRef[];
  readonly canonicalMappings: readonly CanonicalMappingRecord[];
  readonly unknownLocalSubtypes: readonly UnknownLocalSubtypeReviewItem[];
}

const importedAt = "2026-06-14T12:00:00.000Z";

export const resourceCareWrapperFixture = {
  kind: "resource-care",
  sourceProject: "stewardship",
  rows: [
    {
      sourceObject: "commons",
      id: "community.riverbend",
      name: "Riverbend Commons",
      commonsKind: "watershed food commons",
      commons_kind: "watershed food commons",
      boundary: "generalized watershed boundary"
    },
    {
      sourceObject: "resource",
      id: "resource.north-pasture",
      name: "North Pasture",
      resourceKind: "grazing and food resilience",
      resource_kind: "grazing and food resilience",
      boundary: "generalized pasture boundary",
      livingSystemId: "living-system.riparian-corridor",
      summary: "Shared pasture and food-growing capacity under drought care."
    },
    {
      sourceObject: "use right",
      id: "use-right.dawn-grazing-window",
      holder: "person.kai",
      resource: "resource.north-pasture",
      permission: "graze.dawn_window",
      state: "active",
      policyRef: "policy.drought-care",
      decisionRef: "decision.dawn-grazing-window",
      reviewAt: "2026-07-01T09:00:00.000Z",
      conditions: ["avoid riparian buffer", "log herd count"]
    },
    {
      sourceObject: "policy",
      id: "policy.drought-care",
      title: "Drought Care Protocol",
      status: "active",
      decisionRef: "decision.drought-care-ratified"
    },
    {
      sourceObject: "policy version",
      id: "policy.drought-care.v2",
      policy: "policy.drought-care",
      version: "2",
      status: "active",
      decisionRef: "decision.drought-care-ratified"
    },
    {
      sourceObject: "maintenance task",
      id: "task.repair-north-fence",
      activityType: "maintenance task",
      activity_type: "maintenance task",
      subject: "resource.north-pasture",
      resource: "resource.north-pasture",
      status: "completed",
      completedAt: "2026-06-11T15:00:00.000Z",
      assignedActor: "person.mira",
      evidenceRef: "evidence.fence-photo"
    },
    {
      sourceObject: "contribution",
      id: "contribution.seedlings",
      activityType: "contribution",
      activity_type: "contribution",
      subject: "resource.north-pasture",
      resource: "resource.north-pasture",
      status: "completed",
      contributor: "organization.food-hub",
      outcome: "delivered drought-tolerant seedlings"
    },
    {
      sourceObject: "decision",
      id: "decision.dawn-grazing-window",
      title: "Grant dawn grazing window",
      status: "recorded",
      decisionMethod: "consent",
      policyRef: "policy.drought-care",
      resource: "resource.north-pasture"
    },
    {
      sourceObject: "decision",
      id: "decision.drought-care-ratified",
      title: "Ratify drought care protocol",
      status: "recorded",
      decisionMethod: "consent",
      policyRef: "policy.drought-care"
    },
    {
      sourceObject: "food flow",
      id: "flow.food-hub-seedlings",
      from: "organization.food-hub",
      to: "community.riverbend",
      quantity: "42 trays",
      resource: "resource.north-pasture",
      decisionRef: "decision.dawn-grazing-window",
      occurredAt: "2026-06-12T10:00:00.000Z"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export const claimsEvidenceWrapperFixture = {
  kind: "claims-evidence",
  sourceProject: "sensemaking",
  rows: [
    {
      sourceObject: "issue",
      id: "issue.riparian-stress",
      title: "Is the riparian corridor under stress?",
      status: "open",
      scope: "resource.north-pasture"
    },
    {
      sourceObject: "source",
      id: "source.riparian-survey",
      kind: "field survey",
      title: "Riparian survey",
      contentHash: "sha256:riparian-survey"
    },
    {
      sourceObject: "claim",
      id: "claim.riparian-stress-medium",
      statement: "The riparian corridor shows medium drought stress.",
      status: "review_required",
      confidence: "medium",
      issue: "issue.riparian-stress",
      source: "source.riparian-survey"
    },
    {
      sourceObject: "stakeholder group",
      id: "group.growers",
      name: "Growers circle",
      status: "active",
      issue: "issue.riparian-stress"
    },
    {
      sourceObject: "theme",
      id: "theme.water-stress",
      label: "Water stress",
      description: "Claims and sources about drought, irrigation, and riparian health."
    },
    {
      sourceObject: "contribution",
      id: "evidence.grower-observation",
      contributor: "group.growers",
      target: "claim.riparian-stress-medium",
      claim: "claim.riparian-stress-medium",
      source: "source.riparian-survey",
      status: "submitted",
      note: "Growers reported leaf curl in the lower pasture buffer."
    },
    {
      sourceObject: "evidence link",
      id: "link.survey-qualifies-claim",
      claim: "claim.riparian-stress-medium",
      source: "source.riparian-survey",
      evidence: "evidence.grower-observation",
      relation: "qualifies"
    },
    {
      sourceObject: "review state",
      id: "review.riparian-stress",
      target: "claim.riparian-stress-medium",
      status: "reviewed",
      reviewer: "group.growers",
      evidence: "evidence.grower-observation",
      reviewNote: "Review accepts medium stress with uncertainty."
    },
    {
      sourceObject: "AI extraction",
      id: "ai.riparian-extraction",
      model: "model.riparian-parser",
      source: "source.riparian-survey",
      claim: "claim.riparian-stress-medium",
      status: "needs_review",
      outputClassification: "model_derived",
      confidence: "low"
    },
    {
      sourceObject: "model",
      id: "model.riparian-parser",
      modelKind: "extraction model",
      title: "Riparian parser",
      status: "reviewed",
      claim: "claim.riparian-stress-medium",
      outputs: ["ai.riparian-extraction"],
      outputClassification: "model_derived"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export function executeLegacyCapabilityWrapper(
  fixture: LegacyCapabilityWrapperFixture
): LegacyCapabilityWrapperExecution {
  const baseDryRun = dryRunForFixture(fixture);
  const unknownLocalSubtypes = findUnknownLocalSubtypes(fixture);
  const dryRun = {
    ...baseDryRun,
    candidateEvents: enrichCandidateEvents(fixture.kind, baseDryRun)
  };
  const review = createImportReviewReport(dryRun, {
    defaultDecision: "accept",
    reviewedAt: importedAt,
    reviewedByRef: reviewAuthorityRef(fixture.kind)
  });
  const runtime = createInMemoryCanonicalPersistence({ now: () => importedAt });
  const materializedProjections = createInMemoryMaterializedProjectionStore();
  const execution = executeReviewedImport({
    dryRun,
    review,
    runtime,
    recordedAt: importedAt,
    projectionRebuildOptions: { materializedProjections }
  });
  const objectRefs = runtime.queryObjectRefs().items.map((record) => record.ref);
  const canonicalMappings = runtime.listMappings();
  const events = execution.eventRecords.map((record) => record.event);
  const validation = validateFoldIn({
    events,
    expectedRefs: objectRefs,
    expectedEventTypes: events.map((event) => event.type),
    objectPageRefs: objectRefs.filter((ref) =>
      fixture.kind === "resource-care"
        ? ["resource", "use-right", "policy", "decision", "flow"].includes(ref.type)
        : ["issue", "claim", "evidence", "source"].includes(ref.type)
    ),
    resourceRefs: objectRefs.filter((ref) => ref.type === "resource"),
    importPlans: [{ sourceProject: fixture.sourceProject, planId: `${fixture.sourceProject}-fold-in` }],
    shellNavigation: shellNavigationFor(fixture.kind),
    capabilityPackageNames: capabilityPackagesFor(fixture.kind),
    canonicalMappingRefs: canonicalMappings.map((mapping) => mapping.canonicalRef)
  });

  return {
    kind: fixture.kind,
    sourceProject: fixture.sourceProject,
    dryRun,
    review,
    execution,
    materializedProjections,
    validation,
    objectRefs,
    canonicalMappings,
    unknownLocalSubtypes
  };
}

export function readWrapperProjection<Name extends ProjectionRebuilderName>(
  execution: LegacyCapabilityWrapperExecution,
  projectionName: Name,
  targetRef: ObjectRef
): MaterializedProjectionDocument<ProjectionDocumentPayload<Name>> | undefined {
  return readMaterializedProjection(execution.materializedProjections, {
    projectionName,
    targetRef
  });
}

export function mappingForLocalRow(
  execution: LegacyCapabilityWrapperExecution,
  sourceEntity: string,
  sourceId: string
): CanonicalMappingRecord | undefined {
  return execution.canonicalMappings.find((mapping) => {
    const sourcePointer = mapping.sourcePointer;
    return (
      sourcePointer !== undefined &&
      sourcePointer.sourceProject === execution.sourceProject &&
      sourcePointer.sourceEntity === sourceEntity &&
      sourcePointer.sourceId === sourceId
    );
  });
}

export function findUnknownLocalSubtypes(
  fixture: LegacyCapabilityWrapperFixture
): readonly UnknownLocalSubtypeReviewItem[] {
  const known = fixture.kind === "resource-care" ? resourceCareKnownSourceObjects : claimsEvidenceKnownSourceObjects;

  return fixture.rows
    .map((row, index) => {
      const sourceObject = sourceObjectKind(row);
      return {
        row,
        sourceObject,
        sourceId: sourceIdFor(row, sourceObject, index)
      };
    })
    .filter((item) => !known.has(normalizeKind(item.sourceObject)))
    .map((item) => ({
      sourceProject: fixture.sourceProject,
      sourceObject: item.sourceObject,
      sourceId: item.sourceId,
      reason: "No explicit Phase 6 wrapper mapping exists for this local subtype."
    }));
}

function dryRunForFixture(fixture: LegacyCapabilityWrapperFixture): ImportDryRunResult {
  if (fixture.kind === "resource-care") {
    return dryRunStewardshipImport(fixture.rows);
  }

  return dryRunSensemakingImport(fixture.rows);
}

function enrichCandidateEvents(
  kind: LegacyCapabilityWrapperKind,
  dryRun: ImportDryRunResult
): readonly CanopyEvent[] {
  const mappings = dryRun.mappingCandidates;

  return dryRun.candidateEvents.map((event, index) =>
    withImportSequenceTime(
      kind === "resource-care"
        ? enrichResourceCareEvent(event, mappings)
        : enrichClaimsEvidenceEvent(event, mappings),
      index
    )
  );
}

function enrichResourceCareEvent(
  event: CanopyEvent,
  mappings: readonly CanonicalMappingCandidate[]
): CanopyEvent {
  const record = legacyRecord(event);
  const resourceRef = refFromRecord(mappings, record, ["resource", "resourceRef", "subject"], "resource");
  const policyRef = refFromRecord(mappings, record, ["policy", "policyRef"], "policy");
  const decisionRef = refFromRecord(mappings, record, ["decision", "decisionRef"], "decision");
  const livingSystemId = textField(record, ["livingSystemId", "living_system_id"]);
  const authorityRefs = refsDefined([policyRef, decisionRef]);
  const relatedRefs = refsDefined([
    resourceRef,
    policyRef,
    decisionRef,
    refFromRecord(mappings, record, ["commons", "community", "to"], "commons")
  ]).filter((ref) => !sameRef(ref, event.objectRef));

  return optionalEvent({
    ...event,
    relatedRefs,
    authorityRefs,
    ...(livingSystemId === undefined ? {} : { livingSystemId }),
    payload: {
      ...event.payload,
      title: titleForRecord(record),
      summary: summaryForRecord(record),
      resourceKind: textField(record, ["resourceKind", "resource_kind"]),
      resourceRefId: resourceRef?.id,
      holderRefId: textField(record, ["holder", "holderRef", "holder_ref"]),
      permissions: stringList(record, ["permission", "permissions"]),
      conditions: stringList(record, ["condition", "conditions"]),
      state: textField(record, ["state", "status"]),
      decisionRefId: decisionRef?.id,
      policyRefId: policyRef?.id,
      livingSystemId,
      relation: textField(record, ["relation", "relationKind", "relation_kind"]),
      term: optionalPayloadRecord({
        startsAt: textField(record, ["startsAt", "starts_at"]),
        endsAt: textField(record, ["endsAt", "ends_at"])
      }),
      review: optionalPayloadRecord({
        reviewAt: textField(record, ["reviewAt", "review_at"]),
        reviewPathRefId: policyRef?.id
      }),
      context: optionalPayloadRecord({
        condition: textField(record, ["condition", "status", "state"]),
        outcome: textField(record, ["outcome"]),
        quantity: textField(record, ["quantity"])
      })
    }
  });
}

function enrichClaimsEvidenceEvent(
  event: CanopyEvent,
  mappings: readonly CanonicalMappingCandidate[]
): CanopyEvent {
  const record = legacyRecord(event);
  const claimRef = refFromRecord(mappings, record, ["claim", "target"], "claim");
  const issueRef = refFromRecord(mappings, record, ["issue", "scope"], "issue");
  const sourceRef = refFromRecord(mappings, record, ["source"], "source");
  const evidenceRef = refFromRecord(mappings, record, ["evidence"], "evidence");
  const reviewerRef = refFromRecord(mappings, record, ["reviewer", "contributor"], "organization");
  const modelRef = refFromRecord(mappings, record, ["model"], "model");
  const isReviewState = event.payload.sourceEntity === "review state";
  const relatedRefs = refsDefined([
    isReviewState ? undefined : claimRef,
    issueRef,
    sourceRef,
    evidenceRef,
    reviewerRef,
    modelRef
  ]).filter((ref) => !sameRef(ref, event.objectRef));
  const isAiExtraction = event.payload.sourceEntity === "AI extraction";

  return optionalEvent({
    ...event,
    objectRef: isReviewState && claimRef !== undefined ? claimRef : event.objectRef,
    relatedRefs,
    ...(isAiExtraction ? { systemActor: "ai_assistant" as const } : {}),
    ...(isAiExtraction ? { dataState: "model_derived" as const } : {}),
    payload: {
      ...event.payload,
      title: titleForRecord(record),
      summary: summaryForRecord(record),
      claimRefId: claimRef?.id,
      issueRefId: issueRef?.id,
      sourceRefId: sourceRef?.id,
      evidenceRefId: evidenceRef?.id,
      reviewerRefId: reviewerRef?.id,
      relation: textField(record, ["relation", "relationKind", "relation_kind"]),
      disposition: textField(record, ["status", "reviewState", "review_state"]),
      preservesUncertainty: true,
      aiIsNonAuthority: isAiExtraction
    }
  });
}

function reviewAuthorityRef(kind: LegacyCapabilityWrapperKind): ObjectRef {
  return {
    id: `authority.phase-6.${kind}`,
    type: "mandate",
    namespace: "canopy",
    lifecycleStatus: "active"
  };
}

function withImportSequenceTime(event: CanopyEvent, index: number): CanopyEvent {
  return {
    ...event,
    occurredAt: `2026-06-14T12:00:${String(index).padStart(2, "0")}.000Z`
  };
}

function refFromRecord(
  mappings: readonly CanonicalMappingCandidate[],
  record: LegacySourceRecord,
  fields: readonly string[],
  type?: CanopyObjectType
): ObjectRef | undefined {
  const value = textField(record, fields);
  if (value === undefined) {
    return undefined;
  }

  return mappings.find((mapping) => {
    const matchesId =
      mapping.source.sourceId === value ||
      mapping.canonicalRef.id === value ||
      mapping.canonicalRef.id.endsWith(`.${value}`);
    return matchesId && (type === undefined || mapping.canonicalRef.type === type);
  })?.canonicalRef;
}

function legacyRecord(event: CanopyEvent): LegacySourceRecord {
  const record = event.payload.legacyRecord;
  return isRecord(record) ? record : {};
}

function shellNavigationFor(
  kind: LegacyCapabilityWrapperKind
): readonly { readonly label: string; readonly href: string }[] {
  return kind === "resource-care"
    ? [
        { label: "Resource Care", href: "/resource-care" },
        { label: "Objects", href: "/objects" }
      ]
    : [
        { label: "Claims & Evidence", href: "/claims-evidence" },
        { label: "Objects", href: "/objects" }
      ];
}

function capabilityPackagesFor(kind: LegacyCapabilityWrapperKind): readonly string[] {
  return kind === "resource-care"
    ? ["@canopy/capabilities-resource-care"]
    : ["@canopy/capabilities-claims-evidence"];
}

function titleForRecord(record: LegacySourceRecord): string | undefined {
  return textField(record, ["title", "name", "label", "statement", "note"]);
}

function summaryForRecord(record: LegacySourceRecord): string | undefined {
  return textField(record, ["summary", "description", "statement", "note", "outcome", "reviewNote"]);
}

function textField(record: LegacySourceRecord, names: readonly string[]): string | undefined {
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

function stringList(record: LegacySourceRecord, names: readonly string[]): readonly string[] {
  for (const name of names) {
    const value = record[name];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return [value.trim()];
    }
  }

  return [];
}

function optionalPayloadRecord(
  value: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> | undefined {
  const defined = Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
  return Object.keys(defined).length === 0 ? undefined : defined;
}

function optionalEvent(event: CanopyEvent): CanopyEvent {
  return {
    ...event,
    relatedRefs: dedupeRefs(event.relatedRefs),
    authorityRefs: dedupeRefs(event.authorityRefs),
    payload: Object.fromEntries(
      Object.entries(event.payload).filter(([, value]) => value !== undefined)
    )
  };
}

function refsDefined(refs: readonly (ObjectRef | undefined)[]): readonly ObjectRef[] {
  return refs.filter((ref): ref is ObjectRef => ref !== undefined);
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  return [...new Map(refs.map((ref) => [refKey(ref), ref])).values()].sort((left, right) =>
    refKey(left).localeCompare(refKey(right))
  );
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function normalizeKind(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRecord(value: unknown): value is LegacySourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const resourceCareKnownSourceObjects = new Set([
  "commons",
  "resource",
  "use right",
  "policy",
  "policy version",
  "maintenance task",
  "contribution",
  "decision",
  "food flow",
  "living system",
  "stewardship activity"
]);

const claimsEvidenceKnownSourceObjects = new Set([
  "issue",
  "source",
  "claim",
  "stakeholder group",
  "theme",
  "contribution",
  "evidence link",
  "review state",
  "ai extraction",
  "model"
]);

void (undefined as unknown as CanopyEventType | CanopyId);
