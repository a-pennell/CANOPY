import type {
  AdapterBase,
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  AppendEventRequest,
  AuthAdapter,
  AuthSessionPrincipal,
  CanopyAdapterRegistry,
  CanonicalObjectQuery,
  CanonicalObjectSnapshot,
  CanonicalObjectWrite,
  DocumentIngestRequest,
  DocumentPointer,
  DocumentStoreAdapter,
  EventQuery,
  EventReplayCursor,
  EventStoreAdapter,
  FederationTransportAdapter,
  FederationTransportMessage,
  GeoQuery,
  GeoShape,
  GeospatialAdapter,
  LegacyImportBatch,
  LegacyImportReport,
  LegacyProjectAdapter,
  LegacyRecordMapping,
  LegacySourceRecord,
  LinkAuthAccountRequest,
  ObjectGraphAdapter,
  ObjectGraphQuery,
  ObjectGraphSnapshot,
  ObjectRelationshipWrite,
  ObjectStorageAdapter,
  ObjectStoragePointer,
  ObjectStoragePutRequest,
  PersistenceAdapter,
  ResolveAuthSessionRequest,
  TimeSeriesAdapter,
  TimeSeriesPoint,
  TimeSeriesQuery,
  VectorAdapter,
  VectorEmbedding,
  VectorSearchHit,
  VectorSearchQuery
} from "@canopy/contracts-adapters";
import type { AdapterAuditRecord } from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyId,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  ObjectRef,
  RelationshipRef,
  SourceProject
} from "@canopy/contracts-kernel";
import {
  createInMemoryCanonicalPersistence,
  type CanonicalPersistenceRuntime
} from "@canopy/database-runtime";

export interface InMemoryReferenceAdaptersOptions {
  readonly now?: () => IsoDateTime;
  readonly persistence?: CanonicalPersistenceRuntime;
  readonly legacyRecords?: readonly LegacySourceRecord[];
}

export interface InMemoryReferenceAdapterRegistry extends CanopyAdapterRegistry {
  readonly persistenceRuntime: CanonicalPersistenceRuntime;
  readonly auth: InMemoryAuthAdapter;
  readonly persistence: InMemoryPersistenceAdapter;
  readonly eventStore: InMemoryEventStoreAdapter;
  readonly objectGraph: InMemoryObjectGraphAdapter;
  readonly documentStore: InMemoryDocumentStoreAdapter;
  readonly objectStorage: InMemoryObjectStorageAdapter;
  readonly geospatial: InMemoryGeospatialAdapter;
  readonly timeSeries: InMemoryTimeSeriesAdapter;
  readonly vector: InMemoryVectorAdapter;
  readonly federationTransport: InMemoryFederationTransportAdapter;
  readonly legacyProjectAdapters: readonly InMemoryLegacyProjectAdapter[];
}

const defaultNow = (): IsoDateTime => new Date().toISOString();

export function createInMemoryReferenceAdapters(
  options: InMemoryReferenceAdaptersOptions = {}
): InMemoryReferenceAdapterRegistry {
  const now = options.now ?? defaultNow;
  const persistenceRuntime = options.persistence ?? createInMemoryCanonicalPersistence({ now });
  const auth = new InMemoryAuthAdapter(now);
  const persistence = new InMemoryPersistenceAdapter(persistenceRuntime, now);
  const eventStore = new InMemoryEventStoreAdapter(persistenceRuntime, now);
  const objectGraph = new InMemoryObjectGraphAdapter(now);
  const documentStore = new InMemoryDocumentStoreAdapter(now);
  const objectStorage = new InMemoryObjectStorageAdapter(now);
  const geospatial = new InMemoryGeospatialAdapter(now);
  const timeSeries = new InMemoryTimeSeriesAdapter(now);
  const vector = new InMemoryVectorAdapter(now);
  const federationTransport = new InMemoryFederationTransportAdapter(now);
  const legacyProject = new InMemoryLegacyProjectAdapter(now, options.legacyRecords ?? []);

  return {
    persistenceRuntime,
    auth,
    persistence,
    eventStore,
    objectGraph,
    documentStore,
    objectStorage,
    geospatial,
    timeSeries,
    vector,
    federationTransport,
    legacyProjectAdapters: [legacyProject]
  };
}

