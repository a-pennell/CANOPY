import type {
  CanopyShellMode,
  CanopyShellSession,
  PersistedCanopyShellCommandExecution,
  PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import {
  buildPersistedCanopyShellSession,
  buildPersistedCanopyShellSnapshot,
  executePersistedCanopyShellCommand
} from "@canopy/app-shell";
import type { CanopyShellScope } from "@canopy/app-shell";
import type { ObjectRef } from "@canopy/contracts-kernel";
import {
  firstReplayableGoldenFixtureEvents,
  goldenFixtureRefs
} from "@canopy/contracts-testing";
import {
  foldedSourceSampleExportBundles,
  type SampleExportBundle
} from "@canopy/database-import-plans";
import {
  createInMemoryCanonicalPersistence,
  type CanonicalPersistenceRuntime
} from "@canopy/database-runtime";
import {
  executeSampleExportBundleImports,
  type SampleExportBundleImportExecutionResult
} from "@canopy/workflows-import-execution";
import {
  buildCanopyOperationsReport,
  type CanopyOperationsReport
} from "@canopy/workflows-operations";
import {
  createInMemoryMaterializedProjectionStore,
  queryMaterializedProjections,
  rebuildAndPersistAllProjections,
  type MaterializedProjectionDocument
} from "@canopy/workflows-projection-rebuild";

export interface CanopyWebModel {
  readonly generatedAt: string;
  readonly routePath: string;
  readonly scopePreset: CanopyWebScopePreset;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly imports: readonly SampleExportBundleImportExecutionResult[];
  readonly objectRefs: readonly CanopyWebObjectRefRecord[];
  readonly persistedShell: PersistedCanopyShellSnapshotResult;
  readonly session: CanopyShellSession;
  readonly workspaces: readonly CanopyWebWorkspace[];
  readonly commandPreviews: readonly PersistedCanopyShellCommandExecution[];
  readonly operations: CanopyOperationsReport;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly bundles: readonly SampleExportBundle[];
  readonly routeMap: readonly CanopyWebRouteLink[];
  readonly scopeOptions: readonly CanopyWebScopeOption[];
  readonly relationshipGraph: CanopyWebRelationshipGraph;
  readonly pathway: readonly CanopyWebPathwayStep[];
}

export interface CanopyWebWorkspace {
  readonly id: string;
  readonly title: string;
  readonly intent: string;
  readonly session: CanopyShellSession;
}

export interface CanopyWebObjectRefRecord {
  readonly objectId: string;
  readonly objectType: ObjectRef["type"];
  readonly ref: ObjectRef;
}

export type CanopyWebScopePreset = "all" | "riverbend" | "resource";

export interface CanopyWebScopeOption {
  readonly id: CanopyWebScopePreset;
  readonly label: string;
  readonly href: string;
  readonly active: boolean;
}

export interface CanopyWebRouteLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly active: boolean;
}

export interface CanopyWebRelationshipGraph {
  readonly nodes: readonly {
    readonly id: string;
    readonly label: string;
    readonly type: string;
  }[];
  readonly edges: readonly {
    readonly from: string;
    readonly to: string;
    readonly label: string;
  }[];
}

export interface CanopyWebPathwayStep {
  readonly label: string;
  readonly ref: ObjectRef;
  readonly href: string;
  readonly detail: string;
}

export interface GetCanopyWebModelOptions {
  readonly routePath?: string;
  readonly scopePreset?: CanopyWebScopePreset;
}

const generatedAt = "2026-06-14T12:00:00.000Z";

