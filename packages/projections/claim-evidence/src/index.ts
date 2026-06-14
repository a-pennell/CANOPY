import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventNamespace,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export type ClaimEvidenceClaimStatus =
  | "review_required"
  | "reviewed"
  | "accepted"
  | "rejected"
  | "qualified"
  | "binding"
  | "contested"
  | "superseded";

export type ClaimEvidenceRelation =
  | "supports"
  | "contests"
  | "qualifies"
  | "contextualizes"
  | "unspecified";

export interface ClaimEvidenceEventTrailEntry {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly namespace: CanopyEventNamespace;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapability: CanopyCapability;
  readonly dataState?: CanopyEvent["dataState"];
  readonly isRedacted: boolean;
  readonly isSuperseded: boolean;
}

export interface ClaimEvidenceLink {
  readonly claimRef: ObjectRef;
  readonly evidenceRef: ObjectRef;
  readonly relation: ClaimEvidenceRelation;
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly sourceCapability: CanopyCapability;
  readonly authorityRefs: readonly ObjectRef[];
}

export interface ClaimEvidenceReview {
  readonly claimRef: ObjectRef;
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly disposition: ClaimEvidenceClaimStatus;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly reviewerRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapability: CanopyCapability;
}

export interface ClaimEvidenceContest {
  readonly claimRef: ObjectRef;
  readonly contestRef: ObjectRef;
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapability: CanopyCapability;
}

export interface ClaimEvidenceAiNonAuthorityIndicator {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly objectRef: ObjectRef;
  readonly relatedClaimRefs: readonly ObjectRef[];
  readonly reason: string;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly dataState?: CanopyEvent["dataState"];
  readonly sourceCapability: CanopyCapability;
}

export interface ClaimEvidenceClaimReadModel {
  readonly claimRef: ObjectRef;
  readonly status: ClaimEvidenceClaimStatus;
  readonly createdEventId?: CanopyId;
  readonly title?: string;
  readonly summary?: string;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly evidenceLinks: readonly ClaimEvidenceLink[];
  readonly reviews: readonly ClaimEvidenceReview[];
  readonly contests: readonly ClaimEvidenceContest[];
  readonly latestReview?: ClaimEvidenceReview;
  readonly latestContest?: ClaimEvidenceContest;
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly aiNonAuthorityIndicators: readonly ClaimEvidenceAiNonAuthorityIndicator[];
  readonly eventTrail: readonly ClaimEvidenceEventTrailEntry[];
}

