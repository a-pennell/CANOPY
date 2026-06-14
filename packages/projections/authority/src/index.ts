import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import { EVENT_TYPES_REQUIRING_AUTHORITY } from "@canopy/contracts-kernel";

export type AuthorityProjectionStatus = "ok" | "attention" | "denied";

export type AuthorityEventKind =
  | "membership"
  | "role"
  | "mandate"
  | "delegation"
  | "guardian"
  | "use-right"
  | "policy"
  | "decision";

export type AuthorityFindingKind =
  | "missing-authority"
  | "membership-only-authority"
  | "binding-event-uncovered"
  | "authority-inactive-record"
  | "authority-empty-scope"
  | "delegation-empty-grant"
  | "delegation-self-delegation"
  | "proposal-missing-proposer"
  | "proposal-missing-eligible-voters"
  | "proposal-unresolved-blocking-objections"
  | "decision-missing-decider"
  | "decision-unresolved-objections"
  | "decision-consent-blocked"
  | "decision-quorum-not-met"
  | "decision-contested-evidence-unhandled"
  | "decision-missing-appeal-path"
  | "authority-revoked"
  | "delegation-revoked"
  | "appeal-missing-grounds"
  | "appeal-missing-reviewer"
  | "use-right-missing-holder"
  | "use-right-missing-resource"
  | "use-right-missing-review-path"
  | "use-right-missing-revocation-semantics"
  | "use-right-denial-missing-reason"
  | "use-right-denial-missing-appeal-path"
  | "use-right-revocation-missing-reason"
  | "emergency-missing-authority"
  | "emergency-missing-constraints";

export type AuthorityTraceRelevance = "object" | "related" | "authority";

export interface AuthorityProjectionOptions {
  readonly bindingEventTypes?: readonly CanopyEventType[];
}

export interface AuthorityEventEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly kind: AuthorityEventKind;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly isBinding: boolean;
  readonly hasAuthority: boolean;
  readonly isMembershipOnlyAuthority: boolean;
  readonly title?: string;
  readonly summary?: string;
}

export interface AuthorityFinding {
  readonly kind: AuthorityFindingKind;
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly message: string;
}

export interface AuthorityBindingCoverageEntry {
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly occurredAt: IsoDateTime;
  readonly authorityRefs: readonly ObjectRef[];
  readonly covered: boolean;
  readonly membershipOnly: boolean;
}

export interface AuthorityTraceEvent {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly kind?: AuthorityEventKind;
  readonly occurredAt: IsoDateTime;
  readonly relevance: AuthorityTraceRelevance;
  readonly actorRef?: ObjectRef;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly isBinding: boolean;
  readonly hasAuthority: boolean;
}

