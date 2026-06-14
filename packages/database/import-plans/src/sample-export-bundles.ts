import type {
  CanopyEvent,
  CanopyObjectType,
  LifecycleStatus,
  ObjectRef,
  SourceProject,
} from "@canopy/contracts-kernel";
import { dryRunCommonCreditImport } from "./common-credit.js";
import { dryRunIcosImport } from "./icos.js";
import { dryRunSensemakingImport } from "./sensemaking.js";
import { dryRunStewardshipImport } from "./stewardship.js";
import type { ImportDryRunResult, LegacySourceRecord } from "./types.js";

export type SampleExportBundleFormat = "json" | "jsonl" | "csv_bundle";

export interface SampleExportBundleFile {
  readonly path: string;
  readonly format: SampleExportBundleFormat;
  readonly sourceObject: string;
  readonly contentHash: string;
  readonly records: readonly LegacySourceRecord[];
}

export interface SampleExportBundle {
  readonly bundleId: string;
  readonly sourceProject: SourceProject;
  readonly exportedAt: string;
  readonly sourceSchemaVersion: string;
  readonly description: string;
  readonly files: readonly SampleExportBundleFile[];
}

const sampleExportedAt = "2026-01-16T12:00:00.000Z";
const sampleImportedAt = "2026-01-16T13:00:00.000Z";
const sampleNamespace = "canopy.sample.riverbend-fold-in";

const commonCreditRecords = [
  {
    sourceObject: "member",
    id: "cc-member-kai",
    sourceVersion: "cc-export-2026-01-16",
    name: "Kai Chen",
    memberKind: "person",
    state: "active",
    joinedAt: "2025-11-04T15:30:00.000Z",
  },
  {
    sourceObject: "member",
    id: "cc-member-food-hub",
    sourceVersion: "cc-export-2026-01-16",
    name: "Riverbend Food Hub",
    memberKind: "organization",
    state: "active",
  },
  {
    sourceObject: "account",
    id: "cc-account-food-hub-reserve",
    sourceVersion: "cc-export-2026-01-16",
    owner: "cc-member-food-hub",
    kind: "reserve",
    authorityRef: "agreement-food-hub-distribution",
    balance: 0,
    unit: "COMMON_CREDIT",
  },
  {
    sourceObject: "allocation agreement",
    id: "agreement-food-hub-distribution",
    sourceVersion: "cc-export-2026-01-16",
    participants: "Riverbend Food Hub; Riverbend Watershed Commons",
    scope: "Dawn irrigation window distribution support",
    status: "active",
    decisionRef: "decision-irrigation-window",
    termsSummary: "Credit support for staffed gate operation and post-window check.",
  },
  {
    sourceObject: "transaction",
    id: "cc-tx-food-hub-1",
    sourceVersion: "cc-export-2026-01-16",
    from: "cc-account-food-hub-reserve",
    to: "cc-account-commons-reserve",
    amount: 320,
    postedAt: "2026-01-16T09:00:00.000Z",
    posted_at: "2026-01-16T09:00:00.000Z",
    status: "posted",
    agreementRef: "agreement-food-hub-distribution",
    memo: "Dawn window distribution support.",
  },
  {
    sourceObject: "transaction",
    id: "cc-tx-food-hub-1-correction",
    sourceVersion: "cc-export-2026-01-16",
    from: "cc-account-food-hub-reserve",
    to: "cc-account-commons-reserve",
    amount: -20,
    postedAt: "2026-01-16T10:30:00.000Z",
    posted_at: "2026-01-16T10:30:00.000Z",
    status: "reversed",
    agreementRef: "agreement-food-hub-distribution",
    reversalId: "cc-tx-food-hub-1",
    memo: "Append-only correction after double-counted staging time.",
  },
] as const satisfies readonly LegacySourceRecord[];

