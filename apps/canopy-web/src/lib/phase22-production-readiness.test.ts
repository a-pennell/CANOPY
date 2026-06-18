import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import type { CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 22 production provider wiring and deployment readiness", () => {
  it("marks release gates ready when production wiring evidence is present", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "release-readiness"],
      searchParams: Promise.resolve({
        context: "operator.release",
        providers: "connected",
        migrations: "verified",
        environment: "verified",
        observability: "connected",
        smoke: "passed"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.releaseReadiness).toMatchObject({
      liveDeploymentStatus: "passed",
      releaseGateStatus: "ready",
      providerConnections: "connected",
      migrationEvidence: "verified",
      environmentEvidence: "verified",
      observabilityEvidence: "connected",
      smokeEvidence: "passed",
      nextActions: []
    });
    expect(model.releaseReadiness.providerBlockers).toEqual([]);
    expect(shellText).toContain("Release gate");
    expect(shellText).toContain("ready");
    expect(shellText).toContain("Provider connections");
    expect(shellText).toContain("connected");
    expect(shellText).toContain("Smoke evidence");
    expect(shellText).toContain("passed");
  });
});

function collectElementStrings(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElementStrings(child));
  }

  if (isValidElement<{ readonly children?: unknown }>(node)) {
    return collectElementStrings(node.props.children);
  }

  return [];
}
