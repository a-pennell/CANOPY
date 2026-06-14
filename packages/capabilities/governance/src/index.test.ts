import { describe, expect, it } from "vitest";
import type {
  Delegation,
  Mandate,
  ObjectRef,
  RoleAssignment
} from "@canopy/contracts-kernel";
import type {
  Appeal,
  Decision,
  DecisionPacket,
  Issue,
  Proposal
} from "@canopy/contracts-governance";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  GovernanceCommandError,
  createIssue,
  createProposal,
  openAppeal,
  openProposal,
  recordDecision,
  recordDecisionPacket,
  evaluateGovernanceHardening,
  validateDelegationAuthority,
  validateGovernanceRuntimeControls,
  validateMandateAuthority,
  validateProposalOpeningAuthority,
  validateRoleAssignmentAuthority
} from "./index.js";

const occurredAt = "2026-06-13T00:00:00.000Z";

const actorRef = ref("canopy:person:ada", "person", "people");
const roleAuthorityRef = ref("canopy:role:council", "role", "authority");
const membershipAuthorityRef = {
  id: "canopy:membership:ada-council",
  type: "membership",
  namespace: "authority",
  lifecycleStatus: "active"
} as unknown as ObjectRef;
const issueRef = ref("canopy:issue:water", "issue", "governance");
const proposalRef = ref("canopy:proposal:water-plan", "proposal", "governance");
const decisionRef = ref("canopy:decision:water-plan", "decision", "governance");
const packetRef = ref(
  "canopy:decision-packet:water-plan",
  "decision-packet",
  "governance"
);
const appealRef = ref("canopy:appeal:water-plan", "appeal", "governance");
const mandateRef = ref("canopy:mandate:watershed", "mandate", "authority");
const emergencyMandateRef = ref(
  "canopy:mandate:emergency-water",
  "mandate",
  "authority"
);
const claimRef = ref("canopy:claim:flow", "claim", "claims");
const evidenceRef = ref("canopy:evidence:meter", "evidence", "evidence");