const icosRecords = [
  {
    sourceObject: "actor",
    id: "icos-council-riverbend",
    sourceVersion: "icos-export-2026-01-16",
    actorKind: "organization",
    actor_kind: "organization",
    name: "Riverbend Watershed Council",
    status: "active",
  },
  {
    sourceObject: "role assignment",
    id: "role-watershed-steward-2026",
    sourceVersion: "icos-export-2026-01-16",
    assignee: "person.mira",
    role: "watershed steward",
    scope: "Riverbend irrigation and riparian care",
    status: "active",
    policyRef: "policy-drought-protocol-v2",
    delegatedBy: "decision-irrigation-window",
  },
  {
    sourceObject: "mandate",
    id: "mandate-irrigation-window",
    sourceVersion: "icos-export-2026-01-16",
    holder: "person.mira",
    scope: "Approve time-boxed drought irrigation windows",
    status: "active",
    decisionRef: "decision-irrigation-window",
    reviewDate: "2026-02-01",
  },
  {
    sourceObject: "governance item",
    id: "issue-irrigation-window",
    sourceVersion: "icos-export-2026-01-16",
    itemType: "issue",
    item_type: "issue",
    title: "Irrigation timing under riparian stress",
    status: "open",
    evidenceLinks: ["claim-riparian-stress"],
    policyRef: "policy-drought-protocol-v2",
  },
  {
    sourceObject: "governance item",
    id: "proposal-irrigation-window",
    sourceVersion: "icos-export-2026-01-16",
    itemType: "proposal",
    item_type: "proposal",
    title: "Open south canal gate during dawn window",
    status: "open",
    parent: "issue-irrigation-window",
    decisionMethod: "consent_with_guardian_review",
    policyRef: "policy-drought-protocol-v2",
  },
  {
    sourceObject: "governance item",
    id: "decision-irrigation-window",
    sourceVersion: "icos-export-2026-01-16",
    itemType: "decision",
    item_type: "decision",
    title: "Grant dawn irrigation window",
    status: "recorded",
    parent: "proposal-irrigation-window",
    decisionMethod: "consent_with_guardian_review",
    policyRef: "policy-drought-protocol-v2",
  },
] as const satisfies readonly LegacySourceRecord[];

const sensemakingRecords = [
  {
    sourceObject: "source",
    id: "source-riparian-survey",
    sourceVersion: "sensemaking-export-2026-01-16",
    kind: "field survey",
    title: "South canal riparian survey",
    contentHash: "sha256:sample-riparian-survey",
    sourceSteward: "field-team-alpha",
    license: "commons-internal",
  },
  {
    sourceObject: "claim",
    id: "claim-riparian-stress",
    sourceVersion: "sensemaking-export-2026-01-16",
    statement: "The south canal corridor shows medium riparian stress during afternoon withdrawals.",
    status: "contested",
    confidence: "medium",
    scope: "south-canal",
    reviewer: "guardian-review-riparian-window",
  },
  {
    sourceObject: "evidence link",
    id: "link-survey-qualifies-claim",
    sourceVersion: "sensemaking-export-2026-01-16",
    claim: "claim-riparian-stress",
    source: "source-riparian-survey",
    relation: "qualifies",
    weight: "medium",
    excerptLocation: "survey-row-18",
    sourcePermission: "agreement-riverbend-data-stewardship",
  },
  {
    sourceObject: "model",
    id: "model-riparian-scenario",
    sourceVersion: "sensemaking-export-2026-01-16",
    modelKind: "scenario",
    model_kind: "scenario",
    title: "Dawn window evaporation scenario",
    status: "reviewed",
    assumptions: ["dawn-window-lower-evaporation", "pause-on-threshold-breach"],
    outputs: ["model-output-riparian-risk"],
    outputClassification: "model_derived",
    reviewer: "guardian-review-riparian-window",
  },
] as const satisfies readonly LegacySourceRecord[];

