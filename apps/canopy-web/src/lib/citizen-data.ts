import {
  createInMemoryCitizenCommandProvider,
  createNeedOfferMatchCommandInput,
  createReportConcernCommandInput,
  executeCitizenCommandReview
} from "./citizen-command-provider";

export type CitizenCanopyStatus = "prototype";

export interface CitizenCanopyModel {
  readonly routePath: string;
  readonly surfaceLabel: string;
  readonly status: CitizenCanopyStatus;
  readonly summary: string;
  readonly primaryAction: CitizenCanopyAction;
  readonly contexts: readonly CitizenContext[];
  readonly activeContext: CitizenContext;
  readonly activeAttentionItems: readonly CitizenAttentionItem[];
  readonly suggestedActions: readonly CitizenSuggestedAction[];
  readonly taskNavigation: readonly CitizenTaskNavigationItem[];
  readonly taskSurface: CitizenTaskSurface;
  readonly reportConcernDraft: ConcernReportDraft;
  readonly needsOffers: NeedsOffersOverview;
  readonly decisionSummary: CitizenDecisionSummary;
  readonly challengeAppealPreview: ChallengeAppealPreview;
  readonly federationConflictReview: FederationConflictReview;
  readonly releaseReadiness: ReleaseReadinessSummary;
  readonly releaseReadinessAccess: ReleaseReadinessAccess;
  readonly publicObserver: PublicObserverBoundary;
  readonly commandCenter: CitizenCommandCenter;
  readonly browserWorkflows: readonly CitizenBrowserWorkflow[];
  readonly mobileTaskRoutes: readonly MobileTaskRoute[];
}

export interface CitizenCanopyAction {
  readonly label: string;
  readonly route: string;
}

export type CitizenContextLevel =
  | "neighborhood"
  | "organization"
  | "commons"
  | "living-system"
  | "federation"
  | "operator";

export type CitizenDataPosture =
  | "public"
  | "commons-visible"
  | "role-restricted"
  | "guardian-restricted"
  | "mixed";

export interface CitizenContext {
  readonly id: string;
  readonly label: string;
  readonly level: CitizenContextLevel;
  readonly activeRole: string;
  readonly availableRoles: readonly string[];
  readonly authoritySummary: string;
  readonly dataPosture: CitizenDataPosture;
  readonly relationshipPath: readonly string[];
  readonly attentionCount: number;
  readonly suggestedActionIds: readonly string[];
}

export interface CitizenAttentionItem {
  readonly id: string;
  readonly contextId: string;
  readonly role: string;
  readonly urgency: "medium" | "high";
  readonly label: string;
  readonly summary: string;
  readonly route: string;
}

export interface CitizenSuggestedAction {
  readonly id: string;
  readonly label: string;
  readonly route: string;
}

export interface CitizenTaskNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly question: string;
  readonly route: string;
  readonly attentionCount?: number;
}

export type CitizenUrgency = "low" | "medium" | "high" | "critical";

export type CitizenVisibilityPreference =
  | "public"
  | "commons-visible"
  | "role-restricted"
  | "private";

export interface ConcernReportDraft {
  readonly descriptionPrompt: string;
  readonly contextId: string;
  readonly contextLabel: string;
  readonly placeLabel: string;
  readonly affectedPeopleOrResources: readonly string[];
  readonly urgency: CitizenUrgency;
  readonly visibilityPreference: CitizenVisibilityPreference;
  readonly relatedSuggestions: readonly ConcernReportSuggestion[];
  readonly preview: ConcernReportPreview;
  readonly lifecycle: CitizenCommandLifecycle;
}

export interface ConcernReportSuggestion {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly route: string;
}

export interface ConcernReportPreview {
  readonly reviewOwner: string;
  readonly visibilityEffect: string;
  readonly civicMemoryEffect: string;
  readonly possibleDecisionPath: string;
}

export interface NeedsOffersOverview {
  readonly unmatchedNeeds: readonly NeedOfferRecord[];
  readonly availableOffers: readonly NeedOfferRecord[];
  readonly matchPreview: NeedOfferMatchPreview;
  readonly selectedNeedId: string;
  readonly selectedOfferId: string;
  readonly lifecycle: CitizenCommandLifecycle;
}

export interface NeedOfferRecord {
  readonly id: string;
  readonly label: string;
  readonly contextLabel: string;
  readonly summary: string;
  readonly urgency: CitizenUrgency;
}

export interface NeedOfferMatchPreview {
  readonly needId: string;
  readonly offerId: string;
  readonly timing: string;
  readonly eligibility: string;
  readonly authoritySummary: string;
  readonly dataPosture: CitizenDataPosture;
  readonly ecologicalConstraints: readonly string[];
  readonly affectedContextIds: readonly string[];
  readonly followThroughStates: readonly ["offer", "match", "commitment", "task", "outcome"];
}

export interface CitizenDecisionSummary {
  readonly id: string;
  readonly question: string;
  readonly status: "draft" | "review" | "approved" | "appealed" | "superseded" | "closed";
  readonly options: readonly string[];
  readonly evidenceSummary: readonly string[];
  readonly affectedContextIds: readonly string[];
  readonly guardianReviewSummary: string;
  readonly unresolvedObjections: readonly string[];
  readonly decisionMethod: string;
  readonly appealPath: string;
}

export interface ChallengeAppealPreview {
  readonly label: string;
  readonly detail: string;
  readonly reasons: readonly string[];
  readonly requestedRemedy: string;
  readonly lifecycleLabels: readonly string[];
  readonly reviewer: string;
  readonly routing: string;
  readonly visibility: string;
  readonly civicMemoryEffect: string;
}

export interface FederationConflictReview {
  readonly id: string;
  readonly domain: "claim" | "evidence" | "stewardship" | "resource" | "decision";
  readonly localRecordSummary: string;
  readonly remoteRecordSummary: string;
  readonly peerSource: string;
  readonly trustStatus: "trusted" | "warning" | "blocked";
  readonly conflictReason: string;
  readonly proposedAction: string;
  readonly availableActions: readonly [
    "accept",
    "reject",
    "remediate",
    "merge",
    "defer",
    "request-review"
  ];
  readonly provenanceSummary: string;
  readonly redactionContinuitySummary: string;
  readonly recommendationRationale: string;
  readonly consequencePreviews: readonly FederationConsequencePreview[];
  readonly precedentLinks: readonly CitizenRecordLink[];
  readonly lifecycle: CitizenCommandLifecycle;
}

export interface FederationConsequencePreview {
  readonly action: FederationConflictReview["availableActions"][number];
  readonly consequence: string;
}

export interface CitizenRecordLink {
  readonly label: string;
  readonly route: string;
}

export interface ReleaseReadinessSummary {
  readonly localAcceptanceStatus: "passed" | "attention" | "blocked";
  readonly liveDeploymentStatus: "passed" | "attention" | "blocked";
  readonly releaseGateStatus: "ready" | "blocked";
  readonly providerConnections: string;
  readonly migrationEvidence: string;
  readonly environmentEvidence: string;
  readonly observabilityEvidence: string;
  readonly smokeEvidence: string;
  readonly providerBlockers: readonly string[];
  readonly migrationBlockers: readonly string[];
  readonly environmentBlockers: readonly string[];
  readonly observabilityBlockers: readonly string[];
  readonly verificationBlockers: readonly string[];
  readonly nextActions: readonly string[];
}

