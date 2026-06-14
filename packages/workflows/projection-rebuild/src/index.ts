import type { ProjectionStateRecord } from "@canopy/contracts-database";
import type { CanopyEvent, CanopyId, IsoDateTime, ObjectRef } from "@canopy/contracts-kernel";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import {
  buildAuthorityProjection,
  type AuthorityProjection,
  type AuthorityProjectionOptions
} from "@canopy/projections-authority";
import {
  buildCivicMemoryProjection,
  type CivicMemoryProjection,
  type CivicMemoryProjectionOptions
} from "@canopy/projections-civic-memory";
import {
  buildClaimEvidenceProjection,
  type ClaimEvidenceProjection
} from "@canopy/projections-claim-evidence";
import {
  buildDecisionPacketProjection,
  type DecisionPacketProjection,
  type DecisionPacketProjectionOptions
} from "@canopy/projections-decision-packet";
import {
  buildObjectPageProjection,
  type ObjectPageProjection
} from "@canopy/projections-object-page";
import {
  buildResourceStewardshipProjection,
  type ResourceStewardshipProjection
} from "@canopy/projections-resource-stewardship";

export type ProjectionRebuilderName =
  | "object-page"
  | "civic-memory"
  | "authority"
  | "claim-evidence"
  | "resource-stewardship"
  | "decision-packet";

export const PROJECTION_REBUILD_VERSION = "0.0.0";

export interface ProjectionTargetRecord<TProjection> {
  readonly targetRef: ObjectRef;
  readonly projection: TProjection;
}

export interface MaterializedProjectionDocument<TProjection = unknown> {
  readonly id: CanopyId;
  readonly projectionName: ProjectionRebuilderName;
  readonly projectionVersion: string;
  readonly targetRef: ObjectRef;
  readonly materializedAt: IsoDateTime;
  readonly stateId: CanopyId;
  readonly checkpoint: ProjectionStateRecord["checkpoint"];
  readonly processedEventCount: number;
  readonly projection: TProjection;
}

export interface MaterializedProjectionReadQuery<Name extends ProjectionRebuilderName = ProjectionRebuilderName> {
  readonly projectionName: Name;
  readonly targetRef: ObjectRef;
}

export interface MaterializedProjectionQuery<Name extends ProjectionRebuilderName = ProjectionRebuilderName> {
  readonly projectionName?: Name;
  readonly targetRefs?: readonly ObjectRef[];
  readonly limit?: number;
  readonly cursor?: string;
}

