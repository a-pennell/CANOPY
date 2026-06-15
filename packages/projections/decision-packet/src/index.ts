import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export interface DecisionPacketProjectionOptions {
  readonly includeRelatedEventTrail?: boolean;
}

export type DecisionPacketEventRole =
  | "decision"
  | "decision-packet"
  | "issue"
  | "proposal"
  | "amendment"
  | "claim"
  | "evidence"
  | "authority"
  | "stewardship-outcome"
  | "allocation-accounting-outcome"
  | "objection"
  | "appeal"
  | "policy-version"
  | "redaction"
  | "supersession"
  | "related";

export interface DecisionPacketRecordSummary {
  readonly ref: ObjectRef;
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly title?: string;
  readonly summary?: string;
  readonly status?: string;
}

export interface DecisionPacketClaimSummary extends DecisionPacketRecordSummary {
  readonly disposition?: string;
  readonly contested: boolean;
}

export interface DecisionPacketEvidenceSummary extends DecisionPacketRecordSummary {
  readonly relation?: string;
  readonly claimRefs: readonly ObjectRef[];
}

export interface DecisionPacketDecisionSummary {
  readonly ref: ObjectRef;
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly outcome?: string;
  readonly effect?: string;
  readonly rationale?: string;
  readonly conditions: readonly string[];
  readonly decidedAt?: IsoDateTime;
  readonly decidedByRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
  readonly appealPathRef?: ObjectRef;
}

export interface DecisionPacketStewardshipOutcome {
  readonly ref: ObjectRef;
  readonly eventId: CanopyId;
  readonly type: CanopyEventType;
  readonly occurredAt: IsoDateTime;
  readonly state?: string;
  readonly holderRef?: ObjectRef;
  readonly resourceRef?: ObjectRef;
  readonly permissions: readonly string[];
  readonly conditions: readonly string[];
  readonly decisionRef?: ObjectRef;
}

export interface DecisionPacketAllocationAccountingOutcome {
  readonly ref: ObjectRef;
  readonly eventId: CanopyId;
  readonly type: CanopyEventType;
  readonly occurredAt: IsoDateTime;
  readonly memo?: string;
  readonly effectiveAt?: IsoDateTime;
  readonly totals?: Readonly<Record<string, unknown>>;
  readonly lineCount: number;
  readonly isReversal: boolean;
  readonly originalEventId?: CanopyId;
}

export interface DecisionPacketEventTrailEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly roles: readonly DecisionPacketEventRole[];
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapability: CanopyCapability;
  readonly title?: string;
  readonly summary?: string;
  readonly isRedacted: boolean;
  readonly isSuperseded: boolean;
  readonly supersedesEventId?: CanopyId;
  readonly supersededByEventId?: CanopyId;
}

export interface DecisionPacketRedactionIndicators {
  readonly hasRedactions: boolean;
  readonly redactedEventIds: readonly CanopyId[];
  readonly redactionEventIds: readonly CanopyId[];
  readonly redactedRefs: readonly ObjectRef[];
  readonly sealedRefs: readonly ObjectRef[];
  readonly reasons: readonly string[];
  readonly removedFields: readonly string[];
  readonly continuityEventIds: readonly CanopyId[];
}

export interface DecisionPacketSupersessionIndicators {
  readonly hasSupersessions: boolean;
  readonly supersededEventIds: readonly CanopyId[];
  readonly supersedingEventIds: readonly CanopyId[];
  readonly replacementRefs: readonly ObjectRef[];
  readonly supersedesDecisionPacketRef?: ObjectRef;
}

