import { createInMemoryReferenceAdapters } from "@canopy/adapters-reference-in-memory";
import type {
  LegacySourceRecord,
  CanopyAdapterRegistry
} from "@canopy/contracts-adapters";
import { describe, expect, it } from "vitest";
import { adapterKinds, type AdapterKind } from "./adapter-kinds.js";
import {
  type ExecutableAdapter,
  runExecutableAdapterConformance
} from "./executable.js";
import type { AdapterSuiteResult } from "./harness.js";

const NOW = "2026-01-01T00:00:00.000Z";
const LEGACY_RECORD: LegacySourceRecord = {
  source: {
    sourceProject: "canopy",
    sourceEntity: "adapter-conformance",
    sourceId: "fixture"
  },
  objectTypeHint: "resource",
  payload: { label: "legacy fixture" },
  contentHash: "sha256:legacy-record"
};

describe("reference in-memory adapter conformance", () => {
  it("runs executable conformance for every adapter kind in the reference registry", async () => {
    const registry = createInMemoryReferenceAdapters({
      now: () => NOW,
      legacyRecords: [LEGACY_RECORD]
    });

    const adaptersByKind = new Map<AdapterKind, ExecutableAdapter>(
      adapterKinds.map((kind) => [kind, adapterForKind(registry, kind)])
    );

    expect([...adaptersByKind.keys()]).toEqual(adapterKinds);

    const results: AdapterSuiteResult[] = [];

    for (const kind of adapterKinds) {
      const adapter = adaptersByKind.get(kind);

      expect(adapter, `${kind} adapter should be available`).toBeDefined();

      const result = await runExecutableAdapterConformance(adapter!, {
        evaluatedAt: NOW
      });

      results.push(result);
      expect(result.adapter.kind).toBe(kind);
      expect(result.suiteKind).toBe(kind);
    }

    expect(
      results.every((result) => result.passed),
      failureSummary(results)
    ).toBe(true);
  });
});

function adapterForKind(
  registry: CanopyAdapterRegistry,
  kind: AdapterKind
): ExecutableAdapter {
  switch (kind) {
    case "auth":
      return registry.auth!;
    case "persistence":
      return registry.persistence!;
    case "event-store":
      return registry.eventStore!;
    case "object-graph":
      return registry.objectGraph!;
    case "document-store":
      return registry.documentStore!;
    case "object-storage":
      return registry.objectStorage!;
    case "geospatial":
      return registry.geospatial!;
    case "time-series":
      return registry.timeSeries!;
    case "vector":
      return registry.vector!;
    case "federation-transport":
      return registry.federationTransport!;
    case "legacy-project":
      return registry.legacyProjectAdapters[0]!;
  }
}

function failureSummary(results: readonly AdapterSuiteResult[]): string {
  const failures = results.flatMap((result) =>
    result.results
      .filter((caseResult) => !caseResult.passed)
      .map((caseResult) => {
        const issues = caseResult.issues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join("; ");
        const evidence =
          caseResult.evidence === undefined
            ? ""
            : ` ${JSON.stringify(caseResult.evidence)}`;

        return `${result.suiteKind} ${caseResult.invariantId} - ${issues}${evidence}`;
      })
  );

  return `reference in-memory conformance should pass\n${failures.join("\n")}`;
}
