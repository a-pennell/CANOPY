import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyId,
  CanopyObjectType,
  ObjectRef
} from "@canopy/contracts-kernel";
import type {
  CanopyUiAuthorityFinding,
  CanopyUiAuthorityTraceEvent,
  CanopyUiAuthorityTraceViewModel,
  CanopyUiClaimEvidenceAiIndicator,
  CanopyUiClaimEvidenceClaimSummary,
  CanopyUiClaimEvidenceContestSummary,
  CanopyUiClaimEvidenceEvidenceSummary,
  CanopyUiClaimEvidenceLinkSummary,
  CanopyUiClaimEvidenceViewModel,
  CanopyUiCivicMemoryStreamViewModel,
  CanopyUiDecisionPacketOutcomeSummary,
  CanopyUiDecisionPacketViewModel,
  CanopyUiFederationExportStateViewModel,
  CanopyUiImportReviewCandidate,
  CanopyUiImportReviewViewModel,
  CanopyUiObjectPageViewModel,
  CanopyUiProjectionRead,
  CanopyUiResourceContextSummary,
  CanopyUiResourceStewardshipViewModel,
  CanopyUiResourceUseRightSummary,
  CanopyUiShellCommandResult,
  CanopyUiShellNavigation,
  CanopyUiShellRoute,
  CanopyUiShellScreen,
  CanopyUiShellSurfaces,
  CanopyUiSourceProvenancePanelViewModel,
  CanopyUiTimelineEntry
} from "@canopy/contracts-ui";
import { defaultImportReviewDisposition } from "@canopy/contracts-ui";
import type { ImportDryRunResult } from "@canopy/database-import-plans";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import {
  buildAuthorityProjection,
  type AuthorityProjection
} from "@canopy/projections-authority";
import {
  buildClaimEvidenceProjection,
  type ClaimEvidenceProjection
} from "@canopy/projections-claim-evidence";
import {
  buildCivicMemoryProjection,
  type CivicMemoryProjection,
  type CivicMemoryScope
} from "@canopy/projections-civic-memory";
import {
  buildDecisionPacketProjection,
  type DecisionPacketProjection
} from "@canopy/projections-decision-packet";
import {
  buildFederationExportEnvelopeReadModel,
  type FederationExportEnvelopeReadModel,
  type FederationExportPreview
} from "@canopy/projections-federation-export";
import {
  buildObjectPageProjection,
  type ObjectPageProjection
} from "@canopy/projections-object-page";
import {
  buildResourceStewardshipProjection,
  type ResourceStewardshipProjection
} from "@canopy/projections-resource-stewardship";
import {
  rebuildAndPersistAllProjections,
  type MaterializedProjectionDocument,
  type MaterializedProjectionStore,
  type PersistentProjectionRebuildOptions,
  type PersistentProjectionRebuildResult,
  type ProjectionRebuilderName
} from "@canopy/workflows-projection-rebuild";

export const canopyShellApp = {
  name: "canopy-shell",
  role: "unified operating surface"
} as const;

export type CanopyShellMode =
  | "scope"
  | "objects"
  | "memory"
  | "decisions"
  | "stewardship"
  | "coordination"
  | "federation";

export type CanopyShellAttentionKind =
  | "missing-authority"
  | "redaction"
  | "supersession"
  | "contested"
  | "machine-output"
  | "federation-readiness"
  | "projection-empty";

export interface CanopyShellScope {
  readonly label: string;
  readonly scope: CivicMemoryScope;
}

export interface CanopyShellAttentionItem {
  readonly id: CanopyId;
  readonly kind: CanopyShellAttentionKind;
  readonly title: string;
  readonly eventIds: readonly CanopyId[];
  readonly objectRefs: readonly ObjectRef[];
}

export interface CanopyShellCommand {
  readonly id: CanopyId;
  readonly label: string;
  readonly mode: CanopyShellMode;
  readonly capability?: CanopyCapability;
}

export interface CanopyShellSnapshot {
  readonly app: typeof canopyShellApp;
  readonly activeMode: CanopyShellMode;
  readonly scope: CanopyShellScope;
  readonly selectedObjectRef?: ObjectRef;
  readonly objectPage?: ObjectPageProjection;
  readonly civicMemory: CivicMemoryProjection;
  readonly authority: AuthorityProjection;
  readonly claimEvidence: ClaimEvidenceProjection;
  readonly decisionPacket?: DecisionPacketProjection;
  readonly federationExport?: FederationExportEnvelopeReadModel;
  readonly resourceStewardship?: ResourceStewardshipProjection;
  readonly availableModes: readonly CanopyShellMode[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly eventNamespaces: readonly CanopyEventNamespace[];
  readonly attention: readonly CanopyShellAttentionItem[];
  readonly commands: readonly CanopyShellCommand[];
  readonly legacyProjectNavigation: readonly never[];
  readonly projectionReads: readonly CanopyUiProjectionRead[];
  readonly surfaces: CanopyUiShellSurfaces;
}

export interface BuildCanopyShellSnapshotInput {
  readonly events: readonly CanopyEvent[];
  readonly scope: CanopyShellScope;
  readonly selectedObjectRef?: ObjectRef;
  readonly activeMode?: CanopyShellMode;
  readonly materializedProjections?: readonly MaterializedProjectionDocument[];
  readonly importDryRun?: ImportDryRunResult;
}

export interface BuildPersistedCanopyShellSnapshotInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly scope: CanopyShellScope;
  readonly selectedObjectRef?: ObjectRef;
  readonly activeMode?: CanopyShellMode;
  readonly persistProjectionState?: boolean;
  readonly rebuiltAt?: string;
  readonly materializedProjections?: readonly MaterializedProjectionDocument[];
  readonly materializedProjectionStore?: MaterializedProjectionStore;
  readonly importDryRun?: ImportDryRunResult;
}

export interface PersistedCanopyShellSnapshotResult {
  readonly snapshot: CanopyShellSnapshot;
  readonly sourceEventIds: readonly CanopyId[];
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
  readonly persistedProjectionStateIds: readonly CanopyId[];
}

export interface BuildCanopyShellSessionInput extends BuildCanopyShellSnapshotInput {
  readonly route?: string;
}

export interface BuildPersistedCanopyShellSessionInput
  extends BuildPersistedCanopyShellSnapshotInput {
  readonly route?: string;
}

export interface CanopyShellSession {
  readonly snapshot: CanopyShellSnapshot;
  readonly navigation: CanopyUiShellNavigation;
  readonly screen: CanopyUiShellScreen;
  readonly prompt: string;
}

export interface CanopyShellCommandExecution extends CanopyUiShellCommandResult {
  readonly session: CanopyShellSession;
}

export interface PersistedCanopyShellSessionResult
  extends PersistedCanopyShellSnapshotResult {
  readonly session: CanopyShellSession;
}

export interface ExecutePersistedCanopyShellCommandInput
  extends BuildPersistedCanopyShellSessionInput {
  readonly command: string;
}

export interface PersistedCanopyShellCommandExecution
  extends CanopyUiShellCommandResult {
  readonly session: CanopyShellSession;
  readonly sourceEventIds: readonly CanopyId[];
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
  readonly persistedProjectionStateIds: readonly CanopyId[];
}

export function buildCanopyShellSnapshot(
  input: BuildCanopyShellSnapshotInput
): CanopyShellSnapshot {
  const civicMemory = buildCivicMemoryProjection(input.events, {
    scope: input.scope.scope
  });
  const objectPage =
    input.selectedObjectRef === undefined
      ? undefined
      : buildObjectPageProjection(input.selectedObjectRef, input.events);
  const authority = buildAuthorityProjection(input.events);
  const claimEvidence = buildClaimEvidenceProjection(input.events);
  const decisionPacket =
    input.selectedObjectRef?.type === "decision"
      ? buildDecisionPacketProjection(input.selectedObjectRef, input.events, {
          includeRelatedEventTrail: true
        })
      : undefined;
  const resourceStewardship =
    input.selectedObjectRef?.type === "resource"
      ? buildResourceStewardshipProjection(input.selectedObjectRef, input.events)
      : undefined;
  const federationExport = hasFederationSurface(input.events)
    ? buildFederationExportEnvelopeReadModel(input.events)
    : undefined;
  const sourceCapabilities = civicMemory.sourceCapabilities;
  const projectionReads = buildProjectionReads(input.events, input.materializedProjections ?? []);
  const surfaces = buildShellSurfaces({
    events: input.events,
    scope: input.scope,
    selectedObjectRef: input.selectedObjectRef,
    objectPage,
    civicMemory,
    authority,
    claimEvidence,
    decisionPacket,
    federationExport,
    resourceStewardship,
    projectionReads,
    importDryRun: input.importDryRun
  });

  return optionalShellSnapshot({
    app: canopyShellApp,
    activeMode: input.activeMode ?? "scope",
    scope: input.scope,
    selectedObjectRef: input.selectedObjectRef,
    objectPage,
    civicMemory,
    authority,
    claimEvidence,
    decisionPacket,
    federationExport,
    resourceStewardship,
    availableModes: availableModesForCapabilities(sourceCapabilities, federationExport),
    sourceCapabilities,
    eventNamespaces: civicMemory.namespaceCounts.map((count) => count.namespace),
    attention: buildAttentionItems(input.events, civicMemory, objectPage, federationExport?.preview),
    commands: buildCommands(sourceCapabilities, federationExport),
    legacyProjectNavigation: [],
    projectionReads,
    surfaces
  });
}

export function buildPersistedCanopyShellSnapshot(
  input: BuildPersistedCanopyShellSnapshotInput
): PersistedCanopyShellSnapshotResult {
  const events = input.runtime.queryEvents().items.map((record) => record.event);
  const materializedProjections = [...(input.materializedProjections ?? [])];
  const projectionRebuild =
    input.persistProjectionState === false
      ? undefined
      : rebuildAndPersistAllProjections(
          input.runtime,
          optionalProjectionRebuildOptions({
            events,
            rebuiltAt: input.rebuiltAt,
            materializedProjectionStore: input.materializedProjectionStore
          })
        );
  materializedProjections.push(...(projectionRebuild?.persistedDocuments ?? []));
  const snapshot = buildCanopyShellSnapshot(
    optionalShellSnapshotInput({
      events,
      scope: input.scope,
      selectedObjectRef: input.selectedObjectRef,
      activeMode: input.activeMode,
      materializedProjections,
      importDryRun: input.importDryRun
    })
  );

  return optionalPersistedShellResult({
    snapshot,
    sourceEventIds: events.map((event) => event.id),
    projectionRebuild,
    persistedProjectionStateIds:
      projectionRebuild?.persistedStates.map((state) => state.id) ?? []
  });
}

export function buildCanopyShellSession(
  input: BuildCanopyShellSessionInput
): CanopyShellSession {
  const selectedObjectRef =
    input.selectedObjectRef ?? selectedObjectRefForRoute(input.events, input.route);

  return buildCanopyShellSessionFromSnapshot(
    buildCanopyShellSnapshot(
      optionalShellSnapshotInput({
        events: input.events,
        scope: input.scope,
        selectedObjectRef,
        activeMode: input.activeMode ?? activeModeForRoute(input.route, selectedObjectRef),
        materializedProjections: input.materializedProjections ?? [],
        importDryRun: input.importDryRun
      })
    ),
    input.route
  );
}

export function buildPersistedCanopyShellSession(
  input: BuildPersistedCanopyShellSessionInput
): PersistedCanopyShellSessionResult {
  const events = input.runtime.queryEvents().items.map((record) => record.event);
  const selectedObjectRef =
    input.selectedObjectRef ?? selectedObjectRefForRoute(events, input.route);
  const persisted = buildPersistedCanopyShellSnapshot(
    optionalPersistedShellSnapshotInput({
      runtime: input.runtime,
      scope: input.scope,
      selectedObjectRef,
      activeMode: input.activeMode ?? activeModeForRoute(input.route, selectedObjectRef),
      persistProjectionState: input.persistProjectionState,
      rebuiltAt: input.rebuiltAt,
      materializedProjections: input.materializedProjections,
      materializedProjectionStore: input.materializedProjectionStore,
      importDryRun: input.importDryRun
    })
  );

  return optionalPersistedShellSessionResult({
    snapshot: persisted.snapshot,
    sourceEventIds: persisted.sourceEventIds,
    projectionRebuild: persisted.projectionRebuild,
    persistedProjectionStateIds: persisted.persistedProjectionStateIds,
    session: buildCanopyShellSessionFromSnapshot(persisted.snapshot, input.route)
  });
}