export interface ProductionEvidenceInput {
  readonly providers?: string | undefined;
  readonly migrations?: string | undefined;
  readonly environment?: string | undefined;
  readonly observability?: string | undefined;
  readonly smoke?: string | undefined;
}

export interface ReleaseReadinessAccess {
  readonly allowed: boolean;
  readonly reason: string;
}

export type CitizenAudienceMode = "participant" | "public";

export interface PublicObserverBoundary {
  readonly enabled: boolean;
  readonly visibleRecords: readonly string[];
  readonly publicRecords: readonly PublicObserverRecord[];
  readonly filteredRecords: readonly PublicObserverRecord[];
  readonly selectedRecord: PublicObserverRecord | undefined;
  readonly searchQuery: string;
  readonly visibilityFilter: PublicObserverVisibilityFilter;
  readonly redactionExplanations: readonly string[];
  readonly unavailableCommands: readonly string[];
}

export type PublicObserverVisibilityFilter =
  | "all"
  | PublicObserverRecord["visibility"];

export interface PublicObserverRecord {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly visibility: "public" | "public-summary" | "redacted";
  readonly route: string;
  readonly redactionExplanation?: string;
}

export interface MobileTaskRoute {
  readonly id: string;
  readonly label: string;
  readonly route: string;
}

export interface CitizenBrowserWorkflow {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly expectedEvidence: string;
}

export interface CitizenTaskSurface {
  readonly id: "home" | "today" | "contexts" | "around" | "search" | "review-queue" | "workflow";
  readonly label: string;
  readonly summary: string;
  readonly items: readonly CitizenTaskSurfaceItem[];
}

export interface CitizenTaskSurfaceItem {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly route: string;
  readonly contextLabel?: string;
}

export type CitizenWorkflowStep =
  | "draft"
  | "preview"
  | "submitted"
  | "cancelled"
  | "confirmed"
  | "review";

export interface CitizenCommandLifecycle {
  readonly id: string;
  readonly label: string;
  readonly currentStep: CitizenWorkflowStep;
  readonly steps: readonly CitizenWorkflowStep[];
  readonly availableCommands: readonly CitizenCanopyAction[];
  readonly nextActionLabel: string;
  readonly confirmationSummary: string;
}

export type CitizenCommandType =
  | "report"
  | "match"
  | "challenge"
  | "federation-review";

export type CitizenCommandStatus =
  | "draft"
  | "submitted"
  | "needs-review"
  | "approved"
  | "rejected"
  | "changes-requested"
  | "cancelled";

export interface CitizenCommandRecord {
  readonly id: string;
  readonly label: string;
  readonly type: CitizenCommandType;
  readonly status: CitizenCommandStatus;
  readonly contextLabel: string;
  readonly reviewOwner: string;
  readonly submittedBy: string;
  readonly visibility: CitizenVisibilityPreference | "public-summary";
  readonly route: string;
  readonly civicMemoryEffect: string;
  readonly reviewActionLabel: string;
  readonly dueLabel: string;
  readonly auditTrail?: readonly CitizenCommandAuditRecord[];
}

export type CitizenCommandAuditAction = "approve" | "reject" | "request-changes";

export interface CitizenCommandAuditRecord {
  readonly auditId: string;
  readonly commandId: string;
  readonly action: CitizenCommandAuditAction;
  readonly eventType: string;
  readonly outboxDestination: string;
  readonly projectionEffect: string;
  readonly reviewer: string;
  readonly occurredAt: string;
}

export interface CitizenCommandCenter {
  readonly savedDrafts: readonly CitizenCommandRecord[];
  readonly submittedCommands: readonly CitizenCommandRecord[];
  readonly reviewQueue: readonly CitizenCommandRecord[];
  readonly myReviewQueue: readonly CitizenCommandRecord[];
  readonly otherReviewQueue: readonly CitizenCommandRecord[];
  readonly selectedCommand: CitizenCommandRecord | undefined;
  readonly selectedReviewAccess: CitizenCommandReviewAccess | undefined;
  readonly actionResult: CitizenCommandActionResult | undefined;
  readonly notifications: readonly CitizenCommandNotification[];
  readonly queueSummary: string;
}

export interface CitizenCommandActionResult {
  readonly label: string;
  readonly summary: string;
  readonly commandId: string;
}

export interface CitizenCommandNotification {
  readonly id: string;
  readonly level: "success" | "permission" | "attention";
  readonly label: string;
  readonly summary: string;
  readonly commandId: string;
}

export interface CitizenCommandReviewAccess {
  readonly allowed: boolean;
  readonly reason: string;
  readonly reviewer: string;
}

export function buildCitizenCanopyModel({
  activeContextId,
  activeRole,
  audienceMode = "participant",
  publicSearchQuery,
  publicVisibilityFilter,
  selectedNeedId,
  selectedOfferId,
  selectedPublicRecordId,
  selectedCommandId,
  commandRecords,
  commandAction,
  reviewAction,
  reportDescription,
  productionEvidence,
  workflowStep,
  routePath = "/citizen"
}: {
  readonly activeContextId?: string | undefined;
  readonly activeRole?: string | undefined;
  readonly audienceMode?: CitizenAudienceMode | undefined;
  readonly publicSearchQuery?: string | undefined;
  readonly publicVisibilityFilter?: string | undefined;
  readonly selectedNeedId?: string | undefined;
  readonly selectedOfferId?: string | undefined;
  readonly selectedPublicRecordId?: string | undefined;
  readonly selectedCommandId?: string | undefined;
  readonly commandRecords?: readonly CitizenCommandRecord[] | undefined;
  readonly commandAction?: string | undefined;
  readonly reviewAction?: string | undefined;
  readonly reportDescription?: string | undefined;
  readonly productionEvidence?: ProductionEvidenceInput | undefined;
  readonly workflowStep?: string | undefined;
  readonly routePath?: string | undefined;
} = {}): CitizenCanopyModel {
  const defaultContext = citizenContexts[0];

  if (defaultContext === undefined) {
    throw new Error("Citizen context fixture must include at least one context.");
  }

  const activeContext =
    applyRoleSelection(
      citizenContexts.find((context) => context.id === activeContextId) ?? defaultContext,
      activeRole
    );
  const activeAttentionItems = citizenAttentionItems.filter(
    (item) => item.contextId === activeContext.id && item.role === activeContext.activeRole
  );
  const contexts = citizenContexts.map((context) =>
    context.id === activeContext.id ? activeContext : context
  );
  const commandState = buildCommandRecords({
    activeContext,
    commandAction,
    commandRecords,
    reportDescription,
    reviewAction,
    selectedCommandId,
    selectedNeedId,
    selectedOfferId
  });
  const commandCenter = buildCommandCenter(
    selectedCommandId ?? commandState.selectedCommandId,
    commandState.records,
    activeContext,
    commandState.actionResult,
    commandState.notifications
  );

  return {
    routePath,
    surfaceLabel: "Citizen Canopy",
    status: "prototype",
    summary: summaryForRoute(routePath),
    primaryAction: {
      label: "Report something",
      route: "/citizen/report"
    },
    contexts,
    activeContext,
    activeAttentionItems,
    suggestedActions: activeContext.suggestedActionIds.map(resolveSuggestedAction),
    taskNavigation: citizenTaskNavigation,
    taskSurface: buildTaskSurface(routePath, contexts, activeContext, activeAttentionItems, commandCenter),
    reportConcernDraft: buildConcernReportDraft(activeContext, normalizeWorkflowStep(workflowStep)),
    needsOffers: buildNeedsOffersOverview({
      selectedNeedId,
      selectedOfferId,
      workflowStep: normalizeWorkflowStep(workflowStep)
    }),
    decisionSummary,
    challengeAppealPreview,
    federationConflictReview,
    releaseReadiness: buildReleaseReadinessSummary(productionEvidence),
    releaseReadinessAccess: buildReleaseReadinessAccess(activeContext, audienceMode),
    publicObserver: buildPublicObserverBoundary({
      audienceMode,
      selectedRecordId: selectedPublicRecordId,
      searchQuery: publicSearchQuery,
      visibilityFilter: publicVisibilityFilter
    }),
    commandCenter,
    browserWorkflows,
    mobileTaskRoutes
  };
}

