import type {
  CanopyCapability,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  ContentHash,
  ExportFormat,
  ImportWarning,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
  RedactionSummary,
  SourceProject
} from "@canopy/contracts-kernel";

export type CanopyUiSurfaceKind =
  | "object-page"
  | "civic-memory-stream"
  | "source-provenance-panel"
  | "authority-trace"
  | "claim-evidence"
  | "decision-packet"
  | "resource-stewardship"
  | "federation-export-state"
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

export interface CanopyUiClaimEvidenceClaimSummary {
  readonly claimRef: ObjectRef;
  readonly status: string;
  readonly title?: string;
  readonly summary?: string;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly aiIndicatorEventIds: readonly CanopyId[];
}

export interface CanopyUiClaimEvidenceEvidenceSummary {
  readonly evidenceRef: ObjectRef;
  readonly title?: string;
  readonly summary?: string;
  readonly claimRefs: readonly ObjectRef[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly isAiOrModelOutput: boolean;
}

export interface CanopyUiClaimEvidenceLinkSummary {
  readonly claimRef: ObjectRef;
  readonly evidenceRef: ObjectRef;
  readonly relation: string;
  readonly eventId: CanopyId;
  readonly authorityRefs: readonly ObjectRef[];
}

export interface CanopyUiClaimEvidenceAiIndicator {
  readonly eventId: CanopyId;
  readonly objectRef: ObjectRef;
  readonly relatedClaimRefs: readonly ObjectRef[];
  readonly reason: string;
  readonly sourceCapability: CanopyCapability;
}

export interface CanopyUiClaimEvidenceViewModel {
  readonly kind: "claim-evidence";
  readonly selectedClaim?: CanopyUiClaimEvidenceClaimSummary;
  readonly selectedEvidence?: CanopyUiClaimEvidenceEvidenceSummary;
  readonly claims: readonly CanopyUiClaimEvidenceClaimSummary[];
  readonly evidence: readonly CanopyUiClaimEvidenceEvidenceSummary[];
  readonly links: readonly CanopyUiClaimEvidenceLinkSummary[];
  readonly aiNonAuthorityIndicators: readonly CanopyUiClaimEvidenceAiIndicator[];
  readonly counts: {
    readonly claims: number;
    readonly evidence: number;
    readonly evidenceLinks: number;
    readonly reviews: number;
    readonly contests: number;
    readonly aiNonAuthorityIndicators: number;
  };
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiDecisionPacketOutcomeSummary {
  readonly ref: ObjectRef;
  readonly eventId: CanopyId;
  readonly type: CanopyEventType;
  readonly state?: string;
  readonly holderRef?: ObjectRef;
  readonly resourceRef?: ObjectRef;
  readonly permissions: readonly string[];
  readonly conditions: readonly string[];
}

export interface CanopyUiDecisionPacketViewModel {
  readonly kind: "decision-packet";
  readonly decisionRef: ObjectRef;
  readonly packetRef?: ObjectRef;
  readonly status?: string;
  readonly outcome?: string;
  readonly rationale?: string;
  readonly conditions: readonly string[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly unresolvedObjectionRefs: readonly ObjectRef[];
  readonly stewardshipOutcomes: readonly CanopyUiDecisionPacketOutcomeSummary[];
  readonly allocationAccountingOutcomeEventIds: readonly CanopyId[];
  readonly timeline: readonly CanopyUiTimelineEntry[];
  readonly hasRedactions: boolean;
  readonly hasSupersessions: boolean;
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiResourceUseRightSummary {
  readonly useRightRef: ObjectRef;
  readonly state: string;
  readonly holderRef?: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly permissions: readonly string[];
  readonly conditions: readonly string[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly latestEventId: CanopyId;
  readonly latestEventAt: IsoDateTime;
}

export interface CanopyUiResourceContextSummary {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly observedAt?: IsoDateTime;
  readonly contextRef?: ObjectRef;
  readonly ecologicalContextIds: readonly CanopyId[];
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface CanopyUiResourceStewardshipViewModel {
  readonly kind: "resource-stewardship";
  readonly resourceRef: ObjectRef;
  readonly title?: string;
  readonly summary?: string;
  readonly resourceKind?: string;
  readonly useRights: readonly CanopyUiResourceUseRightSummary[];
  readonly contextEvents: readonly CanopyUiResourceContextSummary[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly linkedRefs: {
    readonly proposals: readonly ObjectRef[];
    readonly decisions: readonly ObjectRef[];
    readonly claims: readonly ObjectRef[];
    readonly evidence: readonly ObjectRef[];
  };
  readonly ecologicalContextIds: readonly CanopyId[];
  readonly timeline: readonly CanopyUiTimelineEntry[];
  readonly counts: {
    readonly totalEvents: number;
    readonly contextEvents: number;
    readonly proposedUseRights: number;
    readonly grantedUseRights: number;
    readonly revokedUseRights: number;
  };
  readonly projectionRead: CanopyUiProjectionRead;
}

export interface CanopyUiFederationExportStateViewModel {
  readonly kind: "federation-export-state";
  readonly status: "ready" | "attention";
  readonly envelopeId: CanopyId;
  readonly exportedAt: IsoDateTime;
  readonly exportedByRef: ObjectRef;
  readonly scopeRef: ObjectRef;
  readonly format: ExportFormat;
  readonly schemaVersion: number;
  readonly contentHash: ContentHash;
  readonly includedEventIds: readonly CanopyId[];
  readonly includedObjectRefs: readonly ObjectRef[];
  readonly includedObjectTypes: readonly CanopyObjectType[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
  readonly localMappingIds: readonly CanopyId[];
  readonly redactionSummary?: RedactionSummary;
  readonly readinessWarnings: readonly ImportWarning[];
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
  readonly claimEvidence: CanopyUiClaimEvidenceViewModel;
  readonly decisionPacket?: CanopyUiDecisionPacketViewModel;
  readonly resourceStewardship?: CanopyUiResourceStewardshipViewModel;
  readonly federationExportState?: CanopyUiFederationExportStateViewModel;
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
