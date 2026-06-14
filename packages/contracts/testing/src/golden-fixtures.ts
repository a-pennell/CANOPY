import type {
  CanopyId,
  CanopyEvent,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  ObjectRef,
  SourceProject
} from "@canopy/contracts-kernel";

export type GoldenFixtureDomain =
  | "identity"
  | "authority"
  | "claims-evidence"
  | "governance"
  | "stewardship"
  | "allocation-accounting"
  | "ecology"
  | "event"
  | "export"
  | "redaction"
  | "federation";

export type GoldenFixtureFormat = "json" | "jsonl" | "csv_bundle";

export type GoldenFixtureObjectType =
  | CanopyObjectType
  | "access-rule"
  | "affected-group"
  | "allocation"
  | "assumption"
  | "audit"
  | "capability"
  | "canonical-mapping"
  | "contribution"
  | "counterclaim"
  | "credential"
  | "data-stewardship-agreement"
  | "delegation"
  | "export-envelope"
  | "federation-rule"
  | "guardian"
  | "local-term"
  | "membership"
  | "model-output"
  | "obligation"
  | "perspective"
  | "policy-version"
  | "quorum-state"
  | "request"
  | "retrospective"
  | "role-assignment"
  | "routine"
  | "scenario"
  | "stock"
  | "taxonomy"
  | "treasury"
  | "vote";

export interface GoldenFixtureFile {
  readonly path: string;
  readonly format: GoldenFixtureFormat;
  readonly contentHash?: ContentHash;
  readonly description?: string;
}

export interface GoldenFixtureObjectSet {
  readonly domain: GoldenFixtureDomain;
  readonly objectTypes: readonly GoldenFixtureObjectType[];
  readonly objectRefs: readonly ObjectRef[];
  readonly eventTypes: readonly string[];
  readonly fixtureFiles: readonly GoldenFixtureFile[];
}

export interface GoldenFixtureExpectation {
  readonly id: CanopyId;
  readonly title: string;
  readonly domain: GoldenFixtureDomain;
  readonly invariantCaseIds: readonly CanopyId[];
  readonly requiredObjectRefs: readonly ObjectRef[];
  readonly requiredEventTypes: readonly string[];
}

