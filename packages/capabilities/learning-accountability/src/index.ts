import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type { CivicMemoryAppendResult, CivicMemoryService } from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

const SOURCE_CAPABILITY = "learning-accountability" as const;
const SCHEMA_VERSION = 1 as const;
const DEFAULT_VISIBILITY = "commons" as const;
const DEFAULT_DATA_STATE = "locally_verified" as const;

export type LearningAccountabilityCommandErrorCode =
  | "invalid-outcome-ref"
  | "invalid-retrospective-ref"
  | "missing-subject"
  | "missing-authority";

export class LearningAccountabilityCommandError extends Error {
  readonly code: LearningAccountabilityCommandErrorCode;

  constructor(code: LearningAccountabilityCommandErrorCode, message: string) {
    super(message);
    this.name = "LearningAccountabilityCommandError";
    this.code = code;
  }
}

export interface LearningAccountabilityServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface LearningEventEnvelopeInput {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface RecordLearningOutcomeCommand extends LearningEventEnvelopeInput {
  readonly outcomeRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly title?: string;
  readonly outcome: string;
  readonly metric?: string;
  readonly value?: number | string;
}

export interface CompleteLearningRetrospectiveCommand extends LearningEventEnvelopeInput {
  readonly retrospectiveRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly title?: string;
  readonly summary?: string;
  readonly nextPolicyQuestion?: string;
}

export interface LearningAccountabilityCommandResult {
  readonly append: CivicMemoryAppendResult;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
}

export function recordLearningOutcome(
  services: LearningAccountabilityServices,
  command: RecordLearningOutcomeCommand
): LearningAccountabilityCommandResult {
  assertRefType(command.outcomeRef, "evidence", "invalid-outcome-ref");
  assertNonEmptyRefs(command.relatedRefs, "missing-subject", "Learning outcomes require related refs.");

  const objectRef = services.registry.register(command.outcomeRef);
  registerRefs(services.registry, [
    command.actorRef,
    ...command.relatedRefs,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, command.relatedRefs);

  return appendLearningEvent(services.memory, {
    command,
    type: "learning.outcome.recorded",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      title: command.title,
      outcome: command.outcome,
      metric: command.metric,
      value: command.value
    })
  });
}

export function completeLearningRetrospective(
  services: LearningAccountabilityServices,
  command: CompleteLearningRetrospectiveCommand
): LearningAccountabilityCommandResult {
  assertRefType(command.retrospectiveRef, "evidence", "invalid-retrospective-ref");
  assertNonEmptyRefs(command.relatedRefs, "missing-subject", "Retrospectives require related refs.");

  const objectRef = services.registry.register(command.retrospectiveRef);
  registerRefs(services.registry, [
    command.actorRef,
    ...command.relatedRefs,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, command.relatedRefs);

  return appendLearningEvent(services.memory, {
    command,
    type: "learning.retrospective.completed",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      title: command.title,
      summary: command.summary,
      nextPolicyQuestion: command.nextPolicyQuestion
    })
  });
}

function appendLearningEvent(
  memory: CivicMemoryService,
  input: {
    readonly command: LearningEventEnvelopeInput;
    readonly type: CanopyEventType;
    readonly objectRef: ObjectRef;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
  }
): LearningAccountabilityCommandResult {
  const event = compactEvent({
    id: input.command.eventId,
    type: input.type,
    occurredAt: input.command.occurredAt,
    actorRef: input.command.actorRef,
    objectRef: input.objectRef,
    relatedRefs: input.relatedRefs,
    authorityRefs: input.authorityRefs,
    orgId: input.command.orgId,
    placeId: input.command.placeId,
    commonsId: input.command.commonsId,
    livingSystemId: input.command.livingSystemId,
    sourceCapability: SOURCE_CAPABILITY,
    payload: input.payload,
    schemaVersion: SCHEMA_VERSION,
    visibility: DEFAULT_VISIBILITY,
    dataState: DEFAULT_DATA_STATE
  });

  return {
    append: memory.appendEvent(event),
    objectRef: input.objectRef,
    relatedRefs: input.relatedRefs,
    authorityRefs: input.authorityRefs
  };
}

function assertRefType(
  ref: ObjectRef,
  type: ObjectRef["type"],
  code: LearningAccountabilityCommandErrorCode
): void {
  if (ref.type !== type) {
    throw new LearningAccountabilityCommandError(
      code,
      `Expected ${ref.id} to have type ${type}, received ${ref.type}.`
    );
  }
}

function assertNonEmptyRefs(
  refs: readonly ObjectRef[],
  code: LearningAccountabilityCommandErrorCode,
  message: string
): void {
  if (refs.length === 0) {
    throw new LearningAccountabilityCommandError(code, message);
  }
}

function registerRefs(registry: ObjectRegistry, refs: readonly (ObjectRef | undefined)[]): void {
  for (const ref of refs) {
    if (ref !== undefined) {
      registry.register(ref);
    }
  }
}

function canonicalRefs(
  registry: ObjectRegistry,
  refs: readonly (ObjectRef | undefined)[]
): readonly ObjectRef[] {
  const canonicalRefsById = new Map<CanopyId, ObjectRef>();

  for (const ref of refs) {
    if (ref !== undefined) {
      const canonical = registry.require(ref);
      canonicalRefsById.set(canonical.id, canonical);
    }
  }

  return [...canonicalRefsById.values()];
}

function compactPayload(
  payload: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function compactEvent(event: Readonly<Record<string, unknown>>): CanopyEvent {
  return Object.fromEntries(
    Object.entries(event).filter(([, value]) => value !== undefined)
  ) as unknown as CanopyEvent;
}
