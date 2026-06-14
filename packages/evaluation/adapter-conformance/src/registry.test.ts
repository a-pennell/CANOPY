import { describe, expect, it } from "vitest";
import { adapterKinds } from "./adapter-kinds";
import { adapterConformanceRegistry, adapterConformanceSuites } from "./registry";

const expectedAdapterKinds = [
  "auth",
  "persistence",
  "event-store",
  "object-graph",
  "document-store",
  "object-storage",
  "geospatial",
  "time-series",
  "vector",
  "federation-transport",
  "legacy-project"
] as const;

const expectedInvariantIds = [
  "adapter.auth.subject-account-separation",
  "adapter.auth.permission-trace-required",
  "adapter.persistence.object-ref-integrity",
  "adapter.persistence.stewardship-metadata-preserved",
  "adapter.event-store.append-only",
  "adapter.event-store.event-order-stable",
  "adapter.object-graph.relationship-direction-preserved",
  "adapter.object-graph.lifecycle-filtering",
  "adapter.document-store.content-hash-stable",
  "adapter.document-store.redaction-stubs",
  "adapter.object-storage.object-hash-stable",
  "adapter.object-storage.namespace-isolation",
  "adapter.geospatial.place-scope-query",
  "adapter.geospatial.geometry-round-trip",
  "adapter.time-series.observation-order-stable",
  "adapter.time-series.window-boundaries-inclusive",
  "adapter.vector.source-ref-preserved",
  "adapter.vector.stewardship-filtering",
  "adapter.federation-transport.envelope-integrity",
  "adapter.federation-transport.redaction-respected",
  "adapter.legacy-project.source-pointer-required",
  "adapter.legacy-project.canonical-mapping-reviewed"
] as const;

describe("adapter conformance registry", () => {
  it("covers every adapter kind exactly once", () => {
    const registryKinds = Object.keys(adapterConformanceRegistry);
    const suiteKinds = adapterConformanceSuites.map((suite) => suite.kind);

    expect(adapterKinds).toEqual(expectedAdapterKinds);
    expect(registryKinds).toEqual(expectedAdapterKinds);
    expect(suiteKinds).toEqual(expectedAdapterKinds);
    expect(new Set(suiteKinds).size).toBe(expectedAdapterKinds.length);
  });

  it("keeps invariant ids stable and globally unique", () => {
    const invariantIds = adapterConformanceSuites.flatMap((suite) =>
      suite.invariants.map((invariant) => invariant.id)
    );

    expect(invariantIds).toEqual(expectedInvariantIds);
    expect(new Set(invariantIds).size).toBe(invariantIds.length);

    for (const invariantId of invariantIds) {
      expect(invariantId).toMatch(/^adapter\.[a-z-]+\.[a-z0-9-]+$/);
    }
  });

  it("keeps cases aligned to registered invariants", () => {
    for (const suite of adapterConformanceSuites) {
      const invariantIds = new Set(suite.invariants.map((invariant) => invariant.id));

      expect(suite.capabilityGroups.length).toBeGreaterThan(0);
      expect(suite.cases).toHaveLength(suite.invariants.length);

      for (const conformanceCase of suite.cases) {
        expect(invariantIds.has(conformanceCase.invariantId)).toBe(true);
        expect(conformanceCase.id).toBe(
          conformanceCase.invariantId.replace("adapter.", "case.")
        );
      }
    }
  });
});