export interface DecisionPacketProjection {
  readonly decisionRef: ObjectRef;
  readonly packetRef?: ObjectRef;
  readonly status?: string;
  readonly outcome?: string;
  readonly rationale?: string;
  readonly conditions: readonly string[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly issueRefs: readonly ObjectRef[];
  readonly proposalRefs: readonly ObjectRef[];
  readonly amendmentRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly unresolvedObjectionRefs: readonly ObjectRef[];
  readonly objectionRefs: readonly ObjectRef[];
  readonly appealRefs: readonly ObjectRef[];
  readonly policyVersionRefs: readonly ObjectRef[];
  readonly issues: readonly DecisionPacketRecordSummary[];
  readonly proposals: readonly DecisionPacketRecordSummary[];
  readonly amendments: readonly DecisionPacketRecordSummary[];
  readonly claims: readonly DecisionPacketClaimSummary[];
  readonly evidence: readonly DecisionPacketEvidenceSummary[];
  readonly objections: readonly DecisionPacketRecordSummary[];
  readonly appeals: readonly DecisionPacketRecordSummary[];
  readonly policyVersions: readonly DecisionPacketRecordSummary[];
  readonly decision?: DecisionPacketDecisionSummary;
  readonly stewardshipOutcomes: readonly DecisionPacketStewardshipOutcome[];
  readonly allocationAccountingOutcomes: readonly DecisionPacketAllocationAccountingOutcome[];
  readonly eventTrail: readonly DecisionPacketEventTrailEntry[];
  readonly redaction: DecisionPacketRedactionIndicators;
  readonly supersession: DecisionPacketSupersessionIndicators;
}

export const buildDecisionPacketProjection = (
  decisionRef: ObjectRef,
  events: readonly CanopyEvent[],
  options: DecisionPacketProjectionOptions = {}
): DecisionPacketProjection => {
  const sortedEvents = [...events].sort(compareEvents);
  const packetEvent = latestEvent(sortedEvents, (event) =>
    isDecisionPacketForDecision(event, decisionRef)
  );
  const decisionEvent = latestEvent(sortedEvents, (event) =>
    sameRef(event.objectRef, decisionRef)
  );
  const packet = recordFromPayload(packetEvent, "decisionPacket");
  const decision = recordFromPayload(decisionEvent, "decision");
  const packetRef = packetEvent?.objectRef;

  const seedRefs = dedupeRefs([
    decisionRef,
    packetRef,
    ...recordRefs(packet, "issueRefs"),
    ...recordRefs(packet, "proposalRefs"),
    ...recordRefs(packet, "amendmentRefs"),
    ...recordRefs(packet, "claimRefs"),
    ...recordRefs(packet, "evidenceRefs"),
    ...recordRefs(packet, "authorityRefs"),
    ...recordRefs(packet, "unresolvedObjectionRefs"),
    ...recordRefs(packet, "policyRefs"),
    ...recordRefs(packet, "policyVersionRefs"),
    recordRef(packet, "appealPathRef"),
    ...recordRefs(decision, "issueRefs"),
    ...recordRefs(decision, "proposalRefs"),
    ...recordRefs(decision, "claimRefs"),
    ...recordRefs(decision, "evidenceRefs"),
    ...recordRefs(decision, "authorityRefs"),
    ...recordRefs(decision, "unresolvedObjectionRefs"),
    ...recordRefs(decision, "policyRefs"),
    recordRef(decision, "appealPathRef")
  ].filter(isDefined));

  const relevantEvents = sortedEvents.filter((event) =>
    isRelevantEvent(event, decisionRef, seedRefs, packetRef, options)
  );
  const expandedRefs = expandRefs(seedRefs, relevantEvents);
  const issueRefs = sortedRefs(
    dedupeRefs([...refsByType(expandedRefs, "issue"), ...recordRefs(packet, "issueRefs")])
  );
  const proposalRefs = sortedRefs(
    dedupeRefs([...refsByType(expandedRefs, "proposal"), ...recordRefs(packet, "proposalRefs")])
  );
  const claimRefs = sortedRefs(
    dedupeRefs([...refsByType(expandedRefs, "claim"), ...recordRefs(packet, "claimRefs")])
  );
  const amendmentRefs = sortedRefs(
    dedupeRefs([...refsByType(expandedRefs, "amendment"), ...recordRefs(packet, "amendmentRefs")])
  );
  const evidenceRefs = sortedRefs(
    dedupeRefs([...refsByType(expandedRefs, "evidence"), ...recordRefs(packet, "evidenceRefs")])
  );
  const objectionRefs = sortedRefs(
    dedupeRefs([
      ...refsByType(expandedRefs, "objection"),
      ...recordRefs(packet, "unresolvedObjectionRefs"),
      ...recordRefs(decision, "unresolvedObjectionRefs")
    ])
  );
  const unresolvedObjectionRefs = sortedRefs(
    dedupeRefs([
      ...recordRefs(packet, "unresolvedObjectionRefs"),
      ...recordRefs(decision, "unresolvedObjectionRefs")
    ])
  );
  const appealRefs = sortedRefs(refsByType(expandedRefs, "appeal"));
  const policyVersionRefs = sortedRefs(
    dedupeRefs([
      ...recordRefs(packet, "policyVersionRefs"),
      ...refsByType(expandedRefs, "policy").filter((ref) => ref.id.includes("version"))
    ])
  );
  const authorityRefs = sortedRefs(
    dedupeRefs([
      ...relevantEvents.flatMap((event) => event.authorityRefs),
      ...recordRefs(packet, "authorityRefs"),
      ...recordRefs(decision, "authorityRefs")
    ])
  );

  return optionalProjection({
    decisionRef,
    packetRef,
    status: recordString(packet, "status"),
    outcome: recordString(packet, "outcome") ?? recordString(decision, "outcome"),
    rationale: recordString(packet, "rationale") ?? recordString(decision, "rationale"),
    conditions: uniqueSortedStrings([
      ...recordStrings(packet, "conditions"),
      ...recordStrings(decision, "conditions")
    ]),
    authorityRefs,
    issueRefs,
    proposalRefs,
    amendmentRefs,
    claimRefs,
    evidenceRefs,
    unresolvedObjectionRefs,
    objectionRefs,
    appealRefs,
    policyVersionRefs,
    issues: summarizeRecords(relevantEvents, issueRefs, "issue"),
    proposals: summarizeRecords(relevantEvents, proposalRefs, "proposal"),
    amendments: summarizeRecords(relevantEvents, amendmentRefs, "amendment"),
    claims: summarizeClaims(relevantEvents, claimRefs),
    evidence: summarizeEvidence(relevantEvents, evidenceRefs),
    objections: summarizeRecords(relevantEvents, objectionRefs, "objection"),
    appeals: summarizeRecords(relevantEvents, appealRefs, "appeal"),
    policyVersions: summarizePolicyVersions(relevantEvents, policyVersionRefs),
    decision: summarizeDecision(decisionRef, decisionEvent),
    stewardshipOutcomes: summarizeStewardshipOutcomes(relevantEvents, decisionRef),
    allocationAccountingOutcomes: summarizeAllocationAccountingOutcomes(relevantEvents),
    eventTrail: relevantEvents.map((event) => toTrailEntry(event, decisionRef, packetRef)),
    redaction: collectRedactionIndicators(packet, relevantEvents),
    supersession: collectSupersessionIndicators(packet, relevantEvents)
  });
};

const isRelevantEvent = (
  event: CanopyEvent,
  decisionRef: ObjectRef,
  seedRefs: readonly ObjectRef[],
  packetRef: ObjectRef | undefined,
  options: DecisionPacketProjectionOptions
): boolean => {
  if (sameRef(event.objectRef, decisionRef) || eventReferencesRef(event, decisionRef)) {
    return true;
  }

  if (packetRef !== undefined && (sameRef(event.objectRef, packetRef) || eventReferencesRef(event, packetRef))) {
    return true;
  }

  if (options.includeRelatedEventTrail === false) {
    return false;
  }

  return seedRefs.some((ref) => sameRef(event.objectRef, ref) || eventReferencesRef(event, ref));
};

const isDecisionPacketForDecision = (event: CanopyEvent, decisionRef: ObjectRef): boolean => {
  const packet = recordFromPayload(event, "decisionPacket");
  return (
    event.type === "governance.decision_packet.recorded" &&
    (eventReferencesRef(event, decisionRef) || sameRef(recordRef(packet, "decisionRef"), decisionRef))
  );
};

const expandRefs = (
  refs: readonly ObjectRef[],
  events: readonly CanopyEvent[]
): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs([...refs, ...events.flatMap((event) => [event.objectRef, ...event.relatedRefs])]));

