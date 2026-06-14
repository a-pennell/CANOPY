import { describe, expect, it } from "vitest";
import {
  firstReplayableGoldenFixtureEvents,
  goldenFixtureRefs,
} from "@canopy/contracts-testing";
import type { CanopyEvent } from "@canopy/contracts-kernel";
import {
  CivicMemoryMutationRejectedError,
  createInMemoryCivicMemory,
} from "./index.js";

describe("civic memory kernel", () => {
  it("appends and replays events in stable cursor order", () => {
    const memory = createInMemoryCivicMemory(
      firstReplayableGoldenFixtureEvents.slice(0, 3)
    );

    const firstPage = memory.replay({ limit: 2 });
    const secondPage = memory.replay(firstPage.nextCursor);

    expect(firstPage.events.map((event) => event.id)).toEqual([
      "event.identity.person.created.mira",
      "event.identity.account.linked.mira",
    ]);
    expect(firstPage.nextCursor).toMatchObject({
      afterSequence: 2,
      afterEventId: "event.identity.account.linked.mira",
      limit: 2,
    });
    expect(secondPage.events.map((event) => event.id)).toEqual([
      "event.identity.organization.created.watershed",
    ]);
  });

  it("rejects update, delete, and patch mutation semantics", () => {
    const [event] = firstReplayableGoldenFixtureEvents;
    const memory = createInMemoryCivicMemory([event]);

    expect(() => memory.updateEvent(event.id, event)).toThrow(
      CivicMemoryMutationRejectedError
    );
    expect(() => memory.deleteEvent(event.id)).toThrow(
      CivicMemoryMutationRejectedError
    );
    expect(() => memory.mutateEvent(event.id, { payload: {} })).toThrow(
      CivicMemoryMutationRejectedError
    );
    expect(memory.getEvent(event.id)?.payload).toEqual(event.payload);
  });

  it("queries by object and related references without provider assumptions", () => {
    const memory = createInMemoryCivicMemory(firstReplayableGoldenFixtureEvents);

    expect(
      memory
        .queryObjectEvents(goldenFixtureRefs.evidenceFlowGauge)
        .map((event) => event.id)
    ).toEqual([
      "event.evidence.created.flow-gauge",
      "event.evidence.linked_to_claim.flow-gauge",
    ]);

    expect(
      memory
        .queryEvents({ relatedRefIds: [goldenFixtureRefs.claimFlowNeed.id] })
        .map((event) => event.id)
    ).toContain("event.evidence.linked_to_claim.flow-gauge");
  });

  it("checks redaction continuity without deleting original events", () => {
    const memory = createInMemoryCivicMemory(firstReplayableGoldenFixtureEvents);
    const originalSensitiveEvent = memory.getEvent(
      "event.evidence.created.sensitive"
    );

    const continuity = memory.requireRedactionContinuity(
      originalSensitiveEvent?.id ?? "missing"
    );

    expect(continuity.ok).toBe(true);
    expect(continuity.originalEvent?.id).toBe(originalSensitiveEvent?.id);
    expect(continuity.redactionEvents.map((event) => event.id)).toEqual([
      "event.system.redaction.applied.sensitive-evidence",
    ]);
    expect(memory.getEvent(originalSensitiveEvent?.id ?? "missing")).toEqual(
      originalSensitiveEvent
    );
  });

  it("checks supersession continuity through append-only replacement events", () => {
    const originalEvent = firstReplayableGoldenFixtureEvents[6];
    const replacementEvent = {
      ...originalEvent,
      id: "event.claim.superseded.flow-need",
      type: "claim.superseded",
      payload: { status: "superseded" },
      supersedesEventId: originalEvent.id,
      supersession: {
        supersedesEventId: originalEvent.id,
        supersededAt: "2026-01-02T00:00:00.000Z",
        reason: "corrected claim scope",
        authorityRefs: [],
      },
    } satisfies CanopyEvent;
    const memory = createInMemoryCivicMemory([originalEvent, replacementEvent]);

    const continuity = memory.requireSupersessionContinuity(originalEvent.id);

    expect(continuity.ok).toBe(true);
    expect(continuity.supersedingEvents.map((event) => event.id)).toEqual([
      replacementEvent.id,
    ]);
    expect(memory.getEvent(originalEvent.id)).toEqual(originalEvent);
  });
});
