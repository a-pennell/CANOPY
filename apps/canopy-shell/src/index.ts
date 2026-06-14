import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyId,
  ObjectRef
} from "@canopy/contracts-kernel";
import type {
  CanopyUiAuthorityFinding,
  CanopyUiAuthorityTraceEvent,
  CanopyUiAuthorityTraceViewModel,
  CanopyUiCivicMemoryStreamViewModel,
  CanopyUiImportReviewCandidate,
  CanopyUiImportReviewViewModel,
  CanopyUiObjectPageViewModel,
  CanopyUiProjectionRead,
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

const projectionRebuilderNames = [
  "object-page",
  "civic-memory",
  "authority",
  "claim-evidence",
  "resource-stewardship",
  "decision-packet"
] as const satisfies readonly ProjectionRebuilderName[];

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
  readonly importReview: CanopyUiImportReviewViewModel | undefined;
}): CanopyUiShellSurfaces {
  const optionalFields: {
    objectPage?: CanopyUiObjectPageViewModel;
    importReview?: CanopyUiImportReviewViewModel;
  } = {};

  if (surfaces.objectPage !== undefined) {
    optionalFields.objectPage = surfaces.objectPage;
  }

  if (surfaces.importReview !== undefined) {
    optionalFields.importReview = surfaces.importReview;
  }

  return {
    ...optionalFields,
    civicMemoryStream: surfaces.civicMemoryStream,
    sourceProvenancePanel: surfaces.sourceProvenancePanel,
    authorityTrace: surfaces.authorityTrace
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