const summarizeRecords = (
  events: readonly CanopyEvent[],
  refs: readonly ObjectRef[],
  recordKey: string
): readonly DecisionPacketRecordSummary[] =>
  refs
    .map((ref) => {
      const event = latestEvent(events, (candidate) => sameRef(candidate.objectRef, ref));
      if (event === undefined) {
        return undefined;
      }

      const record = recordFromPayload(event, recordKey);
      return optionalRecordSummary({
        ref,
        eventId: event.id,
        occurredAt: event.occurredAt,
        title: recordString(record, "title") ?? payloadString(event.payload, ["title", "name", "label"]),
        summary:
          recordString(record, "summary") ??
          recordString(record, "description") ??
          payloadString(event.payload, ["summary", "description"]),
        status: recordString(record, "status")
      });
    })
    .filter(isDefined)
    .sort(compareRecordSummaries);

const summarizeClaims = (
  events: readonly CanopyEvent[],
  refs: readonly ObjectRef[]
): readonly DecisionPacketClaimSummary[] =>
  refs
    .map((ref) => {
      const claimEvents = events.filter((event) => sameRef(event.objectRef, ref));
      const event = latestEvent(claimEvents, () => true);
      if (event === undefined) {
        return undefined;
      }

      const record = recordFromPayload(event, "claim");
      return optionalClaimSummary({
        ref,
        eventId: event.id,
        occurredAt: event.occurredAt,
        title: recordString(record, "title") ?? payloadString(event.payload, ["title", "name", "label"]),
        summary:
          recordString(record, "summary") ??
          recordString(record, "description") ??
          payloadString(event.payload, ["summary", "description"]),
        status: recordString(record, "status") ?? payloadString(event.payload, ["status"]),
        disposition: payloadString(event.payload, ["disposition"]),
        contested: claimEvents.some((claimEvent) => claimEvent.type === "claim.contested")
      });
    })
    .filter(isDefined)
    .sort(compareRecordSummaries);

