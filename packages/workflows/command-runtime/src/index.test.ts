import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import type {
  Amendment,
  Decision,
  Objection,
  PolicyVersion,
  Proposal
} from "@canopy/contracts-governance";
import {
  createClaim,
  type CreateClaimCommand
} from "@canopy/capabilities-claims-evidence";
import type { LinkEvidenceToClaimCommand } from "@canopy/capabilities-claims-evidence";
import type {
  CreateResourceCommand,
  CompleteTaskCommand,
  CreateTaskCommand,
  GrantUseRightCommand,
  RecordFoodFlowCommand,
  RevokeUseRightCommand,
  UseRightScope
} from "@canopy/capabilities-stewardship";
import type {
  CreateLivingSystemCommand,
  CreateModelScenarioCommand,
  CreateThresholdCommand,
  RecordThresholdBreachCommand
} from "@canopy/capabilities-ecological-modeling";
import type {
  CompleteGuardianReviewCommand,
  RaiseObjectionCommand,
  RequestGuardianReviewCommand,
  SubmitAmendmentCommand,
  VersionPolicyCommand
} from "@canopy/capabilities-governance";
import type {
  ApplyRedactionCommand,
  RequestRedactionCommand
} from "@canopy/capabilities-data-stewardship";
import type {
  CompleteLearningRetrospectiveCommand,
  RecordLearningOutcomeCommand
} from "@canopy/capabilities-learning-accountability";
import type {
  CreateCommitmentCommand,
  CreateNeedCommand,
  CreateOfferCommand,
  PostLedgerEntryCommand,
  ReverseLedgerEntryCommand
} from "@canopy/capabilities-allocation-accounting";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  executeCanopyCommand,
  executeCompleteGuardianReviewCommand,
  executeCompleteLearningRetrospectiveCommand,
  executeCompleteTaskCommand,
  executeCreateClaimCommand,
  executeCreateCommitmentCommand,
  executeCreateLivingSystemCommand,
  executeCreateModelScenarioCommand,
  executeCreateNeedCommand,
  executeCreateOfferCommand,
  executeCreateProposalCommand,
  executeCreateResourceCommand,
  executeCreateTaskCommand,
  executeCreateThresholdCommand,
  executeApplyRedactionCommand,
  executeGrantUseRightCommand,
  executeLinkEvidenceToClaimCommand,
  executeOpenProposalCommand,
  executePostLedgerEntryCommand,
  executeRaiseObjectionCommand,
  executeRecordDecisionCommand,
  executeRecordFoodFlowCommand,
  executeRecordLearningOutcomeCommand,
  executeRecordThresholdBreachCommand,
  executeRequestRedactionCommand,
  executeRequestGuardianReviewCommand,
  executeReverseLedgerEntryCommand,
  executeRevokeUseRightCommand,
  executeSubmitAmendmentCommand,
  executeVersionPolicyCommand
} from "./index.js";

const occurredAt = "2026-06-13T19:00:00.000Z";
const namespace = "canopy.command-runtime.test";
const orgId = "org.riverbend";
const actorRef = ref("person.mira", "person");
const claimRef = ref("claim.school-food-need", "claim");
const evidenceRef = ref("evidence.flow-gauge", "evidence");
const redactionRequestRef = ref("redaction-request.flow-gauge", "evidence");
const redactionRef = ref("redaction.flow-gauge", "evidence");
const issueRef = refIn("issue.water", "issue", "governance");
const proposalRef = refIn("proposal.water-rotation", "proposal", "governance");
const amendmentRef = refIn(
  "amendment.water-rotation-runoff-pause",
  "amendment",
  "governance"
);
const objectionRef = refIn(
  "objection.water-rotation-data-stewardship",
  "objection",
  "governance"
);
const decisionRef = refIn("decision.water-rotation", "decision", "governance");
const policyRef = refIn("policy.water-rotation", "policy", "governance");
const policyVersionRef = refIn(
  "policy-version.water-rotation-v2",
  "policy",
  "governance"
);
const roleAuthorityRef = ref("role.watershed-council", "role");
const resourceRef = ref("resource.north-pasture", "resource");
const holderRef = ref("person.eli", "person");
const useRightRef = ref("use-right.north-pasture-grazing", "use-right");
const reviewPathRef = ref("policy.seasonal-review", "policy");
const revocationPathRef = ref("appeal.use-right-revocation", "appeal");
const ledgerEntryRef = ref("ledger-entry.allocation-1", "ledger-entry");
const reversalLedgerEntryRef = ref(
  "ledger-entry.allocation-1-reversal",
  "ledger-entry"
);
const commonsAccountRef = ref("ledger-account.commons", "ledger-account");
const stewardshipAccountRef = ref(
  "ledger-account.stewardship",
  "ledger-account"
);
const thresholdRef = ref("threshold.mill-creek-nitrate", "threshold");
const indicatorRef = ref("indicator.mill-creek-nitrate", "indicator");
const livingSystemRef = ref("living-system.mill-creek", "living-system");
const guardianReviewRef = refIn("guardian-review.mill-creek-food-flow", "guardian-review", "governance");
const scenarioRef = ref("model.low-runoff-route", "model");
const taskRef = ref("task.deliver-produce", "task");
const flowRef = ref("flow.food-delivery", "flow");
const outcomeRef = ref("outcome.food-delivery", "evidence");
const retrospectiveRef = ref("retrospective.food-delivery", "evidence");
const needRef = ref("need.school-produce", "need");
const offerRef = ref("offer.green-acre-produce", "offer");
const commitmentRef = ref("commitment.food-delivery", "commitment");