export function executePersistedCanopyShellCommand(
  input: ExecutePersistedCanopyShellCommandInput
): PersistedCanopyShellCommandExecution {
  const initial = buildPersistedCanopyShellSession(input);
  const normalized = input.command.trim();
  const routes = buildShellRoutes(initial.snapshot);
  const target = resolveCommandRoute(initial.snapshot, routes, normalized);
  const status = target?.status === "unavailable"
    ? "unavailable"
    : target === undefined
      ? "not-found"
      : "handled";
  const next = buildPersistedCanopyShellSession({
    ...input,
    route: target?.path ?? "/help"
  });
  const message =
    status === "handled"
      ? `Opened ${next.session.screen.route.label}.`
      : status === "unavailable"
        ? `${target?.label ?? normalized} is not available in this shell state.`
        : `Unknown shell command: ${normalized || "(empty)"}.`;

  return optionalPersistedShellCommandExecution({
    status,
    command: input.command,
    message,
    screen: next.session.screen,
    session: next.session,
    sourceEventIds: next.sourceEventIds,
    projectionRebuild: next.projectionRebuild,
    persistedProjectionStateIds: next.persistedProjectionStateIds
  });
}

export function buildCanopyShellSessionFromSnapshot(
  snapshot: CanopyShellSnapshot,
  route?: string
): CanopyShellSession {
  const navigation = buildCanopyShellNavigation(snapshot, route);
  const activeRoute =
    routeById(navigation.routes, navigation.activeRouteId) ??
    navigation.routes[0] ??
    shellRoute({
      id: "route.scope",
      path: "/scope",
      label: "Scope",
      surfaceKind: "scope-overview",
      status: "current"
    });
  const screen = renderCanopyShellScreen(snapshot, activeRoute, navigation);

  return {
    snapshot,
    navigation,
    screen,
    prompt: `${snapshot.scope.label} ${activeRoute.path}>`
  };
}

export function buildCanopyShellNavigation(
  snapshot: CanopyShellSnapshot,
  route?: string
): CanopyUiShellNavigation {
  const routes = buildShellRoutes(snapshot, route);
  const defaultRoute = defaultRouteForSnapshot(snapshot);
  const activeRoute =
    resolveRoute(routes, route) ??
    resolveRoute(routes, defaultRoute) ??
    routes[0] ??
    shellRoute({
      id: "route.scope",
      path: "/scope",
      label: "Scope",
      surfaceKind: "scope-overview",
      status: "current"
    });
  const activeRoutes = routes.map((entry) =>
    entry.id === activeRoute.id
      ? shellRoute({
          ...entry,
          status: entry.status === "unavailable" ? "unavailable" : "current"
        })
      : shellRoute({
          ...entry,
          status: entry.status === "current" ? "available" : entry.status
        })
  );

  return {
    activeRouteId: activeRoute.id,
    activePath: activeRoute.path,
    routes: activeRoutes,
    breadcrumbs: breadcrumbsForRoute(activeRoute)
  };
}

export function renderCanopyShell(
  snapshot: CanopyShellSnapshot,
  route?: string
): string {
  return buildCanopyShellSessionFromSnapshot(snapshot, route).screen.text;
}

export function executeCanopyShellCommand(
  snapshot: CanopyShellSnapshot,
  command: string
): CanopyShellCommandExecution {
  const normalized = command.trim();
  const routes = buildShellRoutes(snapshot);
  const target = resolveCommandRoute(snapshot, routes, normalized);
  const status = target?.status === "unavailable"
    ? "unavailable"
    : target === undefined
      ? "not-found"
      : "handled";
  const session = buildCanopyShellSessionFromSnapshot(
    snapshot,
    target?.path ?? "/help"
  );
  const message =
    status === "handled"
      ? `Opened ${session.screen.route.label}.`
      : status === "unavailable"
        ? `${target?.label ?? normalized} is not available in this shell state.`
        : `Unknown shell command: ${normalized || "(empty)"}.`;

  return {
    status,
    command,
    message,
    screen: session.screen,
    session
  };
}

function buildShellRoutes(
  snapshot: CanopyShellSnapshot,
  activeRoute?: string
): readonly CanopyUiShellRoute[] {
  const baseRoutes: CanopyUiShellRoute[] = [
    shellRoute({
      id: "route.scope",
      path: "/scope",
      label: "Scope",
      surfaceKind: "scope-overview",
      status: "available",
      summary: `${snapshot.civicMemory.timeline.length} events in ${snapshot.scope.label}`
    }),
    shellRoute({
      id: "route.objects",
      path: "/objects",
      label: "Objects",
      surfaceKind: "objects-index",
      status: "available",
      summary: `${collectNavigableRefs(snapshot).length} navigable refs`
    }),
    shellRoute({
      id: "route.memory",
      path: "/memory",
      label: "Civic memory",
      surfaceKind: "civic-memory-stream",
      status: "available",
      summary: `${snapshot.surfaces.civicMemoryStream.timeline.length} timeline entries`
    }),
    shellRoute({
      id: "route.claims-evidence",
      path: "/claims-evidence",
      label: "Claims and evidence",
      surfaceKind: "claim-evidence",
      status: "available",
      summary: `${snapshot.surfaces.claimEvidence.counts.claims} claims, ${snapshot.surfaces.claimEvidence.counts.evidence} evidence records`
    }),
    shellRoute({
      id: "route.decisions",
      path: "/decisions",
      label: "Decisions",
      surfaceKind: "decision-packet",
      status: snapshot.surfaces.decisionPacket === undefined ? "unavailable" : "available",
      summary: snapshot.surfaces.decisionPacket?.decisionRef.id,
      disabledReason: snapshot.surfaces.decisionPacket === undefined
        ? "Select a decision object to hydrate a decision packet."
        : undefined
    }),
    shellRoute({
      id: "route.stewardship",
      path: "/stewardship",
      label: "Stewardship",
      surfaceKind: "resource-stewardship",
      status: snapshot.surfaces.resourceStewardship === undefined ? "unavailable" : "available",
      summary: snapshot.surfaces.resourceStewardship?.resourceRef.id,
      disabledReason: snapshot.surfaces.resourceStewardship === undefined
        ? "Select a resource object to hydrate stewardship state."
        : undefined
    }),
    shellRoute({
      id: "route.imports",
      path: "/imports",
      label: "Imports",
      surfaceKind: "import-review",
      status: snapshot.surfaces.importReview === undefined ? "unavailable" : "available",
      summary: snapshot.surfaces.importReview?.importPlanId,
      disabledReason: snapshot.surfaces.importReview === undefined
        ? "Provide an import dry run to review folded-source candidates."
        : undefined
    }),
    shellRoute({
      id: "route.federation",
      path: "/federation",
      label: "Federation",
      surfaceKind: "federation-export-state",
      status: snapshot.surfaces.federationExportState === undefined ? "unavailable" : "available",
      summary: snapshot.surfaces.federationExportState?.status,
      disabledReason: snapshot.surfaces.federationExportState === undefined
        ? "No federation export state is visible in this shell state."
        : undefined
    }),
    shellRoute({
      id: "route.authority",
      path: "/authority",
      label: "Authority",
      surfaceKind: "authority-trace",
      status: "available",
      summary: snapshot.surfaces.authorityTrace.status
    }),
    shellRoute({
      id: "route.provenance",
      path: "/provenance",
      label: "Source provenance",
      surfaceKind: "source-provenance-panel",
      status: "available",
      summary: snapshot.surfaces.sourceProvenancePanel.sourceTreatment
    }),
    shellRoute({
      id: "route.help",
      path: "/help",
      label: "Help",
      surfaceKind: "command-help",
      status: "available",
      summary: "CLI-like shell commands"
    })
  ];
  const objectRoutes = collectNavigableRefs(snapshot).map((ref) =>
    shellRoute({
      id: `route.object.${ref.type}.${ref.id}`,
      path: `/objects/${ref.type}/${ref.id}`,
      label: `${ref.type}: ${ref.id}`,
      surfaceKind: "object-page",
      status: "available",
      selectedObjectRef: ref,
      summary: ref.namespace
    })
  );
  const active = resolveRoute([...baseRoutes, ...objectRoutes], activeRoute);

  return [...baseRoutes, ...objectRoutes].map((route) =>
    route.id === active?.id
      ? shellRoute({
          ...route,
          status: route.status === "unavailable" ? "unavailable" : "current"
        })
      : route
  );
}

function renderCanopyShellScreen(
  snapshot: CanopyShellSnapshot,
  route: CanopyUiShellRoute | undefined,
  navigation: CanopyUiShellNavigation
): CanopyUiShellScreen {
  const activeRoute =
    route ??
    shellRoute({
      id: "route.scope",
      path: "/scope",
      label: "Scope",
      surfaceKind: "scope-overview",
      status: "current"
    });
  const lines =
    activeRoute.status === "unavailable"
      ? renderUnavailableRoute(activeRoute)
      : renderRouteLines(snapshot, activeRoute);
  const title = lines[0] ?? activeRoute.label;

  return {
    kind: "shell-screen",
    title,
    route: activeRoute,
    navigation,
    lines,
    text: lines.join("\n")
  };
}

function renderRouteLines(
  snapshot: CanopyShellSnapshot,
  route: CanopyUiShellRoute
): readonly string[] {
  switch (route.surfaceKind) {
    case "scope-overview":
      return renderScopeOverview(snapshot);
    case "objects-index":
      return renderObjectsIndex(snapshot);
    case "civic-memory-stream":
      return renderCivicMemory(snapshot);
    case "claim-evidence":
      return renderClaimEvidence(snapshot);
    case "decision-packet":
      return renderDecisionPacket(snapshot);
    case "resource-stewardship":
      return renderResourceStewardship(snapshot);
    case "import-review":
      return renderImportReview(snapshot);
    case "federation-export-state":
      return renderFederationExportState(snapshot);
    case "authority-trace":
      return renderAuthorityTrace(snapshot);
    case "source-provenance-panel":
      return renderSourceProvenance(snapshot);
    case "object-page":
      return renderObjectRoute(snapshot, route);
    case "command-help":
      return renderHelp(snapshot);
  }
}

function renderScopeOverview(snapshot: CanopyShellSnapshot): readonly string[] {
  return compactLines([
    `Canopy Shell: ${snapshot.scope.label}`,
    `Active mode: ${snapshot.activeMode}`,
    `Events: ${snapshot.civicMemory.timeline.length}`,
    `Modes: ${snapshot.availableModes.join(", ") || "none"}`,
    `Capabilities: ${snapshot.sourceCapabilities.join(", ") || "none"}`,
    `Attention: ${snapshot.attention.length === 0 ? "clear" : snapshot.attention.map((item) => item.kind).join(", ")}`,
    "Routes: /objects, /claims-evidence, /decisions, /stewardship, /imports, /federation, /memory"
  ]);
}

function renderObjectsIndex(snapshot: CanopyShellSnapshot): readonly string[] {
  const refs = collectNavigableRefs(snapshot);

  return compactLines([
    "Objects",
    `Selected: ${snapshot.selectedObjectRef === undefined ? "none" : formatRef(snapshot.selectedObjectRef)}`,
    ...refs.slice(0, 16).map((ref) => `- ${formatRef(ref)} -> /objects/${ref.type}/${ref.id}`),
    refs.length > 16 ? `- ${refs.length - 16} more refs hidden` : undefined
  ]);
}

function renderCivicMemory(snapshot: CanopyShellSnapshot): readonly string[] {
  const stream = snapshot.surfaces.civicMemoryStream;

  return compactLines([
    `Civic Memory: ${stream.scopeLabel}`,
    `Projection: ${stream.projectionRead.kind}/${stream.projectionRead.freshness}`,
    ...stream.timeline.slice(0, 12).map(
      (entry) => `- ${entry.occurredAt} ${entry.type} ${formatRef(entry.objectRef)}`
    ),
    stream.timeline.length > 12 ? `- ${stream.timeline.length - 12} more events hidden` : undefined
  ]);
}

