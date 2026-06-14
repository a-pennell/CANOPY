import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export type ResourceStewardshipUseRightState = "proposed" | "granted" | "revoked";
export type ResourceStewardshipEventRelevance = "resource" | "use-right" | "linked";

export interface ResourceStewardshipEventTrailEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly relevance: ResourceStewardshipEventRelevance;
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
}

export interface ResourceStewardshipContextEvent {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly observedAt?: IsoDateTime;
  readonly contextRef?: ObjectRef;
  readonly ecologicalContextIds: readonly CanopyId[];
  readonly summary: Readonly<Record<string, unknown>>;
}

export interface ResourceStewardshipReviewSummary {
  readonly reviewPathRef?: ObjectRef;
  readonly reviewPathRefId?: CanopyId;
  readonly reviewAt?: IsoDateTime;
}

export interface ResourceStewardshipRevocationSummary {
  readonly revocable?: boolean;
  readonly revocationPathRef?: ObjectRef;
  readonly revocationPathRefId?: CanopyId;
  readonly revocationConditions: readonly string[];
  readonly revokedAt?: IsoDateTime;
  readonly revocationEventId?: CanopyId;
  readonly reason?: string;
}

export interface ResourceStewardshipUseRightSummary {
  readonly useRightRef: ObjectRef;
  readonly state: ResourceStewardshipUseRightState;
  readonly holderRef?: ObjectRef;
  readonly holderRefId?: CanopyId;
  readonly resourceRef: ObjectRef;
  readonly permissions: readonly string[];
  readonly conditions: readonly string[];
  readonly term?: {
    readonly startsAt?: IsoDateTime;
    readonly endsAt?: IsoDateTime;
  };
  readonly review: ResourceStewardshipReviewSummary;
  readonly revocation: ResourceStewardshipRevocationSummary;
  readonly proposalRefs: readonly ObjectRef[];
  readonly proposalRefIds: readonly CanopyId[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly decisionRefIds: readonly CanopyId[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly proposedEventIds: readonly CanopyId[];
  readonly grantedEventIds: readonly CanopyId[];
  readonly revokedEventIds: readonly CanopyId[];
  readonly latestEventId: CanopyId;
  readonly latestEventAt: IsoDateTime;
}

export interface ResourceStewardshipLinkedRefs {
  readonly proposals: readonly ObjectRef[];
  readonly decisions: readonly ObjectRef[];
  readonly claims: readonly ObjectRef[];
  readonly evidence: readonly ObjectRef[];
}

export interface ResourceStewardshipCount {
  readonly count: number;
}

export interface ResourceStewardshipNamespaceCount extends ResourceStewardshipCount {
  readonly namespace: CanopyEventNamespace;
}

export interface ResourceStewardshipCapabilityCount extends ResourceStewardshipCount {
  readonly capability: CanopyCapability;
}

export interface ResourceStewardshipStateCounts {
  readonly proposed: number;
  readonly granted: number;
  readonly revoked: number;
}

export interface ResourceStewardshipCounts {
  readonly totalEvents: number;
  readonly contextEvents: number;
  readonly useRights: ResourceStewardshipStateCounts;
  readonly byNamespace: readonly ResourceStewardshipNamespaceCount[];
  readonly byCapability: readonly ResourceStewardshipCapabilityCount[];
}

export interface ResourceStewardshipProjection {
  readonly resourceRef: ObjectRef;
  readonly title?: string;
  readonly summary?: string;
  readonly resourceKind?: string;
  readonly contextEvents: readonly ResourceStewardshipContextEvent[];
  readonly useRights: readonly ResourceStewardshipUseRightSummary[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly linkedRefs: ResourceStewardshipLinkedRefs;
  readonly ecologicalContextIds: readonly CanopyId[];
  readonly eventTrail: readonly ResourceStewardshipEventTrailEntry[];
  readonly counts: ResourceStewardshipCounts;
}

export const buildResourceStewardshipProjection = (
  resourceRef: ObjectRef,
  events: readonly CanopyEvent[]
): ResourceStewardshipProjection => {
  const relevantEvents = events
    .map((event) => ({ event, relevance: getEventRelevance(resourceRef, event) }))
    .filter(
      (
        entry
      ): entry is {
        readonly event: CanopyEvent;
        readonly relevance: ResourceStewardshipEventRelevance;
      } => entry.relevance !== undefined
    )
    .sort(compareRelevantEvents);
  const projectedEvents = relevantEvents.map(({ event }) => event);
  const contextEvents = collectContextEvents(resourceRef, projectedEvents);
  const useRights = collectUseRights(resourceRef, projectedEvents);

  return optionalProjection({
    resourceRef,
    title: latestResourcePayloadString(resourceRef, relevantEvents, ["title", "name", "label"]),
    summary: latestResourcePayloadString(resourceRef, relevantEvents, ["summary", "description"]),
    resourceKind: latestResourcePayloadString(resourceRef, relevantEvents, ["resourceKind", "kind"]),
    contextEvents,
    useRights,
    authorityRefs: collectAuthorityRefs(projectedEvents),
    linkedRefs: collectLinkedRefs(projectedEvents),
    ecologicalContextIds: collectEcologicalContextIds(projectedEvents, contextEvents),
    eventTrail: relevantEvents.map(({ event, relevance }) => toEventTrailEntry(event, relevance)),
    counts: collectCounts(projectedEvents, contextEvents, useRights)
  });
};

const getEventRelevance = (
  resourceRef: ObjectRef,
  event: CanopyEvent
): ResourceStewardshipEventRelevance | undefined => {
  if (sameRef(resourceRef, event.objectRef) || payloadId(event.payload, "resourceRefId") === resourceRef.id) {
    return "resource";
  }

  if (
    event.objectRef.type === "use-right" &&
    (event.relatedRefs.some((relatedRef) => sameRef(resourceRef, relatedRef)) ||
      payloadId(event.payload, "resourceRefId") === resourceRef.id)
  ) {
    return "use-right";
  }

  if (event.relatedRefs.some((relatedRef) => sameRef(resourceRef, relatedRef))) {
    return "linked";
  }

  return undefined;
};

const toEventTrailEntry = (
  event: CanopyEvent,
  relevance: ResourceStewardshipEventRelevance
): ResourceStewardshipEventTrailEntry =>
  optionalTrailEntry({
    id: event.id,
    type: event.type,
    namespace: eventNamespace(event.type),
    occurredAt: event.occurredAt,
    relevance,
    actorRef: event.actorRef,
    systemActor: event.systemActor,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    sourceCapability: event.sourceCapability,
    title: payloadString(event.payload, ["title", "name", "label"]),
    summary: payloadString(event.payload, ["summary", "description", "rationale", "grantNote", "reason"]),
    isRedacted: isEventRedacted(event),
    isSuperseded: isEventSuperseded(event)
  });

const collectContextEvents = (
  resourceRef: ObjectRef,
  events: readonly CanopyEvent[]
): readonly ResourceStewardshipContextEvent[] =>
  events
    .filter((event) => event.type === "stewardship.resource_context.recorded")
    .filter((event) => sameRef(resourceRef, event.objectRef) || payloadId(event.payload, "resourceRefId") === resourceRef.id)
    .map((event) =>
      optionalContextEvent({
        eventId: event.id,
        occurredAt: event.occurredAt,
        observedAt: payloadString(event.payload, ["observedAt"]),
        contextRef: sameRef(resourceRef, event.objectRef) ? undefined : event.objectRef,
        ecologicalContextIds: event.livingSystemId === undefined ? [] : [event.livingSystemId],
        summary: payloadRecord(event.payload, "context") ?? {}
      })
    );

const collectUseRights = (
  resourceRef: ObjectRef,
  events: readonly CanopyEvent[]
): readonly ResourceStewardshipUseRightSummary[] => {
  const useRightEvents = events
    .filter((event) => event.objectRef.type === "use-right")
    .filter((event) => payloadId(event.payload, "resourceRefId") === resourceRef.id || event.relatedRefs.some((relatedRef) => sameRef(resourceRef, relatedRef)));
  const eventsByUseRight = new Map<CanopyId, CanopyEvent[]>();

  for (const event of useRightEvents) {
    eventsByUseRight.set(event.objectRef.id, [...(eventsByUseRight.get(event.objectRef.id) ?? []), event]);
  }

  return [...eventsByUseRight.values()]
    .map((group) => summarizeUseRight(resourceRef, group.sort(compareEvents)))
    .sort((left, right) => compareStrings(left.useRightRef.id, right.useRightRef.id));
};

const summarizeUseRight = (
  resourceRef: ObjectRef,
  events: readonly CanopyEvent[]
): ResourceStewardshipUseRightSummary => {
  const latestEvent = events[events.length - 1] as CanopyEvent;
  const latestScopeEvent = latestEventWithAnyPayload(events, [
    "holderRefId",
    "permissions",
    "conditions",
    "term",
    "review",
    "revocation"
  ]);
  const state = inferUseRightState(latestEvent);
  const holderRefId = payloadId(latestScopeEvent?.payload, "holderRefId");
  const review = payloadRecord(latestScopeEvent?.payload, "review");
  const revocation = payloadRecord(latestScopeEvent?.payload, "revocation");
  const term = payloadRecord(latestScopeEvent?.payload, "term");
  const revokedEvent = [...events].reverse().find((event) => isRevokedUseRightEvent(event));

  return optionalUseRightSummary({
    useRightRef: latestEvent.objectRef,
    state,
    holderRef: findRef(events, holderRefId),
    holderRefId,
    resourceRef,
    permissions: payloadStringArray(latestScopeEvent?.payload, "permissions"),
    conditions: payloadStringArray(latestScopeEvent?.payload, "conditions"),
    term: optionalTerm({
      startsAt: recordString(term, "startsAt"),
      endsAt: recordString(term, "endsAt")
    }),
    review: optionalReview({
      reviewPathRef: findRef(events, recordString(review, "reviewPathRefId")),
      reviewPathRefId: recordString(review, "reviewPathRefId"),
      reviewAt: recordString(review, "reviewAt")
    }),
    revocation: optionalRevocation({
      revocable: recordBoolean(revocation, "revocable"),
      revocationPathRef: findRef(events, recordString(revocation, "revocationPathRefId")),
      revocationPathRefId: recordString(revocation, "revocationPathRefId"),
      revocationConditions: recordStringArray(revocation, "revocationConditions"),
      revokedAt: revokedEvent?.occurredAt,
      revocationEventId: revokedEvent?.id,
      reason: payloadString(revokedEvent?.payload ?? {}, ["reason", "summary", "description"])
    }),
    proposalRefs: collectRefsByPayloadIds(events, "proposalRefId", "proposal"),
    proposalRefIds: collectPayloadIds(events, "proposalRefId"),
    decisionRefs: collectRefsByPayloadIds(events, "decisionRefId", "decision"),
    decisionRefIds: collectPayloadIds(events, "decisionRefId"),
    authorityRefs: collectAuthorityRefs(events),
    proposedEventIds: eventIdsOfType(events, "stewardship.use_right.proposed"),
    grantedEventIds: eventIdsOfType(events, "stewardship.use_right.granted"),
    revokedEventIds: events.filter(isRevokedUseRightEvent).map((event) => event.id).sort(compareStrings),
    latestEventId: latestEvent.id,
    latestEventAt: latestEvent.occurredAt
  });
};

const inferUseRightState = (event: CanopyEvent): ResourceStewardshipUseRightState => {
  const state = payloadString(event.payload, ["state"]);

  if (state === "revoked" || isRevokedUseRightEvent(event)) {
    return "revoked";
  }

  if (state === "proposed" || event.type === "stewardship.use_right.proposed") {
    return "proposed";
  }

  return "granted";
};

const isRevokedUseRightEvent = (event: CanopyEvent): boolean =>
  event.type === "stewardship.use_right.revoked";

const collectLinkedRefs = (events: readonly CanopyEvent[]): ResourceStewardshipLinkedRefs => ({
  proposals: sortedRefs(dedupeRefs(events.flatMap((event) => refsOfType(event, "proposal")))),
  decisions: sortedRefs(dedupeRefs(events.flatMap((event) => refsOfType(event, "decision")))),
  claims: sortedRefs(dedupeRefs(events.flatMap((event) => refsOfType(event, "claim")))),
  evidence: sortedRefs(dedupeRefs(events.flatMap((event) => refsOfType(event, "evidence"))))
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

const collectEcologicalContextIds = (
  events: readonly CanopyEvent[],
  contextEvents: readonly ResourceStewardshipContextEvent[]
): readonly CanopyId[] =>
  [...uniqueStrings([
    ...events.map((event) => event.livingSystemId).filter(isDefined),
    ...events.flatMap((event) => collectPayloadIds(event.payload, "livingSystemId")),
    ...contextEvents.flatMap((event) => event.ecologicalContextIds)
  ])].sort(compareStrings);

const collectCounts = (
  events: readonly CanopyEvent[],
  contextEvents: readonly ResourceStewardshipContextEvent[],
  useRights: readonly ResourceStewardshipUseRightSummary[]
): ResourceStewardshipCounts => {
  const namespaceCounts = new Map<CanopyEventNamespace, number>();
  const capabilityCounts = new Map<CanopyCapability, number>();

  for (const event of events) {
    const namespace = eventNamespace(event.type);
    namespaceCounts.set(namespace, (namespaceCounts.get(namespace) ?? 0) + 1);
    capabilityCounts.set(event.sourceCapability, (capabilityCounts.get(event.sourceCapability) ?? 0) + 1);
  }

  return {
    totalEvents: events.length,
    contextEvents: contextEvents.length,
    useRights: {
      proposed: useRights.filter((useRight) => useRight.state === "proposed").length,
      granted: useRights.filter((useRight) => useRight.state === "granted").length,
      revoked: useRights.filter((useRight) => useRight.state === "revoked").length
    },
    byNamespace: [...namespaceCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([namespace, count]) => ({ namespace, count })),
    byCapability: [...capabilityCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([capability, count]) => ({ capability, count }))
  };
};

const latestPayloadString = (
  relevantEvents: readonly {
    readonly event: CanopyEvent;
    readonly relevance: ResourceStewardshipEventRelevance;
  }[],
  keys: readonly string[]
): string | undefined => {
  for (let index = relevantEvents.length - 1; index >= 0; index -= 1) {
    const value = payloadString(relevantEvents[index]?.event.payload ?? {}, keys);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const latestResourcePayloadString = (
  resourceRef: ObjectRef,
  relevantEvents: readonly {
    readonly event: CanopyEvent;
    readonly relevance: ResourceStewardshipEventRelevance;
  }[],
  keys: readonly string[]
): string | undefined =>
  latestPayloadString(
    relevantEvents.filter(
      ({ event, relevance }) => relevance === "resource" && sameRef(resourceRef, event.objectRef)
    ),
    keys
  );

const latestEventWithAnyPayload = (
  events: readonly CanopyEvent[],
  keys: readonly string[]
): CanopyEvent | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event !== undefined && keys.some((key) => event.payload[key] !== undefined)) {
      return event;
    }
  }

  return undefined;
};

const collectRefsByPayloadIds = (
  events: readonly CanopyEvent[],
  payloadKey: string,
  type: ObjectRef["type"]
): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      collectPayloadIds(events, payloadKey).flatMap((id) => events.flatMap((event) => refsOfType(event, type).filter((ref) => ref.id === id)))
    )
  );

function collectPayloadIds(events: readonly CanopyEvent[], payloadKey: string): readonly CanopyId[];
function collectPayloadIds(payload: Readonly<Record<string, unknown>> | undefined, payloadKey: string): readonly CanopyId[];
function collectPayloadIds(
  input: readonly CanopyEvent[] | Readonly<Record<string, unknown>> | undefined,
  payloadKey: string
): readonly CanopyId[] {
  if (isEventList(input)) {
    return [...uniqueStrings(input.flatMap((event) => collectPayloadIds(event.payload, payloadKey)))].sort(compareStrings);
  }

  const value = input?.[payloadKey];

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  return [];
}

const eventIdsOfType = (
  events: readonly CanopyEvent[],
  type: CanopyEventType
): readonly CanopyId[] => events.filter((event) => event.type === type).map((event) => event.id).sort(compareStrings);

const refsOfType = (event: CanopyEvent, type: ObjectRef["type"]): readonly ObjectRef[] =>
  [event.objectRef, ...event.relatedRefs, ...event.authorityRefs].filter((ref) => ref.type === type);

const findRef = (events: readonly CanopyEvent[], id: CanopyId | undefined): ObjectRef | undefined => {
  if (id === undefined) {
    return undefined;
  }

  return events.flatMap((event) => [event.objectRef, ...event.relatedRefs, ...event.authorityRefs]).find((ref) => ref.id === id);
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

const payloadId = (
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): CanopyId | undefined => {
  const value = payload?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const payloadRecord = (
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): Readonly<Record<string, unknown>> | undefined => {
  const value = payload?.[key];

  return isRecord(value) ? value : undefined;
};

const payloadStringArray = (
  payload: Readonly<Record<string, unknown>> | undefined,
  key: string
): readonly string[] => {
  const value = payload?.[key];

  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
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

const recordStringArray = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string
): readonly string[] => {
  const value = record?.[key];

  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
};

const eventNamespace = (eventType: CanopyEventType): CanopyEventNamespace =>
  eventType.slice(0, eventType.indexOf(".")) as CanopyEventNamespace;

const isEventRedacted = (event: CanopyEvent): boolean =>
  event.redaction?.isRedactedStub === true || event.type === "system.redaction.applied";

const isEventSuperseded = (event: CanopyEvent): boolean =>
  event.supersedesEventId !== undefined ||
  event.supersession?.supersedesEventId !== undefined ||
  event.supersession?.supersededByEventId !== undefined ||
  event.type.endsWith(".superseded");

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const sameRef = (left: ObjectRef, right: ObjectRef): boolean => refKey(left) === refKey(right);

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareRelevantEvents = (
  left: {
    readonly event: CanopyEvent;
    readonly relevance: ResourceStewardshipEventRelevance;
  },
  right: {
    readonly event: CanopyEvent;
    readonly relevance: ResourceStewardshipEventRelevance;
  }
): number => compareEvents(left.event, right.event);

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
];

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEventList = (
  value: readonly CanopyEvent[] | Readonly<Record<string, unknown>> | undefined
): value is readonly CanopyEvent[] => Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

type ResourceStewardshipProjectionInput = Omit<
  ResourceStewardshipProjection,
  "title" | "summary" | "resourceKind"
> & {
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly resourceKind: string | undefined;
};

const optionalProjection = (
  projection: ResourceStewardshipProjectionInput
): ResourceStewardshipProjection => {
  const { title, summary, resourceKind, ...rest } = projection;

  return {
    ...rest,
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    ...(resourceKind === undefined ? {} : { resourceKind })
  };
};

type TrailEntryInput = Omit<
  ResourceStewardshipEventTrailEntry,
  "actorRef" | "systemActor" | "title" | "summary"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
};

const optionalTrailEntry = (
  entry: TrailEntryInput
): ResourceStewardshipEventTrailEntry => {
  const { actorRef, systemActor, title, summary, ...rest } = entry;

  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary })
  };
};

