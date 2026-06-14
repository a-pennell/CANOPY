import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export type CivicMemoryScopeRef = ObjectRef | CanopyId;

export interface CivicMemoryScope {
  readonly orgRef?: CivicMemoryScopeRef;
  readonly placeRef?: CivicMemoryScopeRef;
  readonly commonsRef?: CivicMemoryScopeRef;
  readonly livingSystemRef?: CivicMemoryScopeRef;
  readonly objectRef?: CivicMemoryScopeRef;
}

export interface CivicMemoryProjectionOptions {
  readonly scope?: CivicMemoryScope;
}

export interface CivicMemoryResolvedScope {
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
  readonly objectId?: CanopyId;
  readonly objectRef?: ObjectRef;
}

export interface CivicMemoryTimelineEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
  readonly sourceCapability: CanopyCapability;
  readonly visibility: CanopyEvent["visibility"];
  readonly dataState?: CanopyEvent["dataState"];
  readonly title?: string;
  readonly summary?: string;
  readonly isRedacted: boolean;
  readonly isSuperseded: boolean;
  readonly supersedesEventId?: CanopyId;
  readonly supersededByEventId?: CanopyId;
}

export interface CivicMemoryNamespaceCount {
  readonly namespace: CanopyEventNamespace;
  readonly count: number;
}

export interface CivicMemoryCapabilityCount {
  readonly capability: CanopyCapability;
  readonly count: number;
}

export interface CivicMemoryRedactionIndicators {
  readonly hasRedactions: boolean;
  readonly redactedEventIds: readonly CanopyId[];
  readonly redactionEventIds: readonly CanopyId[];
  readonly redactedOriginalEventIds: readonly CanopyId[];
}

export interface CivicMemorySupersessionIndicators {
  readonly hasSupersessions: boolean;
  readonly supersededEventIds: readonly CanopyId[];
  readonly supersedingEventIds: readonly CanopyId[];
  readonly supersedesEventIds: readonly CanopyId[];
  readonly replacementRefs: readonly ObjectRef[];
}

export interface CivicMemoryReplayCheckpoint {
  readonly streamEventCount: number;
  readonly projectedEventCount: number;
  readonly lastStreamEventId?: CanopyId;
  readonly lastStreamOccurredAt?: IsoDateTime;
  readonly lastProjectedEventId?: CanopyId;
  readonly lastProjectedOccurredAt?: IsoDateTime;
}

export interface CivicMemoryProjection {
  readonly scope: CivicMemoryResolvedScope;
  readonly timeline: readonly CivicMemoryTimelineEntry[];
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly namespaceCounts: readonly CivicMemoryNamespaceCount[];
  readonly capabilityCounts: readonly CivicMemoryCapabilityCount[];
  readonly redaction: CivicMemoryRedactionIndicators;
  readonly supersession: CivicMemorySupersessionIndicators;
  readonly replayCheckpoint: CivicMemoryReplayCheckpoint;
}

export const buildCivicMemoryProjection = (
  events: readonly CanopyEvent[],
  options: CivicMemoryProjectionOptions = {}
): CivicMemoryProjection => {
  const scope = resolveScope(options.scope);
  const scopedEvents = events.filter((event) => isEventInScope(event, scope)).sort(compareEvents);
  const timeline = scopedEvents.map(toTimelineEntry);

  return optionalProjection({
    scope,
    timeline,
    relatedRefs: collectRelatedRefs(scopedEvents),
    authorityRefs: collectAuthorityRefs(scopedEvents),
    sourceCapabilities: sortedCapabilities(scopedEvents.map((event) => event.sourceCapability)),
    namespaceCounts: collectNamespaceCounts(scopedEvents),
    capabilityCounts: collectCapabilityCounts(scopedEvents),
    redaction: collectRedactionIndicators(scopedEvents),
    supersession: collectSupersessionIndicators(scopedEvents),
    replayCheckpoint: collectReplayCheckpoint(events, scopedEvents)
  });
};

const resolveScope = (scope: CivicMemoryScope = {}): CivicMemoryResolvedScope =>
  optionalScope({
    orgId: refId(scope.orgRef),
    placeId: refId(scope.placeRef),
    commonsId: refId(scope.commonsRef),
    livingSystemId: refId(scope.livingSystemRef),
    objectId: refId(scope.objectRef),
    objectRef: typeof scope.objectRef === "string" ? undefined : scope.objectRef
  });

const isEventInScope = (event: CanopyEvent, scope: CivicMemoryResolvedScope): boolean => {
  if (scope.orgId !== undefined && event.orgId !== scope.orgId) {
    return false;
  }

  if (scope.placeId !== undefined && event.placeId !== scope.placeId) {
    return false;
  }

  if (scope.commonsId !== undefined && event.commonsId !== scope.commonsId) {
    return false;
  }

  if (scope.livingSystemId !== undefined && event.livingSystemId !== scope.livingSystemId) {
    return false;
  }

  if (
    scope.objectId !== undefined &&
    event.objectRef.id !== scope.objectId &&
    !event.relatedRefs.some((relatedRef) => relatedRef.id === scope.objectId) &&
    !event.authorityRefs.some((authorityRef) => authorityRef.id === scope.objectId)
  ) {
    return false;
  }

  return true;
};