function renderClaimEvidence(snapshot: CanopyShellSnapshot): readonly string[] {
  const surface = snapshot.surfaces.claimEvidence;

  return compactLines([
    "Claims and Evidence",
    `Counts: ${surface.counts.claims} claims, ${surface.counts.evidence} evidence, ${surface.counts.contests} contests, ${surface.counts.aiNonAuthorityIndicators} AI indicators`,
    surface.selectedClaim === undefined ? undefined : `Selected claim: ${formatRef(surface.selectedClaim.claimRef)} (${surface.selectedClaim.status})`,
    surface.selectedEvidence === undefined ? undefined : `Selected evidence: ${formatRef(surface.selectedEvidence.evidenceRef)}`,
    ...surface.claims.slice(0, 8).map((claim) =>
      `- claim ${formatRef(claim.claimRef)} status=${claim.status} evidence=${claim.evidenceRefs.length} contests=${claim.contestRefs.length}`
    ),
    ...surface.contests.slice(0, 8).map((contest) =>
      `- contest ${formatRef(contest.contestRef)} contests=${formatRef(contest.claimRef)} evidence=${contest.evidenceRefs.length}`
    ),
    ...surface.evidence.slice(0, 8).map((evidence) =>
      `- evidence ${formatRef(evidence.evidenceRef)} ai=${String(evidence.isAiOrModelOutput)} claims=${evidence.claimRefs.length}`
    )
  ]);
}

function renderDecisionPacket(snapshot: CanopyShellSnapshot): readonly string[] {
  const packet = snapshot.surfaces.decisionPacket;

  if (packet === undefined) {
    return renderUnavailableRoute(
      shellRoute({
        id: "route.decisions",
        path: "/decisions",
        label: "Decisions",
        surfaceKind: "decision-packet",
        status: "unavailable",
        disabledReason: "Select a decision object to hydrate a decision packet."
      })
    );
  }

  return compactLines([
    `Decision Packet: ${formatRef(packet.decisionRef)}`,
    packet.status === undefined ? undefined : `Status: ${packet.status}`,
    packet.outcome === undefined ? undefined : `Outcome: ${packet.outcome}`,
    `Authority refs: ${packet.authorityRefs.map(formatRef).join(", ") || "none"}`,
    `Claims: ${packet.claimRefs.map(formatRef).join(", ") || "none"}`,
    `Evidence: ${packet.evidenceRefs.map(formatRef).join(", ") || "none"}`,
    `Stewardship outcomes: ${packet.stewardshipOutcomes.length}`,
    ...packet.timeline.slice(0, 8).map((entry) => `- ${entry.type} ${formatRef(entry.objectRef)}`)
  ]);
}

function renderResourceStewardship(snapshot: CanopyShellSnapshot): readonly string[] {
  const stewardship = snapshot.surfaces.resourceStewardship;

  if (stewardship === undefined) {
    return renderUnavailableRoute(
      shellRoute({
        id: "route.stewardship",
        path: "/stewardship",
        label: "Stewardship",
        surfaceKind: "resource-stewardship",
        status: "unavailable",
        disabledReason: "Select a resource object to hydrate stewardship state."
      })
    );
  }

  return compactLines([
    `Resource Stewardship: ${stewardship.title ?? stewardship.resourceRef.id}`,
    `Resource: ${formatRef(stewardship.resourceRef)}`,
    stewardship.resourceKind === undefined ? undefined : `Kind: ${stewardship.resourceKind}`,
    `Use rights: ${stewardship.useRights.length}`,
    `Ecological contexts: ${stewardship.ecologicalContextIds.join(", ") || "none"}`,
    ...stewardship.useRights.map((right) =>
      `- ${right.state} ${formatRef(right.useRightRef)} holder=${right.holderRef === undefined ? "unknown" : formatRef(right.holderRef)} permissions=${right.permissions.join(",") || "none"}`
    )
  ]);
}

function renderImportReview(snapshot: CanopyShellSnapshot): readonly string[] {
  const review = snapshot.surfaces.importReview;

  if (review === undefined) {
    return renderUnavailableRoute(
      shellRoute({
        id: "route.imports",
        path: "/imports",
        label: "Imports",
        surfaceKind: "import-review",
        status: "unavailable",
        disabledReason: "Provide an import dry run to review folded-source candidates."
      })
    );
  }

  return compactLines([
    `Import Review: ${review.importPlanId}`,
    `Source: ${review.sourceProject} (${review.sourceTreatment})`,
    `Status: ${review.status}; default disposition: ${review.defaultDisposition}`,
    `Candidates: ${review.candidates.length}; warnings: ${review.warnings.length}; prohibited outcomes: ${review.prohibitedOutcomes.length}`,
    ...review.candidates.map((candidate) =>
      `- ${candidate.source.sourceEntity}:${candidate.source.sourceId} -> ${formatRef(candidate.canonicalRef)} ${candidate.reviewDisposition}/${candidate.confidence}`
    ),
    ...review.warnings.map((warning) => `- warning ${warning.code}: ${warning.message}`)
  ]);
}

function renderFederationExportState(snapshot: CanopyShellSnapshot): readonly string[] {
  const state = snapshot.surfaces.federationExportState;

  if (state === undefined) {
    return renderUnavailableRoute(
      shellRoute({
        id: "route.federation",
        path: "/federation",
        label: "Federation",
        surfaceKind: "federation-export-state",
        status: "unavailable",
        disabledReason: "No federation export state is visible in this shell state."
      })
    );
  }

  return compactLines([
    `Federation Export: ${state.status}`,
    `Envelope: ${state.envelopeId}`,
    `Projection: ${state.projectionRead.kind}/${state.projectionRead.freshness}`,
    `Format: ${state.format}; schema: ${state.schemaVersion}`,
    `Events: ${state.includedEventIds.length}; objects: ${state.includedObjectRefs.length}`,
    `Data stewardship agreements: ${state.dataStewardshipAgreementRefs.map(formatRef).join(", ") || "none"}`,
    `Local mappings: ${state.localMappingIds.join(", ") || "none"}`,
    ...state.readinessWarnings.map((warning) => `- readiness ${warning.code}: ${warning.message}`)
  ]);
}

function renderAuthorityTrace(snapshot: CanopyShellSnapshot): readonly string[] {
  const trace = snapshot.surfaces.authorityTrace;

  return compactLines([
    `Authority Trace: ${trace.status}`,
    trace.objectRef === undefined ? undefined : `Object: ${formatRef(trace.objectRef)}`,
    `Authority refs: ${trace.authorityRefs.map(formatRef).join(", ") || "none"}`,
    ...trace.events.slice(0, 10).map((event) =>
      `- ${event.type} ${formatRef(event.objectRef)} binding=${String(event.isBinding)} authority=${String(event.hasAuthority)}`
    ),
    ...trace.findings.map((finding) => `- finding ${finding.kind}: ${finding.message}`)
  ]);
}

function renderSourceProvenance(snapshot: CanopyShellSnapshot): readonly string[] {
  const provenance = snapshot.surfaces.sourceProvenancePanel;

  return compactLines([
    `Source Provenance: ${provenance.sourceTreatment}`,
    `Projects: ${provenance.sourceProjects.join(", ") || "none"}`,
    `Capabilities: ${provenance.sourceCapabilities.join(", ") || "none"}`,
    ...provenance.entries.slice(0, 12).map((entry) =>
      `- ${entry.eventId} -> ${formatRef(entry.canonicalRef)} via ${entry.sourceCapability}`
    )
  ]);
}

function renderObjectRoute(
  snapshot: CanopyShellSnapshot,
  route: CanopyUiShellRoute
): readonly string[] {
  const objectPage = snapshot.surfaces.objectPage;

  if (
    objectPage === undefined ||
    route.selectedObjectRef === undefined ||
    !sameRef(objectPage.objectRef, route.selectedObjectRef)
  ) {
    return compactLines([
      `Object: ${route.selectedObjectRef === undefined ? route.label : formatRef(route.selectedObjectRef)}`,
      "Object route is navigable from this shell state.",
      route.selectedObjectRef === undefined
        ? undefined
        : `Hydrate the object page by rebuilding the shell with selectedObjectRef=${formatRef(route.selectedObjectRef)}.`
    ]);
  }

  return compactLines([
    `Object Page: ${objectPage.title ?? objectPage.objectRef.id}`,
    `Object: ${formatRef(objectPage.objectRef)}`,
    objectPage.summary === undefined ? undefined : `Summary: ${objectPage.summary}`,
    `Related refs: ${objectPage.relatedRefs.map(formatRef).join(", ") || "none"}`,
    `Authority refs: ${objectPage.authorityRefs.map(formatRef).join(", ") || "none"}`,
    ...objectPage.timeline.map((entry) => `- ${entry.type} ${entry.occurredAt}`)
  ]);
}

function renderHelp(snapshot: CanopyShellSnapshot): readonly string[] {
  return [
    "Canopy Shell Commands",
    "open /path",
    "scope | objects | memory | claims | decisions | stewardship | imports | federation",
    "authority | provenance | routes | help",
    `Available routes: ${buildShellRoutes(snapshot).map((route) => route.path).join(", ")}`
  ];
}

function renderUnavailableRoute(route: CanopyUiShellRoute): readonly string[] {
  return compactLines([
    `${route.label}: unavailable`,
    route.disabledReason ?? "This surface is not available in the current shell state."
  ]);
}

function resolveCommandRoute(
  snapshot: CanopyShellSnapshot,
  routes: readonly CanopyUiShellRoute[],
  command: string
): CanopyUiShellRoute | undefined {
  if (command.length === 0 || command === "help" || command === "?") {
    return resolveRoute(routes, "/help");
  }

  if (command === "routes" || command === "nav") {
    return resolveRoute(routes, "/objects");
  }

  const openPrefix = "open ";
  const target = command.startsWith(openPrefix) ? command.slice(openPrefix.length).trim() : command;
  const commandRoute = commandRouteAlias(snapshot, target);

  return resolveRoute(routes, commandRoute ?? target);
}

function commandRouteAlias(
  snapshot: CanopyShellSnapshot,
  command: string
): string | undefined {
  const aliases: Readonly<Record<string, string>> = {
    scope: "/scope",
    objects: "/objects",
    object: snapshot.selectedObjectRef === undefined
      ? "/objects"
      : `/objects/${snapshot.selectedObjectRef.type}/${snapshot.selectedObjectRef.id}`,
    memory: "/memory",
    claims: "/claims-evidence",
    evidence: "/claims-evidence",
    "claims-evidence": "/claims-evidence",
    decisions: "/decisions",
    decision: "/decisions",
    stewardship: "/stewardship",
    steward: "/stewardship",
    imports: "/imports",
    import: "/imports",
    federation: "/federation",
    export: "/federation",
    authority: "/authority",
    provenance: "/provenance",
    help: "/help"
  };

  return aliases[command];
}

function defaultRouteForSnapshot(snapshot: CanopyShellSnapshot): string {
  if (snapshot.selectedObjectRef !== undefined) {
    return `/objects/${snapshot.selectedObjectRef.type}/${snapshot.selectedObjectRef.id}`;
  }

  if (snapshot.activeMode === "memory") {
    return "/memory";
  }

  if (snapshot.activeMode === "decisions") {
    return "/decisions";
  }

  if (snapshot.activeMode === "stewardship") {
    return "/stewardship";
  }

  if (snapshot.activeMode === "federation") {
    return "/federation";
  }

  if (snapshot.activeMode === "objects") {
    return "/objects";
  }

  return "/scope";
}

function activeModeForRoute(
  route: string | undefined,
  selectedObjectRef: ObjectRef | undefined
): CanopyShellMode | undefined {
  const normalized = normalizeRoute(route);

  if (normalized === "/memory") {
    return "memory";
  }

  if (normalized === "/decisions" || selectedObjectRef?.type === "decision") {
    return "decisions";
  }

  if (
    normalized === "/stewardship" ||
    selectedObjectRef?.type === "resource" ||
    selectedObjectRef?.type === "use-right"
  ) {
    return "stewardship";
  }

  if (normalized === "/federation") {
    return "federation";
  }

  if (normalized === "/objects" || normalized?.startsWith("/objects/") === true) {
    return "objects";
  }

  return undefined;
}

function selectedObjectRefForRoute(
  events: readonly CanopyEvent[],
  route: string | undefined
): ObjectRef | undefined {
  const routeRef = parseObjectRoute(route);

  if (routeRef === undefined) {
    return undefined;
  }

  return sortedRefs(eventRefs(events)).find(
    (ref) => ref.type === routeRef.type && ref.id === routeRef.id
  );
}