const stewardshipRecords = [
  {
    sourceObject: "place",
    id: "place-south-canal",
    sourceVersion: "stewardship-export-2026-01-16",
    name: "South canal",
    placeKind: "canal reach",
    place_kind: "canal reach",
    boundary: "generalized reach between public mile markers 4 and 7",
    stewards: ["person.mira"],
  },
  {
    sourceObject: "living system",
    id: "living-system-riparian-corridor",
    sourceVersion: "stewardship-export-2026-01-16",
    name: "South canal riparian corridor",
    livingSystemKind: "riparian corridor",
    living_system_kind: "riparian corridor",
    boundary: "generalized reach",
    sensitivity: "protected",
    locationTreatment: "generalized",
    guardians: ["guardian-review-riparian-window"],
  },
  {
    sourceObject: "resource",
    id: "resource-irrigation-gate",
    sourceVersion: "stewardship-export-2026-01-16",
    name: "South canal irrigation gate",
    resourceKind: "irrigation gate",
    resource_kind: "irrigation gate",
    location: "place-south-canal",
    relatedCommons: "commons-riverbend",
  },
  {
    sourceObject: "use right",
    id: "use-right-irrigation-gate-window",
    sourceVersion: "stewardship-export-2026-01-16",
    holder: "cc-member-kai",
    resource: "resource-irrigation-gate",
    permission: "open_gate.dawn_window",
    state: "active",
    mandateRef: "mandate-irrigation-window",
    conditions: ["pause if threshold breached", "dawn window only"],
  },
  {
    sourceObject: "stewardship activity",
    id: "task-south-canal-check",
    sourceVersion: "stewardship-export-2026-01-16",
    activityType: "inspection",
    activity_type: "inspection",
    status: "completed",
    subject: "resource-irrigation-gate",
    assignedActor: "cc-member-kai",
    completedAt: "2026-01-16T09:45:00.000Z",
    reviewer: "person.mira",
    outcome: "Gate closed and no immediate threshold breach observed.",
  },
] as const satisfies readonly LegacySourceRecord[];

export const commonCreditSampleExportBundle = bundle(
  "sample.common-credit.riverbend.2026-01-16",
  "common-credit",
  "Mutual-credit members, ledger accounts, allocation agreement, posted entry, and append-only correction.",
  [
    file("exports/common-credit/members.json", "json", "member", "sha256:sample-common-credit-members", commonCreditRecords.slice(0, 2)),
    file("exports/common-credit/accounts.json", "json", "account", "sha256:sample-common-credit-accounts", commonCreditRecords.slice(2, 3)),
    file(
      "exports/common-credit/allocation-agreements.json",
      "json",
      "allocation agreement",
      "sha256:sample-common-credit-agreements",
      commonCreditRecords.slice(3, 4),
    ),
    file("exports/common-credit/ledger.jsonl", "jsonl", "transaction", "sha256:sample-common-credit-ledger", commonCreditRecords.slice(4)),
  ],
);

export const icosSampleExportBundle = bundle(
  "sample.icos.riverbend.2026-01-16",
  "icos",
  "Governance actors, authority assignments, mandate, issue, proposal, and binding decision export.",
  [
    file("exports/icos/actors.json", "json", "actor", "sha256:sample-icos-actors", icosRecords.slice(0, 1)),
    file("exports/icos/authority.json", "json", "role assignment", "sha256:sample-icos-authority", icosRecords.slice(1, 3)),
    file("exports/icos/governance-items.jsonl", "jsonl", "governance item", "sha256:sample-icos-governance", icosRecords.slice(3)),
  ],
);

export const sensemakingSampleExportBundle = bundle(
  "sample.sensemaking.riverbend.2026-01-16",
  "sensemaking",
  "Claim, evidence, source provenance, and model scenario export preserving uncertainty.",
  [
    file("exports/sensemaking/sources.json", "json", "source", "sha256:sample-sensemaking-sources", sensemakingRecords.slice(0, 1)),
    file("exports/sensemaking/claims.json", "json", "claim", "sha256:sample-sensemaking-claims", sensemakingRecords.slice(1, 2)),
    file(
      "exports/sensemaking/evidence-links.csv",
      "csv_bundle",
      "evidence link",
      "sha256:sample-sensemaking-evidence-links",
      sensemakingRecords.slice(2, 3),
    ),
    file("exports/sensemaking/models.json", "json", "model", "sha256:sample-sensemaking-models", sensemakingRecords.slice(3)),
  ],
);