export interface MaterializedProjectionPage<TDocument = MaterializedProjectionDocument> {
  readonly items: readonly TDocument[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface MaterializedProjectionStore {
  putMaterializedProjection<TProjection>(
    document: MaterializedProjectionDocument<TProjection>
  ): MaterializedProjectionDocument<TProjection>;
  getMaterializedProjection(
    query: MaterializedProjectionReadQuery
  ): MaterializedProjectionDocument | undefined;
  queryMaterializedProjections(
    query?: MaterializedProjectionQuery
  ): MaterializedProjectionPage;
}

export interface ProjectionRebuildOptions {
  readonly rebuiltAt?: IsoDateTime;
  readonly objectRefs?: readonly ObjectRef[];
  readonly resourceRefs?: readonly ObjectRef[];
  readonly decisionRefs?: readonly ObjectRef[];
  readonly civicMemory?: CivicMemoryProjectionOptions;
  readonly authority?: AuthorityProjectionOptions;
  readonly decisionPacket?: DecisionPacketProjectionOptions;
}

export interface ProjectionRebuildResult<TProjection> {
  readonly projectionName: ProjectionRebuilderName;
  readonly projectionVersion: string;
  readonly projections: TProjection;
  readonly state: ProjectionStateRecord;
}

export interface ProjectionRebuilder<TProjection> {
  readonly name: ProjectionRebuilderName;
  readonly version: string;
  readonly rebuild: (
    events: readonly CanopyEvent[],
    options?: ProjectionRebuildOptions
  ) => ProjectionRebuildResult<TProjection>;
}

export type ObjectPageRebuildOutput = readonly ProjectionTargetRecord<ObjectPageProjection>[];
export type CivicMemoryRebuildOutput = CivicMemoryProjection;
export type AuthorityRebuildOutput = AuthorityProjection;
export type ClaimEvidenceRebuildOutput = ClaimEvidenceProjection;
export type ResourceStewardshipRebuildOutput =
  readonly ProjectionTargetRecord<ResourceStewardshipProjection>[];
export type DecisionPacketRebuildOutput = readonly ProjectionTargetRecord<DecisionPacketProjection>[];

export interface ProjectionRebuildOutputs {
  readonly "object-page": ObjectPageRebuildOutput;
  readonly "civic-memory": CivicMemoryRebuildOutput;
  readonly authority: AuthorityRebuildOutput;
  readonly "claim-evidence": ClaimEvidenceRebuildOutput;
  readonly "resource-stewardship": ResourceStewardshipRebuildOutput;
  readonly "decision-packet": DecisionPacketRebuildOutput;
}

export type ProjectionDocumentPayload<Name extends ProjectionRebuilderName> =
  Name extends "object-page"
    ? ObjectPageProjection
    : Name extends "civic-memory"
      ? CivicMemoryProjection
      : Name extends "authority"
        ? AuthorityProjection
        : Name extends "claim-evidence"
          ? ClaimEvidenceProjection
          : Name extends "resource-stewardship"
            ? ResourceStewardshipProjection
            : DecisionPacketProjection;

export type ProjectionRebuildResults = {
  readonly [Name in keyof ProjectionRebuildOutputs]: ProjectionRebuildResult<
    ProjectionRebuildOutputs[Name]
  >;
};

export interface PersistentProjectionRebuildOptions extends ProjectionRebuildOptions {
  readonly events?: readonly CanopyEvent[];
  readonly materializedProjections?: MaterializedProjectionStore;
}

export interface PersistentProjectionRebuildResult {
  readonly results: ProjectionRebuildResults;
  readonly persistedStates: readonly ProjectionStateRecord[];
  readonly persistedDocuments: readonly MaterializedProjectionDocument[];
}

export interface RequestProjectionRebuildInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly requestedAt: IsoDateTime;
  readonly projectionNames?: readonly ProjectionRebuilderName[];
  readonly reason?: string;
}

export interface RequestProjectionRebuildResult {
  readonly requestedStates: readonly ProjectionStateRecord[];
}

export const objectPageProjectionRebuilder: ProjectionRebuilder<ObjectPageRebuildOutput> = {
  name: "object-page",
  version: PROJECTION_REBUILD_VERSION,
  rebuild: (events, options = {}) => {
    const targetRefs = options.objectRefs ?? collectAllRefs(events);
    const projections = sortedRefs(dedupeRefs(targetRefs)).map((targetRef) => ({
      targetRef,
      projection: buildObjectPageProjection(targetRef, events)
    }));

    return rebuildResult("object-page", projections, events, options.rebuiltAt);
  }
};

export const civicMemoryProjectionRebuilder: ProjectionRebuilder<CivicMemoryRebuildOutput> = {
  name: "civic-memory",
  version: PROJECTION_REBUILD_VERSION,
  rebuild: (events, options = {}) =>
    rebuildResult(
      "civic-memory",
      buildCivicMemoryProjection(events, options.civicMemory),
      events,
      options.rebuiltAt
    )
};

export const authorityProjectionRebuilder: ProjectionRebuilder<AuthorityRebuildOutput> = {
  name: "authority",
  version: PROJECTION_REBUILD_VERSION,
  rebuild: (events, options = {}) =>
    rebuildResult(
      "authority",
      buildAuthorityProjection(events, options.authority),
      events,
      options.rebuiltAt
    )
};

export const claimEvidenceProjectionRebuilder: ProjectionRebuilder<ClaimEvidenceRebuildOutput> = {
  name: "claim-evidence",
  version: PROJECTION_REBUILD_VERSION,
  rebuild: (events, options = {}) =>
    rebuildResult(
      "claim-evidence",
      buildClaimEvidenceProjection(events),
      events,
      options.rebuiltAt
    )
};

export const resourceStewardshipProjectionRebuilder: ProjectionRebuilder<ResourceStewardshipRebuildOutput> =
  {
    name: "resource-stewardship",
    version: PROJECTION_REBUILD_VERSION,
    rebuild: (events, options = {}) => {
      const targetRefs = options.resourceRefs ?? collectResourceRefs(events);
      const projections = sortedRefs(dedupeRefs(targetRefs)).map((targetRef) => ({
        targetRef,
        projection: buildResourceStewardshipProjection(targetRef, events)
      }));

      return rebuildResult("resource-stewardship", projections, events, options.rebuiltAt);
    }
  };

export const decisionPacketProjectionRebuilder: ProjectionRebuilder<DecisionPacketRebuildOutput> = {
  name: "decision-packet",
  version: PROJECTION_REBUILD_VERSION,
  rebuild: (events, options = {}) => {
    const targetRefs = options.decisionRefs ?? collectDecisionRefs(events);
    const projections = sortedRefs(dedupeRefs(targetRefs)).map((targetRef) => ({
      targetRef,
      projection: buildDecisionPacketProjection(targetRef, events, options.decisionPacket)
    }));

    return rebuildResult("decision-packet", projections, events, options.rebuiltAt);
  }
};

export const projectionRebuilderRegistry = {
  "object-page": objectPageProjectionRebuilder,
  "civic-memory": civicMemoryProjectionRebuilder,
  authority: authorityProjectionRebuilder,
  "claim-evidence": claimEvidenceProjectionRebuilder,
  "resource-stewardship": resourceStewardshipProjectionRebuilder,
  "decision-packet": decisionPacketProjectionRebuilder
} as const;

export const projectionRebuilders = Object.values(projectionRebuilderRegistry);

export const rebuildAllProjections = (
  events: readonly CanopyEvent[],
  options: ProjectionRebuildOptions = {}
): ProjectionRebuildResults => ({
  "object-page": objectPageProjectionRebuilder.rebuild(events, options),
  "civic-memory": civicMemoryProjectionRebuilder.rebuild(events, options),
  authority: authorityProjectionRebuilder.rebuild(events, options),
  "claim-evidence": claimEvidenceProjectionRebuilder.rebuild(events, options),
  "resource-stewardship": resourceStewardshipProjectionRebuilder.rebuild(events, options),
  "decision-packet": decisionPacketProjectionRebuilder.rebuild(events, options)
});

export const rebuildAndPersistAllProjections = (
  runtime: CanonicalPersistenceRuntime,
  options: PersistentProjectionRebuildOptions = {}
): PersistentProjectionRebuildResult => {
  const events = options.events ?? runtime.queryEvents().items.map((record) => record.event);
  const results = rebuildAllProjections(events, options);
  const persistedStates = Object.values(results).map((result) =>
    runtime.putProjectionState(result.state)
  );
  const documents = materializeProjectionDocuments(results, options.rebuiltAt);
  const persistedDocuments =
    options.materializedProjections === undefined
      ? []
      : documents.map((document) =>
          options.materializedProjections?.putMaterializedProjection(document) ?? document
        );

  return { results, persistedStates, persistedDocuments };
};

export const requestProjectionRebuild = (
  input: RequestProjectionRebuildInput
): RequestProjectionRebuildResult => {
  const projectionNames =
    input.projectionNames ?? projectionRebuilders.map((rebuilder) => rebuilder.name);
  const currentStates = new Map(
    input.runtime.listProjectionStates().map((state) => [state.projectionName, state])
  );
  const requestedStates = projectionNames.map((projectionName) => {
    const current = currentStates.get(projectionName);
    const nextStatus: ProjectionStateRecord["status"] =
      current?.status === "failed" ? "failed" : "stale";
    const next =
      current === undefined
        ? requestedProjectionState(projectionName, input)
        : optionalState({
            ...current,
            updatedAt: input.requestedAt,
            status: nextStatus,
            rebuildRequestedAt: input.requestedAt,
            lastError: input.reason ?? current.lastError
          });

    return input.runtime.putProjectionState(next);
  });

  return { requestedStates };
};

export const createInMemoryMaterializedProjectionStore = (
  documents: readonly MaterializedProjectionDocument[] = []
): MaterializedProjectionStore => new InMemoryMaterializedProjectionStore(documents);

export const readMaterializedProjection = <Name extends ProjectionRebuilderName>(
  store: MaterializedProjectionStore,
  query: MaterializedProjectionReadQuery<Name>
): MaterializedProjectionDocument<ProjectionDocumentPayload<Name>> | undefined =>
  store.getMaterializedProjection(query) as
    | MaterializedProjectionDocument<ProjectionDocumentPayload<Name>>
    | undefined;

export const queryMaterializedProjections = <Name extends ProjectionRebuilderName>(
  store: MaterializedProjectionStore,
  query: MaterializedProjectionQuery<Name> = {}
): MaterializedProjectionPage<MaterializedProjectionDocument<ProjectionDocumentPayload<Name>>> =>
  store.queryMaterializedProjections(query) as MaterializedProjectionPage<
    MaterializedProjectionDocument<ProjectionDocumentPayload<Name>>
  >;

export const materializeProjectionDocuments = (
  results: ProjectionRebuildResults,
  materializedAt: IsoDateTime = new Date().toISOString()
): readonly MaterializedProjectionDocument[] => [
  ...results["object-page"].projections.map((entry) =>
    materializedProjectionDocument(results["object-page"], entry.targetRef, entry.projection, materializedAt)
  ),
  materializedProjectionDocument(
    results["civic-memory"],
    wholeProjectionTargetRef("civic-memory"),
    results["civic-memory"].projections,
    materializedAt
  ),
  materializedProjectionDocument(
    results.authority,
    wholeProjectionTargetRef("authority"),
    results.authority.projections,
    materializedAt
  ),
  materializedProjectionDocument(
    results["claim-evidence"],
    wholeProjectionTargetRef("claim-evidence"),
    results["claim-evidence"].projections,
    materializedAt
  ),
  ...results["resource-stewardship"].projections.map((entry) =>
    materializedProjectionDocument(
      results["resource-stewardship"],
      entry.targetRef,
      entry.projection,
      materializedAt
    )
  ),
  ...results["decision-packet"].projections.map((entry) =>
    materializedProjectionDocument(
      results["decision-packet"],
      entry.targetRef,
      entry.projection,
      materializedAt
    )
  )
];

export const projectionMaterializedTargetRef = (
  projectionName: Exclude<
    ProjectionRebuilderName,
    "object-page" | "resource-stewardship" | "decision-packet"
  >
): ObjectRef => wholeProjectionTargetRef(projectionName);

class InMemoryMaterializedProjectionStore implements MaterializedProjectionStore {
  private readonly documents = new Map<string, MaterializedProjectionDocument>();

