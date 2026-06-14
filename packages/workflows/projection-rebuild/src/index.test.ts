import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import {
  createInMemoryMaterializedProjectionStore,
  materializeProjectionsFromEvents,
  projectionRebuilderRegistry,
  projectionMaterializedTargetRef,
  readMaterializedProjection,
  requestProjectionRebuild,
  rebuildAndPersistAllProjections,
  rebuildAllProjections
} from "./index";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test",
  lifecycleStatus: "active"
});

const resourceRef = ref("resource.north-pasture", "resource");
const useRightRef = ref("use-right.north-pasture", "use-right");
const decisionRef = ref("decision.use-right", "decision");
const packetRef = ref("decision-packet.use-right", "decision-packet");
const mandateRef = ref("mandate.steward", "mandate");
const claimRef = ref("claim.need", "claim");
const evidenceRef = ref("evidence.flow", "evidence");

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "object.created",
  occurredAt: "2026-01-01T00:00:00.000Z",
  objectRef: resourceRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "stewardship",
  payload: {},
  schemaVersion: 1,
  visibility: "commons",
  ...overrides
});

const events: readonly CanopyEvent[] = [
  event({
    id: "event.resource.created",
    type: "stewardship.resource.created",
    payload: { title: "North Pasture", resourceKind: "pasture" }
  }),
  event({
    id: "event.claim.created",
    type: "claim.created",
    occurredAt: "2026-01-02T00:00:00.000Z",
    objectRef: claimRef,
    relatedRefs: [resourceRef],
    sourceCapability: "claims-evidence",
    payload: { title: "Pasture needs flow protection" }
  }),
  event({
    id: "event.evidence.created",
    type: "evidence.created",
    occurredAt: "2026-01-03T00:00:00.000Z",
    objectRef: evidenceRef,
    relatedRefs: [claimRef],
    sourceCapability: "claims-evidence",
    payload: { title: "Flow survey" }
  }),
  event({
    id: "event.evidence.linked",
    type: "evidence.linked_to_claim",
    occurredAt: "2026-01-04T00:00:00.000Z",
    objectRef: evidenceRef,
    relatedRefs: [claimRef],
    sourceCapability: "claims-evidence",
    payload: { relation: "supports" }
  }),
  event({
    id: "event.decision.recorded",
    type: "governance.decision.recorded",
    occurredAt: "2026-01-05T00:00:00.000Z",
    objectRef: decisionRef,
    relatedRefs: [resourceRef, claimRef, evidenceRef],
    authorityRefs: [mandateRef],
    sourceCapability: "governance",
    payload: {
      decision: {
        outcome: "approved",
        rationale: "Protect shared pasture flows.",
        claimRefs: [claimRef],
        evidenceRefs: [evidenceRef],
        authorityRefs: [mandateRef]
      }
    }
  }),
  event({
    id: "event.decision-packet.recorded",
    type: "governance.decision_packet.recorded",
    occurredAt: "2026-01-06T00:00:00.000Z",
    objectRef: packetRef,
    relatedRefs: [decisionRef],
    authorityRefs: [mandateRef],
    sourceCapability: "governance",
    payload: {
      decisionPacket: {
        decisionRef,
        status: "recorded",
        outcome: "approved",
        claimRefs: [claimRef],
        evidenceRefs: [evidenceRef],
        authorityRefs: [mandateRef]
      }
    }
  }),
  event({
    id: "event.use-right.granted",
    type: "stewardship.use_right.granted",
    occurredAt: "2026-01-07T00:00:00.000Z",
    objectRef: useRightRef,
    relatedRefs: [resourceRef, decisionRef],
    authorityRefs: [mandateRef],
    sourceCapability: "stewardship",
    payload: {
      resourceRefId: resourceRef.id,
      permissions: ["graze"],
      decisionRefIds: [decisionRef.id]
    }
  })
];

