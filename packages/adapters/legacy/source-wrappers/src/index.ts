import type { AdapterAuditRecord, CanonicalMappingRecord } from "@canopy/contracts-database";
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
  dryRunCommonCreditImport,
  dryRunIcosImport,
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

export type LegacyCapabilityWrapperKind =
  | "resource-care"
  | "claims-evidence"
  | "governance-authority"
  | "allocation-accounting";

export interface LegacyCapabilityWrapperFixture {
  readonly kind: LegacyCapabilityWrapperKind;
  readonly sourceProject: Extract<SourceProject, "stewardship" | "sensemaking" | "icos" | "common-credit">;
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
  readonly unknownSubtypeAuditRecords: readonly AdapterAuditRecord[];
}

export interface LegacyCapabilityWrappersExecution {
  readonly executions: readonly LegacyCapabilityWrapperExecution[];
  readonly materializedProjections: MaterializedProjectionStore;
  readonly validation: FoldInValidationReport;
  readonly objectRefs: readonly ObjectRef[];
  readonly canonicalMappings: readonly CanonicalMappingRecord[];
  readonly unknownLocalSubtypes: readonly UnknownLocalSubtypeReviewItem[];
  readonly adapterAuditRecords: readonly AdapterAuditRecord[];
}

export interface SourceRowLookup {
  readonly sourceProject: SourceProject;
  readonly canonicalMappings: readonly CanonicalMappingRecord[];
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

export const governanceAuthorityWrapperFixture = {
  kind: "governance-authority",
  sourceProject: "icos",
  rows: [
    {
      sourceObject: "actor",
      id: "person.mira",
      actorKind: "person",
      actor_kind: "person",
      name: "Mira Waters",
      state: "active"
    },
    {
      sourceObject: "actor",
      id: "organization.river-council",
      actorKind: "organization",
      actor_kind: "organization",
      name: "River Council",
      state: "active"
    },
    {
      sourceObject: "governance item",
      id: "issue.water-window",
      itemType: "issue",
      item_type: "issue",
      title: "Define emergency water window",
      status: "open"
    },
    {
      sourceObject: "governance item",
      id: "proposal.water-window",
      itemType: "proposal",
      item_type: "proposal",
      title: "Open dawn water window",
      status: "open",
      parent: "issue.water-window",
      issue: "issue.water-window"
    },
    {
      sourceObject: "governance item",
      id: "policy.water-window",
      itemType: "policy",
      item_type: "policy",
      title: "Water Window Policy",
      status: "active",
      parent: "issue.water-window",
      mandateRef: "mandate.water-steward"
    },
    {
      sourceObject: "mandate",
      id: "mandate.water-steward",
      holder: "person.mira",
      scope: "water window coordination",
      status: "active",
      decisionRef: "decision.water-window"
    },
    {
      sourceObject: "role assignment",
      id: "role.water-steward",
      assignee: "person.mira",
      role: "watershed steward",
      status: "active",
      mandateRef: "mandate.water-steward"
    },
    {
      sourceObject: "governance item",
      id: "decision.water-window",
      itemType: "decision",
      item_type: "decision",
      title: "Approve dawn water window",
      status: "recorded",
      parent: "proposal.water-window",
      issue: "issue.water-window",
      proposal: "proposal.water-window",
      policyRef: "policy.water-window",
      mandateRef: "mandate.water-steward",
      outcome: "passed",
      effect: "binding",
      decisionMethod: "consent"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export const allocationAccountingWrapperFixture = {
  kind: "allocation-accounting",
  sourceProject: "common-credit",
  rows: [
    {
      sourceObject: "member",
      id: "member.kai",
      name: "Kai Chen",
      memberKind: "person",
      member_kind: "person",
      state: "active"
    },
    {
      sourceObject: "member",
      id: "member.food-hub",
      name: "Food Hub",
      memberKind: "organization",
      member_kind: "organization",
      state: "active"
    },
    {
      sourceObject: "account",
      id: "account.kai",
      owner: "member.kai",
      accountKind: "member",
      account_kind: "member",
      unit: "credits"
    },
    {
      sourceObject: "account",
      id: "account.food-hub",
      owner: "member.food-hub",
      accountKind: "reserve",
      account_kind: "reserve",
      unit: "credits"
    },
    {
      sourceObject: "allocation agreement",
      id: "agreement.food-distribution",
      participants: ["member.kai", "member.food-hub"],
      scope: "food hub distribution credit",
      status: "active",
      termsSummary: "Authorize food distribution credits for the drought window."
    },
    {
      sourceObject: "transaction",
      id: "transaction.food-distribution-001",
      from: "account.food-hub",
      to: "account.kai",
      amount: 42,
      unit: "credits",
      posted_at: "2026-06-13T09:00:00.000Z",
      status: "posted",
      memo: "Food hub distribution credit",
      agreementRef: "agreement.food-distribution"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export const allocationAccountingCorrectionWrapperFixture = {
  ...allocationAccountingWrapperFixture,
  rows: [
    ...allocationAccountingWrapperFixture.rows,
    {
      sourceObject: "transaction",
      id: "transaction.food-distribution-correction",
      from: "account.kai",
      to: "account.food-hub",
      amount: 42,
      unit: "credits",
      posted_at: "2026-06-13T11:00:00.000Z",
      status: "reversed",
      memo: "Reverse duplicated food hub distribution credit",
      agreementRef: "agreement.food-distribution",
      reverses: "transaction.food-distribution-001"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export const governanceAuthorityReviewPathWrapperFixture = {
  ...governanceAuthorityWrapperFixture,
  rows: [
    ...governanceAuthorityWrapperFixture.rows,
    {
      sourceObject: "governance item",
      id: "objection.water-window-buffer",
      itemType: "objection",
      item_type: "objection",
      title: "Riparian buffer objection",
      status: "open",
      parent: "proposal.water-window",
      proposal: "proposal.water-window",
      mandateRef: "mandate.water-steward"
    },
    {
      sourceObject: "governance item",
      id: "amendment.water-window-buffer",
      itemType: "amendment",
      item_type: "amendment",
      title: "Add riparian buffer condition",
      status: "submitted",
      parent: "proposal.water-window",
      proposal: "proposal.water-window",
      mandateRef: "mandate.water-steward"
    },
    {
      sourceObject: "governance item",
      id: "appeal.water-window",
      itemType: "appeal",
      item_type: "appeal",
      title: "Appeal water window review date",
      status: "open",
      parent: "decision.water-window",
      decisionRef: "decision.water-window",
      mandateRef: "mandate.water-steward"
    }
  ]
} as const satisfies LegacyCapabilityWrapperFixture;

export const phase6CombinedWrapperFixtures = [
  {
    ...governanceAuthorityWrapperFixture,
    rows: governanceAuthorityWrapperFixture.rows
  },
  {
    ...resourceCareWrapperFixture,
    rows: resourceCareWrapperFixture.rows.map((row) =>
      row.id === "use-right.dawn-grazing-window"
        ? {
            ...row,
            policyRef: "policy.water-window",
            decisionRef: "decision.water-window"
          }
        : row
    )
  },
  {
    ...claimsEvidenceWrapperFixture,
    rows: claimsEvidenceWrapperFixture.rows.map((row) =>
      row.id === "issue.riparian-stress"
        ? {
            ...row,
            scope: "resource.north-pasture"
          }
        : row
    )
  },
  {
    ...allocationAccountingWrapperFixture,
    rows: allocationAccountingWrapperFixture.rows.map((row) =>
      row.id === "transaction.food-distribution-001"
        ? {
            ...row,
            decisionRef: "decision.water-window"
          }
        : row
    )
  }
] as const satisfies readonly LegacyCapabilityWrapperFixture[];

export function executeLegacyCapabilityWrapper(
  fixture: LegacyCapabilityWrapperFixture
): LegacyCapabilityWrapperExecution {
  const baseDryRun = dryRunForFixture(fixture);
  const unknownLocalSubtypes = findUnknownLocalSubtypes(fixture);
  const runtime = createInMemoryCanonicalPersistence({ now: () => importedAt });
  const dryRun = {
    ...baseDryRun,
    candidateEvents: enrichCandidateEvents(fixture.kind, baseDryRun)
  };
  const materializedProjections = createInMemoryMaterializedProjectionStore();
  const execution = executePreparedWrapperImport({
    fixture,
    dryRun,
    runtime,
    materializedProjections
  });
  const review = createImportReviewReport(dryRun, {
    defaultDecision: "accept",
    reviewedAt: importedAt,
    reviewedByRef: reviewAuthorityRef(fixture.kind)
  });
  const unknownSubtypeAuditRecords = writeUnknownSubtypeAuditRecords(runtime, fixture, unknownLocalSubtypes);
  const objectRefs = runtime.queryObjectRefs().items.map((record) => record.ref);
  const canonicalMappings = runtime.listMappings();
  const events = execution.eventRecords.map((record) => record.event);
  const validation = validateFoldIn({
    events,
    expectedRefs: objectRefs,
    expectedEventTypes: events.map((event) => event.type),
    objectPageRefs: objectRefs.filter((ref) =>
      objectPageTypesFor(fixture.kind).includes(ref.type)
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
    unknownLocalSubtypes,
    unknownSubtypeAuditRecords
  };
}

export function executeLegacyCapabilityWrappers(
  fixtures: readonly LegacyCapabilityWrapperFixture[] = phase6CombinedWrapperFixtures
): LegacyCapabilityWrappersExecution {
  const runtime = createInMemoryCanonicalPersistence({ now: () => importedAt });
  const materializedProjections = createInMemoryMaterializedProjectionStore();
  const prepared = fixtures.map((fixture) => ({
    fixture,
    baseDryRun: dryRunForFixture(fixture),
    unknownLocalSubtypes: findUnknownLocalSubtypes(fixture)
  }));
  const allCandidates = prepared.flatMap((item) => item.baseDryRun.mappingCandidates);
  let eventSequenceOffset = 0;
  const executions = prepared.map((item) => {
    const dryRun = {
      ...item.baseDryRun,
      candidateEvents: enrichCandidateEvents(
        item.fixture.kind,
        item.baseDryRun,
        allCandidates,
        eventSequenceOffset
      )
    };
    eventSequenceOffset += dryRun.candidateEvents.length;
    const execution = executePreparedWrapperImport({
      fixture: item.fixture,
      dryRun,
      runtime,
      materializedProjections
    });
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: importedAt,
      reviewedByRef: reviewAuthorityRef(item.fixture.kind)
    });
    const unknownSubtypeAuditRecords = writeUnknownSubtypeAuditRecords(
      runtime,
      item.fixture,
      item.unknownLocalSubtypes
    );
    const objectRefs = runtime.queryObjectRefs().items.map((record) => record.ref);
    const canonicalMappings = runtime.listMappings();
    const events = execution.eventRecords.map((record) => record.event);

    return {
      kind: item.fixture.kind,
      sourceProject: item.fixture.sourceProject,
      dryRun,
      review,
      execution,
      materializedProjections,
      validation: validationForFixtures([item.fixture], events, objectRefs, canonicalMappings),
      objectRefs,
      canonicalMappings,
      unknownLocalSubtypes: item.unknownLocalSubtypes,
      unknownSubtypeAuditRecords
    };
  });
  const objectRefs = runtime.queryObjectRefs().items.map((record) => record.ref);
  const canonicalMappings = runtime.listMappings();
  const events = runtime.queryEvents().items.map((record) => record.event);
  const validation = validationForFixtures(fixtures, events, objectRefs, canonicalMappings);
  const adapterAuditRecords = runtime.listAdapterAudits();

  return {
    executions,
    materializedProjections,
    validation,
    objectRefs,
    canonicalMappings,
    unknownLocalSubtypes: executions.flatMap((execution) => execution.unknownLocalSubtypes),
    adapterAuditRecords
  };
}

export function readWrapperProjection<Name extends ProjectionRebuilderName>(
  execution: Pick<LegacyCapabilityWrapperExecution, "materializedProjections">,
  projectionName: Name,
  targetRef: ObjectRef
): MaterializedProjectionDocument<ProjectionDocumentPayload<Name>> | undefined {
  return readMaterializedProjection(execution.materializedProjections, {
    projectionName,
    targetRef
  });
}

export function mappingForLocalRow(
  execution: SourceRowLookup,
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

export function canonicalRefForLocalRow(
  execution: SourceRowLookup,
  sourceEntity: string,
  sourceId: string
): ObjectRef | undefined {
  return mappingForLocalRow(execution, sourceEntity, sourceId)?.canonicalRef;
}

export function findUnknownLocalSubtypes(
  fixture: LegacyCapabilityWrapperFixture
): readonly UnknownLocalSubtypeReviewItem[] {
  const known = knownSourceObjectsFor(fixture.kind);

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

  if (fixture.kind === "claims-evidence") {
    return dryRunSensemakingImport(fixture.rows);
  }

  if (fixture.kind === "governance-authority") {
    return dryRunIcosImport(fixture.rows);
  }

  return dryRunCommonCreditImport(fixture.rows);
}

function enrichCandidateEvents(
  kind: LegacyCapabilityWrapperKind,
  dryRun: ImportDryRunResult,
  sharedMappings: readonly CanonicalMappingCandidate[] = dryRun.mappingCandidates,
  sequenceOffset = 0
): readonly CanopyEvent[] {
  const mappings = sharedMappings;

  return dryRun.candidateEvents.map((event, index) =>
    withImportSequenceTime(
      enrichEventForKind(kind, event, mappings),
      sequenceOffset + index
    )
  );
}

function executePreparedWrapperImport(input: {
  readonly fixture: LegacyCapabilityWrapperFixture;
  readonly dryRun: ImportDryRunResult;
  readonly runtime: ReturnType<typeof createInMemoryCanonicalPersistence>;
  readonly materializedProjections: MaterializedProjectionStore;
}): ImportExecutionResult {
  const review = createImportReviewReport(input.dryRun, {
    defaultDecision: "accept",
    reviewedAt: importedAt,
    reviewedByRef: reviewAuthorityRef(input.fixture.kind)
  });

  return executeReviewedImport({
    dryRun: input.dryRun,
    review,
    runtime: input.runtime,
    recordedAt: importedAt,
    projectionRebuildOptions: { materializedProjections: input.materializedProjections }
  });
}

function enrichEventForKind(
  kind: LegacyCapabilityWrapperKind,
  event: CanopyEvent,
  mappings: readonly CanonicalMappingCandidate[]
): CanopyEvent {
  if (kind === "resource-care") {
    return enrichResourceCareEvent(event, mappings);
  }

  if (kind === "claims-evidence") {
    return enrichClaimsEvidenceEvent(event, mappings);
  }

  if (kind === "governance-authority") {
    return enrichGovernanceAuthorityEvent(event, mappings);
  }

  return enrichAllocationAccountingEvent(event, mappings);
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

function enrichGovernanceAuthorityEvent(
  event: CanopyEvent,
  mappings: readonly CanonicalMappingCandidate[]
): CanopyEvent {
  const record = legacyRecord(event);
  const assigneeRef = refFromRecord(mappings, record, ["assignee", "holder"], undefined);
  const issueRef = refFromRecord(mappings, record, ["issue", "parent"], "issue");
  const proposalRef = refFromRecord(mappings, record, ["proposal", "parent"], "proposal");
  const mandateRef = refFromRecord(mappings, record, ["mandateRef", "mandate_ref", "mandate"], "mandate");
  const policyRef = refFromRecord(mappings, record, ["policyRef", "policy_ref", "policy"], "policy");
  const decisionRef = refFromRecord(mappings, record, ["decisionRef", "decision_ref", "decision"], "decision");
  const itemType = textField(record, ["itemType", "item_type", "kind", "type"]);
  const authorityRefs = refsDefined([
    mandateRef,
    policyRef,
    decisionRef
  ]).filter((ref) => !sameRef(ref, event.objectRef));
  const relatedRefs = refsDefined([
    assigneeRef,
    issueRef,
    proposalRef,
    mandateRef,
    policyRef,
    decisionRef
  ]).filter((ref) => !sameRef(ref, event.objectRef));
  const decisionPayload = event.objectRef.type === "decision"
    ? optionalPayloadRecord({
        id: event.objectRef.id,
        type: "decision",
        title: titleForRecord(record),
        status: textField(record, ["status", "state"]),
        issueRefs: refsDefined([issueRef]),
        proposalRefs: refsDefined([proposalRef]),
        authorityRefs,
        outcome: textField(record, ["outcome"]),
        effect: textField(record, ["effect"]),
        rationale: textField(record, ["rationale", "body", "summary"]),
        conditions: stringList(record, ["conditions", "condition"]),
        decidedAt: textField(record, ["decidedAt", "decided_at", "occurredAt", "occurred_at"]),
        decidedByRefs: authorityRefs
      })
    : undefined;

  const eventType = governanceEventTypeForItem(event, itemType);

  return optionalEvent({
    ...event,
    type: eventType,
    relatedRefs,
    authorityRefs,
    payload: {
      ...event.payload,
      title: titleForRecord(record),
      summary: summaryForRecord(record),
      status: textField(record, ["status", "state"]),
      assigneeRefId: assigneeRef?.id,
      holderRefId: assigneeRef?.id,
      issueRefId: issueRef?.id,
      proposalRefId: proposalRef?.id,
      mandateRefId: mandateRef?.id,
      policyRefId: policyRef?.id,
      decisionRefId: decisionRef?.id,
      effect: textField(record, ["effect"]),
      outcome: textField(record, ["outcome"]),
      decision: decisionPayload
    }
  });
}

function enrichAllocationAccountingEvent(
  event: CanopyEvent,
  mappings: readonly CanonicalMappingCandidate[]
): CanopyEvent {
  const record = legacyRecord(event);
  const ownerRef = refFromRecord(mappings, record, ["owner", "accountOwner", "account_owner"], undefined);
  const fromAccountRef = refFromRecord(mappings, record, ["from", "fromAccount", "from_account"], "ledger-account");
  const toAccountRef = refFromRecord(mappings, record, ["to", "toAccount", "to_account"], "ledger-account");
  const agreementRef = refFromRecord(mappings, record, ["agreement", "agreementRef", "agreement_ref"], "agreement");
  const decisionRef = refFromRecord(mappings, record, ["decision", "decisionRef", "decision_ref"], "decision");
  const authorityRefs = refsDefined([
    event.objectRef.type === "agreement" ? event.objectRef : undefined,
    agreementRef,
    decisionRef
  ]);
  const amount = numberField(record, ["amount"]);
  const unit = textField(record, ["unit", "currency"]) ?? "credits";
  const lines =
    event.objectRef.type === "ledger-entry" && fromAccountRef !== undefined && toAccountRef !== undefined && amount !== undefined
      ? [
          { accountRef: fromAccountRef, side: "debit", amount, unit, memo: textField(record, ["memo"]) },
          { accountRef: toAccountRef, side: "credit", amount, unit, memo: textField(record, ["memo"]) }
        ]
      : [];

  const originalTransactionRef = refFromRecord(
    mappings,
    record,
    ["reverses", "reversalOf", "reversal_of", "originalTransaction", "original_transaction"],
    "ledger-entry"
  );
  const isReversal = event.type === "accounting.ledger_entry.reversed";
  const supersededEventId = isReversal && originalTransactionRef !== undefined
    ? `event.import.common-credit.transaction.${slugForEventId(originalTransactionRef.source?.sourceId ?? originalTransactionRef.id)}.accounting-ledger-entry-posted`
    : undefined;

  return optionalEvent({
    ...event,
    relatedRefs: refsDefined([ownerRef, fromAccountRef, toAccountRef, agreementRef, decisionRef, originalTransactionRef]).filter(
      (ref) => !sameRef(ref, event.objectRef)
    ),
    authorityRefs,
    ...(supersededEventId === undefined ? {} : { supersedesEventId: supersededEventId }),
    ...(supersededEventId === undefined
      ? {}
      : {
          supersession: {
            supersedesEventId: supersededEventId,
            supersededAt: event.occurredAt,
            reason: textField(record, ["memo", "reason"]) ?? "ledger entry reversed",
            replacementObjectRef: event.objectRef,
            authorityRefs
          }
        }),
    payload: {
      ...event.payload,
      title: titleForRecord(record),
      summary: summaryForRecord(record),
      ownerRefId: ownerRef?.id,
      accountKind: textField(record, ["accountKind", "account_kind", "kind", "type"]),
      agreementRefId: agreementRef?.id,
      decisionRefId: decisionRef?.id,
      memo: textField(record, ["memo", "summary", "description"]),
      effectiveAt: textField(record, ["postedAt", "posted_at", "effectiveAt", "effective_at"]),
      originalLedgerEntryRefId: originalTransactionRef?.id,
      originalEventId: supersededEventId,
      lines,
      totals: lines.length === 0 ? undefined : { [unit]: { debit: amount, credit: amount } }
    }
  });
}

function validationForFixtures(
  fixtures: readonly LegacyCapabilityWrapperFixture[],
  events: readonly CanopyEvent[],
  objectRefs: readonly ObjectRef[],
  canonicalMappings: readonly CanonicalMappingRecord[]
): FoldInValidationReport {
  return validateFoldIn({
    events,
    expectedRefs: objectRefs,
    expectedEventTypes: events.map((event) => event.type),
    objectPageRefs: objectRefs.filter((ref) =>
      fixtures.some((fixture) => objectPageTypesFor(fixture.kind).includes(ref.type))
    ),
    resourceRefs: objectRefs.filter((ref) => ref.type === "resource"),
    importPlans: fixtures.map((fixture) => ({
      sourceProject: fixture.sourceProject,
      planId: `${fixture.sourceProject}-fold-in`
    })),
    shellNavigation: fixtures.flatMap((fixture) => shellNavigationFor(fixture.kind)),
    capabilityPackageNames: fixtures.flatMap((fixture) => capabilityPackagesFor(fixture.kind)),
    canonicalMappingRefs: canonicalMappings.map((mapping) => mapping.canonicalRef)
  });
}

function writeUnknownSubtypeAuditRecords(
  runtime: ReturnType<typeof createInMemoryCanonicalPersistence>,
  fixture: LegacyCapabilityWrapperFixture,
  unknownLocalSubtypes: readonly UnknownLocalSubtypeReviewItem[]
): readonly AdapterAuditRecord[] {
  return unknownLocalSubtypes.map((item) =>
    runtime.putAdapterAudit({
      id: `adapter-audit.import.unknown-local-subtype.${item.sourceProject}.${slugForEventId(item.sourceObject)}.${slugForEventId(item.sourceId)}.${importedAt}`,
      kind: "adapter-audit",
      schemaVersion: 1,
      createdAt: importedAt,
      adapterName: `import.${item.sourceProject}`,
      direction: "migration",
      operation: "import.unknown-local-subtype.review-required",
      status: "partial",
      startedAt: importedAt,
      completedAt: importedAt,
      systemActor: "migration",
      externalRef: {
        provider: "phase-6-legacy-wrapper",
        resourceType: item.sourceObject,
        resourceId: item.sourceId,
        sourceProject: item.sourceProject
      },
      eventIds: [],
      outboxIds: [],
      warnings: ["unknown-local-subtype"],
      errors: [],
      metadata: {
        sourceProject: item.sourceProject,
        wrapperKind: fixture.kind,
        sourceObject: item.sourceObject,
        sourceId: item.sourceId,
        sourcePointer: {
          sourceProject: item.sourceProject,
          sourceEntity: item.sourceObject,
          sourceId: item.sourceId,
          importedAt
        },
        reason: item.reason,
        reviewStatus: "review-required",
        requiredAction: "Add an explicit Phase 6 wrapper mapping or retire/artifact the source subtype."
      }
    })
  );
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

function governanceEventTypeForItem(
  event: CanopyEvent,
  itemType: string | undefined
): CanopyEventType {
  if (containsToken(itemType, "objection")) {
    return "governance.objection.raised";
  }

  if (containsToken(itemType, "amendment")) {
    return "governance.amendment.submitted";
  }

  return event.type;
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
  if (kind === "resource-care") {
    return [
      { label: "Resource Care", href: "/resource-care" },
      { label: "Objects", href: "/objects" }
    ];
  }

  if (kind === "claims-evidence") {
    return [
      { label: "Claims & Evidence", href: "/claims-evidence" },
      { label: "Objects", href: "/objects" }
    ];
  }

  if (kind === "governance-authority") {
    return [
      { label: "Governance", href: "/governance" },
      { label: "Authority", href: "/authority" }
    ];
  }

  return [
    { label: "Allocation Accounting", href: "/allocation-accounting" },
    { label: "Objects", href: "/objects" }
  ];
}

function capabilityPackagesFor(kind: LegacyCapabilityWrapperKind): readonly string[] {
  if (kind === "resource-care") {
    return ["@canopy/capabilities-resource-care"];
  }

  if (kind === "claims-evidence") {
    return ["@canopy/capabilities-claims-evidence"];
  }

  if (kind === "governance-authority") {
    return ["@canopy/capabilities-governance"];
  }

  return ["@canopy/capabilities-allocation-accounting"];
}

function titleForRecord(record: LegacySourceRecord): string | undefined {
  return textField(record, ["title", "name", "label", "statement", "note"]);
}

function summaryForRecord(record: LegacySourceRecord): string | undefined {
  return textField(record, ["summary", "description", "statement", "note", "memo", "outcome", "reviewNote", "termsSummary"]);
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

function numberField(record: LegacySourceRecord, names: readonly string[]): number | undefined {
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

function containsToken(value: string | undefined, token: string): boolean {
  return value?.toLowerCase().includes(token.toLowerCase()) ?? false;
}

function slugForEventId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

const governanceAuthorityKnownSourceObjects = new Set([
  "actor",
  "role assignment",
  "mandate",
  "governance item",
  "issue",
  "proposal",
  "decision",
  "policy",
  "appeal",
  "objection",
  "amendment"
]);

const allocationAccountingKnownSourceObjects = new Set([
  "member",
  "account",
  "allocation agreement",
  "transaction",
  "ledger entry"
]);

function knownSourceObjectsFor(kind: LegacyCapabilityWrapperKind): ReadonlySet<string> {
  if (kind === "resource-care") {
    return resourceCareKnownSourceObjects;
  }

  if (kind === "claims-evidence") {
    return claimsEvidenceKnownSourceObjects;
  }

  if (kind === "governance-authority") {
    return governanceAuthorityKnownSourceObjects;
  }

  return allocationAccountingKnownSourceObjects;
}

function objectPageTypesFor(kind: LegacyCapabilityWrapperKind): readonly CanopyObjectType[] {
  if (kind === "resource-care") {
    return ["resource", "use-right", "policy", "decision", "flow"];
  }

  if (kind === "claims-evidence") {
    return ["issue", "claim", "evidence", "source"];
  }

  if (kind === "governance-authority") {
    return ["issue", "proposal", "decision", "policy", "mandate", "role", "person", "organization"];
  }

  return ["person", "organization", "ledger-account", "ledger-entry", "agreement"];
}

void (undefined as unknown as CanopyEventType | CanopyId);
