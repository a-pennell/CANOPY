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

describe("Phase 18 command runtime audit", () => {
  it("approves a citizen command and records runtime audit evidence", () => {
    const provider = createInMemoryCitizenCommandProvider();
    const draft = provider.saveDraft(createReportConcernCommandInput());
    provider.moveToReview(draft.id);

    const result = executeCitizenCommandReview({
      provider,
      commandId: draft.id,
      action: "approve",
      reviewer: "Riverbend neighborhood reviewers",
      now: "2026-06-17T17:00:00.000Z"
    });

    expect(result.command).toMatchObject({
      id: draft.id,
      status: "approved"
    });
    expect(result.audit).toMatchObject({
      commandId: draft.id,
      action: "approve",
      eventType: "citizen.command.approved",
      outboxDestination: "projection-rebuild",
      projectionEffect: "Review queue and civic memory projections queued for rebuild",
      reviewer: "Riverbend neighborhood reviewers"
    });
    expect(provider.listCommands()[0]).toMatchObject({
      status: "approved",
      auditTrail: expect.arrayContaining([
        expect.objectContaining({
          eventType: "citizen.command.approved"
        })
      ])
    });
  });

  it("renders review approval audit evidence from the review queue route", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        command: "command.report.riverbend-food-concern",
        reviewAction: "approve-command"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.riverbend-food-concern",
      status: "approved",
      auditTrail: expect.arrayContaining([
        expect.objectContaining({
          eventType: "citizen.command.approved",
          outboxDestination: "projection-rebuild"
        })
      ])
    });
    expect(shellText).toContain("Command approved");
    expect(shellText).toContain("Audit event");
    expect(shellText).toContain("citizen.command.approved");
    expect(shellText).toContain("projection-rebuild");
    expect(shellText).toContain("Review queue and civic memory projections queued for rebuild");
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