export const stewardshipSampleExportBundle = bundle(
  "sample.stewardship.riverbend.2026-01-16",
  "stewardship",
  "Place, protected living system, resource, active use right, and task export with location treatment.",
  [
    file("exports/stewardship/places.json", "json", "place", "sha256:sample-stewardship-places", stewardshipRecords.slice(0, 1)),
    file(
      "exports/stewardship/living-systems.json",
      "json",
      "living system",
      "sha256:sample-stewardship-living-systems",
      stewardshipRecords.slice(1, 2),
    ),
    file("exports/stewardship/resources.json", "json", "resource", "sha256:sample-stewardship-resources", stewardshipRecords.slice(2, 3)),
    file("exports/stewardship/use-rights.json", "json", "use right", "sha256:sample-stewardship-use-rights", stewardshipRecords.slice(3, 4)),
    file("exports/stewardship/tasks.jsonl", "jsonl", "stewardship activity", "sha256:sample-stewardship-tasks", stewardshipRecords.slice(4)),
  ],
);

export const foldedSourceSampleExportBundles = [
  commonCreditSampleExportBundle,
  icosSampleExportBundle,
  sensemakingSampleExportBundle,
  stewardshipSampleExportBundle,
] as const satisfies readonly SampleExportBundle[];

export function recordsFromSampleExportBundle(
  bundle: SampleExportBundle,
): readonly LegacySourceRecord[] {
  return bundle.files.flatMap((item) => item.records);
}

export function dryRunSampleExportBundle(
  bundle: SampleExportBundle,
): ImportDryRunResult {
  const records = recordsFromSampleExportBundle(bundle);

  switch (bundle.sourceProject) {
    case "common-credit":
      return dryRunCommonCreditImport(records);
    case "icos":
      return dryRunIcosImport(records);
    case "sensemaking":
      return dryRunSensemakingImport(records);
    case "stewardship":
      return dryRunStewardshipImport(records);
    case "canopy":
      throw new Error("Canopy-native records do not use folded source import plans.");
  }
}

export function dryRunSampleExportBundles(): readonly ImportDryRunResult[] {
  return foldedSourceSampleExportBundles.map((item) => dryRunSampleExportBundle(item));
}

const ref = (
  id: string,
  type: CanopyObjectType,
  sourceProject: SourceProject,
  sourceEntity: string,
  sourceId: string,
  lifecycleStatus: LifecycleStatus = "active",
): ObjectRef => ({
  id,
  type,
  namespace: sampleNamespace,
  lifecycleStatus,
  source: {
    sourceProject,
    sourceEntity,
    sourceId,
    sourceVersion: `${sourceProject}-export-2026-01-16`,
    importedAt: sampleImportedAt,
  },
});

