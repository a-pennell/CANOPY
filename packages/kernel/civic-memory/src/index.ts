import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  ContentHash,
  ObjectRef,
} from "@canopy/contracts-kernel";

export type CivicMemoryMutationKind = "update" | "delete" | "mutate";

export interface CivicMemoryReplayCursor {
  readonly afterSequence?: number;
  readonly afterEventId?: CanopyId;
  readonly limit?: number;
}

export interface CivicMemoryReplayPage {
  readonly events: readonly CanopyEvent[];
  readonly nextCursor?: CivicMemoryReplayCursor;
}

export interface CivicMemoryEventQuery {
  readonly eventIds?: readonly CanopyId[];
  readonly eventTypes?: readonly CanopyEventType[];
  readonly objectRefIds?: readonly CanopyId[];
  readonly relatedRefIds?: readonly CanopyId[];
  readonly authorityRefIds?: readonly CanopyId[];
  readonly sourceCapabilities?: readonly CanopyEvent["sourceCapability"][];
  readonly commonsIds?: readonly CanopyId[];
  readonly orgIds?: readonly CanopyId[];
  readonly placeIds?: readonly CanopyId[];
  readonly livingSystemIds?: readonly CanopyId[];
  readonly visibility?: readonly CanopyEvent["visibility"][];
  readonly dataStates?: readonly NonNullable<CanopyEvent["dataState"]>[];
  readonly redactionContinuityForEventId?: CanopyId;
  readonly supersessionContinuityForEventId?: CanopyId;
  readonly limit?: number;
}

export interface CivicMemoryAppendResult {
  readonly event: CanopyEvent;
  readonly sequence: number;
}

export interface CivicMemoryContinuityCheck {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

export interface CivicMemoryRedactionContinuity
  extends CivicMemoryContinuityCheck {
  readonly originalEvent?: CanopyEvent;
  readonly redactionEvents: readonly CanopyEvent[];
  readonly redactedStubs: readonly CanopyEvent[];
}

export interface CivicMemorySupersessionContinuity
  extends CivicMemoryContinuityCheck {
  readonly originalEvent?: CanopyEvent;
  readonly supersedingEvents: readonly CanopyEvent[];
  readonly supersededByEvents: readonly CanopyEvent[];
}

export interface CivicMemoryService {
  appendEvent(event: CanopyEvent): CivicMemoryAppendResult;
  getEvent(eventId: CanopyId): CanopyEvent | undefined;
  hasEvent(eventId: CanopyId): boolean;
  replay(cursor?: CivicMemoryReplayCursor): CivicMemoryReplayPage;
  queryEvents(query?: CivicMemoryEventQuery): readonly CanopyEvent[];
  queryObjectEvents(objectRef: ObjectRef | CanopyId): readonly CanopyEvent[];
  requireRedactionContinuity(eventId: CanopyId): CivicMemoryRedactionContinuity;
  requireSupersessionContinuity(
    eventId: CanopyId
  ): CivicMemorySupersessionContinuity;
  rejectMutation(kind: CivicMemoryMutationKind, eventId: CanopyId): never;
  updateEvent(eventId: CanopyId, event: CanopyEvent): never;
  deleteEvent(eventId: CanopyId): never;
  mutateEvent(eventId: CanopyId, patch: Readonly<Record<string, unknown>>): never;
}

interface StoredEvent {
  readonly sequence: number;
  readonly event: CanopyEvent;
}

export class CivicMemoryMutationRejectedError extends Error {
  readonly kind: CivicMemoryMutationKind;
  readonly eventId: CanopyId;

  constructor(kind: CivicMemoryMutationKind, eventId: CanopyId) {
    super(
      `Civic memory is append-only; ${kind} is rejected for event ${eventId}. Append a continuity event instead.`
    );
    this.name = "CivicMemoryMutationRejectedError";
    this.kind = kind;
    this.eventId = eventId;
  }
}

export class CivicMemoryAppendRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CivicMemoryAppendRejectedError";
  }
}

export function createInMemoryCivicMemory(
  initialEvents: readonly CanopyEvent[] = []
): CivicMemoryService {
  const memory = new InMemoryCivicMemory();

  for (const event of initialEvents) {
    memory.appendEvent(event);
  }

  return memory;
}

export class InMemoryCivicMemory implements CivicMemoryService {
  private readonly orderedEvents: StoredEvent[] = [];
  private readonly eventsById = new Map<CanopyId, StoredEvent>();

