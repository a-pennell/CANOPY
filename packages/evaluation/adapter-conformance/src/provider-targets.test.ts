import { createPostgresDocumentStoreAdapter } from "@canopy/adapters-provider-postgres-document-store";
import { createS3ObjectStorageAdapter } from "@canopy/adapters-provider-s3-object-storage";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adapterKinds } from "./adapter-kinds.js";
import {
  type ExecutableAdapter,
  runExecutableAdapterConformance
} from "./executable.js";
import type { AdapterSuiteResult } from "./harness.js";
import { adapterConformanceRegistry } from "./registry.js";
import {
  adapterProviderTargets,
  adapterProviderTargetsByKind,
  candidateProviderTargets,
  getAdapterProviderTargets,
  legacyProviderTargets,
  referenceProviderTargets
} from "./provider-targets.js";

const NOW = "2026-01-01T00:00:00.000Z";

const foldedSourceProjects = [
  "common-credit",
  "icos",
  "sensemaking",
  "stewardship"
] as const;

describe("adapter provider targets", () => {
  it("anchors every adapter kind to at least one provider target", () => {
    expect(referenceProviderTargets.map((target) => target.kind)).toEqual(adapterKinds);

    for (const kind of adapterKinds) {
      const targets = getAdapterProviderTargets(kind);

      expect(targets).toBe(adapterProviderTargetsByKind[kind]);
      expect(targets.length).toBeGreaterThan(0);
      expect(targets.every((target) => target.conformanceSuiteKind === kind)).toBe(true);
    }
  });

  it("keeps target ids unique and tied to registered conformance suites", () => {
    const ids = adapterProviderTargets.map((target) => target.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const target of adapterProviderTargets) {
      expect(adapterConformanceRegistry[target.conformanceSuiteKind]).toBeDefined();
      expect(target.requiredBeforeProductionUse.length).toBeGreaterThan(0);
      expect(target.plannedPackage).toMatch(/^packages\/adapters\//);
    }
  });

  it("points candidate provider targets at real package anchors", () => {
    for (const target of candidateProviderTargets) {
      const packagePath = join(process.cwd(), target.plannedPackage);
      const packageJsonPath = join(packagePath, "package.json");
      const indexPath = join(packagePath, "src", "index.ts");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        readonly exports?: Readonly<Record<string, string>>;
      };

      expect(existsSync(packagePath), target.plannedPackage).toBe(true);
      expect(existsSync(indexPath), `${target.plannedPackage}/src/index.ts`).toBe(
        true
      );
      expect(packageJson.exports?.["."]).toBe("./src/index.ts");
    }
  });

  it("keeps real provider targets non-implemented until production binding exists", () => {
    expect(candidateProviderTargets.length).toBeGreaterThan(0);
    expect(
      candidateProviderTargets.every((target) =>
        target.status === "planned" || target.status === "prototype"
      )
    ).toBe(true);
    expect(candidateProviderTargets.every((target) => target.role === "candidate-provider")).toBe(
      true
    );
  });

  it("runs executable conformance for prototype provider targets", async () => {
    const prototypes: readonly {
      readonly targetId: string;
      readonly adapter: ExecutableAdapter;
    }[] = [
      {
        targetId: "adapter-target.document-store.postgres",
        adapter: createPostgresDocumentStoreAdapter({ now: () => NOW })
      },
      {
        targetId: "adapter-target.object-storage.s3-compatible",
        adapter: createS3ObjectStorageAdapter({ now: () => NOW })
      }
    ];
    const results: AdapterSuiteResult[] = [];

    for (const prototype of prototypes) {
      const target = candidateProviderTargets.find(
        (candidate) => candidate.id === prototype.targetId
      );

      expect(target, prototype.targetId).toBeDefined();
      expect(target?.status).toBe("prototype");
      expect(prototype.adapter.descriptor.kind).toBe(target?.kind);

      const health = await prototype.adapter.health();
      expect(health.status).toBe("healthy");
      expect(health.warnings.join(" ")).toContain("in-memory prototype");

      const result = await runExecutableAdapterConformance(prototype.adapter, {
        evaluatedAt: NOW
      });
      results.push(result);

      expect(result.adapter.id).toBe(prototype.adapter.descriptor.id);
      expect(result.suiteKind).toBe(target?.conformanceSuiteKind);
    }

    expect(
      results.every((result) => result.passed),
      failureSummary(results)
    ).toBe(true);
  });

  it("treats legacy projects as folded sources, not standalone apps", () => {
    expect(legacyProviderTargets.map((target) => target.sourceProject)).toEqual(
      foldedSourceProjects
    );
    expect(legacyProviderTargets.map((target) => target.provider)).toEqual(
      foldedSourceProjects
    );
    expect(
      legacyProviderTargets.every((target) => target.role === "legacy-fold-in-source")
    ).toBe(true);
  });
});

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

  return `prototype provider conformance should pass\n${failures.join("\n")}`;
}
