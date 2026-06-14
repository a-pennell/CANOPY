import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyDashboard } from "../components/canopy-dashboard";
import type { CanopyWebModel } from "../lib/canopy-data";
import { CanopyPage } from "./canopy-page";

describe("Canopy App Router acceptance", () => {
  it.each([
    { routeSegments: ["scope"], routePath: "/scope", surfaceKind: "scope-overview" },
    { routeSegments: ["memory"], routePath: "/memory", surfaceKind: "civic-memory-stream" },
    {
      routeSegments: ["objects", "resource", "resource.north-pasture"],
      routePath: "/objects/resource/resource.north-pasture",
      surfaceKind: "object-page"
    },
    {
      routeSegments: ["resource-care"],
      routePath: "/resource-care",
      surfaceKind: "resource-stewardship"
    },
    { routeSegments: ["federation"], routePath: "/federation", surfaceKind: "federation-export-state" }
  ])("hydrates $routePath from route segments", async ({ routeSegments, routePath, surfaceKind }) => {
    const model = await modelFromPage({ routeSegments });

    expect(model.routePath).toBe(routePath);
    expect(model.session.navigation.activePath).toBe(routePath);
    expect(model.session.screen.route.surfaceKind).toBe(surfaceKind);
  });

  it("keeps /objects/:type/:id object-specific across route, workspace, and preview surfaces", async () => {
    const model = await modelFromPage({
      routeSegments: ["objects", "resource", "resource.north-pasture"]
    });
    const objectWorkspace = model.workspaces.find((workspace) => workspace.id === "objects");
    const objectPage = objectWorkspace?.session.snapshot.surfaces.objectPage;

    expect(model.selectedObjectRef).toMatchObject({
      type: "resource",
      id: "resource.north-pasture"
    });
    expect(objectWorkspace?.session.navigation.activePath).toBe(
      "/objects/resource/resource.north-pasture"
    );
    expect(objectPage?.objectRef).toEqual(model.selectedObjectRef);
    expect(model.mutationPreview.proposedEvent.objectRef).toEqual(model.selectedObjectRef);
  });

  it("switches scope from query params without changing the active route", async () => {
    const allScope = await modelFromPage({
      routeSegments: ["memory"],
      searchParams: Promise.resolve({ scope: "all" })
    });
    const objectScope = await modelFromPage({
      routeSegments: ["objects", "resource", "resource.north-pasture"],
      searchParams: Promise.resolve({ scope: "resource" })
    });

    expect(allScope.scopePreset).toBe("all");
    expect(allScope.persistedShell.snapshot.scope.label).toBe("Canopy Commons Seed");
    expect(allScope.session.navigation.activePath).toBe("/memory");

    expect(objectScope.scopePreset).toBe("resource");
    expect(objectScope.persistedShell.snapshot.scope.label).toBe("Object Scope: resource");
    expect(objectScope.session.navigation.activePath).toBe(
      "/objects/resource/resource.north-pasture"
    );
  });
});

async function modelFromPage(input: {
  readonly routeSegments: readonly string[];
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<CanopyWebModel> {
  const element = await CanopyPage(input);

  expect(isValidElement(element)).toBe(true);
  expect(element.type).toBe(CanopyDashboard);

  return (element.props as { readonly model: CanopyWebModel }).model;
}
