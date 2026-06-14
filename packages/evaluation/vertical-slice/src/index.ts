import type { Decision, Issue, Proposal } from "@canopy/contracts-governance";
import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import {
  createLedgerAccount,
  postLedgerEntry
} from "@canopy/capabilities-allocation-accounting";
import {
  createClaim,
  ingestEvidence,
  linkEvidenceToClaim,
  reviewClaim
} from "@canopy/capabilities-claims-evidence";
import {
  approveExport,
  setVisibilityRule
} from "@canopy/capabilities-data-stewardship";
import {
  createIssue,
  createProposal,
  recordDecision
} from "@canopy/capabilities-governance";
import {
  createResource,
  grantUseRight,
  proposeUseRight,
  recordResourceContext,
  type UseRightScope
} from "@canopy/capabilities-stewardship";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
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
  readonly exportRef: ObjectRef;
  readonly cashLedgerRef: ObjectRef;
  readonly stewardshipLedgerRef: ObjectRef;
  readonly ledgerEntryRef: ObjectRef;
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
  const append = createSliceAppender(registry, memory, steps);

  append("observe", {
    id: "event.ecology.living-system.created.mill-creek",
    type: "ecology.living_system.created",
    objectRef: refs.livingSystemRef,
    relatedRefs: [refs.commonsRef],
    authorityRefs: [refs.mandateRef],
    sourceCapability: "stewardship",
    payload: {
      title: "Mill Creek Watershed",
      summary: "Living system connected to the Riverbend food route."
    }
  });
  append("observe", {
    id: "event.ecology.threshold.created.mill-creek-nitrate",
    type: "ecology.threshold.created",
    objectRef: refs.thresholdRef,
    relatedRefs: [refs.livingSystemRef, refs.indicatorRef, refs.watershedGuardianRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    sourceCapability: "stewardship",
    payload: {
      title: "Mill Creek nitrate threshold",
      indicatorRefId: refs.indicatorRef.id,
      threshold: 10,
      unit: "mg/L",
      guardianReviewRequired: true
    }
  });
  append("observe", {
    id: "event.ecology.threshold.breached.mill-creek-nitrate",
    type: "ecology.threshold.breached",
    objectRef: refs.thresholdRef,
    relatedRefs: [refs.livingSystemRef, refs.indicatorRef, refs.issueRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    sourceCapability: "stewardship",
    dataState: "sensor_derived",
    payload: {
      title: "Mill Creek nitrate threshold breached",
      observedValue: 14.2,
      unit: "mg/L",
      observedAt: occurredAt,
      requiresGuardianReview: true
    }
  });
  append("observe", {
    id: "event.coordination.need.created.school-meals",
    type: "coordination.need.created",
    objectRef: refs.needRef,
    relatedRefs: [refs.commonsRef, refs.claimRef],
    authorityRefs: [refs.mandateRef],
    sourceCapability: "allocation-accounting",
    payload: {
      title: "Summer meal produce shortage",
      neededBy: "2026-06-17",
      quantity: "20 produce boxes"
    }
  });
  append("observe", {
    id: "event.coordination.offer.created.green-acre",
    type: "coordination.offer.created",
    objectRef: refs.offerRef,
    relatedRefs: [refs.resourceRef, refs.needRef],
    authorityRefs: [refs.mandateRef],
    sourceCapability: "allocation-accounting",
    payload: {
      title: "Green Acre surplus produce",
      quantity: "20 produce boxes",
      pickupWindow: "2026-06-15"
    }
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

  append("simulate", {
    id: "event.model.scenario.created.low-runoff-route",
    type: "model.scenario.created",
    objectRef: refs.scenarioRef,
    relatedRefs: [refs.thresholdRef, refs.needRef, refs.offerRef, refs.claimRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    sourceCapability: "ecological-modeling",
    dataState: "model_derived",
    payload: {
      title: "Low runoff food-flow route",
      summary: "Route surplus boxes without additional irrigation or creek-adjacent staging.",
      assumptions: ["no additional irrigation", "existing cold-chain capacity"],
      guardianReviewRequired: true
    }
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
  append("deliberate", {
    id: "event.ecology.guardian.review_requested.mill-creek-food-flow",
    type: "ecology.guardian.review_requested",
    objectRef: refs.guardianReviewRef,
    relatedRefs: [
      refs.thresholdRef,
      refs.livingSystemRef,
      refs.scenarioRef,
      refs.proposalRef,
      refs.claimRef
    ],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    sourceCapability: "governance",
    visibility: "guardian_restricted",
    payload: {
      title: "Guardian review for Mill Creek food-flow intervention",
      reason: "Threshold breach affects food-flow route conditions.",
      thresholdRefId: refs.thresholdRef.id,
      proposalRefId: refs.proposalRef.id
    }
  });
  append("deliberate", {
    id: "event.ecology.guardian.review_completed.mill-creek-food-flow",
    type: "ecology.guardian.review_completed",
    objectRef: refs.guardianReviewRef,
    relatedRefs: [refs.thresholdRef, refs.scenarioRef, refs.proposalRef],
    authorityRefs: [refs.mandateRef, refs.watershedGuardianRef],
    sourceCapability: "governance",
    visibility: "guardian_restricted",
    dataState: "expert_reviewed",
    payload: {
      title: "Guardian review completed",
      outcome: "approved_with_conditions",
      conditions: [
        "No additional irrigation during the breach window.",
        "Record delivery outcome and watershed follow-up."
      ]
    }
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
  append("coordinate", {
    id: "event.coordination.commitment.created.delivery",
    type: "coordination.commitment.created",
    objectRef: refs.commitmentRef,
    relatedRefs: [refs.needRef, refs.offerRef, refs.useRightRef, refs.decisionRef],
    authorityRefs: [refs.decisionRef],
    sourceCapability: "allocation-accounting",
    payload: {
      title: "Deliver produce boxes to Northside School Kitchen",
      committedByRefId: refs.actorRef.id,
      dueAt: "2026-06-15T16:00:00.000Z"
    }
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

  append("act", {
    id: "event.stewardship.task.created.deliver-produce",
    type: "stewardship.task.created",
    objectRef: refs.taskRef,
    relatedRefs: [refs.commitmentRef, refs.useRightRef, refs.resourceRef],
    authorityRefs: [refs.decisionRef],
    sourceCapability: "stewardship",
    payload: {
      title: "Deliver twenty produce boxes",
      assignedToRefId: refs.actorRef.id,
      dueAt: "2026-06-15T16:00:00.000Z"
    }
  });
  append("act", {
    id: "event.flow.food.recorded.school-produce-delivery",
    type: "flow.food.recorded",
    objectRef: refs.flowRef,
    relatedRefs: [refs.resourceRef, refs.useRightRef, refs.taskRef, refs.thresholdRef],
    authorityRefs: [refs.decisionRef, refs.useRightRef],
    sourceCapability: "stewardship",
    payload: {
      title: "Produce boxes moved to Northside School Kitchen",
      quantity: "20 boxes",
      from: "Green Acre Farm",
      to: "Northside School Kitchen",
      watershedSafeguard: "no additional irrigation"
    }
  });
  append("act", {
    id: "event.stewardship.task.completed.deliver-produce",
    type: "stewardship.task.completed",
    objectRef: refs.taskRef,
    relatedRefs: [refs.flowRef, refs.outcomeRef],
    authorityRefs: [refs.decisionRef],
    sourceCapability: "stewardship",
    payload: {
      title: "Delivery completed",
      completedAt: occurredAt,
      evidenceRefIds: [refs.evidenceRef.id]
    }
  });

  append("learn", {
    id: "event.learning.outcome.recorded.school-meals",
    type: "learning.outcome.recorded",
    objectRef: refs.outcomeRef,
    relatedRefs: [refs.flowRef, refs.claimRef, refs.decisionRef, refs.thresholdRef],
    authorityRefs: [refs.decisionRef],
    sourceCapability: "learning-accountability",
    payload: {
      title: "School meal produce gap closed",
      outcome: "twenty boxes delivered without additional irrigation",
      metric: "meal_cycles_supported",
      value: 3
    }
  });
  append("learn", {
    id: "event.learning.retrospective.completed.food-flow",
    type: "learning.retrospective.completed",
    objectRef: refs.retrospectiveRef,
    relatedRefs: [refs.outcomeRef, refs.guardianReviewRef, refs.thresholdRef],
    authorityRefs: [refs.decisionRef, refs.watershedGuardianRef],
    sourceCapability: "learning-accountability",
    payload: {
      title: "Food-flow threshold breach retrospective",
      summary: "Guardian conditions let the commons meet meal needs while preserving watershed safeguards.",
      nextPolicyQuestion: "Should breach-window food flows default to low-runoff route checks?"
    }
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
      refs.retrospectiveRef
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
        "guardian-review",
        "decision",
        "use-right",
        "flow",
        "task"
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
    exportRef: ref("agreement.export.riverbend-phase-7", "agreement"),
    cashLedgerRef: ref("ledger-account.food-commons-reserve", "ledger-account"),
    stewardshipLedgerRef: ref("ledger-account.stewardship-allocation", "ledger-account"),
    ledgerEntryRef: ref("ledger-entry.food-flow-allocation", "ledger-entry")
  };
}

function createSliceAppender(
  registry: ReturnType<typeof createObjectRegistry>,
  memory: ReturnType<typeof createInMemoryCivicMemory>,
  steps: RiverbendCyberneticSliceStep[]
): (
  phase: CyberneticPhase,
  input: Omit<
    CanopyEvent,
    "occurredAt" | "actorRef" | "schemaVersion" | "visibility" | "orgId" | "placeId" | "commonsId" | "livingSystemId"
  > & {
    readonly actorRef?: ObjectRef;
    readonly visibility?: CanopyEvent["visibility"];
    readonly orgId?: CanopyId;
    readonly placeId?: CanopyId;
    readonly commonsId?: CanopyId;
    readonly livingSystemId?: CanopyId;
  }
) => void {
  return (phase, input) => {
    registerRefs(registry, [
      input.objectRef,
      input.actorRef,
      ...input.relatedRefs,
      ...input.authorityRefs
    ]);

    const event: CanopyEvent = {
      occurredAt,
      actorRef: input.actorRef ?? riverbendRefs().actorRef,
      schemaVersion: 1,
      visibility: input.visibility ?? "commons",
      orgId: input.orgId ?? orgId,
      placeId: input.placeId ?? placeId,
      commonsId: input.commonsId ?? commonsId,
      livingSystemId: input.livingSystemId ?? livingSystemId,
      ...input
    };

    memory.appendEvent(event);
    steps.push({
      phase,
      eventId: event.id,
      eventType: event.type,
      objectRef: event.objectRef
    });
  };
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