function parseObjectRoute(
  route: string | undefined
): { readonly type: CanopyObjectType; readonly id: CanopyId } | undefined {
  const normalized = normalizeRoute(route);

  if (normalized === undefined) {
    return undefined;
  }

  const match = /^\/objects\/([^/]+)\/(.+)$/.exec(normalized);
  const objectType = match?.[1];
  const objectId = match?.[2];

  if (objectType === undefined || objectId === undefined || !isCanopyObjectType(objectType)) {
    return undefined;
  }

  return { type: objectType, id: decodeURIComponent(objectId) };
}

function normalizeRoute(route: string | undefined): string | undefined {
  if (route === undefined) {
    return undefined;
  }

  return route.startsWith("/") ? route : `/${route}`;
}

function resolveRoute(
  routes: readonly CanopyUiShellRoute[],
  route: string | undefined
): CanopyUiShellRoute | undefined {
  if (route === undefined) {
    return undefined;
  }

  const normalized = normalizeRoute(route);

  return routes.find(
    (entry) =>
      entry.path === normalized ||
      entry.id === route ||
      entry.label.toLowerCase() === route.toLowerCase()
  );
}

function routeById(
  routes: readonly CanopyUiShellRoute[],
  id: CanopyId
): CanopyUiShellRoute | undefined {
  return routes.find((route) => route.id === id);
}

function breadcrumbsForRoute(route: CanopyUiShellRoute): readonly { label: string; path: string }[] {
  if (route.path.startsWith("/objects/")) {
    return [
      { label: "Objects", path: "/objects" },
      { label: route.label, path: route.path }
    ];
  }

  return [{ label: route.label, path: route.path }];
}

function collectNavigableRefs(snapshot: CanopyShellSnapshot): readonly ObjectRef[] {
  return sortedRefs(
    dedupeRefs([
      ...(snapshot.selectedObjectRef === undefined ? [] : [snapshot.selectedObjectRef]),
      ...snapshot.surfaces.civicMemoryStream.timeline.flatMap((entry) => [
        entry.objectRef,
        ...entry.relatedRefs,
        ...entry.authorityRefs
      ]),
      ...snapshot.surfaces.claimEvidence.claims.map((claim) => claim.claimRef),
      ...snapshot.surfaces.claimEvidence.evidence.map((evidence) => evidence.evidenceRef),
      ...(snapshot.surfaces.decisionPacket === undefined
        ? []
        : [
            snapshot.surfaces.decisionPacket.decisionRef,
            ...snapshot.surfaces.decisionPacket.claimRefs,
            ...snapshot.surfaces.decisionPacket.evidenceRefs,
            ...snapshot.surfaces.decisionPacket.authorityRefs
          ]),
      ...(snapshot.surfaces.resourceStewardship === undefined
        ? []
        : [
            snapshot.surfaces.resourceStewardship.resourceRef,
            ...snapshot.surfaces.resourceStewardship.useRights.map((right) => right.useRightRef),
            ...snapshot.surfaces.resourceStewardship.authorityRefs
          ]),
      ...(snapshot.surfaces.federationExportState?.includedObjectRefs ?? []),
      ...(snapshot.surfaces.importReview?.candidates.map((candidate) => candidate.canonicalRef) ?? [])
    ])
  );
}

function eventRefs(events: readonly CanopyEvent[]): readonly ObjectRef[] {
  return dedupeRefs(
    events.flatMap((event) => [event.objectRef, ...event.relatedRefs, ...event.authorityRefs])
  );
}

function shellRoute(
  route: Omit<CanopyUiShellRoute, "selectedObjectRef" | "summary" | "disabledReason"> & {
    readonly selectedObjectRef?: ObjectRef | undefined;
    readonly summary?: string | undefined;
    readonly disabledReason?: string | undefined;
  }
): CanopyUiShellRoute {
  const optionalFields: {
    selectedObjectRef?: ObjectRef;
    summary?: string;
    disabledReason?: string;
  } = {};

  if (route.selectedObjectRef !== undefined) {
    optionalFields.selectedObjectRef = route.selectedObjectRef;
  }

  if (route.summary !== undefined) {
    optionalFields.summary = route.summary;
  }

  if (route.disabledReason !== undefined) {
    optionalFields.disabledReason = route.disabledReason;
  }

  return {
    id: route.id,
    path: route.path,
    label: route.label,
    surfaceKind: route.surfaceKind,
    status: route.status,
    ...optionalFields
  };
}

function compactLines(lines: readonly (string | undefined)[]): readonly string[] {
  return lines.filter(isDefined);
}

function formatRef(ref: ObjectRef): string {
  return `${ref.type}:${ref.id}`;
}

function availableModesForCapabilities(
  capabilities: readonly CanopyCapability[],
  federationExport?: FederationExportEnvelopeReadModel
): readonly CanopyShellMode[] {
  const modes = new Set<CanopyShellMode>(["scope", "objects", "memory"]);

  if (capabilities.includes("governance")) {
    modes.add("decisions");
  }

  if (capabilities.includes("stewardship")) {
    modes.add("stewardship");
  }

  if (capabilities.includes("allocation-accounting")) {
    modes.add("coordination");
  }

  if (
    capabilities.includes("federation") ||
    federationExport !== undefined
  ) {
    modes.add("federation");
  }

  return [...modes];
}

function buildCommands(
  capabilities: readonly CanopyCapability[],
  federationExport?: FederationExportEnvelopeReadModel
): readonly CanopyShellCommand[] {
  const commands: CanopyShellCommand[] = [
    { id: "command.search-objects", label: "Search objects", mode: "objects" },
    { id: "command.open-memory", label: "Open civic memory", mode: "memory" }
  ];

  if (capabilities.includes("claims-evidence")) {
    commands.push({
      id: "command.create-claim",
      label: "Create claim",
      mode: "objects",
      capability: "claims-evidence"
    });
  }

  if (capabilities.includes("governance")) {
    commands.push({
      id: "command.record-decision",
      label: "Record decision",
      mode: "decisions",
      capability: "governance"
    });
  }

  if (capabilities.includes("stewardship")) {
    commands.push({
      id: "command.grant-use-right",
      label: "Grant use right",
      mode: "stewardship",
      capability: "stewardship"
    });
  }

  if (federationExport !== undefined) {
    commands.push({
      id: "command.preview-export",
      label: "Preview export",
      mode: "federation",
      capability: "federation"
    });
  }

  return commands;
}

function buildAttentionItems(
  events: readonly CanopyEvent[],
  civicMemory: CivicMemoryProjection,
  objectPage?: ObjectPageProjection,
  federationPreview?: FederationExportPreview
): readonly CanopyShellAttentionItem[] {
  const items: CanopyShellAttentionItem[] = [];
  const missingAuthorityEvents = events.filter(
    (event) => isBindingEvent(event) && event.authorityRefs.length === 0
  );
  const machineOutputEvents = events.filter(
    (event) =>
      event.systemActor === "ai_assistant" ||
      event.dataState === "machine_inferred" ||
      event.type.startsWith("model.")
  );
  const contestedEvents = events.filter((event) => event.dataState === "contested");

  if (civicMemory.timeline.length === 0) {
    items.push({
      id: "attention.projection-empty",
      kind: "projection-empty",
      title: "No events in current scope",
      eventIds: [],
      objectRefs: []
    });
  }

  if (missingAuthorityEvents.length > 0) {
    items.push({
      id: "attention.missing-authority",
      kind: "missing-authority",
      title: "Binding events need authority review",
      eventIds: missingAuthorityEvents.map((event) => event.id),
      objectRefs: dedupeRefs(missingAuthorityEvents.map((event) => event.objectRef))
    });
  }

  if (civicMemory.redaction.hasRedactions) {
    items.push({
      id: "attention.redaction",
      kind: "redaction",
      title: "Redaction continuity present",
      eventIds: civicMemory.redaction.redactionEventIds,
      objectRefs: objectPage?.redaction.hasRedactedEvents ? [objectPage.objectRef] : []
    });
  }

  if (civicMemory.supersession.hasSupersessions) {
    items.push({
      id: "attention.supersession",
      kind: "supersession",
      title: "Supersession continuity present",
      eventIds: civicMemory.supersession.supersedingEventIds,
      objectRefs: civicMemory.supersession.replacementRefs
    });
  }

  if (contestedEvents.length > 0) {
    items.push({
      id: "attention.contested",
      kind: "contested",
      title: "Contested records need review",
      eventIds: contestedEvents.map((event) => event.id),
      objectRefs: dedupeRefs(contestedEvents.map((event) => event.objectRef))
    });
  }

  if (machineOutputEvents.length > 0) {
    items.push({
      id: "attention.machine-output",
      kind: "machine-output",
      title: "Machine output is evidence, not authority",
      eventIds: machineOutputEvents.map((event) => event.id),
      objectRefs: dedupeRefs(machineOutputEvents.map((event) => event.objectRef))
    });
  }

  if (
    federationPreview !== undefined &&
    federationPreview.federationReadinessWarnings.length > 0
  ) {
    items.push({
      id: "attention.federation-readiness",
      kind: "federation-readiness",
      title: "Federation export needs readiness review",
      eventIds: federationPreview.eventIds,
      objectRefs: federationPreview.includedObjects.map((object) => object.ref)
    });
  }

  return items;
}

function buildProjectionReads(
  events: readonly CanopyEvent[],
  materializedProjections: readonly MaterializedProjectionDocument[]
): readonly CanopyUiProjectionRead[] {
  const liveReads = projectionRebuilderNames.map((projectionName) =>
    projectionRead({
      kind: "live",
      projectionName,
      sourceEventIds: events.map((event) => event.id),
      processedEventCount: events.length,
      freshness: "current"
    })
  );
  const materializedReads = materializedProjections.map((document) =>
    projectionRead({
      kind: "materialized",
      projectionName: document.projectionName,
      documentId: document.id,
      targetRef: document.targetRef,
      sourceEventIds:
        document.checkpoint.eventId === undefined ? [] : [document.checkpoint.eventId],
      processedEventCount: document.processedEventCount,
      rebuiltAt: document.materializedAt,
      freshness: document.processedEventCount >= events.length ? "current" : "stale"
    })
  );

  return [...materializedReads, ...liveReads];
}

function buildShellSurfaces(input: {
  readonly events: readonly CanopyEvent[];
  readonly scope: CanopyShellScope;
  readonly selectedObjectRef: ObjectRef | undefined;
  readonly objectPage: ObjectPageProjection | undefined;
  readonly civicMemory: CivicMemoryProjection;
  readonly authority: AuthorityProjection;
  readonly claimEvidence: ClaimEvidenceProjection;
  readonly decisionPacket: DecisionPacketProjection | undefined;
  readonly federationExport: FederationExportEnvelopeReadModel | undefined;
  readonly resourceStewardship: ResourceStewardshipProjection | undefined;
  readonly projectionReads: readonly CanopyUiProjectionRead[];
  readonly importDryRun: ImportDryRunResult | undefined;
}): CanopyUiShellSurfaces {
  const importReview =
    input.importDryRun === undefined ? undefined : buildImportReviewViewModel(input.importDryRun);
  const objectPage =
    input.objectPage === undefined
      ? undefined
      : buildObjectPageViewModel(
          input.objectPage,
          projectionReadFor(input.projectionReads, "object-page", input.objectPage.objectRef)
        );

  return optionalShellSurfaces({
    objectPage,
    civicMemoryStream: buildCivicMemoryStreamViewModel(
      input.scope,
      input.civicMemory,
      projectionReadFor(input.projectionReads, "civic-memory")
    ),
    sourceProvenancePanel: buildSourceProvenancePanel(input.events),
    authorityTrace: buildAuthorityTraceViewModel(
      input.authority,
      input.selectedObjectRef,
      projectionReadFor(input.projectionReads, "authority")
    ),
    claimEvidence: buildClaimEvidenceViewModel(
      input.claimEvidence,
      input.selectedObjectRef,
      projectionReadFor(input.projectionReads, "claim-evidence")
    ),
    decisionPacket:
      input.decisionPacket === undefined
        ? undefined
        : buildDecisionPacketViewModel(
            input.decisionPacket,
            projectionReadFor(input.projectionReads, "decision-packet", input.decisionPacket.decisionRef)
          ),
    resourceStewardship:
      input.resourceStewardship === undefined
        ? undefined
        : buildResourceStewardshipViewModel(
            input.resourceStewardship,
            projectionReadFor(input.projectionReads, "resource-stewardship", input.resourceStewardship.resourceRef)
          ),
    federationExportState:
      input.federationExport === undefined
        ? undefined
        : buildFederationExportStateViewModel(
            input.federationExport,
            projectionReadFor(input.projectionReads, "federation-export")
          ),
    importReview
  });
}