type ContextEventInput = Omit<
  ResourceStewardshipContextEvent,
  "observedAt" | "contextRef"
> & {
  readonly observedAt: IsoDateTime | undefined;
  readonly contextRef: ObjectRef | undefined;
};

const optionalContextEvent = (
  event: ContextEventInput
): ResourceStewardshipContextEvent => {
  const { observedAt, contextRef, ...rest } = event;

  return {
    ...rest,
    ...(observedAt === undefined ? {} : { observedAt }),
    ...(contextRef === undefined ? {} : { contextRef })
  };
};

const optionalTerm = (term: {
  readonly startsAt: IsoDateTime | undefined;
  readonly endsAt: IsoDateTime | undefined;
}): ResourceStewardshipUseRightSummary["term"] =>
  term.startsAt === undefined && term.endsAt === undefined
    ? undefined
    : {
        ...(term.startsAt === undefined ? {} : { startsAt: term.startsAt }),
        ...(term.endsAt === undefined ? {} : { endsAt: term.endsAt })
      };

const optionalReview = (review: {
  readonly reviewPathRef: ObjectRef | undefined;
  readonly reviewPathRefId: CanopyId | undefined;
  readonly reviewAt: IsoDateTime | undefined;
}): ResourceStewardshipReviewSummary => ({
  ...(review.reviewPathRef === undefined ? {} : { reviewPathRef: review.reviewPathRef }),
  ...(review.reviewPathRefId === undefined ? {} : { reviewPathRefId: review.reviewPathRefId }),
  ...(review.reviewAt === undefined ? {} : { reviewAt: review.reviewAt })
});