export interface ClaimEvidenceEvidenceReadModel {
  readonly evidenceRef: ObjectRef;
  readonly createdEventId?: CanopyId;
  readonly title?: string;
  readonly summary?: string;
  readonly claimRefs: readonly ObjectRef[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly isAiOrModelOutput: boolean;
  readonly eventTrail: readonly ClaimEvidenceEventTrailEntry[];
}

export interface ClaimEvidenceCount {
  readonly count: number;
}

export interface ClaimEvidenceNamespaceCount extends ClaimEvidenceCount {
  readonly namespace: CanopyEventNamespace;
}

export interface ClaimEvidenceCapabilityCount extends ClaimEvidenceCount {
  readonly capability: CanopyCapability;
}

export interface ClaimEvidenceCounts {
  readonly claims: number;
  readonly evidence: number;
  readonly evidenceLinks: number;
  readonly reviews: number;
  readonly contests: number;
  readonly aiNonAuthorityIndicators: number;
  readonly totalEvents: number;
  readonly byNamespace: readonly ClaimEvidenceNamespaceCount[];
  readonly byCapability: readonly ClaimEvidenceCapabilityCount[];
}

export interface ClaimEvidenceProjection {
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly claims: readonly ClaimEvidenceClaimReadModel[];
  readonly evidence: readonly ClaimEvidenceEvidenceReadModel[];
  readonly evidenceLinks: readonly ClaimEvidenceLink[];
  readonly reviews: readonly ClaimEvidenceReview[];
  readonly contests: readonly ClaimEvidenceContest[];
  readonly aiNonAuthorityIndicators: readonly ClaimEvidenceAiNonAuthorityIndicator[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceCapabilities: readonly CanopyCapability[];
  readonly eventTrail: readonly ClaimEvidenceEventTrailEntry[];
  readonly counts: ClaimEvidenceCounts;
}

export const buildClaimEvidenceProjection = (
  events: readonly CanopyEvent[]
): ClaimEvidenceProjection => {
  const scopedEvents = events.filter(isClaimEvidenceRelevantEvent).sort(compareEvents);
  const claimRefs = collectClaimRefs(scopedEvents);
  const evidenceRefs = collectEvidenceRefs(scopedEvents, claimRefs);
  const eventTrail = scopedEvents.map(toEventTrailEntry);
  const evidenceLinks = collectEvidenceLinks(scopedEvents, claimRefs);
  const reviews = collectReviews(scopedEvents, claimRefs);
  const contests = collectContests(scopedEvents, claimRefs);
  const aiNonAuthorityIndicators = collectAiNonAuthorityIndicators(scopedEvents, claimRefs);
  const claims = claimRefs.map((claimRef) =>
    buildClaimReadModel(
      claimRef,
      scopedEvents.filter((event) => isEventRelevantToClaim(event, claimRef)),
      evidenceLinks,
      reviews,
      contests,
      aiNonAuthorityIndicators
    )
  );
  const evidence = evidenceRefs.map((evidenceRef) =>
    buildEvidenceReadModel(evidenceRef, scopedEvents, evidenceLinks)
  );

  return {
    claimRefs,
    evidenceRefs,
    claims,
    evidence,
    evidenceLinks,
    reviews,
    contests,
    aiNonAuthorityIndicators,
    authorityRefs: collectAuthorityRefs(scopedEvents),
    sourceCapabilities: sortedCapabilities(scopedEvents.map((event) => event.sourceCapability)),
    eventTrail,
    counts: collectCounts(scopedEvents, claims, evidence, evidenceLinks, reviews, contests, aiNonAuthorityIndicators)
  };
};

export const buildClaimEvidenceProjectionForClaim = (
  claimRef: ObjectRef,
  events: readonly CanopyEvent[]
): ClaimEvidenceClaimReadModel => {
  const projection = buildClaimEvidenceProjection(events);
  const claim = projection.claims.find((candidate) => sameRef(candidate.claimRef, claimRef));

  if (claim !== undefined) {
    return claim;
  }

  return buildClaimReadModel(claimRef, [], [], [], [], []);
};

const buildClaimReadModel = (
  claimRef: ObjectRef,
  events: readonly CanopyEvent[],
  allLinks: readonly ClaimEvidenceLink[],
  allReviews: readonly ClaimEvidenceReview[],
  allContests: readonly ClaimEvidenceContest[],
  allAiIndicators: readonly ClaimEvidenceAiNonAuthorityIndicator[]
): ClaimEvidenceClaimReadModel => {
  const claimEvents = [...events].sort(compareEvents);
  const links = allLinks.filter((link) => sameRef(link.claimRef, claimRef));
  const reviews = allReviews.filter((review) => sameRef(review.claimRef, claimRef));
  const contests = allContests.filter((contest) => sameRef(contest.claimRef, claimRef));
  const aiIndicators = allAiIndicators.filter((indicator) =>
    indicator.relatedClaimRefs.some((relatedClaimRef) => sameRef(relatedClaimRef, claimRef))
  );
  const latestReview = reviews.at(-1);
  const latestContest = contests.at(-1);
  const createdEvent = claimEvents.find((event) => event.type === "claim.created");
  const title = latestPayloadString(claimEvents, ["title", "name", "label"]);
  const summary = latestPayloadString(claimEvents, ["summary", "description"]);

  return optionalClaimReadModel({
    claimRef,
    status: claimStatus(claimEvents, latestReview, latestContest),
    createdEventId: createdEvent?.id,
    title,
    summary,
    evidenceRefs: sortedRefs(
      dedupeRefs([
        ...links.map((link) => link.evidenceRef),
        ...reviews.flatMap((review) => review.evidenceRefs),
        ...contests.flatMap((contest) => contest.evidenceRefs)
      ])
    ),
    evidenceLinks: links,
    reviews,
    contests,
    latestReview,
    latestContest,
    authorityRefs: collectAuthorityRefs(claimEvents),
    sourceCapabilities: sortedCapabilities(claimEvents.map((event) => event.sourceCapability)),
    aiNonAuthorityIndicators: aiIndicators,
    eventTrail: claimEvents.map(toEventTrailEntry)
  });
};

const buildEvidenceReadModel = (
  evidenceRef: ObjectRef,
  events: readonly CanopyEvent[],
  links: readonly ClaimEvidenceLink[]
): ClaimEvidenceEvidenceReadModel => {
  const evidenceEvents = events
    .filter((event) => isEventRelevantToEvidence(event, evidenceRef))
    .sort(compareEvents);
  const createdEvent = evidenceEvents.find((event) => event.type === "evidence.created");
  const sourceRefs = sortedRefs(
    dedupeRefs(
      evidenceEvents
        .filter((event) => sameRef(event.objectRef, evidenceRef))
        .flatMap((event) =>
          event.relatedRefs.filter(
            (relatedRef) => relatedRef.type === "source" || relatedRef.id === stringPayload(event, "sourceRefId")
          )
        )
    )
  );
  const relatedLinks = links.filter((link) => sameRef(link.evidenceRef, evidenceRef));

  return optionalEvidenceReadModel({
    evidenceRef,
    createdEventId: createdEvent?.id,
    title: latestPayloadString(evidenceEvents, ["title", "name", "label"]),
    summary: latestPayloadString(evidenceEvents, ["summary", "description"]),
    claimRefs: sortedRefs(dedupeRefs(relatedLinks.map((link) => link.claimRef))),
    sourceRefs,
    sourceCapabilities: sortedCapabilities(evidenceEvents.map((event) => event.sourceCapability)),
    authorityRefs: collectAuthorityRefs(evidenceEvents),
    isAiOrModelOutput: evidenceEvents.some((event) => eventHasAiOrModelSignal(event)),
    eventTrail: evidenceEvents.map(toEventTrailEntry)
  });
};

const collectClaimRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) => [
        ...(event.objectRef.type === "claim" ? [event.objectRef] : []),
        ...event.relatedRefs.filter((ref) => ref.type === "claim")
      ])
    )
  );

