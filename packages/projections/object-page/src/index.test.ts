import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { buildObjectPageProjection } from "./index";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test",
  lifecycleStatus: "active"
});

const objectRef = ref("resource.north-pasture", "resource");
const claimRef = ref("claim.flow-need", "claim");
const authorityRef = ref("mandate.steward", "mandate");
const replacementRef = ref("resource.north-pasture.v2", "resource");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "object.created",
  occurredAt: "2026-01-01T00:00:00.000Z",
  objectRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "stewardship",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

describe("buildObjectPageProjection", () => {
  it("builds a deterministic object page from direct and referencing events", () => {
    const projection = buildObjectPageProjection(objectRef, [
      event({
        id: "event.unrelated",
        objectRef: ref("other", "resource"),
        payload: { title: "Other" }
      }),
      event({
        id: "event.claim",
        type: "claim.created",
        occurredAt: "2026-01-03T00:00:00.000Z",
        objectRef: claimRef,
        relatedRefs: [objectRef],
        authorityRefs: [authorityRef],
        sourceCapability: "claims-evidence",
        payload: { summary: "Flow evidence is linked to the pasture." }
      }),
      event({
        id: "event.object",
        occurredAt: "2026-01-02T00:00:00.000Z",
        payload: { title: "North Pasture", summary: "Shared grazing resource." }
      })
    ]);

    expect(projection.objectRef).toEqual(objectRef);
    expect(projection.title).toBe("North Pasture");
    expect(projection.summary).toBe("Flow evidence is linked to the pasture.");
    expect(projection.timelineEvents.map((timelineEvent) => timelineEvent.id)).toEqual([
      "event.object",
      "event.claim"
    ]);
    expect(projection.timelineEvents.map((timelineEvent) => timelineEvent.relevance)).toEqual([
      "direct",
      "related"
    ]);
    expect(projection.relatedRefs).toEqual([claimRef]);
    expect(projection.authorityRefs).toEqual([authorityRef]);
    expect(projection.sourceCapabilities).toEqual(["claims-evidence", "stewardship"]);
    expect(projection.counts).toEqual({
      totalEvents: 2,
      byNamespace: [
        {
          namespace: "claim",
          count: 1,
          capabilities: [{ capability: "claims-evidence", count: 1 }]
        },
        {
          namespace: "object",
          count: 1,
          capabilities: [{ capability: "stewardship", count: 1 }]
        }
      ],
      byCapability: [
        { capability: "claims-evidence", count: 1 },
        { capability: "stewardship", count: 1 }
      ]
    });
  });

  it("surfaces redaction and supersession continuity without provider assumptions", () => {
    const projection = buildObjectPageProjection(
      { ...objectRef, lifecycleStatus: "superseded" },
      [
        event({
          id: "event.original",
          redaction: {
            isRedactedStub: true,
            redactionEventId: "event.redaction",
            preservedFields: ["id", "type"],
            removedPayloadKeys: ["privateNote"]
          }
        }),
        event({
          id: "event.supersession",
          type: "object.relationship.superseded",
          occurredAt: "2026-01-02T00:00:00.000Z",
          supersession: {
            supersedesEventId: "event.original",
            supersededByEventId: "event.replacement",
            replacementObjectRef: replacementRef,
            authorityRefs: [authorityRef]
          }
        })
      ]
    );

    expect(projection.redaction).toEqual({
      isObjectRedacted: false,
      hasRedactedEvents: true,
      redactedEventIds: ["event.original"],
      redactionEventIds: ["event.redaction"]
    });
    expect(projection.supersession).toEqual({
      isObjectSuperseded: true,
      hasSupersededEvents: true,
      supersededEventIds: ["event.supersession"],
      supersedingEventIds: ["event.replacement"],
      replacementRefs: [replacementRef]
    });
  });
});