function buildObjectPageViewModel(
  objectPage: ObjectPageProjection,
  projectionRead: CanopyUiProjectionRead
): CanopyUiObjectPageViewModel {
  return optionalObjectPageViewModel({
    kind: "object-page",
    objectRef: objectPage.objectRef,
    title: objectPage.title,
    summary: objectPage.summary,
    timeline: objectPage.timelineEvents.map((entry) =>
      timelineEntry({
        id: entry.id,
        type: entry.type,
        namespace: entry.namespace,
        occurredAt: entry.occurredAt,
        actorRef: entry.actorRef,
        objectRef: entry.objectRef,
        relatedRefs: entry.relatedRefs,
        authorityRefs: entry.authorityRefs,
        sourceCapability: entry.sourceCapability,
        title: entry.title,
        summary: entry.summary,
        isRedacted: entry.isRedacted,
        isSuperseded: entry.isSuperseded
      })
    ),
    relatedRefs: objectPage.relatedRefs,
    authorityRefs: objectPage.authorityRefs,
    sourceCapabilities: objectPage.sourceCapabilities,
    projectionRead
  });
}

function buildCivicMemoryStreamViewModel(
  scope: CanopyShellScope,
  civicMemory: CivicMemoryProjection,
  projectionRead: CanopyUiProjectionRead
): CanopyUiCivicMemoryStreamViewModel {
  return {
    kind: "civic-memory-stream",
    scopeLabel: scope.label,
    timeline: civicMemory.timeline.map((entry) =>
      timelineEntry({
        id: entry.id,
        type: entry.type,
        namespace: entry.namespace,
        occurredAt: entry.occurredAt,
        actorRef: entry.actorRef,
        systemActor: entry.systemActor,
        objectRef: entry.objectRef,
        relatedRefs: entry.relatedRefs,
        authorityRefs: entry.authorityRefs,
        sourceCapability: entry.sourceCapability,
        title: entry.title,
        summary: entry.summary,
        dataState: entry.dataState,
        visibility: entry.visibility,
        isRedacted: entry.isRedacted,
        isSuperseded: entry.isSuperseded
      })
    ),
    relatedRefs: civicMemory.relatedRefs,
    authorityRefs: civicMemory.authorityRefs,
    sourceCapabilities: civicMemory.sourceCapabilities,
    namespaceCounts: civicMemory.namespaceCounts,
    capabilityCounts: civicMemory.capabilityCounts,
    projectionRead
  };
}

function buildSourceProvenancePanel(
  events: readonly CanopyEvent[]
): CanopyUiSourceProvenancePanelViewModel {
  const entries = events.flatMap((event) => provenanceEntriesForEvent(event));
  const sourceProjects = sortedStrings(
    entries
      .map((entry) => entry.source?.sourceProject ?? entry.sourceProject)
      .filter(isDefined)
  );
  const sourceCapabilities = sortedStrings(events.map((event) => event.sourceCapability));
  const eventNamespaces = sortedStrings(events.map((event) => eventNamespace(event.type)));

  return {
    kind: "source-provenance-panel",
    sourceTreatment:
      sourceProjects.some((project) => project !== "canopy") ? "folded-source" : "native-canopy",
    entries,
    sourceProjects,
    sourceCapabilities,
    eventNamespaces
  };
}

function buildAuthorityTraceViewModel(
  authority: AuthorityProjection,
  selectedObjectRef: ObjectRef | undefined,
  projectionRead: CanopyUiProjectionRead
): CanopyUiAuthorityTraceViewModel {
  const selectedTrace =
    selectedObjectRef === undefined
      ? undefined
      : authority.tracesByObject.find((trace) => sameRef(trace.objectRef, selectedObjectRef));
  const trace = selectedTrace ?? authority.tracesByObject[0];
  const events =
    trace?.events.map((event) =>
      authorityTraceEvent({
        id: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        relevance: event.relevance,
        actorRef: event.actorRef,
        objectRef: event.objectRef,
        relatedRefs: event.relatedRefs,
        authorityRefs: event.authorityRefs,
        isBinding: event.isBinding,
        hasAuthority: event.hasAuthority
      })
    ) ?? [];
  const findings = trace?.findings.map(toAuthorityFinding) ?? authority.findings.map(toAuthorityFinding);

  return optionalAuthorityTraceViewModel({
    kind: "authority-trace",
    objectRef: trace?.objectRef ?? selectedObjectRef,
    status: trace?.status ?? authority.indicators.status,
    authorityRefs: trace?.authorityRefs ?? authority.authorityRefs,
    events,
    findings,
    projectionRead
  });
}

function buildClaimEvidenceViewModel(
  claimEvidence: ClaimEvidenceProjection,
  selectedObjectRef: ObjectRef | undefined,
  projectionRead: CanopyUiProjectionRead
): CanopyUiClaimEvidenceViewModel {
  const claims = claimEvidence.claims.map(toClaimEvidenceClaimSummary);
  const evidence = claimEvidence.evidence.map(toClaimEvidenceEvidenceSummary);
  const selectedClaim =
    selectedObjectRef?.type === "claim"
      ? claims.find((claim) => sameRef(claim.claimRef, selectedObjectRef))
      : undefined;
  const selectedEvidence =
    selectedObjectRef?.type === "evidence"
      ? evidence.find((entry) => sameRef(entry.evidenceRef, selectedObjectRef))
      : undefined;

  return optionalClaimEvidenceViewModel({
    kind: "claim-evidence",
    selectedClaim,
    selectedEvidence,
    claims,
    evidence,
    links: claimEvidence.evidenceLinks.map(toClaimEvidenceLinkSummary),
    contests: claimEvidence.contests.map(toClaimEvidenceContestSummary),
    aiNonAuthorityIndicators: claimEvidence.aiNonAuthorityIndicators.map(toClaimEvidenceAiIndicator),
    counts: {
      claims: claimEvidence.counts.claims,
      evidence: claimEvidence.counts.evidence,
      evidenceLinks: claimEvidence.counts.evidenceLinks,
      reviews: claimEvidence.counts.reviews,
      contests: claimEvidence.counts.contests,
      aiNonAuthorityIndicators: claimEvidence.counts.aiNonAuthorityIndicators
    },
    projectionRead
  });
}

function buildDecisionPacketViewModel(
  decisionPacket: DecisionPacketProjection,
  projectionRead: CanopyUiProjectionRead
): CanopyUiDecisionPacketViewModel {
  return optionalDecisionPacketViewModel({
    kind: "decision-packet",
    decisionRef: decisionPacket.decisionRef,
    packetRef: decisionPacket.packetRef,
    status: decisionPacket.status,
    outcome: decisionPacket.outcome,
    rationale: decisionPacket.rationale,
    conditions: decisionPacket.conditions,
    authorityRefs: decisionPacket.authorityRefs,
    claimRefs: decisionPacket.claimRefs,
    evidenceRefs: decisionPacket.evidenceRefs,
    unresolvedObjectionRefs: decisionPacket.unresolvedObjectionRefs,
    stewardshipOutcomes: decisionPacket.stewardshipOutcomes.map(toDecisionPacketOutcomeSummary),
    allocationAccountingOutcomeEventIds: decisionPacket.allocationAccountingOutcomes.map(
      (outcome) => outcome.eventId
    ),
    timeline: decisionPacket.eventTrail.map((entry) =>
      timelineEntry({
        id: entry.id,
        type: entry.type,
        namespace: entry.namespace,
        occurredAt: entry.occurredAt,
        actorRef: entry.actorRef,
        systemActor: entry.systemActor,
        objectRef: entry.objectRef,
        relatedRefs: entry.relatedRefs,
        authorityRefs: entry.authorityRefs,
        sourceCapability: entry.sourceCapability,
        title: entry.title,
        summary: entry.summary,
        isRedacted: entry.isRedacted,
        isSuperseded: entry.isSuperseded
      })
    ),
    hasRedactions: decisionPacket.redaction.hasRedactions,
    hasSupersessions: decisionPacket.supersession.hasSupersessions,
    projectionRead
  });
}

function buildResourceStewardshipViewModel(
  resourceStewardship: ResourceStewardshipProjection,
  projectionRead: CanopyUiProjectionRead
): CanopyUiResourceStewardshipViewModel {
  return optionalResourceStewardshipViewModel({
    kind: "resource-stewardship",
    resourceRef: resourceStewardship.resourceRef,
    title: resourceStewardship.title,
    summary: resourceStewardship.summary,
    resourceKind: resourceStewardship.resourceKind,
    useRights: resourceStewardship.useRights.map(toResourceUseRightSummary),
    contextEvents: resourceStewardship.contextEvents.map(toResourceContextSummary),
    authorityRefs: resourceStewardship.authorityRefs,
    linkedRefs: resourceStewardship.linkedRefs,
    ecologicalContextIds: resourceStewardship.ecologicalContextIds,
    timeline: resourceStewardship.eventTrail.map((entry) =>
      timelineEntry({
        id: entry.id,
        type: entry.type,
        namespace: entry.namespace,
        occurredAt: entry.occurredAt,
        actorRef: entry.actorRef,
        systemActor: entry.systemActor,
        objectRef: entry.objectRef,
        relatedRefs: entry.relatedRefs,
        authorityRefs: entry.authorityRefs,
        sourceCapability: entry.sourceCapability,
        title: entry.title,
        summary: entry.summary,
        isRedacted: entry.isRedacted,
        isSuperseded: entry.isSuperseded
      })
    ),
    counts: {
      totalEvents: resourceStewardship.counts.totalEvents,
      contextEvents: resourceStewardship.counts.contextEvents,
      proposedUseRights: resourceStewardship.counts.useRights.proposed,
      grantedUseRights: resourceStewardship.counts.useRights.granted,
      revokedUseRights: resourceStewardship.counts.useRights.revoked
    },
    projectionRead
  });
}

function buildFederationExportStateViewModel(
  federationExport: FederationExportEnvelopeReadModel,
  projectionRead: CanopyUiProjectionRead
): CanopyUiFederationExportStateViewModel {
  return optionalFederationExportStateViewModel({
    kind: "federation-export-state",
    status:
      federationExport.preview.federationReadinessWarnings.length === 0 ? "ready" : "attention",
    envelopeId: federationExport.envelope.id,
    exportedAt: federationExport.envelope.exportedAt,
    exportedByRef: federationExport.envelope.exportedByRef,
    scopeRef: federationExport.envelope.scopeRef,
    format: federationExport.envelope.format,
    schemaVersion: federationExport.envelope.schemaVersion,
    contentHash: federationExport.envelope.contentHash,
    includedEventIds: federationExport.preview.eventIds,
    includedObjectRefs: federationExport.preview.includedObjects.map((object) => object.ref),
    includedObjectTypes: federationExport.preview.includedObjectTypes,
    authorityRefs: federationExport.preview.authorityRefs,
    dataStewardshipAgreementRefs: federationExport.preview.dataStewardshipAgreementRefs,
    localMappingIds: federationExport.preview.localMappings.map((mapping) => mapping.id),
    redactionSummary: federationExport.envelope.redactionSummary,
    readinessWarnings: federationExport.preview.federationReadinessWarnings,
    projectionRead
  });
}

function toClaimEvidenceClaimSummary(
  claim: ClaimEvidenceProjection["claims"][number]
): CanopyUiClaimEvidenceClaimSummary {
  return optionalClaimEvidenceClaimSummary({
    claimRef: claim.claimRef,
    status: claim.status,
    title: claim.title,
    summary: claim.summary,
    evidenceRefs: claim.evidenceRefs,
    contestRefs: claim.contests.map((contest) => contest.contestRef),
    authorityRefs: claim.authorityRefs,
    sourceCapabilities: claim.sourceCapabilities,
    aiIndicatorEventIds: claim.aiNonAuthorityIndicators.map((indicator) => indicator.eventId)
  });
}