describe("governance capability commands", () => {
  it("validates mandate, role assignment, and delegation authority records", () => {
    const validMandate = validateMandateAuthority(makeMandate());
    const validRoleAssignment = validateRoleAssignmentAuthority(
      makeRoleAssignment()
    );
    const validDelegation = validateDelegationAuthority(makeDelegation());

    expect(validMandate.valid).toBe(true);
    expect(validRoleAssignment.valid).toBe(true);
    expect(validDelegation.valid).toBe(true);
  });

  it("rejects authority records with membership-only or broken delegation chains", () => {
    const membershipMandate = validateMandateAuthority({
      ...makeMandate(),
      authorityRefs: [membershipAuthorityRef]
    });
    const emptyDelegation = validateDelegationAuthority({
      ...makeDelegation(),
      delegatedAuthorityRefs: [],
      delegatorRef: actorRef,
      delegateRef: actorRef
    });

    expect(membershipMandate.issues.map((issue) => issue.code)).toEqual([
      "authority-membership-only"
    ]);
    expect(emptyDelegation.issues.map((issue) => issue.code)).toEqual([
      "delegation-empty-grant",
      "delegation-self-delegation"
    ]);
  });

  it("creates an issue by registering refs and appending a canonical event", () => {
    const services = servicesForTest();
    const issue = makeIssue();
    const result = createIssue(services, { issue, occurredAt, actorRef });

    expect(result.ref).toEqual(issueRef);
    expect(services.registry.require(issueRef.id)).toEqual(issueRef);
    expect(services.registry.require(claimRef.id)).toEqual(claimRef);
    expect(result.appendResult.event).toMatchObject({
      id: "canopy:issue:water:event:governance.issue.created",
      type: "governance.issue.created",
      occurredAt,
      actorRef,
      objectRef: issueRef,
      authorityRefs: [roleAuthorityRef],
      sourceCapability: "governance",
      schemaVersion: 1,
      visibility: "commons",
      dataState: "locally_verified"
    });
    expect(result.appendResult.event.payload).toEqual({
      command: "createIssue",
      issue
    });
  });

  it("creates a proposal linked to an issue", () => {
    const services = servicesForTest();
    const proposal = makeProposal();
    const result = createProposal(services, {
      proposal,
      occurredAt,
      actorRef
    });

    expect(result.appendResult.event.type).toBe("governance.proposal.created");
    expect(result.appendResult.event.objectRef).toEqual(proposalRef);
    expect(result.appendResult.event.relatedRefs).toContainEqual(issueRef);
    expect(services.registry.require(proposalRef.id)).toEqual(proposalRef);
    expect(services.registry.require(issueRef.id)).toEqual(issueRef);
  });

  it("opens a proposal with executable authority validation", () => {
    const services = servicesForTest();
    const proposal = makeProposal();
    const result = openProposal(services, {
      proposal,
      occurredAt,
      actorRef
    });

    expect(result.appendResult.event).toMatchObject({
      type: "governance.proposal.opened",
      objectRef: proposalRef,
      authorityRefs: [roleAuthorityRef]
    });
    expect(services.memory.queryObjectEvents(proposalRef)).toHaveLength(1);
  });

  it("rejects proposal opening when only membership authority is present", () => {
    const proposal = {
      ...makeProposal(),
      authorityRefs: [membershipAuthorityRef],
      decisionMethod: {
        ...decisionMethod(),
        authorityRefs: []
      }
    };

    expect(validateProposalOpeningAuthority(proposal).issues[0]?.code).toBe(
      "authority-membership-only"
    );
    expect(() =>
      openProposal(servicesForTest(), { proposal, occurredAt, actorRef })
    ).toThrow("Membership cannot be the only authority basis for governance action.");
  });

  it("records a binding decision when explicit non-membership authority is present", () => {
    const services = servicesForTest();
    const decision = makeDecision();
    const result = recordDecision(services, {
      decision,
      occurredAt,
      actorRef
    });

    expect(result.appendResult.event).toMatchObject({
      id: "canopy:decision:water-plan:event:governance.decision.recorded",
      type: "governance.decision.recorded",
      objectRef: decisionRef,
      authorityRefs: [roleAuthorityRef],
      sourceCapability: "governance"
    });
    expect(services.memory.queryObjectEvents(decisionRef)).toHaveLength(1);
  });

  it("rejects a binding decision without explicit authorityRefs", () => {
    const services = servicesForTest();
    const decision = {
      ...makeDecision(),
      authorityRefs: []
    };

    expect(() =>
      recordDecision(services, { decision, occurredAt, actorRef })
    ).toThrow(GovernanceCommandError);
    expect(services.memory.replay().events).toHaveLength(0);
  });

  it("rejects a binding decision backed only by membership authority", () => {
    const services = servicesForTest();
    const decision = {
      ...makeDecision(),
      authorityRefs: [membershipAuthorityRef]
    };

    expect(() =>
      recordDecision(services, { decision, occurredAt, actorRef })
    ).toThrow(
      "Binding decisions cannot rely only on membership authority."
    );
    expect(services.memory.replay().events).toHaveLength(0);
  });

  it("rejects non-emergency binding decisions with unresolved objections", () => {
    const services = servicesForTest();
    const decision = {
      ...makeDecision(),
      unresolvedObjectionRefs: [claimRef]
    };

    expect(() =>
      recordDecision(services, { decision, occurredAt, actorRef })
    ).toThrow(
      "Binding decisions cannot be recorded with unresolvedObjectionRefs unless the method is emergency_authority."
    );
    expect(services.memory.replay().events).toHaveLength(0);
  });

  it("requires constrained emergency authority for emergency decisions", () => {
    const services = servicesForTest();
    const decision = {
      ...makeDecision(),
      authorityRefs: [emergencyMandateRef],
      method: {
        ...decisionMethod(),
        kind: "emergency_authority",
        authorityRefs: [emergencyMandateRef],
        eligibleVoterRefs: [],
        notes: "Emergency action is limited to seven days pending review."
      } as const,
      unresolvedObjectionRefs: [claimRef],
      conditions: ["Review within seven days."]
    };
    const result = recordDecision(services, { decision, occurredAt, actorRef });

    expect(result.appendResult.event.authorityRefs).toEqual([
      emergencyMandateRef
    ]);

    expect(() =>
      recordDecision(servicesForTest(), {
        decision: {
          ...decision,
          authorityRefs: [roleAuthorityRef],
          method: {
            kind: "emergency_authority",
            authorityRefs: [roleAuthorityRef],
            eligibleVoterRefs: [],
            guardianReviewRequired: false
          },
          conditions: []
        },
        occurredAt,
        actorRef
      })
    ).toThrow(
      "Emergency authority actions must cite an emergency mandate or emergency authority ref."
    );
  });

  it("evaluates runtime governance hardening controls before recording decisions", () => {
    const appealPathRef = ref("canopy:appeal-path:watershed", "policy", "governance");
    const quorumState = {
      schemaVersion: "0.0.0",
      id: "canopy:quorum:water-plan",
      type: "quorum-state",
      orgId: "canopy:org:watershed",
      proposalRef,
      status: "met",
      eligibleCount: 5,
      requiredCount: 3,
      participatingCount: 4,
      measuredAt: occurredAt
    } as const;
    const consentSignal = {
      schemaVersion: "0.0.0",
      id: "canopy:consent:ada",
      type: "consent-signal",
      orgId: "canopy:org:watershed",
      proposalRef,
      participantRef: actorRef,
      signal: "consent",
      recordedAt: occurredAt,
      visibility: "commons",
      dataState: "locally_verified"
    } as const;
    const controls = {
      evaluatedAt: occurredAt,
      consentSignals: [consentSignal],
      quorumState,
      delegatedAuthorityRefs: [],
      revokedAuthorityRefs: [],
      revokedDelegationRefs: [],
      contestedEvidenceRefs: [evidenceRef],
      appealPathRef
    };
    const decision = {
      ...makeDecision(),
      rationale: "Accepted with contested evidence preserved for appeal."
    };
    const evaluation = evaluateGovernanceHardening(decision, controls);

    expect(evaluation.status).toBe("attention");
    expect(evaluation.issues).toEqual([]);
    expect(validateGovernanceRuntimeControls(decision, controls).valid).toBe(true);

    const result = recordDecision(servicesForTest(), {
      decision,
      controls,
      occurredAt,
      actorRef
    });

    expect(result.appendResult.event.payload).toMatchObject({
      governanceControls: {
        status: "attention",
        issues: []
      }
    });
  });

  it("rejects runtime decision controls with blocked consent, quorum, revocation, and contested evidence", () => {
    const controls = {
      evaluatedAt: occurredAt,
      consentSignals: [
        {
          schemaVersion: "0.0.0",
          id: "canopy:consent:block",
          type: "consent-signal",
          orgId: "canopy:org:watershed",
          proposalRef,
          participantRef: actorRef,
          signal: "block",
          recordedAt: occurredAt,
          visibility: "commons",
          dataState: "locally_verified"
        } as const
      ],
      quorumState: {
        schemaVersion: "0.0.0",
        id: "canopy:quorum:not-met",
        type: "quorum-state",
        orgId: "canopy:org:watershed",
        proposalRef,
        status: "not_met",
        eligibleCount: 5,
        requiredCount: 3,
        participatingCount: 2,
        measuredAt: occurredAt
      } as const,
      revokedAuthorityRefs: [roleAuthorityRef],
      contestedEvidenceRefs: [evidenceRef]
    };
    const decision = {
      ...makeDecision(),
      rationale: "Evidence supports action."
    };

    expect(validateGovernanceRuntimeControls(decision, controls).issues.map((issue) => issue.code)).toEqual([
      "decision-consent-blocked",
      "decision-quorum-not-met",
      "authority-revoked",
      "decision-missing-appeal-path",
      "decision-contested-evidence-unhandled"
    ]);
    expect(() =>
      recordDecision(servicesForTest(), {
        decision,
        controls,
        occurredAt,
        actorRef
      })
    ).toThrow("Consent signals include a block or withheld consent.");
  });

  it("records a decision packet over the decision context", () => {
    const services = servicesForTest();
    const packet = makeDecisionPacket();
    const result = recordDecisionPacket(services, {
      decisionPacket: packet,
      occurredAt,
      actorRef,
      eventId: "canopy:event:packet-recorded"
    });

    expect(result.appendResult.event).toMatchObject({
      id: "canopy:event:packet-recorded",
      type: "governance.decision_packet.recorded",
      objectRef: packetRef,
      authorityRefs: [roleAuthorityRef],
      visibility: "commons",
      dataState: "locally_verified"
    });
    expect(result.appendResult.event.relatedRefs).toEqual(
      expect.arrayContaining([actorRef, issueRef, proposalRef, decisionRef])
    );
    expect(services.registry.require(packetRef.id)).toEqual(packetRef);
    expect(services.registry.require(decisionRef.id)).toEqual(decisionRef);
  });

  it("opens appeals with grounds and authority traceability", () => {
    const services = servicesForTest();
    const appeal = makeAppeal();
    const result = openAppeal(services, { appeal, occurredAt, actorRef });

    expect(result.appendResult.event).toMatchObject({
      type: "governance.appeal.opened",
      objectRef: appealRef,
      relatedRefs: expect.arrayContaining([decisionRef, actorRef]),
      authorityRefs: [roleAuthorityRef]
    });
    expect(services.registry.require(appealRef.id)).toEqual(appealRef);
  });

  it("rejects appeals without stated grounds", () => {
    const appeal = {
      ...makeAppeal(),
      grounds: []
    };

    expect(() =>
      openAppeal(servicesForTest(), { appeal, occurredAt, actorRef })
    ).toThrow("Appeals require at least one stated ground.");
  });
});

