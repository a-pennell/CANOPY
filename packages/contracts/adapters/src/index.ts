import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
  RelationshipRef,
  SourceProject
} from "@canopy/contracts-kernel";

export const CANOPY_ADAPTER_KINDS = [
  "auth",
  "persistence",
  "event-store",
  "object-graph",
  "document-store",
  "object-storage",
  "geospatial",
  "time-series",
  "vector",
  "federation-transport",
  "legacy-project"
] as const;

export type CanopyAdapterKind = (typeof CANOPY_ADAPTER_KINDS)[number];

export type AdapterCapability =
  | "read"
  | "write"
  | "append"
  | "transaction"
  | "search"
  | "stream"
  | "replay"
  | "export"
  | "import"
  | "dry-run"
  | "redaction"
  | "audit";

export type AdapterHealthStatus =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unavailable";

export type AdapterErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "schema_mismatch"
  | "append_only_violation"
  | "mapping_missing"
  | "transaction_failed"
  | "provider_unavailable"
  | "unsupported_operation"
  | "rate_limited"
  | "redaction_required"
  | "unknown";

export interface AdapterDescriptor {
  readonly id: CanopyId;
  readonly kind: CanopyAdapterKind;
  readonly name: string;
  readonly provider?: string;
  readonly sourceProject?: SourceProject;
  readonly version: string;
  readonly schemaVersion: number;
  readonly capabilities: readonly AdapterCapability[];
  readonly supportedObjectTypes: readonly CanopyObjectType[];
  readonly supportedEventTypes: readonly CanopyEventType[];
}

export interface AdapterHealth {
  readonly adapterId: CanopyId;
  readonly status: AdapterHealthStatus;
  readonly checkedAt: IsoDateTime;
  readonly latencyMs?: number;
  readonly warnings: readonly string[];
}

export interface AdapterError {
  readonly code: AdapterErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly providerCode?: string;
  readonly path: readonly string[];
  readonly affectedRef?: ObjectRef;
}

export interface AdapterResult<TValue> {
  readonly ok: boolean;
  readonly value?: TValue;
  readonly errors: readonly AdapterError[];
}

export interface AdapterPageRequest {
  readonly cursor?: string;
  readonly limit?: number;
}

export interface AdapterPage<TValue> {
  readonly items: readonly TValue[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export interface AdapterBase {
  readonly descriptor: AdapterDescriptor;
  health(): Promise<AdapterHealth>;
}

export interface AdapterTransactionContext {
  readonly id: CanopyId;
  readonly startedAt: IsoDateTime;
  readonly authorityRefs: readonly ObjectRef[];
  readonly idempotencyKey?: string;
}

export interface AuthSessionPrincipal {
  readonly accountRef: ObjectRef;
  readonly personRef?: ObjectRef;
  readonly membershipRefs: readonly ObjectRef[];
  readonly roleAssignmentRefs: readonly ObjectRef[];
  readonly systemActor?: string;
}

export interface ResolveAuthSessionRequest {
  readonly tokenHint?: string;
  readonly providerSubject?: string;
  readonly providerSessionId?: string;
  readonly requestedAt: IsoDateTime;
}

export interface LinkAuthAccountRequest {
  readonly personRef: ObjectRef;
  readonly provider: string;
  readonly providerSubject: string;
  readonly handle: string;
  readonly authorityRefs: readonly ObjectRef[];
}

export interface AuthAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "auth" };
  resolveSession(
    request: ResolveAuthSessionRequest
  ): Promise<AdapterResult<AuthSessionPrincipal>>;
  linkAccount(
    request: LinkAuthAccountRequest
  ): Promise<AdapterResult<ObjectRef>>;
  revokeSession(
    accountRef: ObjectRef,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>>;
}

export interface CanonicalObjectSnapshot<TPayload = Readonly<Record<string, unknown>>> {
  readonly ref: ObjectRef;
  readonly objectType: CanopyObjectType;
  readonly payload: TPayload;
  readonly contentHash?: ContentHash;
  readonly schemaVersion: number;
  readonly updatedAt?: IsoDateTime;
}

export interface CanonicalObjectWrite<TPayload = Readonly<Record<string, unknown>>> {
  readonly snapshot: CanonicalObjectSnapshot<TPayload>;
  readonly authorityRefs: readonly ObjectRef[];
  readonly expectedVersion?: number;
  readonly idempotencyKey?: string;
}

export interface CanonicalObjectQuery {
  readonly objectTypes?: readonly CanopyObjectType[];
  readonly refs?: readonly ObjectRef[];
  readonly scopeRefs?: readonly ObjectRef[];
  readonly updatedAfter?: IsoDateTime;
  readonly lifecycleStatuses?: readonly string[];
  readonly page?: AdapterPageRequest;
}

export interface PersistenceAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "persistence" };
  readObject(
    ref: ObjectRef
  ): Promise<AdapterResult<CanonicalObjectSnapshot | undefined>>;
  queryObjects(
    query: CanonicalObjectQuery
  ): Promise<AdapterResult<AdapterPage<CanonicalObjectSnapshot>>>;
  writeObject(
    write: CanonicalObjectWrite
  ): Promise<AdapterResult<CanonicalObjectSnapshot>>;
  withTransaction<TValue>(
    authorityRefs: readonly ObjectRef[],
    work: (transaction: AdapterTransactionContext) => Promise<TValue>
  ): Promise<AdapterResult<TValue>>;
}

