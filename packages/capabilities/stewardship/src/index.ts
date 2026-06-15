import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type { CivicMemoryAppendResult, CivicMemoryService } from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

const SOURCE_CAPABILITY = "stewardship" as const;
const SCHEMA_VERSION = 1 as const;
const DEFAULT_VISIBILITY = "commons" as const;
const DEFAULT_DATA_STATE = "locally_verified" as const;

export type StewardshipCommandErrorCode =
  | "invalid-resource-ref"
  | "invalid-use-right-ref"
  | "missing-holder"
  | "missing-resource"
  | "missing-permissions"
  | "missing-conditions"
  | "missing-authority"
  | "missing-term"
  | "missing-review-path"
  | "missing-review-at"
  | "missing-revocation-semantics"
  | "missing-denial-reason"
  | "missing-revocation-reason"
  | "missing-appeal-ref"
  | "missing-appeal-grounds"
  | "invalid-task-ref"
  | "invalid-flow-ref"
  | "missing-task-title"
  | "missing-assignee"
  | "missing-completion-ref"
  | "missing-flow-subject"
  | "missing-context";

export class StewardshipCommandError extends Error {
  readonly code: StewardshipCommandErrorCode;

  constructor(code: StewardshipCommandErrorCode, message: string) {
    super(message);
    this.name = "StewardshipCommandError";
    this.code = code;
  }
}