describe("command runtime", () => {
  it("executes a command through event append, outbox, and projection rebuild", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const command: CreateClaimCommand = {
      eventId: "event.claim.created.school-food-need",
      occurredAt,
      actorRef,
      claimRef,
      orgId,
      visibility: "commons",
      dataState: "testimony_derived",
      payload: {
        title: "School needs local produce",
        summary: "Kitchen can receive surplus produce this week."
      }
    };

    const result = await executeCanopyCommand({
      command,
      runtime,
      now: "2026-06-13T19:01:00.000Z",
      handle: (handledCommand) =>
        createClaim({ registry, memory }, handledCommand).event
    });

    expect(result.event.id).toBe(command.eventId);
    expect(runtime.getEvent(command.eventId!)?.event).toEqual(result.event);
    expect(result.outboxRecord).toMatchObject({
      eventId: command.eventId,
      status: "pending",
      destination: {
        kind: "workflow",
        name: "projection-rebuild"
      }
    });
    expect(runtime.listOutbox()).toHaveLength(1);
    expect(result.projectionRebuild?.persistedStates.map((state) => state.id)).toContain(
      "projection-state.civic-memory"
    );
  });

  it("executes canonical command helpers through the shared runtime path", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const services = servicesForTest();
    services.registry.register(commonsAccountRef);
    services.registry.register(stewardshipAccountRef);

    const claim = await executeCreateClaimCommand({
      command: createClaimCommand("event.helper.claim.created"),
      services,
      runtime,
      rebuildProjections: false
    });
    const link = await executeLinkEvidenceToClaimCommand({
      command: linkEvidenceCommand("event.helper.evidence.linked"),
      services,
      runtime,
      rebuildProjections: false
    });
    const proposal = await executeCreateProposalCommand({
      command: {
        proposal: makeProposal(proposalRef),
        occurredAt,
        actorRef,
        eventId: "event.helper.proposal.created"
      },
      services,
      runtime,
      rebuildProjections: false
    });
    const decision = await executeRecordDecisionCommand({
      command: {
        decision: makeDecision(),
        occurredAt,
        actorRef,
        eventId: "event.helper.decision.recorded"
      },
      services,
      runtime,
      rebuildProjections: false
    });
    const resource = await executeCreateResourceCommand({
      command: createResourceCommand("event.helper.resource.created"),
      services,
      runtime,
      rebuildProjections: false
    });
    const useRight = await executeGrantUseRightCommand({
      command: grantUseRightCommand("event.helper.use-right.granted"),
      services,
      runtime,
      rebuildProjections: false
    });
    const ledgerEntry = await executePostLedgerEntryCommand({
      command: postLedgerEntryCommand("event.helper.ledger-entry.posted"),
      services,
      runtime,
      rebuildProjections: false
    });
    const revokedUseRight = await executeRevokeUseRightCommand({
      command: revokeUseRightCommand("event.helper.use-right.revoked"),
      services,
      runtime,
      rebuildProjections: false
    });
    const reversedLedgerEntry = await executeReverseLedgerEntryCommand({
      command: reverseLedgerEntryCommand(
        "event.helper.ledger-entry.reversed",
        ledgerEntry.event.id
      ),
      services,
      runtime,
      rebuildProjections: false
    });

    expect([
      claim.event.type,
      link.event.type,
      proposal.event.type,
      decision.event.type,
      resource.event.type,
      useRight.event.type,
      ledgerEntry.event.type,
      revokedUseRight.event.type,
      reversedLedgerEntry.event.type
    ]).toEqual([
      "claim.created",
      "evidence.linked_to_claim",
      "governance.proposal.created",
      "governance.decision.recorded",
      "stewardship.resource.created",
      "stewardship.use_right.granted",
      "accounting.ledger_entry.posted",
      "stewardship.use_right.revoked",
      "accounting.ledger_entry.reversed"
    ]);
    expect(runtime.counts().events).toBe(9);
    expect(runtime.listOutbox()).toHaveLength(9);
    expect(runtime.getEvent("event.helper.ledger-entry.posted")?.event).toEqual(
      ledgerEntry.event
    );
    expect(services.memory.replay().events.map((event) => event.id)).toEqual([
      "event.helper.claim.created",
      "event.helper.evidence.linked",
      "event.helper.proposal.created",
      "event.helper.decision.recorded",
      "event.helper.resource.created",
      "event.helper.use-right.granted",
      "event.helper.ledger-entry.posted",
      "event.helper.use-right.revoked",
      "event.helper.ledger-entry.reversed"
    ]);
    expect(useRight.event.authorityRefs).toEqual([roleAuthorityRef]);
    expect(revokedUseRight.event.payload["state"]).toBe("revoked");
    expect(ledgerEntry.event.payload["totals"]).toEqual({
      credits: { debit: 10, credit: 10 }
    });
    expect(reversedLedgerEntry.event.supersedesEventId).toBe(ledgerEntry.event.id);
  });

  it("persists use-right revocations and ledger reversals through outbox and projection rebuilds", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const services = servicesForTest();
    services.registry.register(commonsAccountRef);
    services.registry.register(stewardshipAccountRef);
    await executeGrantUseRightCommand({
      command: grantUseRightCommand("event.persistence.use-right.granted"),
      services,
      runtime,
      rebuildProjections: false
    });
    const postedLedgerEntry = await executePostLedgerEntryCommand({
      command: postLedgerEntryCommand("event.persistence.ledger-entry.posted"),
      services,
      runtime,
      rebuildProjections: false
    });

    const revokedUseRight = await executeRevokeUseRightCommand({
      command: revokeUseRightCommand("event.persistence.use-right.revoked"),
      services,
      runtime
    });
    const reversedLedgerEntry = await executeReverseLedgerEntryCommand({
      command: reverseLedgerEntryCommand(
        "event.persistence.ledger-entry.reversed",
        postedLedgerEntry.event.id
      ),
      services,
      runtime
    });

    expect(runtime.getEvent(revokedUseRight.event.id)?.event).toEqual(
      revokedUseRight.event
    );
    expect(runtime.getEvent(reversedLedgerEntry.event.id)?.event).toEqual(
      reversedLedgerEntry.event
    );
    expect(
      runtime
        .listOutbox()
        .filter((record) =>
          [revokedUseRight.event.id, reversedLedgerEntry.event.id].includes(
            record.eventId
          )
        )
    ).toHaveLength(2);
    expect(revokedUseRight.projectionRebuild?.persistedStates).not.toEqual([]);
    expect(reversedLedgerEntry.projectionRebuild?.persistedStates).not.toEqual([]);
    expect(reversedLedgerEntry.event.payload["originalEventId"]).toBe(
      postedLedgerEntry.event.id
    );
  });

  it("persists governance amendments and policy versions through outbox and projection rebuilds", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const services = servicesForTest();

    const claim = await executeCreateClaimCommand({
      command: createClaimCommand("event.helper.redaction-source.claim"),
      services,
      runtime
    });
    const submitted = await executeSubmitAmendmentCommand({
      command: submitAmendmentCommand("event.helper.amendment.submitted"),
      services,
      runtime
    });
    const objection = await executeRaiseObjectionCommand({
      command: raiseObjectionCommand("event.helper.objection.raised"),
      services,
      runtime
    });
    const versioned = await executeVersionPolicyCommand({
      command: versionPolicyCommand("event.helper.policy.versioned"),
      services,
      runtime
    });
    const redactionRequest = await executeRequestRedactionCommand({
      command: requestRedactionCommand("event.helper.redaction.requested", claim.event.id),
      services,
      runtime
    });
    const redaction = await executeApplyRedactionCommand({
      command: applyRedactionCommand("event.helper.redaction.applied", claim.event.id),
      services,
      runtime
    });

    expect([
      submitted.event.type,
      objection.event.type,
      versioned.event.type,
      redactionRequest.event.type,
      redaction.event.type
    ]).toEqual([
      "governance.amendment.submitted",
      "governance.objection.raised",
      "governance.policy.versioned",
      "stewardship.redaction.requested",
      "system.redaction.applied"
    ]);
    expect(runtime.getEvent(submitted.event.id)?.event).toEqual(submitted.event);
    expect(runtime.getEvent(objection.event.id)?.event).toEqual(objection.event);
    expect(runtime.getEvent(versioned.event.id)?.event).toEqual(versioned.event);
    expect(runtime.getEvent(redaction.event.id)?.event).toEqual(redaction.event);
    expect(
      runtime
        .listOutbox()
        .filter((record) =>
          [
            submitted.event.id,
            objection.event.id,
            versioned.event.id,
            redactionRequest.event.id,
            redaction.event.id
          ].includes(record.eventId)
        )
    ).toHaveLength(5);
    expect(submitted.outboxRecord.destination).toEqual({
      kind: "workflow",
      name: "projection-rebuild"
    });
    expect(versioned.outboxRecord.payload).toMatchObject({
      eventId: versioned.event.id,
      eventType: "governance.policy.versioned",
      objectRefId: policyRef.id
    });
    expect(submitted.projectionRebuild?.persistedStates).not.toEqual([]);
    expect(versioned.projectionRebuild?.persistedStates.map((state) => state.id)).toContain(
      "projection-state.authority"
    );
    expect(redaction.event.redaction).toMatchObject({
      originalEventId: claim.event.id,
      removedPayloadKeys: ["payload.summary"]
    });
    expect(services.memory.replay().events.map((event) => event.id)).toEqual([
      claim.event.id,
      submitted.event.id,
      objection.event.id,
      versioned.event.id,
      redactionRequest.event.id,
      redaction.event.id
    ]);
  });

  it("keeps open proposal as the create proposal runtime alias", () => {
    expect(executeOpenProposalCommand).toBe(executeCreateProposalCommand);
  });

  it("executes Phase 7 native commands through persisted command helpers", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const services = servicesForTest();
    const commands = [
      executeCreateLivingSystemCommand({
        command: createLivingSystemCommand("event.helper.living-system.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateThresholdCommand({
        command: createThresholdCommand("event.helper.threshold.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeRecordThresholdBreachCommand({
        command: recordThresholdBreachCommand("event.helper.threshold.breached"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateNeedCommand({
        command: createNeedCommand("event.helper.need.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateOfferCommand({
        command: createOfferCommand("event.helper.offer.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateModelScenarioCommand({
        command: createModelScenarioCommand("event.helper.model.scenario.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeRequestGuardianReviewCommand({
        command: requestGuardianReviewCommand("event.helper.guardian-review.requested"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCompleteGuardianReviewCommand({
        command: completeGuardianReviewCommand("event.helper.guardian-review.completed"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateTaskCommand({
        command: createTaskCommand("event.helper.task.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCreateCommitmentCommand({
        command: createCommitmentCommand("event.helper.commitment.created"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeRecordFoodFlowCommand({
        command: recordFoodFlowCommand("event.helper.food-flow.recorded"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCompleteTaskCommand({
        command: completeTaskCommand("event.helper.task.completed"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeRecordLearningOutcomeCommand({
        command: recordLearningOutcomeCommand("event.helper.learning.outcome"),
        services,
        runtime,
        rebuildProjections: false
      }),
      executeCompleteLearningRetrospectiveCommand({
        command: completeLearningRetrospectiveCommand("event.helper.learning.retrospective"),
        services,
        runtime,
        rebuildProjections: false
      })
    ];

    const results = await Promise.all(commands);

    expect(results.map((result) => result.event.type)).toEqual([
      "ecology.living_system.created",
      "ecology.threshold.created",
      "ecology.threshold.breached",
      "coordination.need.created",
      "coordination.offer.created",
      "model.scenario.created",
      "ecology.guardian.review_requested",
      "ecology.guardian.review_completed",
      "stewardship.task.created",
      "coordination.commitment.created",
      "flow.food.recorded",
      "stewardship.task.completed",
      "learning.outcome.recorded",
      "learning.retrospective.completed"
    ]);
    expect(runtime.counts().events).toBe(14);
    expect(runtime.listOutbox()).toHaveLength(14);
    expect(services.memory.replay().events.map((event) => event.id)).toEqual(
      results.map((result) => result.event.id)
    );
  });
});

function servicesForTest() {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory()
  };
}

function ref(id: string, type: ObjectRef["type"]): ObjectRef {
  return refIn(id, type, namespace);
}

function refIn(
  id: string,
  type: ObjectRef["type"],
  refNamespace: string
): ObjectRef {
  return {
    id,
    type,
    namespace: refNamespace,
    lifecycleStatus: "active"
  };
}

function createClaimCommand(eventId: string): CreateClaimCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    claimRef,
    orgId,
    visibility: "commons",
    dataState: "testimony_derived",
    payload: {
      title: "School needs local produce",
      summary: "Kitchen can receive surplus produce this week."
    }
  };
}

function linkEvidenceCommand(eventId: string): LinkEvidenceToClaimCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    evidenceRef,
    claimRef,
    relation: "supports",
    payload: {
      summary: "Flow gauge observation supports the claim."
    }
  };
}

function makeProposal(ref: ObjectRef): Proposal {
  return {
    schemaVersion: "0.0.0",
    id: ref.id,
    type: "proposal",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef,
    proposalType: "operational_action",
    title: "Adopt a water rotation plan",
    summary: "Set temporary water rotation windows for the dry season.",
    proposedByRefs: [actorRef],
    affectedRefs: [resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    scenarioRefs: [],
    amendmentRefs: [],
    objectionRefs: [],
    decisionMethod: decisionMethod(),
    deliberationWindow: {},
    conditions: []
  };
}

function makeDecision(): Decision {
  return {
    schemaVersion: "0.0.0",
    id: decisionRef.id,
    type: "decision",
    orgId,
    status: "resolved",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRefs: [issueRef],
    proposalRefs: [proposalRef],
    outcome: "passed",
    effect: "binding",
    method: decisionMethod(),
    decidedAt: occurredAt,
    decidedByRefs: [actorRef],
    affectedRefs: [resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "Council authority approved the temporary rotation.",
    conditions: [],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [],
    supersedesDecisionRefs: []
  };
}

function makeAmendment(): Amendment {
  return {
    schemaVersion: "0.0.0",
    id: amendmentRef.id,
    type: "amendment",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    parentProposalRef: proposalRef,
    amendmentType: "condition_added",
    title: "Add runoff pause condition",
    summary: "Pause the rotation if nitrate readings worsen.",
    rationale: "The watershed council needs an adaptive route when indicators worsen.",
    proposedByRef: actorRef,
    proposedText: "Water rotation pauses when nitrate readings worsen materially.",
    affectedRefs: [thresholdRef, policyRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef]
  };
}

function makePolicyVersion(): PolicyVersion {
  return {
    schemaVersion: "0.0.0",
    id: policyVersionRef.id,
    type: "policy-version",
    orgId,
    policyRef,
    version: "2",
    status: "active",
    title: "Water rotation policy v2",
    body: "Rotation pauses and re-enters review when nitrate readings worsen.",
    summaryOfChanges: "Adds adaptive pause and guardian review language.",
    decisionRef,
    authorityRefs: [roleAuthorityRef],
    effectiveAt: occurredAt,
    createdAt: occurredAt,
    createdByRef: actorRef,
    dataState: "institutionally_certified",
    visibility: "commons",
    dataStewardshipAgreementRefs: []
  };
}

function makeObjection(): Objection {
  return {
    schemaVersion: "0.0.0",
    id: objectionRef.id,
    type: "objection",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    proposalRef,
    authorRef: actorRef,
    objectionType: "data_stewardship",
    text: "Export should preserve the governance trail without exposing sensitive detail.",
    severity: "high",
    disposition: "preserved",
    response: "Proceed with redaction continuity.",
    responseByRef: actorRef,
    resolvedAt: occurredAt,
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    preservationRationale: "The objection constrains export handling."
  };
}

function submitAmendmentCommand(eventId: string): SubmitAmendmentCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    amendment: makeAmendment()
  };
}

function raiseObjectionCommand(eventId: string): RaiseObjectionCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    objection: makeObjection()
  };
}

function versionPolicyCommand(eventId: string): VersionPolicyCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    policyVersion: makePolicyVersion(),
    relatedRefs: [proposalRef, amendmentRef]
  };
}

function requestRedactionCommand(
  eventId: string,
  originalEventId: string
): RequestRedactionCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    requestRef: redactionRequestRef,
    targetRef: claimRef,
    targetEventId: originalEventId,
    reason: "data_minimization",
    method: "field_generalized",
    requestedFields: ["payload.summary"],
    preservedFields: ["id", "type", "occurredAt", "objectRef"],
    relatedRefs: [objectionRef]
  };
}

function applyRedactionCommand(
  eventId: string,
  originalEventId: string
): ApplyRedactionCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    redactionRef,
    originalEventId,
    targetRef: claimRef,
    reason: "data_minimization",
    method: "field_generalized",
    redactedFields: ["payload.summary"],
    preservedFields: ["id", "type", "occurredAt", "objectRef"],
    originalContentHash: "sha256:claim-before-redaction",
    redactedContentHash: "sha256:claim-after-redaction",
    note: "Preserve command-runtime replay while minimizing exported detail."
  };
}

function decisionMethod() {
  return {
    kind: "consent",
    eligibleVoterRefs: [actorRef],
    authorityRefs: [roleAuthorityRef],
    guardianReviewRequired: false
  } as const;
}

function createResourceCommand(eventId: string): CreateResourceCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    resourceRef,
    title: "North Pasture",
    resourceKind: "pasture",
    summary: "Shared seasonal grazing resource.",
    stewardRefs: [actorRef],
    context: {
      livingSystem: "riparian meadow"
    }
  };
}

function grantUseRightCommand(eventId: string): GrantUseRightCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    useRightRef,
    scope: useRightScope(),
    decisionRef,
    grantNote: "Granted under the temporary rotation decision."
  };
}

function revokeUseRightCommand(eventId: string): RevokeUseRightCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    useRightRef,
    holderRef,
    resourceRef,
    decisionRef,
    revocationPathRef,
    appealPathRef: revocationPathRef,
    reason: "Watershed stress threshold exceeded.",
    effectiveAt: "2026-06-14T19:00:00.000Z"
  };
}

function useRightScope(): UseRightScope {
  return {
    holderRef,
    resourceRef,
    permissions: ["graze"],
    conditions: ["seasonal rotation only"],
    term: {
      startsAt: occurredAt,
      endsAt: "2026-09-13T19:00:00.000Z"
    },
    review: {
      reviewPathRef,
      reviewAt: "2026-08-13T19:00:00.000Z"
    },
    revocation: {
      revocable: true,
      revocationPathRef,
      revocationConditions: ["watershed stress threshold exceeded"]
    }
  };
}

function reverseLedgerEntryCommand(
  eventId: string,
  originalEventId: string
): ReverseLedgerEntryCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    reversalLedgerEntryRef,
    originalEventId,
    memo: "Reverse duplicate pasture stewardship allocation."
  };
}