function normalizeWorkflowStep(step: string | undefined): CitizenWorkflowStep {
  return step === "preview" ||
    step === "submitted" ||
    step === "cancelled" ||
    step === "confirmed" ||
    step === "review"
    ? step
    : "draft";
}

function buildLifecycle({
  id,
  label,
  currentStep,
  confirmationSummary
}: {
  readonly id: string;
  readonly label: string;
  readonly currentStep: CitizenWorkflowStep;
  readonly confirmationSummary: string;
}): CitizenCommandLifecycle {
  return {
    id,
    label,
    currentStep,
    steps: ["draft", "preview", "submitted", "confirmed"],
    availableCommands: [
      { label: "Preview", route: `${id}?step=preview` },
      { label: "Submit", route: `${id}?step=submitted` },
      { label: "Cancel", route: `${id}?step=cancelled` }
    ],
    nextActionLabel:
      currentStep === "draft"
        ? "Preview before submitting"
        : currentStep === "preview"
          ? "Submit for review"
          : "Review civic memory entry",
    confirmationSummary
  };
}

function summaryForRoute(routePath: string): string {
  if (routePath === "/citizen/today") {
    return "What needs attention today across your active groups and roles.";
  }

  if (routePath === "/citizen/contexts") {
    return "Groups and roles where you participate, review, steward, or observe.";
  }

  if (routePath === "/citizen/around") {
    return "Near this place, see connected commons, thresholds, and public issues.";
  }

  if (routePath === "/citizen/search") {
    return "Find public records, decisions, commitments, evidence, and outcomes.";
  }

  if (routePath === "/citizen/review-queue") {
    return "Saved drafts, submitted commands, and review work waiting for the right people.";
  }

  return "A separate Phase 11 surface for public, citizen, steward, and operator workflows.";
}

function applyRoleSelection(context: CitizenContext, activeRole: string | undefined): CitizenContext {
  if (activeRole === undefined || !context.availableRoles.includes(activeRole)) {
    return context;
  }

  const override = roleOverrides[`${context.id}:${activeRole}`];

  return {
    ...context,
    activeRole,
    authoritySummary: override?.authoritySummary ?? context.authoritySummary,
    dataPosture: override?.dataPosture ?? context.dataPosture,
    suggestedActionIds: override?.suggestedActionIds ?? context.suggestedActionIds
  };
}

function buildTaskSurface(
  routePath: string,
  contexts: readonly CitizenContext[],
  activeContext: CitizenContext,
  activeAttentionItems: readonly CitizenAttentionItem[],
  commandCenter: CitizenCommandCenter
): CitizenTaskSurface {
  if (routePath === "/citizen/today") {
    return {
      id: "today",
      label: "What needs attention today",
      summary: "Start with the work that is timely, role-aware, and close to your current context.",
      items: [
        ...activeAttentionItems.map((item) => ({
          id: item.id,
          label: item.label,
          summary: item.summary,
          route: item.route,
          contextLabel: activeContext.label
        })),
        ...commandCenter.savedDrafts.map(commandToTaskSurfaceItem),
        ...commandCenter.reviewQueue.map(commandToTaskSurfaceItem)
      ]
    };
  }

  if (routePath === "/citizen/contexts") {
    return {
      id: "contexts",
      label: "Groups and roles",
      summary: "Switch between the groups, levels, and roles that shape what you can see and do.",
      items: contexts.map((context) => ({
        id: context.id,
        label: context.label,
        summary: `${context.activeRole} at ${context.level}; ${context.authoritySummary}`,
        route: `/citizen/contexts?context=${encodeURIComponent(context.id)}`,
        contextLabel: context.dataPosture
      }))
    };
  }

  if (routePath === "/citizen/around") {
    return {
      id: "around",
      label: "Near this place",
      summary: "Place-based records connect neighborhoods, schools, commons, and living systems.",
      items: [
        {
          id: "around.active-context",
          label: activeContext.label,
          summary: activeContext.relationshipPath.join(" / "),
          route: `/citizen/contexts?context=${encodeURIComponent(activeContext.id)}`,
          contextLabel: activeContext.level
        },
        {
          id: "around.mill-creek-threshold",
          label: "Mill Creek threshold review",
          summary: "Watershed threshold review is connected to the current food routing decision.",
          route: "/citizen/around?context=living-system.mill-creek",
          contextLabel: "living-system"
        }
      ]
    };
  }

  if (routePath === "/citizen/search") {
    return {
      id: "search",
      label: "Find public records",
      summary: "Search starts with public records and explains when something is restricted.",
      items: [
        {
          id: "search.public-issues",
          label: "Public issues",
          summary: "Open issues visible to public observers and commons participants.",
          route: "/citizen/trust-data?mode=public",
          contextLabel: "public"
        },
        {
          id: "search.published-decisions",
          label: "Published decisions",
          summary: "Decision records with public summaries, objections, and outcomes.",
          route: "/citizen/decisions",
          contextLabel: "public"
        }
      ]
    };
  }

  if (routePath === "/citizen/review-queue") {
    return {
      id: "review-queue",
      label: "Review queue",
      summary: commandCenter.queueSummary,
      items: [
        ...commandCenter.savedDrafts.map(commandToTaskSurfaceItem),
        ...commandCenter.submittedCommands.map(commandToTaskSurfaceItem),
        ...commandCenter.reviewQueue.map(commandToTaskSurfaceItem)
      ]
    };
  }

  return {
    id: routePath === "/citizen" ? "home" : "workflow",
    label: "Citizen home",
    summary: "Home combines active context, top attention, suggested actions, and groups.",
    items: activeAttentionItems.map((item) => ({
      id: item.id,
      label: item.label,
      summary: item.summary,
      route: item.route,
      contextLabel: activeContext.label
    }))
  };
}