export const foldedSourceSampleRefs = {
  personKai: ref("sample.person.kai", "person", "common-credit", "member", "cc-member-kai"),
  organizationFoodHub: ref("sample.org.food-hub", "organization", "common-credit", "member", "cc-member-food-hub"),
  ledgerAccountFoodHub: ref("sample.ledger-account.food-hub.reserve", "ledger-account", "common-credit", "account", "cc-account-food-hub-reserve"),
  agreementFoodHub: ref("sample.agreement.food-hub-distribution", "agreement", "common-credit", "allocation agreement", "agreement-food-hub-distribution"),
  ledgerEntryFoodHub: ref("sample.ledger-entry.food-hub-distribution", "ledger-entry", "common-credit", "transaction", "cc-tx-food-hub-1"),
  ledgerEntryFoodHubCorrection: ref("sample.ledger-entry.food-hub-correction", "ledger-entry", "common-credit", "transaction", "cc-tx-food-hub-1-correction"),
  organizationCouncil: ref("sample.org.riverbend-council", "organization", "icos", "actor", "icos-council-riverbend"),
  roleWatershedSteward: ref("sample.role.watershed-steward", "role", "icos", "role assignment", "role-watershed-steward-2026"),
  mandateIrrigationWindow: ref("sample.mandate.irrigation-window", "mandate", "icos", "mandate", "mandate-irrigation-window"),
  issueIrrigationWindow: ref("sample.issue.irrigation-window", "issue", "icos", "governance item", "issue-irrigation-window"),
  proposalIrrigationWindow: ref("sample.proposal.irrigation-window", "proposal", "icos", "governance item", "proposal-irrigation-window"),
  decisionIrrigationWindow: ref("sample.decision.irrigation-window", "decision", "icos", "governance item", "decision-irrigation-window"),
  sourceRiparianSurvey: ref("sample.source.riparian-survey", "source", "sensemaking", "source", "source-riparian-survey"),
  claimRiparianStress: ref("sample.claim.riparian-stress", "claim", "sensemaking", "claim", "claim-riparian-stress"),
  evidenceRiparianSurvey: ref("sample.evidence.riparian-survey", "evidence", "sensemaking", "evidence link", "link-survey-qualifies-claim"),
  modelRiparianScenario: ref("sample.model.riparian-scenario", "model", "sensemaking", "model", "model-riparian-scenario"),
  placeSouthCanal: ref("sample.place.south-canal", "place", "stewardship", "place", "place-south-canal"),
  livingSystemRiparianCorridor: ref("sample.living-system.riparian-corridor", "living-system", "stewardship", "living system", "living-system-riparian-corridor"),
  resourceIrrigationGate: ref("sample.resource.irrigation-gate", "resource", "stewardship", "resource", "resource-irrigation-gate"),
  useRightIrrigationGate: ref("sample.use-right.irrigation-gate-window", "use-right", "stewardship", "use right", "use-right-irrigation-gate-window"),
  taskCanalCheck: ref("sample.task.south-canal-check", "task", "stewardship", "stewardship activity", "task-south-canal-check"),
  dataStewardshipAgreement: ref("sample.agreement.data-stewardship", "agreement", "canopy", "agreement", "sample.agreement.data-stewardship"),
  ledgerAccountCommons: ref("sample.ledger-account.commons.reserve", "ledger-account", "canopy", "ledger-account", "sample.ledger-account.commons.reserve"),
} as const;

export const foldedSourceSampleCanonicalObjects = Object.values(foldedSourceSampleRefs);