const summarizeEvidence = (
  events: readonly CanopyEvent[],
  refs: readonly ObjectRef[]
): readonly DecisionPacketEvidenceSummary[] =>
  refs
    .map((ref) => {
      const evidenceEvents = events.filter((event) => sameRef(event.objectRef, ref));
      const event = latestEvent(evidenceEvents, () => true);
      if (event === undefined) {
        return undefined;
      }

      const record = recordFromPayload(event, "evidence");
      const claimRefs = sortedRefs(
        dedupeRefs(evidenceEvents.flatMap((candidate) => candidate.relatedRefs).filter(isClaimRef))
      );
      return optionalEvidenceSummary({
        ref,
        eventId: event.id,
        occurredAt: event.occurredAt,
        title: recordString(record, "title") ?? payloadString(event.payload, ["title", "name", "label"]),
        summary:
          recordString(record, "summary") ??
          recordString(record, "description") ??
          payloadString(event.payload, ["summary", "description"]),
        status: recordString(record, "status"),
        relation: payloadString(latestLinkPayload(evidenceEvents), ["relation"]),
        claimRefs
      });
    })
    .filter(isDefined)
    .sort(compareRecordSummaries);

const summarizePolicyVersions = (
  events: readonly CanopyEvent[],
  refs: readonly ObjectRef[]
): readonly DecisionPacketRecordSummary[] =>
  refs
    .map((ref) => {
      const event = latestEvent(events, (candidate) => {
        const record = recordFromPayload(candidate, "policyVersion");
        return (
          candidate.type === "governance.policy.versioned" &&
          (recordString(record, "id") === ref.id || sameRef(candidate.objectRef, ref))
        );
      });
      if (event === undefined) {
        return undefined;
      }

      const record = recordFromPayload(event, "policyVersion");
      return optionalRecordSummary({
        ref,
        eventId: event.id,
        occurredAt: event.occurredAt,
        title: recordString(record, "title") ?? payloadString(event.payload, ["title", "name", "label"]),
        summary:
          recordString(record, "summaryOfChanges") ??
          recordString(record, "summary") ??
          payloadString(event.payload, ["summary", "description"]),
        status: recordString(record, "status")
      });
    })
    .filter(isDefined)
    .sort(compareRecordSummaries);

const summarizeDecision = (
  decisionRef: ObjectRef,
  event: CanopyEvent | undefined
): DecisionPacketDecisionSummary | undefined => {
  if (event === undefined) {
    return undefined;
  }

  const decision = recordFromPayload(event, "decision");
  return optionalDecisionSummary({
    ref: decisionRef,
    eventId: event.id,
    occurredAt: event.occurredAt,
    outcome: recordString(decision, "outcome") ?? payloadString(event.payload, ["outcome"]),
    effect: recordString(decision, "effect") ?? payloadString(event.payload, ["effect"]),
    rationale: recordString(decision, "rationale") ?? payloadString(event.payload, ["rationale"]),
    conditions: recordStrings(decision, "conditions"),
    decidedAt: recordString(decision, "decidedAt"),
    decidedByRefs: recordRefs(decision, "decidedByRefs"),
    reviewAt: recordString(decision, "reviewAt"),
    appealPathRef: recordRef(decision, "appealPathRef")
  });
};

