import { describe, expect, it } from "vitest";
import type { CanopyUiShellNavigation, CanopyUiShellScreen } from "./index.js";
import { defaultImportReviewDisposition } from "./index.js";

describe("ui contracts", () => {
  it("defaults import review dispositions from dry-run risk", () => {
    expect(
      defaultImportReviewDisposition({
        status: "pass",
        candidateDisposition: "create",
        confidence: "high"
      })
    ).toBe("accept");
    expect(
      defaultImportReviewDisposition({
        status: "warn",
        candidateDisposition: "alias",
        confidence: "medium"
      })
    ).toBe("defer");
    expect(
      defaultImportReviewDisposition({
        status: "pass",
        candidateDisposition: "needs-review",
        confidence: "high"
      })
    ).toBe("needs-review");
    expect(
      defaultImportReviewDisposition({
        status: "blocked",
        candidateDisposition: "create",
        confidence: "high"
      })
    ).toBe("reject");
  });

  it("models shell navigation and rendered screens", () => {
    const navigation = {
      activeRouteId: "route.scope",
      activePath: "/scope",
      routes: [
        {
          id: "route.scope",
          path: "/scope",
          label: "Scope",
          surfaceKind: "scope-overview",
          status: "current"
        },
        {
          id: "route.imports",
          path: "/imports",
          label: "Imports",
          surfaceKind: "import-review",
          status: "unavailable",
          disabledReason: "Provide an import dry run."
        }
      ],
      breadcrumbs: [{ label: "Scope", path: "/scope" }]
    } as const satisfies CanopyUiShellNavigation;
    const screen = {
      kind: "shell-screen",
      title: "Canopy Shell",
      route: navigation.routes[0],
      navigation,
      lines: ["Canopy Shell"],
      text: "Canopy Shell"
    } as const satisfies CanopyUiShellScreen;

    expect(screen.navigation.routes[1]?.surfaceKind).toBe("import-review");
    expect(screen.navigation.routes[1]?.status).toBe("unavailable");
  });
});