  appendEvent(event: CanopyEvent): CivicMemoryAppendResult {
    if (this.eventsById.has(event.id)) {
      throw new CivicMemoryAppendRejectedError(
        `Event ${event.id} already exists in civic memory.`
      );
    }

    const sequence = this.orderedEvents.length + 1;
    const stored = {
      sequence,
      event: cloneEvent(event),
    } satisfies StoredEvent;

    this.orderedEvents.push(stored);
    this.eventsById.set(event.id, stored);

    return {
      event: cloneEvent(stored.event),
      sequence,
    };
  }

  getEvent(eventId: CanopyId): CanopyEvent | undefined {
    const stored = this.eventsById.get(eventId);
    return stored ? cloneEvent(stored.event) : undefined;
  }

  hasEvent(eventId: CanopyId): boolean {
    return this.eventsById.has(eventId);
  }

  replay(cursor: CivicMemoryReplayCursor = {}): CivicMemoryReplayPage {
    const startSequence = this.resolveReplayStart(cursor);
    const limit = normalizeLimit(cursor.limit);
    const page = this.orderedEvents
      .filter((stored) => stored.sequence > startSequence)
      .slice(0, limit);
    const last = page.at(-1);
    const hasMore =
      last !== undefined &&
      this.orderedEvents.some((stored) => stored.sequence > last.sequence);

    const replayPage: CivicMemoryReplayPage = {
      events: page.map((stored) => cloneEvent(stored.event)),
    };

    if (hasMore && last) {
      return {
        ...replayPage,
        nextCursor: {
          afterSequence: last.sequence,
          afterEventId: last.event.id,
          limit,
        },
      };
    }

    return replayPage;
  }

  queryEvents(query: CivicMemoryEventQuery = {}): readonly CanopyEvent[] {
    const limit = normalizeLimit(query.limit);
    const events = this.orderedEvents
      .filter((stored) => eventMatchesQuery(stored.event, query))
      .slice(0, limit)
      .map((stored) => cloneEvent(stored.event));

    return events;
  }

  queryObjectEvents(objectRef: ObjectRef | CanopyId): readonly CanopyEvent[] {
    const objectRefId = typeof objectRef === "string" ? objectRef : objectRef.id;
    return this.queryEvents({ objectRefIds: [objectRefId] });
  }

  requireRedactionContinuity(eventId: CanopyId): CivicMemoryRedactionContinuity {
    const originalEvent = this.getEvent(eventId);
    const redactionEvents = this.queryEvents({
      redactionContinuityForEventId: eventId,
    });
    const redactedStubs = redactionEvents.filter(
      (event) => event.redaction?.isRedactedStub === true
    );
    const issues: string[] = [];

    if (!originalEvent) {
      issues.push(`Original event ${eventId} is not present.`);
    }

    if (redactionEvents.length === 0) {
      issues.push(`No redaction continuity event points at ${eventId}.`);
    }

    for (const event of redactionEvents) {
      if (event.redaction?.originalEventId !== eventId) {
        issues.push(
          `Redaction event ${event.id} does not point back to original event ${eventId}.`
        );
      }

      if (
        event.redaction?.redactionEventId !== undefined &&
        event.redaction.redactionEventId !== event.id
      ) {
        issues.push(
          `Redaction event ${event.id} declares redactionEventId ${event.redaction.redactionEventId}.`
        );
      }

      if (!redactionPayloadPreservesOriginal(event.payload)) {
        issues.push(
          `Redaction event ${event.id} does not assert originalEventPreserved.`
        );
      }
    }

    const continuity: CivicMemoryRedactionContinuity = {
      ok: issues.length === 0,
      issues,
      redactionEvents,
      redactedStubs,
    };

    if (originalEvent) {
      return {
        ...continuity,
        originalEvent,
      };
    }

    return continuity;
  }