const summarizeStewardshipOutcomes = (
  events: readonly CanopyEvent[],
  decisionRef: ObjectRef
): readonly DecisionPacketStewardshipOutcome[] =>
  events
    .filter((event) => event.type.startsWith("stewardship.use_right."))
    .map((event) =>
      optionalStewardshipOutcome({
        ref: event.objectRef,
        eventId: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        state: payloadString(event.payload, ["state"]),
        holderRef: relatedRefByPayloadId(event, "holderRefId"),
        resourceRef: relatedRefByPayloadId(event, "resourceRefId"),
        permissions: payloadStrings(event.payload, "permissions"),
        conditions: payloadStrings(event.payload, "conditions"),
        decisionRef: eventReferencesRef(event, decisionRef) ? decisionRef : undefined
      })
    )
    .sort(compareOutcomes);

const summarizeAllocationAccountingOutcomes = (
  events: readonly CanopyEvent[]
): readonly DecisionPacketAllocationAccountingOutcome[] =>
  events
    .filter((event) => event.type === "accounting.ledger_entry.posted" || event.type === "accounting.ledger_entry.reversed")
    .map((event) =>
      optionalAllocationOutcome({
        ref: event.objectRef,
        eventId: event.id,
        type: event.type,
        occurredAt: event.occurredAt,
        memo: payloadString(event.payload, ["memo"]),
        effectiveAt: payloadString(event.payload, ["effectiveAt"]),
        totals: payloadRecord(event.payload, "totals"),
        lineCount: payloadArray(event.payload, "lines").length,
        isReversal: event.type === "accounting.ledger_entry.reversed",
        originalEventId: payloadString(event.payload, ["originalEventId"])
      })
    )
    .sort(compareOutcomes);

const toTrailEntry = (
  event: CanopyEvent,
  decisionRef: ObjectRef,
  packetRef: ObjectRef | undefined
): DecisionPacketEventTrailEntry =>
  optionalTrailEntry({
    id: event.id,
    type: event.type,
    namespace: eventNamespace(event.type),
    occurredAt: event.occurredAt,
    roles: eventRoles(event, decisionRef, packetRef),
    actorRef: event.actorRef,
    systemActor: event.systemActor,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    sourceCapability: event.sourceCapability,
    title: payloadString(event.payload, ["title", "name", "label"]),
    summary: payloadString(event.payload, ["summary", "description"]),
    isRedacted: isEventRedacted(event),
    isSuperseded: isEventSuperseded(event),
    supersedesEventId: event.supersedesEventId ?? event.supersession?.supersedesEventId,
    supersededByEventId: event.supersession?.supersededByEventId
  });

const eventRoles = (
  event: CanopyEvent,
  decisionRef: ObjectRef,
  packetRef: ObjectRef | undefined
): readonly DecisionPacketEventRole[] => {
  const roles: DecisionPacketEventRole[] = [];

  if (sameRef(event.objectRef, decisionRef)) {
    roles.push("decision");
  }

  if (packetRef !== undefined && sameRef(event.objectRef, packetRef)) {
    roles.push("decision-packet");
  }

  if (event.objectRef.type === "issue") {
    roles.push("issue");
  }

  if (event.objectRef.type === "proposal") {
    roles.push("proposal");
  }

  if (event.objectRef.type === "amendment") {
    roles.push("amendment");
  }

  if (event.objectRef.type === "claim") {
    roles.push(event.type === "governance.objection.raised" ? "objection" : "claim");
  }

  if (event.objectRef.type === "objection") {
    roles.push("objection");
  }

  if (event.objectRef.type === "appeal") {
    roles.push("appeal");
  }

  if (event.type === "governance.policy.versioned") {
    roles.push("policy-version");
  }

  if (event.objectRef.type === "evidence") {
    roles.push("evidence");
  }

  if (event.authorityRefs.length > 0) {
    roles.push("authority");
  }

  if (event.type.startsWith("stewardship.use_right.")) {
    roles.push("stewardship-outcome");
  }

  if (event.type.startsWith("allocation.") || event.type.startsWith("accounting.")) {
    roles.push("allocation-accounting-outcome");
  }

  if (isEventRedacted(event)) {
    roles.push("redaction");
  }

  if (isEventSuperseded(event)) {
    roles.push("supersession");
  }

  if (roles.length === 0 || eventReferencesRef(event, decisionRef)) {
    roles.push("related");
  }

  return uniqueSortedStrings(roles);
};