export interface GoldenFixtureObject {
  readonly ref: ObjectRef;
  readonly domain: GoldenFixtureDomain;
  readonly objectType: GoldenFixtureObjectType;
  readonly title: string;
  readonly linkedRefs: readonly ObjectRef[];
  readonly invariantCaseIds: readonly CanopyId[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface GoldenFixtureAntiCollapseExpectation {
  readonly id: CanopyId;
  readonly invariantCaseId: CanopyId;
  readonly title: string;
  readonly forbiddenCollapseRefs: readonly [ObjectRef, ObjectRef];
  readonly failureCode: string;
  readonly deniedEventTypes: readonly string[];
  readonly requiredExplanation: string;
}

export interface GoldenFixtureManifest {
  readonly id: CanopyId;
  readonly name: string;
  readonly description?: string;
  readonly schemaVersion: number;
  readonly fixtureVersion: string;
  readonly createdAt: IsoDateTime;
  readonly sourceProjects: readonly SourceProject[];
  readonly domains: readonly GoldenFixtureDomain[];
  readonly objectSets: readonly GoldenFixtureObjectSet[];
  readonly objects: readonly GoldenFixtureObject[];
  readonly events: readonly CanopyEvent[];
  readonly expectations: readonly GoldenFixtureExpectation[];
  readonly antiCollapseExpectations: readonly GoldenFixtureAntiCollapseExpectation[];
  readonly exportEnvelopeRefs: readonly ObjectRef[];
  readonly redactionEventRefs: readonly ObjectRef[];
  readonly federationRuleRefs: readonly ObjectRef[];
  readonly localTermRefs: readonly ObjectRef[];
  readonly canonicalMappingRefs: readonly ObjectRef[];
  readonly contentHash?: ContentHash;
}

export const requiredGoldenFixtureDomains = [
  "identity",
  "authority",
  "claims-evidence",
  "governance",
  "stewardship",
  "allocation-accounting",
  "ecology",
  "event",
  "export",
  "redaction",
  "federation"
] as const satisfies readonly GoldenFixtureDomain[];

const fixtureTimestamp = "2026-01-15T12:00:00.000Z" as const;
const fixtureNamespace = "canopy.golden.first-commons" as const;

const ref = (
  id: CanopyId,
  type: CanopyObjectType,
  sourceProject: SourceProject = "canopy"
): ObjectRef => ({
  id,
  type,
  namespace: fixtureNamespace,
  lifecycleStatus: "active",
  source: {
    sourceProject,
    sourceEntity: type,
    sourceId: id,
    sourceVersion: "golden-1",
    importedAt: fixtureTimestamp
  }
});

export const goldenFixtureRefs = {
  personMira: ref("person.mira", "person"),
  accountMiraLogin: ref("account.mira.login", "account"),
  organizationWatershed: ref("org.watershed.coop", "organization", "stewardship"),
  membershipMiraWatershed: ref("membership.mira.watershed", "organization"),
  roleWatershedSteward: ref("role.watershed.steward", "role"),
  mandateWatershedSteward: ref("mandate.watershed.steward.2026", "mandate"),
  commonsWatershed: ref("commons.riverbend", "commons", "stewardship"),
  resourceNorthPasture: ref("resource.north-pasture", "resource", "stewardship"),
  livingSystemRiverbend: ref("living-system.riverbend-creek", "living-system", "stewardship"),
  claimFlowNeed: ref("claim.riverbend-flow-need", "claim", "sensemaking"),
  evidenceFlowGauge: ref("evidence.flow-gauge-jan", "evidence", "sensemaking"),
  modelFlowForecast: ref("model.flow-forecast", "model", "sensemaking"),
  modelOutputFlowRisk: ref("model-output.flow-risk-jan", "evidence", "sensemaking"),
  issueUseRight: ref("issue.north-pasture-use-right", "issue"),
  proposalUseRight: ref("proposal.north-pasture-use-right", "proposal"),
  decisionUseRight: ref("decision.north-pasture-use-right", "decision"),
  useRightNorthPasture: ref("use-right.north-pasture.grazing", "use-right", "stewardship"),
  accessRuleUseRight: ref("access-rule.north-pasture.grazing", "policy"),
  ledgerAccountCommons: ref("ledger-account.commons.reserve", "ledger-account", "common-credit"),
  ledgerAccountStewardship: ref("ledger-account.stewardship.work", "ledger-account", "common-credit"),
  ledgerEntryAllocation: ref("ledger-entry.north-pasture.allocation", "ledger-entry", "common-credit"),
  allocationStewardship: ref("allocation.north-pasture.stewardship", "budget", "common-credit"),
  policyExport: ref("policy.export.first-commons", "policy"),
  dataStewardshipAgreement: ref("agreement.first-commons-data", "agreement"),
  exportEnvelope: ref("export.first-commons.v1", "source"),
  redactionSummary: ref("redaction.summary.first-commons.v1", "source"),
  federationRule: ref("federation-rule.first-commons", "policy"),
  localTerm: ref("local-term.acequia", "source", "icos"),
  canonicalMapping: ref("mapping.acequia.commons", "source", "icos"),
  originalSensitiveEvidenceEvent: ref("event.evidence.created.sensitive", "evidence"),
  redactionEvent: ref("event.system.redaction.applied", "evidence")
} as const;

const firstReplayableEventTypes = [
  "identity.person.created",
  "identity.account.linked",
  "identity.organization.created",
  "identity.membership.activated",
  "authority.role.assigned",
  "authority.mandate.granted",
  "claim.created",
  "evidence.created",
  "evidence.linked_to_claim",
  "model.output.generated",
  "governance.issue.created",
  "governance.proposal.created",
  "governance.decision.recorded",
  "stewardship.resource.created",
  "stewardship.use_right.granted",
  "accounting.ledger_entry.posted",
  "federation.export.created",
  "system.redaction.applied"
] as const;

export const firstReplayableGoldenFixtureObjects = [
  {
    ref: goldenFixtureRefs.personMira,
    domain: "identity",
    objectType: "person",
    title: "Mira Sol person record",
    linkedRefs: [
      goldenFixtureRefs.accountMiraLogin,
      goldenFixtureRefs.membershipMiraWatershed
    ],
    invariantCaseIds: ["invariant.identity-account-separation"],
    attributes: {
      displayName: "Mira Sol",
      status: "active",
      accountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    }
  },
  {
    ref: goldenFixtureRefs.accountMiraLogin,
    domain: "identity",
    objectType: "account",
    title: "Mira login account",
    linkedRefs: [goldenFixtureRefs.personMira],
    invariantCaseIds: ["invariant.identity-account-separation"],
    attributes: {
      kind: "login",
      handle: "mira@example.test",
      mayActAsPerson: false
    }
  },
  {
    ref: goldenFixtureRefs.organizationWatershed,
    domain: "authority",
    objectType: "organization",
    title: "Riverbend Watershed Cooperative",
    linkedRefs: [
      goldenFixtureRefs.membershipMiraWatershed,
      goldenFixtureRefs.roleWatershedSteward
    ],
    invariantCaseIds: ["invariant.membership-authority-separation"],
    attributes: {
      kind: "commons",
      membershipDoesNotGrantBindingAuthority: true
    }
  },
  {
    ref: goldenFixtureRefs.membershipMiraWatershed,
    domain: "authority",
    objectType: "membership",
    title: "Mira membership in watershed cooperative",
    linkedRefs: [
      goldenFixtureRefs.personMira,
      goldenFixtureRefs.organizationWatershed
    ],
    invariantCaseIds: ["invariant.membership-authority-separation"],
    attributes: {
      status: "active",
      authorityRefs: []
    }
  },
  {
    ref: goldenFixtureRefs.roleWatershedSteward,
    domain: "authority",
    objectType: "role",
    title: "Watershed steward role",
    linkedRefs: [goldenFixtureRefs.mandateWatershedSteward],
    invariantCaseIds: ["invariant.membership-authority-separation"],
    attributes: {
      possiblePermissionKeys: ["stewardship.use_right.grant"],
      bindingAuthorityRequiresMandate: true
    }
  },
  {
    ref: goldenFixtureRefs.mandateWatershedSteward,
    domain: "authority",
    objectType: "mandate",
    title: "2026 watershed stewardship mandate",
    linkedRefs: [
      goldenFixtureRefs.roleWatershedSteward,
      goldenFixtureRefs.decisionUseRight
    ],
    invariantCaseIds: ["invariant.membership-authority-separation"],
    attributes: {
      kind: "steward",
      scopeCapability: "stewardship",
      termEndsAt: "2026-12-31T23:59:59.000Z"
    }
  },
  {
    ref: goldenFixtureRefs.commonsWatershed,
    domain: "stewardship",
    objectType: "commons",
    title: "Riverbend watershed commons",
    linkedRefs: [
      goldenFixtureRefs.organizationWatershed,
      goldenFixtureRefs.resourceNorthPasture,
      goldenFixtureRefs.livingSystemRiverbend
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      stewardshipScope: "watershed",
      governedByRefIds: [goldenFixtureRefs.organizationWatershed.id]
    }
  },
  {
    ref: goldenFixtureRefs.resourceNorthPasture,
    domain: "stewardship",
    objectType: "resource",
    title: "North pasture resource",
    linkedRefs: [
      goldenFixtureRefs.commonsWatershed,
      goldenFixtureRefs.useRightNorthPasture
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      resourceKind: "pasture",
      managedAsCommons: true
    }
  },
  {
    ref: goldenFixtureRefs.useRightNorthPasture,
    domain: "stewardship",
    objectType: "use-right",
    title: "Scoped grazing use right",
    linkedRefs: [
      goldenFixtureRefs.personMira,
      goldenFixtureRefs.resourceNorthPasture,
      goldenFixtureRefs.mandateWatershedSteward,
      goldenFixtureRefs.accessRuleUseRight
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      holderRefId: goldenFixtureRefs.personMira.id,
      resourceRefId: goldenFixtureRefs.resourceNorthPasture.id,
      permissions: ["graze.light"],
      revocable: true,
      reviewPathRefId: goldenFixtureRefs.issueUseRight.id,
      authorityRefIds: [goldenFixtureRefs.mandateWatershedSteward.id]
    }
  },
  {
    ref: goldenFixtureRefs.ledgerAccountCommons,
    domain: "allocation-accounting",
    objectType: "ledger-account",
    title: "Commons reserve ledger account",
    linkedRefs: [goldenFixtureRefs.ledgerEntryAllocation],
    invariantCaseIds: ["invariant.ledger-account-auth-account-separation"],
    attributes: {
      accountKind: "ledger",
      acceptsAuthentication: false
    }
  },
  {
    ref: goldenFixtureRefs.ledgerEntryAllocation,
    domain: "allocation-accounting",
    objectType: "ledger-entry",
    title: "Stewardship allocation ledger entry",
    linkedRefs: [
      goldenFixtureRefs.ledgerAccountCommons,
      goldenFixtureRefs.ledgerAccountStewardship,
      goldenFixtureRefs.allocationStewardship
    ],
    invariantCaseIds: ["invariant.ledger-account-auth-account-separation"],
    attributes: {
      lineAccountRefIds: [
        goldenFixtureRefs.ledgerAccountCommons.id,
        goldenFixtureRefs.ledgerAccountStewardship.id
      ],
      forbiddenAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    }
  },
  {
    ref: goldenFixtureRefs.claimFlowNeed,
    domain: "claims-evidence",
    objectType: "claim",
    title: "Riverbend base flow need claim",
    linkedRefs: [
      goldenFixtureRefs.evidenceFlowGauge,
      goldenFixtureRefs.livingSystemRiverbend
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      claimStatus: "review_required",
      acceptedWithoutHumanReview: false
    }
  },
  {
    ref: goldenFixtureRefs.modelOutputFlowRisk,
    domain: "claims-evidence",
    objectType: "model-output",
    title: "Machine flow risk output",
    linkedRefs: [
      goldenFixtureRefs.modelFlowForecast,
      goldenFixtureRefs.claimFlowNeed
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      generatedBy: "ai_assistant",
      canAuthorizeBindingAction: false
    }
  },
  {
    ref: goldenFixtureRefs.decisionUseRight,
    domain: "governance",
    objectType: "decision",
    title: "Decision granting scoped use right",
    linkedRefs: [
      goldenFixtureRefs.proposalUseRight,
      goldenFixtureRefs.claimFlowNeed,
      goldenFixtureRefs.evidenceFlowGauge,
      goldenFixtureRefs.mandateWatershedSteward
    ],
    invariantCaseIds: [
      "invariant.membership-authority-separation",
      "invariant.ai-non-authority"
    ],
    attributes: {
      decidedByRefIds: [goldenFixtureRefs.mandateWatershedSteward.id],
      machineOutputAuthorityRefIds: []
    }
  },
  {
    ref: goldenFixtureRefs.livingSystemRiverbend,
    domain: "ecology",
    objectType: "living-system",
    title: "Riverbend Creek living system",
    linkedRefs: [
      goldenFixtureRefs.claimFlowNeed,
      goldenFixtureRefs.modelOutputFlowRisk
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      guardianReviewRequiredForThresholdChanges: true
    }
  },
  {
    ref: goldenFixtureRefs.originalSensitiveEvidenceEvent,
    domain: "event",
    objectType: "evidence",
    title: "Original sensitive evidence event remains append-only",
    linkedRefs: [goldenFixtureRefs.redactionEvent],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      appendOnly: true,
      redactedByNewEventRefId: goldenFixtureRefs.redactionEvent.id
    }
  },
  {
    ref: goldenFixtureRefs.policyExport,
    domain: "export",
    objectType: "policy",
    title: "First commons export policy",
    linkedRefs: [
      goldenFixtureRefs.exportEnvelope,
      goldenFixtureRefs.dataStewardshipAgreement,
      goldenFixtureRefs.federationRule
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      allowsFederatedExport: true,
      requiresRedactionContinuity: true
    }
  },
  {
    ref: goldenFixtureRefs.exportEnvelope,
    domain: "export",
    objectType: "export-envelope",
    title: "First commons export envelope",
    linkedRefs: [
      goldenFixtureRefs.federationRule,
      goldenFixtureRefs.dataStewardshipAgreement,
      goldenFixtureRefs.canonicalMapping
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      format: "jsonl",
      includesRedactionSummary: true
    }
  },
  {
    ref: goldenFixtureRefs.redactionSummary,
    domain: "redaction",
    objectType: "audit",
    title: "Redaction continuity summary",
    linkedRefs: [
      goldenFixtureRefs.originalSensitiveEvidenceEvent,
      goldenFixtureRefs.redactionEvent
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      originalEventPreserved: true,
      stubEventCreated: true
    }
  },
  {
    ref: goldenFixtureRefs.federationRule,
    domain: "federation",
    objectType: "federation-rule",
    title: "First commons federation rule",
    linkedRefs: [
      goldenFixtureRefs.exportEnvelope,
      goldenFixtureRefs.localTerm,
      goldenFixtureRefs.canonicalMapping
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      conflictPolicy: "preserve_both",
      requiresLocalMapping: true,
      requiresRedactionReview: true
    }
  },
  {
    ref: goldenFixtureRefs.localTerm,
    domain: "federation",
    objectType: "local-term",
    title: "Acequia local term",
    linkedRefs: [
      goldenFixtureRefs.federationRule,
      goldenFixtureRefs.canonicalMapping
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      label: "acequia",
      disposition: "alias",
      canonicalType: "commons"
    }
  },
  {
    ref: goldenFixtureRefs.canonicalMapping,
    domain: "federation",
    objectType: "canonical-mapping",
    title: "Acequia to commons canonical mapping",
    linkedRefs: [
      goldenFixtureRefs.localTerm,
      goldenFixtureRefs.commonsWatershed
    ],
    invariantCaseIds: ["invariant.event-append-rules"],
    attributes: {
      localLabel: "acequia",
      canonicalRefId: goldenFixtureRefs.commonsWatershed.id,
      confidence: 0.94
    }
  }
] as const satisfies readonly GoldenFixtureObject[];

export const firstReplayableGoldenFixtureEvents = [
  {
    id: "event.identity.person.created.mira",
    type: "identity.person.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.personMira,
    relatedRefs: [],
    authorityRefs: [],
    sourceCapability: "identity-authority",
    payload: { displayName: "Mira Sol" },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "locally_verified"
  },
  {
    id: "event.identity.account.linked.mira",
    type: "identity.account.linked",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.accountMiraLogin,
    relatedRefs: [goldenFixtureRefs.personMira],
    authorityRefs: [],
    sourceCapability: "identity-authority",
    payload: { accountKind: "login", mayActAsPerson: false },
    schemaVersion: 1,
    visibility: "private",
    dataState: "locally_verified"
  },
  {
    id: "event.identity.organization.created.watershed",
    type: "identity.organization.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.organizationWatershed,
    relatedRefs: [goldenFixtureRefs.commonsWatershed],
    authorityRefs: [],
    sourceCapability: "identity-authority",
    payload: { kind: "commons" },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.identity.membership.activated.mira",
    type: "identity.membership.activated",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.membershipMiraWatershed,
    relatedRefs: [
      goldenFixtureRefs.personMira,
      goldenFixtureRefs.organizationWatershed
    ],
    authorityRefs: [],
    sourceCapability: "identity-authority",
    payload: { grantsBindingAuthority: false },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "locally_verified"
  },
  {
    id: "event.authority.role.assigned.watershed-steward",
    type: "authority.role.assigned",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.roleWatershedSteward,
    relatedRefs: [goldenFixtureRefs.membershipMiraWatershed],
    authorityRefs: [goldenFixtureRefs.mandateWatershedSteward],
    sourceCapability: "identity-authority",
    payload: { permissionKeys: ["stewardship.use_right.grant"] },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified"
  },
  {
    id: "event.authority.mandate.granted.watershed-steward",
    type: "authority.mandate.granted",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.mandateWatershedSteward,
    relatedRefs: [
      goldenFixtureRefs.roleWatershedSteward,
      goldenFixtureRefs.organizationWatershed
    ],
    authorityRefs: [goldenFixtureRefs.decisionUseRight],
    sourceCapability: "identity-authority",
    payload: { kind: "steward", revocable: true },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified"
  },
  {
    id: "event.claim.created.flow-need",
    type: "claim.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.claimFlowNeed,
    relatedRefs: [goldenFixtureRefs.livingSystemRiverbend],
    authorityRefs: [],
    sourceCapability: "claims-evidence",
    payload: { status: "review_required" },
    schemaVersion: 1,
    visibility: "public",
    dataState: "testimony_derived"
  },
  {
    id: "event.evidence.created.flow-gauge",
    type: "evidence.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.evidenceFlowGauge,
    relatedRefs: [goldenFixtureRefs.claimFlowNeed],
    authorityRefs: [],
    sourceCapability: "claims-evidence",
    payload: { evidenceKind: "gauge_reading" },
    schemaVersion: 1,
    visibility: "public",
    dataState: "sensor_derived"
  },
  {
    id: "event.evidence.linked_to_claim.flow-gauge",
    type: "evidence.linked_to_claim",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.evidenceFlowGauge,
    relatedRefs: [goldenFixtureRefs.claimFlowNeed],
    authorityRefs: [],
    sourceCapability: "claims-evidence",
    payload: { claimRefId: goldenFixtureRefs.claimFlowNeed.id },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.model.output.generated.flow-risk",
    type: "model.output.generated",
    occurredAt: fixtureTimestamp,
    systemActor: "ai_assistant",
    objectRef: goldenFixtureRefs.modelOutputFlowRisk,
    relatedRefs: [
      goldenFixtureRefs.modelFlowForecast,
      goldenFixtureRefs.claimFlowNeed
    ],
    authorityRefs: [],
    sourceCapability: "ecological-modeling",
    payload: { canAuthorizeBindingAction: false },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "machine_inferred"
  },
  {
    id: "event.governance.issue.created.use-right",
    type: "governance.issue.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.issueUseRight,
    relatedRefs: [
      goldenFixtureRefs.resourceNorthPasture,
      goldenFixtureRefs.claimFlowNeed
    ],
    authorityRefs: [],
    sourceCapability: "governance",
    payload: { issueKind: "use_right_review" },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.governance.proposal.created.use-right",
    type: "governance.proposal.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.proposalUseRight,
    relatedRefs: [
      goldenFixtureRefs.issueUseRight,
      goldenFixtureRefs.resourceNorthPasture
    ],
    authorityRefs: [],
    sourceCapability: "governance",
    payload: { proposedUseRightRefId: goldenFixtureRefs.useRightNorthPasture.id },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.governance.decision.recorded.use-right",
    type: "governance.decision.recorded",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.decisionUseRight,
    relatedRefs: [
      goldenFixtureRefs.proposalUseRight,
      goldenFixtureRefs.claimFlowNeed,
      goldenFixtureRefs.evidenceFlowGauge
    ],
    authorityRefs: [goldenFixtureRefs.mandateWatershedSteward],
    sourceCapability: "governance",
    payload: {
      machineOutputAuthorityRefIds: [],
      unresolvedObjectionRefIds: []
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "institutionally_certified"
  },
  {
    id: "event.stewardship.resource.created.north-pasture",
    type: "stewardship.resource.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.resourceNorthPasture,
    relatedRefs: [goldenFixtureRefs.commonsWatershed],
    authorityRefs: [goldenFixtureRefs.mandateWatershedSteward],
    sourceCapability: "stewardship",
    payload: { managedAsCommons: true },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.stewardship.use-right.granted.north-pasture",
    type: "stewardship.use_right.granted",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.useRightNorthPasture,
    relatedRefs: [
      goldenFixtureRefs.personMira,
      goldenFixtureRefs.resourceNorthPasture,
      goldenFixtureRefs.accessRuleUseRight
    ],
    authorityRefs: [
      goldenFixtureRefs.mandateWatershedSteward,
      goldenFixtureRefs.decisionUseRight
    ],
    sourceCapability: "stewardship",
    payload: {
      revocable: true,
      reviewPathRefId: goldenFixtureRefs.issueUseRight.id,
      permissions: ["graze.light"]
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "institutionally_certified"
  },
  {
    id: "event.accounting.ledger-entry.posted.allocation",
    type: "accounting.ledger_entry.posted",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.ledgerEntryAllocation,
    relatedRefs: [
      goldenFixtureRefs.ledgerAccountCommons,
      goldenFixtureRefs.ledgerAccountStewardship,
      goldenFixtureRefs.allocationStewardship
    ],
    authorityRefs: [goldenFixtureRefs.decisionUseRight],
    sourceCapability: "allocation-accounting",
    payload: {
      lineAccountRefIds: [
        goldenFixtureRefs.ledgerAccountCommons.id,
        goldenFixtureRefs.ledgerAccountStewardship.id
      ],
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified"
  },
  {
    id: "event.federation.export.created.first-commons",
    type: "federation.export.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.exportEnvelope,
    relatedRefs: [
      goldenFixtureRefs.federationRule,
      goldenFixtureRefs.dataStewardshipAgreement,
      goldenFixtureRefs.canonicalMapping
    ],
    authorityRefs: [goldenFixtureRefs.policyExport],
    sourceCapability: "federation",
    payload: {
      format: "jsonl",
      includes: ["person", "claim", "evidence", "decision", "use-right"]
    },
    schemaVersion: 1,
    visibility: "federation",
    dataState: "locally_verified",
    contentHash: "sha256:first-commons-export"
  },
  {
    id: "event.evidence.created.sensitive",
    type: "evidence.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.originalSensitiveEvidenceEvent,
    relatedRefs: [
      goldenFixtureRefs.evidenceFlowGauge,
      goldenFixtureRefs.livingSystemRiverbend
    ],
    authorityRefs: [],
    sourceCapability: "claims-evidence",
    payload: {
      evidenceKind: "sensitive_location_note",
      preciseLocation: "redacted in export"
    },
    schemaVersion: 1,
    visibility: "guardian_restricted",
    dataState: "sensitive",
    contentHash: "sha256:sensitive-evidence-before"
  },
  {
    id: "event.system.redaction.applied.sensitive-evidence",
    type: "system.redaction.applied",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.redactionSummary,
    relatedRefs: [
      goldenFixtureRefs.originalSensitiveEvidenceEvent,
      goldenFixtureRefs.redactionEvent
    ],
    authorityRefs: [goldenFixtureRefs.policyExport],
    sourceCapability: "civic-memory",
    payload: {
      originalEventPreserved: true,
      removedPayloadKeys: ["preciseLocation"]
    },
    schemaVersion: 1,
    visibility: "federation",
    dataState: "sensitive",
    redaction: {
      isRedactedStub: false,
      originalEventId: "event.evidence.created.sensitive",
      redactionEventId: "event.system.redaction.applied.sensitive-evidence",
      redactedAt: fixtureTimestamp,
      reason: "living_system_protection",
      preservedFields: ["id", "type", "occurredAt", "objectRef"],
      removedPayloadKeys: ["preciseLocation"],
      originalContentHash: "sha256:sensitive-evidence-before",
      redactedContentHash: "sha256:sensitive-evidence-after"
    }
  }
] as const satisfies readonly CanopyEvent[];

export const firstReplayableGoldenFixtureManifest = {
  id: "golden.first-replayable-contract-set",
  name: "First replayable Canopy contract set",
  description:
    "Contract-level replay fixture covering identity, authority, evidence, governance, stewardship, accounting, civic memory, export, redaction, and federation boundaries.",
  schemaVersion: 1,
  fixtureVersion: "2026.01.first",
  createdAt: fixtureTimestamp,
  sourceProjects: [
    "canopy",
    "common-credit",
    "icos",
    "sensemaking",
    "stewardship"
  ],
  domains: requiredGoldenFixtureDomains,
  objectSets: [
    {
      domain: "identity",
      objectTypes: ["person", "account"],
      objectRefs: [
        goldenFixtureRefs.personMira,
        goldenFixtureRefs.accountMiraLogin
      ],
      eventTypes: ["identity.person.created", "identity.account.linked"],
      fixtureFiles: [
        {
          path: "golden/first-commons/identity.json",
          format: "json",
          contentHash: "sha256:first-commons-identity",
          description: "Person and login account records kept distinct."
        }
      ]
    },
    {
      domain: "authority",
      objectTypes: ["organization", "membership", "role", "mandate"],
      objectRefs: [
        goldenFixtureRefs.organizationWatershed,
        goldenFixtureRefs.membershipMiraWatershed,
        goldenFixtureRefs.roleWatershedSteward,
        goldenFixtureRefs.mandateWatershedSteward
      ],
      eventTypes: [
        "identity.organization.created",
        "identity.membership.activated",
        "authority.role.assigned",
        "authority.mandate.granted"
      ],
      fixtureFiles: [
        {
          path: "golden/first-commons/authority.json",
          format: "json",
          contentHash: "sha256:first-commons-authority"
        }
      ]
    },
    {
      domain: "claims-evidence",
      objectTypes: ["claim", "evidence", "model-output"],
      objectRefs: [
        goldenFixtureRefs.claimFlowNeed,
        goldenFixtureRefs.evidenceFlowGauge,
        goldenFixtureRefs.modelOutputFlowRisk
      ],
      eventTypes: [
        "claim.created",
        "evidence.created",
        "evidence.linked_to_claim",
        "model.output.generated"
      ],
      fixtureFiles: [
        {
          path: "golden/first-commons/claims-evidence.json",
          format: "json",
          contentHash: "sha256:first-commons-claims-evidence"
        }
      ]
    },
    {
      domain: "governance",
      objectTypes: ["issue", "proposal", "decision"],
      objectRefs: [
        goldenFixtureRefs.issueUseRight,
        goldenFixtureRefs.proposalUseRight,
        goldenFixtureRefs.decisionUseRight
      ],
      eventTypes: [
        "governance.issue.created",
        "governance.proposal.created",
        "governance.decision.recorded"
      ],
      fixtureFiles: [
        {
          path: "golden/first-commons/governance.json",
          format: "json",
          contentHash: "sha256:first-commons-governance"
        }
      ]
    },
    {
      domain: "stewardship",
      objectTypes: ["commons", "resource", "use-right", "access-rule"],
      objectRefs: [
        goldenFixtureRefs.commonsWatershed,
        goldenFixtureRefs.resourceNorthPasture,
        goldenFixtureRefs.useRightNorthPasture,
        goldenFixtureRefs.accessRuleUseRight
      ],
      eventTypes: [
        "stewardship.resource.created",
        "stewardship.use_right.granted"
      ],
      fixtureFiles: [
        {
          path: "golden/first-commons/stewardship.json",
          format: "json",
          contentHash: "sha256:first-commons-stewardship"
        }
      ]
    },
    {
      domain: "allocation-accounting",
      objectTypes: ["allocation", "ledger-account", "ledger-entry"],
      objectRefs: [
        goldenFixtureRefs.allocationStewardship,
        goldenFixtureRefs.ledgerAccountCommons,
        goldenFixtureRefs.ledgerAccountStewardship,
        goldenFixtureRefs.ledgerEntryAllocation
      ],
      eventTypes: ["accounting.ledger_entry.posted"],
      fixtureFiles: [
        {
          path: "golden/first-commons/allocation-accounting.json",
          format: "json",
          contentHash: "sha256:first-commons-allocation-accounting"
        }
      ]
    },
    {
      domain: "ecology",
      objectTypes: ["living-system", "model"],
      objectRefs: [
        goldenFixtureRefs.livingSystemRiverbend,
        goldenFixtureRefs.modelFlowForecast
      ],
      eventTypes: ["model.output.generated"],
      fixtureFiles: [
        {
          path: "golden/first-commons/ecology.json",
          format: "json",
          contentHash: "sha256:first-commons-ecology"
        }
      ]
    },
    {
      domain: "event",
      objectTypes: ["evidence", "audit"],
      objectRefs: [
        goldenFixtureRefs.originalSensitiveEvidenceEvent,
        goldenFixtureRefs.redactionEvent
      ],
      eventTypes: ["system.redaction.applied"],
      fixtureFiles: [
        {
          path: "golden/first-commons/events.jsonl",
          format: "jsonl",
          contentHash: "sha256:first-commons-events"
        }
      ]
    },
    {
      domain: "export",
      objectTypes: ["policy", "export-envelope", "data-stewardship-agreement"],
      objectRefs: [
        goldenFixtureRefs.policyExport,
        goldenFixtureRefs.exportEnvelope,
        goldenFixtureRefs.dataStewardshipAgreement
      ],
      eventTypes: ["federation.export.created"],
      fixtureFiles: [
        {
          path: "golden/first-commons/export-envelope.json",
          format: "json",
          contentHash: "sha256:first-commons-export-envelope"
        }
      ]
    },
    {
      domain: "redaction",
      objectTypes: ["audit"],
      objectRefs: [goldenFixtureRefs.redactionSummary],
      eventTypes: ["system.redaction.applied"],
      fixtureFiles: [
        {
          path: "golden/first-commons/redaction-summary.json",
          format: "json",
          contentHash: "sha256:first-commons-redaction-summary"
        }
      ]
    },
    {
      domain: "federation",
      objectTypes: ["federation-rule", "local-term", "canonical-mapping"],
      objectRefs: [
        goldenFixtureRefs.federationRule,
        goldenFixtureRefs.localTerm,
        goldenFixtureRefs.canonicalMapping
      ],
      eventTypes: ["federation.export.created"],
      fixtureFiles: [
        {
          path: "golden/first-commons/federation.json",
          format: "json",
          contentHash: "sha256:first-commons-federation"
        }
      ]
    }
  ],
  objects: firstReplayableGoldenFixtureObjects,
  events: firstReplayableGoldenFixtureEvents,
  expectations: [
    {
      id: "expectation.first-replay.identity",
      title: "Identity replay keeps person and login account distinct",
      domain: "identity",
      invariantCaseIds: ["invariant.identity-account-separation"],
      requiredObjectRefs: [
        goldenFixtureRefs.personMira,
        goldenFixtureRefs.accountMiraLogin
      ],
      requiredEventTypes: ["identity.person.created", "identity.account.linked"]
    },
    {
      id: "expectation.first-replay.authority",
      title: "Authority replay requires mandate beyond membership",
      domain: "authority",
      invariantCaseIds: ["invariant.membership-authority-separation"],
      requiredObjectRefs: [
        goldenFixtureRefs.membershipMiraWatershed,
        goldenFixtureRefs.mandateWatershedSteward
      ],
      requiredEventTypes: [
        "identity.membership.activated",
        "authority.mandate.granted"
      ]
    },
    {
      id: "expectation.first-replay.accounting",
      title: "Accounting replay uses ledger accounts only",
      domain: "allocation-accounting",
      invariantCaseIds: ["invariant.ledger-account-auth-account-separation"],
      requiredObjectRefs: [
        goldenFixtureRefs.ledgerAccountCommons,
        goldenFixtureRefs.ledgerAccountStewardship,
        goldenFixtureRefs.ledgerEntryAllocation
      ],
      requiredEventTypes: ["accounting.ledger_entry.posted"]
    },
    {
      id: "expectation.first-replay.use-right",
      title: "Use right replay includes scope, authority, review, and term",
      domain: "stewardship",
      invariantCaseIds: ["invariant.use-right-scope"],
      requiredObjectRefs: [
        goldenFixtureRefs.personMira,
        goldenFixtureRefs.resourceNorthPasture,
        goldenFixtureRefs.useRightNorthPasture,
        goldenFixtureRefs.mandateWatershedSteward
      ],
      requiredEventTypes: ["stewardship.use_right.granted"]
    },
    {
      id: "expectation.first-replay.append-only",
      title: "Event replay preserves original events through redaction",
      domain: "event",
      invariantCaseIds: ["invariant.event-append-rules"],
      requiredObjectRefs: [
        goldenFixtureRefs.originalSensitiveEvidenceEvent,
        goldenFixtureRefs.redactionEvent,
        goldenFixtureRefs.redactionSummary
      ],
      requiredEventTypes: ["system.redaction.applied"]
    },
    {
      id: "expectation.first-replay.ai-non-authority",
      title: "AI output replay remains evidence and never authority",
      domain: "claims-evidence",
      invariantCaseIds: ["invariant.ai-non-authority"],
      requiredObjectRefs: [
        goldenFixtureRefs.modelOutputFlowRisk,
        goldenFixtureRefs.claimFlowNeed,
        goldenFixtureRefs.decisionUseRight
      ],
      requiredEventTypes: [
        "model.output.generated",
        "governance.decision.recorded"
      ]
    }
  ],
  antiCollapseExpectations: [
    {
      id: "anti-collapse.person-vs-account",
      invariantCaseId: "invariant.identity-account-separation",
      title: "Login account cannot stand in for person",
      forbiddenCollapseRefs: [
        goldenFixtureRefs.personMira,
        goldenFixtureRefs.accountMiraLogin
      ],
      failureCode: "IDENTITY_ACCOUNT_COLLAPSED",
      deniedEventTypes: ["governance.decision.recorded"],
      requiredExplanation: "authentication account alone is not civic actor identity"
    },
    {
      id: "anti-collapse.membership-vs-authority",
      invariantCaseId: "invariant.membership-authority-separation",
      title: "Membership cannot stand in for mandate",
      forbiddenCollapseRefs: [
        goldenFixtureRefs.membershipMiraWatershed,
        goldenFixtureRefs.mandateWatershedSteward
      ],
      failureCode: "MEMBERSHIP_TREATED_AS_AUTHORITY",
      deniedEventTypes: [
        "governance.decision.recorded",
        "stewardship.use_right.granted"
      ],
      requiredExplanation: "membership grants belonging, not binding authority"
    },
    {
      id: "anti-collapse.ledger-vs-login-account",
      invariantCaseId: "invariant.ledger-account-auth-account-separation",
      title: "Ledger account cannot be a login account",
      forbiddenCollapseRefs: [
        goldenFixtureRefs.ledgerAccountCommons,
        goldenFixtureRefs.accountMiraLogin
      ],
      failureCode: "LEDGER_ACCOUNT_COLLAPSED_WITH_AUTH_ACCOUNT",
      deniedEventTypes: ["accounting.ledger_entry.posted"],
      requiredExplanation: "ledger entries post only to ledger account refs"
    },
    {
      id: "anti-collapse.ai-output-vs-authority",
      invariantCaseId: "invariant.ai-non-authority",
      title: "Model output cannot stand in for authority",
      forbiddenCollapseRefs: [
        goldenFixtureRefs.modelOutputFlowRisk,
        goldenFixtureRefs.mandateWatershedSteward
      ],
      failureCode: "AI_TREATED_AS_AUTHORITY",
      deniedEventTypes: [
        "governance.decision.recorded",
        "allocation.created",
        "stewardship.use_right.granted"
      ],
      requiredExplanation: "machine output may support evidence, not authority"
    }
  ],
  exportEnvelopeRefs: [goldenFixtureRefs.exportEnvelope],
  redactionEventRefs: [goldenFixtureRefs.redactionEvent],
  federationRuleRefs: [goldenFixtureRefs.federationRule],
  localTermRefs: [goldenFixtureRefs.localTerm],
  canonicalMappingRefs: [goldenFixtureRefs.canonicalMapping],
  contentHash: "sha256:first-replayable-contract-set"
} as const satisfies GoldenFixtureManifest;

export const firstReplayableGoldenFixtureManifests = [
  firstReplayableGoldenFixtureManifest
] as const satisfies readonly GoldenFixtureManifest[];

export const requiredFirstReplayableEventTypes = firstReplayableEventTypes;