export interface StewardshipServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface EventEnvelopeInput {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface UseRightTerm {
  readonly startsAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
}

export interface UseRightReview {
  readonly reviewPathRef: ObjectRef;
  readonly reviewAt: IsoDateTime;
}

export interface UseRightRevocation {
  readonly revocable: boolean;
  readonly revocationPathRef?: ObjectRef;
  readonly revocationConditions: readonly string[];
}

export interface UseRightScope {
  readonly holderRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly permissions: readonly string[];
  readonly conditions: readonly string[];
  readonly term: UseRightTerm;
  readonly review: UseRightReview;
  readonly revocation: UseRightRevocation;
}

export interface CreateResourceCommand extends EventEnvelopeInput {
  readonly resourceRef: ObjectRef;
  readonly title?: string;
  readonly resourceKind?: string;
  readonly summary?: string;
  readonly stewardRefs?: readonly ObjectRef[];
  readonly relatedRefs?: readonly ObjectRef[];
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ProposeUseRightCommand extends EventEnvelopeInput {
  readonly useRightRef: ObjectRef;
  readonly scope: UseRightScope;
  readonly proposalRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly rationale?: string;
}

export interface GrantUseRightCommand extends EventEnvelopeInput {
  readonly useRightRef: ObjectRef;
  readonly scope: UseRightScope;
  readonly decisionRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly grantNote?: string;
}

export type ApproveUseRightCommand = GrantUseRightCommand;

export interface DenyUseRightCommand extends EventEnvelopeInput {
  readonly useRightRef: ObjectRef;
  readonly holderRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly decisionRef?: ObjectRef;
  readonly proposalRef?: ObjectRef;
  readonly appealPathRef: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly reason: string;
  readonly conditions?: readonly string[];
}

export interface RevokeUseRightCommand extends EventEnvelopeInput {
  readonly useRightRef: ObjectRef;
  readonly holderRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly decisionRef?: ObjectRef;
  readonly revocationPathRef: ObjectRef;
  readonly appealPathRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly reason: string;
  readonly effectiveAt?: IsoDateTime;
}

export interface AppealUseRightCommand extends EventEnvelopeInput {
  readonly appealRef: ObjectRef;
  readonly useRightRef: ObjectRef;
  readonly openedByRef?: ObjectRef;
  readonly reviewPathRef: ObjectRef;
  readonly reviewerRefs?: readonly ObjectRef[];
  readonly relatedRefs?: readonly ObjectRef[];
  readonly grounds: readonly string[];
  readonly requestedRemedy?: string;
  readonly note?: string;
}

export interface RecordResourceContextCommand extends EventEnvelopeInput {
  readonly resourceRef: ObjectRef;
  readonly contextRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly context: Readonly<Record<string, unknown>>;
  readonly observedAt?: IsoDateTime;
}

export interface CreateTaskCommand extends EventEnvelopeInput {
  readonly taskRef: ObjectRef;
  readonly title: string;
  readonly assignedToRefs: readonly ObjectRef[];
  readonly resourceRefs?: readonly ObjectRef[];
  readonly commitmentRef?: ObjectRef;
  readonly useRightRef?: ObjectRef;
  readonly dueAt?: IsoDateTime;
  readonly priority?: string;
}

export interface CompleteTaskCommand extends EventEnvelopeInput {
  readonly taskRef: ObjectRef;
  readonly completedByRef: ObjectRef;
  readonly evidenceRefs?: readonly ObjectRef[];
  readonly outcomeRef?: ObjectRef;
  readonly flowRefs?: readonly ObjectRef[];
  readonly completedAt?: IsoDateTime;
}

export interface RecordFoodFlowCommand extends EventEnvelopeInput {
  readonly flowRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly taskRef?: ObjectRef;
  readonly useRightRef?: ObjectRef;
  readonly commitmentRef?: ObjectRef;
  readonly outcomeRef?: ObjectRef;
  readonly thresholdRefs?: readonly ObjectRef[];
  readonly from: string;
  readonly to: string;
  readonly quantity: string;
  readonly watershedSafeguard?: string;
}

export interface StewardshipCommandResult {
  readonly append: CivicMemoryAppendResult;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
}

export function createResource(
  services: StewardshipServices,
  command: CreateResourceCommand
): StewardshipCommandResult {
  assertRefType(command.resourceRef, "resource", "invalid-resource-ref");

  const objectRef = services.registry.register(command.resourceRef);
  registerRefs(services.registry, [
    command.actorRef,
    ...(command.authorityRefs ?? []),
    ...(command.stewardRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const relatedRefs = canonicalRefs(services.registry, [
    ...(command.stewardRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);
  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.resource.created",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      resourceRefId: objectRef.id,
      title: command.title,
      resourceKind: command.resourceKind,
      summary: command.summary,
      stewardRefIds: relatedRefs.map((ref) => ref.id),
      context: command.context ?? {}
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function proposeUseRight(
  services: StewardshipServices,
  command: ProposeUseRightCommand
): StewardshipCommandResult {
  assertRefType(command.useRightRef, "use-right", "invalid-use-right-ref");
  assertUseRightScope(command.scope);

  const objectRef = services.registry.register(command.useRightRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.proposalRef,
    ...scopeRefs(command.scope),
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.scope.holderRef,
    command.scope.resourceRef,
    command.scope.review.reviewPathRef,
    command.scope.revocation.revocationPathRef,
    command.proposalRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.use_right.proposed",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      ...scopePayload(command.scope),
      proposalRefId: command.proposalRef?.id,
      rationale: command.rationale,
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      state: "proposed"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function grantUseRight(
  services: StewardshipServices,
  command: GrantUseRightCommand
): StewardshipCommandResult {
  assertRefType(command.useRightRef, "use-right", "invalid-use-right-ref");
  assertUseRightScope(command.scope);
  assertNonEmptyRefs(command.authorityRefs, "missing-authority", "Use-right grants require explicit authorityRefs.");

  const objectRef = services.registry.register(command.useRightRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.decisionRef,
    ...scopeRefs(command.scope),
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.scope.holderRef,
    command.scope.resourceRef,
    command.scope.review.reviewPathRef,
    command.scope.revocation.revocationPathRef,
    command.decisionRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.use_right.granted",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      ...scopePayload(command.scope),
      decisionRefId: command.decisionRef?.id,
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      grantNote: command.grantNote,
      state: "active"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function approveUseRight(
  services: StewardshipServices,
  command: ApproveUseRightCommand
): StewardshipCommandResult {
  return grantUseRight(services, command);
}

export function denyUseRight(
  services: StewardshipServices,
  command: DenyUseRightCommand
): StewardshipCommandResult {
  assertRefType(command.useRightRef, "use-right", "invalid-use-right-ref");
  assertRef(command.holderRef, "missing-holder", "Use-right denials require a holderRef.");
  assertRef(command.resourceRef, "missing-resource", "Use-right denials require a resourceRef.");
  assertRef(command.appealPathRef, "missing-review-path", "Use-right denials require an appeal path.");
  assertNonEmptyRefs(command.authorityRefs, "missing-authority", "Use-right denials require explicit authorityRefs.");
  assertNonEmptyString(command.reason, "missing-denial-reason", "Use-right denials require a reason.");

  const objectRef = services.registry.register(command.useRightRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.holderRef,
    command.resourceRef,
    command.decisionRef,
    command.proposalRef,
    command.appealPathRef,
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.holderRef,
    command.resourceRef,
    command.decisionRef,
    command.proposalRef,
    command.appealPathRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.use_right.denied",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      holderRefId: command.holderRef.id,
      resourceRefId: command.resourceRef.id,
      decisionRefId: command.decisionRef?.id,
      proposalRefId: command.proposalRef?.id,
      appealPathRefId: command.appealPathRef.id,
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      reason: command.reason,
      conditions: command.conditions,
      state: "denied"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function revokeUseRight(
  services: StewardshipServices,
  command: RevokeUseRightCommand
): StewardshipCommandResult {
  assertRefType(command.useRightRef, "use-right", "invalid-use-right-ref");
  assertRef(command.holderRef, "missing-holder", "Use-right revocations require a holderRef.");
  assertRef(command.resourceRef, "missing-resource", "Use-right revocations require a resourceRef.");
  assertRef(command.revocationPathRef, "missing-revocation-semantics", "Use-right revocations require a revocation path.");
  assertNonEmptyRefs(command.authorityRefs, "missing-authority", "Use-right revocations require explicit authorityRefs.");
  assertNonEmptyString(command.reason, "missing-revocation-reason", "Use-right revocations require a reason.");

  const objectRef = services.registry.register(command.useRightRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.holderRef,
    command.resourceRef,
    command.decisionRef,
    command.revocationPathRef,
    command.appealPathRef,
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.holderRef,
    command.resourceRef,
    command.decisionRef,
    command.revocationPathRef,
    command.appealPathRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.use_right.revoked",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      holderRefId: command.holderRef.id,
      resourceRefId: command.resourceRef.id,
      decisionRefId: command.decisionRef?.id,
      revocationPathRefId: command.revocationPathRef.id,
      appealPathRefId: command.appealPathRef?.id,
      authorityRefIds: authorityRefs.map((ref) => ref.id),
      reason: command.reason,
      revokedAt: command.occurredAt,
      effectiveAt: command.effectiveAt ?? command.occurredAt,
      state: "revoked"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function appealUseRight(
  services: StewardshipServices,
  command: AppealUseRightCommand
): StewardshipCommandResult {
  assertRefType(command.appealRef, "appeal", "missing-appeal-ref");
  assertRefType(command.useRightRef, "use-right", "invalid-use-right-ref");
  assertRef(command.reviewPathRef, "missing-review-path", "Use-right appeals require a review path.");
  assertNonEmptyStrings(command.grounds, "missing-appeal-grounds", "Use-right appeals require at least one stated ground.");

  const objectRef = services.registry.register(command.appealRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.openedByRef,
    command.useRightRef,
    command.reviewPathRef,
    ...(command.reviewerRefs ?? []),
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.openedByRef ?? command.actorRef,
    command.useRightRef,
    command.reviewPathRef,
    ...(command.reviewerRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.use_right.appealed",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      appealRefId: objectRef.id,
      useRightRefId: command.useRightRef.id,
      openedByRefId: (command.openedByRef ?? command.actorRef)?.id,
      reviewPathRefId: command.reviewPathRef.id,
      reviewerRefIds: (command.reviewerRefs ?? []).map((ref) => ref.id),
      grounds: [...command.grounds],
      requestedRemedy: command.requestedRemedy,
      note: command.note,
      state: "appealed"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function recordResourceContext(
  services: StewardshipServices,
  command: RecordResourceContextCommand
): StewardshipCommandResult {
  assertRefType(command.resourceRef, "resource", "invalid-resource-ref");

  if (Object.keys(command.context).length === 0) {
    throw new StewardshipCommandError(
      "missing-context",
      "Resource context events require at least one context field."
    );
  }

  const objectRef = services.registry.register(command.contextRef ?? command.resourceRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.resourceRef,
    ...(command.authorityRefs ?? []),
    ...(command.relatedRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.resourceRef,
    ...(command.relatedRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.resource_context.recorded",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      resourceRefId: command.resourceRef.id,
      context: command.context,
      observedAt: command.observedAt ?? command.occurredAt
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function createTask(
  services: StewardshipServices,
  command: CreateTaskCommand
): StewardshipCommandResult {
  assertRefType(command.taskRef, "task", "invalid-task-ref");
  assertNonEmptyString(command.title, "missing-task-title", "Tasks require a title.");
  assertNonEmptyRefs(command.assignedToRefs, "missing-assignee", "Tasks require at least one assignee.");

  const objectRef = services.registry.register(command.taskRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.commitmentRef,
    command.useRightRef,
    ...(command.assignedToRefs ?? []),
    ...(command.resourceRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.commitmentRef,
    command.useRightRef,
    ...command.assignedToRefs,
    ...(command.resourceRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.task.created",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      title: command.title,
      assignedToRefIds: command.assignedToRefs.map((ref) => ref.id),
      resourceRefIds: (command.resourceRefs ?? []).map((ref) => ref.id),
      commitmentRefId: command.commitmentRef?.id,
      useRightRefId: command.useRightRef?.id,
      dueAt: command.dueAt,
      priority: command.priority,
      state: "open"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function completeTask(
  services: StewardshipServices,
  command: CompleteTaskCommand
): StewardshipCommandResult {
  assertRefType(command.taskRef, "task", "invalid-task-ref");
  assertRef(command.completedByRef, "missing-completion-ref", "Task completion requires a completedByRef.");

  const objectRef = services.registry.register(command.taskRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.completedByRef,
    command.outcomeRef,
    ...(command.evidenceRefs ?? []),
    ...(command.flowRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.completedByRef,
    command.outcomeRef,
    ...(command.evidenceRefs ?? []),
    ...(command.flowRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "stewardship.task.completed",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      completedByRefId: command.completedByRef.id,
      completedAt: command.completedAt ?? command.occurredAt,
      evidenceRefIds: (command.evidenceRefs ?? []).map((ref) => ref.id),
      outcomeRefId: command.outcomeRef?.id,
      flowRefIds: (command.flowRefs ?? []).map((ref) => ref.id),
      state: "completed"
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

export function recordFoodFlow(
  services: StewardshipServices,
  command: RecordFoodFlowCommand
): StewardshipCommandResult {
  assertRefType(command.flowRef, "flow", "invalid-flow-ref");
  assertRef(command.resourceRef, "missing-flow-subject", "Food flows require a resourceRef.");

  const objectRef = services.registry.register(command.flowRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.resourceRef,
    command.taskRef,
    command.useRightRef,
    command.commitmentRef,
    command.outcomeRef,
    ...(command.thresholdRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.resourceRef,
    command.taskRef,
    command.useRightRef,
    command.commitmentRef,
    command.outcomeRef,
    ...(command.thresholdRefs ?? [])
  ]);
  const append = appendStewardshipEvent(services.memory, {
    command,
    type: "flow.food.recorded",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      resourceRefId: command.resourceRef.id,
      taskRefId: command.taskRef?.id,
      useRightRefId: command.useRightRef?.id,
      commitmentRefId: command.commitmentRef?.id,
      outcomeRefId: command.outcomeRef?.id,
      thresholdRefIds: (command.thresholdRefs ?? []).map((ref) => ref.id),
      from: command.from,
      to: command.to,
      quantity: command.quantity,
      watershedSafeguard: command.watershedSafeguard
    })
  });

  return { append, objectRef, relatedRefs, authorityRefs };
}

function appendStewardshipEvent(
  memory: CivicMemoryService,
  input: {
    readonly command: EventEnvelopeInput;
    readonly type: CanopyEventType;
    readonly objectRef: ObjectRef;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
  }
): CivicMemoryAppendResult {
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

  return memory.appendEvent(event);
}

function assertUseRightScope(scope: UseRightScope): void {
  assertRef(scope.holderRef, "missing-holder", "Use rights require a holderRef.");
  assertRef(scope.resourceRef, "missing-resource", "Use rights require a resourceRef.");
  assertNonEmptyStrings(scope.permissions, "missing-permissions", "Use rights require at least one permission.");
  assertNonEmptyStrings(scope.conditions, "missing-conditions", "Use rights require at least one condition.");

  if (!scope.term.startsAt || !scope.term.endsAt) {
    throw new StewardshipCommandError(
      "missing-term",
      "Use rights require a bounded term with startsAt and endsAt."
    );
  }

  assertRef(scope.review.reviewPathRef, "missing-review-path", "Use rights require a review path.");

  if (!scope.review.reviewAt) {
    throw new StewardshipCommandError(
      "missing-review-at",
      "Use rights require a reviewAt timestamp."
    );
  }

  if (!scope.revocation.revocable) {
    throw new StewardshipCommandError(
      "missing-revocation-semantics",
      "Use rights must be revocable through an explicit revocation path."
    );
  }

  assertRef(
    scope.revocation.revocationPathRef,
    "missing-revocation-semantics",
    "Use rights must name the revocation path."
  );
  assertNonEmptyStrings(
    scope.revocation.revocationConditions,
    "missing-revocation-semantics",
    "Use rights must declare revocation conditions."
  );
}

function assertRef(
  ref: ObjectRef | undefined,
  code: StewardshipCommandErrorCode,
  message: string
): asserts ref is ObjectRef {
  if (ref === undefined) {
    throw new StewardshipCommandError(code, message);
  }
}

function assertRefType(
  ref: ObjectRef,
  type: ObjectRef["type"],
  code: StewardshipCommandErrorCode
): void {
  if (ref.type !== type) {
    throw new StewardshipCommandError(
      code,
      `Expected ${type} ref ${ref.id} to have type ${type}, received ${ref.type}.`
    );
  }
}

function assertNonEmptyRefs(
  refs: readonly ObjectRef[] | undefined,
  code: StewardshipCommandErrorCode,
  message: string
): void {
  if ((refs ?? []).length === 0) {
    throw new StewardshipCommandError(code, message);
  }
}

function assertNonEmptyStrings(
  values: readonly string[],
  code: StewardshipCommandErrorCode,
  message: string
): void {
  if (values.length === 0 || values.some((value) => value.trim().length === 0)) {
    throw new StewardshipCommandError(code, message);
  }
}

function assertNonEmptyString(
  value: string,
  code: StewardshipCommandErrorCode,
  message: string
): void {
  if (value.trim().length === 0) {
    throw new StewardshipCommandError(code, message);
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

function scopeRefs(scope: UseRightScope): readonly (ObjectRef | undefined)[] {
  return [
    scope.holderRef,
    scope.resourceRef,
    scope.review.reviewPathRef,
    scope.revocation.revocationPathRef
  ];
}

function scopePayload(scope: UseRightScope): Readonly<Record<string, unknown>> {
  return {
    holderRefId: scope.holderRef.id,
    resourceRefId: scope.resourceRef.id,
    permissions: [...scope.permissions],
    conditions: [...scope.conditions],
    term: {
      startsAt: scope.term.startsAt,
      endsAt: scope.term.endsAt
    },
    review: {
      reviewPathRefId: scope.review.reviewPathRef.id,
      reviewAt: scope.review.reviewAt
    },
    revocation: {
      revocable: scope.revocation.revocable,
      revocationPathRefId: scope.revocation.revocationPathRef?.id,
      revocationConditions: [...scope.revocation.revocationConditions]
    }
  };
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
