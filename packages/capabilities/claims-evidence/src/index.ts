import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopySystemActor,
  ContentHash,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef
} from "@canopy/contracts-kernel";
import type {
  CivicMemoryAppendResult,
  CivicMemoryService
} from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

const SOURCE_CAPABILITY = "claims-evidence";
const SCHEMA_VERSION = 1;

export type ClaimReviewDisposition =
  | "reviewed"
  | "accepted"
  | "rejected"
  | "qualified"
  | "binding";

export type EvidenceClaimRelation =
  | "supports"
  | "contests"
  | "qualifies"
  | "contextualizes";

export type ClaimsEvidenceErrorCode =
  | "invalid-object-ref-type"
  | "missing-authority"
  | "ai-output-cannot-authorize";

export class ClaimsEvidenceError extends Error {
  readonly code: ClaimsEvidenceErrorCode;

  constructor(code: ClaimsEvidenceErrorCode, message: string) {
    super(message);
    this.name = "ClaimsEvidenceError";
    this.code = code;
  }
}

export interface ClaimsEvidenceContext {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface ClaimsEvidenceActorInput {
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopySystemActor;
}

export interface ClaimsEvidenceScopeInput {
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface ClaimsEvidenceEventInput
  extends ClaimsEvidenceActorInput,
    ClaimsEvidenceScopeInput {
  readonly eventId?: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly visibility?: CanopyEvent["visibility"];
  readonly dataState?: CanopyEvent["dataState"];
  readonly contentHash?: ContentHash;
}

export interface ClaimsEvidenceCommandResult {
  readonly event: CanopyEvent;
  readonly append: CivicMemoryAppendResult;
}

export interface CreateClaimCommand extends ClaimsEvidenceEventInput {
  readonly claimRef: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly authorityRefs?: readonly ObjectRef[];
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface IngestEvidenceCommand extends ClaimsEvidenceEventInput {
  readonly evidenceRef: ObjectRef;
  readonly sourceRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly authorityRefs?: readonly ObjectRef[];
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface LinkEvidenceToClaimCommand extends ClaimsEvidenceEventInput {
  readonly evidenceRef: ObjectRef;
  readonly claimRef: ObjectRef;
  readonly relation: EvidenceClaimRelation;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface ReviewClaimCommand extends ClaimsEvidenceEventInput {
  readonly claimRef: ObjectRef;
  readonly disposition: ClaimReviewDisposition;
  readonly authorityRefs: readonly ObjectRef[];
  readonly evidenceRefs?: readonly ObjectRef[];
  readonly reviewerRef?: ObjectRef;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface ContestClaimCommand extends ClaimsEvidenceEventInput {
  readonly claimRef: ObjectRef;
  readonly contestRef: ObjectRef;
  readonly evidenceRefs?: readonly ObjectRef[];
  readonly authorityRefs?: readonly ObjectRef[];
  readonly payload?: Readonly<Record<string, unknown>>;
}

export function createClaim(
  context: ClaimsEvidenceContext,
  command: CreateClaimCommand
): ClaimsEvidenceCommandResult {
  const claimRef = registerTypedRef(context.registry, command.claimRef, "claim");
  const actorRef = registerOptionalRef(context.registry, command.actorRef);
  const relatedRefs = registerRefs(context.registry, command.relatedRefs ?? []);
  const authorityRefs = registerRefs(context.registry, command.authorityRefs ?? []);

  const event = buildEvent("claim.created", command, {
    objectRef: claimRef,
    actorRef,
    relatedRefs,
    authorityRefs,
    payload: {
      status: "review_required",
      ...command.payload
    },
    fallbackEventId: `event.claim.created.${slugFromId(claimRef.id)}`
  });

  return appendCommandEvent(context.memory, event);
}

export function ingestEvidence(
  context: ClaimsEvidenceContext,
  command: IngestEvidenceCommand
): ClaimsEvidenceCommandResult {
  const evidenceRef = registerTypedRef(
    context.registry,
    command.evidenceRef,
    "evidence"
  );
  const actorRef = registerOptionalRef(context.registry, command.actorRef);
  const sourceRef = registerOptionalTypedRef(
    context.registry,
    command.sourceRef,
    "source"
  );
  const explicitRelatedRefs = registerRefs(
    context.registry,
    command.relatedRefs ?? []
  );
  const relatedRefs =
    sourceRef === undefined
      ? explicitRelatedRefs
      : dedupeRefs([sourceRef, ...explicitRelatedRefs]);
  const authorityRefs = registerRefs(context.registry, command.authorityRefs ?? []);

  const event = buildEvent("evidence.created", command, {
    objectRef: evidenceRef,
    actorRef,
    relatedRefs,
    authorityRefs,
    payload: {
      ...command.payload,
      ...(sourceRef === undefined ? {} : { sourceRefId: sourceRef.id })
    },
    fallbackEventId: `event.evidence.created.${slugFromId(evidenceRef.id)}`
  });

  return appendCommandEvent(context.memory, event);
}

export function linkEvidenceToClaim(
  context: ClaimsEvidenceContext,
  command: LinkEvidenceToClaimCommand
): ClaimsEvidenceCommandResult {
  const evidenceRef = registerTypedRef(
    context.registry,
    command.evidenceRef,
    "evidence"
  );
  const claimRef = registerTypedRef(context.registry, command.claimRef, "claim");
  const actorRef = registerOptionalRef(context.registry, command.actorRef);
  const authorityRefs = registerRefs(context.registry, command.authorityRefs ?? []);

  const event = buildEvent("evidence.linked_to_claim", command, {
    objectRef: evidenceRef,
    actorRef,
    relatedRefs: [claimRef],
    authorityRefs,
    payload: {
      claimRefId: claimRef.id,
      relation: command.relation,
      ...command.payload
    },
    fallbackEventId: `event.evidence.linked_to_claim.${slugFromId(
      evidenceRef.id
    )}.${slugFromId(claimRef.id)}`
  });

  return appendCommandEvent(context.memory, event);
}

export function reviewClaim(
  context: ClaimsEvidenceContext,
  command: ReviewClaimCommand
): ClaimsEvidenceCommandResult {
  const claimRef = registerTypedRef(context.registry, command.claimRef, "claim");
  const actorRef = registerOptionalRef(context.registry, command.actorRef);
  const reviewerRef = registerOptionalRef(context.registry, command.reviewerRef);
  const evidenceRefs = registerRefs(context.registry, command.evidenceRefs ?? []);
  const authorityRefs = registerRefs(context.registry, command.authorityRefs);

  requireHumanAuthorityRefs(authorityRefs, "review claim");

  const relatedRefs = dedupeRefs([
    ...evidenceRefs,
    ...(reviewerRef === undefined ? [] : [reviewerRef])
  ]);
  const event = buildEvent("claim.reviewed", command, {
    objectRef: claimRef,
    actorRef,
    relatedRefs,
    authorityRefs,
    payload: {
      disposition: command.disposition,
      evidenceRefIds: evidenceRefs.map((ref) => ref.id),
      ...command.payload
    },
    fallbackEventId: `event.claim.reviewed.${slugFromId(claimRef.id)}`
  });

  return appendCommandEvent(context.memory, event);
}

export function contestClaim(
  context: ClaimsEvidenceContext,
  command: ContestClaimCommand
): ClaimsEvidenceCommandResult {
  const claimRef = registerTypedRef(context.registry, command.claimRef, "claim");
  const contestRef = registerTypedRef(
    context.registry,
    command.contestRef,
    "claim"
  );
  const actorRef = registerOptionalRef(context.registry, command.actorRef);
  const evidenceRefs = registerRefs(context.registry, command.evidenceRefs ?? []);
  const authorityRefs = registerRefs(context.registry, command.authorityRefs ?? []);

  const event = buildEvent("claim.contested", command, {
    objectRef: claimRef,
    actorRef,
    relatedRefs: dedupeRefs([contestRef, ...evidenceRefs]),
    authorityRefs,
    payload: {
      contestRefId: contestRef.id,
      evidenceRefIds: evidenceRefs.map((ref) => ref.id),
      ...command.payload
    },
    fallbackEventId: `event.claim.contested.${slugFromId(claimRef.id)}.${slugFromId(
      contestRef.id
    )}`
  });

  return appendCommandEvent(context.memory, event);
}

export function assertAuthorityRefsCanReviewClaim(
  authorityRefs: readonly ObjectRef[]
): void {
  requireHumanAuthorityRefs(authorityRefs, "review claim");
}

function buildEvent(
  type: CanopyEventType,
  command: ClaimsEvidenceEventInput,
  values: {
    readonly objectRef: ObjectRef;
    readonly actorRef: ObjectRef | undefined;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly fallbackEventId: CanopyId;
  }
): CanopyEvent {
  const event: {
    id: CanopyId;
    type: CanopyEventType;
    occurredAt: IsoDateTime;
    actorRef?: ObjectRef;
    systemActor?: CanopySystemActor;
    objectRef: ObjectRef;
    relatedRefs: readonly ObjectRef[];
    authorityRefs: readonly ObjectRef[];
    orgId?: CanopyId;
    placeId?: CanopyId;
    commonsId?: CanopyId;
    livingSystemId?: CanopyId;
    sourceCapability: "claims-evidence";
    payload: Readonly<Record<string, unknown>>;
    schemaVersion: number;
    visibility: CanopyEvent["visibility"];
    dataState?: NonNullable<CanopyEvent["dataState"]>;
    contentHash?: ContentHash;
  } = {
    id: command.eventId ?? values.fallbackEventId,
    type,
    occurredAt: command.occurredAt,
    objectRef: values.objectRef,
    relatedRefs: values.relatedRefs,
    authorityRefs: values.authorityRefs,
    sourceCapability: SOURCE_CAPABILITY,
    payload: values.payload,
    schemaVersion: SCHEMA_VERSION,
    visibility: command.visibility ?? "public"
  };

  if (values.actorRef !== undefined) {
    event.actorRef = values.actorRef;
  }

  if (command.systemActor !== undefined) {
    event.systemActor = command.systemActor;
  }

  if (command.orgId !== undefined) {
    event.orgId = command.orgId;
  }

  if (command.placeId !== undefined) {
    event.placeId = command.placeId;
  }

  if (command.commonsId !== undefined) {
    event.commonsId = command.commonsId;
  }

  if (command.livingSystemId !== undefined) {
    event.livingSystemId = command.livingSystemId;
  }

  if (command.dataState !== undefined) {
    event.dataState = command.dataState;
  }

  if (command.contentHash !== undefined) {
    event.contentHash = command.contentHash;
  }

  return event;
}

function appendCommandEvent(
  memory: CivicMemoryService,
  event: CanopyEvent
): ClaimsEvidenceCommandResult {
  const append = memory.appendEvent(event);

  return {
    event: append.event,
    append
  };
}

function registerOptionalTypedRef(
  registry: ObjectRegistry,
  ref: ObjectRef | undefined,
  type: ObjectRef["type"]
): ObjectRef | undefined {
  if (ref === undefined) {
    return undefined;
  }

  return registerTypedRef(registry, ref, type);
}

function registerOptionalRef(
  registry: ObjectRegistry,
  ref: ObjectRef | undefined
): ObjectRef | undefined {
  if (ref === undefined) {
    return undefined;
  }

  return registerRef(registry, ref);
}

function registerTypedRef(
  registry: ObjectRegistry,
  ref: ObjectRef,
  type: ObjectRef["type"]
): ObjectRef {
  if (ref.type !== type) {
    throw new ClaimsEvidenceError(
      "invalid-object-ref-type",
      `Expected ObjectRef ${ref.id} to have type ${type}; received ${ref.type}.`
    );
  }

  return registerRef(registry, ref);
}

function registerRefs(
  registry: ObjectRegistry,
  refs: readonly ObjectRef[]
): readonly ObjectRef[] {
  return dedupeRefs(refs.map((ref) => registerRef(registry, ref)));
}

function registerRef(registry: ObjectRegistry, ref: ObjectRef): ObjectRef {
  const canonical = registry.register(ref);

  if (canonical.source !== undefined) {
    registry.mapSource(canonical.source, canonical);
  }

  return canonical;
}

function requireHumanAuthorityRefs(
  authorityRefs: readonly ObjectRef[],
  commandName: string
): void {
  if (authorityRefs.length === 0) {
    throw new ClaimsEvidenceError(
      "missing-authority",
      `Cannot ${commandName} without at least one non-AI authority ref.`
    );
  }

  const machineAuthorityRef = authorityRefs.find(isMachineOutputAuthorityRef);

  if (machineAuthorityRef !== undefined) {
    throw new ClaimsEvidenceError(
      "ai-output-cannot-authorize",
      `ObjectRef ${machineAuthorityRef.id} is evidence or model output, so it cannot authorize ${commandName}.`
    );
  }
}

function isMachineOutputAuthorityRef(ref: ObjectRef): boolean {
  if (ref.type === "evidence" || ref.type === "model") {
    return true;
  }

  return [
    ref.id,
    ref.namespace,
    ref.source?.sourceEntity,
    ref.source?.sourceId,
    ref.source?.sourceVersion
  ].some((value) => value !== undefined && indicatesMachineOutput(value));
}

function indicatesMachineOutput(value: string): boolean {
  const normalized = value.toLowerCase();

  return [
    "ai",
    "artificial-intelligence",
    "llm",
    "machine",
    "model",
    "model-output",
    "model_output"
  ].some((marker) => normalized.includes(marker));
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  const refsById = new Map<CanopyId, ObjectRef>();

  for (const ref of refs) {
    if (!refsById.has(ref.id)) {
      refsById.set(ref.id, ref);
    }
  }

  return [...refsById.values()];
}

function slugFromId(id: CanopyId): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
