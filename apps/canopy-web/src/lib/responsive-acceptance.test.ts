import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("Phase 5 responsive shell acceptance", () => {
  it("defines tablet and mobile breakpoints for shell-critical grids", () => {
    expect(css).toContain("@media (max-width: 1100px)");
    expect(css).toContain("@media (max-width: 680px)");
    expect(css).toContain(".metricGrid,\n  .mainGrid,\n  .opsGrid,\n  .commandGrid,\n  .refGrid,\n  .mutationGrid");
  });

  it("collapses object, preview, and action surfaces on mobile", () => {
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 680px)"));

    expect(mobileBlock).toContain(".objectHeader,\n  .mutationHeader");
    expect(mobileBlock).toContain(".mutationActions");
    expect(mobileBlock).toContain("grid-template-columns: 1fr");
    expect(mobileBlock).toContain(".spanTwo {\n    grid-column: auto;");
  });
});
