import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export type ObjectPageEventRelevance = "direct" | "related" | "authority";

export interface ObjectPageTimelineEvent {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly relevance: ObjectPageEventRelevance;
  readonly actorRef?: ObjectRef;
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

export interface ObjectPageCapabilityCount {
  readonly capability: CanopyCapability;
  readonly count: number;
}

export interface ObjectPageNamespaceCapabilityCount {
  readonly capability: CanopyCapability;
  readonly count: number;
}

export interface ObjectPageNamespaceCount {
  readonly namespace: CanopyEventNamespace;
  readonly count: number;
  readonly capabilities: readonly ObjectPageNamespaceCapabilityCount[];
}

export interface ObjectPageRedactionIndicators {
  readonly isObjectRedacted: boolean;
  readonly hasRedactedEvents: boolean;
  readonly redactedEventIds: readonly CanopyId[];
  readonly redactionEventIds: readonly CanopyId[];
}

export interface ObjectPageSupersessionIndicators {
  readonly isObjectSuperseded: boolean;
  readonly hasSupersededEvents: boolean;
  readonly supersededEventIds: readonly CanopyId[];
  readonly supersedingEventIds: readonly CanopyId[];
  readonly replacementRefs: readonly ObjectRef[];
}

export interface ObjectPageProjection {
  readonly objectRef: ObjectRef;
  readonly title?: string;
  readonly summary?: string;
  readonly timelineEvents: readonly ObjectPageTimelineEvent[];
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly redaction: ObjectPageRedactionIndicators;
  readonly supersession: ObjectPageSupersessionIndicators;
  readonly counts: {
    readonly totalEvents: number;
    readonly byNamespace: readonly ObjectPageNamespaceCount[];
    readonly byCapability: readonly ObjectPageCapabilityCount[];
  };
}

export const buildObjectPageProjection = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[]
): ObjectPageProjection => {
  const relevantEvents = events
    .map((event) => ({ event, relevance: getEventRelevance(objectRef, event) }))
    .filter(
      (
        entry
      ): entry is {
        readonly event: CanopyEvent;
        readonly relevance: ObjectPageEventRelevance;
      } => entry.relevance !== undefined
    )
    .sort(compareRelevantEvents);

  const timelineEvents = relevantEvents.map(({ event, relevance }) =>
    toTimelineEvent(event, relevance)
  );

  const title = latestPayloadString(relevantEvents, ["title", "name", "label"]);
  const summary = latestPayloadString(relevantEvents, ["summary", "description"]);
  const relatedRefs = collectRelatedRefs(objectRef, relevantEvents.map(({ event }) => event));
  const authorityRefs = collectAuthorityRefs(relevantEvents.map(({ event }) => event));
  const sourceCapabilities = sortedCapabilities(
    relevantEvents.map(({ event }) => event.sourceCapability)
  );
  const redaction = collectRedactionIndicators(objectRef, relevantEvents.map(({ event }) => event));
  const supersession = collectSupersessionIndicators(
    objectRef,
    relevantEvents.map(({ event }) => event)
  );
  const counts = collectCounts(relevantEvents.map(({ event }) => event));

  return optionalProjection({
    objectRef,
    title,
    summary,
    timelineEvents,
    relatedRefs,
    authorityRefs,
    sourceCapabilities,
    redaction,
    supersession,
    counts
  });
};

