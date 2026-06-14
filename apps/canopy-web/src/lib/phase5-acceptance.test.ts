import { describe, expect, it } from "vitest";
import { getCanopyWebModel } from "./canopy-data.js";

const phase5WorkspaceIds = [
  "scope",
  "objects",
  "memory",
  "decisions",
  "stewardship",
  "claims",
  "imports",
  "federation"
];

const phase5RoutePaths = [
  "/scope",
  "/objects",
  "/memory",
  "/decisions",
  "/stewardship",
  "/claims-evidence",
  "/imports",
  "/federation"
];

describe("phase 5 web shell acceptance", () => {
  it("exposes the primary Phase 5 workspaces and routes", () => {
    const model = getCanopyWebModel();

    expect(model.workspaces.map((workspace) => workspace.id)).toEqual(
      expect.arrayContaining(phase5WorkspaceIds)
    );

    for (const workspace of model.workspaces) {
      expect(workspace.session.navigation.routes.map((route) => route.path)).toEqual(
        expect.arrayContaining(phase5RoutePaths)
      );
    }
  });

  it("hydrates the object page and civic memory surfaces", () => {
    const model = getCanopyWebModel();
    const objectWorkspace = model.workspaces.find((workspace) => workspace.id === "objects");
    const objectPage = objectWorkspace?.session.snapshot.surfaces.objectPage;
    const civicMemory = model.session.snapshot.surfaces.civicMemoryStream;

    expect(objectPage).toMatchObject({
      kind: "object-page",
      projectionRead: {
        kind: "materialized",
        projectionName: "object-page",
        freshness: "current"
      }
    });
    expect(objectPage?.timeline.length).toBeGreaterThan(0);

    expect(civicMemory).toMatchObject({
      kind: "civic-memory-stream",
      projectionRead: {
        kind: "materialized",
        projectionName: "civic-memory",
        freshness: "current"
      }
    });
    expect(civicMemory.timeline.length).toBeGreaterThan(0);
  });

  it("provides attention and command previews for the shell", () => {
    const model = getCanopyWebModel();

    expect(model.session.snapshot.attention.length).toBeGreaterThan(0);
    expect(model.commandPreviews.length).toBeGreaterThan(0);
    expect(model.commandPreviews.map((preview) => preview.command)).toEqual(
      expect.arrayContaining(["scope", "objects", "memory", "decisions", "stewardship", "federation"])
    );
    expect(model.commandPreviews.map((preview) => preview.status)).toEqual(
      expect.arrayContaining(["handled"])
    );
  });

  it("surfaces federation and data stewardship fields", () => {
    const model = getCanopyWebModel();
    const federationWorkspace = model.workspaces.find(
      (workspace) => workspace.id === "federation"
    );
    const federationState =
      federationWorkspace?.session.snapshot.surfaces.federationExportState;

    expect(federationState).toMatchObject({
      kind: "federation-export-state",
      projectionRead: {
        kind: "materialized",
        projectionName: "federation-export",
        freshness: "current"
      }
    });
    expect(federationState?.includedEventIds.length).toBeGreaterThan(0);
    expect(federationState?.includedObjectRefs.length).toBeGreaterThan(0);
    expect(federationState?.authorityRefs.length).toBeGreaterThan(0);
    expect(federationState?.localMappingIds).toBeDefined();
    expect(federationState?.dataStewardshipAgreementRefs).toBeDefined();
    expect(federationState?.redactionSummary).toBeDefined();
    expect(federationState?.readinessWarnings).toBeDefined();
  });

  it("does not use legacy project names as standalone primary workspace titles", () => {
    const model = getCanopyWebModel();
    const legacyProjectNames = ["CommonCredit", "ICOS", "Sensemaking", "Stewardship"];
    const workspaceTitles = model.workspaces.map((workspace) => workspace.title);

    expect(workspaceTitles).not.toEqual(expect.arrayContaining(legacyProjectNames));
  });
});