abstract class ReferenceAdapterBase implements AdapterBase {
  readonly descriptor: AdapterDescriptor;
  private readonly now: () => IsoDateTime;

  protected constructor(descriptor: AdapterDescriptor, now: () => IsoDateTime) {
    this.descriptor = descriptor;
    this.now = now;
  }

  async health(): Promise<AdapterHealth> {
    return {
      adapterId: this.descriptor.id,
      status: "healthy",
      checkedAt: this.now(),
      warnings: []
    };
  }

  protected ok<TValue>(value: TValue): AdapterResult<TValue> {
    return { ok: true, value, errors: [] };
  }

  protected failure<TValue>(
    code: AdapterError["code"],
    message: string,
    path: readonly string[] = [],
    retryable = false
  ): AdapterResult<TValue> {
    return {
      ok: false,
      errors: [{ code, message, path, retryable }]
    };
  }
}

export class InMemoryAuthAdapter extends ReferenceAdapterBase implements AuthAdapter {
  override readonly descriptor: AdapterDescriptor & { readonly kind: "auth" };
  private readonly accountsBySubject = new Map<string, ObjectRef>();
  private readonly principalsByAccount = new Map<string, AuthSessionPrincipal>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("auth", ["read", "write", "audit"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async resolveSession(
    request: ResolveAuthSessionRequest
  ): Promise<AdapterResult<AuthSessionPrincipal>> {
    const subject = request.providerSubject ?? request.tokenHint;
    if (subject === undefined) {
      return this.failure("unauthorized", "Session request did not include a subject.", [
        "providerSubject"
      ]);
    }

    const accountRef = this.accountsBySubject.get(subject);
    if (accountRef === undefined) {
      return this.failure("not_found", `No account is linked for ${subject}.`, [
        "providerSubject"
      ]);
    }

    const principal = this.principalsByAccount.get(refKey(accountRef));
    return principal === undefined
      ? this.failure("not_found", `No principal is linked for ${accountRef.id}.`, [
          "accountRef"
        ])
      : this.ok(principal);
  }

  async linkAccount(
    request: LinkAuthAccountRequest
  ): Promise<AdapterResult<ObjectRef>> {
    if (request.authorityRefs.length === 0) {
      return this.failure("forbidden", "Linking auth accounts requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const accountRef: ObjectRef = {
      id: `account.${request.provider}.${request.providerSubject}`,
      type: "account",
      namespace: "canopy.auth",
      lifecycleStatus: "active"
    };
    const principal: AuthSessionPrincipal = {
      accountRef,
      personRef: request.personRef,
      membershipRefs: [],
      roleAssignmentRefs: request.authorityRefs
    };

    this.accountsBySubject.set(request.providerSubject, accountRef);
    this.principalsByAccount.set(refKey(accountRef), principal);
    return this.ok(accountRef);
  }

  async revokeSession(
    accountRef: ObjectRef,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Revoking sessions requires authority refs.", [
        "authorityRefs"
      ]);
    }

    this.principalsByAccount.delete(refKey(accountRef));
    return this.ok(undefined);
  }
}