function commandToTaskSurfaceItem(command: CitizenCommandRecord): CitizenTaskSurfaceItem {
  return {
    id: command.id,
    label: command.label,
    summary: `${labelCommandStatus(command.status)} - ${command.reviewOwner}`,
    route: command.route,
    contextLabel: labelCommandStatus(command.status)
  };
}

function labelCommandStatus(status: CitizenCommandStatus): string {
  switch (status) {
    case "draft":
      return "Saved draft";
    case "submitted":
      return "Submitted";
    case "needs-review":
      return "Needs review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "changes-requested":
      return "Changes requested";
    case "cancelled":
      return "Cancelled";
  }
}

function resolveSuggestedAction(id: string): CitizenSuggestedAction {
  const action = suggestedActionsById[id];

  if (action === undefined) {
    throw new Error(`Missing citizen suggested action fixture: ${id}`);
  }

  return action;
}

const roleOverrides: Record<
  string,
  {
    readonly authoritySummary?: string;
    readonly dataPosture?: CitizenDataPosture;
    readonly suggestedActionIds?: readonly string[];
  }
> = {
  "neighborhood.riverbend:neighbor reviewer": {
    authoritySummary: "You can review public neighborhood priorities and recommend next steps.",
    dataPosture: "public",
    suggestedActionIds: ["review-neighborhood-priority", "open-public-summary"]
  }
};

function buildConcernReportDraft(
  activeContext: CitizenContext,
  workflowStep: CitizenWorkflowStep
): ConcernReportDraft {
  return {
    descriptionPrompt: "What is happening?",
    contextId: activeContext.id,
    contextLabel: activeContext.label,
    placeLabel: activeContext.label,
    affectedPeopleOrResources: ["neighbors", "shared food resources"],
    urgency: "medium",
    visibilityPreference: activeContext.dataPosture === "public" ? "public" : "commons-visible",
    relatedSuggestions: concernSuggestionsByContext[activeContext.id] ?? [],
    preview: concernPreviewByContext[activeContext.id] ?? {
      reviewOwner: `${activeContext.label} reviewers`,
      visibilityEffect: `Visible to participants in ${activeContext.label}`,
      civicMemoryEffect: "Creates a concern record for review",
      possibleDecisionPath: "May become a decision if reviewers confirm impact"
    },
    lifecycle: buildLifecycle({
      id: "/citizen/report",
      label: "Report lifecycle",
      currentStep: workflowStep,
      confirmationSummary:
        workflowStep === "submitted"
          ? "Concern submitted for Riverbend neighborhood reviewers"
          : "Concern draft is still editable before review"
    })
  };
}

function buildPublicObserverBoundary({
  audienceMode,
  selectedRecordId,
  searchQuery,
  visibilityFilter
}: {
  readonly audienceMode: CitizenAudienceMode;
  readonly selectedRecordId: string | undefined;
  readonly searchQuery?: string | undefined;
  readonly visibilityFilter?: string | undefined;
}): PublicObserverBoundary {
  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? "";
  const normalizedVisibility = normalizePublicVisibilityFilter(visibilityFilter);
  const filteredRecords = publicObserverRecords.filter((record) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      record.label.toLowerCase().includes(normalizedQuery) ||
      record.summary.toLowerCase().includes(normalizedQuery);
    const matchesVisibility =
      normalizedVisibility === "all" || record.visibility === normalizedVisibility;

    return matchesQuery && matchesVisibility;
  });
  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    publicObserverRecords.find((record) => record.id === selectedRecordId) ??
    filteredRecords[0] ??
    publicObserverRecords[0];

  return {
    enabled: audienceMode === "public",
    visibleRecords: ["Public issues", "Published decisions", "Shared commitments", "Recorded outcomes"],
    publicRecords: publicObserverRecords,
    filteredRecords,
    selectedRecord,
    searchQuery: searchQuery?.trim() ?? "",
    visibilityFilter: normalizedVisibility,
    redactionExplanations: [
      "Student contact details are hidden because they are guardian-restricted",
      "Pickup notes stay unavailable until the school guardian review clears a public summary"
    ],
    unavailableCommands: ["Submit match", "Resolve federation conflict", "Review release readiness"]
  };
}

function normalizePublicVisibilityFilter(
  visibilityFilter: string | undefined
): PublicObserverVisibilityFilter {
  return visibilityFilter === "public" ||
    visibilityFilter === "public-summary" ||
    visibilityFilter === "redacted"
    ? visibilityFilter
    : "all";
}

function buildReleaseReadinessAccess(
  activeContext: CitizenContext,
  audienceMode: CitizenAudienceMode
): ReleaseReadinessAccess {
  const allowed = audienceMode === "participant" && activeContext.level === "operator";

  return {
    allowed,
    reason: allowed
      ? "Operator role can review local acceptance and live blockers."
      : "Release readiness is limited to operator roles."
  };
}

function buildReleaseReadinessSummary(
  productionEvidence: ProductionEvidenceInput | undefined
): ReleaseReadinessSummary {
  const providerConnections = productionEvidence?.providers ?? releaseReadiness.providerConnections;
  const migrationEvidence = productionEvidence?.migrations ?? releaseReadiness.migrationEvidence;
  const environmentEvidence = productionEvidence?.environment ?? releaseReadiness.environmentEvidence;
  const observabilityEvidence =
    productionEvidence?.observability ?? releaseReadiness.observabilityEvidence;
  const smokeEvidence = productionEvidence?.smoke ?? releaseReadiness.smokeEvidence;
  const providerBlockers =
    providerConnections === "connected"
      ? []
      : ["Production provider credentials are not connected"];
  const migrationBlockers =
    migrationEvidence === "verified" ? [] : ["Live database migration evidence is missing"];
  const environmentBlockers =
    environmentEvidence === "verified"
      ? []
      : ["Production environment variables are not verified"];
  const observabilityBlockers =
    observabilityEvidence === "connected"
      ? []
      : ["Live log drain and alert evidence is missing"];
  const verificationBlockers =
    smokeEvidence === "passed" ? [] : ["Post-deploy smoke evidence is missing"];
  const allBlockers = [
    ...providerBlockers,
    ...migrationBlockers,
    ...environmentBlockers,
    ...observabilityBlockers,
    ...verificationBlockers
  ];

  return {
    localAcceptanceStatus: "passed",
    liveDeploymentStatus: allBlockers.length === 0 ? "passed" : "blocked",
    releaseGateStatus: allBlockers.length === 0 ? "ready" : "blocked",
    providerConnections,
    migrationEvidence,
    environmentEvidence,
    observabilityEvidence,
    smokeEvidence,
    providerBlockers,
    migrationBlockers,
    environmentBlockers,
    observabilityBlockers,
    verificationBlockers,
    nextActions:
      allBlockers.length === 0
        ? []
        : [
            "Connect production providers",
            "Run live migration proof",
            "Capture post-deploy smoke evidence"
          ]
  };
}