  constructor(documents: readonly MaterializedProjectionDocument[] = []) {
    for (const document of documents) {
      this.putMaterializedProjection(document);
    }
  }

  putMaterializedProjection<TProjection>(
    document: MaterializedProjectionDocument<TProjection>
  ): MaterializedProjectionDocument<TProjection> {
    const stored = freezeValue(document);
    this.documents.set(documentKey(stored.projectionName, stored.targetRef), stored);
    return stored;
  }

  getMaterializedProjection(
    query: MaterializedProjectionReadQuery
  ): MaterializedProjectionDocument | undefined {
    return this.documents.get(documentKey(query.projectionName, query.targetRef));
  }

  queryMaterializedProjections(
    query: MaterializedProjectionQuery = {}
  ): MaterializedProjectionPage {
    const targetKeys = query.targetRefs?.map(refKey);
    const items = [...this.documents.values()]
      .filter(
        (document) =>
          query.projectionName === undefined || document.projectionName === query.projectionName
      )
      .filter(
        (document) => targetKeys === undefined || targetKeys.includes(refKey(document.targetRef))
      )
      .sort((left, right) => compareStrings(left.id, right.id));

    return page(items, query);
  }
}

const materializedProjectionDocument = <TProjection>(
  result: ProjectionRebuildResult<unknown>,
  targetRef: ObjectRef,
  projection: TProjection,
  materializedAt: IsoDateTime
): MaterializedProjectionDocument<TProjection> => ({
  id: materializedProjectionDocumentId(result.projectionName, targetRef),
  projectionName: result.projectionName,
  projectionVersion: result.projectionVersion,
  targetRef,
  materializedAt,
  stateId: result.state.id,
  checkpoint: result.state.checkpoint,
  processedEventCount: result.state.processedEventCount,
  projection
});

const wholeProjectionTargetRef = (projectionName: ProjectionRebuilderName): ObjectRef => ({
  id: `projection.${projectionName}`,
  type: "source",
  namespace: "canopy.projection-rebuild",
  lifecycleStatus: "active"
});

const materializedProjectionDocumentId = (
  projectionName: ProjectionRebuilderName,
  targetRef: ObjectRef
): CanopyId => `materialized-projection.${projectionName}.${refKey(targetRef)}`;

const documentKey = (projectionName: ProjectionRebuilderName, targetRef: ObjectRef): string =>
  `${projectionName}:${refKey(targetRef)}`;

const rebuildResult = <TProjection>(
  projectionName: ProjectionRebuilderName,
  projections: TProjection,
  events: readonly CanopyEvent[],
  rebuiltAt: IsoDateTime = new Date().toISOString()
): ProjectionRebuildResult<TProjection> => ({
  projectionName,
  projectionVersion: PROJECTION_REBUILD_VERSION,
  projections,
  state: buildProjectionState(projectionName, events, rebuiltAt)
});

const buildProjectionState = (
  projectionName: ProjectionRebuilderName,
  events: readonly CanopyEvent[],
  rebuiltAt: IsoDateTime
): ProjectionStateRecord => {
  const lastEvent = events.at(-1);
  const checkpoint =
    lastEvent === undefined
      ? {
          processedAt: rebuiltAt,
          sequence: events.length
        }
      : {
          eventId: lastEvent.id,
          occurredAt: lastEvent.occurredAt,
          processedAt: rebuiltAt,
          sequence: events.length
        };

  return optionalState({
    id: `projection-state.${projectionName}`,
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: rebuiltAt,
    updatedAt: rebuiltAt,
    projectionName,
    projectionVersion: PROJECTION_REBUILD_VERSION,
    status: "current",
    checkpoint,
    processedEventCount: events.length,
    rebuiltAt
  });
};

const requestedProjectionState = (
  projectionName: ProjectionRebuilderName,
  input: RequestProjectionRebuildInput
): ProjectionStateRecord => {
  const eventCount = input.runtime.counts().events;

  return optionalState({
    id: `projection-state.${projectionName}`,
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: input.requestedAt,
    updatedAt: input.requestedAt,
    projectionName,
    projectionVersion: PROJECTION_REBUILD_VERSION,
    status: "stale",
    checkpoint: {
      processedAt: input.requestedAt,
      sequence: eventCount
    },
    processedEventCount: 0,
    lastError: input.reason,
    rebuildRequestedAt: input.requestedAt
  });
};

const collectAllRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs(events.flatMap((event) => [event.objectRef, ...event.relatedRefs, ...event.authorityRefs])));

const collectResourceRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] => {
  const refs: ObjectRef[] = [];

  for (const event of events) {
    refs.push(...[event.objectRef, ...event.relatedRefs].filter((ref) => ref.type === "resource"));
    const payloadResourceRef = payloadRef(event.payload, "resourceRef");
    const payloadResourceRefId = payloadString(event.payload, "resourceRefId");
    const referencedResource = findRefById([event.objectRef, ...event.relatedRefs], payloadResourceRefId);

    if (payloadResourceRef?.type === "resource") {
      refs.push(payloadResourceRef);
    }

    if (referencedResource?.type === "resource") {
      refs.push(referencedResource);
    }
  }

  return sortedRefs(dedupeRefs(refs));
};

const collectDecisionRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] => {
  const refs: ObjectRef[] = [];

  for (const event of events) {
    refs.push(...[event.objectRef, ...event.relatedRefs].filter((ref) => ref.type === "decision"));
    refs.push(...recordRefs(event.payload, "decisionPacket"));
    refs.push(...recordRefs(event.payload, "decision"));
    const payloadDecisionRef = payloadRef(event.payload, "decisionRef");

    if (payloadDecisionRef?.type === "decision") {
      refs.push(payloadDecisionRef);
    }
  }

  return sortedRefs(dedupeRefs(refs.filter((ref) => ref.type === "decision")));
};

