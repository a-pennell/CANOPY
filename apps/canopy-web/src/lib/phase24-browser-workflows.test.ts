import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import { buildCitizenCanopyModel, type CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 24 end-to-end browser workflows", () => {
  it("documents canonical browser workflows for release readiness", () => {
    const model = buildCitizenCanopyModel({
      activeContextId: "operator.release",
      routePath: "/citizen/release-readiness"
    });
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.browserWorkflows).toEqual([
      expect.objectContaining({
        id: "browser.public-record-search",
        route: "/citizen/search?q=cooling&visibility=redacted&record=public.outcome.cooling-center-meals"
      }),
      expect.objectContaining({
        id: "browser.review-permission-block",
        route: "/citizen/review-queue?command=command.report.riverbend-food-concern&reviewAction=reject-command"
      }),
      expect.objectContaining({
        id: "browser.reviewer-approval",
        route: "/citizen/review-queue?role=neighbor%20reviewer&command=command.report.riverbend-food-concern&reviewAction=approve-command"
      }),
      expect.objectContaining({
        id: "browser.release-readiness-ready"
      })
    ]);
    expect(shellText).toContain("Browser workflows");
    expect(shellText).toContain("Public record search");
    expect(shellText).toContain("Review permission block");
    expect(shellText).toContain("Reviewer approval");
  });

  it("hydrates the main Phase 21-23 workflow routes through the app page", async () => {
    const workflows = [
      {
        routeSegments: ["citizen", "search"],
        searchParams: {
          q: "cooling",
          visibility: "redacted",
          record: "public.outcome.cooling-center-meals"
        },
        expectedText: "Cooling center meal support outcome"
      },
      {
        routeSegments: ["citizen", "review-queue"],
        searchParams: {
          command: "command.report.riverbend-food-concern",
          reviewAction: "reject-command"
        },
        expectedText: "Review blocked"
      },
      {
        routeSegments: ["citizen", "release-readiness"],
        searchParams: {
          context: "operator.release",
          providers: "connected",
          migrations: "verified",
          environment: "verified",
          observability: "connected",
          smoke: "passed"
        },
        expectedText: "ready"
      }
    ];

    for (const workflow of workflows) {
      const element = await CanopyPage({
        routeSegments: workflow.routeSegments,
        searchParams: Promise.resolve(workflow.searchParams)
      });

      expect(isValidElement(element)).toBe(true);
      expect(element.type).toBe(CitizenShell);
      const model = (element.props as { readonly model: CitizenCanopyModel }).model;
      expect(collectElementStrings(CitizenShell({ model })).join("\n")).toContain(
        workflow.expectedText
      );
    }
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
