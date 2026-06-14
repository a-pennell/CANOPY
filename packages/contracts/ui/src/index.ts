import type {
  CanopyCapability,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
  SourceProject
} from "@canopy/contracts-kernel";

export type CanopyUiSurfaceKind =
  | "object-page"
  | "civic-memory-stream"
  | "source-provenance-panel"
  | "authority-trace"
  | "import-review";

export type CanopyUiProjectionReadKind = "live" | "materialized";

export type CanopyUiProjectionFreshness = "current" | "stale" | "missing";

export type CanopyUiImportReviewDisposition =
  | "accept"
  | "reject"
  | "needs-review"
  | "defer";

export interface CanopyUiProjectionRead {
  readonly kind: CanopyUiProjectionReadKind;
  readonly projectionName: string;
  readonly documentId?: CanopyId;
  readonly targetRef?: ObjectRef;
  readonly sourceEventIds: readonly CanopyId[];
  readonly processedEventCount: number;
  readonly rebuiltAt?: IsoDateTime;
  readonly freshness: CanopyUiProjectionFreshness;
}

export interface CanopyUiTimelineEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: string;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapability: CanopyCapability;
  readonly title?: string;
  readonly summary?: string;
  readonly dataState?: string;
  readonly visibility?: string;
  readonly isRedacted: boolean;
  readonly isSuperseded: boolean;
}

export interface CanopyUiObjectPageViewModel {
  readonly kind: "object-page";
  readonly objectRef: ObjectRef;
  readonly title?: string;
  readonly summary?: string;
  readonly timeline: readonly CanopyUiTimelineEntry[];
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiCivicMemoryStreamViewModel {
  readonly kind: "civic-memory-stream";
  readonly scopeLabel: string;
  readonly timeline: readonly CanopyUiTimelineEntry[];
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly namespaceCounts: readonly CanopyUiNamespaceCount[];
  readonly capabilityCounts: readonly CanopyUiCapabilityCount[];
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiNamespaceCount {
  readonly namespace: CanopyEventNamespace;
  readonly count: number;
}

export interface CanopyUiCapabilityCount {
  readonly capability: CanopyCapability;
  readonly count: number;
}

export interface CanopyUiProvenanceEntry {
  readonly id: CanopyId;
  readonly eventId: CanopyId;
  readonly canonicalRef: ObjectRef;
  readonly sourceCapability: CanopyCapability;
  readonly source?: LocalSourcePointer;
  readonly sourceProject?: SourceProject;
  readonly visibility: string;
  readonly dataState?: string;
}

export interface CanopyUiSourceProvenancePanelViewModel {
  readonly kind: "source-provenance-panel";
  readonly sourceTreatment: "native-canopy" | "folded-source";
  readonly entries: readonly CanopyUiProvenanceEntry[];
  readonly sourceProjects: readonly SourceProject[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly eventNamespaces: readonly CanopyEventNamespace[];
}

export interface CanopyUiAuthorityTraceEvent {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly occurredAt: IsoDateTime;
  readonly relevance: "object" | "related" | "authority";
  readonly actorRef?: ObjectRef;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly isBinding: boolean;
  readonly hasAuthority: boolean;
}

export interface CanopyUiAuthorityFinding {
  readonly kind: string;
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly message: string;
}

export interface CanopyUiAuthorityTraceViewModel {
  readonly kind: "authority-trace";
  readonly objectRef?: ObjectRef;
  readonly status: "ok" | "attention" | "denied";
  readonly authorityRefs: readonly ObjectRef[];
  readonly events: readonly CanopyUiAuthorityTraceEvent[];
  readonly findings: readonly CanopyUiAuthorityFinding[];
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiImportReviewCandidate {
  readonly id: CanopyId;
  readonly source: LocalSourcePointer;
  readonly canonicalRef: ObjectRef;
  readonly canonicalType: CanopyObjectType;
  readonly proposedDisposition: "create" | "alias" | "needs-review";
  readonly reviewDisposition: CanopyUiImportReviewDisposition;
  readonly confidence: "high" | "medium" | "low";
  readonly rationale: string;
  readonly requiredRelationships: readonly string[];
  readonly authorityHints: readonly string[];
}

export interface CanopyUiImportReviewWarning {
  readonly code: string;
  readonly severity: "info" | "warning" | "blocker";
  readonly message: string;
  readonly source?: LocalSourcePointer;
}

export interface CanopyUiImportReviewProhibitedOutcome {
  readonly outcome: string;
  readonly reason: string;
  readonly triggeredBy: string;
  readonly source?: LocalSourcePointer;
}

export interface CanopyUiImportReviewViewModel {
  readonly kind: "import-review";
  readonly importPlanId: string;
  readonly sourceProject: SourceProject;
  readonly sourceTreatment: "folded-source";
  readonly canonicalNamespace: "canopy";
  readonly status: "pass" | "warn" | "blocked";
  readonly candidates: readonly CanopyUiImportReviewCandidate[];
  readonly warnings: readonly CanopyUiImportReviewWarning[];
  readonly prohibitedOutcomes: readonly CanopyUiImportReviewProhibitedOutcome[];
  readonly candidateEventIds: readonly CanopyId[];
  readonly defaultDisposition: CanopyUiImportReviewDisposition;
}

export interface CanopyUiShellSurfaces {
  readonly objectPage?: CanopyUiObjectPageViewModel;
  readonly civicMemoryStream: CanopyUiCivicMemoryStreamViewModel;
  readonly sourceProvenancePanel: CanopyUiSourceProvenancePanelViewModel;
  readonly authorityTrace: CanopyUiAuthorityTraceViewModel;
  readonly importReview?: CanopyUiImportReviewViewModel;
}

export const defaultImportReviewDisposition = (input: {
  readonly status: "pass" | "warn" | "blocked";
  readonly candidateDisposition?: "create" | "alias" | "needs-review";
  readonly confidence?: "high" | "medium" | "low";
}): CanopyUiImportReviewDisposition => {
  if (input.status === "blocked") {
    return "reject";
  }

  if (input.candidateDisposition === "needs-review" || input.confidence === "low") {
    return "needs-review";
  }

  if (input.status === "warn" || input.confidence === "medium") {
    return "defer";
  }

  return "accept";
};