const collectEvidenceRefs = (
  events: readonly CanopyEvent[],
  claimRefs: readonly ObjectRef[]
): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) => [
        ...(event.objectRef.type === "evidence" && isEvidenceInClaimScope(event, claimRefs)
          ? [event.objectRef]
          : []),
        ...event.relatedRefs.filter((ref) => ref.type === "evidence")
      ])
    )
  );

const collectEvidenceLinks = (
  events: readonly CanopyEvent[],
  claimRefs: readonly ObjectRef[]
): readonly ClaimEvidenceLink[] =>
  events
    .filter((event) => event.type === "evidence.linked_to_claim" && event.objectRef.type === "evidence")
    .flatMap((event) =>
      event.relatedRefs
        .filter((relatedRef) => relatedRef.type === "claim")
        .filter((relatedRef) => claimRefs.some((claimRef) => sameRef(claimRef, relatedRef)))
        .map((claimRef) => ({
          claimRef,
          evidenceRef: event.objectRef,
          relation: evidenceRelation(event.payload),
          eventId: event.id,
          occurredAt: event.occurredAt,
          sourceCapability: event.sourceCapability,
          authorityRefs: sortedRefs(event.authorityRefs)
        }))
    );

const collectReviews = (
  events: readonly CanopyEvent[],
  claimRefs: readonly ObjectRef[]
): readonly ClaimEvidenceReview[] =>
  events
    .filter((event) => event.type === "claim.reviewed" && event.objectRef.type === "claim")
    .filter((event) => claimRefs.some((claimRef) => sameRef(claimRef, event.objectRef)))
    .map((event) => {
      const evidenceRefs = event.relatedRefs.filter((ref) => ref.type === "evidence");

      return {
        claimRef: event.objectRef,
        eventId: event.id,
        occurredAt: event.occurredAt,
        disposition: reviewDisposition(event.payload),
        evidenceRefs: sortedRefs(evidenceRefs),
        reviewerRefs: sortedRefs(event.relatedRefs.filter((ref) => ref.type !== "evidence")),
        authorityRefs: sortedRefs(event.authorityRefs),
        sourceCapability: event.sourceCapability
      };
    });