export interface AuthorityTrace {
  readonly objectRef: ObjectRef;
  readonly events: readonly AuthorityTraceEvent[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly findings: readonly AuthorityFinding[];
  readonly status: AuthorityProjectionStatus;
}

export interface AuthorityProjectionIndicators {
  readonly status: AuthorityProjectionStatus;
  readonly hasDenied: boolean;
  readonly hasAttention: boolean;
  readonly missingAuthorityEventIds: readonly CanopyId[];
  readonly membershipOnlyWarningEventIds: readonly CanopyId[];
  readonly uncoveredBindingEventIds: readonly CanopyId[];
  readonly authorityFlowIssueEventIds: readonly CanopyId[];
}

export interface AuthorityProjection {
  readonly actorRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly authorityEvents: readonly AuthorityEventEntry[];
  readonly bindingCoverage: readonly AuthorityBindingCoverageEntry[];
  readonly membershipOnlyWarnings: readonly AuthorityFinding[];
  readonly findings: readonly AuthorityFinding[];
  readonly tracesByObject: readonly AuthorityTrace[];
  readonly indicators: AuthorityProjectionIndicators;
}

const AUTHORITY_EVENT_TYPES = [
  "identity.membership.activated",
  "authority.role.assigned",
  "authority.role.revoked",
  "authority.mandate.granted",
  "authority.mandate.revoked",
  "authority.delegation.granted",
  "authority.delegation.revoked",
  "authority.guardian.appointed",
  "governance.decision.recorded",
  "governance.policy.versioned",
  "stewardship.use_right.granted",
  "stewardship.use_right.denied",
  "stewardship.use_right.revoked"
] as const satisfies readonly CanopyEventType[];

export const buildAuthorityProjection = (
  events: readonly CanopyEvent[],
  options: AuthorityProjectionOptions = {}
): AuthorityProjection => {
  const sortedEvents = [...events].sort(compareEvents);
  const bindingEventTypes = new Set<CanopyEventType>(
    options.bindingEventTypes ?? EVENT_TYPES_REQUIRING_AUTHORITY
  );
  const authorityEvents = sortedEvents
    .filter((event) => authorityEventKind(event) !== undefined)
    .map((event) => toAuthorityEventEntry(event, bindingEventTypes));
  const bindingCoverage = sortedEvents
    .filter((event) => isBindingEvent(event, bindingEventTypes))
    .map(toBindingCoverageEntry);
  const findings = collectFindings(sortedEvents, bindingEventTypes);
  const membershipOnlyWarnings = findings.filter(
    (finding) => finding.kind === "membership-only-authority"
  );
  const tracesByObject = collectTraces(sortedEvents, findings, bindingEventTypes);
  const indicators = collectIndicators(findings);

  return {
    actorRefs: sortedRefs(dedupeRefs(sortedEvents.map((event) => event.actorRef).filter(isDefined))),
    authorityRefs: collectAuthorityRefs(sortedEvents),
    authorityEvents,
    bindingCoverage,
    membershipOnlyWarnings,
    findings,
    tracesByObject,
    indicators
  };
};

export const buildAuthorityTrace = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[],
  options: AuthorityProjectionOptions = {}
): AuthorityTrace => {
  const bindingEventTypes = new Set<CanopyEventType>(
    options.bindingEventTypes ?? EVENT_TYPES_REQUIRING_AUTHORITY
  );
  const sortedEvents = [...events].sort(compareEvents);
  const findings = collectFindings(sortedEvents, bindingEventTypes);

  return toTrace(objectRef, sortedEvents, findings, bindingEventTypes);
};

const toAuthorityEventEntry = (
  event: CanopyEvent,
  bindingEventTypes: ReadonlySet<CanopyEventType>
): AuthorityEventEntry =>
  optionalAuthorityEventEntry({
    id: event.id,
    type: event.type,
    kind: authorityEventKind(event) ?? "decision",
    occurredAt: event.occurredAt,
    actorRef: event.actorRef,
    systemActor: event.systemActor,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    isBinding: isBindingEvent(event, bindingEventTypes),
    hasAuthority: hasNonMembershipAuthority(event),
    isMembershipOnlyAuthority: isMembershipOnlyAuthority(event),
    title: payloadString(event.payload, ["title", "name", "label"]),
    summary: payloadString(event.payload, ["summary", "description"])
  });

const toBindingCoverageEntry = (event: CanopyEvent): AuthorityBindingCoverageEntry => ({
  eventId: event.id,
  eventType: event.type,
  objectRef: event.objectRef,
  occurredAt: event.occurredAt,
  authorityRefs: sortedRefs(event.authorityRefs),
  covered: hasNonMembershipAuthority(event),
  membershipOnly: isMembershipOnlyAuthority(event)
});

const collectFindings = (
  events: readonly CanopyEvent[],
  bindingEventTypes: ReadonlySet<CanopyEventType>
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];

  for (const event of events) {
    if (!isBindingEvent(event, bindingEventTypes)) {
      continue;
    }

    if (event.authorityRefs.length === 0) {
      findings.push({
        kind: "missing-authority",
        eventId: event.id,
        eventType: event.type,
        objectRef: event.objectRef,
        authorityRefs: [],
        message: "Binding event requires explicit authorityRefs."
      });
      findings.push({
        kind: "binding-event-uncovered",
        eventId: event.id,
        eventType: event.type,
        objectRef: event.objectRef,
        authorityRefs: [],
        message: "Binding event is not covered by a mandate, delegation, guardian, policy, use-right, agreement, or emergency authority ref."
      });
      continue;
    }

    if (isMembershipOnlyAuthority(event)) {
      findings.push({
        kind: "membership-only-authority",
        eventId: event.id,
        eventType: event.type,
        objectRef: event.objectRef,
        authorityRefs: sortedRefs(event.authorityRefs),
        message: "Membership grants belonging, not binding authority."
      });
      findings.push({
        kind: "binding-event-uncovered",
        eventId: event.id,
        eventType: event.type,
        objectRef: event.objectRef,
        authorityRefs: sortedRefs(event.authorityRefs),
        message: "Binding event cannot be covered only by membership authority."
      });
    }
  }

  findings.push(...collectAuthorityFlowFindings(events));

  return findings.sort(compareFindings);
};

