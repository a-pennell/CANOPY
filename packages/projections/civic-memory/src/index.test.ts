import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { buildCivicMemoryProjection } from "./index";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test",
  lifecycleStatus: "active"
});

const orgRef = ref("org.canopy", "organization");
const placeRef = ref("place.river", "place");
const commonsRef = ref("commons.food", "commons");
const livingSystemRef = ref("living-system.river", "living-system");
const resourceRef = ref("resource.garden", "resource");
const claimRef = ref("claim.soil", "claim");
const authorityRef = ref("mandate.steward", "mandate");
const replacementRef = ref("resource.garden.v2", "resource");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "object.created",
  occurredAt: "2026-01-01T00:00:00.000Z",
  objectRef: resourceRef,
  relatedRefs: [],
  authorityRefs: [],
  orgId: orgRef.id,
  placeId: placeRef.id,
  commonsId: commonsRef.id,
  livingSystemId: livingSystemRef.id,
  sourceCapability: "civic-memory",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

describe("buildCivicMemoryProjection", () => {
  it("builds an ordered scope timeline with refs, capabilities, counts, and checkpoint data", () => {
    const projection = buildCivicMemoryProjection(
      [
        event({
          id: "event.outside",
          orgId: "org.other",
          occurredAt: "2026-01-01T00:00:00.000Z"
        }),
        event({
          id: "event.claim",
          type: "claim.created",
          occurredAt: "2026-01-03T00:00:00.000Z",
          objectRef: claimRef,
          relatedRefs: [resourceRef],
          authorityRefs: [authorityRef],
          sourceCapability: "claims-evidence",
          payload: { summary: "Soil claim attached to the garden." }
        }),
        event({
          id: "event.object",
          type: "object.created",
          occurredAt: "2026-01-02T00:00:00.000Z",
          payload: { title: "Garden Commons" }
        })
      ],
      {
        scope: {
          orgRef,
          placeRef,
          commonsRef,
          livingSystemRef,
          objectRef: resourceRef
        }
      }
    );

    expect(projection.scope).toEqual({
      orgId: orgRef.id,
      placeId: placeRef.id,
      commonsId: commonsRef.id,
      livingSystemId: livingSystemRef.id,
      objectId: resourceRef.id,
      objectRef: resourceRef
    });
    expect(projection.timeline.map((entry) => entry.id)).toEqual([
      "event.object",
      "event.claim"
    ]);
    expect(projection.timeline[0]).toMatchObject({
      id: "event.object",
      namespace: "object",
      title: "Garden Commons",
      isRedacted: false,
      isSuperseded: false
    });
    expect(projection.timeline[1]).toMatchObject({
      id: "event.claim",
      namespace: "claim",
      summary: "Soil claim attached to the garden."
    });
    expect(projection.relatedRefs).toEqual([claimRef, resourceRef]);
    expect(projection.authorityRefs).toEqual([authorityRef]);
    expect(projection.sourceCapabilities).toEqual(["civic-memory", "claims-evidence"]);
    expect(projection.namespaceCounts).toEqual([
      { namespace: "claim", count: 1 },
      { namespace: "object", count: 1 }
    ]);
    expect(projection.capabilityCounts).toEqual([
      { capability: "civic-memory", count: 1 },
      { capability: "claims-evidence", count: 1 }
    ]);
    expect(projection.replayCheckpoint).toEqual({
      streamEventCount: 3,
      projectedEventCount: 2,
      lastStreamEventId: "event.object",
      lastStreamOccurredAt: "2026-01-02T00:00:00.000Z",
      lastProjectedEventId: "event.claim",
      lastProjectedOccurredAt: "2026-01-03T00:00:00.000Z"
    });
  });

  it("filters scope refs by id and surfaces redaction and supersession indicators", () => {
    const projection = buildCivicMemoryProjection(
      [
        event({
          id: "event.redacted",
          redaction: {
            isRedactedStub: true,
            originalEventId: "event.private",
            redactionEventId: "event.redaction",
            preservedFields: ["id", "type"],
            removedPayloadKeys: ["privateNote"]
          }
        }),
        event({
          id: "event.supersession",
          type: "object.relationship.superseded",
          occurredAt: "2026-01-02T00:00:00.000Z",
          authorityRefs: [authorityRef],
          supersession: {
            supersedesEventId: "event.redacted",
            supersededByEventId: "event.replacement",
            replacementObjectRef: replacementRef,
            authorityRefs: [authorityRef]
          }
        }),
        event({
          id: "event.wrong-object",
          objectRef: ref("resource.other", "resource")
        })
      ],
      {
        scope: {
          orgRef: orgRef.id,
          objectRef: resourceRef.id
        }
      }
    );

    expect(projection.timeline.map((entry) => entry.id)).toEqual([
      "event.redacted",
      "event.supersession"
    ]);
    expect(projection.timeline.map((entry) => entry.isRedacted)).toEqual([true, false]);
    expect(projection.timeline.map((entry) => entry.isSuperseded)).toEqual([false, true]);
    expect(projection.relatedRefs).toEqual([resourceRef, replacementRef]);
    expect(projection.redaction).toEqual({
      hasRedactions: true,
      redactedEventIds: ["event.redacted"],
      redactionEventIds: ["event.redaction"],
      redactedOriginalEventIds: ["event.private"]
    });
    expect(projection.supersession).toEqual({
      hasSupersessions: true,
      supersededEventIds: ["event.supersession"],
      supersedingEventIds: ["event.replacement"],
      supersedesEventIds: ["event.redacted"],
      replacementRefs: [replacementRef]
    });
  });
});