const collectContests = (
  events: readonly CanopyEvent[],
  claimRefs: readonly ObjectRef[]
): readonly ClaimEvidenceContest[] =>
  events
    .filter((event) => event.type === "claim.contested" && event.objectRef.type === "claim")
    .filter((event) => claimRefs.some((claimRef) => sameRef(claimRef, event.objectRef)))
    .flatMap((event) =>
      event.relatedRefs
        .filter((ref) => ref.type === "claim")
        .map((contestRef) => ({
          claimRef: event.objectRef,
          contestRef,
          eventId: event.id,
          occurredAt: event.occurredAt,
          evidenceRefs: sortedRefs(event.relatedRefs.filter((ref) => ref.type === "evidence")),
          authorityRefs: sortedRefs(event.authorityRefs),
          sourceCapability: event.sourceCapability
        }))
    );

const collectAiNonAuthorityIndicators = (
  events: readonly CanopyEvent[],
  claimRefs: readonly ObjectRef[]
): readonly ClaimEvidenceAiNonAuthorityIndicator[] =>
  events
    .filter(eventHasAiOrModelSignal)
    .map((event) =>
      optionalAiIndicator({
        eventId: event.id,
        occurredAt: event.occurredAt,
        objectRef: event.objectRef,
        relatedClaimRefs: sortedRefs(
          dedupeRefs(
            [event.objectRef, ...event.relatedRefs].filter((ref) =>
              claimRefs.some((claimRef) => sameRef(claimRef, ref))
            )
          )
        ),
        reason: aiIndicatorReason(event),
        systemActor: event.systemActor,
        dataState: event.dataState,
        sourceCapability: event.sourceCapability
      })
    )
    .filter((indicator) => indicator.relatedClaimRefs.length > 0);

const collectAuthorityRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs(events.flatMap((event) => event.authorityRefs)));

const collectCounts = (
  events: readonly CanopyEvent[],
  claims: readonly ClaimEvidenceClaimReadModel[],
  evidence: readonly ClaimEvidenceEvidenceReadModel[],
  evidenceLinks: readonly ClaimEvidenceLink[],
  reviews: readonly ClaimEvidenceReview[],
  contests: readonly ClaimEvidenceContest[],
  aiIndicators: readonly ClaimEvidenceAiNonAuthorityIndicator[]
): ClaimEvidenceCounts => {
  const namespaceCounts = new Map<CanopyEventNamespace, number>();
  const capabilityCounts = new Map<CanopyCapability, number>();

  for (const event of events) {
    const namespace = eventNamespace(event.type);
    namespaceCounts.set(namespace, (namespaceCounts.get(namespace) ?? 0) + 1);
    capabilityCounts.set(
      event.sourceCapability,
      (capabilityCounts.get(event.sourceCapability) ?? 0) + 1
    );
  }

  return {
    claims: claims.length,
    evidence: evidence.length,
    evidenceLinks: evidenceLinks.length,
    reviews: reviews.length,
    contests: contests.length,
    aiNonAuthorityIndicators: aiIndicators.length,
    totalEvents: events.length,
    byNamespace: [...namespaceCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([namespace, count]) => ({ namespace, count })),
    byCapability: [...capabilityCounts.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([capability, count]) => ({ capability, count }))
  };
};