export const foldedSourceSampleCanonicalEvents = [
  event("event.sample.identity.person.created.kai", "identity.person.created", "2026-01-16T05:00:00.000Z", foldedSourceSampleRefs.personKai, [], [], "identity-authority", {
    sourceBundleId: commonCreditSampleExportBundle.bundleId,
    sourceRecordId: "cc-member-kai",
  }),
  event("event.sample.identity.organization.created.food-hub", "identity.organization.created", "2026-01-16T05:01:00.000Z", foldedSourceSampleRefs.organizationFoodHub, [], [], "identity-authority", {
    sourceBundleId: commonCreditSampleExportBundle.bundleId,
    sourceRecordId: "cc-member-food-hub",
  }),
  event("event.sample.identity.organization.created.council", "identity.organization.created", "2026-01-16T05:02:00.000Z", foldedSourceSampleRefs.organizationCouncil, [], [], "identity-authority", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "icos-council-riverbend",
  }),
  event("event.sample.authority.mandate.granted.irrigation-window", "authority.mandate.granted", "2026-01-16T05:05:00.000Z", foldedSourceSampleRefs.mandateIrrigationWindow, [foldedSourceSampleRefs.organizationCouncil], [foldedSourceSampleRefs.decisionIrrigationWindow], "identity-authority", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "mandate-irrigation-window",
    scope: "Approve time-boxed drought irrigation windows",
  }),
  event("event.sample.authority.role.assigned.watershed-steward", "authority.role.assigned", "2026-01-16T05:06:00.000Z", foldedSourceSampleRefs.roleWatershedSteward, [foldedSourceSampleRefs.mandateIrrigationWindow], [foldedSourceSampleRefs.mandateIrrigationWindow], "identity-authority", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "role-watershed-steward-2026",
    permissionKeys: ["stewardship.use_right.grant"],
  }),
  event("event.sample.evidence.source.ingested.riparian-survey", "evidence.source.ingested", "2026-01-16T05:10:00.000Z", foldedSourceSampleRefs.sourceRiparianSurvey, [foldedSourceSampleRefs.dataStewardshipAgreement], [foldedSourceSampleRefs.dataStewardshipAgreement], "claims-evidence", {
    sourceBundleId: sensemakingSampleExportBundle.bundleId,
    sourceRecordId: "source-riparian-survey",
    contentHash: "sha256:sample-riparian-survey",
    dataStewardshipAgreementRef: foldedSourceSampleRefs.dataStewardshipAgreement.id,
  }, "guardian_restricted", "locally_verified"),
  event("event.sample.claim.contested.riparian-stress", "claim.contested", "2026-01-16T05:12:00.000Z", foldedSourceSampleRefs.claimRiparianStress, [foldedSourceSampleRefs.sourceRiparianSurvey], [], "claims-evidence", {
    sourceBundleId: sensemakingSampleExportBundle.bundleId,
    sourceRecordId: "claim-riparian-stress",
    preservesUncertainty: true,
    confidence: "medium",
  }, "commons", "contested"),
  event("event.sample.evidence.linked-to-claim.riparian-survey", "evidence.linked_to_claim", "2026-01-16T05:14:00.000Z", foldedSourceSampleRefs.evidenceRiparianSurvey, [foldedSourceSampleRefs.sourceRiparianSurvey, foldedSourceSampleRefs.claimRiparianStress], [foldedSourceSampleRefs.dataStewardshipAgreement], "claims-evidence", {
    sourceBundleId: sensemakingSampleExportBundle.bundleId,
    sourceRecordId: "link-survey-qualifies-claim",
    relation: "qualifies",
    locationTreatment: "generalized",
  }, "guardian_restricted", "locally_verified"),
  event("event.sample.model.created.riparian-scenario", "model.created", "2026-01-16T05:16:00.000Z", foldedSourceSampleRefs.modelRiparianScenario, [foldedSourceSampleRefs.claimRiparianStress], [], "ecological-modeling", {
    sourceBundleId: sensemakingSampleExportBundle.bundleId,
    sourceRecordId: "model-riparian-scenario",
    outputClassification: "model_derived",
    canAuthorizeBindingAction: false,
  }, "organization", "model_derived"),
  event("event.sample.governance.issue.created.irrigation-window", "governance.issue.created", "2026-01-16T05:20:00.000Z", foldedSourceSampleRefs.issueIrrigationWindow, [foldedSourceSampleRefs.claimRiparianStress], [], "governance", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "issue-irrigation-window",
  }, "commons", "locally_verified"),
  event("event.sample.governance.proposal.created.irrigation-window", "governance.proposal.created", "2026-01-16T05:22:00.000Z", foldedSourceSampleRefs.proposalIrrigationWindow, [foldedSourceSampleRefs.issueIrrigationWindow, foldedSourceSampleRefs.useRightIrrigationGate], [], "governance", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "proposal-irrigation-window",
    parentIssueRefId: foldedSourceSampleRefs.issueIrrigationWindow.id,
  }),
  event("event.sample.ecology.living-system.created.riparian-corridor", "ecology.living_system.created", "2026-01-16T05:24:00.000Z", foldedSourceSampleRefs.livingSystemRiparianCorridor, [foldedSourceSampleRefs.placeSouthCanal, foldedSourceSampleRefs.claimRiparianStress], [foldedSourceSampleRefs.mandateIrrigationWindow], "ecological-modeling", {
    sourceBundleId: stewardshipSampleExportBundle.bundleId,
    sourceRecordId: "living-system-riparian-corridor",
    protectedLocationTreatment: "generalized",
  }, "guardian_restricted", "locally_verified", foldedSourceSampleRefs.livingSystemRiparianCorridor.id),
  event("event.sample.stewardship.resource.created.irrigation-gate", "stewardship.resource.created", "2026-01-16T05:26:00.000Z", foldedSourceSampleRefs.resourceIrrigationGate, [foldedSourceSampleRefs.placeSouthCanal, foldedSourceSampleRefs.livingSystemRiparianCorridor], [foldedSourceSampleRefs.mandateIrrigationWindow], "stewardship", {
    sourceBundleId: stewardshipSampleExportBundle.bundleId,
    sourceRecordId: "resource-irrigation-gate",
    ecologicalContextRefId: foldedSourceSampleRefs.livingSystemRiparianCorridor.id,
  }, "public", "locally_verified", foldedSourceSampleRefs.livingSystemRiparianCorridor.id),
  event("event.sample.governance.decision.recorded.irrigation-window", "governance.decision.recorded", "2026-01-16T05:30:00.000Z", foldedSourceSampleRefs.decisionIrrigationWindow, [foldedSourceSampleRefs.proposalIrrigationWindow, foldedSourceSampleRefs.claimRiparianStress], [foldedSourceSampleRefs.mandateIrrigationWindow], "governance", {
    sourceBundleId: icosSampleExportBundle.bundleId,
    sourceRecordId: "decision-irrigation-window",
    machineOutputAuthorityRefIds: [],
  }, "public", "institutionally_certified"),
  event("event.sample.stewardship.use-right.granted.irrigation-window", "stewardship.use_right.granted", "2026-01-16T05:35:00.000Z", foldedSourceSampleRefs.useRightIrrigationGate, [foldedSourceSampleRefs.personKai, foldedSourceSampleRefs.resourceIrrigationGate, foldedSourceSampleRefs.claimRiparianStress], [foldedSourceSampleRefs.mandateIrrigationWindow, foldedSourceSampleRefs.decisionIrrigationWindow], "stewardship", {
    sourceBundleId: stewardshipSampleExportBundle.bundleId,
    sourceRecordId: "use-right-irrigation-gate-window",
    holderRefId: foldedSourceSampleRefs.personKai.id,
    resourceRefId: foldedSourceSampleRefs.resourceIrrigationGate.id,
    decisionRefId: foldedSourceSampleRefs.decisionIrrigationWindow.id,
    permissions: ["open_gate.dawn_window"],
  }, "public", "institutionally_certified", foldedSourceSampleRefs.livingSystemRiparianCorridor.id),
  event("event.sample.allocation.consent.recorded.food-hub", "allocation.consent.recorded", "2026-01-16T05:40:00.000Z", foldedSourceSampleRefs.agreementFoodHub, [foldedSourceSampleRefs.organizationFoodHub, foldedSourceSampleRefs.useRightIrrigationGate], [foldedSourceSampleRefs.decisionIrrigationWindow], "allocation-accounting", {
    sourceBundleId: commonCreditSampleExportBundle.bundleId,
    sourceRecordId: "agreement-food-hub-distribution",
  }, "organization", "institutionally_certified"),
  event("event.sample.accounting.ledger-entry.posted.food-hub", "accounting.ledger_entry.posted", "2026-01-16T09:00:00.000Z", foldedSourceSampleRefs.ledgerEntryFoodHub, [foldedSourceSampleRefs.ledgerAccountFoodHub, foldedSourceSampleRefs.ledgerAccountCommons, foldedSourceSampleRefs.agreementFoodHub], [foldedSourceSampleRefs.decisionIrrigationWindow, foldedSourceSampleRefs.agreementFoodHub], "allocation-accounting", {
    sourceBundleId: commonCreditSampleExportBundle.bundleId,
    sourceRecordId: "cc-tx-food-hub-1",
    amount: 320,
    unit: "COMMON_CREDIT",
  }, "organization", "institutionally_certified"),
  {
    ...event("event.sample.accounting.ledger-entry.reversed.food-hub-correction", "accounting.ledger_entry.reversed", "2026-01-16T10:30:00.000Z", foldedSourceSampleRefs.ledgerEntryFoodHubCorrection, [foldedSourceSampleRefs.ledgerEntryFoodHub, foldedSourceSampleRefs.ledgerAccountFoodHub, foldedSourceSampleRefs.agreementFoodHub], [foldedSourceSampleRefs.decisionIrrigationWindow, foldedSourceSampleRefs.agreementFoodHub], "allocation-accounting", {
      sourceBundleId: commonCreditSampleExportBundle.bundleId,
      sourceRecordId: "cc-tx-food-hub-1-correction",
      reversesLedgerEntryRefId: foldedSourceSampleRefs.ledgerEntryFoodHub.id,
      appendOnlyCorrection: true,
    }, "organization", "institutionally_certified"),
    supersedesEventId: "event.sample.accounting.ledger-entry.posted.food-hub",
    supersession: {
      supersedesEventId: "event.sample.accounting.ledger-entry.posted.food-hub",
      supersededAt: "2026-01-16T10:30:00.000Z",
      reason: "source_correction_imported_append_only",
      replacementObjectRef: foldedSourceSampleRefs.ledgerEntryFoodHubCorrection,
      authorityRefs: [
        foldedSourceSampleRefs.decisionIrrigationWindow,
        foldedSourceSampleRefs.agreementFoodHub,
      ],
    },
  },
  event("event.sample.stewardship.task.completed.south-canal-check", "stewardship.task.completed", "2026-01-16T10:45:00.000Z", foldedSourceSampleRefs.taskCanalCheck, [foldedSourceSampleRefs.resourceIrrigationGate, foldedSourceSampleRefs.useRightIrrigationGate], [foldedSourceSampleRefs.decisionIrrigationWindow], "stewardship", {
    sourceBundleId: stewardshipSampleExportBundle.bundleId,
    sourceRecordId: "task-south-canal-check",
    doesNotCertifyEcologicalImprovement: true,
  }, "commons", "locally_verified", foldedSourceSampleRefs.livingSystemRiparianCorridor.id),
] as const satisfies readonly CanopyEvent[];