function toClaimEvidenceEvidenceSummary(
  evidence: ClaimEvidenceProjection["evidence"][number]
): CanopyUiClaimEvidenceEvidenceSummary {
  return optionalClaimEvidenceEvidenceSummary({
    evidenceRef: evidence.evidenceRef,
    title: evidence.title,
    summary: evidence.summary,
    claimRefs: evidence.claimRefs,
    sourceRefs: evidence.sourceRefs,
    authorityRefs: evidence.authorityRefs,
    sourceCapabilities: evidence.sourceCapabilities,
    isAiOrModelOutput: evidence.isAiOrModelOutput
  });
}

function toClaimEvidenceLinkSummary(
  link: ClaimEvidenceProjection["evidenceLinks"][number]
): CanopyUiClaimEvidenceLinkSummary {
  return {
    claimRef: link.claimRef,
    evidenceRef: link.evidenceRef,
    relation: link.relation,
    eventId: link.eventId,
    authorityRefs: link.authorityRefs
  };
}

function toClaimEvidenceAiIndicator(
  indicator: ClaimEvidenceProjection["aiNonAuthorityIndicators"][number]
): CanopyUiClaimEvidenceAiIndicator {
  return {
    eventId: indicator.eventId,
    objectRef: indicator.objectRef,
    relatedClaimRefs: indicator.relatedClaimRefs,
    reason: indicator.reason,
    sourceCapability: indicator.sourceCapability
  };
}

function toClaimEvidenceContestSummary(
  contest: ClaimEvidenceProjection["contests"][number]
): CanopyUiClaimEvidenceContestSummary {
  return {
    claimRef: contest.claimRef,
    contestRef: contest.contestRef,
    eventId: contest.eventId,
    occurredAt: contest.occurredAt,
    evidenceRefs: contest.evidenceRefs,
    authorityRefs: contest.authorityRefs,
    sourceCapability: contest.sourceCapability
  };
}

function toDecisionPacketOutcomeSummary(
  outcome: DecisionPacketProjection["stewardshipOutcomes"][number]
): CanopyUiDecisionPacketOutcomeSummary {
  return optionalDecisionPacketOutcomeSummary({
    ref: outcome.ref,
    eventId: outcome.eventId,
    type: outcome.type,
    state: outcome.state,
    holderRef: outcome.holderRef,
    resourceRef: outcome.resourceRef,
    permissions: outcome.permissions,
    conditions: outcome.conditions
  });
}

function toResourceUseRightSummary(
  useRight: ResourceStewardshipProjection["useRights"][number]
): CanopyUiResourceUseRightSummary {
  return optionalResourceUseRightSummary({
    useRightRef: useRight.useRightRef,
    state: useRight.state,
    holderRef: useRight.holderRef,
    resourceRef: useRight.resourceRef,
    permissions: useRight.permissions,
    conditions: useRight.conditions,
    decisionRefs: useRight.decisionRefs,
    authorityRefs: useRight.authorityRefs,
    latestEventId: useRight.latestEventId,
    latestEventAt: useRight.latestEventAt
  });
}

function toResourceContextSummary(
  context: ResourceStewardshipProjection["contextEvents"][number]
): CanopyUiResourceContextSummary {
  return optionalResourceContextSummary({
    eventId: context.eventId,
    occurredAt: context.occurredAt,
    observedAt: context.observedAt,
    contextRef: context.contextRef,
    ecologicalContextIds: context.ecologicalContextIds,
    summary: context.summary
  });
}

function buildImportReviewViewModel(
  dryRun: ImportDryRunResult
): CanopyUiImportReviewViewModel {
  const defaultDisposition = defaultImportReviewDisposition({
    status: dryRun.status
  });

  return {
    kind: "import-review",
    importPlanId: dryRun.importPlanId,
    sourceProject: dryRun.sourceProject,
    sourceTreatment: dryRun.sourceTreatment,
    canonicalNamespace: dryRun.canonicalNamespace,
    status: dryRun.status,
    candidates: dryRun.mappingCandidates.map((candidate, index) =>
      importReviewCandidate({
        id: `import-review.${candidate.source.sourceProject}.${candidate.source.sourceEntity}.${candidate.source.sourceId}.${index}`,
        source: candidate.source,
        canonicalRef: candidate.canonicalRef,
        canonicalType: candidate.canonicalType,
        proposedDisposition: candidate.disposition,
        reviewDisposition: defaultImportReviewDisposition({
          status: dryRun.status,
          candidateDisposition: candidate.disposition,
          confidence: candidate.confidence
        }),
        confidence: candidate.confidence,
        rationale: candidate.rationale,
        requiredRelationships: candidate.requiredRelationships,
        authorityHints: candidate.authorityHints
      })
    ),
    warnings: dryRun.warnings,
    prohibitedOutcomes: dryRun.prohibitedOutcomes,
    candidateEventIds: dryRun.candidateEvents.map((event) => event.id),
    defaultDisposition
  };
}

function projectionReadFor(
  reads: readonly CanopyUiProjectionRead[],
  projectionName: ProjectionRebuilderName,
  targetRef?: ObjectRef
): CanopyUiProjectionRead {
  const targetRead =
    targetRef === undefined
      ? undefined
      : reads.find(
          (read) =>
            read.projectionName === projectionName &&
            read.targetRef !== undefined &&
            sameRef(read.targetRef, targetRef)
        );
  const wholeProjectionRead = reads.find(
    (read) => read.projectionName === projectionName && read.targetRef === undefined
  );
  const materializedRead = reads.find(
    (read) => read.projectionName === projectionName && read.kind === "materialized"
  );
  const fallbackRead = reads.find((read) => read.projectionName === projectionName);

  return (
    targetRead ??
    materializedRead ??
    wholeProjectionRead ??
    fallbackRead ??
    projectionRead({
      kind: "live",
      projectionName,
      sourceEventIds: [],
      processedEventCount: 0,
      freshness: "missing"
    })
  );
}

function provenanceEntriesForEvent(event: CanopyEvent): readonly CanopyUiSourceProvenancePanelViewModel["entries"][number][] {
  const refs = dedupeRefs([event.objectRef, ...event.relatedRefs, ...event.authorityRefs]);

  return refs.map((canonicalRef, index) =>
    provenanceEntry({
      id: `provenance.${event.id}.${index}`,
      eventId: event.id,
      canonicalRef,
      sourceCapability: event.sourceCapability,
      source: canonicalRef.source,
      sourceProject: canonicalRef.source?.sourceProject ?? "canopy",
      visibility: event.visibility,
      dataState: event.dataState
    })
  );
}

function hasFederationSurface(events: readonly CanopyEvent[]): boolean {
  return events.some(
    (event) =>
      event.sourceCapability === "federation" ||
      event.visibility === "federation" ||
      event.type.startsWith("federation.")
  );
}

function isCanopyObjectType(value: string): value is CanopyObjectType {
  return canopyObjectTypes.includes(value as CanopyObjectType);
}

function isBindingEvent(event: CanopyEvent): boolean {
  return (
    event.type === "governance.decision.recorded" ||
    event.type === "stewardship.use_right.granted" ||
    event.type === "allocation.created" ||
    event.type === "accounting.ledger_entry.posted" ||
    event.type === "federation.export.created" ||
    event.type === "federation.export.approved" ||
    event.type === "system.redaction.applied"
  );
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  return [...new Map(refs.map((ref) => [`${ref.namespace}:${ref.type}:${ref.id}`, ref])).values()];
}

function sortedRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  return [...refs].sort((left, right) =>
    `${left.namespace}:${left.type}:${left.id}`.localeCompare(
      `${right.namespace}:${right.type}:${right.id}`
    )
  );
}

const projectionRebuilderNames = [
  "object-page",
  "civic-memory",
  "authority",
  "claim-evidence",
  "resource-stewardship",
  "decision-packet",
  "federation-export"
] as const satisfies readonly ProjectionRebuilderName[];

const canopyObjectTypes = [
  "account",
  "agreement",
  "appeal",
  "budget",
  "claim",
  "commitment",
  "commons",
  "decision",
  "decision-packet",
  "evidence",
  "flow",
  "guardian-review",
  "indicator",
  "issue",
  "ledger-account",
  "ledger-entry",
  "living-system",
  "mandate",
  "model",
  "need",
  "offer",
  "organization",
  "person",
  "place",
  "policy",
  "proposal",
  "resource",
  "role",
  "source",
  "task",
  "threshold",
  "use-right"
] as const satisfies readonly CanopyObjectType[];

function projectionRead(
  read: {
    readonly kind: CanopyUiProjectionRead["kind"];
    readonly projectionName: string;
    readonly documentId?: CanopyId;
    readonly targetRef?: ObjectRef;
    readonly sourceEventIds: readonly CanopyId[];
    readonly processedEventCount: number;
    readonly rebuiltAt?: string;
    readonly freshness: CanopyUiProjectionRead["freshness"];
  }
): CanopyUiProjectionRead {
  const optionalFields: {
    documentId?: CanopyId;
    targetRef?: ObjectRef;
    rebuiltAt?: string;
  } = {};

  if (read.documentId !== undefined) {
    optionalFields.documentId = read.documentId;
  }

  if (read.targetRef !== undefined) {
    optionalFields.targetRef = read.targetRef;
  }

  if (read.rebuiltAt !== undefined) {
    optionalFields.rebuiltAt = read.rebuiltAt;
  }

  return {
    kind: read.kind,
    projectionName: read.projectionName,
    ...optionalFields,
    sourceEventIds: read.sourceEventIds,
    processedEventCount: read.processedEventCount,
    freshness: read.freshness
  };
}

function optionalShellSurfaces(surfaces: {
  readonly objectPage: CanopyUiObjectPageViewModel | undefined;
  readonly civicMemoryStream: CanopyUiCivicMemoryStreamViewModel;
  readonly sourceProvenancePanel: CanopyUiSourceProvenancePanelViewModel;
  readonly authorityTrace: CanopyUiAuthorityTraceViewModel;
  readonly claimEvidence: CanopyUiClaimEvidenceViewModel;
  readonly decisionPacket: CanopyUiDecisionPacketViewModel | undefined;
  readonly resourceStewardship: CanopyUiResourceStewardshipViewModel | undefined;
  readonly federationExportState: CanopyUiFederationExportStateViewModel | undefined;
  readonly importReview: CanopyUiImportReviewViewModel | undefined;
}): CanopyUiShellSurfaces {
  const optionalFields: {
    objectPage?: CanopyUiObjectPageViewModel;
    decisionPacket?: CanopyUiDecisionPacketViewModel;
    resourceStewardship?: CanopyUiResourceStewardshipViewModel;
    federationExportState?: CanopyUiFederationExportStateViewModel;
    importReview?: CanopyUiImportReviewViewModel;
  } = {};

  if (surfaces.objectPage !== undefined) {
    optionalFields.objectPage = surfaces.objectPage;
  }

  if (surfaces.decisionPacket !== undefined) {
    optionalFields.decisionPacket = surfaces.decisionPacket;
  }

  if (surfaces.resourceStewardship !== undefined) {
    optionalFields.resourceStewardship = surfaces.resourceStewardship;
  }

  if (surfaces.federationExportState !== undefined) {
    optionalFields.federationExportState = surfaces.federationExportState;
  }

  if (surfaces.importReview !== undefined) {
    optionalFields.importReview = surfaces.importReview;
  }

  return {
    ...optionalFields,
    civicMemoryStream: surfaces.civicMemoryStream,
    sourceProvenancePanel: surfaces.sourceProvenancePanel,
    authorityTrace: surfaces.authorityTrace,
    claimEvidence: surfaces.claimEvidence
  };
}

function optionalObjectPageViewModel(
  viewModel: Omit<CanopyUiObjectPageViewModel, "title" | "summary"> & {
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
  }
): CanopyUiObjectPageViewModel {
  const optionalFields: {
    title?: string;
    summary?: string;
  } = {};

  if (viewModel.title !== undefined) {
    optionalFields.title = viewModel.title;
  }

  if (viewModel.summary !== undefined) {
    optionalFields.summary = viewModel.summary;
  }

  return {
    kind: viewModel.kind,
    objectRef: viewModel.objectRef,
    ...optionalFields,
    timeline: viewModel.timeline,
    relatedRefs: viewModel.relatedRefs,
    authorityRefs: viewModel.authorityRefs,
    sourceCapabilities: viewModel.sourceCapabilities,
    projectionRead: viewModel.projectionRead
  };
}