const toEventTrailEntry = (event: CanopyEvent): ClaimEvidenceEventTrailEntry =>
  optionalEventTrailEntry({
    id: event.id,
    type: event.type,
    namespace: eventNamespace(event.type),
    occurredAt: event.occurredAt,
    actorRef: event.actorRef,
    systemActor: event.systemActor,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    sourceCapability: event.sourceCapability,
    dataState: event.dataState,
    isRedacted: isEventRedacted(event),
    isSuperseded: isEventSuperseded(event)
  });

const isClaimEvidenceRelevantEvent = (event: CanopyEvent): boolean =>
  event.type.startsWith("claim.") ||
  event.type.startsWith("evidence.") ||
  event.type.startsWith("model.") ||
  event.relatedRefs.some((ref) => ref.type === "claim" || ref.type === "evidence") ||
  event.authorityRefs.some((ref) => isMachineOutputRef(ref));

const isEventRelevantToClaim = (event: CanopyEvent, claimRef: ObjectRef): boolean =>
  sameRef(event.objectRef, claimRef) ||
  event.relatedRefs.some((relatedRef) => sameRef(relatedRef, claimRef)) ||
  stringPayload(event, "claimRefId") === claimRef.id;

const isEventRelevantToEvidence = (event: CanopyEvent, evidenceRef: ObjectRef): boolean =>
  sameRef(event.objectRef, evidenceRef) ||
  event.relatedRefs.some((relatedRef) => sameRef(relatedRef, evidenceRef));

const isEvidenceInClaimScope = (
  event: CanopyEvent,
  claimRefs: readonly ObjectRef[]
): boolean =>
  event.type === "evidence.created" ||
  event.type === "evidence.linked_to_claim" ||
  event.relatedRefs.some((ref) => claimRefs.some((claimRef) => sameRef(claimRef, ref)));

const eventHasAiOrModelSignal = (event: CanopyEvent): boolean =>
  event.systemActor === "ai_assistant" ||
  event.type.startsWith("model.") ||
  event.dataState === "machine_inferred" ||
  event.dataState === "model_derived" ||
  isMachineOutputRef(event.objectRef) ||
  event.authorityRefs.some(isMachineOutputRef);

const isMachineOutputRef = (ref: ObjectRef): boolean =>
  ref.type === "model" ||
  ref.type === "evidence" && modelish(ref.id) ||
  ref.source?.sourceEntity === "model-output" ||
  ref.source?.sourceEntity === "model_output" ||
  ref.source?.sourceEntity === "ai_model_authority_guess";

const modelish = (value: string): boolean =>
  value.includes("model") || value.includes("machine") || /(^|[.-])ai([.-]|$)/u.test(value);

const claimStatus = (
  events: readonly CanopyEvent[],
  latestReview: ClaimEvidenceReview | undefined,
  latestContest: ClaimEvidenceContest | undefined
): ClaimEvidenceClaimStatus => {
  if (events.some((event) => event.type === "claim.superseded" || isEventSuperseded(event))) {
    return "superseded";
  }

  if (latestContest !== undefined) {
    return "contested";
  }

  if (latestReview !== undefined) {
    return latestReview.disposition;
  }

  return "review_required";
};

const evidenceRelation = (
  payload: Readonly<Record<string, unknown>>
): ClaimEvidenceRelation => {
  const relation = payload.relation;

  if (
    relation === "supports" ||
    relation === "contests" ||
    relation === "qualifies" ||
    relation === "contextualizes"
  ) {
    return relation;
  }

  return "unspecified";
};

const reviewDisposition = (
  payload: Readonly<Record<string, unknown>>
): ClaimEvidenceClaimStatus => {
  const disposition = payload.disposition;

  if (
    disposition === "reviewed" ||
    disposition === "accepted" ||
    disposition === "rejected" ||
    disposition === "qualified" ||
    disposition === "binding"
  ) {
    return disposition;
  }

  return "reviewed";
};