const recordRefs = (
  payload: Readonly<Record<string, unknown>>,
  recordKey: string
): readonly ObjectRef[] => {
  const value = payload[recordKey];

  if (!isRecord(value)) {
    return [];
  }

  return [
    recordRef(value, "decisionRef"),
    ...recordRefArray(value, "decisionRefs")
  ].filter(isDefined);
};

const recordRef = (
  record: Readonly<Record<string, unknown>>,
  key: string
): ObjectRef | undefined => {
  const value = record[key];
  return isObjectRef(value) ? value : undefined;
};

const recordRefArray = (
  record: Readonly<Record<string, unknown>>,
  key: string
): readonly ObjectRef[] => {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isObjectRef) : [];
};

const payloadRef = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): ObjectRef | undefined => {
  const value = payload[key];
  return isObjectRef(value) ? value : undefined;
};

const payloadString = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): string | undefined => {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const findRefById = (
  refs: readonly ObjectRef[],
  id: CanopyId | undefined
): ObjectRef | undefined => refs.find((ref) => ref.id === id);

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => {
  const byKey = new Map<string, ObjectRef>();

  for (const ref of refs) {
    byKey.set(refKey(ref), ref);
  }

  return [...byKey.values()];
};

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const page = <TValue>(
  values: readonly TValue[],
  request: { readonly limit?: number; readonly cursor?: string }
): MaterializedProjectionPage<TValue> => {
  const start = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const limit = request.limit ?? values.length;
  const items = values.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < values.length;

  return hasMore ? { items, nextCursor: String(nextOffset), hasMore } : { items, hasMore };
};

const isObjectRef = (value: unknown): value is ObjectRef =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.namespace === "string" &&
  typeof value.lifecycleStatus === "string";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDefined = <TValue>(value: TValue | undefined): value is TValue => value !== undefined;

const optionalState = (state: Record<string, unknown>): ProjectionStateRecord => {
  const entries = Object.entries(state).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as unknown as ProjectionStateRecord;
};

const freezeValue = <TValue>(value: TValue): TValue => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeValue(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        copy[key] = freezeValue(entry);
      }
    }
    return Object.freeze(copy) as TValue;
  }

  return value;
};