function postLedgerEntryCommand(eventId: string): PostLedgerEntryCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    authorityRefs: [roleAuthorityRef],
    ledgerEntryRef,
    memo: "Allocate pasture stewardship credits.",
    lines: [
      {
        accountRef: commonsAccountRef,
        side: "debit",
        amount: 10,
        unit: "credits"
      },
      {
        accountRef: stewardshipAccountRef,
        side: "credit",
        amount: 10,
        unit: "credits"
      }
    ]
  };
}

function createLivingSystemCommand(eventId: string): CreateLivingSystemCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    livingSystemRef,
    authorityRefs: [roleAuthorityRef],
    relatedRefs: [guardianReviewRef],
    title: "Mill Creek Watershed"
  };
}

function createNeedCommand(eventId: string): CreateNeedCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    needRef,
    relatedRefs: [claimRef],
    authorityRefs: [roleAuthorityRef],
    title: "School produce need",
    quantity: "20 boxes"
  };
}

function createOfferCommand(eventId: string): CreateOfferCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    offerRef,
    relatedRefs: [needRef, resourceRef],
    authorityRefs: [roleAuthorityRef],
    title: "Green Acre produce offer",
    quantity: "20 boxes"
  };
}

function createCommitmentCommand(eventId: string): CreateCommitmentCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    commitmentRef,
    relatedRefs: [needRef, offerRef, useRightRef],
    committedByRef: actorRef,
    authorityRefs: [decisionRef],
    title: "Deliver produce boxes"
  };
}