function buildNeedsOffersOverview({
  selectedNeedId,
  selectedOfferId,
  workflowStep
}: {
  readonly selectedNeedId?: string | undefined;
  readonly selectedOfferId?: string | undefined;
  readonly workflowStep: CitizenWorkflowStep;
}): NeedsOffersOverview {
  const selectedNeed = resolveNeed(selectedNeedId);
  const selectedOffer = resolveOffer(selectedOfferId);

  return {
    ...needsOffersOverview,
    selectedNeedId: selectedNeed.id,
    selectedOfferId: selectedOffer.id,
    matchPreview: {
      ...needsOffersOverview.matchPreview,
      needId: selectedNeed.id,
      offerId: selectedOffer.id
    },
    lifecycle: buildLifecycle({
      id: "/citizen/needs-offers",
      label: "Match lifecycle",
      currentStep: workflowStep,
      confirmationSummary:
        workflowStep === "confirmed"
          ? "Match confirmed for steward follow-through"
          : "Match can still be changed before steward confirmation"
    })
  };
}

function buildCommandRecords({
  activeContext,
  commandAction,
  commandRecords,
  reportDescription,
  reviewAction,
  selectedCommandId,
  selectedNeedId,
  selectedOfferId
}: {
  readonly activeContext: CitizenContext;
  readonly commandAction?: string | undefined;
  readonly commandRecords?: readonly CitizenCommandRecord[] | undefined;
  readonly reportDescription?: string | undefined;
  readonly reviewAction?: string | undefined;
  readonly selectedCommandId?: string | undefined;
  readonly selectedNeedId?: string | undefined;
  readonly selectedOfferId?: string | undefined;
}): {
  readonly records: readonly CitizenCommandRecord[];
  readonly selectedCommandId?: string | undefined;
  readonly actionResult?: CitizenCommandActionResult | undefined;
  readonly notifications?: readonly CitizenCommandNotification[] | undefined;
} {
  const provider = createInMemoryCitizenCommandProvider({
    initialCommands: commandRecords ?? citizenCommandRecords
  });

  if (commandAction === "save-report-draft") {
    const command = provider.saveDraft(
      createReportConcernCommandInput({
        contextLabel: activeContext.label,
        description: reportDescription
      })
    );

    return {
      records: provider.listCommands(),
      selectedCommandId: command.id,
      actionResult: {
        label: "Draft saved from report",
        summary: command.civicMemoryEffect,
        commandId: command.id
      }
    };
  }

  if (commandAction === "submit-match") {
    const need = resolveNeed(selectedNeedId);
    const offer = resolveOffer(selectedOfferId);
    const draft = provider.saveDraft(
      createNeedOfferMatchCommandInput({
        needLabel: need.label,
        offerLabel: offer.label
      })
    );
    const command = provider.submitCommand(draft.id);

    return {
      records: provider.listCommands(),
      selectedCommandId: command.id,
      actionResult: {
        label: "Command submitted",
        summary: command.civicMemoryEffect,
        commandId: command.id
      }
    };
  }

  const auditAction = auditActionFromRoute(reviewAction);

  if (auditAction !== undefined) {
    const selectedCommand =
      provider.listCommands().find((command) => command.id === selectedCommandId) ??
      provider.listCommands()[0];

    if (selectedCommand === undefined) {
      throw new Error("Cannot approve a citizen command without a selected command.");
    }

    const reviewAccess = buildReviewAccess(activeContext, selectedCommand);

    if (!reviewAccess.allowed) {
      return {
        records: provider.listCommands(),
        selectedCommandId: selectedCommand.id,
        actionResult: {
          label: "Review blocked",
          summary: reviewAccess.reason,
          commandId: selectedCommand.id
        },
        notifications: [
          {
            id: `notification.${selectedCommand.id}.permission`,
            level: "permission",
            label: "Permission needed",
            summary: reviewAccess.reason,
            commandId: selectedCommand.id
          }
        ]
      };
    }

    const result = executeCitizenCommandReview({
      provider,
      commandId: selectedCommand.id,
      action: auditAction,
      reviewer: reviewAccess.reviewer,
      now: "2026-06-17T17:00:00.000Z"
    });

    const label = reviewActionLabel(auditAction);

    return {
      records: provider.listCommands(),
      selectedCommandId: result.command.id,
      actionResult: {
        label,
        summary: result.audit.projectionEffect,
        commandId: result.command.id
      },
      notifications: [
        {
          id: `notification.${result.command.id}.${auditAction}`,
          level: "success",
          label,
          summary: result.audit.projectionEffect,
          commandId: result.command.id
        }
      ]
    };
  }

  return {
    records: provider.listCommands()
  };
}

function auditActionFromRoute(
  reviewAction: string | undefined
): CitizenCommandAuditAction | undefined {
  switch (reviewAction) {
    case "approve-command":
      return "approve";
    case "reject-command":
      return "reject";
    case "request-changes":
      return "request-changes";
    default:
      return undefined;
  }
}

function reviewActionLabel(action: CitizenCommandAuditAction): string {
  switch (action) {
    case "approve":
      return "Command approved";
    case "reject":
      return "Command rejected";
    case "request-changes":
      return "Changes requested";
  }
}

function buildCommandCenter(
  selectedCommandId: string | undefined,
  records: readonly CitizenCommandRecord[],
  activeContext: CitizenContext,
  actionResult: CitizenCommandActionResult | undefined,
  notifications: readonly CitizenCommandNotification[] | undefined
): CitizenCommandCenter {
  const savedDrafts = records.filter((command) => command.status === "draft");
  const submittedCommands = records.filter((command) => command.status === "submitted");
  const reviewQueue = records.filter((command) => command.status === "needs-review");
  const reviewableCommands = records.filter(isReviewableCommand);
  const myReviewQueue = reviewableCommands.filter(
    (command) => buildReviewAccess(activeContext, command).allowed
  );
  const otherReviewQueue = reviewableCommands.filter(
    (command) => !buildReviewAccess(activeContext, command).allowed
  );
  const selectedCommand =
    records.find((command) => command.id === selectedCommandId) ??
    reviewQueue[0] ??
    savedDrafts[0];

  return {
    savedDrafts,
    submittedCommands,
    reviewQueue,
    myReviewQueue,
    otherReviewQueue,
    selectedCommand,
    selectedReviewAccess:
      selectedCommand === undefined ? undefined : buildReviewAccess(activeContext, selectedCommand),
    actionResult,
    notifications: notifications ?? [],
    queueSummary: `${savedDrafts.length} draft, ${submittedCommands.length} submitted, ${reviewQueue.length} needing review`
  };
}

function isReviewableCommand(command: CitizenCommandRecord): boolean {
  return (
    command.status === "draft" ||
    command.status === "submitted" ||
    command.status === "needs-review" ||
    command.status === "changes-requested"
  );
}

function buildReviewAccess(
  activeContext: CitizenContext,
  command: CitizenCommandRecord
): CitizenCommandReviewAccess {
  const reviewer = `${activeContext.activeRole} at ${activeContext.label}`;

  if (command.contextLabel === activeContext.label && isReviewRole(activeContext.activeRole)) {
    return {
      allowed: true,
      reason: `${reviewer} can review this command.`,
      reviewer
    };
  }

  return {
    allowed: false,
    reason: `${reviewer} cannot review ${command.label}. ${reviewRoleInstruction(
      activeContext,
      command
    )}`,
    reviewer
  };
}

