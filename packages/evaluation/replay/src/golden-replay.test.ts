import { describe, expect, it } from "vitest";
import {
  foldedSourceSampleCanonicalEvents,
  foldedSourceSampleCanonicalObjects,
  foldedSourceSampleRefs
} from "@canopy/database-import-plans";
import {
  firstReplayableGoldenFixtureManifest,
  goldenFixtureRefs
} from "@canopy/contracts-testing";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import { buildObjectPageProjection } from "@canopy/projections-object-page";
import {
  replayCanonicalEventStream,
  replayGoldenFixtureManifest
} from "./index.js";

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
      goldenFixtureRefs.decisionIrrigationWindow,
      goldenFixtureRefs.useRightNorthPasture,
      goldenFixtureRefs.useRightIrrigationGate,
      goldenFixtureRefs.resourceNorthPasture
    ]);
    const [
      decisionPage,
      irrigationDecisionPage,
      useRightPage,
      irrigationUseRightPage,
      resourcePage
    ] = result.projections;

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
    expect(irrigationDecisionPage?.timelineEvents.map((event) => event.type)).toContain(
      "governance.decision.recorded"
    );
    expect(irrigationDecisionPage?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        goldenFixtureRefs.mandateWatershedSteward.id,
        goldenFixtureRefs.policyDroughtProtocol.id
      ])
    );
    expect(useRightPage?.timelineEvents.map((event) => event.type)).toContain(
      "stewardship.use_right.granted"
    );
    expect(irrigationUseRightPage?.timelineEvents.map((event) => event.type)).toContain(
      "stewardship.use_right.granted"
    );
    expect(irrigationUseRightPage?.relatedRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        goldenFixtureRefs.guardianReviewRiparian.id,
        goldenFixtureRefs.resourceIrrigationGate.id
      ])
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
    const ledgerCorrectionEvents = memory.queryEvents({
      eventTypes: ["accounting.ledger_entry.reversed"]
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
    expect(ledgerCorrectionEvents[0]?.payload).toMatchObject({
      reversesLedgerEntryRefId: goldenFixtureRefs.ledgerEntryFoodHubDistribution.id,
      appendOnlyCorrection: true,
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    });
    expect(ledgerCorrectionEvents[0]?.supersession).toMatchObject({
      supersedesEventId: "event.accounting.ledger-entry.posted.food-hub-distribution",
      replacementObjectRef: {
        id: goldenFixtureRefs.ledgerEntryFoodHubCorrection.id
      }
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

  it("replays the representative fold-in path through governance, stewardship, and federation shape", () => {
    const result = replayGoldenFixtureManifest(firstReplayableGoldenFixtureManifest, [
      goldenFixtureRefs.claimRiparianStress,
      goldenFixtureRefs.resourceIrrigationGate,
      goldenFixtureRefs.agreementFoodHubDistribution,
      goldenFixtureRefs.ledgerEntryFoodHubDistribution,
      goldenFixtureRefs.canonicalMapping
    ]);
    const [claimPage, resourcePage, agreementPage, ledgerPage, mappingPage] = result.projections;

    expect(claimPage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "claim.contested",
        "evidence.linked_to_claim",
        "model.output.generated",
        "governance.decision.recorded"
      ])
    );
    expect(claimPage?.sourceCapabilities).toEqual(
      expect.arrayContaining([
        "claims-evidence",
        "ecological-modeling",
        "governance",
        "stewardship"
      ])
    );
    expect(resourcePage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "ecology.living_system.created",
        "stewardship.resource.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed"
      ])
    );
    expect(agreementPage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "allocation.consent.recorded",
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed"
      ])
    );
    expect(ledgerPage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed"
      ])
    );
    expect(mappingPage?.timelineEvents.map((event) => event.type)).toContain(
      "federation.import.received"
    );
  });

  it("replays canonical events mapped from realistic folded-source export bundles", () => {
    const result = replayCanonicalEventStream(
      {
        objectRefs: foldedSourceSampleCanonicalObjects,
        events: foldedSourceSampleCanonicalEvents
      },
      [
        foldedSourceSampleRefs.claimRiparianStress,
        foldedSourceSampleRefs.useRightIrrigationGate,
        foldedSourceSampleRefs.ledgerEntryFoodHubCorrection
      ]
    );
    const [claimPage, useRightPage, correctionPage] = result.projections;

    expect(result.registeredRefs).toHaveLength(foldedSourceSampleCanonicalObjects.length);
    expect(result.replayedEvents.map((event) => event.id)).toEqual(
      foldedSourceSampleCanonicalEvents.map((event) => event.id)
    );
    expect(
      result.registeredRefs
        .filter((ref) => ref.source?.sourceProject !== "canopy")
        .map((ref) => ref.source?.sourceProject)
    ).toEqual(
      expect.arrayContaining([
        "common-credit",
        "icos",
        "sensemaking",
        "stewardship"
      ])
    );
    expect(claimPage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "claim.contested",
        "evidence.linked_to_claim",
        "model.created",
        "governance.issue.created",
        "governance.decision.recorded"
      ])
    );
    expect(useRightPage?.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.proposal.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed"
      ])
    );
    expect(useRightPage?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        foldedSourceSampleRefs.mandateIrrigationWindow.id,
        foldedSourceSampleRefs.decisionIrrigationWindow.id
      ])
    );
    expect(correctionPage?.timelineEvents[0]).toMatchObject({
      id: "event.sample.accounting.ledger-entry.reversed.food-hub-correction",
      supersedesEventId: "event.sample.accounting.ledger-entry.posted.food-hub"
    });
    expect(
      result.replayedEvents.find(
        (event) => event.id === "event.sample.accounting.ledger-entry.reversed.food-hub-correction"
      )
    ).toMatchObject({
      payload: {
        appendOnlyCorrection: true,
        reversesLedgerEntryRefId: foldedSourceSampleRefs.ledgerEntryFoodHub.id
      }
    });
  });
});