function createThresholdCommand(eventId: string): CreateThresholdCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    thresholdRef,
    indicatorRef,
    livingSystemRef,
    guardianRefs: [guardianReviewRef],
    authorityRefs: [roleAuthorityRef, guardianReviewRef],
    threshold: 10,
    unit: "mg/L",
    title: "Mill Creek nitrate threshold",
    guardianReviewRequired: true
  };
}

function recordThresholdBreachCommand(eventId: string): RecordThresholdBreachCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    thresholdRef,
    indicatorRef,
    relatedRefs: [livingSystemRef, issueRef],
    authorityRefs: [roleAuthorityRef, guardianReviewRef],
    observedValue: 14.2,
    unit: "mg/L",
    requiresGuardianReview: true
  };
}

function createModelScenarioCommand(eventId: string): CreateModelScenarioCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    scenarioRef,
    relatedRefs: [thresholdRef, proposalRef, claimRef],
    authorityRefs: [roleAuthorityRef, guardianReviewRef],
    title: "Low runoff route",
    summary: "Route without additional irrigation.",
    assumptions: ["existing cold-chain capacity"],
    guardianReviewRequired: true
  };
}

function requestGuardianReviewCommand(eventId: string): RequestGuardianReviewCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    guardianReviewRef,
    proposalRef,
    thresholdRef,
    subjectRefs: [thresholdRef, proposalRef, scenarioRef],
    guardianRefs: [guardianReviewRef],
    authorityRefs: [roleAuthorityRef, guardianReviewRef],
    title: "Review threshold-bound route",
    reason: "Threshold breach affects the proposed route."
  };
}

