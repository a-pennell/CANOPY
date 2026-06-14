import { describe, expect, it } from "vitest";
import { getCanopyWebModel } from "./canopy-data.js";

const phase5WorkspaceIds = [
  "scope",
  "objects",
  "memory",
  "decisions",
  "resource-care",
  "claims",
  "imports",
  "federation"
];

const phase5RoutePaths = [
  "/scope",
  "/objects",
  "/memory",
  "/decisions",
  "/resource-care",
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
    const model = getCanopyWebModel({
      routePath: "/objects/resource/resource.north-pasture"
    });
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
    expect(model.selectedObjectRef).toMatchObject({
      type: "resource",
      id: "resource.north-pasture"
    });
    expect(objectWorkspace?.session.navigation.activePath).toBe(
      "/objects/resource/resource.north-pasture"
    );
    expect(objectPage?.objectRef).toEqual(model.selectedObjectRef);
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
      expect.arrayContaining(["scope", "objects", "memory", "decisions", "care", "federation"])
    );
    expect(model.commandPreviews.map((preview) => preview.status)).toEqual(
      expect.arrayContaining(["handled"])
    );
  });

  it("builds a mutation preview with an explicit cancel or confirm boundary", () => {
    const model = getCanopyWebModel({
      routePath: "/objects/resource/resource.north-pasture"
    });

    expect(model.mutationPreview).toMatchObject({
      commandLabel: "preview-link-object-context",
      proposedEvent: {
        type: "object.relationship.created",
        objectRef: model.selectedObjectRef,
        payload: {
          previewOnly: true
        }
      },
      outboxEffect: {
        destination: "workflow:projection-rebuild"
      },
      persistenceBoundary: "cancel keeps runtime unchanged; confirm is the explicit mutation boundary"
    });
    expect(model.mutationPreview.authorityCheck.authorityRefs.length).toBeGreaterThan(0);
    expect(model.mutationPreview.projectionImpact.projectionNames).toEqual(
      expect.arrayContaining(["object-page", "civic-memory"])
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

  it("does not expose folded source project names as primary navigation identities", () => {
    const model = getCanopyWebModel();
    const primaryNavigationText = [
      ...model.routeMap.flatMap((route) => [route.id, route.label, route.href]),
      ...model.workspaces.flatMap((workspace) => [
        workspace.id,
        workspace.title,
        workspace.session.navigation.activePath
      ]),
      ...model.commandPreviews.map((preview) => preview.command)
    ];

    expect(primaryNavigationText).not.toEqual(
      expect.arrayContaining(["CommonCredit", "ICOS", "Sensemaking", "Stewardship", "/stewardship", "stewardship"])
    );
    expect(model.routeMap.map((route) => route.href)).toEqual(
      expect.arrayContaining(["/resource-care"])
    );
  });
});