const toTimelineEvent = (
  event: CanopyEvent,
  relevance: ObjectPageEventRelevance
): ObjectPageTimelineEvent =>
  optionalTimelineEvent({
    id: event.id,
    type: event.type,
    namespace: eventNamespace(event.type),
    occurredAt: event.occurredAt,
    relevance,
    actorRef: event.actorRef,
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

const getEventRelevance = (
  objectRef: ObjectRef,
  event: CanopyEvent
): ObjectPageEventRelevance | undefined => {
  if (sameRef(objectRef, event.objectRef)) {
    return "direct";
  }

  if (event.relatedRefs.some((relatedRef) => sameRef(objectRef, relatedRef))) {
    return "related";
  }

  if (event.authorityRefs.some((authorityRef) => sameRef(objectRef, authorityRef))) {
    return "authority";
  }

  return undefined;
};

const latestPayloadString = (
  relevantEvents: readonly {
    readonly event: CanopyEvent;
    readonly relevance: ObjectPageEventRelevance;
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

const collectRelatedRefs = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[]
): readonly ObjectRef[] => {
  const refs: ObjectRef[] = [];

  for (const event of events) {
    if (!sameRef(objectRef, event.objectRef)) {
      refs.push(event.objectRef);
    }

    refs.push(...event.relatedRefs.filter((relatedRef) => !sameRef(objectRef, relatedRef)));
  }

  return sortedRefs(dedupeRefs(refs));
};

const collectAuthorityRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs(events.flatMap((event) => event.authorityRefs)));

const collectRedactionIndicators = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[]
): ObjectPageRedactionIndicators => {
  const redactedEventIds = events
    .filter(isEventRedacted)
    .map((event) => event.id)
    .sort(compareStrings);
  const redactionEventIds = events
    .map((event) => event.redaction?.redactionEventId)
    .filter(isDefined)
    .sort(compareStrings);

  return {
    isObjectRedacted: objectRef.lifecycleStatus === "redacted",
    hasRedactedEvents: redactedEventIds.length > 0,
    redactedEventIds,
    redactionEventIds: uniqueStrings(redactionEventIds)
  };
};

const collectSupersessionIndicators = (
  objectRef: ObjectRef,
  events: readonly CanopyEvent[]
): ObjectPageSupersessionIndicators => {
  const supersededEventIds = events
    .filter(isEventSuperseded)
    .map((event) => event.id)
    .sort(compareStrings);
  const supersedingEventIds = events
    .map((event) => event.supersession?.supersededByEventId)
    .filter(isDefined)
    .sort(compareStrings);
  const replacementRefs = sortedRefs(
    dedupeRefs(events.map((event) => event.supersession?.replacementObjectRef).filter(isDefined))
  );

  return {
    isObjectSuperseded:
      objectRef.lifecycleStatus === "superseded" ||
      Boolean(objectRef.supersedes && objectRef.supersedes.length > 0),
    hasSupersededEvents: supersededEventIds.length > 0,
    supersededEventIds,
    supersedingEventIds: uniqueStrings(supersedingEventIds),
    replacementRefs
  };
};

const collectCounts = (
  events: readonly CanopyEvent[]
): ObjectPageProjection["counts"] => {
  const capabilityCounts = new Map<CanopyCapability, number>();
  const namespaceCounts = new Map<CanopyEventNamespace, number>();
  const namespaceCapabilityCounts = new Map<
    CanopyEventNamespace,
    Map<CanopyCapability, number>
  >();

  for (const event of events) {
    const namespace = eventNamespace(event.type);

    capabilityCounts.set(
      event.sourceCapability,
      (capabilityCounts.get(event.sourceCapability) ?? 0) + 1
    );
    namespaceCounts.set(namespace, (namespaceCounts.get(namespace) ?? 0) + 1);

    const nestedCounts = namespaceCapabilityCounts.get(namespace) ?? new Map();
    nestedCounts.set(event.sourceCapability, (nestedCounts.get(event.sourceCapability) ?? 0) + 1);
    namespaceCapabilityCounts.set(namespace, nestedCounts);
  }

  return {
    totalEvents: events.length,
    byNamespace: [...namespaceCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([namespace, count]) => ({
        namespace,
        count,
        capabilities: [...(namespaceCapabilityCounts.get(namespace)?.entries() ?? [])]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([capability, capabilityCount]) => ({
            capability,
            count: capabilityCount
          }))
      })),
    byCapability: [...capabilityCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([capability, count]) => ({ capability, count }))
  };
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

const sortedCapabilities = (
  capabilities: readonly CanopyCapability[]
): readonly CanopyCapability[] => [...uniqueStrings(capabilities)].sort(compareStrings);

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
    readonly relevance: ObjectPageEventRelevance;
  },
  right: {
    readonly event: CanopyEvent;
    readonly relevance: ObjectPageEventRelevance;
  }
): number =>
  compareStrings(left.event.occurredAt, right.event.occurredAt) ||
  compareStrings(left.event.type, right.event.type) ||
  compareStrings(left.event.id, right.event.id);

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
];

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

type ObjectPageProjectionInput = Omit<ObjectPageProjection, "title" | "summary"> & {
  readonly title: string | undefined;
  readonly summary: string | undefined;
};

const optionalProjection = (projection: ObjectPageProjectionInput): ObjectPageProjection => {
  const { title, summary, ...rest } = projection;

  return {
    ...rest,
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary })
  };
};

type ObjectPageTimelineEventInput = Omit<
  ObjectPageTimelineEvent,
  "actorRef" | "title" | "summary" | "supersedesEventId" | "supersededByEventId"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly supersedesEventId: CanopyId | undefined;
  readonly supersededByEventId: CanopyId | undefined;
};

const optionalTimelineEvent = (event: ObjectPageTimelineEventInput): ObjectPageTimelineEvent => {
  const { actorRef, title, summary, supersedesEventId, supersededByEventId, ...rest } = event;

  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    ...(supersedesEventId === undefined ? {} : { supersedesEventId }),
    ...(supersededByEventId === undefined ? {} : { supersededByEventId })
  };
};