const toTimelineEntry = (event: CanopyEvent): CivicMemoryTimelineEntry =>
  optionalTimelineEntry({
    id: event.id,
    type: event.type,
    namespace: eventNamespace(event.type),
    occurredAt: event.occurredAt,
    actorRef: event.actorRef,
    systemActor: event.systemActor,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    orgId: event.orgId,
    placeId: event.placeId,
    commonsId: event.commonsId,
    livingSystemId: event.livingSystemId,
    sourceCapability: event.sourceCapability,
    visibility: event.visibility,
    dataState: event.dataState,
    title: payloadString(event.payload, ["title", "name", "label"]),
    summary: payloadString(event.payload, ["summary", "description"]),
    isRedacted: isEventRedacted(event),
    isSuperseded: isEventSuperseded(event),
    supersedesEventId: event.supersedesEventId ?? event.supersession?.supersedesEventId,
    supersededByEventId: event.supersession?.supersededByEventId
  });

const collectRelatedRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) => [
        event.objectRef,
        ...event.relatedRefs,
        ...(event.supersession?.replacementObjectRef === undefined
          ? []
          : [event.supersession.replacementObjectRef])
      ])
    )
  );

const collectAuthorityRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) => [
        ...event.authorityRefs,
        ...(event.supersession?.authorityRefs ?? [])
      ])
    )
  );