export function getCanopyWebModel(options: GetCanopyWebModelOptions = {}): CanopyWebModel {
  const routePath = normalizeRoutePath(options.routePath);
  const scopePreset = options.scopePreset ?? "riverbend";
  const runtime = createInMemoryCanonicalPersistence({ now: () => generatedAt });
  const materializedProjectionStore = createInMemoryMaterializedProjectionStore();
  const imports = executeSampleExportBundleImports({
    bundles: foldedSourceSampleExportBundles,
    runtime,
    recordedAt: generatedAt,
    projectionRebuildOptions: {
      rebuiltAt: generatedAt,
      materializedProjections: materializedProjectionStore
    }
  });
  for (const event of firstReplayableGoldenFixtureEvents) {
    runtime.appendEvent(event, { recordedAt: generatedAt });
  }
  rebuildAndPersistAllProjections(runtime, {
    rebuiltAt: generatedAt,
    materializedProjections: materializedProjectionStore
  });
  const materializedDocuments = queryMaterializedProjections(materializedProjectionStore).items;
  const objectRefs = runtime.queryObjectRefs().items.map((record) => ({
    objectId: record.objectId,
    objectType: record.objectType,
    ref: record.ref
  }));
  const routeSelectedObjectRef = selectedObjectRefForRoute(objectRefs, routePath);
  const selectedObjectRef =
    routeSelectedObjectRef ??
    goldenFixtureRefs.resourceNorthPasture ??
    findRef(objectRefs, "resource") ??
    imports[0]?.execution.mappingRecords[0]?.canonicalRef ??
    imports[0]?.execution.eventRecords[0]?.objectRef;
  const decisionRef = goldenFixtureRefs.decisionUseRight ?? findRef(objectRefs, "decision");
  const resourceRef = goldenFixtureRefs.resourceNorthPasture ?? findRef(objectRefs, "resource");
  const claimRef = goldenFixtureRefs.claimFlowNeed ?? findRef(objectRefs, "claim");
  const useRightRef = goldenFixtureRefs.useRightNorthPasture;
  const scope = scopeForPreset(scopePreset, selectedObjectRef);
  const persistedShell = buildPersistedCanopyShellSnapshot({
    runtime,
    scope,
    activeMode: activeModeForRoutePath(routePath),
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(selectedObjectRef),
    materializedProjections: materializedDocuments,
    ...optionalImportDryRun(imports[0]?.dryRun),
    persistProjectionState: false
  });
  const session = buildWorkspaceSession({
    runtime,
    scope,
    route: routePath,
    activeMode: activeModeForRoutePath(routePath),
    selectedObjectRef,
    materializedDocuments,
    importDryRun: imports[0]?.dryRun
  });
  const workspaces = [
    workspace({
      id: "scope",
      title: "Scope Frame",
      intent: "Place, modes, attention, and route grammar stay visible before any capability work.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/scope",
        activeMode: "scope",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "objects",
      title: "Universal Object Page",
      intent: "A selected Riverbend resource hydrates through object-page projection rather than a legacy page.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: objectRoute(resourceRef ?? selectedObjectRef),
        activeMode: "objects",
        selectedObjectRef: resourceRef ?? selectedObjectRef,
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "memory",
      title: "Civic Memory",
      intent: "Append-only events are readable as shared memory, with visibility and data state intact.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/memory",
        activeMode: "memory",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "decisions",
      title: "Decision Packet",
      intent: "Governance is shown as authority, claims, evidence, outcomes, and event trail.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/decisions",
        activeMode: "decisions",
        selectedObjectRef: decisionRef,
        materializedDocuments,
        importDryRun: imports[1]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "stewardship",
      title: "Stewardship Surface",
      intent: "Resources, use rights, ecological context, and authority are one object-centered surface.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/stewardship",
        activeMode: "stewardship",
        selectedObjectRef: resourceRef,
        materializedDocuments,
        importDryRun: imports[3]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "claims",
      title: "Claims & Evidence",
      intent: "Evidence supports claims without becoming authority, and AI/model output remains legible.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/claims-evidence",
        activeMode: "objects",
        selectedObjectRef: claimRef,
        materializedDocuments,
        importDryRun: imports[2]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "imports",
      title: "Fold-In Review",
      intent: "Source records are reviewed through canonical mappings, not old product navigation.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/imports",
        activeMode: "objects",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "federation",
      title: "Federation & Export",
      intent: "Export readiness shows event scope, mappings, stewardship agreements, and redaction posture.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/federation",
        activeMode: "federation",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    })
  ];
  const commandPreviews = ["scope", "objects", "memory", "decisions", "stewardship", "federation"].map(
    (command) =>
      executePersistedCanopyShellCommand({
        runtime,
        scope,
        command,
        rebuiltAt: generatedAt,
        ...optionalSelectedObjectRef(selectedObjectRef),
        materializedProjections: materializedDocuments,
        ...optionalImportDryRun(imports[0]?.dryRun),
        persistProjectionState: false
      })
  );
  const operations = buildCanopyOperationsReport({
    runtime,
    generatedAt,
    shell: persistedShell
  });
  const routeMap = buildRouteMap(routePath, selectedObjectRef);
  const scopeOptions = buildScopeOptions(routePath, scopePreset);
  const relationshipGraph = buildRelationshipGraph(session.snapshot.surfaces.civicMemoryStream.timeline);
  const pathway = buildRiverbendPathway({
    claimRef,
    decisionRef,
    resourceRef,
    useRightRef
  });

  return {
    generatedAt,
    routePath,
    scopePreset,
    runtime,
    imports,
    objectRefs,
    persistedShell,
    session,
    workspaces,
    commandPreviews,
    operations,
    materializedDocuments,
    bundles: foldedSourceSampleExportBundles,
    routeMap,
    scopeOptions,
    relationshipGraph,
    pathway
  };
}