function timelineEntry(
  entry: Omit<
    CanopyUiTimelineEntry,
    "actorRef" | "systemActor" | "title" | "summary" | "dataState" | "visibility"
  > & {
    readonly actorRef?: ObjectRef | undefined;
    readonly systemActor?: string | undefined;
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
    readonly dataState?: string | undefined;
    readonly visibility?: string | undefined;
  }
): CanopyUiTimelineEntry {
  const optionalFields: {
    actorRef?: ObjectRef;
    systemActor?: string;
    title?: string;
    summary?: string;
    dataState?: string;
    visibility?: string;
  } = {};

  if (entry.actorRef !== undefined) {
    optionalFields.actorRef = entry.actorRef;
  }

  if (entry.systemActor !== undefined) {
    optionalFields.systemActor = entry.systemActor;
  }

  if (entry.title !== undefined) {
    optionalFields.title = entry.title;
  }

  if (entry.summary !== undefined) {
    optionalFields.summary = entry.summary;
  }

  if (entry.dataState !== undefined) {
    optionalFields.dataState = entry.dataState;
  }

  if (entry.visibility !== undefined) {
    optionalFields.visibility = entry.visibility;
  }

  return {
    id: entry.id,
    type: entry.type,
    namespace: entry.namespace,
    occurredAt: entry.occurredAt,
    ...optionalFields,
    objectRef: entry.objectRef,
    relatedRefs: entry.relatedRefs,
    authorityRefs: entry.authorityRefs,
    sourceCapability: entry.sourceCapability,
    isRedacted: entry.isRedacted,
    isSuperseded: entry.isSuperseded
  };
}

function provenanceEntry(
  entry: Omit<CanopyUiSourceProvenancePanelViewModel["entries"][number], "source" | "sourceProject" | "dataState"> & {
    readonly source?: CanopyUiSourceProvenancePanelViewModel["entries"][number]["source"] | undefined;
    readonly sourceProject?: CanopyUiSourceProvenancePanelViewModel["entries"][number]["sourceProject"] | undefined;
    readonly dataState?: string | undefined;
  }
): CanopyUiSourceProvenancePanelViewModel["entries"][number] {
  const optionalFields: {
    source?: NonNullable<CanopyUiSourceProvenancePanelViewModel["entries"][number]["source"]>;
    sourceProject?: NonNullable<CanopyUiSourceProvenancePanelViewModel["entries"][number]["sourceProject"]>;
    dataState?: string;
  } = {};

  if (entry.source !== undefined) {
    optionalFields.source = entry.source;
  }

  if (entry.sourceProject !== undefined) {
    optionalFields.sourceProject = entry.sourceProject;
  }

  if (entry.dataState !== undefined) {
    optionalFields.dataState = entry.dataState;
  }

  return {
    id: entry.id,
    eventId: entry.eventId,
    canonicalRef: entry.canonicalRef,
    sourceCapability: entry.sourceCapability,
    ...optionalFields,
    visibility: entry.visibility
  };
}

function authorityTraceEvent(
  event: Omit<CanopyUiAuthorityTraceEvent, "actorRef"> & {
    readonly actorRef?: ObjectRef | undefined;
  }
): CanopyUiAuthorityTraceEvent {
  const optionalFields: {
    actorRef?: ObjectRef;
  } = {};

  if (event.actorRef !== undefined) {
    optionalFields.actorRef = event.actorRef;
  }

  return {
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt,
    relevance: event.relevance,
    ...optionalFields,
    objectRef: event.objectRef,
    relatedRefs: event.relatedRefs,
    authorityRefs: event.authorityRefs,
    isBinding: event.isBinding,
    hasAuthority: event.hasAuthority
  };
}

function optionalAuthorityTraceViewModel(
  viewModel: Omit<CanopyUiAuthorityTraceViewModel, "objectRef"> & {
    readonly objectRef?: ObjectRef | undefined;
  }
): CanopyUiAuthorityTraceViewModel {
  const optionalFields: {
    objectRef?: ObjectRef;
  } = {};

  if (viewModel.objectRef !== undefined) {
    optionalFields.objectRef = viewModel.objectRef;
  }

  return {
    kind: viewModel.kind,
    ...optionalFields,
    status: viewModel.status,
    authorityRefs: viewModel.authorityRefs,
    events: viewModel.events,
    findings: viewModel.findings,
    projectionRead: viewModel.projectionRead
  };
}

function optionalClaimEvidenceViewModel(
  viewModel: Omit<
    CanopyUiClaimEvidenceViewModel,
    "selectedClaim" | "selectedEvidence"
  > & {
    readonly selectedClaim?: CanopyUiClaimEvidenceClaimSummary | undefined;
    readonly selectedEvidence?: CanopyUiClaimEvidenceEvidenceSummary | undefined;
  }
): CanopyUiClaimEvidenceViewModel {
  const optionalFields: {
    selectedClaim?: CanopyUiClaimEvidenceClaimSummary;
    selectedEvidence?: CanopyUiClaimEvidenceEvidenceSummary;
  } = {};

  if (viewModel.selectedClaim !== undefined) {
    optionalFields.selectedClaim = viewModel.selectedClaim;
  }

  if (viewModel.selectedEvidence !== undefined) {
    optionalFields.selectedEvidence = viewModel.selectedEvidence;
  }

  return {
    kind: viewModel.kind,
    ...optionalFields,
    claims: viewModel.claims,
    evidence: viewModel.evidence,
    links: viewModel.links,
    contests: viewModel.contests,
    aiNonAuthorityIndicators: viewModel.aiNonAuthorityIndicators,
    counts: viewModel.counts,
    projectionRead: viewModel.projectionRead
  };
}

function optionalClaimEvidenceClaimSummary(
  claim: Omit<CanopyUiClaimEvidenceClaimSummary, "title" | "summary"> & {
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
  }
): CanopyUiClaimEvidenceClaimSummary {
  const optionalFields: {
    title?: string;
    summary?: string;
  } = {};

  if (claim.title !== undefined) {
    optionalFields.title = claim.title;
  }

  if (claim.summary !== undefined) {
    optionalFields.summary = claim.summary;
  }

  return {
    claimRef: claim.claimRef,
    status: claim.status,
    ...optionalFields,
    evidenceRefs: claim.evidenceRefs,
    contestRefs: claim.contestRefs,
    authorityRefs: claim.authorityRefs,
    sourceCapabilities: claim.sourceCapabilities,
    aiIndicatorEventIds: claim.aiIndicatorEventIds
  };
}

function optionalClaimEvidenceEvidenceSummary(
  evidence: Omit<CanopyUiClaimEvidenceEvidenceSummary, "title" | "summary"> & {
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
  }
): CanopyUiClaimEvidenceEvidenceSummary {
  const optionalFields: {
    title?: string;
    summary?: string;
  } = {};

  if (evidence.title !== undefined) {
    optionalFields.title = evidence.title;
  }

  if (evidence.summary !== undefined) {
    optionalFields.summary = evidence.summary;
  }

  return {
    evidenceRef: evidence.evidenceRef,
    ...optionalFields,
    claimRefs: evidence.claimRefs,
    sourceRefs: evidence.sourceRefs,
    authorityRefs: evidence.authorityRefs,
    sourceCapabilities: evidence.sourceCapabilities,
    isAiOrModelOutput: evidence.isAiOrModelOutput
  };
}

function optionalDecisionPacketViewModel(
  viewModel: Omit<
    CanopyUiDecisionPacketViewModel,
    "packetRef" | "status" | "outcome" | "rationale"
  > & {
    readonly packetRef?: ObjectRef | undefined;
    readonly status?: string | undefined;
    readonly outcome?: string | undefined;
    readonly rationale?: string | undefined;
  }
): CanopyUiDecisionPacketViewModel {
  const optionalFields: {
    packetRef?: ObjectRef;
    status?: string;
    outcome?: string;
    rationale?: string;
  } = {};

  if (viewModel.packetRef !== undefined) {
    optionalFields.packetRef = viewModel.packetRef;
  }

  if (viewModel.status !== undefined) {
    optionalFields.status = viewModel.status;
  }

  if (viewModel.outcome !== undefined) {
    optionalFields.outcome = viewModel.outcome;
  }

  if (viewModel.rationale !== undefined) {
    optionalFields.rationale = viewModel.rationale;
  }

  return {
    kind: viewModel.kind,
    decisionRef: viewModel.decisionRef,
    ...optionalFields,
    conditions: viewModel.conditions,
    authorityRefs: viewModel.authorityRefs,
    claimRefs: viewModel.claimRefs,
    evidenceRefs: viewModel.evidenceRefs,
    unresolvedObjectionRefs: viewModel.unresolvedObjectionRefs,
    stewardshipOutcomes: viewModel.stewardshipOutcomes,
    allocationAccountingOutcomeEventIds: viewModel.allocationAccountingOutcomeEventIds,
    timeline: viewModel.timeline,
    hasRedactions: viewModel.hasRedactions,
    hasSupersessions: viewModel.hasSupersessions,
    projectionRead: viewModel.projectionRead
  };
}

function optionalDecisionPacketOutcomeSummary(
  outcome: Omit<
    CanopyUiDecisionPacketOutcomeSummary,
    "state" | "holderRef" | "resourceRef"
  > & {
    readonly state?: string | undefined;
    readonly holderRef?: ObjectRef | undefined;
    readonly resourceRef?: ObjectRef | undefined;
  }
): CanopyUiDecisionPacketOutcomeSummary {
  const optionalFields: {
    state?: string;
    holderRef?: ObjectRef;
    resourceRef?: ObjectRef;
  } = {};

  if (outcome.state !== undefined) {
    optionalFields.state = outcome.state;
  }

  if (outcome.holderRef !== undefined) {
    optionalFields.holderRef = outcome.holderRef;
  }

  if (outcome.resourceRef !== undefined) {
    optionalFields.resourceRef = outcome.resourceRef;
  }

  return {
    ref: outcome.ref,
    eventId: outcome.eventId,
    type: outcome.type,
    ...optionalFields,
    permissions: outcome.permissions,
    conditions: outcome.conditions
  };
}

function optionalResourceStewardshipViewModel(
  viewModel: Omit<
    CanopyUiResourceStewardshipViewModel,
    "title" | "summary" | "resourceKind"
  > & {
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
    readonly resourceKind?: string | undefined;
  }
): CanopyUiResourceStewardshipViewModel {
  const optionalFields: {
    title?: string;
    summary?: string;
    resourceKind?: string;
  } = {};

  if (viewModel.title !== undefined) {
    optionalFields.title = viewModel.title;
  }

  if (viewModel.summary !== undefined) {
    optionalFields.summary = viewModel.summary;
  }

  if (viewModel.resourceKind !== undefined) {
    optionalFields.resourceKind = viewModel.resourceKind;
  }

  return {
    kind: viewModel.kind,
    resourceRef: viewModel.resourceRef,
    ...optionalFields,
    useRights: viewModel.useRights,
    contextEvents: viewModel.contextEvents,
    authorityRefs: viewModel.authorityRefs,
    linkedRefs: viewModel.linkedRefs,
    ecologicalContextIds: viewModel.ecologicalContextIds,
    timeline: viewModel.timeline,
    counts: viewModel.counts,
    projectionRead: viewModel.projectionRead
  };
}

function optionalResourceUseRightSummary(
  useRight: Omit<CanopyUiResourceUseRightSummary, "holderRef"> & {
    readonly holderRef?: ObjectRef | undefined;
  }
): CanopyUiResourceUseRightSummary {
  const optionalFields: {
    holderRef?: ObjectRef;
  } = {};

  if (useRight.holderRef !== undefined) {
    optionalFields.holderRef = useRight.holderRef;
  }

  return {
    useRightRef: useRight.useRightRef,
    state: useRight.state,
    ...optionalFields,
    resourceRef: useRight.resourceRef,
    permissions: useRight.permissions,
    conditions: useRight.conditions,
    decisionRefs: useRight.decisionRefs,
    authorityRefs: useRight.authorityRefs,
    latestEventId: useRight.latestEventId,
    latestEventAt: useRight.latestEventAt
  };
}

