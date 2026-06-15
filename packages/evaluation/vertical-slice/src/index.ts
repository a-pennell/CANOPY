import type {
  Amendment,
  Appeal,
  Decision,
  DecisionPacket,
  Issue,
  Objection,
  PolicyVersion,
  Proposal
} from "@canopy/contracts-governance";
import type {
  CanopyShellSession,
  CanopyShellScope,
  PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import { buildPersistedCanopyShellSession, buildPersistedCanopyShellSnapshot } from "@canopy/app-shell";
import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import {
  createCommitment,
  createLedgerAccount,
  createNeed,
  createOffer,
  postLedgerEntry,
  reverseLedgerEntry
} from "@canopy/capabilities-allocation-accounting";
import {
  createClaim,
  ingestEvidence,
  linkEvidenceToClaim,
  reviewClaim
} from "@canopy/capabilities-claims-evidence";
import {
  applyRedaction,
  approveExport,
  recordConsent,
  requestRedaction,
  revokeConsent,
  setVisibilityRule
} from "@canopy/capabilities-data-stewardship";
import {
  createLivingSystem,
  createModelScenario,
  createThreshold,
  recordThresholdBreach
} from "@canopy/capabilities-ecological-modeling";
import {
  createIssue,
  createProposal,
  completeGuardianReview,
  requestGuardianReview,
  recordDecision,
  recordDecisionPacket,
  openAppeal,
  raiseObjection,
  submitAmendment,
  versionPolicy
} from "@canopy/capabilities-governance";
import {
  completeLearningRetrospective,
  recordLearningOutcome
} from "@canopy/capabilities-learning-accountability";
import {
  completeTask,
  createResource,
  createTask,
  grantUseRight,
  proposeUseRight,
  recordFoodFlow,
  recordResourceContext,
  revokeUseRight,
  type UseRightScope
} from "@canopy/capabilities-stewardship";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  createInMemoryCanonicalPersistence,
  type CanonicalPersistenceRuntime
} from "@canopy/database-runtime";
import {
  buildCivicMemoryProjection,
  type CivicMemoryProjection
} from "@canopy/projections-civic-memory";
import {
  buildFederationExportEnvelopeReadModel,
  type FederationExportEnvelopeReadModel
} from "@canopy/projections-federation-export";
import {
  buildObjectPageProjection,
  type ObjectPageProjection
} from "@canopy/projections-object-page";
import {
  createInMemoryMaterializedProjectionStore,
  queryMaterializedProjections,
  rebuildAndPersistAllProjections,
  type MaterializedProjectionDocument,
  type MaterializedProjectionStore,
  type PersistentProjectionRebuildResult
} from "@canopy/workflows-projection-rebuild";

export interface VerticalSliceMarker {
  readonly package: "@canopy/evaluation-vertical-slice";
}

export type CyberneticPhase =
  | "observe"
  | "understand"
  | "simulate"
  | "deliberate"
  | "coordinate"
  | "act"
  | "learn"
  | "federate";

export interface RiverbendCyberneticSliceStep {
  readonly phase: CyberneticPhase;
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly objectRef: ObjectRef;
}

export interface RiverbendCyberneticSliceRefs {
  readonly actorRef: ObjectRef;
  readonly watershedGuardianRef: ObjectRef;
  readonly federationPeerRef: ObjectRef;
  readonly mandateRef: ObjectRef;
  readonly dataStewardshipAgreementRef: ObjectRef;
  readonly appealPathRef: ObjectRef;
  readonly commonsRef: ObjectRef;
  readonly livingSystemRef: ObjectRef;
  readonly indicatorRef: ObjectRef;
  readonly thresholdRef: ObjectRef;
  readonly needRef: ObjectRef;
  readonly offerRef: ObjectRef;
  readonly claimRef: ObjectRef;
  readonly evidenceRef: ObjectRef;
  readonly sourceRef: ObjectRef;
  readonly issueRef: ObjectRef;
  readonly scenarioRef: ObjectRef;
  readonly proposalRef: ObjectRef;
  readonly guardianReviewRef: ObjectRef;
  readonly decisionRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly useRightRef: ObjectRef;
  readonly commitmentRef: ObjectRef;
  readonly taskRef: ObjectRef;
  readonly flowRef: ObjectRef;
  readonly outcomeRef: ObjectRef;
  readonly retrospectiveRef: ObjectRef;
  readonly adaptiveIssueRef: ObjectRef;
  readonly adaptiveProposalRef: ObjectRef;
  readonly adaptiveAmendmentRef: ObjectRef;
  readonly adaptiveObjectionRef: ObjectRef;
  readonly adaptiveDecisionRef: ObjectRef;
  readonly adaptiveDecisionPacketRef: ObjectRef;
  readonly adaptiveGuardianReviewRef: ObjectRef;
  readonly adaptiveAppealRef: ObjectRef;
  readonly schoolConsentRef: ObjectRef;
  readonly schoolConsentRevocationRef: ObjectRef;
  readonly policyRef: ObjectRef;
  readonly policyVersionRef: ObjectRef;
  readonly adaptiveTaskRef: ObjectRef;
  readonly redactionRequestRef: ObjectRef;
  readonly redactionRef: ObjectRef;
  readonly consentRedactionRequestRef: ObjectRef;
  readonly consentRedactionRef: ObjectRef;
  readonly exportRef: ObjectRef;
  readonly cashLedgerRef: ObjectRef;
  readonly stewardshipLedgerRef: ObjectRef;
  readonly ledgerEntryRef: ObjectRef;
  readonly reversalLedgerEntryRef: ObjectRef;
}

export interface RiverbendCyberneticSliceResult {
  readonly refs: RiverbendCyberneticSliceRefs;
  readonly steps: readonly RiverbendCyberneticSliceStep[];
  readonly events: readonly CanopyEvent[];
  readonly civicMemory: CivicMemoryProjection;
  readonly objectPages: {
    readonly threshold: ObjectPageProjection;
    readonly decision: ObjectPageProjection;
    readonly useRight: ObjectPageProjection;
    readonly outcome: ObjectPageProjection;
  };
  readonly federationExport: FederationExportEnvelopeReadModel;
}

export interface RiverbendTrustHardeningSliceResult extends RiverbendCyberneticSliceResult {
  readonly phase8EventIds: readonly CanopyId[];
}

export interface RiverbendPersistedRuntimeScenario {
  readonly slice: RiverbendCyberneticSliceResult;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly materializedProjectionStore: MaterializedProjectionStore;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly projectionRebuild: PersistentProjectionRebuildResult;
  readonly scope: CanopyShellScope;
  readonly shell: PersistedCanopyShellSnapshotResult;
  readonly shellSessions: {
    readonly threshold: CanopyShellSession;
    readonly decision: CanopyShellSession;
    readonly resource: CanopyShellSession;
    readonly useRight: CanopyShellSession;
    readonly outcome: CanopyShellSession;
    readonly federation: CanopyShellSession;
  };
}

const occurredAt = "2026-06-14T12:00:00.000Z";
const namespace = "canopy.phase-7.riverbend";
const orgId = "org.riverbend-foodshed-commons";
const commonsId = "commons.riverbend-foodshed";
const placeId = "place.riverbend-neighborhood";
const livingSystemId = "living-system.mill-creek-watershed";