const collectTraces = (
  events: readonly CanopyEvent[],
  findings: readonly AuthorityFinding[],
  bindingEventTypes: ReadonlySet<CanopyEventType>
): readonly AuthorityTrace[] => {
  const refs = dedupeRefs(
    events.flatMap((event) => [event.objectRef, ...event.relatedRefs, ...event.authorityRefs])
  );

  return sortedRefs(refs).map((objectRef) =>
    toTrace(objectRef, events, findings, bindingEventTypes)
  );
};

const toTrace = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[],
  findings: readonly AuthorityFinding[],
  bindingEventTypes: ReadonlySet<CanopyEventType>
): AuthorityTrace => {
  const traceEvents = events
    .map((event) => ({ event, relevance: traceRelevance(objectRef, event) }))
    .filter(
      (
        entry
      ): entry is {
        readonly event: CanopyEvent;
        readonly relevance: AuthorityTraceRelevance;
      } => entry.relevance !== undefined
    )
    .map(({ event, relevance }) => toTraceEvent(event, relevance, bindingEventTypes));
  const traceFindings = findings.filter((finding) =>
    traceEvents.some((event) => event.id === finding.eventId)
  );
  const status = statusForFindings(traceFindings);

  return {
    objectRef,
    events: traceEvents,
    authorityRefs: sortedRefs(dedupeRefs(traceEvents.flatMap((event) => event.authorityRefs))),
    findings: traceFindings,
    status
  };
};

const toTraceEvent = (
  event: CanopyEvent,
  relevance: AuthorityTraceRelevance,
  bindingEventTypes: ReadonlySet<CanopyEventType>
): AuthorityTraceEvent =>
  optionalTraceEvent({
    id: event.id,
    type: event.type,
    kind: authorityEventKind(event),
    occurredAt: event.occurredAt,
    relevance,
    actorRef: event.actorRef,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    isBinding: isBindingEvent(event, bindingEventTypes),
    hasAuthority: hasNonMembershipAuthority(event)
  });

const collectIndicators = (
  findings: readonly AuthorityFinding[]
): AuthorityProjectionIndicators => {
  const missingAuthorityEventIds = findingIds(findings, "missing-authority");
  const membershipOnlyWarningEventIds = findingIds(findings, "membership-only-authority");
  const uncoveredBindingEventIds = findingIds(findings, "binding-event-uncovered");
  const authorityFlowIssueEventIds = [
    ...uniqueStrings(
      findings
        .filter(
          (finding) =>
            finding.kind !== "missing-authority" &&
            finding.kind !== "membership-only-authority" &&
            finding.kind !== "binding-event-uncovered"
        )
        .map((finding) => finding.eventId)
    )
  ].sort(compareStrings);
  const hasDenied =
    missingAuthorityEventIds.length > 0 ||
    uncoveredBindingEventIds.length > 0 ||
    authorityFlowIssueEventIds.length > 0;
  const hasAttention = membershipOnlyWarningEventIds.length > 0;

  return {
    status: hasDenied ? "denied" : hasAttention ? "attention" : "ok",
    hasDenied,
    hasAttention,
    missingAuthorityEventIds,
    membershipOnlyWarningEventIds,
    uncoveredBindingEventIds,
    authorityFlowIssueEventIds
  };
};

const collectAuthorityFlowFindings = (
  events: readonly CanopyEvent[]
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];

  for (const event of events) {
    const record = payloadRecord(event);

    if (
      event.type === "authority.role.assigned" ||
      event.type === "authority.mandate.granted" ||
      event.type === "authority.delegation.granted"
    ) {
      findings.push(...authorityRecordFindings(event, record));
    }

    if (event.type === "authority.delegation.granted") {
      findings.push(...delegationFindings(event, record));
    }

    if (
      event.type === "governance.proposal.opened" ||
      event.type === "governance.proposal.created"
    ) {
      findings.push(...proposalFindings(event, record));
    }

    if (event.type === "governance.decision.recorded") {
      findings.push(...decisionFindings(event, record));
      findings.push(...governanceControlFindings(event));
    }

    if (event.type === "governance.appeal.opened") {
      findings.push(...appealFindings(event, record));
    }

    if (event.type.startsWith("stewardship.use_right.")) {
      findings.push(...useRightFindings(event, record));
    }

    findings.push(...emergencyAuthorityFindings(event, record));
  }

  return findings;
};

const authorityRecordFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];
  const status = stringField(record, "status");

  if (
    status !== undefined &&
    status !== "active" &&
    status !== "verified"
  ) {
    findings.push(
      finding(
        "authority-inactive-record",
        event,
        "Authority records must be active before they can authorize governance action."
      )
    );
  }

  const scope = recordField(record, "scope");
  if (scope !== undefined && !scopeHasBoundary(scope)) {
    findings.push(
      finding(
        "authority-empty-scope",
        event,
        "Authority records must define an organization, place, commons, living system, target, capability, or action scope."
      )
    );
  }

  return findings;
};

const delegationFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];

  if (
    hasField(record, "delegatedAuthorityRefs") &&
    arrayField(record, "delegatedAuthorityRefs").length === 0
  ) {
    findings.push(
      finding(
        "delegation-empty-grant",
        event,
        "Delegations must name at least one delegatedAuthorityRef."
      )
    );
  }

  const delegatorRef = recordField(record, "delegatorRef");
  const delegateRef = recordField(record, "delegateRef");
  if (
    delegatorRef !== undefined &&
    delegateRef !== undefined &&
    objectRefKey(delegatorRef) === objectRefKey(delegateRef)
  ) {
    findings.push(
      finding(
        "delegation-self-delegation",
        event,
        "Delegations cannot delegate authority back to the same actor."
      )
    );
  }

  return findings;
};

const proposalFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];
  const method = recordField(record, "decisionMethod");

  if (
    hasField(record, "proposedByRefs") &&
    arrayField(record, "proposedByRefs").length === 0
  ) {
    findings.push(
      finding(
        "proposal-missing-proposer",
        event,
        "Open proposals require at least one proposedByRef."
      )
    );
  }

  if (
    method !== undefined &&
    !["delegated_authority", "guardian_review", "emergency_authority"].includes(
      stringField(method, "kind") ?? ""
    ) &&
    arrayField(method, "eligibleVoterRefs").length === 0
  ) {
    findings.push(
      finding(
        "proposal-missing-eligible-voters",
        event,
        "Participatory decision methods require eligibleVoterRefs."
      )
    );
  }

  if (
    method !== undefined &&
    stringField(method, "kind") === "emergency_authority" &&
    hasField(record, "objectionRefs") &&
    arrayField(record, "objectionRefs").length > 0
  ) {
    findings.push(
      finding(
        "proposal-unresolved-blocking-objections",
        event,
        "Emergency proposal opening cannot bypass existing objectionRefs."
      )
    );
  }

  return findings;
};

const decisionFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const method = recordField(record, "method");
  const methodKind = method === undefined ? undefined : stringField(method, "kind");
  const findings: AuthorityFinding[] = [];

  if (
    hasField(record, "decidedByRefs") &&
    arrayField(record, "decidedByRefs").length === 0
  ) {
    findings.push(
      finding(
        "decision-missing-decider",
        event,
        "Recorded decisions require at least one decidedByRef."
      )
    );
  }

  if (
    hasField(record, "unresolvedObjectionRefs") &&
    arrayField(record, "unresolvedObjectionRefs").length > 0 &&
    methodKind !== "emergency_authority"
  ) {
    findings.push(
      finding(
        "decision-unresolved-objections",
        event,
        "Binding decisions cannot be recorded with unresolvedObjectionRefs unless the method is emergency_authority."
      )
    );
  }

  return findings;
};

const governanceControlFindings = (
  event: CanopyEvent
): readonly AuthorityFinding[] => {
  const controls = event.payload["governanceControls"];

  if (!isRecord(controls)) {
    return [];
  }

  const issues = arrayField(controls, "issues").filter(isRecord);

  return issues
    .map((issueRecord) => controlIssueFindingKind(stringField(issueRecord, "code")))
    .filter(isDefined)
    .map((kind) =>
      finding(
        kind,
        event,
        messageForControlFinding(kind)
      )
    );
};

const appealFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const findings: AuthorityFinding[] = [];

  if (hasField(record, "grounds") && arrayField(record, "grounds").length === 0) {
    findings.push(
      finding(
        "appeal-missing-grounds",
        event,
        "Appeals require at least one stated ground."
      )
    );
  }

  const status = stringField(record, "status");
  if (status !== undefined && status !== "open" && arrayField(record, "reviewerRefs").length === 0) {
    findings.push(
      finding(
        "appeal-missing-reviewer",
        event,
        "Appeals under review or later require at least one reviewerRef."
      )
    );
  }

  return findings;
};

const useRightFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  if (event.authorityRefs.length === 0 && event.type !== "stewardship.use_right.appealed") {
    return [];
  }

  const findings: AuthorityFinding[] = [];

  if (
    hasField(record, "holderRef") &&
    recordField(record, "holderRef") === undefined
  ) {
    findings.push(
      finding(
        "use-right-missing-holder",
        event,
        "Use-right workflow events must preserve the holder ref."
      )
    );
  }

  if (
    hasField(record, "resourceRef") &&
    recordField(record, "resourceRef") === undefined
  ) {
    findings.push(
      finding(
        "use-right-missing-resource",
        event,
        "Use-right workflow events must preserve the resource ref."
      )
    );
  }

  const review = recordField(record, "review");
  const hasApprovalEnforcementMetadata =
    hasField(record, "review") || hasField(record, "revocation");
  if (
    event.type === "stewardship.use_right.granted" &&
    hasApprovalEnforcementMetadata &&
    (review === undefined || stringField(review, "reviewAt") === undefined)
  ) {
    findings.push(
      finding(
        "use-right-missing-review-path",
        event,
        "Use-right approvals must preserve review timing and path metadata."
      )
    );
  }

  const revocation = recordField(record, "revocation");
  if (
    event.type === "stewardship.use_right.granted" &&
    hasApprovalEnforcementMetadata &&
    (revocation === undefined ||
      stringField(revocation, "revocationPathRefId") === undefined ||
      arrayField(revocation, "revocationConditions").length === 0)
  ) {
    findings.push(
      finding(
        "use-right-missing-revocation-semantics",
        event,
        "Use-right approvals must preserve revocation path and conditions."
      )
    );
  }

  if (
    event.type === "stewardship.use_right.denied" &&
    stringField(record, "reason") === undefined
  ) {
    findings.push(
      finding(
        "use-right-denial-missing-reason",
        event,
        "Use-right denials must preserve a reason."
      )
    );
  }

  if (
    event.type === "stewardship.use_right.denied" &&
    stringField(record, "appealPathRefId") === undefined
  ) {
    findings.push(
      finding(
        "use-right-denial-missing-appeal-path",
        event,
        "Use-right denials must preserve an appeal path."
      )
    );
  }

  if (
    event.type === "stewardship.use_right.revoked" &&
    stringField(record, "reason") === undefined
  ) {
    findings.push(
      finding(
        "use-right-revocation-missing-reason",
        event,
        "Use-right revocations must preserve a reason."
      )
    );
  }

  if (event.type === "stewardship.use_right.appealed") {
    findings.push(...appealFindings(event, record));
  }

  return findings;
};

