import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { firstReplayableGoldenFixtureEvents } from "@canopy/contracts-testing";
import { buildAuthorityProjection, buildAuthorityTrace } from "./index";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test",
  lifecycleStatus: "active"
});

const actorRef = ref("person.mira", "person");
const membershipRef = ref("membership.mira.coop", "organization");
const mandateRef = ref("mandate.watershed.2026", "mandate");
const delegationRef = ref("delegation.grazing.2026", "agreement");
const guardianRef = ref("guardian.riverbend", "guardian-review");
const policyRef = ref("policy.resource-use", "policy");
const decisionRef = ref("decision.grazing", "decision");
const useRightRef = ref("use-right.grazing", "use-right");
const resourceRef = ref("resource.north-pasture", "resource");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "object.created",
  occurredAt: "2026-01-01T00:00:00.000Z",
  actorRef,
  objectRef: resourceRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "identity-authority",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

describe("buildAuthorityProjection", () => {
  it("builds provider-neutral authority read models across authority object kinds", () => {
    const projection = buildAuthorityProjection([
      event({
        id: "event.membership",
        type: "identity.membership.activated",
        objectRef: membershipRef,
        authorityRefs: [],
        payload: { title: "Mira membership" }
      }),
      event({
        id: "event.role",
        type: "authority.role.assigned",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: ref("role.steward", "role"),
        relatedRefs: [membershipRef],
        authorityRefs: [mandateRef]
      }),
      event({
        id: "event.mandate",
        type: "authority.mandate.granted",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: mandateRef,
        authorityRefs: [decisionRef]
      }),
      event({
        id: "event.delegation",
        type: "authority.delegation.granted",
        occurredAt: "2026-01-04T00:00:00.000Z",
        objectRef: delegationRef,
        authorityRefs: [mandateRef]
      }),
      event({
        id: "event.guardian",
        type: "authority.guardian.appointed",
        occurredAt: "2026-01-05T00:00:00.000Z",
        objectRef: guardianRef,
        authorityRefs: [mandateRef]
      }),
      event({
        id: "event.policy",
        type: "governance.policy.versioned",
        occurredAt: "2026-01-06T00:00:00.000Z",
        objectRef: policyRef,
        authorityRefs: [mandateRef]
      }),
      event({
        id: "event.decision",
        type: "governance.decision.recorded",
        occurredAt: "2026-01-07T00:00:00.000Z",
        objectRef: decisionRef,
        authorityRefs: [mandateRef],
        payload: { effect: "binding" }
      }),
      event({
        id: "event.use-right",
        type: "stewardship.use_right.granted",
        occurredAt: "2026-01-08T00:00:00.000Z",
        objectRef: useRightRef,
        relatedRefs: [resourceRef],
        authorityRefs: [decisionRef]
      })
    ]);

    expect(projection.actorRefs).toEqual([actorRef]);
    expect(projection.authorityRefs).toEqual([decisionRef, mandateRef]);
    expect(projection.authorityEvents.map((authorityEvent) => authorityEvent.kind)).toEqual([
      "membership",
      "role",
      "mandate",
      "delegation",
      "guardian",
      "policy",
      "decision",
      "use-right"
    ]);
    expect(projection.bindingCoverage).toHaveLength(7);
    expect(projection.bindingCoverage.every((entry) => entry.covered)).toBe(true);
    expect(projection.indicators.status).toBe("ok");
    expect(projection.tracesByObject.find((trace) => trace.objectRef.id === resourceRef.id)?.events).toHaveLength(1);
  });

  it("surfaces membership-only warnings and denied indicators for missing authority", () => {
    const projection = buildAuthorityProjection([
      event({
        id: "event.membership-only-decision",
        type: "governance.decision.recorded",
        objectRef: decisionRef,
        authorityRefs: [membershipRef],
        payload: { effect: "binding" }
      }),
      event({
        id: "event.missing-use-right",
        type: "stewardship.use_right.revoked",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: useRightRef,
        authorityRefs: []
      })
    ]);

    expect(projection.membershipOnlyWarnings).toHaveLength(1);
    expect(projection.membershipOnlyWarnings[0]?.eventId).toBe(
      "event.membership-only-decision"
    );
    expect(projection.bindingCoverage).toEqual([
      {
        eventId: "event.membership-only-decision",
        eventType: "governance.decision.recorded",
        objectRef: decisionRef,
        occurredAt: "2026-01-01T00:00:00.000Z",
        authorityRefs: [membershipRef],
        covered: false,
        membershipOnly: true
      },
      {
        eventId: "event.missing-use-right",
        eventType: "stewardship.use_right.revoked",
        objectRef: useRightRef,
        occurredAt: "2026-01-02T00:00:00.000Z",
        authorityRefs: [],
        covered: false,
        membershipOnly: false
      }
    ]);
    expect(projection.indicators).toEqual({
      status: "denied",
      hasDenied: true,
      hasAttention: true,
      missingAuthorityEventIds: ["event.missing-use-right"],
      membershipOnlyWarningEventIds: ["event.membership-only-decision"],
      uncoveredBindingEventIds: [
        "event.membership-only-decision",
        "event.missing-use-right"
      ],
      authorityFlowIssueEventIds: []
    });
  });

  it("surfaces executable governance authority flow findings from full record payloads", () => {
    const projection = buildAuthorityProjection([
      event({
        id: "event.bad-delegation",
        type: "authority.delegation.granted",
        objectRef: delegationRef,
        authorityRefs: [mandateRef],
        payload: {
          delegation: {
            status: "active",
            scope: {},
            delegatedAuthorityRefs: [],
            delegatorRef: actorRef,
            delegateRef: actorRef
          }
        }
      }),
      event({
        id: "event.bad-proposal",
        type: "governance.proposal.opened",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: ref("proposal.emergency", "proposal"),
        authorityRefs: [mandateRef],
        payload: {
          proposal: {
            proposedByRefs: [],
            objectionRefs: [resourceRef],
            decisionMethod: {
              kind: "emergency_authority",
              eligibleVoterRefs: [],
              authorityRefs: [mandateRef],
              notes: "Emergency review required."
            }
          }
        }
      }),
      event({
        id: "event.bad-decision",
        type: "governance.decision.recorded",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: decisionRef,
        authorityRefs: [mandateRef],
        payload: {
          decision: {
            effect: "binding",
            decidedByRefs: [],
            unresolvedObjectionRefs: [resourceRef],
            method: {
              kind: "consent",
              authorityRefs: [mandateRef]
            }
          }
        }
      }),
      event({
        id: "event.bad-appeal",
        type: "governance.appeal.opened",
        occurredAt: "2026-01-04T00:00:00.000Z",
        objectRef: ref("appeal.grazing", "appeal"),
        authorityRefs: [mandateRef],
        payload: {
          appeal: {
            status: "under_review",
            grounds: [],
            reviewerRefs: []
          }
        }
      }),
      event({
        id: "event.bad-emergency",
        type: "governance.decision.recorded",
        occurredAt: "2026-01-05T00:00:00.000Z",
        objectRef: ref("decision.emergency", "decision"),
        authorityRefs: [mandateRef],
        payload: {
          decision: {
            effect: "binding",
            decidedByRefs: [actorRef],
            unresolvedObjectionRefs: [resourceRef],
            conditions: [],
            method: {
              kind: "emergency_authority",
              authorityRefs: [mandateRef]
            }
          }
        }
      })
    ]);

    expect(projection.findings.map((finding) => finding.kind)).toEqual([
      "appeal-missing-grounds",
      "appeal-missing-reviewer",
      "decision-missing-decider",
      "decision-unresolved-objections",
      "authority-empty-scope",
      "delegation-empty-grant",
      "delegation-self-delegation",
      "emergency-missing-authority",
      "emergency-missing-constraints",
      "emergency-missing-authority",
      "proposal-missing-proposer",
      "proposal-unresolved-blocking-objections"
    ]);
    expect(projection.indicators.authorityFlowIssueEventIds).toEqual([
      "event.bad-appeal",
      "event.bad-decision",
      "event.bad-delegation",
      "event.bad-emergency",
      "event.bad-proposal"
    ]);
    expect(projection.indicators.status).toBe("denied");
  });

  it("builds an authority trace by object", () => {
    const trace = buildAuthorityTrace(mandateRef, [
      event({
        id: "event.mandate",
        type: "authority.mandate.granted",
        objectRef: mandateRef,
        authorityRefs: [decisionRef]
      }),
      event({
        id: "event.decision",
        type: "governance.decision.recorded",
        occurredAt: "2026-01-02T00:00:00.000Z",
        objectRef: decisionRef,
        authorityRefs: [mandateRef],
        payload: { effect: "binding" }
      }),
      event({
        id: "event.related",
        type: "claim.created",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: ref("claim.flow", "claim"),
        relatedRefs: [mandateRef],
        authorityRefs: []
      })
    ]);

    expect(trace.objectRef).toEqual(mandateRef);
    expect(trace.events.map((traceEvent) => traceEvent.relevance)).toEqual([
      "object",
      "authority",
      "related"
    ]);
    expect(trace.authorityRefs).toEqual([decisionRef, mandateRef]);
    expect(trace.status).toBe("ok");
  });

  it("covers the first replayable golden fixture authority invariant", () => {
    const projection = buildAuthorityProjection(firstReplayableGoldenFixtureEvents);

    expect(projection.authorityEvents.map((authorityEvent) => authorityEvent.type)).toContain(
      "authority.mandate.granted"
    );
    expect(projection.bindingCoverage.find((entry) => entry.eventType === "governance.decision.recorded")?.covered).toBe(true);
    expect(projection.membershipOnlyWarnings).toEqual([]);
    expect(projection.indicators.status).toBe("ok");
    expect(projection.indicators.missingAuthorityEventIds).toEqual([]);
  });
});