const collectRedactionIndicators = (
  packet: Readonly<Record<string, unknown>> | undefined,
  events: readonly CanopyEvent[]
): DecisionPacketRedactionIndicators => {
  const redactionSummary = recordFromRecord(packet, "redactionSummary");
  const redactedEventIds = events.filter(isEventRedacted).map((event) => event.id);
  const redactionEventIds = events
    .flatMap((event) => [event.redaction?.redactionEventId, event.type === "system.redaction.applied" ? event.id : undefined])
    .filter(isDefined);
  const removedFields = uniqueSortedStrings([
    ...events.flatMap((event) => [
      ...(event.redaction?.removedPayloadKeys ?? []),
      ...payloadStrings(event.payload, "removedPayloadKeys"),
      ...payloadStrings(event.payload, "removedFields")
    ])
  ]);
  const reasons = uniqueSortedStrings(
    events
      .filter(isEventRedacted)
      .map((event) => event.redaction?.reason ?? payloadString(event.payload, ["reason"]))
      .filter(isDefined)
  );
  const continuityEventIds = uniqueSortedStrings(
    events
      .flatMap((event) => [
        event.redaction?.redactionEventId,
        event.type === "system.redaction.applied" ? event.id : undefined
      ])
      .filter(isDefined)
  );

  return {
    hasRedactions:
      redactedEventIds.length > 0 ||
      redactionEventIds.length > 0 ||
      recordBoolean(redactionSummary, "hasRedactions") === true,
    redactedEventIds: uniqueSortedStrings(redactedEventIds),
    redactionEventIds: uniqueSortedStrings(redactionEventIds),
    redactedRefs: sortedRefs(recordRefs(redactionSummary, "redactedRefs")),
    sealedRefs: sortedRefs(recordRefs(redactionSummary, "sealedRefs")),
    reasons,
    removedFields,
    continuityEventIds
  };
};

const collectSupersessionIndicators = (
  packet: Readonly<Record<string, unknown>> | undefined,
  events: readonly CanopyEvent[]
): DecisionPacketSupersessionIndicators =>
  optionalSupersessionIndicators({
    hasSupersessions: events.some(isEventSuperseded) || recordRef(packet, "supersedesDecisionPacketRef") !== undefined,
    supersededEventIds: uniqueSortedStrings(events.filter(isEventSuperseded).map((event) => event.id)),
    supersedingEventIds: uniqueSortedStrings(
      events.map((event) => event.supersession?.supersededByEventId).filter(isDefined)
    ),
    replacementRefs: sortedRefs(
      dedupeRefs(events.map((event) => event.supersession?.replacementObjectRef).filter(isDefined))
    ),
    supersedesDecisionPacketRef: recordRef(packet, "supersedesDecisionPacketRef")
  });

const latestEvent = (
  events: readonly CanopyEvent[],
  predicate: (event: CanopyEvent) => boolean
): CanopyEvent | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event !== undefined && predicate(event)) {
      return event;
    }
  }

  return undefined;
};

const latestLinkPayload = (
  events: readonly CanopyEvent[]
): Readonly<Record<string, unknown>> => latestEvent(events, (event) => event.type === "evidence.linked_to_claim")?.payload ?? {};

const eventReferencesRef = (event: CanopyEvent, ref: ObjectRef): boolean =>
  event.relatedRefs.some((relatedRef) => sameRef(relatedRef, ref)) ||
  event.authorityRefs.some((authorityRef) => sameRef(authorityRef, ref)) ||
  Object.values(event.payload).some((value) => payloadReferencesRef(value, ref));

const payloadReferencesRef = (value: unknown, ref: ObjectRef): boolean => {
  if (isObjectRef(value)) {
    return sameRef(value, ref);
  }

  if (Array.isArray(value)) {
    return value.some((entry) => payloadReferencesRef(entry, ref));
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((entry) => payloadReferencesRef(entry, ref));
  }

  return value === ref.id;
};

const recordFromPayload = (
  event: CanopyEvent | undefined,
  key: string
): Readonly<Record<string, unknown>> | undefined => recordFromRecord(event?.payload, key);

const recordFromRecord = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): Readonly<Record<string, unknown>> | undefined => {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
};

const recordString = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): string | undefined => {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const recordBoolean = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): boolean | undefined => {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const recordRef = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): ObjectRef | undefined => {
  const value = record?.[key];
  return isObjectRef(value) ? value : undefined;
};

const recordRefs = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): readonly ObjectRef[] => {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter(isObjectRef) : [];
};

const recordStrings = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): readonly string[] => {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
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

const payloadStrings = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): readonly string[] => {
  const value = payload[key];
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
};

const payloadArray = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): readonly unknown[] => {
  const value = payload[key];
  return Array.isArray(value) ? value : [];
};

const payloadRecord = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): Readonly<Record<string, unknown>> | undefined => {
  const value = payload[key];
  return isRecord(value) ? value : undefined;
};