export class InMemoryPersistenceAdapter
  extends ReferenceAdapterBase
  implements PersistenceAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "persistence" };
  private readonly snapshots = new Map<string, CanonicalObjectSnapshot>();
  private sequence = 0;

  constructor(
    private readonly runtime: CanonicalPersistenceRuntime,
    now: () => IsoDateTime = defaultNow
  ) {
    const adapterDescriptor = makeDescriptor("persistence", ["read", "write", "transaction", "audit"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async readObject(
    ref: ObjectRef
  ): Promise<AdapterResult<CanonicalObjectSnapshot | undefined>> {
    return this.ok(this.snapshots.get(refKey(ref)));
  }

  async queryObjects(
    query: CanonicalObjectQuery
  ): Promise<AdapterResult<AdapterPage<CanonicalObjectSnapshot>>> {
    const requestedRefs = query.refs?.map(refKey);
    const items = [...this.snapshots.values()]
      .filter(
        (snapshot) =>
          requestedRefs === undefined || requestedRefs.includes(refKey(snapshot.ref))
      )
      .filter(
        (snapshot) =>
          query.objectTypes === undefined || query.objectTypes.includes(snapshot.objectType)
      )
      .filter(
        (snapshot) =>
          query.lifecycleStatuses === undefined ||
          query.lifecycleStatuses.includes(snapshot.ref.lifecycleStatus)
      )
      .filter(
        (snapshot) => query.updatedAfter === undefined || (snapshot.updatedAt ?? "") > query.updatedAfter
      )
      .sort((left, right) => compareStrings(refKey(left.ref), refKey(right.ref)));

    return this.ok(page(items, query.page));
  }

  async writeObject(
    write: CanonicalObjectWrite
  ): Promise<AdapterResult<CanonicalObjectSnapshot>> {
    if (write.authorityRefs.length === 0) {
      return this.failure("forbidden", "Object writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const snapshot = freeze({
      ...write.snapshot,
      ref: cloneRef(write.snapshot.ref),
      objectType: write.snapshot.ref.type,
      payload: cloneRecord(write.snapshot.payload)
    });

    this.runtime.upsertObjectRef(
      snapshot.ref,
      snapshot.updatedAt === undefined ? {} : { updatedAt: snapshot.updatedAt }
    );
    this.snapshots.set(refKey(snapshot.ref), snapshot);
    return this.ok(snapshot);
  }

  async withTransaction<TValue>(
    authorityRefs: readonly ObjectRef[],
    work: (transaction: { readonly id: CanopyId; readonly startedAt: IsoDateTime; readonly authorityRefs: readonly ObjectRef[] }) => Promise<TValue>
  ): Promise<AdapterResult<TValue>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Transactions require authority refs.", [
        "authorityRefs"
      ]);
    }

    try {
      const startedAt = new Date().toISOString();
      return this.ok(
        await work({
          id: `transaction.${++this.sequence}`,
          startedAt,
          authorityRefs
        })
      );
    } catch (error) {
      return this.failure(
        "transaction_failed",
        error instanceof Error ? error.message : "Transaction failed.",
        ["transaction"],
        true
      );
    }
  }
}