export interface AppendEventRequest {
  readonly event: CanopyEvent;
  readonly idempotencyKey?: string;
  readonly expectedPreviousEventId?: CanopyId;
}

export interface EventQuery {
  readonly objectRef?: ObjectRef;
  readonly relatedRef?: ObjectRef;
  readonly eventTypes?: readonly CanopyEventType[];
  readonly occurredAfter?: IsoDateTime;
  readonly occurredBefore?: IsoDateTime;
  readonly page?: AdapterPageRequest;
}

export interface EventReplayCursor {
  readonly cursor?: string;
  readonly fromEventId?: CanopyId;
  readonly fromOccurredAt?: IsoDateTime;
}

export interface EventStoreAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "event-store" };
  appendEvent(request: AppendEventRequest): Promise<AdapterResult<CanopyEvent>>;
  getEvent(eventId: CanopyId): Promise<AdapterResult<CanopyEvent | undefined>>;
  queryEvents(
    query: EventQuery
  ): Promise<AdapterResult<AdapterPage<CanopyEvent>>>;
  replay(
    cursor: EventReplayCursor
  ): AsyncIterable<AdapterResult<CanopyEvent>>;
}

export interface ObjectRelationshipWrite {
  readonly relationship: RelationshipRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly eventRef?: ObjectRef;
}

export interface ObjectGraphQuery {
  readonly rootRef: ObjectRef;
  readonly relationshipKinds?: readonly string[];
  readonly maxDepth?: number;
  readonly includeIncoming: boolean;
  readonly includeOutgoing: boolean;
}

export interface ObjectGraphSnapshot {
  readonly rootRef: ObjectRef;
  readonly objectRefs: readonly ObjectRef[];
  readonly relationships: readonly RelationshipRef[];
  readonly builtAt: IsoDateTime;
}

export interface ObjectGraphAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "object-graph" };
  putRelationship(
    write: ObjectRelationshipWrite
  ): Promise<AdapterResult<RelationshipRef>>;
  queryGraph(
    query: ObjectGraphQuery
  ): Promise<AdapterResult<ObjectGraphSnapshot>>;
}

export type StoredDocumentFormat =
  | "plain_text"
  | "markdown"
  | "html"
  | "pdf"
  | "docx"
  | "json"
  | "csv"
  | "image"
  | "audio"
  | "video"
  | "binary";

