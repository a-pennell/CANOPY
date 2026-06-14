import { describe, expect, it } from "vitest";
import type { LocalSourcePointer, ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  ClaimsEvidenceError,
  contestClaim,
  createClaim,
  ingestEvidence,
  linkEvidenceToClaim,
  reviewClaim
} from "./index.js";

const occurredAt = "2026-06-13T12:00:00.000Z";

const ref = (
  id: string,
  type: ObjectRef["type"],
  namespace = "claims-evidence",
  source?: LocalSourcePointer
): ObjectRef => ({
  id,
  type,
  namespace,
  lifecycleStatus: "active",
  ...(source === undefined ? {} : { source })
});

const actorRef = ref("person.mira", "person", "people");
const claimRef = ref("claim.river-flow", "claim", "sensemaking");
const contestRef = ref("claim.river-flow.counter", "claim", "sensemaking");
const evidenceRef = ref("evidence.flow-gauge", "evidence", "sensemaking");
const sourceRef = ref("source.flow-gauge", "source", "sensemaking");
const mandateRef = ref("mandate.watershed-steward", "mandate", "authority");

describe("claims evidence capability", () => {
  it("creates claims as canonical refs and append-only events", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();

    const result = createClaim(
      { registry, memory },
      {
        claimRef,
        actorRef,
        relatedRefs: [ref("living-system.riverbend", "living-system", "ecology")],
        occurredAt,
        dataState: "testimony_derived",
        payload: { summary: "Riverbend needs a January base flow review." }
      }
    );

    expect(result.append.sequence).toBe(1);
    expect(result.event).toMatchObject({
      id: "event.claim.created.claim-river-flow",
      type: "claim.created",
      actorRef,
      objectRef: claimRef,
      authorityRefs: [],
      sourceCapability: "claims-evidence",
      payload: {
        status: "review_required",
        summary: "Riverbend needs a January base flow review."
      },
      dataState: "testimony_derived"
    });
    expect(registry.resolve(claimRef.id)).toEqual(claimRef);
    expect(memory.queryObjectEvents(claimRef).map((event) => event.id)).toEqual([
      result.event.id
    ]);
  });

  it("ingests evidence with source mappings and source refs", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const source: LocalSourcePointer = {
      sourceProject: "sensemaking",
      sourceEntity: "gauge_reading",
      sourceId: "reading-42",
      sourceVersion: "v1",
      importedAt: occurredAt
    };
    const sourcedEvidenceRef = {
      ...evidenceRef,
      source
    } satisfies ObjectRef;

    const result = ingestEvidence(
      { registry, memory },
      {
        evidenceRef: sourcedEvidenceRef,
        sourceRef,
        actorRef,
        relatedRefs: [claimRef],
        occurredAt,
        dataState: "sensor_derived",
        payload: { evidenceKind: "gauge_reading" },
        contentHash: "sha256:flow-gauge"
      }
    );

    expect(result.event).toMatchObject({
      type: "evidence.created",
      objectRef: sourcedEvidenceRef,
      relatedRefs: [sourceRef, claimRef],
      payload: {
        evidenceKind: "gauge_reading",
        sourceRefId: sourceRef.id
      },
      dataState: "sensor_derived",
      contentHash: "sha256:flow-gauge"
    });
    expect(registry.resolveSource(source)).toEqual(sourcedEvidenceRef);
  });

  it("links evidence to a claim without provider ids becoming canonical ids", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();

    const result = linkEvidenceToClaim(
      { registry, memory },
      {
        evidenceRef,
        claimRef,
        actorRef,
        relation: "supports",
        occurredAt,
        dataState: "locally_verified"
      }
    );

    expect(result.event).toMatchObject({
      type: "evidence.linked_to_claim",
      objectRef: evidenceRef,
      relatedRefs: [claimRef],
      payload: {
        claimRefId: claimRef.id,
        relation: "supports"
      }
    });
    expect(registry.resolve(evidenceRef.id)).toEqual(evidenceRef);
    expect(registry.resolve(claimRef.id)).toEqual(claimRef);
  });

  it("reviews claims only with non-machine authority refs", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();

    const result = reviewClaim(
      { registry, memory },
      {
        claimRef,
        actorRef,
        reviewerRef: actorRef,
        evidenceRefs: [evidenceRef],
        authorityRefs: [mandateRef],
        disposition: "accepted",
        occurredAt,
        dataState: "expert_reviewed"
      }
    );

    expect(result.event).toMatchObject({
      type: "claim.reviewed",
      objectRef: claimRef,
      relatedRefs: [evidenceRef, actorRef],
      authorityRefs: [mandateRef],
      payload: {
        disposition: "accepted",
        evidenceRefIds: [evidenceRef.id]
      },
      dataState: "expert_reviewed"
    });
  });

  it("rejects model output and AI source refs as claim review authority", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const modelOutputRef = ref(
      "model-output.flow-risk-jan",
      "evidence",
      "sensemaking"
    );
    const aiSourcedAuthorityRef = ref("mandate.synthetic", "mandate", "authority", {
      sourceProject: "sensemaking",
      sourceEntity: "ai_model_authority_guess",
      sourceId: "llm-1"
    });

    expect(() =>
      reviewClaim(
        { registry, memory },
        {
          claimRef,
          actorRef,
          authorityRefs: [modelOutputRef],
          disposition: "accepted",
          occurredAt
        }
      )
    ).toThrow(ClaimsEvidenceError);

    expect(() =>
      reviewClaim(
        { registry, memory },
        {
          claimRef,
          actorRef,
          authorityRefs: [aiSourcedAuthorityRef],
          disposition: "binding",
          occurredAt
        }
      )
    ).toThrow(ClaimsEvidenceError);

    expect(memory.replay().events).toHaveLength(0);
  });

  it("contests claims with a counterclaim and supporting evidence", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();

    const result = contestClaim(
      { registry, memory },
      {
        claimRef,
        contestRef,
        actorRef,
        evidenceRefs: [evidenceRef],
        occurredAt,
        dataState: "contested",
        payload: { reason: "Gauge reading conflicts with testimony." }
      }
    );

    expect(result.event).toMatchObject({
      type: "claim.contested",
      objectRef: claimRef,
      relatedRefs: [contestRef, evidenceRef],
      authorityRefs: [],
      payload: {
        contestRefId: contestRef.id,
        evidenceRefIds: [evidenceRef.id],
        reason: "Gauge reading conflicts with testimony."
      },
      dataState: "contested"
    });
    expect(registry.resolve(contestRef.id)).toEqual(contestRef);
  });
});