export class InMemoryEventStoreAdapter
  extends ReferenceAdapterBase
  implements EventStoreAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "event-store" };

  constructor(
    private readonly runtime: CanonicalPersistenceRuntime,
    now: () => IsoDateTime = defaultNow
  ) {
    const adapterDescriptor = makeDescriptor("event-store", ["append", "read", "replay", "stream"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async appendEvent(request: AppendEventRequest): Promise<AdapterResult<CanopyEvent>> {
    const previous = this.runtime.queryEvents({ objectRef: request.event.objectRef }).items.at(-1);
    if (
      request.expectedPreviousEventId !== undefined &&
      previous?.eventId !== request.expectedPreviousEventId
    ) {
      return this.failure("conflict", "Expected previous event did not match.", [
        "expectedPreviousEventId"
      ]);
    }

    try {
      this.runtime.appendEvent(request.event);
      return this.ok(request.event);
    } catch (error) {
      return this.failure(
        "append_only_violation",
        error instanceof Error ? error.message : "Append failed.",
        ["event"]
      );
    }
  }

  async getEvent(eventId: CanopyId): Promise<AdapterResult<CanopyEvent | undefined>> {
    return this.ok(this.runtime.getEvent(eventId)?.event);
  }

  async queryEvents(query: EventQuery): Promise<AdapterResult<AdapterPage<CanopyEvent>>> {
    const eventQuery = withoutUndefined({
        objectRef: query.objectRef,
        relatedRef: query.relatedRef,
        eventTypes: query.eventTypes,
        occurredAfter: query.occurredAfter,
        occurredBefore: query.occurredBefore,
        limit: query.page?.limit,
        cursor: query.page?.cursor
      }) as Parameters<CanonicalPersistenceRuntime["queryEvents"]>[0];
    const records = this.runtime.queryEvents(eventQuery);
    const items = records.items.map((record) => record.event);
    const eventPage: AdapterPage<CanopyEvent> =
      records.nextCursor === undefined
        ? { items, hasMore: records.hasMore }
        : { items, nextCursor: records.nextCursor, hasMore: records.hasMore };

    return this.ok(eventPage);
  }

  async *replay(cursor: EventReplayCursor): AsyncIterable<AdapterResult<CanopyEvent>> {
    const events = this.runtime
      .queryEvents(
        withoutUndefined({
          occurredAfter: cursor.fromOccurredAt
        }) as Parameters<CanonicalPersistenceRuntime["queryEvents"]>[0]
      )
      .items.map((record) => record.event);
    const start =
      cursor.fromEventId === undefined
        ? 0
        : Math.max(0, events.findIndex((event) => event.id === cursor.fromEventId) + 1);

    for (const event of events.slice(start)) {
      yield this.ok(event);
    }
  }
}

export class InMemoryObjectGraphAdapter
  extends ReferenceAdapterBase
  implements ObjectGraphAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "object-graph" };
  private readonly relationships: RelationshipRef[] = [];

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("object-graph", ["read", "write", "search"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async putRelationship(
    write: ObjectRelationshipWrite
  ): Promise<AdapterResult<RelationshipRef>> {
    if (write.authorityRefs.length === 0) {
      return this.failure("forbidden", "Relationships require authority refs.", [
        "authorityRefs"
      ]);
    }

    this.relationships.push(freeze(write.relationship));
    return this.ok(write.relationship);
  }

  async queryGraph(query: ObjectGraphQuery): Promise<AdapterResult<ObjectGraphSnapshot>> {
    const maxDepth = query.maxDepth ?? 1;
    const seen = new Map<string, ObjectRef>([[refKey(query.rootRef), query.rootRef]]);
    const selected: RelationshipRef[] = [];
    let frontier = [query.rootRef];

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const next: ObjectRef[] = [];
      for (const root of frontier) {
        for (const relationship of this.relationships) {
          const outgoing = query.includeOutgoing && sameRef(relationship.from, root);
          const incoming = query.includeIncoming && sameRef(relationship.to, root);
          const kindMatches =
            query.relationshipKinds === undefined ||
            query.relationshipKinds.includes(relationship.kind);

          if (!kindMatches || (!outgoing && !incoming)) {
            continue;
          }

          selected.push(relationship);
          const other = outgoing ? relationship.to : relationship.from;
          if (!seen.has(refKey(other))) {
            seen.set(refKey(other), other);
            next.push(other);
          }
        }
      }
      frontier = next;
    }

    return this.ok({
      rootRef: query.rootRef,
      objectRefs: [...seen.values()].filter((ref) => ref.lifecycleStatus !== "redacted"),
      relationships: selected.filter(
        (relationship) =>
          relationship.from.lifecycleStatus !== "redacted" &&
          relationship.to.lifecycleStatus !== "redacted"
      ),
      builtAt: new Date().toISOString()
    });
  }
}

export class InMemoryDocumentStoreAdapter
  extends ReferenceAdapterBase
  implements DocumentStoreAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "document-store" };
  private readonly pointers = new Map<CanopyId, DocumentPointer>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("document-store", ["read", "write", "search", "redaction"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async ingestDocument(
    request: DocumentIngestRequest
  ): Promise<AdapterResult<DocumentPointer>> {
    if (request.authorityRefs.length === 0) {
      return this.failure("forbidden", "Document ingestion requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const content = request.bytes ?? new TextEncoder().encode(request.text ?? request.uri ?? "");
    const pointer: DocumentPointer = freeze(withoutUndefined({
      id: `document.${hashBytes(content).slice("sha256:".length)}`,
      objectRef: cloneRef(request.objectRef),
      uri: request.uri ?? `memory://document/${request.objectRef.id}`,
      format: request.format,
      contentHash: hashBytes(content),
      source: request.source,
      schemaVersion: 1
    }) as DocumentPointer);

    this.pointers.set(pointer.id, pointer);
    return this.ok(pointer);
  }

  async getDocument(pointer: DocumentPointer): Promise<AdapterResult<DocumentPointer>> {
    return this.ok(this.pointers.get(pointer.id) ?? pointer);
  }

  async searchDocuments(
    query: string,
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<DocumentPointer>>> {
    const items = [...this.pointers.values()].filter(
      (pointer) => pointer.id.includes(query) || pointer.uri.includes(query)
    );
    return this.ok(page(items, pageRequest));
  }
}

export class InMemoryObjectStorageAdapter
  extends ReferenceAdapterBase
  implements ObjectStorageAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "object-storage" };
  private readonly objects = new Map<string, Uint8Array>();
  private readonly pointers = new Map<string, ObjectStoragePointer>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("object-storage", ["read", "write", "redaction"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async putObject(
    request: ObjectStoragePutRequest
  ): Promise<AdapterResult<ObjectStoragePointer>> {
    if (request.authorityRefs.length === 0) {
      return this.failure("forbidden", "Object writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const pointer = freeze({
      ...request.pointer,
      contentHash: request.pointer.contentHash ?? hashBytes(request.bytes),
      sizeBytes: request.bytes.byteLength
    });
    this.objects.set(storageKey(pointer), new Uint8Array(request.bytes));
    this.pointers.set(storageKey(pointer), pointer);
    return this.ok(pointer);
  }

  async getObject(pointer: ObjectStoragePointer): Promise<AdapterResult<Uint8Array>> {
    const value = this.objects.get(storageKey(pointer));
    return value === undefined
      ? this.failure("not_found", "Object was not found.", ["pointer"])
      : this.ok(new Uint8Array(value));
  }

  async deleteObject(
    pointer: ObjectStoragePointer,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Object deletion requires authority refs.", [
        "authorityRefs"
      ]);
    }

    this.objects.delete(storageKey(pointer));
    this.pointers.delete(storageKey(pointer));
    return this.ok(undefined);
  }
}

export class InMemoryGeospatialAdapter
  extends ReferenceAdapterBase
  implements GeospatialAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "geospatial" };
  private readonly shapes = new Map<CanopyId, GeoShape>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("geospatial", ["read", "write", "search"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async putShape(
    shape: GeoShape,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<GeoShape>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Geospatial shapes require authority refs.", [
        "authorityRefs"
      ]);
    }

    this.shapes.set(shape.id, freeze(shape));
    return this.ok(shape);
  }

  async queryShapes(query: GeoQuery): Promise<AdapterResult<AdapterPage<GeoShape>>> {
    const scopedRef = query.within?.objectRef ?? query.near?.objectRef ?? query.intersects?.objectRef;
    const fallbackShape = query.within ?? query.near ?? query.intersects;
    const stored = [...this.shapes.values()]
      .filter((shape) => scopedRef === undefined || sameRef(shape.objectRef, scopedRef))
      .filter(
        (shape) =>
          query.objectTypes === undefined || query.objectTypes.includes(shape.objectRef.type)
      )
      .sort((left, right) => compareStrings(left.id, right.id));
    const items = stored.length === 0 && fallbackShape !== undefined ? [fallbackShape] : stored;
    return this.ok(page(items, query.page));
  }
}