const emergencyAuthorityFindings = (
  event: CanopyEvent,
  record: Readonly<Record<string, unknown>>
): readonly AuthorityFinding[] => {
  const method = recordField(record, "method") ?? recordField(record, "decisionMethod");
  const emergency =
    event.payload["emergency"] === true ||
    stringField(method ?? {}, "kind") === "emergency_authority";

  if (!emergency) {
    return [];
  }

  const findings: AuthorityFinding[] = [];
  const methodAuthorityRefs = recordField(method ?? {}, "authorityRefs");
  const authorityRefs = [
    ...event.authorityRefs,
    ...(Array.isArray(methodAuthorityRefs)
      ? methodAuthorityRefs.filter(isObjectRefLike).map(toObjectRef)
      : [])
  ];
  const conditions = [
    ...arrayField(record, "conditions"),
    stringField(method ?? {}, "notes")
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (!authorityRefs.some(isEmergencyAuthorityRef)) {
    findings.push(
      finding(
        "emergency-missing-authority",
        event,
        "Emergency authority actions must cite an emergency mandate or emergency authority ref."
      )
    );
  }

  if (conditions.length === 0) {
    findings.push(
      finding(
        "emergency-missing-constraints",
        event,
        "Emergency authority actions must preserve explicit conditions, limits, or review notes."
      )
    );
  }

  return findings;
};

const controlIssueFindingKind = (
  code: string | undefined
): AuthorityFindingKind | undefined => {
  switch (code) {
    case "consent_blocked":
      return "decision-consent-blocked";
    case "quorum_not_met":
      return "decision-quorum-not-met";
    case "contested_evidence_unhandled":
      return "decision-contested-evidence-unhandled";
    case "appeal_path_missing":
      return "decision-missing-appeal-path";
    case "authority_revoked":
      return "authority-revoked";
    case "delegation_revoked":
      return "delegation-revoked";
    default:
      return undefined;
  }
};

const messageForControlFinding = (kind: AuthorityFindingKind): string => {
  switch (kind) {
    case "decision-consent-blocked":
      return "Consent signals include a block or withheld consent.";
    case "decision-quorum-not-met":
      return "Quorum must be met or explicitly waived before recording this decision.";
    case "decision-contested-evidence-unhandled":
      return "Decision uses contested evidence without preserving objections, conditions, rationale, or an appeal path.";
    case "decision-missing-appeal-path":
      return "Binding or contested decisions must preserve an appeal path ref.";
    case "authority-revoked":
      return "Decision cites an authority ref that has been revoked.";
    case "delegation-revoked":
      return "Decision context includes revoked delegation refs.";
    default:
      return "Governance control issue requires attention.";
  }
};

const finding = (
  kind: AuthorityFindingKind,
  event: CanopyEvent,
  message: string
): AuthorityFinding => ({
  kind,
  eventId: event.id,
  eventType: event.type,
  objectRef: event.objectRef,
  authorityRefs: sortedRefs(event.authorityRefs),
  message
});

const collectAuthorityRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) => [
        ...event.authorityRefs,
        ...(event.supersession?.authorityRefs ?? [])
      ])
    )
  );

const findingIds = (
  findings: readonly AuthorityFinding[],
  kind: AuthorityFindingKind
): readonly CanopyId[] =>
  [
    ...uniqueStrings(
      findings.filter((finding) => finding.kind === kind).map((finding) => finding.eventId)
    )
  ].sort(compareStrings);

const statusForFindings = (
  findings: readonly AuthorityFinding[]
): AuthorityProjectionStatus => {
  if (
    findings.some(
      (finding) =>
        finding.kind !== "membership-only-authority"
    )
  ) {
    return "denied";
  }

  if (findings.some((finding) => finding.kind === "membership-only-authority")) {
    return "attention";
  }

  return "ok";
};

const authorityEventKind = (event: CanopyEvent): AuthorityEventKind | undefined => {
  if (event.type === "identity.membership.activated" || event.objectRef.id.includes("membership")) {
    return "membership";
  }

  if (event.type.startsWith("authority.role.") || event.objectRef.type === "role") {
    return "role";
  }

  if (event.type.startsWith("authority.mandate.") || event.objectRef.type === "mandate") {
    return "mandate";
  }

  if (event.type.startsWith("authority.delegation.") || event.objectRef.id.includes("delegation")) {
    return "delegation";
  }

  if (
    event.type.startsWith("authority.guardian.") ||
    event.type.startsWith("ecology.guardian.") ||
    event.objectRef.type === "guardian-review" ||
    event.objectRef.id.includes("guardian")
  ) {
    return "guardian";
  }

  if (event.type.startsWith("stewardship.use_right.") || event.objectRef.type === "use-right") {
    return "use-right";
  }

  if (event.type === "governance.policy.versioned" || event.objectRef.type === "policy") {
    return "policy";
  }

  if (event.type === "governance.decision.recorded" || event.objectRef.type === "decision") {
    return "decision";
  }

  if ((AUTHORITY_EVENT_TYPES as readonly CanopyEventType[]).includes(event.type)) {
    return "role";
  }

  return undefined;
};

const isBindingEvent = (
  event: CanopyEvent,
  bindingEventTypes: ReadonlySet<CanopyEventType>
): boolean =>
  bindingEventTypes.has(event.type) ||
  Boolean(event.payload["binding"] === true || event.payload["effect"] === "binding");

