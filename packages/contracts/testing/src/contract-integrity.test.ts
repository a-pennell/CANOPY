import { describe, expect, it } from "vitest";
import type { CanopyEvent } from "@canopy/contracts-kernel";
import {
  firstReplayableGoldenFixtureManifest,
  goldenFixtureRefs,
  requiredFirstReplayableEventTypes,
  requiredGoldenFixtureDomains
} from "./golden-fixtures";
import { lockedInvariantCases } from "./invariant-cases";

const requiredInvariantKinds = [
  "identity-account-separation",
  "membership-authority-separation",
  "ledger-account-auth-account-separation",
  "use-right-scope",
  "event-append-rules",
  "ai-non-authority"
] as const;

const requiredFixtureDomains = [
  "identity",
  "authority",
  "claims-evidence",
  "governance",
  "stewardship",
  "allocation-accounting",
  "ecology",
  "event",
  "export",
  "redaction",
  "federation"
] as const;

describe("locked invariant contract cases", () => {
  it("covers every first-epoch invariant kind exactly once", () => {
    const kinds = lockedInvariantCases.map((invariantCase) => invariantCase.kind);

    expect(new Set(kinds)).toEqual(new Set(requiredInvariantKinds));
    expect(kinds).toHaveLength(requiredInvariantKinds.length);
  });

  it("keeps every locked invariant mandatory, actionable, and failure-coded", () => {
    for (const invariantCase of lockedInvariantCases) {
      expect(invariantCase.id).toMatch(/^invariant\./);
      expect(invariantCase.severity).toBe("must");
      expect(invariantCase.fixtureRefs.length).toBeGreaterThan(0);
      expect(invariantCase.preconditions.length).toBeGreaterThan(0);
      expect(invariantCase.action.length).toBeGreaterThan(0);
      expect(invariantCase.expectations.length).toBeGreaterThan(0);
      expect(invariantCase.prohibitedOutcomes.length).toBeGreaterThan(0);

      for (const expectation of invariantCase.expectations) {
        expect(expectation.id).toMatch(/^expect\./);
        expect(expectation.mustPass).toBe(true);
        expect(expectation.failureCode).toMatch(/^[A-Z][A-Z0-9_]+$/);
      }
    }
  });

  it("does not allow duplicate locked ids or duplicate failure codes", () => {
    const invariantIds = lockedInvariantCases.map((invariantCase) => invariantCase.id);
    const expectationIds = lockedInvariantCases.flatMap((invariantCase) =>
      invariantCase.expectations.map((expectation) => expectation.id)
    );
    const failureCodes = lockedInvariantCases.flatMap((invariantCase) =>
      invariantCase.expectations.map((expectation) => expectation.failureCode)
    );

    expect(new Set(invariantIds).size).toBe(invariantIds.length);
    expect(new Set(expectationIds).size).toBe(expectationIds.length);
    expect(new Set(failureCodes).size).toBe(failureCodes.length);
  });
});