export function executeRiverbendCyberneticSlice(): RiverbendCyberneticSliceResult {
  const registry = createObjectRegistry();
  const memory = createInMemoryCivicMemory();
  const services = { registry, memory };
  const refs = riverbendRefs();
  const steps: RiverbendCyberneticSliceStep[] = [];

  createLivingSystem(services, {
    eventId: "event.ecology.living-system.created.mill-creek",
    occurredAt,
    actorRef: refs.actorRef,
    livingSystemRef: refs.livingSystemRef,
    relatedRefs: [refs.commonsRef],
    authorityRefs: [refs.mandateRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Mill Creek Watershed",
    summary: "Living system connected to the Riverbend food route."
  });
  createThreshold(services, {
    eventId: "event.ecology.threshold.created.mill-creek-nitrate",
    occurredAt,
    actorRef: refs.actorRef,
    thresholdRef: refs.thresholdRef,
    indicatorRef: refs.indicatorRef,
    livingSystemRef: refs.livingSystemRef,
    guardianRefs: [refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Mill Creek nitrate threshold",
    threshold: 10,
    unit: "mg/L",
    guardianReviewRequired: true
  });
  recordThresholdBreach(services, {
    eventId: "event.ecology.threshold.breached.mill-creek-nitrate",
    occurredAt,
    actorRef: refs.actorRef,
    thresholdRef: refs.thresholdRef,
    indicatorRef: refs.indicatorRef,
    relatedRefs: [refs.livingSystemRef, refs.issueRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Mill Creek nitrate threshold breached",
    observedValue: 14.2,
    unit: "mg/L",
    observedAt: occurredAt,
    requiresGuardianReview: true
  });
  createNeed(servicesForAccounting(services), {
    eventId: "event.coordination.need.created.school-meals",
    occurredAt,
    actorRef: refs.actorRef,
    needRef: refs.needRef,
    relatedRefs: [refs.commonsRef, refs.claimRef],
    authorityRefs: [refs.mandateRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Summer meal produce shortage",
    neededBy: "2026-06-17",
    quantity: "20 produce boxes"
  });
  createOffer(servicesForAccounting(services), {
    eventId: "event.coordination.offer.created.green-acre",
    occurredAt,
    actorRef: refs.actorRef,
    offerRef: refs.offerRef,
    relatedRefs: [refs.resourceRef, refs.needRef],
    authorityRefs: [refs.mandateRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Green Acre surplus produce",
    quantity: "20 produce boxes",
    pickupWindow: "2026-06-15"
  });

  createClaim(services, {
    eventId: "event.claim.created.school-meal-need",
    occurredAt,
    actorRef: refs.actorRef,
    claimRef: refs.claimRef,
    relatedRefs: [refs.needRef, refs.resourceRef, refs.thresholdRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dataState: "testimony_derived",
    payload: {
      title: "Northside School needs local produce this week",
      summary: "The school kitchen can absorb twenty produce boxes before the next meal cycle."
    }
  });
  ingestEvidence(services, {
    eventId: "event.evidence.created.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    evidenceRef: refs.evidenceRef,
    sourceRef: refs.sourceRef,
    relatedRefs: [refs.claimRef, refs.needRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dataState: "locally_verified",
    payload: {
      evidenceKind: "procurement_note",
      summary: "Kitchen confirms capacity for twenty produce boxes."
    }
  });
  linkEvidenceToClaim(services, {
    eventId: "event.evidence.linked_to_claim.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    evidenceRef: refs.evidenceRef,
    claimRef: refs.claimRef,
    relation: "supports",
    orgId,
    placeId,
    commonsId,
    livingSystemId
  });
  reviewClaim(services, {
    eventId: "event.claim.reviewed.school-meal-need",
    occurredAt,
    actorRef: refs.actorRef,
    reviewerRef: refs.actorRef,
    claimRef: refs.claimRef,
    evidenceRefs: [refs.evidenceRef],
    authorityRefs: [refs.mandateRef],
    disposition: "accepted",
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dataState: "expert_reviewed"
  });

  createModelScenario(services, {
    eventId: "event.model.scenario.created.low-runoff-route",
    occurredAt,
    actorRef: refs.actorRef,
    scenarioRef: refs.scenarioRef,
    relatedRefs: [refs.thresholdRef, refs.needRef, refs.offerRef, refs.claimRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Low runoff food-flow route",
    summary: "Route surplus boxes without additional irrigation or creek-adjacent staging.",
    assumptions: ["no additional irrigation", "existing cold-chain capacity"],
    guardianReviewRequired: true
  });

  createIssue(services, {
    occurredAt,
    actorRef: refs.actorRef,
    issue: makeIssue(refs)
  });
  createProposal(services, {
    occurredAt,
    actorRef: refs.actorRef,
    proposal: makeProposal(refs)
  });
  requestGuardianReview(services, {
    eventId: "event.ecology.guardian.review_requested.mill-creek-food-flow",
    occurredAt,
    actorRef: refs.actorRef,
    guardianReviewRef: refs.guardianReviewRef,
    proposalRef: refs.proposalRef,
    thresholdRef: refs.thresholdRef,
    subjectRefs: [refs.thresholdRef, refs.livingSystemRef, refs.scenarioRef, refs.proposalRef, refs.claimRef],
    guardianRefs: [refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    title: "Guardian review for Mill Creek food-flow intervention",
    reason: "Threshold breach affects food-flow route conditions."
  });
  completeGuardianReview(services, {
    eventId: "event.ecology.guardian.review_completed.mill-creek-food-flow",
    occurredAt,
    actorRef: refs.actorRef,
    guardianReviewRef: refs.guardianReviewRef,
    subjectRefs: [refs.thresholdRef, refs.scenarioRef, refs.proposalRef],
    guardianRefs: [refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    title: "Guardian review completed",
    outcome: "approved_with_conditions",
    conditions: [
      "No additional irrigation during the breach window.",
      "Record delivery outcome and watershed follow-up."
    ],
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef]
  });
  recordDecision(services, {
    occurredAt,
    actorRef: refs.actorRef,
    decision: makeDecision(refs),
    controls: {
      evaluatedAt: occurredAt,
      delegatedAuthorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
      appealPathRef: refs.appealPathRef
    }
  });

  createResource(services, {
    eventId: "event.stewardship.resource.created.green-acre-surplus",
    occurredAt,
    actorRef: refs.actorRef,
    resourceRef: refs.resourceRef,
    stewardRefs: [refs.actorRef],
    authorityRefs: [refs.mandateRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Green Acre surplus produce",
    resourceKind: "food_surplus",
    summary: "Harvest-ready produce available for commons allocation."
  });
  recordResourceContext(services, {
    eventId: "event.stewardship.resource_context.recorded.green-acre-surplus",
    occurredAt,
    actorRef: refs.actorRef,
    resourceRef: refs.resourceRef,
    relatedRefs: [refs.claimRef, refs.evidenceRef, refs.thresholdRef, refs.scenarioRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    context: {
      availableBoxes: 20,
      harvestWindow: "2026-06-15",
      watershedCondition: "threshold_breached",
      guardianReviewRefId: refs.guardianReviewRef.id
    }
  });
  proposeUseRight(services, {
    eventId: "event.stewardship.use_right.proposed.school-crop-share",
    occurredAt,
    actorRef: refs.actorRef,
    useRightRef: refs.useRightRef,
    proposalRef: refs.proposalRef,
    scope: useRightScope(refs),
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    rationale: "School procurement need is verified and guardian review approved a low-runoff route."
  });
  grantUseRight(services, {
    eventId: "event.stewardship.use_right.granted.school-crop-share",
    occurredAt,
    actorRef: refs.actorRef,
    useRightRef: refs.useRightRef,
    decisionRef: refs.decisionRef,
    scope: useRightScope(refs),
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef, refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    grantNote: "Temporary crop-share use right under guardian conditions."
  });
  createCommitment(servicesForAccounting(services), {
    eventId: "event.coordination.commitment.created.delivery",
    occurredAt,
    actorRef: refs.actorRef,
    commitmentRef: refs.commitmentRef,
    relatedRefs: [refs.needRef, refs.offerRef, refs.useRightRef, refs.decisionRef],
    committedByRef: refs.actorRef,
    authorityRefs: [refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Deliver produce boxes to Northside School Kitchen",
    dueAt: "2026-06-15T16:00:00.000Z"
  });

  createLedgerAccount(servicesForAccounting(services), {
    occurredAt,
    actorRef: refs.actorRef,
    authorityRefs: [refs.mandateRef],
    ledgerAccountRef: refs.cashLedgerRef,
    orgId,
    commonsId,
    accountCode: "1000",
    label: "Food commons reserve",
    normalSide: "debit"
  });
  createLedgerAccount(servicesForAccounting(services), {
    occurredAt,
    actorRef: refs.actorRef,
    authorityRefs: [refs.mandateRef],
    ledgerAccountRef: refs.stewardshipLedgerRef,
    orgId,
    commonsId,
    accountCode: "5100",
    label: "Stewardship allocation",
    normalSide: "credit"
  });
  postLedgerEntry(servicesForAccounting(services), {
    occurredAt,
    actorRef: refs.actorRef,
    authorityRefs: [refs.decisionRef],
    ledgerEntryRef: refs.ledgerEntryRef,
    orgId,
    commonsId,
    memo: "Allocate coordination budget for low-runoff school crop share.",
    lines: [
      {
        accountRef: refs.stewardshipLedgerRef,
        side: "debit",
        amount: 2000,
        unit: "COMMON_CREDIT",
        relatedRefs: [refs.useRightRef, refs.commitmentRef]
      },
      {
        accountRef: refs.cashLedgerRef,
        side: "credit",
        amount: 2000,
        unit: "COMMON_CREDIT",
        relatedRefs: [refs.decisionRef]
      }
    ]
  });

  createTask(services, {
    eventId: "event.stewardship.task.created.deliver-produce",
    occurredAt,
    actorRef: refs.actorRef,
    taskRef: refs.taskRef,
    title: "Deliver twenty produce boxes",
    assignedToRefs: [refs.actorRef],
    resourceRefs: [refs.resourceRef],
    commitmentRef: refs.commitmentRef,
    useRightRef: refs.useRightRef,
    authorityRefs: [refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dueAt: "2026-06-15T16:00:00.000Z"
  });
  recordFoodFlow(services, {
    eventId: "event.flow.food.recorded.school-produce-delivery",
    occurredAt,
    actorRef: refs.actorRef,
    flowRef: refs.flowRef,
    resourceRef: refs.resourceRef,
    taskRef: refs.taskRef,
    useRightRef: refs.useRightRef,
    commitmentRef: refs.commitmentRef,
    outcomeRef: refs.outcomeRef,
    thresholdRefs: [refs.thresholdRef],
    authorityRefs: [refs.decisionRef, refs.useRightRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    quantity: "20 boxes",
    from: "Green Acre Farm",
    to: "Northside School Kitchen",
    watershedSafeguard: "no additional irrigation"
  });
  completeTask(services, {
    eventId: "event.stewardship.task.completed.deliver-produce",
    occurredAt,
    actorRef: refs.actorRef,
    taskRef: refs.taskRef,
    completedByRef: refs.actorRef,
    evidenceRefs: [refs.evidenceRef],
    flowRefs: [refs.flowRef],
    outcomeRef: refs.outcomeRef,
    authorityRefs: [refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId
  });

  recordLearningOutcome(services, {
    eventId: "event.learning.outcome.recorded.school-meals",
    occurredAt,
    actorRef: refs.actorRef,
    outcomeRef: refs.outcomeRef,
    relatedRefs: [refs.flowRef, refs.claimRef, refs.decisionRef, refs.thresholdRef],
    authorityRefs: [refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "School meal produce gap closed",
    outcome: "twenty boxes delivered without additional irrigation",
    metric: "meal_cycles_supported",
    value: 3
  });
  completeLearningRetrospective(services, {
    eventId: "event.learning.retrospective.completed.food-flow",
    occurredAt,
    actorRef: refs.actorRef,
    retrospectiveRef: refs.retrospectiveRef,
    relatedRefs: [refs.outcomeRef, refs.guardianReviewRef, refs.thresholdRef],
    authorityRefs: [refs.decisionRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Food-flow threshold breach retrospective",
    summary: "Guardian conditions let the commons meet meal needs while preserving watershed safeguards.",
    nextPolicyQuestion: "Should breach-window food flows default to low-runoff route checks?"
  });

  recordThresholdBreach(services, {
    eventId: "event.ecology.threshold.breached.mill-creek-nitrate-worsened",
    occurredAt,
    actorRef: refs.actorRef,
    thresholdRef: refs.thresholdRef,
    indicatorRef: refs.indicatorRef,
    relatedRefs: [refs.livingSystemRef, refs.retrospectiveRef, refs.adaptiveIssueRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    title: "Mill Creek nitrate threshold worsened",
    observedValue: 18.7,
    unit: "mg/L",
    observedAt: occurredAt,
    requiresGuardianReview: true
  });
  createIssue(services, {
    occurredAt,
    actorRef: refs.actorRef,
    issue: makeAdaptiveIssue(refs)
  });
  createProposal(services, {
    occurredAt,
    actorRef: refs.actorRef,
    proposal: makeAdaptiveProposal(refs)
  });
  submitAmendment(services, {
    occurredAt,
    actorRef: refs.actorRef,
    amendment: makeAdaptiveAmendment(refs)
  });
  raiseObjection(services, {
    occurredAt,
    actorRef: refs.actorRef,
    objection: makeAdaptiveObjection(refs)
  });
  requestGuardianReview(services, {
    eventId: "event.ecology.guardian.review_requested.mill-creek-policy-adaptation",
    occurredAt,
    actorRef: refs.actorRef,
    guardianReviewRef: refs.adaptiveGuardianReviewRef,
    proposalRef: refs.adaptiveProposalRef,
    thresholdRef: refs.thresholdRef,
    subjectRefs: [
      refs.thresholdRef,
      refs.useRightRef,
      refs.policyRef,
      refs.adaptiveProposalRef,
      refs.retrospectiveRef
    ],
    guardianRefs: [refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    title: "Guardian review for worsened Mill Creek threshold",
    reason: "Learning retrospective and worsened nitrate reading require adaptive policy review."
  });
  completeGuardianReview(services, {
    eventId: "event.ecology.guardian.review_completed.mill-creek-policy-adaptation",
    occurredAt,
    actorRef: refs.actorRef,
    guardianReviewRef: refs.adaptiveGuardianReviewRef,
    subjectRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef, refs.adaptiveProposalRef],
    guardianRefs: [refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    orgId,
    title: "Adaptive guardian review completed",
    outcome: "pause_and_revise",
    conditions: [
      "Revoke the active food-flow use right until a fresh route is approved.",
      "Reverse the coordination allocation if the route cannot proceed.",
      "Version the breach-window policy with a worsening-threshold pause rule."
    ],
    evidenceRefs: [refs.retrospectiveRef, refs.outcomeRef]
  });
  recordDecision(services, {
    occurredAt,
    actorRef: refs.actorRef,
    decision: makeAdaptiveDecision(refs),
    controls: {
      evaluatedAt: occurredAt,
      delegatedAuthorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
      appealPathRef: refs.appealPathRef
    }
  });
  revokeUseRight(services, {
    eventId: "event.stewardship.use_right.revoked.school-crop-share",
    occurredAt,
    actorRef: refs.actorRef,
    useRightRef: refs.useRightRef,
    holderRef: refs.actorRef,
    resourceRef: refs.resourceRef,
    decisionRef: refs.adaptiveDecisionRef,
    revocationPathRef: refs.adaptiveGuardianReviewRef,
    appealPathRef: refs.appealPathRef,
    relatedRefs: [refs.thresholdRef, refs.retrospectiveRef],
    authorityRefs: [
      refs.adaptiveDecisionRef,
      refs.mandateRef,
      refs.watershedGuardianRef
    ],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    reason: "Mill Creek nitrate threshold worsened after the delivery route was approved."
  });
  reverseLedgerEntry(servicesForAccounting(services), {
    eventId: "event.accounting.ledger_entry.reversed.food-flow-allocation",
    occurredAt,
    actorRef: refs.actorRef,
    authorityRefs: [refs.adaptiveDecisionRef],
    reversalLedgerEntryRef: refs.reversalLedgerEntryRef,
    originalEventId: "event.accounting.ledger_entry.posted.ledger-entry.food-flow-allocation",
    orgId,
    commonsId,
    memo: "Reverse food-flow allocation after guardian review paused the route."
  });
  createTask(services, {
    eventId: "event.stewardship.task.created.review-food-flow-policy",
    occurredAt,
    actorRef: refs.actorRef,
    taskRef: refs.adaptiveTaskRef,
    title: "Review breach-window food-flow policy",
    assignedToRefs: [refs.actorRef, refs.watershedGuardianRef],
    resourceRefs: [refs.resourceRef],
    useRightRef: refs.useRightRef,
    authorityRefs: [refs.adaptiveDecisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dueAt: "2026-06-18T16:00:00.000Z",
    priority: "urgent"
  });
  versionPolicy(services, {
    eventId: "event.governance.policy.versioned.breach-window-food-flow",
    occurredAt,
    actorRef: refs.actorRef,
    policyVersion: makeAdaptivePolicyVersion(refs),
    relatedRefs: [
      refs.adaptiveIssueRef,
      refs.adaptiveProposalRef,
      refs.adaptiveAmendmentRef,
      refs.adaptiveGuardianReviewRef,
      refs.retrospectiveRef,
      refs.thresholdRef,
      refs.useRightRef,
      refs.reversalLedgerEntryRef
    ]
  });
  requestRedaction(services, {
    eventId: "event.stewardship.redaction.requested.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    requestRef: refs.redactionRequestRef,
    targetRef: refs.evidenceRef,
    targetEventId: "event.evidence.created.school-kitchen-intake",
    reason: "vulnerable_group_protection",
    method: "field_generalized",
    requestedFields: ["payload.schoolContact", "payload.pickupNotes"],
    preservedFields: ["id", "type", "occurredAt", "objectRef", "relatedRefs", "authorityRefs"],
    dataStewardshipAgreementRef: refs.dataStewardshipAgreementRef,
    relatedRefs: [refs.adaptiveObjectionRef, refs.adaptiveDecisionRef],
    authorityRefs: [refs.adaptiveDecisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Minority report requests export-safe handling for school kitchen details."
  });
  applyRedaction(services, {
    eventId: "event.system.redaction.applied.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    redactionRef: refs.redactionRef,
    originalEventId: "event.evidence.created.school-kitchen-intake",
    targetRef: refs.evidenceRef,
    reason: "vulnerable_group_protection",
    method: "field_generalized",
    redactedFields: ["payload.schoolContact", "payload.pickupNotes"],
    preservedFields: ["id", "type", "occurredAt", "objectRef", "relatedRefs", "authorityRefs"],
    originalContentHash: "sha256:school-kitchen-intake-full",
    redactedContentHash: "sha256:school-kitchen-intake-redacted",
    dataStewardshipAgreementRef: refs.dataStewardshipAgreementRef,
    authorityRefs: [refs.adaptiveDecisionRef, refs.dataStewardshipAgreementRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Export preserves evidence continuity while removing sensitive school contact and pickup detail."
  });
  recordDecisionPacket(services, {
    occurredAt,
    actorRef: refs.actorRef,
    decisionPacket: makeAdaptiveDecisionPacket(refs)
  });

  setVisibilityRule(services, {
    eventId: "event.stewardship.data_visibility_rule.set.phase-7-export",
    occurredAt,
    actorRef: refs.actorRef,
    agreementRef: refs.dataStewardshipAgreementRef,
    governedRef: refs.retrospectiveRef,
    stewardRefs: [refs.actorRef, refs.watershedGuardianRef],
    visibility: "federation",
    allowedUses: ["coordinate", "govern", "federate"],
    prohibitedUses: ["commercialize"],
    consentRequired: false,
    authorityRefs: [refs.decisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Federated learning export may include object refs, event trail, and redaction summary."
  });
  approveExport(services, {
    eventId: "event.federation.export.approved.riverbend-phase-7",
    occurredAt,
    actorRef: refs.actorRef,
    exportRef: refs.exportRef,
    recipientRef: refs.federationPeerRef,
    objectRefs: [
      refs.thresholdRef,
      refs.claimRef,
      refs.proposalRef,
      refs.guardianReviewRef,
      refs.decisionRef,
      refs.useRightRef,
      refs.flowRef,
      refs.outcomeRef,
      refs.retrospectiveRef,
      refs.adaptiveProposalRef,
      refs.adaptiveAmendmentRef,
      refs.adaptiveObjectionRef,
      refs.adaptiveDecisionRef,
      refs.adaptiveDecisionPacketRef,
      refs.policyRef,
      refs.redactionRef
    ],
    format: "json",
    includeRedactionStubs: true,
    authorityRefs: [refs.decisionRef, refs.dataStewardshipAgreementRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    exportRule: {
      id: "export-rule.riverbend-phase-7-learning",
      exportAllowed: true,
      allowedFormats: ["json"],
      allowedObjectTypes: [
        "threshold",
        "claim",
        "proposal",
        "amendment",
        "objection",
        "guardian-review",
        "decision",
        "decision-packet",
        "use-right",
        "flow",
        "task",
        "evidence",
        "policy"
      ],
      allowedRecipientRefs: [refs.federationPeerRef],
      prohibitedRecipientRefs: [],
      includeRedactionStubs: true,
      consentRequired: false,
      authorityRefs: [refs.decisionRef, refs.dataStewardshipAgreementRef]
    },
    note: "Approve Phase 7 proof-path export."
  });

  const events = memory.replay().events;

  return {
    refs,
    steps: reconcileStepsWithEvents(steps, events),
    events,
    civicMemory: buildCivicMemoryProjection(events, { scope: { orgRef: orgId } }),
    objectPages: {
      threshold: buildObjectPageProjection(refs.thresholdRef, events),
      decision: buildObjectPageProjection(refs.decisionRef, events),
      useRight: buildObjectPageProjection(refs.useRightRef, events),
      outcome: buildObjectPageProjection(refs.outcomeRef, events)
    },
    federationExport: buildFederationExportEnvelopeReadModel(events, {
      exportedAt: occurredAt,
      exportedByRef: refs.actorRef,
      scopeRef: refs.commonsRef,
      format: "json",
      federationRuleRef: refs.dataStewardshipAgreementRef
    })
  };
}

export function executeRiverbendTrustHardeningSlice(): RiverbendTrustHardeningSliceResult {
  const phase7 = executeRiverbendCyberneticSlice();
  const registry = createObjectRegistry();
  const memory = createInMemoryCivicMemory(phase7.events);
  const services = { registry, memory };
  const refs = phase7.refs;

  openAppeal(services, {
    eventId: "event.governance.appeal.opened.food-flow-pause",
    occurredAt,
    actorRef: refs.actorRef,
    appeal: makeAdaptiveAppeal(refs)
  });
  recordConsent(services, {
    eventId: "event.stewardship.consent.recorded.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    consentRef: refs.schoolConsentRef,
    ruleRef: refs.dataStewardshipAgreementRef,
    rule: {
      id: "consent-rule.school-kitchen-intake-export",
      status: "granted",
      scope: "object",
      subjectRef: refs.evidenceRef,
      consentingRefs: [refs.actorRef],
      purpose: "Federated proof path with contact details kept local.",
      allowedUses: ["govern", "federate"],
      revocable: true,
      revocationProcessRef: refs.appealPathRef,
      evidenceRefs: [refs.evidenceRef]
    },
    consentingRef: refs.actorRef,
    subjectRef: refs.evidenceRef,
    evidenceRefs: [refs.evidenceRef],
    authorityRefs: [refs.dataStewardshipAgreementRef, refs.adaptiveDecisionRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Temporary consent permits federation of an export-safe proof path."
  });
  revokeConsent(services, {
    eventId: "event.stewardship.consent.revoked.school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    consentRef: refs.schoolConsentRevocationRef,
    ruleRef: refs.dataStewardshipAgreementRef,
    consentingRef: refs.actorRef,
    supersedesConsentRecordId: refs.schoolConsentRef.id,
    revocationReason: "School kitchen withdraws permission for contact-bearing details after appeal opens.",
    authorityRefs: [refs.dataStewardshipAgreementRef, refs.adaptiveAppealRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Consent revocation triggers a second continuity-preserving redaction."
  });
  requestRedaction(services, {
    eventId: "event.stewardship.redaction.requested.consent-revoked-school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    requestRef: refs.consentRedactionRequestRef,
    targetRef: refs.evidenceRef,
    targetEventId: "event.evidence.created.school-kitchen-intake",
    reason: "consent_revoked",
    method: "stub_only",
    requestedFields: ["payload.schoolContact", "payload.pickupNotes", "payload.deliveryAccessNotes"],
    preservedFields: ["id", "type", "occurredAt", "objectRef", "relatedRefs", "authorityRefs"],
    dataStewardshipAgreementRef: refs.dataStewardshipAgreementRef,
    relatedRefs: [refs.schoolConsentRevocationRef, refs.adaptiveAppealRef, refs.adaptiveDecisionPacketRef],
    authorityRefs: [refs.adaptiveAppealRef, refs.dataStewardshipAgreementRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Appeal-triggered consent revocation requests export-safe evidence stubs."
  });
  applyRedaction(services, {
    eventId: "event.system.redaction.applied.consent-revoked-school-kitchen-intake",
    occurredAt,
    actorRef: refs.actorRef,
    redactionRef: refs.consentRedactionRef,
    originalEventId: "event.evidence.created.school-kitchen-intake",
    targetRef: refs.evidenceRef,
    reason: "consent_revoked",
    method: "stub_only",
    redactedFields: ["payload.schoolContact", "payload.pickupNotes", "payload.deliveryAccessNotes"],
    preservedFields: ["id", "type", "occurredAt", "objectRef", "relatedRefs", "authorityRefs"],
    originalContentHash: "sha256:school-kitchen-intake-full",
    redactedContentHash: "sha256:school-kitchen-intake-consent-revoked-stub",
    dataStewardshipAgreementRef: refs.dataStewardshipAgreementRef,
    authorityRefs: [refs.adaptiveAppealRef, refs.dataStewardshipAgreementRef],
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    note: "Consent revocation keeps the original event replayable while replacing export detail with a stub."
  });

  const events = memory.replay().events;
  const phase8EventIds = events.slice(phase7.events.length).map((event) => event.id);

  return {
    refs,
    steps: reconcileStepsWithEvents(phase7.steps, events),
    events,
    phase8EventIds,
    civicMemory: buildCivicMemoryProjection(events, { scope: { orgRef: orgId } }),
    objectPages: {
      threshold: buildObjectPageProjection(refs.thresholdRef, events),
      decision: buildObjectPageProjection(refs.adaptiveDecisionRef, events),
      useRight: buildObjectPageProjection(refs.useRightRef, events),
      outcome: buildObjectPageProjection(refs.outcomeRef, events)
    },
    federationExport: buildFederationExportEnvelopeReadModel(events, {
      exportedAt: occurredAt,
      exportedByRef: refs.actorRef,
      scopeRef: refs.commonsRef,
      format: "json",
      federationRuleRef: refs.dataStewardshipAgreementRef
    })
  };
}

export function buildRiverbendPersistedRuntimeScenario(): RiverbendPersistedRuntimeScenario {
  const slice = executeRiverbendCyberneticSlice();
  const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
  const materializedProjectionStore = createInMemoryMaterializedProjectionStore();
  const scope: CanopyShellScope = {
    label: "Riverbend Foodshed Commons",
    scope: { orgRef: orgId }
  };

  for (const event of slice.events) {
    runtime.appendEvent(event, { recordedAt: occurredAt });
  }

  const projectionRebuild = rebuildAndPersistAllProjections(runtime, {
    rebuiltAt: occurredAt,
    materializedProjections: materializedProjectionStore,
    civicMemory: { scope: scope.scope },
    federationExport: {
      exportedAt: occurredAt,
      exportedByRef: slice.refs.actorRef,
      scopeRef: slice.refs.commonsRef,
      federationRuleRef: slice.refs.dataStewardshipAgreementRef,
      format: "json"
    }
  });
  const materializedDocuments = queryMaterializedProjections(materializedProjectionStore).items;
  const shell = buildPersistedCanopyShellSnapshot({
    runtime,
    scope,
    selectedObjectRef: slice.refs.thresholdRef,
    activeMode: "objects",
    rebuiltAt: occurredAt,
    materializedProjectionStore,
    materializedProjections: materializedDocuments,
    persistProjectionState: false
  });

  return {
    slice,
    runtime,
    materializedProjectionStore,
    materializedDocuments,
    projectionRebuild,
    scope,
    shell,
    shellSessions: {
      threshold: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: objectRoute(slice.refs.thresholdRef),
        selectedObjectRef: slice.refs.thresholdRef
      }),
      decision: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: "/decisions",
        selectedObjectRef: slice.refs.decisionRef
      }),
      resource: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: "/resource-care",
        selectedObjectRef: slice.refs.resourceRef
      }),
      useRight: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: objectRoute(slice.refs.useRightRef),
        selectedObjectRef: slice.refs.useRightRef
      }),
      outcome: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: objectRoute(slice.refs.outcomeRef),
        selectedObjectRef: slice.refs.outcomeRef
      }),
      federation: buildScenarioSession({
        runtime,
        scope,
        materializedDocuments,
        route: "/federation",
        selectedObjectRef: slice.refs.exportRef
      })
    }
  };
}

function riverbendRefs(): RiverbendCyberneticSliceRefs {
  return {
    actorRef: ref("person.mira", "person"),
    watershedGuardianRef: ref("guardian-review.mill-creek", "guardian-review"),
    federationPeerRef: ref("organization.upriver-food-commons", "organization"),
    mandateRef: ref("mandate.food-resilience-2026", "mandate"),
    dataStewardshipAgreementRef: ref(
      "agreement.data-stewardship.riverbend-phase-7",
      "agreement"
    ),
    appealPathRef: ref("policy.food-flow-appeal-path", "policy", "governance"),
    commonsRef: ref(commonsId, "commons"),
    livingSystemRef: ref(livingSystemId, "living-system"),
    indicatorRef: ref("indicator.mill-creek-nitrate", "indicator"),
    thresholdRef: ref("threshold.mill-creek-nitrate", "threshold"),
    needRef: ref("need.northside-school-produce", "need"),
    offerRef: ref("offer.green-acre-surplus-produce", "offer"),
    claimRef: ref("claim.school-meal-produce-need", "claim"),
    evidenceRef: ref("evidence.school-kitchen-intake", "evidence"),
    sourceRef: ref("source.school-kitchen-intake", "source"),
    issueRef: ref("issue.food-resilience-threshold-breach", "issue", "governance"),
    scenarioRef: ref("model.low-runoff-food-route", "model"),
    proposalRef: ref("proposal.route-surplus-to-school", "proposal", "governance"),
    guardianReviewRef: ref("guardian-review.mill-creek-food-flow", "guardian-review"),
    decisionRef: ref("decision.route-surplus-to-school", "decision", "governance"),
    resourceRef: ref("resource.green-acre-surplus-produce", "resource"),
    useRightRef: ref("use-right.school-crop-share", "use-right"),
    commitmentRef: ref("commitment.deliver-school-produce", "commitment"),
    taskRef: ref("task.deliver-school-produce", "task"),
    flowRef: ref("flow.green-acre-to-northside", "flow"),
    outcomeRef: ref("outcome.school-meal-produce-gap-closed", "evidence"),
    retrospectiveRef: ref("retrospective.food-flow-threshold-breach", "evidence"),
    adaptiveIssueRef: ref("issue.food-flow-policy-gap", "issue", "governance"),
    adaptiveProposalRef: ref(
      "proposal.pause-and-revise-breach-window-food-flow",
      "proposal",
      "governance"
    ),
    adaptiveAmendmentRef: ref(
      "amendment.breach-window-pause-rule",
      "amendment",
      "governance"
    ),
    adaptiveObjectionRef: ref(
      "objection.downstream-school-data-stewardship",
      "objection",
      "governance"
    ),
    adaptiveDecisionRef: ref(
      "decision.pause-and-revise-food-flow-policy",
      "decision",
      "governance"
    ),
    adaptiveDecisionPacketRef: ref(
      "decision-packet.pause-and-revise-food-flow-policy",
      "decision-packet",
      "governance"
    ),
    adaptiveGuardianReviewRef: ref(
      "guardian-review.mill-creek-policy-adaptation",
      "guardian-review"
    ),
    adaptiveAppealRef: ref(
      "appeal.food-flow-pause-data-stewardship",
      "appeal",
      "governance"
    ),
    schoolConsentRef: ref(
      "agreement.consent.school-kitchen-intake-export",
      "agreement"
    ),
    schoolConsentRevocationRef: ref(
      "agreement.consent-revocation.school-kitchen-intake-export",
      "agreement"
    ),
    policyRef: ref("policy.breach-window-food-flow", "policy", "governance"),
    policyVersionRef: ref(
      "policy-version.breach-window-food-flow.v2",
      "policy",
      "governance"
    ),
    adaptiveTaskRef: ref("task.review-breach-window-food-flow-policy", "task"),
    redactionRequestRef: ref("redaction-request.school-kitchen-intake", "evidence"),
    redactionRef: ref("redaction.school-kitchen-intake", "evidence"),
    consentRedactionRequestRef: ref(
      "redaction-request.consent-revoked-school-kitchen-intake",
      "evidence"
    ),
    consentRedactionRef: ref(
      "redaction.consent-revoked-school-kitchen-intake",
      "evidence"
    ),
    exportRef: ref("agreement.export.riverbend-phase-7", "agreement"),
    cashLedgerRef: ref("ledger-account.food-commons-reserve", "ledger-account"),
    stewardshipLedgerRef: ref("ledger-account.stewardship-allocation", "ledger-account"),
    ledgerEntryRef: ref("ledger-entry.food-flow-allocation", "ledger-entry"),
    reversalLedgerEntryRef: ref("ledger-entry.food-flow-allocation-reversal", "ledger-entry")
  };
}

function buildScenarioSession(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly scope: CanopyShellScope;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly route: string;
  readonly selectedObjectRef: ObjectRef;
}): CanopyShellSession {
  return buildPersistedCanopyShellSession({
    runtime: input.runtime,
    scope: input.scope,
    route: input.route,
    selectedObjectRef: input.selectedObjectRef,
    materializedProjections: input.materializedDocuments,
    rebuiltAt: occurredAt,
    persistProjectionState: false
  }).session;
}

function objectRoute(ref: ObjectRef): string {
  return `/objects/${ref.type}/${encodeURIComponent(ref.id)}`;
}

function reconcileStepsWithEvents(
  steps: readonly RiverbendCyberneticSliceStep[],
  events: readonly CanopyEvent[]
): readonly RiverbendCyberneticSliceStep[] {
  const explicitSteps = new Map(steps.map((step) => [step.eventId, step]));

  return events.map((event) => {
    const step = explicitSteps.get(event.id);

    if (step !== undefined) {
      return step;
    }

    return {
      phase: phaseForEventType(event.type),
      eventId: event.id,
      eventType: event.type,
      objectRef: event.objectRef
    };
  });
}

function phaseForEventType(type: CanopyEventType): CyberneticPhase {
  if (
    type.startsWith("ecology.") ||
    type.startsWith("coordination.need.") ||
    type.startsWith("coordination.offer.")
  ) {
    return type.includes("guardian") ? "deliberate" : "observe";
  }

  if (
    type.startsWith("claim.") ||
    type.startsWith("evidence.")
  ) {
    return "understand";
  }

  if (type.startsWith("model.")) {
    return "simulate";
  }

  if (type.startsWith("governance.")) {
    return "deliberate";
  }

  if (
    type.startsWith("stewardship.use_right.") ||
    type.startsWith("coordination.commitment.") ||
    type.startsWith("accounting.")
  ) {
    return "coordinate";
  }

  if (type.startsWith("stewardship.task.") || type.startsWith("flow.")) {
    return "act";
  }

  if (type.startsWith("learning.")) {
    return "learn";
  }

  if (type.startsWith("federation.") || type.includes("data_visibility_rule")) {
    return "federate";
  }

  return "coordinate";
}

function makeIssue(refs: RiverbendCyberneticSliceRefs): Issue {
  return {
    schemaVersion: "0.0.0",
    id: refs.issueRef.id,
    type: "issue",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueType: "threshold_breach",
    title: "Route verified surplus crop during Mill Creek breach",
    description: "Decide whether the surplus crop can meet school meal needs under watershed conditions.",
    priority: "high",
    scope: {
      orgId,
      affectedRefs: [refs.needRef, refs.offerRef, refs.thresholdRef, refs.resourceRef]
    },
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef],
    perspectiveRefs: [],
    proposalRefs: [refs.proposalRef],
    decisionRefs: []
  };
}

function makeProposal(refs: RiverbendCyberneticSliceRefs): Proposal {
  return {
    schemaVersion: "0.0.0",
    id: refs.proposalRef.id,
    type: "proposal",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef: refs.issueRef,
    proposalType: "operational_action",
    title: "Route Green Acre surplus to Northside School",
    summary: "Grant a temporary use right, budget allocation, and low-runoff delivery task.",
    proposedByRefs: [refs.actorRef],
    affectedRefs: [refs.needRef, refs.offerRef, refs.thresholdRef, refs.resourceRef],
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef],
    perspectiveRefs: [],
    scenarioRefs: [refs.scenarioRef],
    amendmentRefs: [],
    objectionRefs: [],
    decisionMethod: decisionMethod(refs),
    deliberationWindow: {},
    conditions: ["guardian review must approve the breach-window route"]
  };
}

function makeDecision(refs: RiverbendCyberneticSliceRefs): Decision {
  return {
    schemaVersion: "0.0.0",
    id: refs.decisionRef.id,
    type: "decision",
    orgId,
    status: "resolved",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRefs: [refs.issueRef],
    proposalRefs: [refs.proposalRef],
    outcome: "passed",
    effect: "binding",
    method: decisionMethod(refs),
    decidedAt: occurredAt,
    decidedByRefs: [refs.actorRef, refs.watershedGuardianRef],
    affectedRefs: [refs.needRef, refs.offerRef, refs.thresholdRef, refs.resourceRef],
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "Evidence supports the school need and guardian review approved a low-runoff route.",
    conditions: [
      "No additional irrigation during the threshold breach.",
      "Record delivery outcome and retrospective."
    ],
    obligationRefs: [refs.commitmentRef],
    agreementRefs: [refs.dataStewardshipAgreementRef],
    policyRefs: [],
    appealPathRef: refs.appealPathRef,
    supersedesDecisionRefs: []
  };
}

function makeAdaptiveIssue(refs: RiverbendCyberneticSliceRefs): Issue {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveIssueRef.id,
    type: "issue",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueType: "policy_gap",
    title: "Adapt food-flow policy after worsened threshold",
    description: "The first route satisfied its conditions, but later monitoring shows the policy needs an explicit pause-and-revise rule.",
    priority: "urgent",
    scope: {
      orgId,
      affectedRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef]
    },
    claimRefs: [],
    evidenceRefs: [refs.retrospectiveRef, refs.outcomeRef],
    perspectiveRefs: [],
    proposalRefs: [refs.adaptiveProposalRef],
    decisionRefs: []
  };
}

function makeAdaptiveProposal(refs: RiverbendCyberneticSliceRefs): Proposal {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveProposalRef.id,
    type: "proposal",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef: refs.adaptiveIssueRef,
    proposalType: "policy_change",
    title: "Pause and revise breach-window food flows",
    summary: "Add an adaptive pause rule, revoke the current use right, and reverse the allocation if watershed conditions worsen.",
    proposedByRefs: [refs.actorRef, refs.watershedGuardianRef],
    affectedRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef],
    claimRefs: [],
    evidenceRefs: [refs.retrospectiveRef, refs.outcomeRef],
    perspectiveRefs: [],
    scenarioRefs: [refs.scenarioRef],
    amendmentRefs: [refs.adaptiveAmendmentRef],
    objectionRefs: [],
    decisionMethod: adaptiveDecisionMethod(refs),
    deliberationWindow: {
      closesAt: "2026-06-18T16:00:00.000Z"
    },
    conditions: ["guardian review must confirm the threshold worsening before revocation"]
  };
}

function makeAdaptiveAmendment(refs: RiverbendCyberneticSliceRefs): Amendment {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveAmendmentRef.id,
    type: "amendment",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    parentProposalRef: refs.adaptiveProposalRef,
    amendmentType: "condition_added",
    title: "Add worsening-threshold pause rule",
    summary: "Food-flow permissions pause when the same ecological threshold worsens before completion.",
    rationale: "The learning loop showed the first policy lacked a clear response to worsening indicators.",
    proposedByRef: refs.actorRef,
    proposedText: "If a breach-window threshold worsens before completion, pause the active use right, reverse pending allocation entries, and re-enter guardian review.",
    affectedRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef],
    claimRefs: [],
    evidenceRefs: [refs.retrospectiveRef, refs.outcomeRef]
  };
}

function makeAdaptiveObjection(refs: RiverbendCyberneticSliceRefs): Objection {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveObjectionRef.id,
    type: "objection",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [refs.dataStewardshipAgreementRef],
    proposalRef: refs.adaptiveProposalRef,
    authorRef: refs.actorRef,
    objectionType: "data_stewardship",
    text: "The export should not expose school contact details or pickup notes while proving why the route was paused.",
    severity: "high",
    disposition: "preserved",
    response: "Proceed with the adaptive decision while redacting sensitive evidence fields and preserving the objection in the decision packet.",
    responseByRef: refs.watershedGuardianRef,
    resolvedAt: occurredAt,
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef, refs.retrospectiveRef],
    preservationRationale: "The objection is not a veto, but it constrains export and future review."
  };
}

function makeAdaptiveDecision(refs: RiverbendCyberneticSliceRefs): Decision {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveDecisionRef.id,
    type: "decision",
    orgId,
    status: "resolved",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRefs: [refs.adaptiveIssueRef],
    proposalRefs: [refs.adaptiveProposalRef],
    outcome: "passed",
    effect: "binding",
    method: adaptiveDecisionMethod(refs),
    decidedAt: occurredAt,
    decidedByRefs: [refs.actorRef, refs.watershedGuardianRef],
    affectedRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef],
    claimRefs: [],
    evidenceRefs: [refs.retrospectiveRef, refs.outcomeRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "The worsened threshold activates the policy gap identified by the retrospective.",
    conditions: [
      "Pause the active use right.",
      "Reverse pending allocation.",
      "Version the food-flow policy before the route is re-approved."
    ],
    obligationRefs: [refs.adaptiveTaskRef],
    agreementRefs: [refs.dataStewardshipAgreementRef],
    policyRefs: [refs.policyRef],
    appealPathRef: refs.appealPathRef,
    supersedesDecisionRefs: [refs.decisionRef]
  };
}

function makeAdaptiveDecisionPacket(refs: RiverbendCyberneticSliceRefs): DecisionPacket {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveDecisionPacketRef.id,
    type: "decision-packet",
    orgId,
    status: "complete",
    issueRefs: [refs.adaptiveIssueRef],
    proposalRefs: [refs.adaptiveProposalRef],
    decisionRef: refs.adaptiveDecisionRef,
    authorityRefs: [refs.adaptiveDecisionRef, refs.mandateRef, refs.watershedGuardianRef],
    decisionMethod: adaptiveDecisionMethod(refs),
    scopeRefs: [refs.commonsRef, refs.livingSystemRef],
    affectedObjectRefs: [refs.thresholdRef, refs.useRightRef, refs.policyRef, refs.evidenceRef],
    claimRefs: [refs.claimRef],
    evidenceRefs: [refs.evidenceRef, refs.retrospectiveRef, refs.redactionRef],
    evidenceLinkRefs: [],
    perspectiveRefs: [],
    scenarioRefs: [refs.scenarioRef],
    modelRefs: [refs.scenarioRef],
    guardianReviewRefs: [refs.adaptiveGuardianReviewRef],
    unresolvedObjectionRefs: [refs.adaptiveObjectionRef],
    unresolvedObjectionsSummary: "A data-stewardship objection is preserved as a minority report; the decision proceeds only with redaction continuity.",
    outcome: "passed",
    rationale: "The adaptive branch must pause the route and version policy, while export must protect sensitive school evidence detail.",
    conditions: [
      "Preserve the objection in the packet.",
      "Apply redaction before federation export.",
      "Keep the original evidence event replayable through redaction continuity."
    ],
    obligationRefs: [refs.adaptiveTaskRef],
    agreementRefs: [refs.dataStewardshipAgreementRef],
    policyRefs: [refs.policyRef],
    policyVersionRefs: [refs.policyVersionRef],
    reviewAt: "2026-06-30T16:00:00.000Z",
    appealPathRef: refs.appealPathRef,
    ecologicalHooks: {
      relevance: "governance_trigger",
      affectedLivingSystemRefs: [refs.livingSystemRef],
      indicatorRefs: [refs.indicatorRef],
      thresholdRefs: [refs.thresholdRef],
      ecologicalClaimRefs: [refs.claimRef],
      impactModelRefs: [refs.scenarioRef],
      notes: "The packet preserves the ecological trigger and the governance response."
    },
    dataStewardship: {
      visibility: "federation",
      dataState: "sensitive",
      dataStewardshipAgreementRefs: [refs.dataStewardshipAgreementRef],
      consentSignalRefs: [],
      allowedUses: ["coordinate", "govern", "federate"],
      prohibitedUses: ["commercialize", "reidentify"],
      retentionRule: "retain redacted evidence summary with full detail sealed by local agreement",
      exportRule: "redaction stubs required for school evidence",
      federationRuleRefs: [refs.dataStewardshipAgreementRef]
    },
    redactionSummary: {
      hasRedactions: true,
      redactedRefs: [refs.evidenceRef],
      sealedRefs: [refs.sourceRef],
      reason: "vulnerable_group_protection",
      redactedByRef: refs.actorRef,
      redactedAt: occurredAt,
      continuityEventRefs: [refs.redactionRef]
    },
    eventRefs: [
      refs.adaptiveIssueRef,
      refs.adaptiveProposalRef,
      refs.adaptiveAmendmentRef,
      refs.adaptiveObjectionRef,
      refs.adaptiveDecisionRef,
      refs.redactionRef
    ],
    schemaVersions: [
      {
        contractName: "@canopy/contracts-governance",
        schemaVersion: "0.0.0"
      },
      {
        contractName: "@canopy/contracts-kernel",
        schemaVersion: "0.0.0"
      }
    ],
    contentHash: "sha256:riverbend-adaptive-decision-packet",
    createdAt: occurredAt,
    createdByRef: refs.actorRef
  };
}

function makeAdaptiveAppeal(refs: RiverbendCyberneticSliceRefs): Appeal {
  return {
    schemaVersion: "0.0.0",
    id: refs.adaptiveAppealRef.id,
    type: "appeal",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    authorityRefs: [refs.appealPathRef, refs.dataStewardshipAgreementRef],
    dataState: "contested",
    visibility: "commons",
    dataStewardshipAgreementRefs: [refs.dataStewardshipAgreementRef],
    targetRef: refs.adaptiveDecisionRef,
    openedByRef: refs.actorRef,
    grounds: [
      "The adaptive pause is valid, but the export record must prove consent revocation and preserve the minority report.",
      "Sensitive school details must remain local after consent is revoked."
    ],
    requestedRemedy: "Keep the original adaptive decision intact, add consent-revocation redaction continuity, and carry the appeal in the packet/export trace.",
    reviewerRefs: [refs.watershedGuardianRef],
    decisionRefs: [refs.adaptiveDecisionRef],
    evidenceRefs: [refs.evidenceRef, refs.redactionRef]
  };
}

function makeAdaptivePolicyVersion(refs: RiverbendCyberneticSliceRefs): PolicyVersion {
  return {
    schemaVersion: "0.0.0",
    id: refs.policyVersionRef.id,
    type: "policy-version",
    orgId,
    policyRef: refs.policyRef,
    version: "2",
    status: "active",
    title: "Breach-window food-flow policy v2",
    body: "When a threshold worsens during an approved breach-window food flow, the active use right pauses, pending allocations are reversed, and the route re-enters guardian review.",
    summaryOfChanges: "Adds a worsening-threshold pause, accounting correction, and guardian review loop.",
    decisionRef: refs.adaptiveDecisionRef,
    authorityRefs: [refs.adaptiveDecisionRef, refs.mandateRef, refs.watershedGuardianRef],
    effectiveAt: occurredAt,
    createdAt: occurredAt,
    createdByRef: refs.actorRef,
    dataState: "institutionally_certified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [refs.dataStewardshipAgreementRef]
  };
}

function decisionMethod(refs: RiverbendCyberneticSliceRefs) {
  return {
    kind: "guardian_review",
    eligibleVoterRefs: [refs.actorRef, refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    guardianReviewRequired: true,
    guardianRefs: [refs.watershedGuardianRef],
    thresholdRefs: [refs.thresholdRef],
    reviewRefs: [refs.guardianReviewRef],
    appealPathRef: refs.appealPathRef
  } as const;
}

function adaptiveDecisionMethod(refs: RiverbendCyberneticSliceRefs) {
  return {
    kind: "guardian_review",
    eligibleVoterRefs: [refs.actorRef, refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    guardianReviewRequired: true,
    guardianRefs: [refs.watershedGuardianRef],
    thresholdRefs: [refs.thresholdRef],
    reviewRefs: [refs.adaptiveGuardianReviewRef],
    appealPathRef: refs.appealPathRef
  } as const;
}

function useRightScope(refs: RiverbendCyberneticSliceRefs): UseRightScope {
  return {
    holderRef: refs.actorRef,
    resourceRef: refs.resourceRef,
    permissions: ["harvest.boxes.20", "deliver.school"],
    conditions: [
      "no additional irrigation during breach window",
      "record delivery outcome",
      "complete retrospective"
    ],
    term: {
      startsAt: "2026-06-15T00:00:00.000Z",
      endsAt: "2026-06-22T00:00:00.000Z"
    },
    review: {
      reviewPathRef: refs.guardianReviewRef,
      reviewAt: "2026-06-23T00:00:00.000Z"
    },
    revocation: {
      revocable: true,
      revocationPathRef: refs.guardianReviewRef,
      revocationConditions: ["threshold worsens", "school need withdrawn"]
    }
  };
}

function servicesForAccounting(services: {
  readonly registry: ReturnType<typeof createObjectRegistry>;
  readonly memory: ReturnType<typeof createInMemoryCivicMemory>;
}) {
  return {
    objectRegistry: services.registry,
    civicMemory: services.memory
  };
}

function ref(id: string, type: CanopyObjectType, refNamespace = namespace): ObjectRef {
  return {
    id,
    type,
    namespace: refNamespace,
    lifecycleStatus: "active"
  };
}

function registerRefs(
  registry: ReturnType<typeof createObjectRegistry>,
  refs: readonly (ObjectRef | undefined)[]
): void {
  for (const ref of refs) {
    if (ref !== undefined) {
      registry.register(ref);
    }
  }
}
