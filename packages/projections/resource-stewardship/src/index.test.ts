import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { buildResourceStewardshipProjection } from "./index";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.stewardship",
  lifecycleStatus: "active"
});

const resourceRef = ref("resource.north-pasture", "resource");
const otherResourceRef = ref("resource.south-pasture", "resource");
const holderRef = ref("person.mira", "person");
const useRightRef = ref("use-right.north-pasture.grazing", "use-right");
const proposedUseRightRef = ref("use-right.north-pasture.foraging", "use-right");
const issueRef = ref("issue.north-pasture-review", "issue");
const proposalRef = ref("proposal.north-pasture-grazing", "proposal");
const decisionRef = ref("decision.north-pasture-grazing", "decision");
const mandateRef = ref("mandate.watershed-steward", "mandate");
const claimRef = ref("claim.soil-recovery", "claim");
const evidenceRef = ref("evidence.soil-sample", "evidence");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "stewardship.resource.created",
  occurredAt: "2026-06-01T00:00:00.000Z",
  objectRef: resourceRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "stewardship",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

const scopePayload = {
  holderRefId: holderRef.id,
  resourceRefId: resourceRef.id,
  permissions: ["graze.light"],
  conditions: ["no grazing inside riparian buffer"],
  term: {
    startsAt: "2026-06-15T00:00:00.000Z",
    endsAt: "2026-09-15T00:00:00.000Z"
  },
  review: {
    reviewPathRefId: issueRef.id,
    reviewAt: "2026-08-15T00:00:00.000Z"
  },
  revocation: {
    revocable: true,
    revocationPathRefId: issueRef.id,
    revocationConditions: ["threshold breach", "unresolved condition violation"]
  }
};