describe("golden fixture contract manifest requirements", () => {
  it("requires every first replay domain", () => {
    expect(requiredGoldenFixtureDomains).toEqual(requiredFixtureDomains);
  });

  it("ships a concrete first replay manifest for every required domain", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const domains = manifest.objectSets.map((objectSet) => objectSet.domain);

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.domains).toEqual(requiredGoldenFixtureDomains);
    expect(new Set(domains)).toEqual(new Set(requiredGoldenFixtureDomains));
    expect(domains).toHaveLength(requiredGoldenFixtureDomains.length);
    expect(manifest.objects.length).toBeGreaterThan(requiredGoldenFixtureDomains.length);
    expect(manifest.events.length).toBeGreaterThan(requiredFirstReplayableEventTypes.length - 1);

    for (const objectSet of manifest.objectSets) {
      expect(objectSet.objectTypes.length).toBeGreaterThan(0);
      expect(objectSet.objectRefs.length).toBeGreaterThan(0);
      expect(objectSet.eventTypes.length).toBeGreaterThan(0);
      expect(objectSet.fixtureFiles.length).toBeGreaterThan(0);

      for (const fixtureFile of objectSet.fixtureFiles) {
        expect(fixtureFile.path).toMatch(/^golden\/first-commons\//);
        expect(fixtureFile.contentHash).toMatch(/^sha256:/);
      }
    }
  });

  it("keeps manifest refs closed over concrete objects and events", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const objectRefIds = new Set(manifest.objects.map((object) => object.ref.id));
    const objectSetRefIds = new Set(
      manifest.objectSets.flatMap((objectSet) =>
        objectSet.objectRefs.map((objectRef) => objectRef.id)
      )
    );

    for (const object of manifest.objects) {
      expect(objectSetRefIds.has(object.ref.id)).toBe(true);
      expect(object.invariantCaseIds.length).toBeGreaterThan(0);

      for (const linkedRef of object.linkedRefs) {
        expect(objectSetRefIds.has(linkedRef.id)).toBe(true);
      }
    }

    for (const event of manifest.events) {
      expect(objectSetRefIds.has(event.objectRef.id)).toBe(true);
      expect(event.schemaVersion).toBe(1);
      expect(event.payload).toBeDefined();

      for (const relatedRef of event.relatedRefs) {
        expect(objectSetRefIds.has(relatedRef.id)).toBe(true);
      }

      for (const authorityRef of event.authorityRefs) {
        expect(objectSetRefIds.has(authorityRef.id)).toBe(true);
      }
    }

    for (const objectSetRefId of objectSetRefIds) {
      const representedByObject = objectRefIds.has(objectSetRefId);
      const representedByEvent = manifest.events.some(
        (event) =>
          event.objectRef.id === objectSetRefId ||
          event.relatedRefs.some((relatedRef) => relatedRef.id === objectSetRefId) ||
          event.authorityRefs.some((authorityRef) => authorityRef.id === objectSetRefId)
      );

      expect(representedByObject || representedByEvent).toBe(true);
    }
  });

  it("covers required replay event types and expectation links", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const eventTypes = new Set(manifest.events.map((event) => event.type));
    const objectSetEventTypes = new Set(
      manifest.objectSets.flatMap((objectSet) => objectSet.eventTypes)
    );
    const invariantIds = new Set(
      lockedInvariantCases.map((invariantCase) => invariantCase.id)
    );
    const objectSetRefIds = new Set(
      manifest.objectSets.flatMap((objectSet) =>
        objectSet.objectRefs.map((objectRef) => objectRef.id)
      )
    );

    for (const eventType of requiredFirstReplayableEventTypes) {
      expect(objectSetEventTypes.has(eventType)).toBe(true);
      expect(eventTypes.has(eventType)).toBe(true);
    }

    for (const expectation of manifest.expectations) {
      expect(expectation.id).toMatch(/^expectation\./);
      expect(requiredGoldenFixtureDomains).toContain(expectation.domain);

      for (const invariantCaseId of expectation.invariantCaseIds) {
        expect(invariantIds.has(invariantCaseId)).toBe(true);
      }

      for (const requiredObjectRef of expectation.requiredObjectRefs) {
        expect(objectSetRefIds.has(requiredObjectRef.id)).toBe(true);
      }

      for (const requiredEventType of expectation.requiredEventTypes) {
        expect(eventTypes.has(requiredEventType)).toBe(true);
      }
    }
  });

  it("links every invariant fixture ref back to the first replay manifest", () => {
    const objectSetRefIds = new Set(
      firstReplayableGoldenFixtureManifest.objectSets.flatMap((objectSet) =>
        objectSet.objectRefs.map((objectRef) => objectRef.id)
      )
    );
    const manifestInvariantIds = new Set(
      firstReplayableGoldenFixtureManifest.objects.flatMap(
        (object) => object.invariantCaseIds
      )
    );

    for (const invariantCase of lockedInvariantCases) {
      expect(manifestInvariantIds.has(invariantCase.id)).toBe(true);

      for (const fixtureRef of invariantCase.fixtureRefs) {
        expect(objectSetRefIds.has(fixtureRef.ref.id)).toBe(true);
      }
    }
  });

  it("locks anti-collapse expectations to invariant failure codes", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const invariantById = new Map(
      lockedInvariantCases.map((invariantCase) => [invariantCase.id, invariantCase])
    );

    for (const antiCollapse of manifest.antiCollapseExpectations) {
      const invariantCase = invariantById.get(antiCollapse.invariantCaseId);
      const [leftRef, rightRef] = antiCollapse.forbiddenCollapseRefs;
      const failureCodes =
        invariantCase?.expectations.map((expectation) => expectation.failureCode) ?? [];

      expect(invariantCase).toBeDefined();
      expect(leftRef.id).not.toBe(rightRef.id);
      expect(leftRef.type).not.toBe(rightRef.type);
      expect(failureCodes).toContain(antiCollapse.failureCode);
      expect(antiCollapse.deniedEventTypes.length).toBeGreaterThan(0);
      expect(antiCollapse.requiredExplanation.length).toBeGreaterThan(0);
    }
  });

  it("keeps anti-collapse refs out of authority and accounting slots", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const accountLoginRefId = "account.mira.login";
    const membershipRefId = "membership.mira.watershed";
    const modelOutputRefId = "model-output.flow-risk-jan";
    const ledgerEvent = manifest.events.find(
      (event) => event.type === "accounting.ledger_entry.posted"
    );
    const decisionEvent = manifest.events.find(
      (event) => event.type === "governance.decision.recorded"
    );
    const useRightEvent = manifest.events.find(
      (event) => event.type === "stewardship.use_right.granted"
    );

    expect(
      manifest.events.some((event) =>
        event.authorityRefs.some((authorityRef) => authorityRef.id === membershipRefId)
      )
    ).toBe(false);
    expect(
      manifest.events.some((event) =>
        event.authorityRefs.some((authorityRef) => authorityRef.id === modelOutputRefId)
      )
    ).toBe(false);
    expect(decisionEvent?.actorRef?.id).not.toBe(accountLoginRefId);
    expect(useRightEvent?.actorRef?.id).not.toBe(accountLoginRefId);
    expect(ledgerEvent?.payload).toMatchObject({
      excludesAuthenticationAccountRefIds: [accountLoginRefId]
    });
  });

  it("records redaction as append-only continuity, not mutation in place", () => {
    const redactionEvent = firstReplayableGoldenFixtureManifest.events.find(
      (event) => event.type === "system.redaction.applied"
    );

    expect(redactionEvent).toBeDefined();
    expect(redactionEvent?.payload).toMatchObject({
      originalEventPreserved: true,
      removedPayloadKeys: ["preciseLocation"]
    });
    expect(redactionEvent?.redaction).toMatchObject({
      isRedactedStub: false,
      originalEventId: "event.evidence.created.sensitive",
      redactionEventId: "event.system.redaction.applied.sensitive-evidence",
      preservedFields: ["id", "type", "occurredAt", "objectRef"],
      removedPayloadKeys: ["preciseLocation"]
    });
  });

  it("covers representative folded CommonCredit, ICOS, Sensemaking, and Stewardship shape", () => {
    const manifest = firstReplayableGoldenFixtureManifest;
    const eventsById = new Map<string, CanopyEvent>(
      manifest.events.map((event) => [event.id, event])
    );
    const objectsById = new Map(manifest.objects.map((object) => [object.ref.id, object]));
    const foodHubLedgerEvent = eventsById.get(
      "event.accounting.ledger-entry.posted.food-hub-distribution"
    );
    const foodHubCorrectionEvent = eventsById.get(
      "event.accounting.ledger-entry.reversed.food-hub-correction"
    );
    const irrigationDecisionEvent = eventsById.get(
      "event.governance.decision.recorded.irrigation-window"
    );
    const irrigationUseRightEvent = eventsById.get(
      "event.stewardship.use-right.granted.irrigation-window"
    );
    const riparianClaimEvent = eventsById.get(
      "event.claim.contested.riparian-stress"
    );
    const riparianModelEvent = eventsById.get(
      "event.model.output.generated.riparian-risk"
    );
    const federationImportEvent = eventsById.get(
      "event.federation.import.received.icos-irrigation-window"
    );

    expect(objectsById.get(goldenFixtureRefs.ledgerAccountFoodHub.id)?.ref.source?.sourceProject).toBe(
      "common-credit"
    );
    expect(objectsById.get(goldenFixtureRefs.decisionIrrigationWindow.id)?.ref.source?.sourceProject).toBe(
      "icos"
    );
    expect(objectsById.get(goldenFixtureRefs.claimRiparianStress.id)?.ref.source?.sourceProject).toBe(
      "sensemaking"
    );
    expect(objectsById.get(goldenFixtureRefs.resourceIrrigationGate.id)?.ref.source?.sourceProject).toBe(
      "stewardship"
    );
    expect(foodHubLedgerEvent?.payload).toMatchObject({
      lineAccountRefIds: [
        goldenFixtureRefs.ledgerAccountFoodHub.id,
        goldenFixtureRefs.ledgerAccountCommons.id
      ],
      excludesAuthenticationAccountRefIds: [goldenFixtureRefs.accountMiraLogin.id]
    });
    expect(foodHubCorrectionEvent?.supersession).toMatchObject({
      supersedesEventId: "event.accounting.ledger-entry.posted.food-hub-distribution",
      authorityRefs: [
        goldenFixtureRefs.decisionIrrigationWindow,
        goldenFixtureRefs.agreementFoodHubDistribution
      ]
    });
    expect(irrigationDecisionEvent?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        goldenFixtureRefs.mandateWatershedSteward.id,
        goldenFixtureRefs.policyDroughtProtocol.id
      ])
    );
    expect(irrigationDecisionEvent?.payload).toMatchObject({
      machineOutputAuthorityRefIds: [],
      unresolvedObjectionRefIds: []
    });
    expect(irrigationUseRightEvent?.payload).toMatchObject({
      holderRefId: goldenFixtureRefs.personKai.id,
      resourceRefId: goldenFixtureRefs.resourceIrrigationGate.id,
      review: {
        reviewPathRefId: goldenFixtureRefs.guardianReviewRiparian.id
      },
      revocation: {
        revocable: true
      }
    });
    expect(riparianClaimEvent?.payload).toMatchObject({
      preservesUncertainty: true,
      acceptedWithoutHumanReview: false
    });
    expect(riparianModelEvent?.authorityRefs).toEqual([]);
    expect(riparianModelEvent?.payload).toMatchObject({
      dataState: "model_derived",
      canAuthorizeBindingAction: false
    });
    expect(federationImportEvent?.payload).toMatchObject({
      sourceProject: "icos",
      canonicalMappingRefId: goldenFixtureRefs.canonicalMapping.id,
      preservesLocalIdentifiers: true
    });
  });
});
