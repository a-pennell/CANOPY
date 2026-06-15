import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { buildDecisionPacketProjection } from "./index.js";

const ref = (type: ObjectRef["type"], id: string, namespace = "governance"): ObjectRef => ({
  id,
  type,
  namespace,
  lifecycleStatus: "active"
});

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event-1",
  type: "governance.issue.created",
  occurredAt: "2026-01-01T00:00:00.000Z",
  objectRef: ref("issue", "issue-1"),
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "governance",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

describe("buildDecisionPacketProjection", () => {
  it("builds a read model from a recorded decision packet and linked events", () => {
    const decisionRef = ref("decision", "decision-1");
    const issueRef = ref("issue", "issue-1");
    const proposalRef = ref("proposal", "proposal-1");
    const claimRef = ref("claim", "claim-1");
    const evidenceRef = ref("evidence", "evidence-1", "evidence");
    const authorityRef = ref("mandate", "mandate-1", "authority");
    const objectionRef = ref("claim", "objection-1");
    const packetRef = ref("decision-packet", "packet-1");

    const projection = buildDecisionPacketProjection(decisionRef, [
      event({
        id: "issue-event",
        objectRef: issueRef,
        payload: {
          issue: {
            id: "issue-1",
            type: "issue",
            title: "Watershed access",
            status: "open"
          }
        }
      }),
      event({
        id: "proposal-event",
        type: "governance.proposal.created",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: proposalRef,
        relatedRefs: [issueRef],
        payload: {
          proposal: {
            id: "proposal-1",
            type: "proposal",
            title: "Seasonal use right",
            summary: "Grant monitored access",
            status: "open"
          }
        }
      }),
      event({
        id: "claim-event",
        type: "claim.created",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: claimRef,
        relatedRefs: [proposalRef],
        sourceCapability: "claims-evidence",
        payload: { title: "Access supports food resilience", status: "review_required" }
      }),
      event({
        id: "evidence-link-event",
        type: "evidence.linked_to_claim",
        occurredAt: "2026-01-04T00:00:00.000Z",
        objectRef: evidenceRef,
        relatedRefs: [claimRef],
        sourceCapability: "claims-evidence",
        payload: { relation: "supports", claimRefId: claimRef.id }
      }),
      event({
        id: "decision-event",
        type: "governance.decision.recorded",
        occurredAt: "2026-01-05T00:00:00.000Z",
        objectRef: decisionRef,
        relatedRefs: [issueRef, proposalRef, claimRef, evidenceRef, objectionRef],
        authorityRefs: [authorityRef],
        payload: {
          decision: {
            id: "decision-1",
            type: "decision",
            issueRefs: [issueRef],
            proposalRefs: [proposalRef],
            claimRefs: [claimRef],
            evidenceRefs: [evidenceRef],
            unresolvedObjectionRefs: [objectionRef],
            authorityRefs: [authorityRef],
            outcome: "passed",
            effect: "binding",
            rationale: "Meets commons test",
            conditions: ["Review in 90 days"],
            decidedAt: "2026-01-05T00:00:00.000Z",
            decidedByRefs: [authorityRef]
          }
        }
      }),
      event({
        id: "packet-event",
        type: "governance.decision_packet.recorded",
        occurredAt: "2026-01-06T00:00:00.000Z",
        objectRef: packetRef,
        relatedRefs: [decisionRef, issueRef, proposalRef, claimRef, evidenceRef, objectionRef],
        authorityRefs: [authorityRef],
        payload: {
          decisionPacket: {
            id: "packet-1",
            type: "decision-packet",
            status: "complete",
            decisionRef,
            issueRefs: [issueRef],
            proposalRefs: [proposalRef],
            claimRefs: [claimRef],
            evidenceRefs: [evidenceRef],
            authorityRefs: [authorityRef],
            unresolvedObjectionRefs: [objectionRef],
            outcome: "passed",
            rationale: "Packet rationale",
            conditions: ["Post public notice"],
            redactionSummary: {
              hasRedactions: false,
              redactedRefs: [],
              sealedRefs: []
            }
          }
        }
      })
    ]);

    expect(projection.packetRef).toEqual(packetRef);
    expect(projection.status).toBe("complete");
    expect(projection.outcome).toBe("passed");
    expect(projection.rationale).toBe("Packet rationale");
    expect(projection.conditions).toEqual(["Post public notice", "Review in 90 days"]);
    expect(projection.authorityRefs).toEqual([authorityRef]);
    expect(projection.issueRefs).toEqual([issueRef]);
    expect(projection.proposalRefs).toEqual([proposalRef]);
    expect(projection.claims).toMatchObject([{ ref: claimRef, title: "Access supports food resilience" }]);
    expect(projection.evidence).toMatchObject([{ ref: evidenceRef, relation: "supports", claimRefs: [claimRef] }]);
    expect(projection.unresolvedObjectionRefs).toEqual([objectionRef]);
    expect(projection.decision).toMatchObject({
      ref: decisionRef,
      outcome: "passed",
      effect: "binding",
      rationale: "Meets commons test"
    });
    expect(projection.eventTrail.map((entry) => entry.id)).toEqual([
      "issue-event",
      "proposal-event",
      "claim-event",
      "evidence-link-event",
      "decision-event",
      "packet-event"
    ]);
  });

  it("collects stewardship and allocation outcomes connected to the decision", () => {
    const decisionRef = ref("decision", "decision-1");
    const holderRef = ref("person", "person-1", "identity");
    const resourceRef = ref("resource", "resource-1", "stewardship");
    const useRightRef = ref("use-right", "use-right-1", "stewardship");
    const ledgerRef = ref("ledger-entry", "ledger-1", "accounting");
    const accountRef = ref("ledger-account", "cash", "accounting");

    const projection = buildDecisionPacketProjection(decisionRef, [
      event({
        id: "decision-event",
        type: "governance.decision.recorded",
        objectRef: decisionRef,
        payload: { decision: { id: decisionRef.id, type: "decision", outcome: "passed" } }
      }),
      event({
        id: "use-right-event",
        type: "stewardship.use_right.granted",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: useRightRef,
        relatedRefs: [holderRef, resourceRef, decisionRef],
        sourceCapability: "stewardship",
        payload: {
          holderRefId: holderRef.id,
          resourceRefId: resourceRef.id,
          permissions: ["harvest"],
          conditions: ["log use"],
          decisionRefId: decisionRef.id,
          state: "active"
        }
      }),
      event({
        id: "ledger-event",
        type: "accounting.ledger_entry.posted",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: ledgerRef,
        relatedRefs: [decisionRef, accountRef],
        sourceCapability: "allocation-accounting",
        payload: {
          memo: "Allocate implementation budget",
          lines: [{ accountRef, side: "debit", amount: 100, unit: "usd" }],
          totals: { usd: { debit: 100, credit: 100 } }
        }
      })
    ]);

    expect(projection.stewardshipOutcomes).toEqual([
      {
        ref: useRightRef,
        eventId: "use-right-event",
        type: "stewardship.use_right.granted",
        occurredAt: "2026-01-02T00:00:00.000Z",
        state: "active",
        holderRef,
        resourceRef,
        permissions: ["harvest"],
        conditions: ["log use"],
        decisionRef
      }
    ]);
    expect(projection.allocationAccountingOutcomes).toMatchObject([
      {
        ref: ledgerRef,
        eventId: "ledger-event",
        memo: "Allocate implementation budget",
        lineCount: 1,
        isReversal: false
      }
    ]);
  });

  it("surfaces redaction and supersession indicators", () => {
    const decisionRef = ref("decision", "decision-1");
    const packetRef = ref("decision-packet", "packet-1");
    const replacementRef = ref("decision-packet", "packet-2");
    const sealedRef = ref("evidence", "sealed-1", "evidence");

    const projection = buildDecisionPacketProjection(decisionRef, [
      event({
        id: "packet-event",
        type: "governance.decision_packet.recorded",
        objectRef: packetRef,
        relatedRefs: [decisionRef],
        payload: {
          decisionPacket: {
            id: packetRef.id,
            type: "decision-packet",
            decisionRef,
            redactionSummary: {
              hasRedactions: true,
              redactedRefs: [sealedRef],
              sealedRefs: [sealedRef]
            },
            supersedesDecisionPacketRef: replacementRef
          }
        },
        redaction: {
          isRedactedStub: true,
          reason: "privacy",
          preservedFields: ["id", "type"],
          removedPayloadKeys: ["rationale"]
        },
        supersession: {
          supersededByEventId: "packet-event-2",
          replacementObjectRef: replacementRef,
          authorityRefs: []
        }
      })
    ]);

    expect(projection.redaction).toEqual({
      hasRedactions: true,
      redactedEventIds: ["packet-event"],
      redactionEventIds: [],
      redactedRefs: [sealedRef],
      sealedRefs: [sealedRef],
      reasons: ["privacy"],
      removedFields: ["rationale"],
      continuityEventIds: []
    });
    expect(projection.supersession).toEqual({
      hasSupersessions: true,
      supersededEventIds: ["packet-event"],
      supersedingEventIds: ["packet-event-2"],
      replacementRefs: [replacementRef],
      supersedesDecisionPacketRef: replacementRef
    });
    expect(projection.eventTrail[0]?.roles).toContain("redaction");
    expect(projection.eventTrail[0]?.roles).toContain("supersession");
  });

  it("deepens contested governance packet traces for Phase 8", () => {
    const decisionRef = ref("decision", "decision-1");
    const proposalRef = ref("proposal", "proposal-1");
    const amendmentRef = ref("amendment", "amendment-1");
    const objectionRef = ref("objection", "objection-1");
    const appealRef = ref("appeal", "appeal-1");
    const conflictRef = ref("conflict", "conflict-1");
    const policyRef = ref("policy", "policy-1");
    const policyVersionRef = ref("policy", "policy-version-1");
    const evidenceRef = ref("evidence", "evidence-1", "evidence");
    const redactionRef = ref("evidence", "redaction-1", "evidence");
    const packetRef = ref("decision-packet", "packet-1");

    const projection = buildDecisionPacketProjection(decisionRef, [
      event({
        id: "decision-event",
        type: "governance.decision.recorded",
        objectRef: decisionRef,
        relatedRefs: [proposalRef, evidenceRef],
        payload: {
          decision: {
            id: decisionRef.id,
            type: "decision",
            proposalRefs: [proposalRef],
            evidenceRefs: [evidenceRef],
            policyRefs: [policyRef],
            outcome: "passed"
          }
        }
      }),
      event({
        id: "amendment-event",
        type: "governance.amendment.submitted",
        objectRef: amendmentRef,
        relatedRefs: [proposalRef, decisionRef],
        payload: {
          amendment: {
            id: amendmentRef.id,
            type: "amendment",
            title: "Add appeal review condition",
            status: "open"
          }
        }
      }),
      event({
        id: "objection-event",
        type: "governance.objection.raised",
        objectRef: objectionRef,
        relatedRefs: [proposalRef, decisionRef, evidenceRef],
        payload: {
          objection: {
            id: objectionRef.id,
            type: "objection",
            summary: "Minority report is preserved.",
            status: "open"
          }
        }
      }),
      event({
        id: "appeal-event",
        type: "governance.appeal.opened",
        objectRef: appealRef,
        relatedRefs: [decisionRef, objectionRef, evidenceRef],
        payload: {
          appeal: {
            id: appealRef.id,
            type: "appeal",
            status: "open",
            summary: "Review redaction continuity before export."
          }
        }
      }),
      event({
        id: "conflict-event",
        type: "governance.conflict.closed",
        objectRef: conflictRef,
        relatedRefs: [decisionRef, objectionRef, appealRef, evidenceRef],
        payload: {
          conflict: {
            id: conflictRef.id,
            type: "conflict",
            status: "closed",
            title: "Export remedy conflict",
            description: "Conflict closed after appeal remedy preserved redaction continuity."
          }
        }
      }),
      event({
        id: "policy-version-event",
        type: "governance.policy.versioned",
        objectRef: policyRef,
        relatedRefs: [decisionRef],
        payload: {
          policyVersion: {
            id: policyVersionRef.id,
            type: "policy-version",
            title: "Policy v2",
            summaryOfChanges: "Adds contested export review.",
            status: "active"
          }
        }
      }),
      event({
        id: "redaction-event",
        type: "system.redaction.applied",
        objectRef: redactionRef,
        relatedRefs: [decisionRef, evidenceRef],
        sourceCapability: "data-stewardship",
        payload: {
          removedPayloadKeys: ["payload.schoolContact"],
          method: "field_removed"
        },
        redaction: {
          isRedactedStub: false,
          originalEventId: "evidence-event",
          redactionEventId: "redaction-event",
          redactedAt: "2026-01-07T00:00:00.000Z",
          reason: "consent_revoked",
          preservedFields: ["id", "type"],
          removedPayloadKeys: ["payload.schoolContact"]
        }
      }),
      event({
        id: "packet-event",
        type: "governance.decision_packet.recorded",
        objectRef: packetRef,
        relatedRefs: [
          decisionRef,
          amendmentRef,
          objectionRef,
          appealRef,
          conflictRef,
          policyVersionRef,
          redactionRef
        ],
        payload: {
          decisionPacket: {
            id: packetRef.id,
            type: "decision-packet",
            decisionRef,
            proposalRefs: [proposalRef],
            amendmentRefs: [amendmentRef],
            evidenceRefs: [evidenceRef],
            unresolvedObjectionRefs: [objectionRef],
            conflictRefs: [conflictRef],
            policyVersionRefs: [policyVersionRef],
            redactionSummary: {
              hasRedactions: true,
              redactedRefs: [evidenceRef],
              sealedRefs: []
            }
          }
        }
      })
    ]);

    expect(projection.amendmentRefs).toEqual([amendmentRef]);
    expect(projection.objectionRefs).toEqual([objectionRef]);
    expect(projection.appealRefs).toEqual([appealRef]);
    expect(projection.conflictRefs).toEqual([conflictRef]);
    expect(projection.policyVersionRefs).toEqual([policyVersionRef]);
    expect(projection.amendments).toMatchObject([{ ref: amendmentRef, title: "Add appeal review condition" }]);
    expect(projection.objections).toMatchObject([{ ref: objectionRef, summary: "Minority report is preserved." }]);
    expect(projection.appeals).toMatchObject([{ ref: appealRef, summary: "Review redaction continuity before export." }]);
    expect(projection.conflicts).toMatchObject([{ ref: conflictRef, title: "Export remedy conflict" }]);
    expect(projection.policyVersions).toMatchObject([{ ref: policyVersionRef, title: "Policy v2" }]);
    expect(projection.redaction).toMatchObject({
      reasons: ["consent_revoked"],
      removedFields: ["payload.schoolContact"],
      continuityEventIds: ["redaction-event"]
    });
    expect(projection.eventTrail.find((entry) => entry.id === "appeal-event")?.roles).toContain("appeal");
    expect(projection.eventTrail.find((entry) => entry.id === "conflict-event")?.roles).toContain("conflict");
    expect(projection.eventTrail.find((entry) => entry.id === "policy-version-event")?.roles).toContain("policy-version");
  });
});