function isReviewRole(role: string): boolean {
  return role.includes("reviewer") || role.includes("steward") || role.includes("guardian");
}

function reviewRoleInstruction(activeContext: CitizenContext, command: CitizenCommandRecord): string {
  const localReviewerRole = activeContext.availableRoles.find((role) => role.includes("reviewer"));

  if (command.contextLabel === activeContext.label && localReviewerRole !== undefined) {
    return `Switch to ${localReviewerRole}.`;
  }

  return `Open the ${command.reviewOwner} queue.`;
}

function resolveNeed(selectedNeedId: string | undefined): NeedOfferRecord {
  const fallbackNeed = needsOffersOverview.unmatchedNeeds[0];

  if (fallbackNeed === undefined) {
    throw new Error("Needs/offers fixture must include at least one need.");
  }

  return needsOffersOverview.unmatchedNeeds.find((need) => need.id === selectedNeedId) ?? fallbackNeed;
}

function resolveOffer(selectedOfferId: string | undefined): NeedOfferRecord {
  const fallbackOffer = needsOffersOverview.availableOffers[0];

  if (fallbackOffer === undefined) {
    throw new Error("Needs/offers fixture must include at least one offer.");
  }

  return needsOffersOverview.availableOffers.find((offer) => offer.id === selectedOfferId) ?? fallbackOffer;
}

const citizenContexts: readonly CitizenContext[] = [
  {
    id: "neighborhood.riverbend",
    label: "Riverbend Neighborhood",
    level: "neighborhood",
    activeRole: "resident",
    availableRoles: ["resident", "neighbor reviewer"],
    authoritySummary: "You can report concerns, join reviews, and see neighborhood public records.",
    dataPosture: "commons-visible",
    relationshipPath: ["Canopy Commons Seed", "Riverbend Food Commons", "Riverbend Neighborhood"],
    attentionCount: 3,
    suggestedActionIds: ["report-something", "review-neighborhood-priority"]
  },
  {
    id: "organization.northside-school",
    label: "Northside School Kitchen",
    level: "organization",
    activeRole: "school steward",
    availableRoles: ["school steward", "guardian reviewer"],
    authoritySummary: "You can coordinate school needs with guardian review for sensitive records.",
    dataPosture: "guardian-restricted",
    relationshipPath: ["Canopy Commons Seed", "Riverbend Food Commons", "Northside School Kitchen"],
    attentionCount: 2,
    suggestedActionIds: ["review-school-need", "check-visibility"]
  },
  {
    id: "commons.riverbend-food",
    label: "Riverbend Food Commons",
    level: "commons",
    activeRole: "commons steward",
    availableRoles: ["commons steward", "allocation reviewer"],
    authoritySummary: "You can review needs, offers, commitments, and resource stewardship proposals.",
    dataPosture: "mixed",
    relationshipPath: ["Canopy Commons Seed", "Riverbend Food Commons"],
    attentionCount: 4,
    suggestedActionIds: ["match-need-offer", "review-commitment"]
  },
  {
    id: "living-system.mill-creek",
    label: "Mill Creek Watershed",
    level: "living-system",
    activeRole: "watershed guardian",
    availableRoles: ["watershed guardian", "observer"],
    authoritySummary: "You can review ecological thresholds and request remediation.",
    dataPosture: "public",
    relationshipPath: ["Canopy Commons Seed", "Mill Creek Watershed"],
    attentionCount: 2,
    suggestedActionIds: ["review-threshold", "request-remediation"]
  },
  {
    id: "federation.downstream",
    label: "Downstream Federation",
    level: "federation",
    activeRole: "federation steward",
    availableRoles: ["federation steward", "conflict reviewer"],
    authoritySummary: "You can compare trusted peer records and propose provenance-preserving actions.",
    dataPosture: "role-restricted",
    relationshipPath: ["Canopy Commons Seed", "Riverbend Food Commons", "Downstream Federation"],
    attentionCount: 3,
    suggestedActionIds: ["review-federation-conflict", "request-peer-review"]
  },
  {
    id: "operator.release",
    label: "Canopy Release Readiness",
    level: "operator",
    activeRole: "operator",
    availableRoles: ["operator"],
    authoritySummary: "You can inspect local acceptance, live deployment blockers, and verification evidence.",
    dataPosture: "role-restricted",
    relationshipPath: ["Canopy Commons Seed", "Operations"],
    attentionCount: 1,
    suggestedActionIds: ["review-release-readiness"]
  }
];

const citizenAttentionItems: readonly CitizenAttentionItem[] = [
  {
    id: "attention.neighborhood.priority",
    contextId: "neighborhood.riverbend",
    role: "resident",
    urgency: "high",
    label: "Review neighborhood food resilience priority",
    summary: "A public priority needs resident review before it moves into a decision path.",
    route: "/citizen/decisions"
  },
  {
    id: "attention.neighborhood.public-summary",
    contextId: "neighborhood.riverbend",
    role: "neighbor reviewer",
    urgency: "medium",
    label: "Prepare public summary for neighborhood review",
    summary: "A plain-language public summary can help neighbors review the food resilience priority.",
    route: "/citizen/search"
  },
  {
    id: "attention.school.need",
    contextId: "organization.northside-school",
    role: "school steward",
    urgency: "high",
    label: "Confirm school kitchen need",
    summary: "The kitchen produce gap needs a steward confirmation and guardian visibility check.",
    route: "/citizen/needs-offers"
  },
  {
    id: "attention.commons.match",
    contextId: "commons.riverbend-food",
    role: "commons steward",
    urgency: "high",
    label: "Preview need and offer match",
    summary: "A surplus produce offer can close a school meal gap if constraints are accepted.",
    route: "/citizen/needs-offers"
  },
  {
    id: "attention.watershed.threshold",
    contextId: "living-system.mill-creek",
    role: "watershed guardian",
    urgency: "medium",
    label: "Check Mill Creek threshold review",
    summary: "A threshold review needs plain-language ecological context before remediation.",
    route: "/citizen/around"
  },
  {
    id: "attention.federation.conflict",
    contextId: "federation.downstream",
    role: "federation steward",
    urgency: "high",
    label: "Review downstream record conflict",
    summary: "A peer record differs from the local civic memory and needs steward review.",
    route: "/citizen/trust-data"
  },
  {
    id: "attention.operator.readiness",
    contextId: "operator.release",
    role: "operator",
    urgency: "medium",
    label: "Check live release blockers",
    summary: "Local acceptance is separate from live deployment evidence and blockers.",
    route: "/citizen/release-readiness"
  }
];