const relatedRefByPayloadId = (event: CanopyEvent, key: string): ObjectRef | undefined => {
  const value = event.payload[key];
  return typeof value === "string"
    ? event.relatedRefs.find((relatedRef) => relatedRef.id === value)
    : undefined;
};

const refsByType = (
  refs: readonly ObjectRef[],
  type: ObjectRef["type"]
): readonly ObjectRef[] => refs.filter((ref) => ref.type === type);

const isClaimRef = (ref: ObjectRef): boolean => ref.type === "claim";

const isObjectRef = (value: unknown): value is ObjectRef => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    typeof value.namespace === "string" &&
    typeof value.lifecycleStatus === "string"
  );
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isEventRedacted = (event: CanopyEvent): boolean =>
  event.redaction?.isRedactedStub === true || event.type === "system.redaction.applied";

const isEventSuperseded = (event: CanopyEvent): boolean =>
  event.supersedesEventId !== undefined ||
  event.supersession?.supersedesEventId !== undefined ||
  event.supersession?.supersededByEventId !== undefined ||
  event.type.endsWith(".superseded");

const eventNamespace = (eventType: CanopyEventType): CanopyEventNamespace =>
  eventType.slice(0, eventType.indexOf(".")) as CanopyEventNamespace;

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const sameRef = (left: ObjectRef | undefined, right: ObjectRef): boolean =>
  left !== undefined && refKey(left) === refKey(right);

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const compareRecordSummaries = (
  left: DecisionPacketRecordSummary,
  right: DecisionPacketRecordSummary
): number => compareStrings(left.occurredAt, right.occurredAt) || compareStrings(left.ref.id, right.ref.id);

const compareOutcomes = (
  left: { readonly occurredAt: IsoDateTime; readonly eventId: CanopyId },
  right: { readonly occurredAt: IsoDateTime; readonly eventId: CanopyId }
): number => compareStrings(left.occurredAt, right.occurredAt) || compareStrings(left.eventId, right.eventId);

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueSortedStrings = <Value extends string>(values: readonly Value[]): readonly Value[] =>
  [...new Set(values)].sort(compareStrings);

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

type ProjectionInput = Omit<DecisionPacketProjection, "packetRef" | "status" | "outcome" | "rationale" | "decision"> & {
  readonly packetRef: ObjectRef | undefined;
  readonly status: string | undefined;
  readonly outcome: string | undefined;
  readonly rationale: string | undefined;
  readonly decision: DecisionPacketDecisionSummary | undefined;
};

const optionalProjection = (projection: ProjectionInput): DecisionPacketProjection => {
  const { packetRef, status, outcome, rationale, decision, ...rest } = projection;
  return {
    ...rest,
    ...(packetRef === undefined ? {} : { packetRef }),
    ...(status === undefined ? {} : { status }),
    ...(outcome === undefined ? {} : { outcome }),
    ...(rationale === undefined ? {} : { rationale }),
    ...(decision === undefined ? {} : { decision })
  };
};

type RecordSummaryInput = Omit<DecisionPacketRecordSummary, "title" | "summary" | "status"> & {
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly status: string | undefined;
};

const optionalRecordSummary = (summary: RecordSummaryInput): DecisionPacketRecordSummary => {
  const { title, summary: text, status, ...rest } = summary;
  return {
    ...rest,
    ...(title === undefined ? {} : { title }),
    ...(text === undefined ? {} : { summary: text }),
    ...(status === undefined ? {} : { status })
  };
};

type ClaimSummaryInput = Omit<DecisionPacketClaimSummary, "title" | "summary" | "status" | "disposition"> & {
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly status: string | undefined;
  readonly disposition: string | undefined;
};

const optionalClaimSummary = (summary: ClaimSummaryInput): DecisionPacketClaimSummary => {
  const { title, summary: text, status, disposition, ...rest } = summary;
  return {
    ...rest,
    ...(title === undefined ? {} : { title }),
    ...(text === undefined ? {} : { summary: text }),
    ...(status === undefined ? {} : { status }),
    ...(disposition === undefined ? {} : { disposition })
  };
};

type EvidenceSummaryInput = Omit<DecisionPacketEvidenceSummary, "title" | "summary" | "status" | "relation"> & {
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly status: string | undefined;
  readonly relation: string | undefined;
};