export interface DocumentPointer {
  readonly id: CanopyId;
  readonly objectRef: ObjectRef;
  readonly uri: string;
  readonly format: StoredDocumentFormat;
  readonly contentHash?: ContentHash;
  readonly source?: LocalSourcePointer;
  readonly schemaVersion: number;
}

export interface DocumentIngestRequest {
  readonly objectRef: ObjectRef;
  readonly format: StoredDocumentFormat;
  readonly uri?: string;
  readonly bytes?: Uint8Array;
  readonly text?: string;
  readonly source?: LocalSourcePointer;
  readonly authorityRefs: readonly ObjectRef[];
}

export interface DocumentStoreAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "document-store" };
  ingestDocument(
    request: DocumentIngestRequest
  ): Promise<AdapterResult<DocumentPointer>>;
  getDocument(pointer: DocumentPointer): Promise<AdapterResult<DocumentPointer>>;
  searchDocuments(
    query: string,
    page?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<DocumentPointer>>>;
}

export interface ObjectStoragePointer {
  readonly bucket: string;
  readonly key: string;
  readonly uri?: string;
  readonly contentType?: string;
  readonly contentHash?: ContentHash;
  readonly sizeBytes?: number;
}

export interface ObjectStoragePutRequest {
  readonly pointer: ObjectStoragePointer;
  readonly bytes: Uint8Array;
  readonly authorityRefs: readonly ObjectRef[];
  readonly metadata: Readonly<Record<string, string>>;
}

export interface ObjectStorageAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "object-storage" };
  putObject(
    request: ObjectStoragePutRequest
  ): Promise<AdapterResult<ObjectStoragePointer>>;
  getObject(pointer: ObjectStoragePointer): Promise<AdapterResult<Uint8Array>>;
  deleteObject(
    pointer: ObjectStoragePointer,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>>;
}

export type GeoGeometryKind =
  | "point"
  | "line"
  | "polygon"
  | "multi_polygon"
  | "bbox";

export interface GeoShape {
  readonly id: CanopyId;
  readonly kind: GeoGeometryKind;
  readonly coordinates: unknown;
  readonly coordinateSystem: "wgs84" | "local" | "unknown";
  readonly objectRef: ObjectRef;
  readonly validAt?: IsoDateTime;
  readonly source?: LocalSourcePointer;
}

export interface GeoQuery {
  readonly intersects?: GeoShape;
  readonly within?: GeoShape;
  readonly near?: GeoShape;
  readonly radiusMeters?: number;
  readonly objectTypes?: readonly CanopyObjectType[];
  readonly page?: AdapterPageRequest;
}

export interface GeospatialAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "geospatial" };
  putShape(
    shape: GeoShape,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<GeoShape>>;
  queryShapes(query: GeoQuery): Promise<AdapterResult<AdapterPage<GeoShape>>>;
}

export type TimeSeriesValue = number | string | boolean;

export interface TimeSeriesPoint {
  readonly seriesId: CanopyId;
  readonly objectRef: ObjectRef;
  readonly measuredAt: IsoDateTime;
  readonly value: TimeSeriesValue;
  readonly unit?: string;
  readonly source?: LocalSourcePointer;
  readonly dataState?: string;
}

export interface TimeSeriesQuery {
  readonly seriesIds?: readonly CanopyId[];
  readonly objectRefs?: readonly ObjectRef[];
  readonly measuredAfter?: IsoDateTime;
  readonly measuredBefore?: IsoDateTime;
  readonly page?: AdapterPageRequest;
}

export interface TimeSeriesAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "time-series" };
  appendPoints(
    points: readonly TimeSeriesPoint[],
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<readonly TimeSeriesPoint[]>>;
  queryPoints(
    query: TimeSeriesQuery
  ): Promise<AdapterResult<AdapterPage<TimeSeriesPoint>>>;
}