const suggestedActionsById: Record<string, CitizenSuggestedAction> = {
  "report-something": {
    id: "report-something",
    label: "Report something",
    route: "/citizen/report"
  },
  "review-neighborhood-priority": {
    id: "review-neighborhood-priority",
    label: "Review neighborhood priority",
    route: "/citizen/decisions"
  },
  "open-public-summary": {
    id: "open-public-summary",
    label: "Open public summary",
    route: "/citizen/search"
  },
  "review-school-need": {
    id: "review-school-need",
    label: "Review school need",
    route: "/citizen/needs-offers"
  },
  "check-visibility": {
    id: "check-visibility",
    label: "Check visibility",
    route: "/citizen/trust-data"
  },
  "match-need-offer": {
    id: "match-need-offer",
    label: "Match need and offer",
    route: "/citizen/needs-offers"
  },
  "review-commitment": {
    id: "review-commitment",
    label: "Review commitment",
    route: "/citizen/commitments"
  },
  "review-threshold": {
    id: "review-threshold",
    label: "Review threshold",
    route: "/citizen/around"
  },
  "request-remediation": {
    id: "request-remediation",
    label: "Request remediation",
    route: "/citizen/report"
  },
  "review-federation-conflict": {
    id: "review-federation-conflict",
    label: "Review federation conflict",
    route: "/citizen/trust-data"
  },
  "request-peer-review": {
    id: "request-peer-review",
    label: "Request peer review",
    route: "/citizen/trust-data"
  },
  "review-release-readiness": {
    id: "review-release-readiness",
    label: "Review release readiness",
    route: "/citizen/release-readiness"
  }
};

const citizenTaskNavigation: readonly CitizenTaskNavigationItem[] = [
  {
    id: "home",
    label: "Home",
    question: "What needs my attention now?",
    route: "/citizen",
    attentionCount: 3
  },
  {
    id: "my-contexts",
    label: "My Contexts",
    question: "Where am I participating?",
    route: "/citizen/contexts"
  },
  {
    id: "around-me",
    label: "Around Me",
    question: "What is happening near this place or commons?",
    route: "/citizen/around"
  },
  {
    id: "needs-offers",
    label: "Needs & Offers",
    question: "What can be matched responsibly?",
    route: "/citizen/needs-offers",
    attentionCount: 2
  },
  {
    id: "decisions",
    label: "Decisions",
    question: "What is being decided and how can I respond?",
    route: "/citizen/decisions",
    attentionCount: 1
  },
  {
    id: "trust-data",
    label: "Trust & Data",
    question: "What is visible, restricted, contested, or federated?",
    route: "/citizen/trust-data",
    attentionCount: 1
  }
];

const mobileTaskRoutes: readonly MobileTaskRoute[] = [
  {
    id: "today",
    label: "Today",
    route: "/citizen/today"
  },
  {
    id: "my-groups",
    label: "My Groups",
    route: "/citizen/contexts"
  },
  {
    id: "around-me",
    label: "Around Me",
    route: "/citizen/around"
  },
  {
    id: "report",
    label: "Report",
    route: "/citizen/report"
  },
  {
    id: "review",
    label: "Review",
    route: "/citizen/decisions"
  },
  {
    id: "search",
    label: "Search",
    route: "/citizen/search"
  }
];

const browserWorkflows: readonly CitizenBrowserWorkflow[] = [
  {
    id: "browser.public-record-search",
    label: "Public record search",
    route: "/citizen/search?q=cooling&visibility=redacted&record=public.outcome.cooling-center-meals",
    expectedEvidence: "Cooling center meal support outcome"
  },
  {
    id: "browser.review-permission-block",
    label: "Review permission block",
    route: "/citizen/review-queue?command=command.report.riverbend-food-concern&reviewAction=reject-command",
    expectedEvidence: "Review blocked"
  },
  {
    id: "browser.reviewer-approval",
    label: "Reviewer approval",
    route: "/citizen/review-queue?role=neighbor%20reviewer&command=command.report.riverbend-food-concern&reviewAction=approve-command",
    expectedEvidence: "neighbor reviewer at Riverbend Neighborhood"
  },
  {
    id: "browser.release-readiness-ready",
    label: "Release readiness ready",
    route: "/citizen/release-readiness?context=operator.release&providers=connected&migrations=verified&environment=verified&observability=connected&smoke=passed",
    expectedEvidence: "ready"
  }
];

const concernSuggestionsByContext: Record<string, readonly ConcernReportSuggestion[]> = {
  "neighborhood.riverbend": [
    {
      id: "suggestion.neighborhood-food-priority",
      label: "Neighborhood food resilience priority",
      summary: "A current neighborhood priority may already cover this concern.",
      route: "/citizen/decisions"
    },
    {
      id: "suggestion.mill-creek-threshold",
      label: "Mill Creek threshold review",
      summary: "The concern may connect to an existing watershed threshold review.",
      route: "/citizen/around"
    }
  ],
  "organization.northside-school": [
    {
      id: "suggestion.school-kitchen-need",
      label: "School kitchen produce need",
      summary: "A school need is already waiting for steward confirmation.",
      route: "/citizen/needs-offers"
    }
  ]
};

const concernPreviewByContext: Record<string, ConcernReportPreview> = {
  "neighborhood.riverbend": {
    reviewOwner: "Riverbend neighborhood reviewers",
    visibilityEffect: "Visible to Riverbend Food Commons participants",
    civicMemoryEffect: "Creates a public concern record for review",
    possibleDecisionPath: "May become a neighborhood decision if reviewers confirm impact"
  },
  "organization.northside-school": {
    reviewOwner: "Northside School guardian reviewers",
    visibilityEffect: "Visible to school stewards and guardian reviewers",
    civicMemoryEffect: "Creates a role-restricted concern record for school review",
    possibleDecisionPath: "May become a school need or guardian review item"
  }
};

const needsOffersOverview: NeedsOffersOverview = {
  unmatchedNeeds: [
    {
      id: "need.school-kitchen-produce-gap",
      label: "School kitchen produce gap",
      contextLabel: "Northside School Kitchen",
      summary: "The school meal program needs fresh produce for this week's service window.",
      urgency: "high"
    },
    {
      id: "need.neighborhood-cooling-meals",
      label: "Cooling center meal support",
      contextLabel: "Riverbend Neighborhood",
      summary: "Heat response volunteers need shelf-stable food for the neighborhood cooling room.",
      urgency: "medium"
    }
  ],
  availableOffers: [
    {
      id: "offer.green-acre-surplus-produce",
      label: "Green Acre surplus produce",
      contextLabel: "Riverbend Food Commons",
      summary: "A stewarded farm plot has surplus greens and squash available for school meals.",
      urgency: "medium"
    },
    {
      id: "offer.volunteer-cold-storage",
      label: "Volunteer cold storage",
      contextLabel: "Riverbend Neighborhood",
      summary: "A neighborhood volunteer can hold produce safely until school pickup.",
      urgency: "medium"
    }
  ],
  matchPreview: {
    needId: "need.school-kitchen-produce-gap",
    offerId: "offer.green-acre-surplus-produce",
    timing: "This week",
    eligibility: "School meal program and commons stewardship rules",
    authoritySummary: "Commons steward review with school guardian visibility check",
    dataPosture: "mixed",
    ecologicalConstraints: ["Mill Creek nitrate threshold remains under review"],
    affectedContextIds: [
      "organization.northside-school",
      "commons.riverbend-food",
      "living-system.mill-creek"
    ],
    followThroughStates: ["offer", "match", "commitment", "task", "outcome"]
  },
  selectedNeedId: "need.school-kitchen-produce-gap",
  selectedOfferId: "offer.green-acre-surplus-produce",
  lifecycle: buildLifecycle({
    id: "/citizen/needs-offers",
    label: "Match lifecycle",
    currentStep: "draft",
    confirmationSummary: "Match can still be changed before steward confirmation"
  })
};

