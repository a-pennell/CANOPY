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
  redactionEvent: ref("event.system.redaction.applied", "evidence"),
  personKai: ref("person.kai", "person", "common-credit"),
  organizationFoodHub: ref("org.riverbend-food-hub", "organization", "common-credit"),
  ledgerAccountFoodHub: ref("ledger-account.food-hub.reserve", "ledger-account", "common-credit"),
  ledgerEntryFoodHubDistribution: ref("ledger-entry.food-hub.distribution", "ledger-entry", "common-credit"),
  ledgerEntryFoodHubCorrection: ref("ledger-entry.food-hub.correction", "ledger-entry", "common-credit"),
  agreementFoodHubDistribution: ref("agreement.food-hub.distribution", "agreement", "common-credit"),
  issueIrrigationWindow: ref("issue.irrigation-window", "issue", "icos"),
  proposalIrrigationWindow: ref("proposal.irrigation-window", "proposal", "icos"),
  decisionIrrigationWindow: ref("decision.irrigation-window", "decision", "icos"),
  policyDroughtProtocol: ref("policy.drought-protocol", "policy", "icos"),
  sourceRiparianSurvey: ref("source.riparian-survey", "source", "sensemaking"),
  claimRiparianStress: ref("claim.riparian-stress", "claim", "sensemaking"),
  evidenceRiparianSurvey: ref("evidence.riparian-survey", "evidence", "sensemaking"),
  modelRiparianScenario: ref("model.riparian-scenario", "model", "sensemaking"),
  modelOutputRiparianRisk: ref("model-output.riparian-risk", "evidence", "sensemaking"),
  placeSouthCanal: ref("place.south-canal", "place", "stewardship"),
  resourceIrrigationGate: ref("resource.irrigation-gate", "resource", "stewardship"),
  livingSystemRiparianCorridor: ref("living-system.riparian-corridor", "living-system", "stewardship"),
  useRightIrrigationGate: ref("use-right.irrigation-gate.window", "use-right", "stewardship"),
  guardianReviewRiparian: ref("guardian-review.riparian-window", "guardian-review", "stewardship"),
  taskCanalCheck: ref("task.south-canal-check", "task", "stewardship")
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
  "governance.policy.versioned",
  "stewardship.resource.created",
  "stewardship.use_right.granted",
  "stewardship.task.completed",
  "ecology.living_system.created",
  "ecology.guardian.review_requested",
  "allocation.consent.recorded",
  "accounting.ledger_entry.posted",
  "accounting.ledger_entry.reversed",
  "evidence.source.ingested",
  "claim.contested",
  "model.created",
  "federation.export.created",
  "federation.import.received",
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
  },
  {
    ref: goldenFixtureRefs.personKai,
    domain: "identity",
    objectType: "person",
    title: "Kai Chen CommonCredit member",
    linkedRefs: [
      goldenFixtureRefs.organizationFoodHub,
      goldenFixtureRefs.ledgerAccountFoodHub
    ],
    invariantCaseIds: [
      "invariant.identity-account-separation",
      "invariant.ledger-account-auth-account-separation"
    ],
    attributes: {
      displayName: "Kai Chen",
      sourceMemberId: "cc-member-kai",
      ledgerAccountsAreNotLoginAccounts: true
    }
  },
  {
    ref: goldenFixtureRefs.organizationFoodHub,
    domain: "authority",
    objectType: "organization",
    title: "Riverbend Food Hub",
    linkedRefs: [
      goldenFixtureRefs.personKai,
      goldenFixtureRefs.agreementFoodHubDistribution,
      goldenFixtureRefs.policyDroughtProtocol
    ],
    invariantCaseIds: ["invariant.membership-authority-separation"],
    attributes: {
      kind: "food_hub",
      importedFrom: "common-credit",
      bindingAuthorityRequiresPolicyOrDecision: true
    }
  },
  {
    ref: goldenFixtureRefs.agreementFoodHubDistribution,
    domain: "allocation-accounting",
    objectType: "agreement",
    title: "Food hub distribution agreement",
    linkedRefs: [
      goldenFixtureRefs.organizationFoodHub,
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.ledgerEntryFoodHubDistribution
    ],
    invariantCaseIds: [
      "invariant.ledger-account-auth-account-separation",
      "invariant.event-append-rules"
    ],
    attributes: {
      authorizesLedgerEntryRefIds: [
        goldenFixtureRefs.ledgerEntryFoodHubDistribution.id
      ],
      consentRecorded: true,
      provenancePreserved: true
    }
  },
  {
    ref: goldenFixtureRefs.ledgerAccountFoodHub,
    domain: "allocation-accounting",
    objectType: "ledger-account",
    title: "Food hub reserve ledger account",
    linkedRefs: [
      goldenFixtureRefs.organizationFoodHub,
      goldenFixtureRefs.ledgerEntryFoodHubDistribution,
      goldenFixtureRefs.ledgerEntryFoodHubCorrection
    ],
    invariantCaseIds: ["invariant.ledger-account-auth-account-separation"],
    attributes: {
      accountKind: "ledger",
      sourceAccountId: "cc-account-food-hub-reserve",
      acceptsAuthentication: false
    }
  },
  {
    ref: goldenFixtureRefs.ledgerEntryFoodHubDistribution,
    domain: "allocation-accounting",
    objectType: "ledger-entry",
    title: "Food hub distribution credit entry",
    linkedRefs: [
      goldenFixtureRefs.ledgerAccountFoodHub,
      goldenFixtureRefs.ledgerAccountCommons,
      goldenFixtureRefs.agreementFoodHubDistribution,
      goldenFixtureRefs.useRightIrrigationGate
    ],
    invariantCaseIds: ["invariant.ledger-account-auth-account-separation"],
    attributes: {
      amount: 320,
      unit: "COMMON_CREDIT",
      correctedByEventRefId: goldenFixtureRefs.ledgerEntryFoodHubCorrection.id,
      forbiddenAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    }
  },
  {
    ref: goldenFixtureRefs.ledgerEntryFoodHubCorrection,
    domain: "allocation-accounting",
    objectType: "ledger-entry",
    title: "Append-only correction for food hub distribution entry",
    linkedRefs: [
      goldenFixtureRefs.ledgerEntryFoodHubDistribution,
      goldenFixtureRefs.ledgerAccountFoodHub,
      goldenFixtureRefs.agreementFoodHubDistribution
    ],
    invariantCaseIds: [
      "invariant.ledger-account-auth-account-separation",
      "invariant.event-append-rules"
    ],
    attributes: {
      reversesEntryRefId: goldenFixtureRefs.ledgerEntryFoodHubDistribution.id,
      appendOnlyCorrection: true
    }
  },
  {
    ref: goldenFixtureRefs.policyDroughtProtocol,
    domain: "governance",
    objectType: "policy-version",
    title: "Drought response protocol v2",
    linkedRefs: [
      goldenFixtureRefs.issueIrrigationWindow,
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    invariantCaseIds: [
      "invariant.membership-authority-separation",
      "invariant.use-right-scope"
    ],
    attributes: {
      policyVersion: "2",
      requiresGuardianReviewForRiparianWindows: true
    }
  },
  {
    ref: goldenFixtureRefs.issueIrrigationWindow,
    domain: "governance",
    objectType: "issue",
    title: "Irrigation timing under riparian stress",
    linkedRefs: [
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.resourceIrrigationGate
    ],
    invariantCaseIds: [
      "invariant.membership-authority-separation",
      "invariant.ai-non-authority"
    ],
    attributes: {
      sourceIssueId: "icos-issue-irrigation-window",
      unresolvedObjectionsPreserved: true
    }
  },
  {
    ref: goldenFixtureRefs.proposalIrrigationWindow,
    domain: "governance",
    objectType: "proposal",
    title: "Open south canal gate during dawn window",
    linkedRefs: [
      goldenFixtureRefs.issueIrrigationWindow,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      decisionMethod: "consent_with_guardian_review",
      parentIssueRefId: goldenFixtureRefs.issueIrrigationWindow.id
    }
  },
  {
    ref: goldenFixtureRefs.decisionIrrigationWindow,
    domain: "governance",
    objectType: "decision",
    title: "Decision granting dawn irrigation window",
    linkedRefs: [
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.policyDroughtProtocol,
      goldenFixtureRefs.guardianReviewRiparian,
      goldenFixtureRefs.agreementFoodHubDistribution
    ],
    invariantCaseIds: [
      "invariant.membership-authority-separation",
      "invariant.ai-non-authority",
      "invariant.use-right-scope"
    ],
    attributes: {
      decidedByRefIds: [
        goldenFixtureRefs.mandateWatershedSteward.id,
        goldenFixtureRefs.policyDroughtProtocol.id
      ],
      machineOutputAuthorityRefIds: [],
      unresolvedObjectionRefIds: []
    }
  },
  {
    ref: goldenFixtureRefs.sourceRiparianSurvey,
    domain: "claims-evidence",
    objectType: "source",
    title: "Riparian corridor survey source",
    linkedRefs: [
      goldenFixtureRefs.evidenceRiparianSurvey,
      goldenFixtureRefs.claimRiparianStress
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      sourceKind: "field_survey",
      contentHash: "sha256:riparian-survey",
      dataStewardshipAgreementRefId: goldenFixtureRefs.dataStewardshipAgreement.id
    }
  },
  {
    ref: goldenFixtureRefs.claimRiparianStress,
    domain: "claims-evidence",
    objectType: "claim",
    title: "Riparian corridor stress claim",
    linkedRefs: [
      goldenFixtureRefs.evidenceRiparianSurvey,
      goldenFixtureRefs.modelOutputRiparianRisk,
      goldenFixtureRefs.issueIrrigationWindow
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      claimStatus: "contested",
      confidence: "medium",
      acceptedWithoutHumanReview: false
    }
  },
  {
    ref: goldenFixtureRefs.evidenceRiparianSurvey,
    domain: "claims-evidence",
    objectType: "evidence",
    title: "Riparian survey evidence link",
    linkedRefs: [
      goldenFixtureRefs.sourceRiparianSurvey,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      relation: "qualifies",
      preservesUncertainty: true,
      sensitiveLocationTreatment: "generalized"
    }
  },
  {
    ref: goldenFixtureRefs.modelRiparianScenario,
    domain: "ecology",
    objectType: "model",
    title: "Riparian irrigation scenario model",
    linkedRefs: [
      goldenFixtureRefs.modelOutputRiparianRisk,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      modelKind: "scenario",
      assumptionRefIds: ["assumption.dawn-window-lower-evaporation"],
      reviewedByRefId: goldenFixtureRefs.guardianReviewRiparian.id
    }
  },
  {
    ref: goldenFixtureRefs.modelOutputRiparianRisk,
    domain: "claims-evidence",
    objectType: "model-output",
    title: "Riparian risk model output",
    linkedRefs: [
      goldenFixtureRefs.modelRiparianScenario,
      goldenFixtureRefs.claimRiparianStress
    ],
    invariantCaseIds: ["invariant.ai-non-authority"],
    attributes: {
      dataState: "model_derived",
      canAuthorizeBindingAction: false
    }
  },
  {
    ref: goldenFixtureRefs.placeSouthCanal,
    domain: "stewardship",
    objectType: "place",
    title: "South canal place",
    linkedRefs: [
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      placeKind: "canal_reach",
      boundaryTreatment: "generalized"
    }
  },
  {
    ref: goldenFixtureRefs.resourceIrrigationGate,
    domain: "stewardship",
    objectType: "resource",
    title: "South canal irrigation gate",
    linkedRefs: [
      goldenFixtureRefs.placeSouthCanal,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      resourceKind: "irrigation_gate",
      ecologicalContextRefId: goldenFixtureRefs.livingSystemRiparianCorridor.id
    }
  },
  {
    ref: goldenFixtureRefs.livingSystemRiparianCorridor,
    domain: "ecology",
    objectType: "living-system",
    title: "South canal riparian corridor",
    linkedRefs: [
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    invariantCaseIds: [
      "invariant.use-right-scope",
      "invariant.ai-non-authority"
    ],
    attributes: {
      livingSystemKind: "riparian_corridor",
      protectedLocationTreatment: "generalized",
      guardianReviewRequired: true
    }
  },
  {
    ref: goldenFixtureRefs.guardianReviewRiparian,
    domain: "stewardship",
    objectType: "guardian-review",
    title: "Riparian guardian review",
    linkedRefs: [
      goldenFixtureRefs.livingSystemRiparianCorridor,
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.policyDroughtProtocol
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      disposition: "approved_with_conditions",
      conditions: ["generalized location", "dawn window only"]
    }
  },
  {
    ref: goldenFixtureRefs.useRightIrrigationGate,
    domain: "stewardship",
    objectType: "use-right",
    title: "Dawn irrigation gate use right",
    linkedRefs: [
      goldenFixtureRefs.personKai,
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      holderRefId: goldenFixtureRefs.personKai.id,
      resourceRefId: goldenFixtureRefs.resourceIrrigationGate.id,
      permissions: ["open_gate.dawn_window"],
      conditions: ["pause if threshold breached"],
      revocable: true,
      reviewPathRefId: goldenFixtureRefs.guardianReviewRiparian.id,
      authorityRefIds: [
        goldenFixtureRefs.mandateWatershedSteward.id,
        goldenFixtureRefs.decisionIrrigationWindow.id
      ]
    }
  },
  {
    ref: goldenFixtureRefs.taskCanalCheck,
    domain: "stewardship",
    objectType: "task",
    title: "South canal post-window check",
    linkedRefs: [
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.claimRiparianStress
    ],
    invariantCaseIds: ["invariant.use-right-scope"],
    attributes: {
      activityType: "inspection",
      status: "completed",
      doesNotCertifyEcologicalImprovement: true
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
    id: "event.evidence.source.ingested.riparian-survey",
    type: "evidence.source.ingested",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.sourceRiparianSurvey,
    relatedRefs: [
      goldenFixtureRefs.evidenceRiparianSurvey,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.dataStewardshipAgreement
    ],
    authorityRefs: [goldenFixtureRefs.dataStewardshipAgreement],
    sourceCapability: "claims-evidence",
    payload: {
      sourceKind: "field_survey",
      contentHash: "sha256:riparian-survey",
      dataStewardshipAgreementRef: goldenFixtureRefs.dataStewardshipAgreement.id
    },
    schemaVersion: 1,
    visibility: "guardian_restricted",
    dataState: "locally_verified",
    contentHash: "sha256:riparian-survey"
  },
  {
    id: "event.claim.contested.riparian-stress",
    type: "claim.contested",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personKai,
    objectRef: goldenFixtureRefs.claimRiparianStress,
    relatedRefs: [
      goldenFixtureRefs.evidenceRiparianSurvey,
      goldenFixtureRefs.modelOutputRiparianRisk,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    authorityRefs: [],
    sourceCapability: "claims-evidence",
    payload: {
      status: "contested",
      confidence: "medium",
      preservesUncertainty: true,
      acceptedWithoutHumanReview: false
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "contested"
  },
  {
    id: "event.evidence.linked_to_claim.riparian-survey",
    type: "evidence.linked_to_claim",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.evidenceRiparianSurvey,
    relatedRefs: [
      goldenFixtureRefs.sourceRiparianSurvey,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    authorityRefs: [goldenFixtureRefs.dataStewardshipAgreement],
    sourceCapability: "claims-evidence",
    payload: {
      claimRefId: goldenFixtureRefs.claimRiparianStress.id,
      sourceRefId: goldenFixtureRefs.sourceRiparianSurvey.id,
      relation: "qualifies",
      locationTreatment: "generalized"
    },
    schemaVersion: 1,
    visibility: "guardian_restricted",
    dataState: "locally_verified"
  },
  {
    id: "event.model.created.riparian-scenario",
    type: "model.created",
    occurredAt: fixtureTimestamp,
    systemActor: "ai_assistant",
    objectRef: goldenFixtureRefs.modelRiparianScenario,
    relatedRefs: [
      goldenFixtureRefs.sourceRiparianSurvey,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    authorityRefs: [],
    sourceCapability: "ecological-modeling",
    payload: {
      modelKind: "scenario",
      assumptionRefIds: ["assumption.dawn-window-lower-evaporation"],
      status: "draft"
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "model_derived"
  },
  {
    id: "event.model.output.generated.riparian-risk",
    type: "model.output.generated",
    occurredAt: fixtureTimestamp,
    systemActor: "ai_assistant",
    objectRef: goldenFixtureRefs.modelOutputRiparianRisk,
    relatedRefs: [
      goldenFixtureRefs.modelRiparianScenario,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.livingSystemRiparianCorridor
    ],
    authorityRefs: [],
    sourceCapability: "ecological-modeling",
    payload: {
      dataState: "model_derived",
      outputClassification: "model_derived",
      canAuthorizeBindingAction: false
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "model_derived"
  },
  {
    id: "event.governance.issue.created.irrigation-window",
    type: "governance.issue.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.issueIrrigationWindow,
    relatedRefs: [
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.policyDroughtProtocol
    ],
    authorityRefs: [],
    sourceCapability: "governance",
    payload: {
      issueKind: "drought_protocol_window",
      sourceProject: "icos",
      unresolvedObjectionsPreserved: true
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "locally_verified"
  },
  {
    id: "event.governance.proposal.created.irrigation-window",
    type: "governance.proposal.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.proposalIrrigationWindow,
    relatedRefs: [
      goldenFixtureRefs.issueIrrigationWindow,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    authorityRefs: [],
    sourceCapability: "governance",
    payload: {
      proposedUseRightRefId: goldenFixtureRefs.useRightIrrigationGate.id,
      parentIssueRefId: goldenFixtureRefs.issueIrrigationWindow.id
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified"
  },
  {
    id: "event.governance.policy.versioned.drought-protocol",
    type: "governance.policy.versioned",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.policyDroughtProtocol,
    relatedRefs: [
      goldenFixtureRefs.issueIrrigationWindow,
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.guardianReviewRiparian
    ],
    authorityRefs: [goldenFixtureRefs.mandateWatershedSteward],
    sourceCapability: "governance",
    payload: {
      policyVersion: "2",
      requiresGuardianReviewForRiparianWindows: true
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "institutionally_certified"
  },
  {
    id: "event.ecology.living-system.created.riparian-corridor",
    type: "ecology.living_system.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.livingSystemRiparianCorridor,
    relatedRefs: [
      goldenFixtureRefs.placeSouthCanal,
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.claimRiparianStress
    ],
    authorityRefs: [goldenFixtureRefs.policyDroughtProtocol],
    sourceCapability: "ecological-modeling",
    payload: {
      livingSystemKind: "riparian_corridor",
      protectedLocationTreatment: "generalized",
      guardianReviewRequired: true
    },
    schemaVersion: 1,
    visibility: "guardian_restricted",
    dataState: "locally_verified",
    livingSystemId: goldenFixtureRefs.livingSystemRiparianCorridor.id
  },
  {
    id: "event.stewardship.resource.created.irrigation-gate",
    type: "stewardship.resource.created",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.resourceIrrigationGate,
    relatedRefs: [
      goldenFixtureRefs.placeSouthCanal,
      goldenFixtureRefs.livingSystemRiparianCorridor,
      goldenFixtureRefs.useRightIrrigationGate
    ],
    authorityRefs: [goldenFixtureRefs.mandateWatershedSteward],
    sourceCapability: "stewardship",
    payload: {
      title: "South canal irrigation gate",
      resourceKind: "irrigation_gate",
      ecologicalContextRefId: goldenFixtureRefs.livingSystemRiparianCorridor.id
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "locally_verified",
    livingSystemId: goldenFixtureRefs.livingSystemRiparianCorridor.id
  },
  {
    id: "event.ecology.guardian.review-requested.riparian-window",
    type: "ecology.guardian.review_requested",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.guardianReviewRiparian,
    relatedRefs: [
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.livingSystemRiparianCorridor,
      goldenFixtureRefs.useRightIrrigationGate
    ],
    authorityRefs: [
      goldenFixtureRefs.policyDroughtProtocol,
      goldenFixtureRefs.mandateWatershedSteward
    ],
    sourceCapability: "stewardship",
    payload: {
      disposition: "approved_with_conditions",
      conditions: ["generalized location", "dawn window only"]
    },
    schemaVersion: 1,
    visibility: "guardian_restricted",
    dataState: "expert_reviewed",
    livingSystemId: goldenFixtureRefs.livingSystemRiparianCorridor.id
  },
  {
    id: "event.governance.decision.recorded.irrigation-window",
    type: "governance.decision.recorded",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.decisionIrrigationWindow,
    relatedRefs: [
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.guardianReviewRiparian,
      goldenFixtureRefs.modelOutputRiparianRisk
    ],
    authorityRefs: [
      goldenFixtureRefs.mandateWatershedSteward,
      goldenFixtureRefs.policyDroughtProtocol
    ],
    sourceCapability: "governance",
    payload: {
      machineOutputAuthorityRefIds: [],
      unresolvedObjectionRefIds: [],
      guardianReviewRefId: goldenFixtureRefs.guardianReviewRiparian.id
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "institutionally_certified"
  },
  {
    id: "event.stewardship.use-right.granted.irrigation-window",
    type: "stewardship.use_right.granted",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.useRightIrrigationGate,
    relatedRefs: [
      goldenFixtureRefs.personKai,
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.guardianReviewRiparian,
      goldenFixtureRefs.claimRiparianStress
    ],
    authorityRefs: [
      goldenFixtureRefs.mandateWatershedSteward,
      goldenFixtureRefs.decisionIrrigationWindow
    ],
    sourceCapability: "stewardship",
    payload: {
      holderRefId: goldenFixtureRefs.personKai.id,
      resourceRefId: goldenFixtureRefs.resourceIrrigationGate.id,
      decisionRefId: goldenFixtureRefs.decisionIrrigationWindow.id,
      permissions: ["open_gate.dawn_window"],
      conditions: ["pause if threshold breached"],
      term: {
        startsAt: "2026-01-16T05:00:00.000Z",
        endsAt: "2026-01-16T08:00:00.000Z"
      },
      review: {
        reviewPathRefId: goldenFixtureRefs.guardianReviewRiparian.id,
        reviewAt: fixtureTimestamp
      },
      revocation: {
        revocable: true,
        revocationPathRefId: goldenFixtureRefs.guardianReviewRiparian.id,
        revocationConditions: ["threshold breach", "guardian recall"]
      }
    },
    schemaVersion: 1,
    visibility: "public",
    dataState: "institutionally_certified",
    livingSystemId: goldenFixtureRefs.livingSystemRiparianCorridor.id
  },
  {
    id: "event.stewardship.task.completed.south-canal-check",
    type: "stewardship.task.completed",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personKai,
    objectRef: goldenFixtureRefs.taskCanalCheck,
    relatedRefs: [
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.claimRiparianStress
    ],
    authorityRefs: [goldenFixtureRefs.decisionIrrigationWindow],
    sourceCapability: "stewardship",
    payload: {
      activityType: "inspection",
      status: "completed",
      doesNotCertifyEcologicalImprovement: true
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "locally_verified",
    livingSystemId: goldenFixtureRefs.livingSystemRiparianCorridor.id
  },
  {
    id: "event.allocation.consent.recorded.food-hub-distribution",
    type: "allocation.consent.recorded",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personKai,
    objectRef: goldenFixtureRefs.agreementFoodHubDistribution,
    relatedRefs: [
      goldenFixtureRefs.organizationFoodHub,
      goldenFixtureRefs.ledgerAccountFoodHub,
      goldenFixtureRefs.useRightIrrigationGate
    ],
    authorityRefs: [goldenFixtureRefs.decisionIrrigationWindow],
    sourceCapability: "allocation-accounting",
    payload: {
      participants: [
        goldenFixtureRefs.organizationFoodHub.id,
        goldenFixtureRefs.commonsWatershed.id
      ],
      authorizesLedgerEntryRefIds: [
        goldenFixtureRefs.ledgerEntryFoodHubDistribution.id
      ]
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified"
  },
  {
    id: "event.accounting.ledger-entry.posted.food-hub-distribution",
    type: "accounting.ledger_entry.posted",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personKai,
    objectRef: goldenFixtureRefs.ledgerEntryFoodHubDistribution,
    relatedRefs: [
      goldenFixtureRefs.ledgerAccountFoodHub,
      goldenFixtureRefs.ledgerAccountCommons,
      goldenFixtureRefs.agreementFoodHubDistribution,
      goldenFixtureRefs.useRightIrrigationGate
    ],
    authorityRefs: [
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.agreementFoodHubDistribution
    ],
    sourceCapability: "allocation-accounting",
    payload: {
      lineAccountRefIds: [
        goldenFixtureRefs.ledgerAccountFoodHub.id,
        goldenFixtureRefs.ledgerAccountCommons.id
      ],
      amount: 320,
      unit: "COMMON_CREDIT",
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified"
  },
  {
    id: "event.accounting.ledger-entry.reversed.food-hub-correction",
    type: "accounting.ledger_entry.reversed",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personKai,
    objectRef: goldenFixtureRefs.ledgerEntryFoodHubCorrection,
    relatedRefs: [
      goldenFixtureRefs.ledgerEntryFoodHubDistribution,
      goldenFixtureRefs.ledgerAccountFoodHub,
      goldenFixtureRefs.agreementFoodHubDistribution
    ],
    authorityRefs: [
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.agreementFoodHubDistribution
    ],
    sourceCapability: "allocation-accounting",
    payload: {
      reversesLedgerEntryRefId: goldenFixtureRefs.ledgerEntryFoodHubDistribution.id,
      appendOnlyCorrection: true,
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    },
    schemaVersion: 1,
    visibility: "organization",
    dataState: "institutionally_certified",
    supersedesEventId: "event.accounting.ledger-entry.posted.food-hub-distribution",
    supersession: {
      supersedesEventId: "event.accounting.ledger-entry.posted.food-hub-distribution",
      supersededAt: fixtureTimestamp,
      reason: "source_correction_imported_append_only",
      replacementObjectRef: goldenFixtureRefs.ledgerEntryFoodHubCorrection,
      authorityRefs: [
        goldenFixtureRefs.decisionIrrigationWindow,
        goldenFixtureRefs.agreementFoodHubDistribution
      ]
    }
  },
  {
    id: "event.federation.import.received.icos-irrigation-window",
    type: "federation.import.received",
    occurredAt: fixtureTimestamp,
    actorRef: goldenFixtureRefs.personMira,
    objectRef: goldenFixtureRefs.canonicalMapping,
    relatedRefs: [
      goldenFixtureRefs.localTerm,
      goldenFixtureRefs.issueIrrigationWindow,
      goldenFixtureRefs.proposalIrrigationWindow,
      goldenFixtureRefs.decisionIrrigationWindow
    ],
    authorityRefs: [goldenFixtureRefs.federationRule],
    sourceCapability: "federation",
    payload: {
      sourceProject: "icos",
      localTermRefId: goldenFixtureRefs.localTerm.id,
      canonicalMappingRefId: goldenFixtureRefs.canonicalMapping.id,
      preservesLocalIdentifiers: true
    },
    schemaVersion: 1,
    visibility: "federation",
    dataState: "locally_verified"
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
        goldenFixtureRefs.accountMiraLogin,
        goldenFixtureRefs.personKai
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
        goldenFixtureRefs.organizationFoodHub,
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
      objectTypes: ["claim", "evidence", "model-output", "source"],
      objectRefs: [
        goldenFixtureRefs.claimFlowNeed,
        goldenFixtureRefs.claimRiparianStress,
        goldenFixtureRefs.evidenceFlowGauge,
        goldenFixtureRefs.evidenceRiparianSurvey,
        goldenFixtureRefs.modelOutputFlowRisk,
        goldenFixtureRefs.modelOutputRiparianRisk,
        goldenFixtureRefs.sourceRiparianSurvey
      ],
      eventTypes: [
        "claim.created",
        "claim.contested",
        "evidence.source.ingested",
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
      objectTypes: ["issue", "proposal", "decision", "policy-version"],
      objectRefs: [
        goldenFixtureRefs.issueUseRight,
        goldenFixtureRefs.issueIrrigationWindow,
        goldenFixtureRefs.proposalUseRight,
        goldenFixtureRefs.proposalIrrigationWindow,
        goldenFixtureRefs.decisionUseRight,
        goldenFixtureRefs.decisionIrrigationWindow,
        goldenFixtureRefs.policyDroughtProtocol
      ],
      eventTypes: [
        "governance.issue.created",
        "governance.proposal.created",
        "governance.decision.recorded",
        "governance.policy.versioned"
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
      objectTypes: [
        "commons",
        "place",
        "resource",
        "use-right",
        "access-rule",
        "guardian-review",
        "task"
      ],
      objectRefs: [
        goldenFixtureRefs.commonsWatershed,
        goldenFixtureRefs.placeSouthCanal,
        goldenFixtureRefs.resourceNorthPasture,
        goldenFixtureRefs.resourceIrrigationGate,
        goldenFixtureRefs.useRightNorthPasture,
        goldenFixtureRefs.useRightIrrigationGate,
        goldenFixtureRefs.accessRuleUseRight,
        goldenFixtureRefs.guardianReviewRiparian,
        goldenFixtureRefs.taskCanalCheck
      ],
      eventTypes: [
        "stewardship.resource.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed",
        "ecology.guardian.review_requested"
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
      objectTypes: ["allocation", "ledger-account", "ledger-entry", "agreement"],
      objectRefs: [
        goldenFixtureRefs.allocationStewardship,
        goldenFixtureRefs.ledgerAccountCommons,
        goldenFixtureRefs.ledgerAccountStewardship,
        goldenFixtureRefs.ledgerAccountFoodHub,
        goldenFixtureRefs.ledgerEntryAllocation,
        goldenFixtureRefs.ledgerEntryFoodHubDistribution,
        goldenFixtureRefs.ledgerEntryFoodHubCorrection,
        goldenFixtureRefs.agreementFoodHubDistribution
      ],
      eventTypes: [
        "allocation.consent.recorded",
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed"
      ],
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
        goldenFixtureRefs.livingSystemRiparianCorridor,
        goldenFixtureRefs.modelFlowForecast,
        goldenFixtureRefs.modelRiparianScenario
      ],
      eventTypes: [
        "ecology.living_system.created",
        "model.created",
        "model.output.generated"
      ],
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
      eventTypes: ["federation.export.created", "federation.import.received"],
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
    },
    {
      id: "expectation.first-replay.common-credit-fold-in",
      title: "CommonCredit fold-in keeps agreements and ledger corrections canonical",
      domain: "allocation-accounting",
      invariantCaseIds: [
        "invariant.ledger-account-auth-account-separation",
        "invariant.event-append-rules"
      ],
      requiredObjectRefs: [
        goldenFixtureRefs.agreementFoodHubDistribution,
        goldenFixtureRefs.ledgerAccountFoodHub,
        goldenFixtureRefs.ledgerEntryFoodHubDistribution,
        goldenFixtureRefs.ledgerEntryFoodHubCorrection
      ],
      requiredEventTypes: [
        "allocation.consent.recorded",
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed"
      ]
    },
    {
      id: "expectation.first-replay.icos-governance-fold-in",
      title: "ICOS fold-in preserves governance parentage and federation mapping",
      domain: "governance",
      invariantCaseIds: [
        "invariant.membership-authority-separation",
        "invariant.use-right-scope"
      ],
      requiredObjectRefs: [
        goldenFixtureRefs.issueIrrigationWindow,
        goldenFixtureRefs.proposalIrrigationWindow,
        goldenFixtureRefs.decisionIrrigationWindow,
        goldenFixtureRefs.policyDroughtProtocol,
        goldenFixtureRefs.canonicalMapping
      ],
      requiredEventTypes: [
        "governance.issue.created",
        "governance.proposal.created",
        "governance.policy.versioned",
        "governance.decision.recorded",
        "federation.import.received"
      ]
    },
    {
      id: "expectation.first-replay.sensemaking-fold-in",
      title: "Sensemaking fold-in preserves uncertainty and model-derived evidence",
      domain: "claims-evidence",
      invariantCaseIds: ["invariant.ai-non-authority"],
      requiredObjectRefs: [
        goldenFixtureRefs.sourceRiparianSurvey,
        goldenFixtureRefs.claimRiparianStress,
        goldenFixtureRefs.evidenceRiparianSurvey,
        goldenFixtureRefs.modelRiparianScenario,
        goldenFixtureRefs.modelOutputRiparianRisk
      ],
      requiredEventTypes: [
        "evidence.source.ingested",
        "claim.contested",
        "evidence.linked_to_claim",
        "model.created",
        "model.output.generated"
      ]
    },
    {
      id: "expectation.first-replay.stewardship-fold-in",
      title: "Stewardship fold-in preserves ecological hooks and scoped use rights",
      domain: "stewardship",
      invariantCaseIds: ["invariant.use-right-scope"],
      requiredObjectRefs: [
        goldenFixtureRefs.placeSouthCanal,
        goldenFixtureRefs.resourceIrrigationGate,
        goldenFixtureRefs.livingSystemRiparianCorridor,
        goldenFixtureRefs.guardianReviewRiparian,
        goldenFixtureRefs.useRightIrrigationGate,
        goldenFixtureRefs.taskCanalCheck
      ],
      requiredEventTypes: [
        "ecology.living_system.created",
        "ecology.guardian.review_requested",
        "stewardship.resource.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed"
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
