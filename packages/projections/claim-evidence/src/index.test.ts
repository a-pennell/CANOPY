import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import {
  buildClaimEvidenceProjection,
  buildClaimEvidenceProjectionForClaim
} from "./index.js";

const ref = (
  id: string,
  type: ObjectRef["type"],
  sourceEntity: string = type
): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test",
  lifecycleStatus: "active",
  source: {
    sourceProject: "canopy",
    sourceEntity,
    sourceId: id
  }
});

const actorRef = ref("person.mira", "person");
const claimRef = ref("claim.flow-need", "claim");
const counterClaimRef = ref("claim.flow-counter", "claim");
const evidenceRef = ref("evidence.gauge", "evidence");
const sourceRef = ref("source.gauge-system", "source");
const reviewerRef = ref("person.reviewer", "person");
const authorityRef = ref("mandate.flow-review", "mandate");
const modelRef = ref("model.flow-forecast", "model");
const modelOutputRef = ref("model-output.flow-risk", "evidence", "model-output");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "claim.created",
  occurredAt: "2026-01-15T12:00:00.000Z",
  actorRef,
  objectRef: claimRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "claims-evidence",
  payload: {},
  schemaVersion: 1,
  visibility: "public",
  ...overrides
});

describe("claim evidence projection", () => {
  it("builds provider-neutral read models for claims, evidence, links, review, contest, and counts", () => {
    const events = [
      event({
        id: "event.claim.created",
        type: "claim.created",
        occurredAt: "2026-01-15T12:00:00.000Z",
        payload: {
          title: "Base flow need",
          summary: "The creek needs a January base flow."
        }
      }),
      event({
        id: "event.evidence.created",
        type: "evidence.created",
        occurredAt: "2026-01-15T12:01:00.000Z",
        objectRef: evidenceRef,
        relatedRefs: [sourceRef],
        payload: { evidenceKind: "gauge_reading" },
        dataState: "sensor_derived"
      }),
      event({
        id: "event.evidence.linked",
        type: "evidence.linked_to_claim",
        occurredAt: "2026-01-15T12:02:00.000Z",
        objectRef: evidenceRef,
        relatedRefs: [claimRef],
        payload: {
          claimRefId: claimRef.id,
          relation: "supports"
        }
      }),
      event({
        id: "event.claim.reviewed",
        type: "claim.reviewed",
        occurredAt: "2026-01-15T12:03:00.000Z",
        relatedRefs: [evidenceRef, reviewerRef],
        authorityRefs: [authorityRef],
        payload: {
          disposition: "accepted",
          evidenceRefIds: [evidenceRef.id]
        },
        dataState: "expert_reviewed"
      }),
      event({
        id: "event.claim.contested",
        type: "claim.contested",
        occurredAt: "2026-01-15T12:04:00.000Z",
        relatedRefs: [counterClaimRef, evidenceRef],
        payload: {
          contestRefId: counterClaimRef.id,
          evidenceRefIds: [evidenceRef.id]
        },
        dataState: "contested"
      })
    ];

    const projection = buildClaimEvidenceProjection(events);
    const claim = projection.claims.find((model) => model.claimRef.id === claimRef.id);

    expect(projection.claimRefs).toEqual([counterClaimRef, claimRef]);
    expect(projection.evidenceRefs).toEqual([evidenceRef]);
    expect(projection.evidenceLinks).toMatchObject([
      {
        claimRef,
        evidenceRef,
        relation: "supports",
        eventId: "event.evidence.linked"
      }
    ]);
    expect(claim).toMatchObject({
      claimRef,
      status: "contested",
      createdEventId: "event.claim.created",
      title: "Base flow need",
      summary: "The creek needs a January base flow."
    });
    expect(claim?.evidenceRefs).toEqual([evidenceRef]);
    expect(claim?.reviews[0]).toMatchObject({
      eventId: "event.claim.reviewed",
      disposition: "accepted",
      authorityRefs: [authorityRef]
    });
    expect(claim?.contests[0]).toMatchObject({
      eventId: "event.claim.contested",
      contestRef: counterClaimRef,
      evidenceRefs: [evidenceRef]
    });
    expect(projection.authorityRefs).toEqual([authorityRef]);
    expect(projection.sourceCapabilities).toEqual(["claims-evidence"]);
    expect(projection.counts).toMatchObject({
      claims: 2,
      evidence: 1,
      evidenceLinks: 1,
      reviews: 1,
      contests: 1,
      totalEvents: 5
    });
    expect(projection.counts.byNamespace).toEqual([
      { namespace: "claim", count: 3 },
      { namespace: "evidence", count: 2 }
    ]);
  });

  it("marks AI and model outputs as non-authority indicators when related to a claim", () => {
    const projection = buildClaimEvidenceProjection([
      event({
        id: "event.claim.created",
        type: "claim.created",
        objectRef: claimRef
      }),
      event({
        id: "event.model.output",
        type: "model.output.generated",
        occurredAt: "2026-01-15T12:01:00.000Z",
        objectRef: modelOutputRef,
        relatedRefs: [modelRef, claimRef],
        authorityRefs: [],
        sourceCapability: "ecological-modeling",
        systemActor: "ai_assistant",
        payload: { canAuthorizeBindingAction: false },
        dataState: "machine_inferred"
      }),
      event({
        id: "event.claim.reviewed.bad-authority",
        type: "claim.reviewed",
        occurredAt: "2026-01-15T12:02:00.000Z",
        objectRef: claimRef,
        relatedRefs: [modelOutputRef],
        authorityRefs: [modelOutputRef],
        payload: { disposition: "reviewed" }
      })
    ]);

    expect(projection.aiNonAuthorityIndicators).toMatchObject([
      {
        eventId: "event.model.output",
        objectRef: modelOutputRef,
        relatedClaimRefs: [claimRef],
        reason: "ai_assistant_event"
      },
      {
        eventId: "event.claim.reviewed.bad-authority",
        objectRef: claimRef,
        relatedClaimRefs: [claimRef],
        reason: "machine_output_present_in_authority_refs"
      }
    ]);
    expect(projection.claims[0]?.aiNonAuthorityIndicators).toHaveLength(2);
    expect(projection.evidence[0]).toMatchObject({
      evidenceRef: modelOutputRef,
      isAiOrModelOutput: true
    });
  });

  it("can build a projection for one claim from a mixed stream", () => {
    const otherClaimRef = ref("claim.other", "claim");
    const claim = buildClaimEvidenceProjectionForClaim(claimRef, [
      event({
        id: "event.other",
        type: "claim.created",
        objectRef: otherClaimRef,
        payload: { title: "Other claim" }
      }),
      event({
        id: "event.target",
        type: "claim.created",
        objectRef: claimRef,
        payload: { title: "Target claim" }
      }),
      event({
        id: "event.link",
        type: "evidence.linked_to_claim",
        occurredAt: "2026-01-15T12:02:00.000Z",
        objectRef: evidenceRef,
        relatedRefs: [claimRef],
        payload: { relation: "qualifies" }
      })
    ]);

    expect(claim.claimRef).toEqual(claimRef);
    expect(claim.title).toBe("Target claim");
    expect(claim.evidenceLinks).toMatchObject([
      {
        relation: "qualifies",
        evidenceRef
      }
    ]);
    expect(claim.eventTrail.map((entry) => entry.id)).toEqual(["event.target", "event.link"]);
  });
});
