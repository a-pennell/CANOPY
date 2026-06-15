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
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import {
  firstReplayableGoldenFixtureEvents,
  goldenFixtureRefs
} from "@canopy/contracts-testing";
import {
  foldedSourceSampleExportBundles,
  type SampleExportBundle
} from "@canopy/database-import-plans";
import {
  type CanonicalPersistenceRuntime
} from "@canopy/database-runtime";
import { buildRiverbendPersistedRuntimeScenario } from "@canopy/evaluation-vertical-slice";
import {
  executeSampleExportBundleImports,
  type SampleExportBundleImportExecutionResult
} from "@canopy/workflows-import-execution";
import {
  buildCanopyOperationsReport,
  type CanopyOperationsReport
} from "@canopy/workflows-operations";
import {
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
  readonly selectedObjectRef: ObjectRef | undefined;
  readonly persistedShell: PersistedCanopyShellSnapshotResult;
  readonly session: CanopyShellSession;
  readonly workspaces: readonly CanopyWebWorkspace[];
  readonly commandPreviews: readonly PersistedCanopyShellCommandExecution[];
  readonly mutationPreview: CanopyWebMutationPreview;
  readonly operations: CanopyOperationsReport;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly bundles: readonly SampleExportBundle[];
  readonly routeMap: readonly CanopyWebRouteLink[];
  readonly scopeOptions: readonly CanopyWebScopeOption[];
  readonly relationshipGraph: CanopyWebRelationshipGraph;
  readonly pathway: readonly CanopyWebPathwayStep[];
  readonly attentionQueues: readonly CanopyWebAttentionQueue[];
  readonly objectPageSections: readonly CanopyWebObjectPageSection[];
  readonly permissionExplanation: CanopyWebPermissionExplanation;
  readonly dataStewardshipReview: CanopyWebDataStewardshipReview;
  readonly federationReview: CanopyWebFederationReview | undefined;
  readonly adaptiveBranchReview: CanopyWebAdaptiveBranchReview;
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

export interface CanopyWebMutationPreview {
  readonly commandLabel: string;
  readonly title: string;
  readonly summary: string;
  readonly proposedEvent: CanopyEvent;
  readonly authorityCheck: {
    readonly status: "pass" | "review";
    readonly summary: string;
    readonly authorityRefs: readonly ObjectRef[];
  };
  readonly outboxEffect: {
    readonly destination: string;
    readonly summary: string;
    readonly dedupeKey: string;
  };
  readonly projectionImpact: {
    readonly projectionNames: readonly string[];
    readonly summary: string;
  };
  readonly persistenceBoundary: string;
}

export interface CanopyWebAttentionQueue {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly count: number;
  readonly eventIds: readonly string[];
  readonly nextAction: string;
  readonly route: string;
  readonly tone: "toneGood" | "toneWarn" | "toneBad" | "toneInfo";
}

export interface CanopyWebObjectPageSection {
  readonly id: string;
  readonly title: string;
  readonly status: "available" | "empty" | "review";
  readonly summary: string;
  readonly primaryRef?: ObjectRef | undefined;
  readonly route: string;
}

export interface CanopyWebPermissionExplanation {
  readonly commandLabel: string;
  readonly authoritySource: string;
  readonly denialReason: string | undefined;
  readonly appealPath: string;
  readonly visibilityEffect: string;
  readonly civicMemoryEvent: string;
  readonly claimsEvidenceTouched: number;
  readonly federationImpact: string;
}

export interface CanopyWebDataStewardshipReview {
  readonly visibilityStates: readonly CanopyWebReviewRow[];
  readonly dataStates: readonly CanopyWebReviewRow[];
  readonly redactionSummary: string;
  readonly retentionPosture: string;
  readonly consentPosture: string;
  readonly restrictedEvidence: string;
  readonly exportRestriction: string;
}

export interface CanopyWebFederationReview {
  readonly envelopeId: string;
  readonly status: string;
  readonly contentHash: string;
  readonly localMappingCount: number;
  readonly dataStewardshipAgreementCount: number;
  readonly redactionSummary: string;
  readonly readinessWarnings: readonly string[];
  readonly eventTrail: readonly string[];
}

export interface CanopyWebAdaptiveBranchReview {
  readonly decisionRef: ObjectRef;
  readonly preservedObjectionRefs: readonly ObjectRef[];
  readonly redactionSummary: string;
  readonly adaptivePolicyVersion: string;
  readonly adaptivePolicyVersionRef: ObjectRef;
}

export interface CanopyWebReviewRow {
  readonly label: string;
  readonly value: number;
}

export interface GetCanopyWebModelOptions {
  readonly routePath?: string;
  readonly scopePreset?: CanopyWebScopePreset;
}

const generatedAt = "2026-06-14T12:00:00.000Z";

export function getCanopyWebModel(options: GetCanopyWebModelOptions = {}): CanopyWebModel {
  const routePath = normalizeRoutePath(options.routePath);
  const scopePreset = options.scopePreset ?? "riverbend";
  const phase7Scenario = buildRiverbendPersistedRuntimeScenario();
  const phase7Slice = phase7Scenario.slice;
  const runtime = phase7Scenario.runtime;
  const materializedProjectionStore = phase7Scenario.materializedProjectionStore;
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
    phase7Slice.refs.resourceRef ??
    goldenFixtureRefs.resourceNorthPasture ??
    findRef(objectRefs, "resource") ??
    imports[0]?.execution.mappingRecords[0]?.canonicalRef ??
    imports[0]?.execution.eventRecords[0]?.objectRef;
  const decisionRef = phase7Slice.refs.decisionRef ?? goldenFixtureRefs.decisionUseRight ?? findRef(objectRefs, "decision");
  const resourceRef = phase7Slice.refs.resourceRef ?? goldenFixtureRefs.resourceNorthPasture ?? findRef(objectRefs, "resource");
  const claimRef = phase7Slice.refs.claimRef ?? goldenFixtureRefs.claimFlowNeed ?? findRef(objectRefs, "claim");
  const useRightRef = phase7Slice.refs.useRightRef ?? goldenFixtureRefs.useRightNorthPasture;
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
      intent: "The route-selected object hydrates through object-page projection rather than shared shell fallback state.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: objectRoute(selectedObjectRef),
        activeMode: "objects",
        selectedObjectRef,
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
      id: "resource-care",
      title: "Resource Care",
      intent: "Resources, use rights, ecological context, and authority are one object-centered surface.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/resource-care",
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
  const commandPreviews = ["scope", "objects", "memory", "decisions", "care", "federation"].map(
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
  const mutationPreview = buildMutationPreview({
    selectedObjectRef,
    fallbackAuthorityRef: decisionRef,
    existingEventCount: operations.counts.events
  });
  const routeMap = buildRouteMap(routePath, selectedObjectRef);
  const scopeOptions = buildScopeOptions(routePath, scopePreset);
  const relationshipGraph = buildRelationshipGraph(session.snapshot.surfaces.civicMemoryStream.timeline);
  const pathway = buildRiverbendPathway({
    thresholdRef: phase7Slice.refs.thresholdRef,
    claimRef,
    decisionRef,
    resourceRef,
    useRightRef,
    outcomeRef: phase7Slice.refs.outcomeRef,
    exportRef: phase7Slice.refs.exportRef
  });
  const attentionQueues = buildAttentionQueues(persistedShell.snapshot.attention);
  const objectPageSections = buildObjectPageSections(session);
  const permissionExplanation = buildPermissionExplanation({
    mutationPreview,
    claimRef,
    federationState: session.snapshot.surfaces.federationExportState
  });
  const dataStewardshipReview = buildDataStewardshipReview(session);
  const federationReview = buildFederationReview(session);
  const adaptiveBranchReview = buildAdaptiveBranchReview({
    events: phase7Slice.events,
    refs: phase7Slice.refs
  });

  return {
    generatedAt,
    routePath,
    scopePreset,
    runtime,
    imports,
    objectRefs,
    selectedObjectRef,
    persistedShell,
    session,
    workspaces,
    commandPreviews,
    mutationPreview,
    operations,
    materializedDocuments,
    bundles: foldedSourceSampleExportBundles,
    routeMap,
    scopeOptions,
    relationshipGraph,
    pathway,
    attentionQueues,
    objectPageSections,
    permissionExplanation,
    dataStewardshipReview,
    federationReview,
    adaptiveBranchReview
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
  if (routePath.startsWith("/resource-care") || routePath.startsWith("/stewardship")) return "stewardship";
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
    { id: "resource-care", label: "Resource Care", href: "/resource-care" },
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
  readonly thresholdRef: ObjectRef | undefined;
  readonly claimRef: ObjectRef | undefined;
  readonly decisionRef: ObjectRef | undefined;
  readonly resourceRef: ObjectRef | undefined;
  readonly useRightRef: ObjectRef | undefined;
  readonly outcomeRef: ObjectRef | undefined;
  readonly exportRef: ObjectRef | undefined;
}): readonly CanopyWebPathwayStep[] {
  return [
    pathwayStep("Observe", input.thresholdRef, "/memory", "Mill Creek threshold breach enters civic memory."),
    pathwayStep("Understand", input.claimRef, "/claims-evidence", "School food need is framed as a contestable claim with evidence."),
    pathwayStep("Coordinate", input.resourceRef, objectRoute(input.resourceRef), "Green Acre surplus becomes the resource anchor."),
    pathwayStep("Deliberate", input.decisionRef, "/decisions", "Guardian review, evidence, and outcome gather into a decision packet."),
    pathwayStep("Act", input.useRightRef, "/resource-care", "Use right links crop share, holder, conditions, and review path."),
    pathwayStep("Learn", input.outcomeRef, objectRoute(input.outcomeRef), "Outcome and retrospective close the feedback loop."),
    pathwayStep("Federate", input.exportRef, "/federation", "Export preview carries mappings, data rules, and redaction posture.")
  ].filter((step): step is CanopyWebPathwayStep => step !== undefined);
}

function buildMutationPreview(input: {
  readonly selectedObjectRef: ObjectRef | undefined;
  readonly fallbackAuthorityRef: ObjectRef | undefined;
  readonly existingEventCount: number;
}): CanopyWebMutationPreview {
  const objectRef = input.selectedObjectRef ?? goldenFixtureRefs.resourceNorthPasture;
  const authorityRefs = [input.fallbackAuthorityRef].filter(
    (ref): ref is ObjectRef => ref !== undefined
  );
  const event: CanopyEvent = {
    id: `event.preview.${objectRef.type}.${objectRef.id}`,
    type: "object.relationship.created",
    occurredAt: generatedAt,
    systemActor: "ai_assistant",
    objectRef,
    relatedRefs: authorityRefs,
    authorityRefs,
    sourceCapability: "civic-memory",
    payload: {
      command: "preview-link-object-context",
      targetObjectId: objectRef.id,
      relation: "operator_review_context",
      previewOnly: true
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "unverified",
    provenance: {
      kind: "system_generated",
      generatedAt,
      notes: "Generated by the web command preview; not persisted until confirm."
    }
  };
  const authorityStatus = authorityRefs.length > 0 ? "pass" : "review";

  return {
    commandLabel: "preview-link-object-context",
    title: `Preview mutation for ${displayRef(objectRef)}`,
    summary: "Creates no durable event until the operator confirms the boundary.",
    proposedEvent: event,
    authorityCheck: {
      status: authorityStatus,
      summary:
        authorityStatus === "pass"
          ? `${authorityRefs.length} authority ref available`
          : "authority review required",
      authorityRefs
    },
    outboxEffect: {
      destination: "workflow:projection-rebuild",
      summary: "Would enqueue one projection rebuild record after confirm.",
      dedupeKey: `event:${event.id}:projection-rebuild`
    },
    projectionImpact: {
      projectionNames: ["object-page", "civic-memory", "authority"],
      summary: `Would append event ${input.existingEventCount + 1} and refresh object, memory, and authority reads.`
    },
    persistenceBoundary: "cancel keeps runtime unchanged; confirm is the explicit mutation boundary"
  };
}

function buildAttentionQueues(
  attention: CanopyShellSession["snapshot"]["attention"]
): readonly CanopyWebAttentionQueue[] {
  return attention.map((item) => {
    const metadata = attentionQueueMetadata(item.kind);

    return {
      id: item.id,
      label: metadata.label,
      kind: item.kind,
      count: item.eventIds.length,
      eventIds: item.eventIds,
      nextAction: metadata.nextAction,
      route: metadata.route,
      tone: metadata.tone
    };
  });
}

function attentionQueueMetadata(kind: string): Omit<CanopyWebAttentionQueue, "id" | "kind" | "count" | "eventIds"> {
  if (kind === "missing-authority") {
    return {
      label: "Authority review",
      nextAction: "Trace mandate, guardian, or policy source before action.",
      route: "/decisions",
      tone: "toneWarn"
    };
  }

  if (kind === "redaction") {
    return {
      label: "Data stewardship",
      nextAction: "Inspect redaction continuity and retained event stubs.",
      route: "/memory",
      tone: "toneBad"
    };
  }

  if (kind === "supersession") {
    return {
      label: "Learning continuity",
      nextAction: "Confirm replacement record and policy review trace.",
      route: "/memory",
      tone: "toneInfo"
    };
  }

  if (kind === "contested") {
    return {
      label: "Claims review",
      nextAction: "Open counterclaim, evidence, and reviewer path.",
      route: "/claims-evidence",
      tone: "toneWarn"
    };
  }

  if (kind === "machine-output") {
    return {
      label: "Human review",
      nextAction: "Keep model output non-authoritative until accepted.",
      route: "/claims-evidence",
      tone: "toneWarn"
    };
  }

  if (kind === "federation-readiness") {
    return {
      label: "Federation readiness",
      nextAction: "Review envelope, mappings, export rule, and redaction posture.",
      route: "/federation",
      tone: "toneInfo"
    };
  }

  return {
    label: "Operator review",
    nextAction: "Open the relevant workspace and resolve the queued event.",
    route: "/scope",
    tone: "toneInfo"
  };
}

function buildObjectPageSections(session: CanopyShellSession): readonly CanopyWebObjectPageSection[] {
  const surfaces = session.snapshot.surfaces;
  const objectPage = surfaces.objectPage;
  const packet = surfaces.decisionPacket;
  const stewardship = surfaces.resourceStewardship;
  const claimEvidence = surfaces.claimEvidence;
  const federation = surfaces.federationExportState;

  return [
    objectSection({
      id: "current-state",
      title: "Current State",
      status: objectPage === undefined ? "empty" : "available",
      summary:
        objectPage === undefined
          ? "No selected object is hydrated for this route."
          : `${objectPage.projectionRead.projectionName} is ${objectPage.projectionRead.freshness}.`,
      primaryRef: objectPage?.objectRef,
      route: objectRoute(objectPage?.objectRef)
    }),
    objectSection({
      id: "relationships",
      title: "Relationships",
      status: objectPage !== undefined && objectPage.relatedRefs.length > 0 ? "available" : "review",
      summary:
        objectPage === undefined
          ? "No relationship graph is available."
          : `${objectPage.relatedRefs.length} related refs and ${objectPage.authorityRefs.length} authority refs.`,
      primaryRef: objectPage?.relatedRefs[0],
      route: objectRoute(objectPage?.relatedRefs[0] ?? objectPage?.objectRef)
    }),
    objectSection({
      id: "claims-evidence",
      title: "Claims & Evidence",
      status: claimEvidence.counts.claims > 0 ? "available" : "empty",
      summary: `${claimEvidence.counts.claims} claims, ${claimEvidence.counts.evidence} evidence records, ${claimEvidence.counts.aiNonAuthorityIndicators} model outputs.`,
      primaryRef: claimEvidence.claims[0]?.claimRef,
      route: "/claims-evidence"
    }),
    objectSection({
      id: "governance-authority",
      title: "Governance & Authority",
      status: (packet?.authorityRefs.length ?? objectPage?.authorityRefs.length ?? 0) > 0 ? "available" : "review",
      summary:
        packet === undefined
          ? `${objectPage?.authorityRefs.length ?? 0} authority refs attached to the object.`
          : `${packet.authorityRefs.length} authority refs, outcome ${packet.outcome ?? "pending"}.`,
      primaryRef: packet?.authorityRefs[0] ?? objectPage?.authorityRefs[0],
      route: "/decisions"
    }),
    objectSection({
      id: "commitments-obligations",
      title: "Commitments & Obligations",
      status: stewardship !== undefined && stewardship.useRights.length > 0 ? "available" : "empty",
      summary:
        stewardship === undefined
          ? "No resource use-right surface is applicable to this object."
          : `${stewardship.useRights.length} use rights and ${stewardship.authorityRefs.length} authority refs.`,
      primaryRef: stewardship?.useRights[0]?.useRightRef,
      route: "/resource-care"
    }),
    objectSection({
      id: "ecological-context",
      title: "Ecological Context",
      status: stewardship !== undefined && stewardship.ecologicalContextIds.length > 0 ? "available" : "empty",
      summary:
        stewardship === undefined || stewardship.ecologicalContextIds.length === 0
          ? "No material living-system impact declared for this object."
          : `${stewardship.ecologicalContextIds.length} ecological context hooks.`,
      primaryRef: stewardship?.resourceRef,
      route: "/resource-care"
    }),
    objectSection({
      id: "activity-memory",
      title: "Activity & Civic Memory",
      status: objectPage !== undefined && objectPage.timeline.length > 0 ? "available" : "empty",
      summary: `${objectPage?.timeline.length ?? 0} object events and ${surfaces.civicMemoryStream.timeline.length} scoped memory events.`,
      primaryRef: objectPage?.objectRef,
      route: "/memory"
    }),
    objectSection({
      id: "outcomes-learning",
      title: "Outcomes & Learning",
      status: (packet?.stewardshipOutcomes.length ?? 0) > 0 ? "available" : "review",
      summary:
        packet === undefined
          ? "No decision packet is selected for learning outcomes."
          : `${packet.stewardshipOutcomes.length} stewardship outcomes and ${packet.unresolvedObjectionRefs.length} unresolved objections.`,
      primaryRef: packet?.decisionRef,
      route: "/decisions"
    }),
    objectSection({
      id: "data-stewardship",
      title: "Data Stewardship & Permissions",
      status: federation?.dataStewardshipAgreementRefs.length === 0 ? "review" : "available",
      summary: `${federation?.dataStewardshipAgreementRefs.length ?? 0} agreements and ${federation?.redactionSummary?.redactionCount ?? 0} redactions.`,
      primaryRef: federation?.dataStewardshipAgreementRefs[0],
      route: "/federation"
    }),
    objectSection({
      id: "federation-export",
      title: "Federation & Export",
      status: federation?.status === "ready" ? "available" : "review",
      summary:
        federation === undefined
          ? "No federation export state is available."
          : `${federation.status} envelope with ${federation.includedEventIds.length} events and ${federation.readinessWarnings.length} warnings.`,
      primaryRef: federation?.includedObjectRefs[0],
      route: "/federation"
    })
  ];
}

function objectSection(section: CanopyWebObjectPageSection): CanopyWebObjectPageSection {
  return section;
}

function buildPermissionExplanation(input: {
  readonly mutationPreview: CanopyWebMutationPreview;
  readonly claimRef: ObjectRef | undefined;
  readonly federationState: CanopyShellSession["snapshot"]["surfaces"]["federationExportState"];
}): CanopyWebPermissionExplanation {
  const event = input.mutationPreview.proposedEvent;
  const authorityCount = input.mutationPreview.authorityCheck.authorityRefs.length;
  const readinessWarnings = input.federationState?.readinessWarnings.length ?? 0;

  return {
    commandLabel: input.mutationPreview.commandLabel,
    authoritySource:
      authorityCount === 0
        ? "No authority ref is attached yet."
        : `${authorityCount} authority ref traces the command boundary.`,
    denialReason:
      input.mutationPreview.authorityCheck.status === "review"
        ? "Command requires mandate, guardian, policy, or role review before confirm."
        : undefined,
    appealPath: "Open governance review if authority is denied or contested.",
    visibilityEffect: `${event.visibility ?? "unspecified"} visibility, ${event.dataState ?? "unspecified"} data state`,
    civicMemoryEvent: event.type,
    claimsEvidenceTouched: input.claimRef === undefined ? 0 : 1,
    federationImpact:
      readinessWarnings === 0
        ? "No export warning is introduced by the preview."
        : `${readinessWarnings} export readiness warnings remain visible.`
  };
}

function buildDataStewardshipReview(session: CanopyShellSession): CanopyWebDataStewardshipReview {
  const civicMemory = session.snapshot.surfaces.civicMemoryStream;
  const federation = session.snapshot.surfaces.federationExportState;

  return {
    visibilityStates: reviewRows(civicMemory.timeline.map((entry) => entry.visibility ?? "unspecified")),
    dataStates: reviewRows(civicMemory.timeline.map((entry) => entry.dataState ?? "unspecified")),
    redactionSummary: `${federation?.redactionSummary?.redactionCount ?? redactionEventCount(civicMemory.timeline)} redaction records, ${redactedEventCount(civicMemory.timeline)} redacted originals`,
    retentionPosture: "Retention follows event envelope policy; destructive deletion is not a Phase 5 path.",
    consentPosture: `${federation?.dataStewardshipAgreementRefs.length ?? 0} data stewardship agreement refs govern export posture.`,
    restrictedEvidence:
      civicMemory.timeline.some((entry) => entry.visibility === "restricted" || entry.visibility === "private")
        ? "Restricted evidence is present and must stay behind visibility checks."
        : "No restricted evidence is visible in the current scope.",
    exportRestriction:
      federation === undefined
        ? "No export envelope is visible."
        : `${federation.status} export, ${federation.readinessWarnings.length} readiness warnings.`
  };
}

function buildFederationReview(
  session: CanopyShellSession
): CanopyWebFederationReview | undefined {
  const state = session.snapshot.surfaces.federationExportState;

  if (state === undefined) {
    return undefined;
  }

  return {
    envelopeId: state.envelopeId,
    status: state.status,
    contentHash: state.contentHash,
    localMappingCount: state.localMappingIds.length,
    dataStewardshipAgreementCount: state.dataStewardshipAgreementRefs.length,
    redactionSummary: `${state.redactionSummary?.redactionCount ?? 0} redactions, ${state.redactionSummary?.removedFields.length ?? 0} removed fields`,
    readinessWarnings: state.readinessWarnings.map((warning) => `${warning.code}: ${warning.message}`),
    eventTrail: state.includedEventIds.slice(0, 8)
  };
}

function buildAdaptiveBranchReview(input: {
  readonly events: readonly CanopyEvent[];
  readonly refs: {
    readonly adaptiveDecisionRef: ObjectRef;
    readonly adaptiveObjectionRef: ObjectRef;
    readonly policyVersionRef: ObjectRef;
  };
}): CanopyWebAdaptiveBranchReview {
  const decisionPacket = input.events.find((event) =>
    event.type.startsWith("governance.decision_packet") &&
    payloadRefs(event.payload, "unresolvedObjectionRefs").some((ref) =>
      ref.id === input.refs.adaptiveObjectionRef.id
    )
  );
  const policyVersion = input.events.find(
    (event) => event.type === "governance.policy.versioned" &&
      payloadString(payloadRecord(event.payload, "policyVersion"), "id") === input.refs.policyVersionRef.id
  );
  const redactionSummary = payloadRecord(decisionPacket?.payload, "redactionSummary");
  const redactedRefs = payloadRefs(redactionSummary, "redactedRefs");
  const sealedRefs = payloadRefs(redactionSummary, "sealedRefs");
  const continuityRefs = payloadRefs(redactionSummary, "continuityEventRefs");

  return {
    decisionRef: input.refs.adaptiveDecisionRef,
    preservedObjectionRefs: [input.refs.adaptiveObjectionRef],
    redactionSummary: `${redactedRefs.length} redacted refs, ${sealedRefs.length} sealed refs, ${continuityRefs.length} continuity events`,
    adaptivePolicyVersion: payloadString(payloadRecord(policyVersion?.payload, "policyVersion"), "version") ?? "unknown",
    adaptivePolicyVersionRef: input.refs.policyVersionRef
  };
}

function reviewRows(values: readonly string[]): readonly CanopyWebReviewRow[] {
  return Object.entries(
    values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {})
  ).map(([label, value]) => ({ label, value }));
}

function redactionEventCount(
  timeline: CanopyShellSession["snapshot"]["surfaces"]["civicMemoryStream"]["timeline"]
): number {
  return timeline.filter((entry) => entry.isRedacted || entry.type === "system.redaction.applied").length;
}

function redactedEventCount(
  timeline: CanopyShellSession["snapshot"]["surfaces"]["civicMemoryStream"]["timeline"]
): number {
  return timeline.filter((entry) => entry.isRedacted).length;
}

function payloadRecord(
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): Readonly<Record<string, unknown>> | undefined {
  const value = payload?.[key];

  return isRecord(value) ? value : undefined;
}

function payloadRefs(
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): readonly ObjectRef[] {
  const value = payload?.[key];

  return Array.isArray(value) ? value.filter(isObjectRef) : [];
}

function payloadString(
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): string | undefined {
  const value = payload?.[key];

  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectRef(value: unknown): value is ObjectRef {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.namespace === "string" &&
    typeof value.lifecycleStatus === "string"
  );
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