describe("projection rebuild workflow", () => {
  it("exposes the complete projection rebuilder registry", () => {
    expect(Object.keys(projectionRebuilderRegistry)).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet",
      "federation-export"
    ]);
  });

  it("rebuilds all projections from replayed events in memory", () => {
    const result = rebuildAllProjections(events, {
      rebuiltAt: "2026-01-08T00:00:00.000Z"
    });

    expect(result["object-page"].projections.map((record) => record.targetRef.id)).toContain(
      resourceRef.id
    );
    expect(result["civic-memory"].projections.timeline.map((entry) => entry.id)).toEqual(
      events.map((replayedEvent) => replayedEvent.id)
    );
    expect(result.authority.projections.bindingCoverage.map((entry) => entry.eventId)).toContain(
      "event.decision.recorded"
    );
    expect(result["claim-evidence"].projections.claimRefs).toEqual([claimRef]);
    expect(result["resource-stewardship"].projections[0]?.projection.resourceRef).toEqual(
      resourceRef
    );
    expect(result["decision-packet"].projections[0]?.projection.decisionRef).toEqual(decisionRef);
    expect(result["federation-export"].projections.preview.eventIds).toEqual(
      events.map((replayedEvent) => replayedEvent.id)
    );
  });

  it("materializes projection documents directly from an event stream", () => {
    const materialized = materializeProjectionsFromEvents(events, {
      rebuiltAt: "2026-01-08T00:00:00.000Z"
    });

    expect(materialized.persistedStates.map((state) => state.projectionName)).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet",
      "federation-export"
    ]);
    expect(materialized.persistedDocuments.map((document) => document.projectionName)).toEqual(
      expect.arrayContaining([
        "object-page",
        "claim-evidence",
        "decision-packet",
        "resource-stewardship",
        "federation-export"
      ])
    );
    expect(
      materialized.persistedDocuments.find(
        (document) => document.projectionName === "federation-export"
      )?.projection
    ).toMatchObject({
      preview: {
        eventIds: events.map((replayedEvent) => replayedEvent.id)
      }
    });
  });

  it("records projection-state checkpoints without persistence assumptions", () => {
    const result = rebuildAllProjections(events, {
      rebuiltAt: "2026-01-08T00:00:00.000Z"
    });

    for (const rebuild of Object.values(result)) {
      expect(rebuild.state).toMatchObject({
        kind: "projection-state",
        projectionName: rebuild.projectionName,
        projectionVersion: rebuild.projectionVersion,
        status: "current",
        processedEventCount: events.length,
        rebuiltAt: "2026-01-08T00:00:00.000Z",
        checkpoint: {
          eventId: "event.use-right.granted",
          occurredAt: "2026-01-07T00:00:00.000Z",
          processedAt: "2026-01-08T00:00:00.000Z",
          sequence: events.length
        }
      });
    }
  });

  it("rebuilds from canonical persisted events and stores projection state", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-01-08T00:00:00.000Z"
    });
    const materializedProjections = createInMemoryMaterializedProjectionStore();
    for (const replayedEvent of events) {
      runtime.appendEvent(replayedEvent);
    }

    const persisted = rebuildAndPersistAllProjections(runtime, {
      rebuiltAt: "2026-01-09T00:00:00.000Z",
      materializedProjections
    });

    expect(persisted.results["civic-memory"].projections.timeline).toHaveLength(events.length);
    expect(persisted.persistedStates.map((state) => state.projectionName)).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet",
      "federation-export"
    ]);
    expect(runtime.listProjectionStates().map((state) => state.id)).toEqual([
      "projection-state.authority",
      "projection-state.civic-memory",
      "projection-state.claim-evidence",
      "projection-state.decision-packet",
      "projection-state.federation-export",
      "projection-state.object-page",
      "projection-state.resource-stewardship"
    ]);
    expect(runtime.getProjectionState("projection-state.civic-memory")).toMatchObject({
      processedEventCount: events.length,
      checkpoint: {
        eventId: "event.use-right.granted",
        sequence: events.length
      }
    });

    expect(persisted.persistedDocuments.map((document) => document.projectionName)).toEqual(
      expect.arrayContaining([
        "object-page",
        "civic-memory",
        "authority",
        "claim-evidence",
        "resource-stewardship",
        "decision-packet",
        "federation-export"
      ])
    );
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "object-page",
        targetRef: resourceRef
      })?.projection.objectRef
    ).toEqual(resourceRef);
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "civic-memory",
        targetRef: projectionMaterializedTargetRef("civic-memory")
      })?.projection.timeline.map((entry) => entry.id)
    ).toEqual(events.map((replayedEvent) => replayedEvent.id));
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "authority",
        targetRef: projectionMaterializedTargetRef("authority")
      })?.projection.bindingCoverage.map((entry) => entry.eventId)
    ).toContain("event.decision.recorded");
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "claim-evidence",
        targetRef: projectionMaterializedTargetRef("claim-evidence")
      })?.projection.claimRefs
    ).toEqual([claimRef]);
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "resource-stewardship",
        targetRef: resourceRef
      })?.projection.resourceRef
    ).toEqual(resourceRef);
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "decision-packet",
        targetRef: decisionRef
      })?.projection.decisionRef
    ).toEqual(decisionRef);
    expect(
      readMaterializedProjection(materializedProjections, {
        projectionName: "federation-export",
        targetRef: projectionMaterializedTargetRef("federation-export")
      })?.projection.preview.eventIds
    ).toEqual(events.map((replayedEvent) => replayedEvent.id));
  });

  it("marks projections as requested for operator rebuild", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-01-08T00:00:00.000Z"
    });
    const firstEvent = events[0];
    if (firstEvent === undefined) {
      throw new Error("expected projection rebuild fixture event");
    }
    runtime.appendEvent(firstEvent);
    rebuildAndPersistAllProjections(runtime, {
      rebuiltAt: "2026-01-09T00:00:00.000Z"
    });

    const request = requestProjectionRebuild({
      runtime,
      requestedAt: "2026-01-10T00:00:00.000Z",
      projectionNames: ["civic-memory", "claim-evidence"],
      reason: "operator requested after drift alert"
    });

    expect(request.requestedStates.map((state) => state.id)).toEqual([
      "projection-state.civic-memory",
      "projection-state.claim-evidence"
    ]);
    expect(runtime.getProjectionState("projection-state.civic-memory")).toMatchObject({
      status: "stale",
      rebuildRequestedAt: "2026-01-10T00:00:00.000Z",
      lastError: "operator requested after drift alert"
    });
  });
});