const optionalRevocation = (revocation: {
  readonly revocable: boolean | undefined;
  readonly revocationPathRef: ObjectRef | undefined;
  readonly revocationPathRefId: CanopyId | undefined;
  readonly revocationConditions: readonly string[];
  readonly revokedAt: IsoDateTime | undefined;
  readonly revocationEventId: CanopyId | undefined;
  readonly reason: string | undefined;
}): ResourceStewardshipRevocationSummary => ({
  ...(revocation.revocable === undefined ? {} : { revocable: revocation.revocable }),
  ...(revocation.revocationPathRef === undefined ? {} : { revocationPathRef: revocation.revocationPathRef }),
  ...(revocation.revocationPathRefId === undefined ? {} : { revocationPathRefId: revocation.revocationPathRefId }),
  revocationConditions: revocation.revocationConditions,
  ...(revocation.revokedAt === undefined ? {} : { revokedAt: revocation.revokedAt }),
  ...(revocation.revocationEventId === undefined ? {} : { revocationEventId: revocation.revocationEventId }),
  ...(revocation.reason === undefined ? {} : { reason: revocation.reason })
});

type UseRightSummaryInput = Omit<
  ResourceStewardshipUseRightSummary,
  "holderRef" | "holderRefId" | "term"
> & {
  readonly holderRef: ObjectRef | undefined;
  readonly holderRefId: CanopyId | undefined;
  readonly term: ResourceStewardshipUseRightSummary["term"] | undefined;
};

const optionalUseRightSummary = (
  summary: UseRightSummaryInput
): ResourceStewardshipUseRightSummary => {
  const { holderRef, holderRefId, term, ...rest } = summary;

  return {
    ...rest,
    ...(holderRef === undefined ? {} : { holderRef }),
    ...(holderRefId === undefined ? {} : { holderRefId }),
    ...(term === undefined ? {} : { term })
  };
};