function bundle(
  bundleId: string,
  sourceProject: SourceProject,
  description: string,
  files: readonly SampleExportBundleFile[],
): SampleExportBundle {
  return {
    bundleId,
    sourceProject,
    exportedAt: sampleExportedAt,
    sourceSchemaVersion: "sample-2026-01",
    description,
    files,
  };
}

function file(
  path: string,
  format: SampleExportBundleFormat,
  sourceObject: string,
  contentHash: string,
  records: readonly LegacySourceRecord[],
): SampleExportBundleFile {
  return { path, format, sourceObject, contentHash, records };
}

function event(
  id: string,
  type: CanopyEvent["type"],
  occurredAt: string,
  objectRef: ObjectRef,
  relatedRefs: readonly ObjectRef[],
  authorityRefs: readonly ObjectRef[],
  sourceCapability: CanopyEvent["sourceCapability"],
  payload: Readonly<Record<string, unknown>>,
  visibility: CanopyEvent["visibility"] = "public",
  dataState: CanopyEvent["dataState"] = "locally_verified",
  livingSystemId?: string,
): CanopyEvent {
  return {
    id,
    type,
    occurredAt,
    systemActor: "importer",
    objectRef,
    relatedRefs,
    authorityRefs,
    sourceCapability,
    payload,
    schemaVersion: 1,
    visibility,
    dataState,
    ...(livingSystemId === undefined ? {} : { livingSystemId }),
  };
}