function optionalSelectedObjectRef<TRef>(
  selectedObjectRef: TRef | undefined
): { readonly selectedObjectRef?: TRef } {
  return selectedObjectRef === undefined ? {} : { selectedObjectRef };
}

function buildWorkspaceSession(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly scope: CanopyShellScope;
  readonly route: string;
  readonly activeMode: CanopyShellMode;
  readonly selectedObjectRef?: ObjectRef | undefined;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly importDryRun?: SampleExportBundleImportExecutionResult["dryRun"] | undefined;
}): CanopyShellSession {
  return buildPersistedCanopyShellSession({
    runtime: input.runtime,
    scope: input.scope,
    route: input.route,
    activeMode: input.activeMode,
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(input.selectedObjectRef),
    materializedProjections: input.materializedDocuments,
    ...optionalImportDryRun(input.importDryRun),
    persistProjectionState: false
  }).session;
}

function workspace(input: CanopyWebWorkspace): CanopyWebWorkspace {
  return input;
}

function findRef(
  objectRefs: readonly CanopyWebObjectRefRecord[],
  type: ObjectRef["type"]
): ObjectRef | undefined {
  return objectRefs.find((record) => record.objectType === type)?.ref;
}

function optionalImportDryRun(
  importDryRun: SampleExportBundleImportExecutionResult["dryRun"] | undefined
): { readonly importDryRun?: SampleExportBundleImportExecutionResult["dryRun"] } {
  return importDryRun === undefined ? {} : { importDryRun };
}

