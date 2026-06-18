import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import { buildCitizenCanopyModel, type CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 20 reviewer permissions, notifications, and queues", () => {
  it("blocks a review action when the active role cannot review the selected command", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        command: "command.report.riverbend-food-concern",
        reviewAction: "reject-command"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.riverbend-food-concern",
      status: "draft"
    });
    expect(model.commandCenter.actionResult).toMatchObject({
      label: "Review blocked",
      commandId: "command.report.riverbend-food-concern"
    });
    expect(model.commandCenter.notifications).toEqual([
      expect.objectContaining({
        level: "permission",
        label: "Permission needed",
        commandId: "command.report.riverbend-food-concern"
      })
    ]);
    expect(shellText).toContain("Review blocked");
    expect(shellText).toContain("Permission needed");
    expect(shellText).toContain("Switch to neighbor reviewer");
    expect(shellText).not.toContain("citizen.command.rejected");
  });

  it("allows a matching reviewer role to execute the review action with actor identity", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        role: "neighbor reviewer",
        command: "command.report.riverbend-food-concern",
        reviewAction: "approve-command"
      })
    });

    expect(isValidElement(element)).toBe(true);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.riverbend-food-concern",
      status: "approved",
      auditTrail: expect.arrayContaining([
        expect.objectContaining({
          reviewer: "neighbor reviewer at Riverbend Neighborhood"
        })
      ])
    });
    expect(model.commandCenter.notifications).toEqual([
      expect.objectContaining({
        level: "success",
        label: "Command approved"
      })
    ]);
    expect(shellText).toContain("neighbor reviewer at Riverbend Neighborhood");
    expect(shellText).toContain("Command approved");
  });

  it("separates my review queue from work that needs another reviewer", () => {
    const model = buildCitizenCanopyModel({
      activeRole: "neighbor reviewer",
      routePath: "/citizen/review-queue"
    });

    expect(model.commandCenter.myReviewQueue).toEqual([
      expect.objectContaining({
        id: "command.report.riverbend-food-concern"
      })
    ]);
    expect(model.commandCenter.otherReviewQueue).toEqual([
      expect.objectContaining({
        id: "command.match.school-produce"
      }),
      expect.objectContaining({
        id: "command.federation.downstream-reconciliation"
      })
    ]);
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