function optionalResourceContextSummary(
  context: Omit<CanopyUiResourceContextSummary, "observedAt" | "contextRef"> & {
    readonly observedAt?: string | undefined;
    readonly contextRef?: ObjectRef | undefined;
  }
): CanopyUiResourceContextSummary {
  const optionalFields: {
    observedAt?: string;
    contextRef?: ObjectRef;
  } = {};

  if (context.observedAt !== undefined) {
    optionalFields.observedAt = context.observedAt;
  }

  if (context.contextRef !== undefined) {
    optionalFields.contextRef = context.contextRef;
  }

  return {
    eventId: context.eventId,
    occurredAt: context.occurredAt,
    ...optionalFields,
    ecologicalContextIds: context.ecologicalContextIds,
    summary: context.summary
  };
}

function optionalFederationExportStateViewModel(
  viewModel: Omit<CanopyUiFederationExportStateViewModel, "redactionSummary"> & {
    readonly redactionSummary?: CanopyUiFederationExportStateViewModel["redactionSummary"] | undefined;
  }
): CanopyUiFederationExportStateViewModel {
  const optionalFields: {
    redactionSummary?: NonNullable<CanopyUiFederationExportStateViewModel["redactionSummary"]>;
  } = {};

  if (viewModel.redactionSummary !== undefined) {
    optionalFields.redactionSummary = viewModel.redactionSummary;
  }

  return {
    kind: viewModel.kind,
    status: viewModel.status,
    envelopeId: viewModel.envelopeId,
    exportedAt: viewModel.exportedAt,
    exportedByRef: viewModel.exportedByRef,
    scopeRef: viewModel.scopeRef,
    format: viewModel.format,
    schemaVersion: viewModel.schemaVersion,
    contentHash: viewModel.contentHash,
    includedEventIds: viewModel.includedEventIds,
    includedObjectRefs: viewModel.includedObjectRefs,
    includedObjectTypes: viewModel.includedObjectTypes,
    authorityRefs: viewModel.authorityRefs,
    dataStewardshipAgreementRefs: viewModel.dataStewardshipAgreementRefs,
    localMappingIds: viewModel.localMappingIds,
    projectionRead: viewModel.projectionRead,
    ...optionalFields,
    readinessWarnings: viewModel.readinessWarnings
  };
}

function importReviewCandidate(
  candidate: CanopyUiImportReviewCandidate
): CanopyUiImportReviewCandidate {
  return candidate;
}

function toAuthorityFinding(finding: AuthorityProjection["findings"][number]): CanopyUiAuthorityFinding {
  return {
    kind: finding.kind,
    eventId: finding.eventId,
    eventType: finding.eventType,
    objectRef: finding.objectRef,
    authorityRefs: finding.authorityRefs,
    message: finding.message
  };
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return left.namespace === right.namespace && left.type === right.type && left.id === right.id;
}

function eventNamespace(eventType: CanopyEvent["type"]): CanopyEventNamespace {
  return eventType.split(".")[0] as CanopyEventNamespace;
}

function sortedStrings<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort();
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function optionalShellSnapshot(
  snapshot: {
    readonly app: typeof canopyShellApp;
    readonly activeMode: CanopyShellMode;
    readonly scope: CanopyShellScope;
    readonly selectedObjectRef: ObjectRef | undefined;
    readonly objectPage: ObjectPageProjection | undefined;
    readonly civicMemory: CivicMemoryProjection;
    readonly authority: AuthorityProjection;
    readonly claimEvidence: ClaimEvidenceProjection;
    readonly decisionPacket: DecisionPacketProjection | undefined;
    readonly federationExport: FederationExportEnvelopeReadModel | undefined;
    readonly resourceStewardship: ResourceStewardshipProjection | undefined;
    readonly availableModes: readonly CanopyShellMode[];
    readonly sourceCapabilities: readonly CanopyCapability[];
    readonly eventNamespaces: readonly CanopyEventNamespace[];
    readonly attention: readonly CanopyShellAttentionItem[];
    readonly commands: readonly CanopyShellCommand[];
    readonly legacyProjectNavigation: readonly never[];
    readonly projectionReads: readonly CanopyUiProjectionRead[];
    readonly surfaces: CanopyUiShellSurfaces;
  }
): CanopyShellSnapshot {
  const optionalFields: {
    selectedObjectRef?: ObjectRef;
    objectPage?: ObjectPageProjection;
    decisionPacket?: DecisionPacketProjection;
    federationExport?: FederationExportEnvelopeReadModel;
    resourceStewardship?: ResourceStewardshipProjection;
  } = {};

  if (snapshot.selectedObjectRef !== undefined) {
    optionalFields.selectedObjectRef = snapshot.selectedObjectRef;
  }

  if (snapshot.objectPage !== undefined) {
    optionalFields.objectPage = snapshot.objectPage;
  }

  if (snapshot.decisionPacket !== undefined) {
    optionalFields.decisionPacket = snapshot.decisionPacket;
  }

  if (snapshot.federationExport !== undefined) {
    optionalFields.federationExport = snapshot.federationExport;
  }

  if (snapshot.resourceStewardship !== undefined) {
    optionalFields.resourceStewardship = snapshot.resourceStewardship;
  }

  return {
    app: snapshot.app,
    activeMode: snapshot.activeMode,
    scope: snapshot.scope,
    ...optionalFields,
    civicMemory: snapshot.civicMemory,
    authority: snapshot.authority,
    claimEvidence: snapshot.claimEvidence,
    availableModes: snapshot.availableModes,
    sourceCapabilities: snapshot.sourceCapabilities,
    eventNamespaces: snapshot.eventNamespaces,
    attention: snapshot.attention,
    commands: snapshot.commands,
    legacyProjectNavigation: snapshot.legacyProjectNavigation,
    projectionReads: snapshot.projectionReads,
    surfaces: snapshot.surfaces
  };
}

function optionalProjectionRebuildOptions(
  options: {
    readonly events: readonly CanopyEvent[];
    readonly rebuiltAt: string | undefined;
    readonly materializedProjectionStore: MaterializedProjectionStore | undefined;
  }
): PersistentProjectionRebuildOptions {
  const optionalFields: {
    rebuiltAt?: string;
    materializedProjections?: MaterializedProjectionStore;
  } = {};

  if (options.rebuiltAt !== undefined) {
    optionalFields.rebuiltAt = options.rebuiltAt;
  }

  if (options.materializedProjectionStore !== undefined) {
    optionalFields.materializedProjections = options.materializedProjectionStore;
  }

  return { events: options.events, ...optionalFields };
}

function optionalShellSnapshotInput(
  input: {
    readonly events: readonly CanopyEvent[];
    readonly scope: CanopyShellScope;
    readonly selectedObjectRef: ObjectRef | undefined;
    readonly activeMode: CanopyShellMode | undefined;
    readonly materializedProjections: readonly MaterializedProjectionDocument[];
    readonly importDryRun: ImportDryRunResult | undefined;
  }
): BuildCanopyShellSnapshotInput {
  const optionalFields: {
    selectedObjectRef?: ObjectRef;
    activeMode?: CanopyShellMode;
    materializedProjections?: readonly MaterializedProjectionDocument[];
    importDryRun?: ImportDryRunResult;
  } = {};

  if (input.selectedObjectRef !== undefined) {
    optionalFields.selectedObjectRef = input.selectedObjectRef;
  }

  if (input.activeMode !== undefined) {
    optionalFields.activeMode = input.activeMode;
  }

  if (input.materializedProjections.length > 0) {
    optionalFields.materializedProjections = input.materializedProjections;
  }

  if (input.importDryRun !== undefined) {
    optionalFields.importDryRun = input.importDryRun;
  }

  return {
    events: input.events,
    scope: input.scope,
    ...optionalFields
  };
}

function optionalPersistedShellSnapshotInput(
  input: {
    readonly runtime: CanonicalPersistenceRuntime;
    readonly scope: CanopyShellScope;
    readonly selectedObjectRef: ObjectRef | undefined;
    readonly activeMode: CanopyShellMode | undefined;
    readonly persistProjectionState: boolean | undefined;
    readonly rebuiltAt: string | undefined;
    readonly materializedProjections: readonly MaterializedProjectionDocument[] | undefined;
    readonly materializedProjectionStore: MaterializedProjectionStore | undefined;
    readonly importDryRun: ImportDryRunResult | undefined;
  }
): BuildPersistedCanopyShellSnapshotInput {
  const optionalFields: {
    selectedObjectRef?: ObjectRef;
    activeMode?: CanopyShellMode;
    persistProjectionState?: boolean;
    rebuiltAt?: string;
    materializedProjections?: readonly MaterializedProjectionDocument[];
    materializedProjectionStore?: MaterializedProjectionStore;
    importDryRun?: ImportDryRunResult;
  } = {};

  if (input.selectedObjectRef !== undefined) {
    optionalFields.selectedObjectRef = input.selectedObjectRef;
  }

  if (input.activeMode !== undefined) {
    optionalFields.activeMode = input.activeMode;
  }

  if (input.persistProjectionState !== undefined) {
    optionalFields.persistProjectionState = input.persistProjectionState;
  }

  if (input.rebuiltAt !== undefined) {
    optionalFields.rebuiltAt = input.rebuiltAt;
  }

  if (input.materializedProjections !== undefined) {
    optionalFields.materializedProjections = input.materializedProjections;
  }

  if (input.materializedProjectionStore !== undefined) {
    optionalFields.materializedProjectionStore = input.materializedProjectionStore;
  }

  if (input.importDryRun !== undefined) {
    optionalFields.importDryRun = input.importDryRun;
  }

  return {
    runtime: input.runtime,
    scope: input.scope,
    ...optionalFields
  };
}

function optionalPersistedShellResult(
  result: {
    readonly snapshot: CanopyShellSnapshot;
    readonly sourceEventIds: readonly CanopyId[];
    readonly projectionRebuild: PersistentProjectionRebuildResult | undefined;
    readonly persistedProjectionStateIds: readonly CanopyId[];
  }
): PersistedCanopyShellSnapshotResult {
  const optionalFields: {
    projectionRebuild?: PersistentProjectionRebuildResult;
  } = {};

  if (result.projectionRebuild !== undefined) {
    optionalFields.projectionRebuild = result.projectionRebuild;
  }

  return {
    snapshot: result.snapshot,
    sourceEventIds: result.sourceEventIds,
    ...optionalFields,
    persistedProjectionStateIds: result.persistedProjectionStateIds
  };
}

function optionalPersistedShellSessionResult(
  result: {
    readonly snapshot: CanopyShellSnapshot;
    readonly sourceEventIds: readonly CanopyId[];
    readonly projectionRebuild: PersistentProjectionRebuildResult | undefined;
    readonly persistedProjectionStateIds: readonly CanopyId[];
    readonly session: CanopyShellSession;
  }
): PersistedCanopyShellSessionResult {
  const optionalFields: {
    projectionRebuild?: PersistentProjectionRebuildResult;
  } = {};

  if (result.projectionRebuild !== undefined) {
    optionalFields.projectionRebuild = result.projectionRebuild;
  }

  return {
    snapshot: result.snapshot,
    sourceEventIds: result.sourceEventIds,
    ...optionalFields,
    persistedProjectionStateIds: result.persistedProjectionStateIds,
    session: result.session
  };
}

function optionalPersistedShellCommandExecution(
  result: {
    readonly status: CanopyUiShellCommandResult["status"];
    readonly command: string;
    readonly message: string;
    readonly screen: CanopyUiShellScreen;
    readonly session: CanopyShellSession;
    readonly sourceEventIds: readonly CanopyId[];
    readonly projectionRebuild: PersistentProjectionRebuildResult | undefined;
    readonly persistedProjectionStateIds: readonly CanopyId[];
  }
): PersistedCanopyShellCommandExecution {
  const optionalFields: {
    projectionRebuild?: PersistentProjectionRebuildResult;
  } = {};

  if (result.projectionRebuild !== undefined) {
    optionalFields.projectionRebuild = result.projectionRebuild;
  }

  return {
    status: result.status,
    command: result.command,
    message: result.message,
    screen: result.screen,
    session: result.session,
    sourceEventIds: result.sourceEventIds,
    ...optionalFields,
    persistedProjectionStateIds: result.persistedProjectionStateIds
  };
}
