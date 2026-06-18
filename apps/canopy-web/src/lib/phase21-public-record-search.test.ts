import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CitizenShell } from "../components/citizen-shell.js";
import type { CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 21 public record search", () => {
  it("filters public records by query and visibility while keeping detail visible", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "search"],
      searchParams: Promise.resolve({
        q: "cooling",
        visibility: "redacted",
        record: "public.outcome.cooling-center-meals"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.publicObserver.searchQuery).toBe("cooling");
    expect(model.publicObserver.visibilityFilter).toBe("redacted");
    expect(model.publicObserver.filteredRecords).toEqual([
      expect.objectContaining({
        id: "public.outcome.cooling-center-meals",
        visibility: "redacted"
      })
    ]);
    expect(model.publicObserver.selectedRecord).toMatchObject({
      id: "public.outcome.cooling-center-meals"
    });
    expect(shellText).toContain("Public record search");
    expect(shellText).toContain("Search query");
    expect(shellText).toContain("cooling");
    expect(shellText).toContain("Visibility filter");
    expect(shellText).toContain("redacted");
    expect(shellText).toContain("Cooling center meal support outcome");
    expect(shellText).not.toContain("School produce routing decision");
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