describe("buildResourceStewardshipProjection", () => {
  it("builds a resource read model with context, linked refs, ecological ids, event trail, and counts", () => {
    const projection = buildResourceStewardshipProjection(resourceRef, [
      event({
        id: "event.outside",
        objectRef: otherResourceRef,
        payload: { resourceRefId: otherResourceRef.id }
      }),
      event({
        id: "event.context",
        type: "stewardship.resource_context.recorded",
        occurredAt: "2026-06-03T00:00:00.000Z",
        livingSystemId: "living-system.riverbend-creek",
        payload: {
          resourceRefId: resourceRef.id,
          observedAt: "2026-06-02T12:00:00.000Z",
          context: {
            soilMoisture: "low",
            carryingCapacity: 12
          }
        }
      }),
      event({
        id: "event.claim",
        type: "claim.created",
        occurredAt: "2026-06-02T00:00:00.000Z",
        objectRef: claimRef,
        relatedRefs: [resourceRef, evidenceRef],
        sourceCapability: "claims-evidence",
        payload: { summary: "Pasture soil is recovering." }
      }),
      event({
        id: "event.created",
        occurredAt: "2026-06-01T00:00:00.000Z",
        relatedRefs: [holderRef],
        payload: {
          title: "North pasture",
          resourceKind: "pasture",
          summary: "Shared seasonal grazing ground."
        }
      })
    ]);

    expect(projection.resourceRef).toEqual(resourceRef);
    expect(projection).toMatchObject({
      title: "North pasture",
      summary: "Shared seasonal grazing ground.",
      resourceKind: "pasture"
    });
    expect(projection.contextEvents).toEqual([
      {
        eventId: "event.context",
        occurredAt: "2026-06-03T00:00:00.000Z",
        observedAt: "2026-06-02T12:00:00.000Z",
        ecologicalContextIds: ["living-system.riverbend-creek"],
        summary: {
          soilMoisture: "low",
          carryingCapacity: 12
        }
      }
    ]);
    expect(projection.linkedRefs).toEqual({
      proposals: [],
      decisions: [],
      claims: [claimRef],
      evidence: [evidenceRef]
    });
    expect(projection.ecologicalContextIds).toEqual(["living-system.riverbend-creek"]);
    expect(projection.eventTrail.map((entry) => entry.id)).toEqual([
      "event.created",
      "event.claim",
      "event.context"
    ]);
    expect(projection.eventTrail.map((entry) => entry.relevance)).toEqual([
      "resource",
      "linked",
      "resource"
    ]);
    expect(projection.counts).toEqual({
      totalEvents: 3,
      contextEvents: 1,
      useRights: {
        proposed: 0,
        granted: 0,
        revoked: 0
      },
      byNamespace: [
        { namespace: "claim", count: 1 },
        { namespace: "stewardship", count: 2 }
      ],
      byCapability: [
        { capability: "claims-evidence", count: 1 },
        { capability: "stewardship", count: 2 }
      ]
    });
  });

  it("summarizes proposed, granted, and revoked use-right state with holder, review, revocation, authority, proposal, and decision refs", () => {
    const projection = buildResourceStewardshipProjection(resourceRef, [
      event({
        id: "event.proposed",
        type: "stewardship.use_right.proposed",
        occurredAt: "2026-06-04T00:00:00.000Z",
        objectRef: useRightRef,
        relatedRefs: [holderRef, resourceRef, issueRef, proposalRef],
        payload: {
          ...scopePayload,
          proposalRefId: proposalRef.id,
          state: "proposed"
        }
      }),
      event({
        id: "event.granted",
        type: "stewardship.use_right.granted",
        occurredAt: "2026-06-05T00:00:00.000Z",
        objectRef: useRightRef,
        relatedRefs: [holderRef, resourceRef, issueRef, decisionRef],
        authorityRefs: [mandateRef],
        payload: {
          ...scopePayload,
          decisionRefId: decisionRef.id,
          authorityRefIds: [mandateRef.id],
          grantNote: "Approved by watershed steward.",
          state: "active"
        }
      }),
      event({
        id: "event.revoked",
        type: "stewardship.use_right.revoked",
        occurredAt: "2026-07-01T00:00:00.000Z",
        objectRef: useRightRef,
        relatedRefs: [holderRef, resourceRef, issueRef, decisionRef],
        authorityRefs: [mandateRef],
        payload: {
          resourceRefId: resourceRef.id,
          reason: "Riparian threshold breach.",
          state: "revoked"
        }
      }),
      event({
        id: "event.proposed.only",
        type: "stewardship.use_right.proposed",
        occurredAt: "2026-06-06T00:00:00.000Z",
        objectRef: proposedUseRightRef,
        relatedRefs: [holderRef, resourceRef, issueRef],
        payload: {
          ...scopePayload,
          permissions: ["forage"],
          state: "proposed"
        }
      })
    ]);

    const revokedUseRight = projection.useRights.find(
      (useRight) => useRight.useRightRef.id === useRightRef.id
    );
    const proposedUseRight = projection.useRights.find(
      (useRight) => useRight.useRightRef.id === proposedUseRightRef.id
    );

    expect(projection.useRights).toHaveLength(2);
    expect(revokedUseRight).toMatchObject({
      useRightRef,
      state: "revoked",
      holderRef,
      holderRefId: holderRef.id,
      resourceRef,
      permissions: ["graze.light"],
      conditions: ["no grazing inside riparian buffer"],
      term: {
        startsAt: "2026-06-15T00:00:00.000Z",
        endsAt: "2026-09-15T00:00:00.000Z"
      },
      review: {
        reviewPathRef: issueRef,
        reviewPathRefId: issueRef.id,
        reviewAt: "2026-08-15T00:00:00.000Z"
      },
      revocation: {
        revocable: true,
        revocationPathRef: issueRef,
        revocationPathRefId: issueRef.id,
        revocationConditions: ["threshold breach", "unresolved condition violation"],
        revokedAt: "2026-07-01T00:00:00.000Z",
        revocationEventId: "event.revoked",
        reason: "Riparian threshold breach."
      },
      proposalRefs: [proposalRef],
      proposalRefIds: [proposalRef.id],
      decisionRefs: [decisionRef],
      decisionRefIds: [decisionRef.id],
      authorityRefs: [mandateRef],
      proposedEventIds: ["event.proposed"],
      grantedEventIds: ["event.granted"],
      revokedEventIds: ["event.revoked"],
      latestEventId: "event.revoked",
      latestEventAt: "2026-07-01T00:00:00.000Z"
    });
    expect(proposedUseRight).toMatchObject({
      useRightRef: proposedUseRightRef,
      state: "proposed",
      permissions: ["forage"],
      proposedEventIds: ["event.proposed.only"],
      grantedEventIds: [],
      revokedEventIds: []
    });
    expect(projection.authorityRefs).toEqual([mandateRef]);
    expect(projection.linkedRefs.proposals).toEqual([proposalRef]);
    expect(projection.linkedRefs.decisions).toEqual([decisionRef]);
    expect(projection.counts.useRights).toEqual({
      proposed: 1,
      granted: 0,
      revoked: 1
    });
  });
});