const aiIndicatorReason = (event: CanopyEvent): string => {
  if (event.authorityRefs.some(isMachineOutputRef)) {
    return "machine_output_present_in_authority_refs";
  }

  if (event.systemActor === "ai_assistant") {
    return "ai_assistant_event";
  }

  if (event.type.startsWith("model.")) {
    return "model_event";
  }

  if (event.dataState === "machine_inferred" || event.dataState === "model_derived") {
    return event.dataState;
  }

  return "machine_output_ref";
};

const latestPayloadString = (
  events: readonly CanopyEvent[],
  keys: readonly string[]
): string | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = payloadString(events[index]?.payload ?? {}, keys);

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

const stringPayload = (
  event: CanopyEvent,
  key: string
): string | undefined => {
  const value = event.payload[key];

  return typeof value === "string" ? value : undefined;
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
): readonly CanopyCapability[] => uniqueSortedStrings(capabilities);

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const sameRef = (left: ObjectRef, right: ObjectRef): boolean => refKey(left) === refKey(right);

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const uniqueSortedStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
].sort(compareStrings);

type ClaimReadModelInput = Omit<
  ClaimEvidenceClaimReadModel,
  "createdEventId" | "title" | "summary" | "latestReview" | "latestContest"
> & {
  readonly createdEventId: CanopyId | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
  readonly latestReview: ClaimEvidenceReview | undefined;
  readonly latestContest: ClaimEvidenceContest | undefined;
};

const optionalClaimReadModel = (
  model: ClaimReadModelInput
): ClaimEvidenceClaimReadModel => {
  const { createdEventId, title, summary, latestReview, latestContest, ...rest } = model;

  return {
    ...rest,
    ...(createdEventId === undefined ? {} : { createdEventId }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    ...(latestReview === undefined ? {} : { latestReview }),
    ...(latestContest === undefined ? {} : { latestContest })
  };
};

type EvidenceReadModelInput = Omit<
  ClaimEvidenceEvidenceReadModel,
  "createdEventId" | "title" | "summary"
> & {
  readonly createdEventId: CanopyId | undefined;
  readonly title: string | undefined;
  readonly summary: string | undefined;
};

const optionalEvidenceReadModel = (
  model: EvidenceReadModelInput
): ClaimEvidenceEvidenceReadModel => {
  const { createdEventId, title, summary, ...rest } = model;

  return {
    ...rest,
    ...(createdEventId === undefined ? {} : { createdEventId }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary })
  };
};

type EventTrailEntryInput = Omit<
  ClaimEvidenceEventTrailEntry,
  "actorRef" | "systemActor" | "dataState"
> & {
  readonly actorRef: ObjectRef | undefined;
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly dataState: CanopyEvent["dataState"] | undefined;
};

const optionalEventTrailEntry = (
  entry: EventTrailEntryInput
): ClaimEvidenceEventTrailEntry => {
  const { actorRef, systemActor, dataState, ...rest } = entry;

  return {
    ...rest,
    ...(actorRef === undefined ? {} : { actorRef }),
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(dataState === undefined ? {} : { dataState })
  };
};

type AiIndicatorInput = Omit<
  ClaimEvidenceAiNonAuthorityIndicator,
  "systemActor" | "dataState"
> & {
  readonly systemActor: CanopyEvent["systemActor"] | undefined;
  readonly dataState: CanopyEvent["dataState"] | undefined;
};

const optionalAiIndicator = (
  indicator: AiIndicatorInput
): ClaimEvidenceAiNonAuthorityIndicator => {
  const { systemActor, dataState, ...rest } = indicator;

  return {
    ...rest,
    ...(systemActor === undefined ? {} : { systemActor }),
    ...(dataState === undefined ? {} : { dataState })
  };
};