function normalizeRoutePath(routePath: string | undefined): string {
  if (routePath === undefined || routePath === "/" || routePath.length === 0) {
    return "/scope";
  }

  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

function activeModeForRoutePath(routePath: string): CanopyShellMode {
  if (routePath.startsWith("/memory")) return "memory";
  if (routePath.startsWith("/decisions")) return "decisions";
  if (routePath.startsWith("/stewardship")) return "stewardship";
  if (routePath.startsWith("/federation")) return "federation";
  if (routePath.startsWith("/objects")) return "objects";
  return "scope";
}

function selectedObjectRefForRoute(
  objectRefs: readonly CanopyWebObjectRefRecord[],
  routePath: string
): ObjectRef | undefined {
  const match = /^\/objects\/([^/]+)\/(.+)$/.exec(routePath);
  const objectType = match?.[1];
  const objectId = match?.[2];

  if (objectType === undefined || objectId === undefined) {
    return undefined;
  }

  return objectRefs.find(
    (record) => record.objectType === objectType && record.objectId === decodeURIComponent(objectId)
  )?.ref;
}

function scopeForPreset(
  preset: CanopyWebScopePreset,
  selectedObjectRef: ObjectRef | undefined
): CanopyShellScope {
  if (preset === "resource" && selectedObjectRef !== undefined) {
    return {
      label: `Object Scope: ${selectedObjectRef.type}`,
      scope: { objectRef: selectedObjectRef }
    };
  }

  if (preset === "all") {
    return {
      label: "Canopy Commons Seed",
      scope: {}
    };
  }

  return {
    label: "Riverbend Food Commons",
    scope: {}
  };
}

function objectRoute(ref: ObjectRef | undefined): string {
  return ref === undefined ? "/objects" : `/objects/${ref.type}/${encodeURIComponent(ref.id)}`;
}

function buildRouteMap(
  routePath: string,
  selectedObjectRef: ObjectRef | undefined
): readonly CanopyWebRouteLink[] {
  const routes = [
    { id: "scope", label: "Home", href: "/scope" },
    { id: "objects", label: "Object Page", href: objectRoute(selectedObjectRef) },
    { id: "memory", label: "Civic Memory", href: "/memory" },
    { id: "decisions", label: "Decision Packet", href: "/decisions" },
    { id: "stewardship", label: "Stewardship", href: "/stewardship" },
    { id: "claims", label: "Claims & Evidence", href: "/claims-evidence" },
    { id: "imports", label: "Fold-In Review", href: "/imports" },
    { id: "federation", label: "Federation & Export", href: "/federation" }
  ];

  return routes.map((route) => ({
    ...route,
    active:
      route.href === routePath ||
      (route.href !== "/scope" && routePath.startsWith(route.href))
  }));
}

function buildScopeOptions(
  routePath: string,
  activeScope: CanopyWebScopePreset
): readonly CanopyWebScopeOption[] {
  return [
    { id: "riverbend", label: "Riverbend", href: scopeHref(routePath, "riverbend"), active: activeScope === "riverbend" },
    { id: "all", label: "All Seed", href: scopeHref(routePath, "all"), active: activeScope === "all" },
    { id: "resource", label: "Object", href: scopeHref(routePath, "resource"), active: activeScope === "resource" }
  ];
}

function scopeHref(routePath: string, scope: CanopyWebScopePreset): string {
  return `${routePath}?scope=${scope}`;
}

function buildRelationshipGraph(
  timeline: CanopyShellSession["snapshot"]["surfaces"]["civicMemoryStream"]["timeline"]
): CanopyWebRelationshipGraph {
  const nodeMap = new Map<string, CanopyWebRelationshipGraph["nodes"][number]>();
  const edges: CanopyWebRelationshipGraph["edges"] = timeline.flatMap((entry) => {
    const from = refKey(entry.objectRef);
    nodeMap.set(from, {
      id: from,
      label: displayRef(entry.objectRef),
      type: entry.objectRef.type
    });

    return [...entry.relatedRefs, ...entry.authorityRefs].slice(0, 4).map((ref) => {
      const to = refKey(ref);
      nodeMap.set(to, {
        id: to,
        label: displayRef(ref),
        type: ref.type
      });

      return {
        from,
        to,
        label: entry.type
      };
    });
  });

  return {
    nodes: [...nodeMap.values()].slice(0, 18),
    edges: edges.slice(0, 24)
  };
}

function buildRiverbendPathway(input: {
  readonly claimRef: ObjectRef | undefined;
  readonly decisionRef: ObjectRef | undefined;
  readonly resourceRef: ObjectRef | undefined;
  readonly useRightRef: ObjectRef | undefined;
}): readonly CanopyWebPathwayStep[] {
  return [
    pathwayStep("Observe", goldenFixtureRefs.livingSystemRiverbend, "/memory", "Riverbend Creek condition enters civic memory."),
    pathwayStep("Claim", input.claimRef, "/claims-evidence", "Flow or food need is framed as a contestable claim."),
    pathwayStep("Resource", input.resourceRef, objectRoute(input.resourceRef), "A commons resource becomes the object page anchor."),
    pathwayStep("Decide", input.decisionRef, "/decisions", "Authority, evidence, and outcome gather into a decision packet."),
    pathwayStep("Steward", input.useRightRef, "/stewardship", "Use right links resource, holder, conditions, and review path."),
    pathwayStep("Federate", goldenFixtureRefs.exportEnvelope, "/federation", "Export preview carries mappings, data rules, and redaction posture.")
  ].filter((step): step is CanopyWebPathwayStep => step !== undefined);
}

function pathwayStep(
  label: string,
  ref: ObjectRef | undefined,
  href: string,
  detail: string
): CanopyWebPathwayStep | undefined {
  return ref === undefined ? undefined : { label, ref, href, detail };
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function displayRef(ref: ObjectRef): string {
  return `${ref.type}:${ref.id.split(".").at(-1) ?? ref.id}`;
}
