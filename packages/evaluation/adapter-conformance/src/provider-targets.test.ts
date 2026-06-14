import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { adapterKinds } from "./adapter-kinds.js";
import { adapterConformanceRegistry } from "./registry.js";
import {
  adapterProviderTargets,
  adapterProviderTargetsByKind,
  candidateProviderTargets,
  getAdapterProviderTargets,
  legacyProviderTargets,
  referenceProviderTargets
} from "./provider-targets.js";

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

  it("keeps real provider targets planned until conformance implementation exists", () => {
    expect(candidateProviderTargets.length).toBeGreaterThan(0);
    expect(candidateProviderTargets.every((target) => target.status === "planned")).toBe(
      true
    );
    expect(candidateProviderTargets.every((target) => target.role === "candidate-provider")).toBe(
      true
    );
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