const collectNamespaceCounts = (
  events: readonly CanopyEvent[]
): readonly CivicMemoryNamespaceCount[] => {
  const counts = new Map<CanopyEventNamespace, number>();

  for (const event of events) {
    const namespace = eventNamespace(event.type);
    counts.set(namespace, (counts.get(namespace) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([namespace, count]) => ({ namespace, count }));
};

const collectCapabilityCounts = (
  events: readonly CanopyEvent[]
): readonly CivicMemoryCapabilityCount[] => {
  const counts = new Map<CanopyCapability, number>();

  for (const event of events) {
    counts.set(event.sourceCapability, (counts.get(event.sourceCapability) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([capability, count]) => ({ capability, count }));
};

const collectRedactionIndicators = (
  events: readonly CanopyEvent[]
): CivicMemoryRedactionIndicators => {
  const redactedEventIds = events.filter(isEventRedacted).map((event) => event.id);
  const redactionEventIds = events
    .map((event) => event.redaction?.redactionEventId)
    .filter(isDefined);
  const redactedOriginalEventIds = events
    .map((event) => event.redaction?.originalEventId)
    .filter(isDefined);

  return {
    hasRedactions: redactedEventIds.length > 0 || redactionEventIds.length > 0,
    redactedEventIds: uniqueSortedStrings(redactedEventIds),
    redactionEventIds: uniqueSortedStrings(redactionEventIds),
    redactedOriginalEventIds: uniqueSortedStrings(redactedOriginalEventIds)
  };
};

const collectSupersessionIndicators = (
  events: readonly CanopyEvent[]
): CivicMemorySupersessionIndicators => {
  const supersededEventIds = events.filter(isEventSuperseded).map((event) => event.id);
  const supersedingEventIds = events
    .map((event) => event.supersession?.supersededByEventId)
    .filter(isDefined);
  const supersedesEventIds = events
    .map((event) => event.supersedesEventId ?? event.supersession?.supersedesEventId)
    .filter(isDefined);
  const replacementRefs = sortedRefs(
    dedupeRefs(events.map((event) => event.supersession?.replacementObjectRef).filter(isDefined))
  );

  return {
    hasSupersessions:
      supersededEventIds.length > 0 ||
      supersedingEventIds.length > 0 ||
      supersedesEventIds.length > 0,
    supersededEventIds: uniqueSortedStrings(supersededEventIds),
    supersedingEventIds: uniqueSortedStrings(supersedingEventIds),
    supersedesEventIds: uniqueSortedStrings(supersedesEventIds),
    replacementRefs
  };
};

const collectReplayCheckpoint = (
  streamEvents: readonly CanopyEvent[],
  projectedEvents: readonly CanopyEvent[]
): CivicMemoryReplayCheckpoint =>
  optionalReplayCheckpoint({
    streamEventCount: streamEvents.length,
    projectedEventCount: projectedEvents.length,
    lastStreamEventId: streamEvents.at(-1)?.id,
    lastStreamOccurredAt: streamEvents.at(-1)?.occurredAt,
    lastProjectedEventId: projectedEvents.at(-1)?.id,
    lastProjectedOccurredAt: projectedEvents.at(-1)?.occurredAt
  });

const eventNamespace = (eventType: CanopyEventType): CanopyEventNamespace =>
  eventType.slice(0, eventType.indexOf(".")) as CanopyEventNamespace;

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

const isEventRedacted = (event: CanopyEvent): boolean =>
  event.redaction?.isRedactedStub === true || event.type === "system.redaction.applied";

const isEventSuperseded = (event: CanopyEvent): boolean =>
  event.supersedesEventId !== undefined ||
  event.supersession?.supersedesEventId !== undefined ||
  event.supersession?.supersededByEventId !== undefined ||
  event.type.endsWith(".superseded");

const refId = (ref: CivicMemoryScopeRef | undefined): CanopyId | undefined =>
  typeof ref === "string" ? ref : ref?.id;

const sortedCapabilities = (
  capabilities: readonly CanopyCapability[]
): readonly CanopyCapability[] => uniqueSortedStrings(capabilities);

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueSortedStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
].sort(compareStrings);

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

type CivicMemoryResolvedScopeInput = Omit<
  CivicMemoryResolvedScope,
  "orgId" | "placeId" | "commonsId" | "livingSystemId" | "objectId" | "objectRef"
> & {
  readonly orgId: CanopyId | undefined;
  readonly placeId: CanopyId | undefined;
  readonly commonsId: CanopyId | undefined;
  readonly livingSystemId: CanopyId | undefined;
  readonly objectId: CanopyId | undefined;
  readonly objectRef: ObjectRef | undefined;
};

const optionalScope = (scope: CivicMemoryResolvedScopeInput): CivicMemoryResolvedScope => {
  const { orgId, placeId, commonsId, livingSystemId, objectId, objectRef } = scope;

  return {
    ...(orgId === undefined ? {} : { orgId }),
    ...(placeId === undefined ? {} : { placeId }),
    ...(commonsId === undefined ? {} : { commonsId }),
    ...(livingSystemId === undefined ? {} : { livingSystemId }),
    ...(objectId === undefined ? {} : { objectId }),
    ...(objectRef === undefined ? {} : { objectRef })
  };
};

type CivicMemoryTimelineEntryInput = Omit<
  CivicMemoryTimelineEntry,
  | "actorRef"
  | "systemActor"
  | "orgId"
  | "placeId"
  | "commonsId"
  | "livingSystemId"
  | "dataState"
  | "title"
  | "summary"
  | "supersedesEventId"
  | "supersededByEventId"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly orgId: CanopyId | undefined;
  readonly placeId: CanopyId | undefined;
  readonly commonsId: CanopyId | undefined;
  readonly livingSystemId: CanopyId | undefined;
  readonly dataState: CanopyEvent["dataState"] | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly supersedesEventId: CanopyId | undefined;
  readonly supersededByEventId: CanopyId | undefined;
};

const optionalTimelineEntry = (
  entry: CivicMemoryTimelineEntryInput
): CivicMemoryTimelineEntry => {
  const {
    actorRef,
    systemActor,
    orgId,
    placeId,
    commonsId,
    livingSystemId,
    dataState,
    title,
    summary,
    supersedesEventId,
    supersededByEventId,
    ...rest
  } = entry;

  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(orgId === undefined ? {} : { orgId }),
    ...(placeId === undefined ? {} : { placeId }),
    ...(commonsId === undefined ? {} : { commonsId }),
    ...(livingSystemId === undefined ? {} : { livingSystemId }),
    ...(dataState === undefined ? {} : { dataState }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    ...(supersedesEventId === undefined ? {} : { supersedesEventId }),
    ...(supersededByEventId === undefined ? {} : { supersededByEventId })
  };
};

type CivicMemoryReplayCheckpointInput = Omit<
  CivicMemoryReplayCheckpoint,
  | "lastStreamEventId"
  | "lastStreamOccurredAt"
  | "lastProjectedEventId"
  | "lastProjectedOccurredAt"
> & {
  readonly lastStreamEventId: CanopyId | undefined;
  readonly lastStreamOccurredAt: IsoDateTime | undefined;
  readonly lastProjectedEventId: CanopyId | undefined;
  readonly lastProjectedOccurredAt: IsoDateTime | undefined;
};

const optionalReplayCheckpoint = (
  checkpoint: CivicMemoryReplayCheckpointInput
): CivicMemoryReplayCheckpoint => {
  const {
    lastStreamEventId,
    lastStreamOccurredAt,
    lastProjectedEventId,
    lastProjectedOccurredAt,
    ...rest
  } = checkpoint;

  return {
    ...rest,
    ...(lastStreamEventId === undefined ? {} : { lastStreamEventId }),
    ...(lastStreamOccurredAt === undefined ? {} : { lastStreamOccurredAt }),
    ...(lastProjectedEventId === undefined ? {} : { lastProjectedEventId }),
    ...(lastProjectedOccurredAt === undefined ? {} : { lastProjectedOccurredAt })
  };
};

const optionalProjection = (projection: CivicMemoryProjection): CivicMemoryProjection => ({
  ...projection
});
