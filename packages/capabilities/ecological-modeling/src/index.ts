import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type { CivicMemoryAppendResult, CivicMemoryService } from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

const SOURCE_CAPABILITY = "ecological-modeling" as const;
const SCHEMA_VERSION = 1 as const;
const DEFAULT_VISIBILITY = "commons" as const;
const DEFAULT_DATA_STATE = "locally_verified" as const;
const MODEL_DATA_STATE = "model_derived" as const;
const SENSOR_DATA_STATE = "sensor_derived" as const;

export type EcologicalModelingCommandErrorCode =
  | "invalid-living-system-ref"
  | "invalid-threshold-ref"
  | "invalid-indicator-ref"
  | "invalid-scenario-ref"
  | "missing-authority"
  | "missing-related-ref"
  | "missing-payload";

export class EcologicalModelingCommandError extends Error {
  readonly code: EcologicalModelingCommandErrorCode;

  constructor(code: EcologicalModelingCommandErrorCode, message: string) {
    super(message);
    this.name = "EcologicalModelingCommandError";
    this.code = code;
  }
}

export interface EcologicalModelingServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface EcologicalEventEnvelopeInput {
  readonly eventId: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface CreateThresholdCommand extends EcologicalEventEnvelopeInput {
  readonly thresholdRef: ObjectRef;
  readonly indicatorRef: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly guardianRefs?: readonly ObjectRef[];
  readonly title?: string;
  readonly summary?: string;
  readonly threshold: number;
  readonly unit: string;
  readonly direction?: "above" | "below" | "outside_range";
  readonly guardianReviewRequired?: boolean;
}

export interface CreateLivingSystemCommand extends EcologicalEventEnvelopeInput {
  readonly livingSystemRef: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly title?: string;
  readonly summary?: string;
}

export interface RecordThresholdBreachCommand extends EcologicalEventEnvelopeInput {
  readonly thresholdRef: ObjectRef;
  readonly indicatorRef: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly title?: string;
  readonly observedValue: number;
  readonly unit: string;
  readonly observedAt?: IsoDateTime;
  readonly severity?: "watch" | "breach" | "critical";
  readonly requiresGuardianReview?: boolean;
}

export interface CreateModelScenarioCommand extends EcologicalEventEnvelopeInput {
  readonly scenarioRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly title?: string;
  readonly summary?: string;
  readonly assumptions?: readonly string[];
  readonly limitations?: readonly string[];
  readonly inputs?: Readonly<Record<string, unknown>>;
  readonly guardianReviewRequired?: boolean;
}

export interface EcologicalModelingCommandResult {
  readonly append: CivicMemoryAppendResult;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
}

export function createLivingSystem(
  services: EcologicalModelingServices,
  command: CreateLivingSystemCommand
): EcologicalModelingCommandResult {
  assertRefType(command.livingSystemRef, "living-system", "invalid-living-system-ref");

  const objectRef = services.registry.register(command.livingSystemRef);
  registerRefs(services.registry, [
    command.actorRef,
    ...(command.relatedRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, command.relatedRefs ?? []);

  return appendEcologicalEvent(services.memory, {
    command,
    type: "ecology.living_system.created",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      title: command.title,
      summary: command.summary
    })
  });
}

export function createThreshold(
  services: EcologicalModelingServices,
  command: CreateThresholdCommand
): EcologicalModelingCommandResult {
  assertRefType(command.thresholdRef, "threshold", "invalid-threshold-ref");
  assertRefType(command.indicatorRef, "indicator", "invalid-indicator-ref");
  assertNonEmptyRefs(command.authorityRefs, "missing-authority", "Threshold creation requires authorityRefs.");

  const objectRef = services.registry.register(command.thresholdRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.indicatorRef,
    command.livingSystemRef,
    ...(command.guardianRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.indicatorRef,
    command.livingSystemRef,
    ...(command.guardianRefs ?? [])
  ]);

  return appendEcologicalEvent(services.memory, {
    command,
    type: "ecology.threshold.created",
    objectRef,
    relatedRefs,
    authorityRefs,
    payload: compactPayload({
      title: command.title,
      summary: command.summary,
      indicatorRefId: command.indicatorRef.id,
      livingSystemRefId: command.livingSystemRef?.id,
      guardianRefIds: (command.guardianRefs ?? []).map((ref) => ref.id),
      threshold: command.threshold,
      unit: command.unit,
      direction: command.direction ?? "above",
      guardianReviewRequired: command.guardianReviewRequired ?? false
    })
  });
}

export function recordThresholdBreach(
  services: EcologicalModelingServices,
  command: RecordThresholdBreachCommand
): EcologicalModelingCommandResult {
  assertRefType(command.thresholdRef, "threshold", "invalid-threshold-ref");
  assertRefType(command.indicatorRef, "indicator", "invalid-indicator-ref");

  const objectRef = services.registry.register(command.thresholdRef);
  registerRefs(services.registry, [
    command.actorRef,
    command.indicatorRef,
    ...(command.relatedRefs ?? []),
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, [
    command.indicatorRef,
    ...(command.relatedRefs ?? [])
  ]);

  return appendEcologicalEvent(services.memory, {
    command,
    type: "ecology.threshold.breached",
    objectRef,
    relatedRefs,
    authorityRefs,
    dataState: SENSOR_DATA_STATE,
    payload: compactPayload({
      title: command.title,
      indicatorRefId: command.indicatorRef.id,
      observedValue: command.observedValue,
      unit: command.unit,
      observedAt: command.observedAt ?? command.occurredAt,
      severity: command.severity ?? "breach",
      requiresGuardianReview: command.requiresGuardianReview ?? false
    })
  });
}

export function createModelScenario(
  services: EcologicalModelingServices,
  command: CreateModelScenarioCommand
): EcologicalModelingCommandResult {
  assertRefType(command.scenarioRef, "model", "invalid-scenario-ref");

  if (command.relatedRefs.length === 0) {
    throw new EcologicalModelingCommandError(
      "missing-related-ref",
      "Model scenarios require at least one related ref."
    );
  }

  const objectRef = services.registry.register(command.scenarioRef);
  registerRefs(services.registry, [
    command.actorRef,
    ...command.relatedRefs,
    ...(command.authorityRefs ?? [])
  ]);

  const authorityRefs = canonicalRefs(services.registry, command.authorityRefs ?? []);
  const relatedRefs = canonicalRefs(services.registry, command.relatedRefs);

  return appendEcologicalEvent(services.memory, {
    command,
    type: "model.scenario.created",
    objectRef,
    relatedRefs,
    authorityRefs,
    dataState: MODEL_DATA_STATE,
    payload: compactPayload({
      title: command.title,
      summary: command.summary,
      assumptions: command.assumptions,
      limitations: command.limitations,
      inputs: command.inputs,
      guardianReviewRequired: command.guardianReviewRequired ?? false
    })
  });
}

function appendEcologicalEvent(
  memory: CivicMemoryService,
  input: {
    readonly command: EcologicalEventEnvelopeInput;
    readonly type: CanopyEventType;
    readonly objectRef: ObjectRef;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly dataState?: CanopyEvent["dataState"];
  }
): EcologicalModelingCommandResult {
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
    dataState: input.dataState ?? DEFAULT_DATA_STATE
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
  code: EcologicalModelingCommandErrorCode
): void {
  if (ref.type !== type) {
    throw new EcologicalModelingCommandError(
      code,
      `Expected ${ref.id} to have type ${type}, received ${ref.type}.`
    );
  }
}

function assertNonEmptyRefs(
  refs: readonly ObjectRef[] | undefined,
  code: EcologicalModelingCommandErrorCode,
  message: string
): void {
  if ((refs ?? []).length === 0) {
    throw new EcologicalModelingCommandError(code, message);
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
