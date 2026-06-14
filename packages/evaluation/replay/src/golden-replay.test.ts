import { describe, expect, it } from "vitest";
import {
  firstReplayableGoldenFixtureManifest,
  goldenFixtureRefs
} from "@canopy/contracts-testing";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import { buildObjectPageProjection } from "@canopy/projections-object-page";
import { replayGoldenFixtureManifest } from "./index.js";

describe("first replayable golden fixture", () => {
  it("registers canonical refs and source mappings before replay", () => {
    const registry = createObjectRegistry();

    for (const object of firstReplayableGoldenFixtureManifest.objects) {
      const registeredRef = registry.register(object.ref);

      expect(registeredRef).toEqual(object.ref);

      if (object.ref.source !== undefined) {
        const mapping = registry.mapSource(object.ref.source, object.ref);

        expect(mapping.ref.id).toBe(object.ref.id);
        expect(registry.resolveSource(object.ref.source)?.id).toBe(object.ref.id);
      }
    }

    expect(registry.listRefs()).toHaveLength(
      firstReplayableGoldenFixtureManifest.objects.length
    );
    expect(() =>
      registry.register({
        ...goldenFixtureRefs.personMira,
        namespace: "legacy.provider.row-id"
      })
    ).toThrow(/different structure/);
  });

  it("appends and replays fixture events in stable civic-memory order", () => {
    const memory = createInMemoryCivicMemory();
    const appendedSequences = firstReplayableGoldenFixtureManifest.events.map(
      (event) => memory.appendEvent(event).sequence
    );
    const replayed = [];
    let page = memory.replay({ limit: 5 });

    replayed.push(...page.events);

    while (page.nextCursor !== undefined) {
      page = memory.replay(page.nextCursor);
      replayed.push(...page.events);
    }

    expect(appendedSequences).toEqual(
      firstReplayableGoldenFixtureManifest.events.map((_, index) => index + 1)
    );
    expect(replayed.map((event) => event.id)).toEqual(
      firstReplayableGoldenFixtureManifest.events.map((event) => event.id)
    );
    expect(() =>
      memory.updateEvent(
        firstReplayableGoldenFixtureManifest.events[0]?.id ?? "missing",
        firstReplayableGoldenFixtureManifest.events[0]!
      )
    ).toThrow(/append-only/);
  });

  it("builds object-page projections from replayed civic memory", () => {
    const result = replayGoldenFixtureManifest(firstReplayableGoldenFixtureManifest, [
      goldenFixtureRefs.decisionUseRight,
      goldenFixtureRefs.useRightNorthPasture,
      goldenFixtureRefs.resourceNorthPasture
    ]);
    const [decisionPage, useRightPage, resourcePage] = result.projections;

    expect(result.replayedEvents).toHaveLength(
      firstReplayableGoldenFixtureManifest.events.length
    );
    expect(decisionPage?.objectRef.id).toBe(goldenFixtureRefs.decisionUseRight.id);
    expect(decisionPage?.timelineEvents.map((event) => event.type)).toContain(
      "governance.decision.recorded"
    );
    expect(decisionPage?.authorityRefs.map((ref) => ref.id)).toContain(
      goldenFixtureRefs.mandateWatershedSteward.id
    );
    expect(useRightPage?.timelineEvents.map((event) => event.type)).toContain(
      "stewardship.use_right.granted"
    );
    expect(resourcePage?.relatedRefs.map((ref) => ref.id)).toContain(
      goldenFixtureRefs.useRightNorthPasture.id
    );
  });

  it("preserves authority, accounting, and redaction continuity during replay", () => {
    const memory = createInMemoryCivicMemory(
      firstReplayableGoldenFixtureManifest.events
    );
    const decisionEvents = memory.queryEvents({
      eventTypes: ["governance.decision.recorded"]
    });
    const ledgerEvents = memory.queryEvents({
      eventTypes: ["accounting.ledger_entry.posted"]
    });
    const redactionEvents = memory.queryEvents({
      eventTypes: ["system.redaction.applied"]
    });
    const redactionContinuity = memory.requireRedactionContinuity(
      "event.evidence.created.sensitive"
    );
    const redactionProjection = buildObjectPageProjection(
      goldenFixtureRefs.originalSensitiveEvidenceEvent,
      memory.replay().events
    );

    expect(
      decisionEvents.every((event) =>
        event.authorityRefs.some(
          (authorityRef) => authorityRef.id === goldenFixtureRefs.mandateWatershedSteward.id
        )
      )
    ).toBe(true);
    expect(ledgerEvents[0]?.payload).toMatchObject({
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    });
    expect(redactionEvents[0]?.redaction).toMatchObject({
      originalEventId: "event.evidence.created.sensitive",
      redactionEventId: "event.system.redaction.applied.sensitive-evidence"
    });
    expect(redactionContinuity.ok).toBe(true);
    expect(redactionContinuity.originalEvent?.id).toBe(
      "event.evidence.created.sensitive"
    );
    expect(redactionProjection.redaction.redactionEventIds).toContain(
      "event.system.redaction.applied.sensitive-evidence"
    );
  });
});
