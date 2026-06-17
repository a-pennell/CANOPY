import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import {
  createInMemoryCitizenCommandProvider,
  createNeedOfferMatchCommandInput,
  createReportConcernCommandInput
} from "./citizen-command-provider.js";
import { buildCitizenCanopyModel, type CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 14 and 15 citizen command persistence", () => {
  it("saves, submits, cancels, and moves citizen commands through a provider", () => {
    const provider = createInMemoryCitizenCommandProvider();
    const draft = provider.saveDraft(createReportConcernCommandInput());

    expect(draft).toMatchObject({
      id: "command.report.generated-neighborhood-concern",
      status: "draft",
      reviewOwner: "Riverbend neighborhood reviewers"
    });

    const submitted = provider.submitCommand(draft.id);
    expect(submitted.status).toBe("submitted");

    const review = provider.moveToReview(draft.id);
    expect(review).toMatchObject({
      status: "needs-review",
      civicMemoryEffect: "Creates a public concern record for review"
    });

    const cancelled = provider.cancelCommand(draft.id);
    expect(cancelled.status).toBe("cancelled");
    expect(provider.listCommands().map((command) => command.status)).toEqual(["cancelled"]);
  });

  it("hydrates the citizen command center from provider records", () => {
    const provider = createInMemoryCitizenCommandProvider();
    const reportDraft = provider.saveDraft(createReportConcernCommandInput());
    const matchDraft = provider.saveDraft(
      createNeedOfferMatchCommandInput({
        needLabel: "Cooling center meal support",
        offerLabel: "Volunteer cold storage"
      })
    );
    provider.submitCommand(matchDraft.id);

    const model = buildCitizenCanopyModel({
      commandRecords: provider.listCommands(),
      selectedCommandId: reportDraft.id
    });

    expect(model.commandCenter).toMatchObject({
      savedDrafts: expect.arrayContaining([
        expect.objectContaining({
          id: "command.report.generated-neighborhood-concern"
        })
      ]),
      submittedCommands: expect.arrayContaining([
        expect.objectContaining({
          id: "command.match.generated-need-offer",
          label: "Match Cooling center meal support with Volunteer cold storage"
        })
      ]),
      selectedCommand: expect.objectContaining({
        id: "command.report.generated-neighborhood-concern"
      })
    });
  });

  it("creates a saved report draft from the citizen report route", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "report"],
      searchParams: Promise.resolve({ action: "save-report-draft" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.generated-neighborhood-concern",
      status: "draft",
      reviewOwner: "Riverbend neighborhood reviewers"
    });
    expect(shellText).toContain("Draft saved from report");
    expect(shellText).toContain("Report concern from citizen form");
    expect(shellText).toContain("Creates a public concern record for review");
  });

  it("submits a match command from the needs and offers route", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "needs-offers"],
      searchParams: Promise.resolve({
        action: "submit-match",
        need: "need.neighborhood-cooling-meals",
        offer: "offer.volunteer-cold-storage"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.match.generated-need-offer",
      status: "submitted",
      label: "Match Cooling center meal support with Volunteer cold storage"
    });
    expect(shellText).toContain("Command submitted");
    expect(shellText).toContain("Match Cooling center meal support with Volunteer cold storage");
    expect(shellText).toContain("Creates a commitment review entry before any task is assigned");
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
