import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import type { Decision, Proposal } from "@canopy/contracts-governance";
import {
  createClaim,
  type CreateClaimCommand
} from "@canopy/capabilities-claims-evidence";
import type { LinkEvidenceToClaimCommand } from "@canopy/capabilities-claims-evidence";
import type {
  CreateResourceCommand,
  GrantUseRightCommand,
  UseRightScope
} from "@canopy/capabilities-stewardship";
import type { PostLedgerEntryCommand } from "@canopy/capabilities-allocation-accounting";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  executeCanopyCommand,
  executeCreateClaimCommand,
  executeCreateProposalCommand,
  executeCreateResourceCommand,
  executeGrantUseRightCommand,
  executeLinkEvidenceToClaimCommand,
  executeOpenProposalCommand,
  executePostLedgerEntryCommand,
  executeRecordDecisionCommand
} from "./index.js";

const occurredAt = "2026-06-13T19:00:00.000Z";
const namespace = "canopy.command-runtime.test";
const orgId = "org.riverbend";
const actorRef = ref("person.mira", "person");
const claimRef = ref("claim.school-food-need", "claim");
const evidenceRef = ref("evidence.flow-gauge", "evidence");
const issueRef = refIn("issue.water", "issue", "governance");
const proposalRef = refIn("proposal.water-rotation", "proposal", "governance");
const decisionRef = refIn("decision.water-rotation", "decision", "governance");
const roleAuthorityRef = ref("role.watershed-council", "role");
const resourceRef = ref("resource.north-pasture", "resource");
const holderRef = ref("person.eli", "person");
const useRightRef = ref("use-right.north-pasture-grazing", "use-right");
const reviewPathRef = ref("policy.seasonal-review", "policy");
const revocationPathRef = ref("appeal.use-right-revocation", "appeal");
const ledgerEntryRef = ref("ledger-entry.allocation-1", "ledger-entry");
const commonsAccountRef = ref("ledger-account.commons", "ledger-account");
const stewardshipAccountRef = ref(
  "ledger-account.stewardship",
  "ledger-account"
);

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

    expect([
      claim.event.type,
      link.event.type,
      proposal.event.type,
      decision.event.type,
      resource.event.type,
      useRight.event.type,
      ledgerEntry.event.type
    ]).toEqual([
      "claim.created",
      "evidence.linked_to_claim",
      "governance.proposal.created",
      "governance.decision.recorded",
      "stewardship.resource.created",
      "stewardship.use_right.granted",
      "accounting.ledger_entry.posted"
    ]);
    expect(runtime.counts().events).toBe(7);
    expect(runtime.listOutbox()).toHaveLength(7);
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
      "event.helper.ledger-entry.posted"
    ]);
    expect(useRight.event.authorityRefs).toEqual([roleAuthorityRef]);
    expect(ledgerEntry.event.payload["totals"]).toEqual({
      credits: { debit: 10, credit: 10 }
    });
  });

  it("keeps open proposal as the create proposal runtime alias", () => {
    expect(executeOpenProposalCommand).toBe(executeCreateProposalCommand);
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