const hasNonMembershipAuthority = (event: CanopyEvent): boolean =>
  event.authorityRefs.some((authorityRef) => !isMembershipAuthorityRef(authorityRef));

const isMembershipOnlyAuthority = (event: CanopyEvent): boolean =>
  event.authorityRefs.length > 0 && event.authorityRefs.every(isMembershipAuthorityRef);

const isMembershipAuthorityRef = (ref: ObjectRef): boolean =>
  ref.id.includes("membership") || ref.type === "organization";

const isEmergencyAuthorityRef = (ref: ObjectRef): boolean =>
  ref.type === "mandate" && ref.id.includes("emergency");

const traceRelevance = (
  objectRef: ObjectRef,
  event: CanopyEvent
): AuthorityTraceRelevance | undefined => {
  if (sameRef(objectRef, event.objectRef)) {
    return "object";
  }

  if (event.relatedRefs.some((relatedRef) => sameRef(objectRef, relatedRef))) {
    return "related";
  }

  if (event.authorityRefs.some((authorityRef) => sameRef(objectRef, authorityRef))) {
    return "authority";
  }

  return undefined;
};

const payloadString = (
  payload: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const payloadRecord = (event: CanopyEvent): Readonly<Record<string, unknown>> => {
  for (const key of [
    "mandate",
    "roleAssignment",
    "assignment",
    "delegation",
    "proposal",
    "decision",
    "appeal",
    "useRight",
    "useRightAppeal"
  ]) {
    const value = event.payload[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return event.payload;
};

const recordField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): Readonly<Record<string, unknown>> | undefined => {
  const value = record[key];

  return isRecord(value) ? value : undefined;
};

const hasField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): boolean => Object.prototype.hasOwnProperty.call(record, key);

const arrayField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): readonly unknown[] => {
  const value = record[key];

  return Array.isArray(value) ? value : [];
};

const stringField = (
  record: Readonly<Record<string, unknown>>,
  key: string
): string | undefined => {
  const value = record[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const scopeHasBoundary = (scope: Readonly<Record<string, unknown>>): boolean =>
  [
    "orgRef",
    "placeRef",
    "commonsRef",
    "livingSystemRef",
    "capability"
  ].some((key) => scope[key] !== undefined) ||
  arrayField(scope, "targetRefs").length > 0 ||
  arrayField(scope, "actionKeys").length > 0;

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const compareFindings = (left: AuthorityFinding, right: AuthorityFinding): number =>
  compareStrings(left.eventId, right.eventId) ||
  compareStrings(left.kind, right.kind) ||
  compareStrings(left.eventType, right.eventType);

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const sameRef = (left: ObjectRef, right: ObjectRef): boolean => refKey(left) === refKey(right);

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const objectRefKey = (ref: Readonly<Record<string, unknown>>): string =>
  `${String(ref["namespace"])}:${String(ref["type"])}:${String(ref["id"])}`;

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
];

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isObjectRefLike = (value: unknown): value is Readonly<Record<string, unknown>> =>
  isRecord(value) &&
  typeof value["id"] === "string" &&
  typeof value["type"] === "string" &&
  typeof value["namespace"] === "string" &&
  typeof value["lifecycleStatus"] === "string";

const toObjectRef = (value: Readonly<Record<string, unknown>>): ObjectRef => ({
  id: String(value["id"]),
  type: value["type"] as ObjectRef["type"],
  namespace: String(value["namespace"]),
  lifecycleStatus: value["lifecycleStatus"] as ObjectRef["lifecycleStatus"]
});

type AuthorityEventEntryInput = Omit<
  AuthorityEventEntry,
  "actorRef" | "systemActor" | "title" | "summary"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
};

const optionalAuthorityEventEntry = (
  event: AuthorityEventEntryInput
): AuthorityEventEntry => {
  const { actorRef, systemActor, title, summary, ...rest } = event;

  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary })
  };
};

type AuthorityTraceEventInput = Omit<AuthorityTraceEvent, "kind" | "actorRef"> & {
  readonly kind: AuthorityEventKind | undefined;
  readonly actorRef: ObjectRef | undefined;
};

const optionalTraceEvent = (event: AuthorityTraceEventInput): AuthorityTraceEvent => {
  const { kind, actorRef, ...rest } = event;

  return {
    ...rest,
    ...(kind === undefined ? {} : { kind }),
    ...(actorRef === undefined ? {} : { actorRef })
  };
};