export class InMemoryTimeSeriesAdapter
  extends ReferenceAdapterBase
  implements TimeSeriesAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "time-series" };
  private readonly points: TimeSeriesPoint[] = [];

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("time-series", ["append", "read", "stream"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async appendPoints(
    points: readonly TimeSeriesPoint[],
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<readonly TimeSeriesPoint[]>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Time-series appends require authority refs.", [
        "authorityRefs"
      ]);
    }

    this.points.push(...points.map((point) => freeze(point)));
    return this.ok(points);
  }

  async queryPoints(
    query: TimeSeriesQuery
  ): Promise<AdapterResult<AdapterPage<TimeSeriesPoint>>> {
    const refs = query.objectRefs?.map(refKey);
    const items = this.points
      .filter(
        (point) => query.seriesIds === undefined || query.seriesIds.includes(point.seriesId)
      )
      .filter((point) => refs === undefined || refs.includes(refKey(point.objectRef)))
      .filter(
        (point) => query.measuredAfter === undefined || point.measuredAt >= query.measuredAfter
      )
      .filter(
        (point) => query.measuredBefore === undefined || point.measuredAt <= query.measuredBefore
      )
      .sort(
        (left, right) =>
          compareStrings(left.measuredAt, right.measuredAt) ||
          compareStrings(left.seriesId, right.seriesId)
      );

    return this.ok(page(items, query.page));
  }
}