function completeGuardianReviewCommand(eventId: string): CompleteGuardianReviewCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    guardianReviewRef,
    subjectRefs: [thresholdRef, proposalRef, scenarioRef],
    guardianRefs: [guardianReviewRef],
    authorityRefs: [roleAuthorityRef, guardianReviewRef],
    outcome: "approved_with_conditions",
    conditions: ["no additional irrigation"],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef]
  };
}

function createTaskCommand(eventId: string): CreateTaskCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    taskRef,
    title: "Deliver produce boxes",
    assignedToRefs: [actorRef],
    resourceRefs: [resourceRef],
    useRightRef,
    authorityRefs: [decisionRef]
  };
}

function recordFoodFlowCommand(eventId: string): RecordFoodFlowCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    flowRef,
    resourceRef,
    taskRef,
    useRightRef,
    outcomeRef,
    thresholdRefs: [thresholdRef],
    authorityRefs: [decisionRef, useRightRef],
    from: "Green Acre Farm",
    to: "Northside School Kitchen",
    quantity: "20 boxes"
  };
}

function completeTaskCommand(eventId: string): CompleteTaskCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    taskRef,
    completedByRef: actorRef,
    flowRefs: [flowRef],
    outcomeRef,
    authorityRefs: [decisionRef]
  };
}

function recordLearningOutcomeCommand(eventId: string): RecordLearningOutcomeCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    outcomeRef,
    relatedRefs: [flowRef, claimRef, decisionRef, thresholdRef],
    authorityRefs: [decisionRef],
    outcome: "twenty boxes delivered",
    metric: "boxes",
    value: 20
  };
}

function completeLearningRetrospectiveCommand(
  eventId: string
): CompleteLearningRetrospectiveCommand {
  return {
    eventId,
    occurredAt,
    actorRef,
    retrospectiveRef,
    relatedRefs: [outcomeRef, guardianReviewRef, thresholdRef],
    authorityRefs: [decisionRef, guardianReviewRef],
    summary: "Guardian conditions preserved the threshold guardrail."
  };
}