  requireSupersessionContinuity(
    eventId: CanopyId
  ): CivicMemorySupersessionContinuity {
    const originalEvent = this.getEvent(eventId);
    const supersedingEvents = this.queryEvents({
      supersessionContinuityForEventId: eventId,
    });
    const supersededByEvents = this.queryEvents({
      eventIds: originalEvent?.supersession?.supersededByEventId
        ? [originalEvent.supersession.supersededByEventId]
        : [],
    });
    const issues: string[] = [];

    if (!originalEvent) {
      issues.push(`Original event ${eventId} is not present.`);
    }

    if (supersedingEvents.length === 0) {
      issues.push(`No supersession continuity event points at ${eventId}.`);
    }

    for (const event of supersedingEvents) {
      const supersedesEventId =
        event.supersedesEventId ?? event.supersession?.supersedesEventId;

      if (supersedesEventId !== eventId) {
        issues.push(
          `Supersession event ${event.id} does not point back to original event ${eventId}.`
        );
      }
    }

    if (
      originalEvent?.supersession?.supersededByEventId !== undefined &&
      supersededByEvents.length === 0
    ) {
      issues.push(
        `Original event ${eventId} points to missing superseding event ${originalEvent.supersession.supersededByEventId}.`
      );
    }

    const continuity: CivicMemorySupersessionContinuity = {
      ok: issues.length === 0,
      issues,
      supersedingEvents,
      supersededByEvents,
    };

    if (originalEvent) {
      return {
        ...continuity,
        originalEvent,
      };
    }

    return continuity;
  }

  rejectMutation(kind: CivicMemoryMutationKind, eventId: CanopyId): never {
    throw new CivicMemoryMutationRejectedError(kind, eventId);
  }

  updateEvent(eventId: CanopyId, _event: CanopyEvent): never {
    return this.rejectMutation("update", eventId);
  }

  deleteEvent(eventId: CanopyId): never {
    return this.rejectMutation("delete", eventId);
  }

  mutateEvent(eventId: CanopyId, _patch: Readonly<Record<string, unknown>>): never {
    return this.rejectMutation("mutate", eventId);
  }

  private resolveReplayStart(cursor: CivicMemoryReplayCursor): number {
    if (cursor.afterSequence !== undefined) {
      return cursor.afterSequence;
    }

    if (cursor.afterEventId !== undefined) {
      const stored = this.eventsById.get(cursor.afterEventId);
      return stored?.sequence ?? 0;
    }

    return 0;
  }
}

function eventMatchesQuery(
  event: CanopyEvent,
  query: CivicMemoryEventQuery
): boolean {
  return (
    matchesSet(event.id, query.eventIds) &&
    matchesSet(event.type, query.eventTypes) &&
    matchesSet(event.objectRef.id, query.objectRefIds) &&
    matchesAnyRef(event.relatedRefs, query.relatedRefIds) &&
    matchesAnyRef(event.authorityRefs, query.authorityRefIds) &&
    matchesSet(event.sourceCapability, query.sourceCapabilities) &&
    matchesSet(event.commonsId, query.commonsIds) &&
    matchesSet(event.orgId, query.orgIds) &&
    matchesSet(event.placeId, query.placeIds) &&
    matchesSet(event.livingSystemId, query.livingSystemIds) &&
    matchesSet(event.visibility, query.visibility) &&
    matchesSet(event.dataState, query.dataStates) &&
    matchesRedactionContinuity(event, query.redactionContinuityForEventId) &&
    matchesSupersessionContinuity(event, query.supersessionContinuityForEventId)
  );
}

function matchesSet<T>(value: T | undefined, values?: readonly T[]): boolean {
  return values === undefined || (value !== undefined && values.includes(value));
}

function matchesAnyRef(
  refs: readonly ObjectRef[],
  refIds?: readonly CanopyId[]
): boolean {
  return refIds === undefined || refs.some((ref) => refIds.includes(ref.id));
}

function matchesRedactionContinuity(
  event: CanopyEvent,
  eventId?: CanopyId
): boolean {
  return (
    eventId === undefined ||
    event.redaction?.originalEventId === eventId ||
    event.redaction?.redactionEventId === eventId
  );
}

function matchesSupersessionContinuity(
  event: CanopyEvent,
  eventId?: CanopyId
): boolean {
  return (
    eventId === undefined ||
    event.supersedesEventId === eventId ||
    event.supersession?.supersedesEventId === eventId ||
    event.supersession?.supersededByEventId === eventId
  );
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new CivicMemoryAppendRejectedError("Query and replay limits must be positive integers.");
  }

  return limit;
}

function redactionPayloadPreservesOriginal(
  payload: Readonly<Record<string, unknown>>
): boolean {
  return payload.originalEventPreserved === true;
}

function cloneEvent(event: CanopyEvent): CanopyEvent {
  return cloneJson(event) as CanopyEvent;
}

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