export interface VectorEmbedding {
  readonly id: CanopyId;
  readonly objectRef: ObjectRef;
  readonly modelRef?: ObjectRef;
  readonly dimensions: number;
  readonly values: readonly number[];
  readonly contentHash?: ContentHash;
  readonly createdAt: IsoDateTime;
}

export interface VectorSearchQuery {
  readonly vector: readonly number[];
  readonly dimensions: number;
  readonly objectTypes?: readonly CanopyObjectType[];
  readonly limit: number;
  readonly minScore?: number;
}

export interface VectorSearchHit {
  readonly embedding: VectorEmbedding;
  readonly score: number;
}

export interface VectorAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "vector" };
  upsertEmbedding(
    embedding: VectorEmbedding,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<VectorEmbedding>>;
  search(
    query: VectorSearchQuery
  ): Promise<AdapterResult<readonly VectorSearchHit[]>>;
}

export interface FederationTransportMessage {
  readonly id: CanopyId;
  readonly federationRuleRef: ObjectRef;
  readonly sentAt?: IsoDateTime;
  readonly receivedAt?: IsoDateTime;
  readonly eventIds: readonly CanopyId[];
  readonly objectRefs: readonly ObjectRef[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly contentHash?: ContentHash;
  readonly schemaVersion: number;
}

export interface FederationTransportAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & {
    readonly kind: "federation-transport";
  };
  send(
    message: FederationTransportMessage
  ): Promise<AdapterResult<FederationTransportMessage>>;
  receive(
    page?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<FederationTransportMessage>>>;
  acknowledge(
    messageId: CanopyId,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>>;
}

export interface LegacySourceRecord {
  readonly source: LocalSourcePointer;
  readonly objectTypeHint?: CanopyObjectType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly contentHash?: ContentHash;
}

export interface LegacyRecordMapping {
  readonly source: LocalSourcePointer;
  readonly canonicalRef: ObjectRef;
  readonly mappedObjectType: CanopyObjectType;
  readonly capability: CanopyCapability;
  readonly confidence: number;
  readonly reviewRequired: boolean;
  readonly notes: readonly string[];
}

export interface LegacyImportBatch {
  readonly id: CanopyId;
  readonly sourceProject: SourceProject;
  readonly records: readonly LegacySourceRecord[];
  readonly dryRun: boolean;
  readonly authorityRefs: readonly ObjectRef[];
  readonly importedAt?: IsoDateTime;
}

export interface LegacyImportReport {
  readonly id: CanopyId;
  readonly sourceProject: SourceProject;
  readonly dryRun: boolean;
  readonly acceptedMappings: readonly LegacyRecordMapping[];
  readonly emittedEvents: readonly CanopyEvent[];
  readonly warnings: readonly AdapterError[];
  readonly prohibitedOutcomes: readonly string[];
}

export interface LegacyProjectAdapter extends AdapterBase {
  readonly descriptor: AdapterDescriptor & { readonly kind: "legacy-project" };
  inspectSource(
    page?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<LegacySourceRecord>>>;
  mapRecord(
    record: LegacySourceRecord
  ): Promise<AdapterResult<LegacyRecordMapping>>;
  importBatch(
    batch: LegacyImportBatch
  ): Promise<AdapterResult<LegacyImportReport>>;
}

export interface CanopyAdapterRegistry {
  readonly auth?: AuthAdapter;
  readonly persistence?: PersistenceAdapter;
  readonly eventStore?: EventStoreAdapter;
  readonly objectGraph?: ObjectGraphAdapter;
  readonly documentStore?: DocumentStoreAdapter;
  readonly objectStorage?: ObjectStorageAdapter;
  readonly geospatial?: GeospatialAdapter;
  readonly timeSeries?: TimeSeriesAdapter;
  readonly vector?: VectorAdapter;
  readonly federationTransport?: FederationTransportAdapter;
  readonly legacyProjectAdapters: readonly LegacyProjectAdapter[];
}
