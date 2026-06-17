import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import type { CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 17 citizen form submissions", () => {
  it("renders report form controls and saves the submitted description into a command", async () => {
    const formElement = await CanopyPage({
      routeSegments: ["citizen", "report"]
    });
    const submittedElement = await CanopyPage({
      routeSegments: ["citizen", "report"],
      searchParams: Promise.resolve({
        action: "save-report-draft",
        description: "Cooling center meal shelves are running low"
      })
    });

    expect(isValidElement(formElement)).toBe(true);
    expect(isValidElement(submittedElement)).toBe(true);

    const formModel = (formElement.props as { readonly model: CitizenCanopyModel }).model;
    const submittedModel = (submittedElement.props as { readonly model: CitizenCanopyModel }).model;
    const formText = collectElementStrings(CitizenShell({ model: formModel })).join("\n");
    const submittedText = collectElementStrings(CitizenShell({ model: submittedModel })).join("\n");

    expect(formText).toContain("Describe what happened");
    expect(formText).toContain("Save draft");
    expect(submittedModel.commandCenter.selectedCommand).toMatchObject({
      label: "Report: Cooling center meal shelves are running low",
      status: "draft"
    });
    expect(submittedText).toContain("Report: Cooling center meal shelves are running low");
  });

  it("renders match form controls and submits selected need and offer into a command", async () => {
    const formElement = await CanopyPage({
      routeSegments: ["citizen", "needs-offers"]
    });
    const submittedElement = await CanopyPage({
      routeSegments: ["citizen", "needs-offers"],
      searchParams: Promise.resolve({
        action: "submit-match",
        need: "need.neighborhood-cooling-meals",
        offer: "offer.volunteer-cold-storage"
      })
    });

    expect(isValidElement(formElement)).toBe(true);
    expect(isValidElement(submittedElement)).toBe(true);

    const formModel = (formElement.props as { readonly model: CitizenCanopyModel }).model;
    const submittedModel = (submittedElement.props as { readonly model: CitizenCanopyModel }).model;
    const formText = collectElementStrings(CitizenShell({ model: formModel })).join("\n");
    const submittedText = collectElementStrings(CitizenShell({ model: submittedModel })).join("\n");

    expect(formText).toContain("Choose a need");
    expect(formText).toContain("Choose an offer");
    expect(formText).toContain("Submit match");
    expect(submittedModel.commandCenter.selectedCommand).toMatchObject({
      label: "Match Cooling center meal support with Volunteer cold storage",
      status: "submitted"
    });
    expect(submittedText).toContain("Command submitted");
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