const decisionSummary: CitizenDecisionSummary = {
  id: "decision.route-surplus-to-school",
  question: "Should surplus Green Acre produce be routed to Northside School this week?",
  status: "review",
  options: [
    "Route surplus to school meals",
    "Hold for broader neighborhood distribution",
    "Split the surplus between school meals and cooling center food support"
  ],
  evidenceSummary: [
    "School meal produce gap confirmed",
    "Green Acre surplus produce is available this week",
    "Mill Creek nitrate threshold remains under review"
  ],
  affectedContextIds: [
    "organization.northside-school",
    "commons.riverbend-food",
    "living-system.mill-creek"
  ],
  guardianReviewSummary: "School guardian review is required before student-sensitive details are shared.",
  unresolvedObjections: ["Downstream school data stewardship needs guardian review"],
  decisionMethod: "consent with guardian review",
  appealPath: "Affected students, guardians, residents, or stewards can challenge the decision packet"
};

const challengeAppealPreview: ChallengeAppealPreview = {
  label: "Challenge data-sharing details",
  detail: "The route pause can stand, but school contact and pickup details should stay local.",
  reasons: [
    "Prove consent revocation",
    "Preserve the minority report",
    "Keep sensitive school details local"
  ],
  requestedRemedy:
    "Keep the decision intact, add consent-revocation redaction continuity, and carry the appeal in the packet review.",
  lifecycleLabels: ["Opened", "Under review", "Remedy recorded", "Upheld"],
  reviewer: "Guardian and governance review circle",
  routing: "Opens a governance review while preserving the original decision history",
  visibility: "Role-restricted until guardian review clears public summary",
  civicMemoryEffect: "Adds the challenge, remedy, and final outcome to civic memory"
};

const federationConflictReview: FederationConflictReview = {
  id: "downstream-claim-divergence",
  domain: "claim",
  localRecordSummary: "Riverbend record says 20 boxes are needed for school meals",
  remoteRecordSummary: "Downstream School Commons says 12 boxes before the next meal cycle",
  peerSource: "Downstream School Commons",
  trustStatus: "warning",
  conflictReason: "same school meal need differs across peers",
  proposedAction: "Open claim reconciliation before applying remote terms",
  availableActions: ["accept", "reject", "remediate", "merge", "defer", "request-review"],
  provenanceSummary: "Keeps both local and peer histories visible for reviewer comparison",
  redactionContinuitySummary:
    "Sensitive school contact and pickup details stay local until guardian review",
  recommendationRationale:
    "Request review before merging because the peer total changes school meal planning.",
  consequencePreviews: [
    {
      action: "accept",
      consequence: "Applies the peer count after steward review and keeps local history visible"
    },
    {
      action: "merge",
      consequence: "Creates a reconciled public summary while preserving both histories"
    },
    {
      action: "request-review",
      consequence: "Routes the conflict to school and federation stewards before any public change"
    }
  ],
  precedentLinks: [
    {
      label: "Prior school meal reconciliation",
      route: "/citizen/trust-data?precedent=school-meal-reconciliation"
    }
  ],
  lifecycle: buildLifecycle({
    id: "/citizen/trust-data",
    label: "Federation review lifecycle",
    currentStep: "review",
    confirmationSummary: "Conflict is held for provenance-preserving review"
  })
};

const publicObserverRecords: readonly PublicObserverRecord[] = [
  {
    id: "public.decision.school-produce-routing",
    label: "School produce routing decision",
    summary: "A public summary of the produce-routing decision, objections, and outcome.",
    visibility: "public-summary",
    route: "/citizen/trust-data?mode=public&record=public.decision.school-produce-routing",
    redactionExplanation: "Student and pickup details are hidden for guardian review"
  },
  {
    id: "public.issue.food-resilience-priority",
    label: "Neighborhood food resilience priority",
    summary: "A public issue record residents can review before it enters a decision path.",
    visibility: "public",
    route: "/citizen/trust-data?mode=public&record=public.issue.food-resilience-priority"
  },
  {
    id: "public.outcome.cooling-center-meals",
    label: "Cooling center meal support outcome",
    summary: "Recorded outcome for meal support during the heat response window.",
    visibility: "redacted",
    route: "/citizen/trust-data?mode=public&record=public.outcome.cooling-center-meals",
    redactionExplanation: "Volunteer contact details stay restricted while the outcome remains public"
  }
];

const citizenCommandRecords: readonly CitizenCommandRecord[] = [
  {
    id: "command.report.riverbend-food-concern",
    label: "Report neighborhood food concern",
    type: "report",
    status: "draft",
    contextLabel: "Riverbend Neighborhood",
    reviewOwner: "Riverbend neighborhood reviewers",
    submittedBy: "resident",
    visibility: "commons-visible",
    route: "/citizen/review-queue?command=command.report.riverbend-food-concern",
    civicMemoryEffect: "Creates a public concern record for review",
    reviewActionLabel: "Approve for review",
    dueLabel: "Before the next neighborhood review circle"
  },
  {
    id: "command.match.school-produce",
    label: "Match produce offer to school need",
    type: "match",
    status: "submitted",
    contextLabel: "Riverbend Food Commons",
    reviewOwner: "Commons steward and school guardian reviewers",
    submittedBy: "commons steward",
    visibility: "role-restricted",
    route: "/citizen/review-queue?command=command.match.school-produce",
    civicMemoryEffect: "Creates a commitment review entry before any task is assigned",
    reviewActionLabel: "Send to guardian review",
    dueLabel: "This week"
  },
  {
    id: "command.federation.downstream-reconciliation",
    label: "Review downstream reconciliation",
    type: "federation-review",
    status: "needs-review",
    contextLabel: "Downstream Federation",
    reviewOwner: "Federation conflict reviewers",
    submittedBy: "federation steward",
    visibility: "role-restricted",
    route: "/citizen/review-queue?command=command.federation.downstream-reconciliation",
    civicMemoryEffect: "Preserves both local and peer histories before any record is merged",
    reviewActionLabel: "Request reviewer decision",
    dueLabel: "Before accepting peer changes"
  }
];

const releaseReadiness: ReleaseReadinessSummary = {
  localAcceptanceStatus: "passed",
  liveDeploymentStatus: "blocked",
  releaseGateStatus: "blocked",
  providerConnections: "missing",
  migrationEvidence: "missing",
  environmentEvidence: "missing",
  observabilityEvidence: "missing",
  smokeEvidence: "missing",
  providerBlockers: ["Production provider credentials are not connected"],
  migrationBlockers: ["Live database migration evidence is missing"],
  environmentBlockers: ["Production environment variables are not verified"],
  observabilityBlockers: ["Live log drain and alert evidence is missing"],
  verificationBlockers: ["Post-deploy smoke evidence is missing"],
  nextActions: [
    "Connect production providers",
    "Run live migration proof",
    "Capture post-deploy smoke evidence"
  ]
};