export class InMemoryVectorAdapter extends ReferenceAdapterBase implements VectorAdapter {
  override readonly descriptor: AdapterDescriptor & { readonly kind: "vector" };
  private readonly embeddings = new Map<CanopyId, VectorEmbedding>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("vector", ["read", "write", "search"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async upsertEmbedding(
    embedding: VectorEmbedding,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<VectorEmbedding>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Embedding writes require authority refs.", [
        "authorityRefs"
      ]);
    }
    if (embedding.values.length !== embedding.dimensions) {
      return this.failure("validation_failed", "Embedding dimensions do not match values.", [
        "dimensions"
      ]);
    }

    this.embeddings.set(embedding.id, freeze(embedding));
    return this.ok(embedding);
  }

  async search(
    query: VectorSearchQuery
  ): Promise<AdapterResult<readonly VectorSearchHit[]>> {
    const hits = [...this.embeddings.values()]
      .filter((embedding) => embedding.dimensions === query.dimensions)
      .filter(
        (embedding) =>
          query.objectTypes === undefined || query.objectTypes.includes(embedding.objectRef.type)
      )
      .map((embedding) => ({
        embedding,
        score: cosine(query.vector, embedding.values)
      }))
      .filter((hit) => query.minScore === undefined || hit.score >= query.minScore)
      .sort((left, right) => right.score - left.score || compareStrings(left.embedding.id, right.embedding.id))
      .slice(0, query.limit);

    return this.ok(hits);
  }
}