function servicesForTest() {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory()
  };
}

function ref(
  id: string,
  type: ObjectRef["type"],
  namespace: string
): ObjectRef {
  return {
    id,
    type,
    namespace,
    lifecycleStatus: "active"
  };
}

function makeIssue(): Issue {
  return {
    schemaVersion: "0.0.0",
    id: issueRef.id,
    type: "issue",
    orgId: "canopy:org:watershed",
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueType: "stewardship",
    title: "Restore dry season water reliability",
    description: "Coordinate a shared dry season water plan.",
    priority: "high",
    scope: {
      orgId: "canopy:org:watershed",
      affectedRefs: [actorRef]
    },
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    proposalRefs: [],
    decisionRefs: []
  };
}

function makeProposal(): Proposal {
  return {
    schemaVersion: "0.0.0",
    id: proposalRef.id,
    type: "proposal",
    orgId: "canopy:org:watershed",
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef,
    proposalType: "operational_action",
    title: "Adopt a dry season rotation plan",
    summary: "Set temporary water rotation windows for the dry season.",
    proposedByRefs: [actorRef],
    affectedRefs: [actorRef],
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
    orgId: "canopy:org:watershed",
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
    affectedRefs: [actorRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "Consensus threshold was met and evidence supports action.",
    conditions: [],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [],
    supersedesDecisionRefs: []
  };
}

function makeDecisionPacket(): DecisionPacket {
  return {
    schemaVersion: "0.0.0",
    id: packetRef.id,
    type: "decision-packet",
    orgId: "canopy:org:watershed",
    status: "complete",
    issueRefs: [issueRef],
    proposalRefs: [proposalRef],
    decisionRef,
    authorityRefs: [roleAuthorityRef],
    decisionMethod: decisionMethod(),
    scopeRefs: [],
    affectedObjectRefs: [actorRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    evidenceLinkRefs: [],
    perspectiveRefs: [],
    scenarioRefs: [],
    modelRefs: [],
    guardianReviewRefs: [],
    unresolvedObjectionRefs: [],
    unresolvedObjectionsSummary: "No unresolved objections.",
    outcome: "passed",
    rationale: "The decision satisfies the stated dry season criteria.",
    conditions: [],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [],
    policyVersionRefs: [],
    dataStewardship: {
      visibility: "commons",
      dataState: "locally_verified",
      dataStewardshipAgreementRefs: [],
      consentSignalRefs: [],
      allowedUses: ["governance_review"],
      prohibitedUses: [],
      federationRuleRefs: []
    },
    redactionSummary: {
      hasRedactions: false,
      redactedRefs: [],
      sealedRefs: [],
      continuityEventRefs: []
    },
    eventRefs: [],
    schemaVersions: [
      {
        contractName: "@canopy/contracts-governance",
        schemaVersion: "0.0.0"
      }
    ],
    createdAt: occurredAt,
    createdByRef: actorRef
  };
}

function makeAppeal(): Appeal {
  return {
    schemaVersion: "0.0.0",
    id: appealRef.id,
    type: "appeal",
    orgId: "canopy:org:watershed",
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [roleAuthorityRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    targetRef: decisionRef,
    openedByRef: actorRef,
    grounds: ["The dry season window omitted late evidence."],
    requestedRemedy: "Reopen deliberation for the contested evidence.",
    reviewerRefs: [],
    decisionRefs: [decisionRef],
    evidenceRefs: [evidenceRef]
  };
}

function makeMandate(): Mandate {
  return {
    schemaVersion: "0.0.0",
    id: mandateRef.id,
    ref: mandateRef,
    holderRef: actorRef,
    grantorRef: roleAuthorityRef,
    kind: "steward",
    purpose: "Steward watershed governance.",
    scope: {
      orgRef: ref("canopy:org:watershed", "organization", "authority"),
      capability: "governance",
      actionKeys: ["proposal.open", "decision.record"]
    },
    status: "active",
    authorityRefs: [roleAuthorityRef],
    issuedAt: occurredAt,
    term: {
      startsAt: occurredAt
    }
  };
}

function makeRoleAssignment(): RoleAssignment {
  return {
    schemaVersion: "0.0.0",
    id: "canopy:role-assignment:ada-council",
    ref: ref("canopy:role-assignment:ada-council", "role", "authority"),
    roleRef: roleAuthorityRef,
    assigneeRef: actorRef,
    membershipRef: membershipAuthorityRef,
    scope: {
      orgRef: ref("canopy:org:watershed", "organization", "authority"),
      actionKeys: ["proposal.open"]
    },
    status: "active",
    authorityRefs: [mandateRef],
    term: {
      startsAt: occurredAt
    },
    assignedAt: occurredAt,
    assignedByRef: actorRef
  };
}

function makeDelegation(): Delegation {
  return {
    schemaVersion: "0.0.0",
    id: "canopy:delegation:water-window",
    ref: ref("canopy:delegation:water-window", "mandate", "authority"),
    delegatorRef: actorRef,
    delegateRef: ref("canopy:person:lin", "person", "people"),
    delegatedAuthorityRefs: [mandateRef],
    scope: {
      orgRef: ref("canopy:org:watershed", "organization", "authority"),
      actionKeys: ["decision.record"]
    },
    status: "active",
    revocable: true,
    authorityRefs: [mandateRef],
    delegatedAt: occurredAt,
    term: {
      startsAt: occurredAt
    }
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