const optionalEvidenceSummary = (summary: EvidenceSummaryInput): DecisionPacketEvidenceSummary => {
  const { title, summary: text, status, relation, ...rest } = summary;
  return {
    ...rest,
    ...(title === undefined ? {} : { title }),
    ...(text === undefined ? {} : { summary: text }),
    ...(status === undefined ? {} : { status }),
    ...(relation === undefined ? {} : { relation })
  };
};

type DecisionSummaryInput = Omit<
  DecisionPacketDecisionSummary,
  "outcome" | "effect" | "rationale" | "decidedAt" | "reviewAt" | "appealPathRef"
> & {
  readonly outcome: string | undefined;
  readonly effect: string | undefined;
  readonly rationale: string | undefined;
  readonly decidedAt: IsoDateTime | undefined;
  readonly reviewAt: IsoDateTime | undefined;
  readonly appealPathRef: ObjectRef | undefined;
};

const optionalDecisionSummary = (
  summary: DecisionSummaryInput
): DecisionPacketDecisionSummary => {
  const { outcome, effect, rationale, decidedAt, reviewAt, appealPathRef, ...rest } = summary;
  return {
    ...rest,
    ...(outcome === undefined ? {} : { outcome }),
    ...(effect === undefined ? {} : { effect }),
    ...(rationale === undefined ? {} : { rationale }),
    ...(decidedAt === undefined ? {} : { decidedAt }),
    ...(reviewAt === undefined ? {} : { reviewAt }),
    ...(appealPathRef === undefined ? {} : { appealPathRef })
  };
};

type StewardshipOutcomeInput = Omit<
  DecisionPacketStewardshipOutcome,
  "state" | "holderRef" | "resourceRef" | "decisionRef"
> & {
  readonly state: string | undefined;
  readonly holderRef: ObjectRef | undefined;
  readonly resourceRef: ObjectRef | undefined;
  readonly decisionRef: ObjectRef | undefined;
};

const optionalStewardshipOutcome = (
  outcome: StewardshipOutcomeInput
): DecisionPacketStewardshipOutcome => {
  const { state, holderRef, resourceRef, decisionRef, ...rest } = outcome;
  return {
    ...rest,
    ...(state === undefined ? {} : { state }),
    ...(holderRef === undefined ? {} : { holderRef }),
    ...(resourceRef === undefined ? {} : { resourceRef }),
    ...(decisionRef === undefined ? {} : { decisionRef })
  };
};

type AllocationOutcomeInput = Omit<
  DecisionPacketAllocationAccountingOutcome,
  "memo" | "effectiveAt" | "totals" | "originalEventId"
> & {
  readonly memo: string | undefined;
  readonly effectiveAt: IsoDateTime | undefined;
  readonly totals: Readonly<Record<string, unknown>> | undefined;
  readonly originalEventId: CanopyId | undefined;
};

const optionalAllocationOutcome = (
  outcome: AllocationOutcomeInput
): DecisionPacketAllocationAccountingOutcome => {
  const { memo, effectiveAt, totals, originalEventId, ...rest } = outcome;
  return {
    ...rest,
    ...(memo === undefined ? {} : { memo }),
    ...(effectiveAt === undefined ? {} : { effectiveAt }),
    ...(totals === undefined ? {} : { totals }),
    ...(originalEventId === undefined ? {} : { originalEventId })
  };
};

type TrailEntryInput = Omit<
  DecisionPacketEventTrailEntry,
  "actorRef" | "systemActor" | "title" | "summary" | "supersedesEventId" | "supersededByEventId"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly supersedesEventId: CanopyId | undefined;
  readonly supersededByEventId: CanopyId | undefined;
};

const optionalTrailEntry = (entry: TrailEntryInput): DecisionPacketEventTrailEntry => {
  const { actorRef, systemActor, title, summary, supersedesEventId, supersededByEventId, ...rest } = entry;
  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    ...(supersedesEventId === undefined ? {} : { supersedesEventId }),
    ...(supersededByEventId === undefined ? {} : { supersededByEventId })
  };
};

type SupersessionInput = Omit<
  DecisionPacketSupersessionIndicators,
  "supersedesDecisionPacketRef"
> & {
  readonly supersedesDecisionPacketRef: ObjectRef | undefined;
};

const optionalSupersessionIndicators = (
  indicators: SupersessionInput
): DecisionPacketSupersessionIndicators => {
  const { supersedesDecisionPacketRef, ...rest } = indicators;
  return {
    ...rest,
    ...(supersedesDecisionPacketRef === undefined ? {} : { supersedesDecisionPacketRef })
  };
};