export class InMemoryFederationTransportAdapter
  extends ReferenceAdapterBase
  implements FederationTransportAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "federation-transport" };
  private readonly messages = new Map<CanopyId, FederationTransportMessage>();
  private readonly acknowledged = new Set<CanopyId>();

  constructor(now: () => IsoDateTime = defaultNow) {
    const adapterDescriptor = makeDescriptor("federation-transport", ["export", "import", "stream"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async send(
    message: FederationTransportMessage
  ): Promise<AdapterResult<FederationTransportMessage>> {
    const stored = freeze({
      ...message,
      sentAt: message.sentAt ?? new Date().toISOString(),
      contentHash: message.contentHash ?? hashString(JSON.stringify(message.payload))
    });
    this.messages.set(stored.id, stored);
    return this.ok(stored);
  }

  async receive(
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<FederationTransportMessage>>> {
    const items = [...this.messages.values()]
      .filter((message) => !this.acknowledged.has(message.id))
      .sort((left, right) => compareStrings(left.id, right.id));
    return this.ok(page(items, pageRequest));
  }

  async acknowledge(
    messageId: CanopyId,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return this.failure("forbidden", "Federation acknowledgements require authority refs.", [
        "authorityRefs"
      ]);
    }

    this.acknowledged.add(messageId);
    return this.ok(undefined);
  }
}

export class InMemoryLegacyProjectAdapter
  extends ReferenceAdapterBase
  implements LegacyProjectAdapter
{
  override readonly descriptor: AdapterDescriptor & { readonly kind: "legacy-project" };

  constructor(
    now: () => IsoDateTime = defaultNow,
    private readonly records: readonly LegacySourceRecord[] = []
  ) {
    const adapterDescriptor = makeDescriptor("legacy-project", ["import", "dry-run", "read"]);
    super(adapterDescriptor, now);
    this.descriptor = adapterDescriptor;
  }

  async inspectSource(
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<LegacySourceRecord>>> {
    return this.ok(page(this.records, pageRequest));
  }

  async mapRecord(
    record: LegacySourceRecord
  ): Promise<AdapterResult<LegacyRecordMapping>> {
    const objectType = record.objectTypeHint ?? "source";
    const canonicalRef = {
      id: `${objectType}.${record.source.sourceId}`,
      type: objectType,
      namespace: `canopy.legacy.${record.source.sourceProject}`,
      lifecycleStatus: "active" as const,
      source: record.source
    };
    return this.ok({
      source: record.source,
      canonicalRef,
      mappedObjectType: objectType,
      capability: capabilityForSourceProject(record.source.sourceProject),
      confidence: record.objectTypeHint === undefined ? 0.6 : 0.9,
      reviewRequired: true,
      notes: ["Reference adapter mapping requires human review before import."]
    });
  }

  async importBatch(
    batch: LegacyImportBatch
  ): Promise<AdapterResult<LegacyImportReport>> {
    const acceptedMappings: LegacyRecordMapping[] = [];
    const warnings: AdapterError[] = [];

    for (const record of batch.records) {
      if (record.source.sourceProject !== batch.sourceProject) {
        warnings.push({
          code: "validation_failed",
          message: "Record source project differs from batch source project.",
          retryable: false,
          path: ["records", record.source.sourceId]
        });
        continue;
      }

      const mapped = await this.mapRecord(record);
      if (mapped.value !== undefined) {
        acceptedMappings.push(mapped.value);
      }
    }

    return this.ok({
      id: batch.id,
      sourceProject: batch.sourceProject,
      dryRun: batch.dryRun,
      acceptedMappings,
      emittedEvents: [],
      warnings,
      prohibitedOutcomes: [
        "Legacy project records must not become separate Canopy applications.",
        "Legacy auth identifiers must not become civic authority."
      ]
    });
  }
}

export function createAdapterAuditRecord(input: {
  readonly id: CanopyId;
  readonly adapterName: string;
  readonly operation: string;
  readonly startedAt: IsoDateTime;
  readonly status?: AdapterAuditRecord["status"];
  readonly eventIds?: readonly CanopyId[];
  readonly outboxIds?: readonly CanopyId[];
}): AdapterAuditRecord {
  return {
    id: input.id,
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: input.startedAt,
    adapterName: input.adapterName,
    direction: "ingress",
    operation: input.operation,
    status: input.status ?? "succeeded",
    startedAt: input.startedAt,
    completedAt: input.startedAt,
    eventIds: input.eventIds ?? [],
    outboxIds: input.outboxIds ?? [],
    warnings: [],
    errors: [],
    metadata: { referenceAdapter: true }
  };
}

function makeDescriptor<TKind extends AdapterDescriptor["kind"]>(
  kind: TKind,
  capabilities: AdapterDescriptor["capabilities"]
): AdapterDescriptor & { readonly kind: TKind } {
  return {
    id: `adapter.reference.in-memory.${kind}`,
    kind,
    name: `Reference in-memory ${kind} adapter`,
    provider: "in-memory",
    version: "0.0.0",
    schemaVersion: 1,
    capabilities,
    supportedObjectTypes: [],
    supportedEventTypes: []
  };
}

function capabilityForSourceProject(sourceProject: SourceProject): LegacyRecordMapping["capability"] {
  if (sourceProject === "common-credit") {
    return "allocation-accounting";
  }
  if (sourceProject === "stewardship") {
    return "stewardship";
  }
  if (sourceProject === "sensemaking") {
    return "claims-evidence";
  }

  return "governance";
}

function page<TValue>(
  values: readonly TValue[],
  request: AdapterPageRequest = {}
): AdapterPage<TValue> {
  const start = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const limit = request.limit ?? values.length;
  const items = values.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < values.length;
  return hasMore ? { items, nextCursor: String(nextOffset), hasMore } : { items, hasMore };
}

function storageKey(pointer: ObjectStoragePointer): string {
  return `${pointer.bucket}/${pointer.key}`;
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(ref);
}

function cloneRecord<TValue extends Readonly<Record<string, unknown>>>(value: TValue): TValue {
  return freeze(value);
}

function hashBytes(bytes: Uint8Array): ContentHash {
  return hashString([...bytes].join(","));
}

function hashString(value: string): ContentHash {
  let hash = 0;
  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0;
  }

  return `sha256:reference-${hash.toString(16).padStart(8, "0")}`;
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function withoutUndefined<TValue extends Record<string, unknown>>(value: TValue): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as TValue;
}

function freeze<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freeze(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        copy[key] = freeze(entry);
      }
    }
    return Object.freeze(copy) as TValue;
  }

  return value;
}
