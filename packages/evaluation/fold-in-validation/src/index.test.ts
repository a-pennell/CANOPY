import { describe, expect, it } from "vitest";
import type { CanopyEvent } from "@canopy/contracts-kernel";
import {
  foldedSourceSampleCanonicalEvents,
  foldedSourceSampleCanonicalObjects,
  foldedSourceSampleRefs,
  foldedSourceSampleExportBundles
} from "@canopy/database-import-plans";
import {
  firstReplayableGoldenFixtureManifest,
  goldenFixtureRefs
} from "@canopy/contracts-testing";
import {
  foldInSourceOnlyProjects,
  validateFoldIn,
  validateGoldenFixtureFoldIn
} from "./index.js";

describe("fold-in validation", () => {
  it("builds a provider-neutral validation report over the golden event stream", () => {
    const report = validateGoldenFixtureFoldIn(firstReplayableGoldenFixtureManifest, {
      objectPageRefs: [
        goldenFixtureRefs.decisionUseRight,
        goldenFixtureRefs.decisionIrrigationWindow,
        goldenFixtureRefs.useRightNorthPasture,
        goldenFixtureRefs.useRightIrrigationGate,
        goldenFixtureRefs.resourceNorthPasture
      ],
      resourceRefs: [
        goldenFixtureRefs.resourceNorthPasture,
        goldenFixtureRefs.resourceIrrigationGate
      ],
      shellNavigation: [
        { label: "Objects", href: "/objects" },
        { label: "Capabilities", href: "/capabilities" }
      ],
      capabilityPackageNames: [
        "@canopy/capabilities-allocation-accounting",
        "@canopy/capabilities-claims-evidence",
        "@canopy/capabilities-governance"
      ]
    });

    expect(report.status).toBe("pass");
    expect(report.mappingCoverage.missingRefIds).toEqual([]);
    expect(report.eventCoverage.missingEventTypes).toEqual([]);
    expect(report.authorityCoverage.missingAuthorityEventIds).toEqual([]);
    expect(report.dataStewardshipCoverage.uncoveredEventIds).toEqual([]);
    expect(report.replayParity.projectedEventCount).toBe(
      firstReplayableGoldenFixtureManifest.events.length
    );
    expect(report.shellLeakage.findings).toEqual([]);
    expect(report.ecologicalHookCoverage.stewardshipResourcesMissingHooks).toEqual([]);
    expect(report.ecologicalHookCoverage.stewardshipResourcesWithHooks).toEqual([
      goldenFixtureRefs.resourceIrrigationGate.id,
      goldenFixtureRefs.resourceNorthPasture.id
    ]);
    expect(report.federationReadiness.readyEventIds).toContain(
      "event.federation.export.created.first-commons"
    );
    expect(report.federationReadiness.readyEventIds).toContain(
      "event.federation.import.received.icos-irrigation-window"
    );
    expect(report.projections.objectPages).toHaveLength(5);
    expect(report.projections.resourceStewardship).toHaveLength(2);
    expect(
      report.projections.objectPages
        .find((page) => page.objectRef.id === goldenFixtureRefs.decisionIrrigationWindow.id)
        ?.authorityRefs.map((ref) => ref.id)
    ).toEqual(
      expect.arrayContaining([
        goldenFixtureRefs.mandateWatershedSteward.id,
        goldenFixtureRefs.policyDroughtProtocol.id
      ])
    );
    expect(
      report.projections.resourceStewardship
        .find((projection) => projection.resourceRef.id === goldenFixtureRefs.resourceIrrigationGate.id)
        ?.useRights[0]
    ).toMatchObject({
      useRightRef: { id: goldenFixtureRefs.useRightIrrigationGate.id },
      holderRefId: goldenFixtureRefs.personKai.id,
      permissions: ["open_gate.dawn_window"],
      decisionRefIds: [goldenFixtureRefs.decisionIrrigationWindow.id]
    });
  });

  it("allows source project names in source metadata and import plans", () => {
    const report = validateGoldenFixtureFoldIn(firstReplayableGoldenFixtureManifest, {
      shellNavigation: [{ label: "Source imports", href: "/imports" }],
      capabilityPackageNames: ["@canopy/capabilities-governance"]
    });

    expect(foldInSourceOnlyProjects).toEqual([
      "common-credit",
      "icos",
      "sensemaking",
      "stewardship"
    ]);
    expect(report.mappingCoverage.importPlanSourceProjects).toEqual([
      "common-credit",
      "icos",
      "sensemaking",
      "stewardship"
    ]);
    expect(report.shellLeakage.status).toBe("pass");
  });

  it("validates canonical events mapped from realistic folded-source export bundles", () => {
    const report = validateFoldIn({
      events: foldedSourceSampleCanonicalEvents,
      expectedRefs: foldedSourceSampleCanonicalObjects,
      expectedEventTypes: foldedSourceSampleCanonicalEvents.map((event) => event.type),
      objectPageRefs: [
        foldedSourceSampleRefs.claimRiparianStress,
        foldedSourceSampleRefs.useRightIrrigationGate,
        foldedSourceSampleRefs.ledgerEntryFoodHubCorrection
      ],
      resourceRefs: [foldedSourceSampleRefs.resourceIrrigationGate],
      importPlans: foldedSourceSampleExportBundles.map((bundle) => ({
        sourceProject: bundle.sourceProject,
        planId: `${bundle.sourceProject}-fold-in`
      })),
      shellNavigation: [
        { label: "Objects", href: "/objects" },
        { label: "Capabilities", href: "/capabilities" }
      ],
      capabilityPackageNames: [
        "@canopy/capabilities-governance",
        "@canopy/capabilities-resource-care",
        "@canopy/capabilities-allocation-accounting"
      ]
    });

    expect(report.status).toBe("pass");
    expect(report.mappingCoverage.missingRefIds).toEqual([]);
    expect(report.mappingCoverage.importPlanSourceProjects).toEqual([
      "common-credit",
      "icos",
      "sensemaking",
      "stewardship"
    ]);
    expect(report.eventCoverage.missingEventTypes).toEqual([]);
    expect(report.authorityCoverage.missingAuthorityEventIds).toEqual([]);
    expect(report.dataStewardshipCoverage.uncoveredEventIds).toEqual([]);
    expect(report.ecologicalHookCoverage.stewardshipResourcesWithHooks).toEqual([
      foldedSourceSampleRefs.resourceIrrigationGate.id
    ]);
    expect(report.shellLeakage.findings).toEqual([]);
    expect(
      report.projections.objectPages
        .find((page) => page.objectRef.id === foldedSourceSampleRefs.useRightIrrigationGate.id)
        ?.authorityRefs.map((ref) => ref.id)
    ).toEqual(
      expect.arrayContaining([
        foldedSourceSampleRefs.mandateIrrigationWindow.id,
        foldedSourceSampleRefs.decisionIrrigationWindow.id
      ])
    );
    expect(
      report.projections.resourceStewardship[0]?.useRights[0]
    ).toMatchObject({
      useRightRef: { id: foldedSourceSampleRefs.useRightIrrigationGate.id },
      holderRefId: foldedSourceSampleRefs.personKai.id,
      permissions: ["open_gate.dawn_window"],
      decisionRefIds: [foldedSourceSampleRefs.decisionIrrigationWindow.id]
    });
  });

  it("flags source project names in shell navigation and capability package names", () => {
    const report = validateGoldenFixtureFoldIn(firstReplayableGoldenFixtureManifest, {
      shellNavigation: [{ label: "ICOS maps", href: "/common-credit/accounts" }],
      capabilityPackageNames: ["@canopy/capabilities-sensemaking"]
    });

    expect(report.status).toBe("fail");
    expect(report.shellLeakage.status).toBe("fail");
    expect(report.shellLeakage.findings.map((finding) => finding.token)).toEqual([
      "icos",
      "common-credit",
      "sensemaking"
    ]);
  });

  it("flags missing event coverage, authority coverage, and replay parity gaps", () => {
    const incompleteEvents = firstReplayableGoldenFixtureManifest.events
      .filter((event) => event.type !== "governance.decision.recorded")
      .map((event) =>
        event.type === "stewardship.use_right.granted"
          ? { ...event, authorityRefs: [] }
          : event
      );
    const report = validateFoldIn({
      events: incompleteEvents,
      expectedRefs: firstReplayableGoldenFixtureManifest.objects.map((object) => object.ref),
      expectedEventTypes: ["governance.decision.recorded", "stewardship.use_right.granted"],
      federationRuleRefs: firstReplayableGoldenFixtureManifest.federationRuleRefs,
      canonicalMappingRefs: firstReplayableGoldenFixtureManifest.canonicalMappingRefs
    });

    expect(report.status).toBe("fail");
    expect(report.eventCoverage.missingEventTypes).toEqual([
      "governance.decision.recorded"
    ]);
    expect(report.authorityCoverage.missingAuthorityEventIds).toEqual([
      "event.stewardship.use-right.granted.irrigation-window",
      "event.stewardship.use-right.granted.north-pasture"
    ]);
    expect(report.replayParity.status).toBe("pass");
  });

  it("flags duplicate events as replay parity and event coverage risks", () => {
    const duplicate = firstReplayableGoldenFixtureManifest.events[0] as CanopyEvent;
    const report = validateFoldIn({
      events: [...firstReplayableGoldenFixtureManifest.events, duplicate],
      expectedEventTypes: firstReplayableGoldenFixtureManifest.expectations.flatMap(
        (expectation) => expectation.requiredEventTypes
      ),
      federationRuleRefs: firstReplayableGoldenFixtureManifest.federationRuleRefs,
      canonicalMappingRefs: firstReplayableGoldenFixtureManifest.canonicalMappingRefs
    });

    expect(report.status).toBe("fail");
    expect(report.eventCoverage.duplicateEventIds).toEqual([duplicate.id]);
    expect(report.replayParity.status).toBe("fail");
  });
});
