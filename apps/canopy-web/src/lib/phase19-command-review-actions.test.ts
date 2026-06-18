import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import {
  createInMemoryCitizenCommandProvider,
  createReportConcernCommandInput,
  executeCitizenCommandReview
} from "./citizen-command-provider.js";
import type { CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 19 command review actions", () => {
  it("rejects a citizen command with audit evidence", () => {
    const provider = createInMemoryCitizenCommandProvider();
    const draft = provider.saveDraft(createReportConcernCommandInput());
    provider.moveToReview(draft.id);

    const result = executeCitizenCommandReview({
      provider,
      commandId: draft.id,
      action: "reject",
      reviewer: "Riverbend neighborhood reviewers",
      now: "2026-06-17T18:00:00.000Z"
    });

    expect(result.command).toMatchObject({
      id: draft.id,
      status: "rejected"
    });
    expect(result.audit).toMatchObject({
      action: "reject",
      eventType: "citizen.command.rejected",
      outboxDestination: "projection-rebuild",
      projectionEffect: "Review queue and civic memory projections queued after rejection"
    });
  });

  it("requests changes on a citizen command with audit evidence", () => {
    const provider = createInMemoryCitizenCommandProvider();
    const draft = provider.saveDraft(createReportConcernCommandInput());
    provider.moveToReview(draft.id);

    const result = executeCitizenCommandReview({
      provider,
      commandId: draft.id,
      action: "request-changes",
      reviewer: "Riverbend neighborhood reviewers",
      now: "2026-06-17T18:05:00.000Z"
    });

    expect(result.command).toMatchObject({
      id: draft.id,
      status: "changes-requested"
    });
    expect(result.audit).toMatchObject({
      action: "request-changes",
      eventType: "citizen.command.changes_requested",
      outboxDestination: "review-follow-up",
      projectionEffect: "Review queue projections queued with requested changes"
    });
  });

  it("renders request changes as a review queue route outcome", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        role: "neighbor reviewer",
        command: "command.report.riverbend-food-concern",
        reviewAction: "request-changes"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.riverbend-food-concern",
      status: "changes-requested",
      auditTrail: expect.arrayContaining([
        expect.objectContaining({
          eventType: "citizen.command.changes_requested",
          outboxDestination: "review-follow-up"
        })
      ])
    });
    expect(shellText).toContain("Changes requested");
    expect(shellText).toContain("citizen.command.changes_requested");
    expect(shellText).toContain("review-follow-up");
    expect(shellText).toContain("Review queue projections queued with requested changes");
  });

  it("renders all review action links for the selected command", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        command: "command.report.riverbend-food-concern"
      })
    });

    expect(isValidElement(element)).toBe(true);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(shellText).toContain("Approve for review");
    expect(shellText).toContain("Request changes");
    expect(shellText).toContain("Reject command");
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
