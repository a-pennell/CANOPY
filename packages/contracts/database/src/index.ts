import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  CanopyObjectType,
  CanopySystemActor,
  ContentHash,
  IsoDateTime,
  LifecycleStatus,
  LocalSourcePointer,
  ObjectRef,
  RelationshipRef,
  SourceProject
} from "@canopy/contracts-kernel";

export type CanonicalRecordKind =
  | "canonical-object-ref"
  | "canonical-mapping"
  | "event"
  | "outbox"
  | "projection-state"
  | "adapter-audit";

export type CanonicalRecordStatus =
  | "active"
  | "pending"
  | "paused"
  | "superseded"
  | "retired"
  | "redacted"
  | "failed";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface CanonicalRecordEnvelope {
  readonly id: CanopyId;
  readonly kind: CanonicalRecordKind;
  readonly schemaVersion: number;
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
  readonly contentHash?: ContentHash;
}

export interface CanonicalScope {
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
}

export interface CanonicalObjectRefRecord extends CanonicalRecordEnvelope {
  readonly kind: "canonical-object-ref";
  readonly ref: ObjectRef;
  readonly objectId: CanopyId;
  readonly objectType: CanopyObjectType;
  readonly namespace: string;
  readonly lifecycleStatus: LifecycleStatus;
  readonly source?: LocalSourcePointer;
  readonly supersedes: readonly CanopyId[];
  readonly relationshipRefs: readonly RelationshipRef[];
  readonly scope?: CanonicalScope;
}

export type CanonicalMappingDisposition =
  | "canonical"
  | "alias"
  | "merge"
  | "subtype"
  | "artifact"
  | "retire"
  | "value"
  | "blocked";

export type CanonicalMappingStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "needs-review"
  | "superseded"
  | "retired";

export interface CanonicalSourceKey {
  readonly sourceProject: SourceProject;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly sourceVersion?: string;
}

export interface CanonicalMappingRecord extends CanonicalRecordEnvelope {
  readonly kind: "canonical-mapping";
  readonly mappingRef?: ObjectRef;
  readonly source: CanonicalSourceKey;
  readonly sourcePointer?: LocalSourcePointer;
  readonly localLabel?: string;
  readonly localType?: string;
  readonly canonicalRef: ObjectRef;
  readonly canonicalType: CanopyObjectType;
  readonly disposition: CanonicalMappingDisposition;
  readonly status: CanonicalMappingStatus;
  readonly confidence?: number;
  readonly mappedByRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly supersedesMappingId?: CanopyId;
  readonly reviewedAt?: IsoDateTime;
}

export interface EventRecord extends CanonicalRecordEnvelope {
  readonly kind: "event";
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly occurredAt: IsoDateTime;
  readonly recordedAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopySystemActor;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly scope: CanonicalScope;
  readonly sourceCapability: CanopyCapability;
  readonly visibility: CanopyEvent["visibility"];
  readonly dataState?: CanopyEvent["dataState"];
  readonly payload: JsonValue;
  readonly supersedesEventId?: CanopyId;
  readonly supersededByEventId?: CanopyId;
  readonly redactionEventId?: CanopyId;
  readonly event: CanopyEvent;
}

export type OutboxDestinationKind =
  | "projection"
  | "adapter"
  | "federation-peer"
  | "workflow"
  | "webhook";

export type OutboxStatus =
  | "pending"
  | "leased"
  | "published"
  | "acknowledged"
  | "failed"
  | "dead-lettered"
  | "cancelled";

export interface OutboxDestination {
  readonly kind: OutboxDestinationKind;
  readonly name: string;
  readonly targetRef?: ObjectRef;
}

export interface OutboxRecord extends CanonicalRecordEnvelope {
  readonly kind: "outbox";
  readonly eventId: CanopyId;
  readonly eventType: CanopyEventType;
  readonly destination: OutboxDestination;
  readonly status: OutboxStatus;
  readonly payload: JsonValue;
  readonly dedupeKey?: string;
  readonly attemptCount: number;
  readonly maxAttempts?: number;
  readonly nextAttemptAt?: IsoDateTime;
  readonly leasedAt?: IsoDateTime;
  readonly leasedBy?: string;
  readonly publishedAt?: IsoDateTime;
  readonly acknowledgedAt?: IsoDateTime;
  readonly lastError?: string;
}

export type ProjectionStateStatus =
  | "current"
  | "rebuilding"
  | "paused"
  | "stale"
  | "failed";

export interface ProjectionCheckpoint {
  readonly eventId?: CanopyId;
  readonly occurredAt?: IsoDateTime;
  readonly processedAt?: IsoDateTime;
  readonly cursor?: string;
  readonly sequence?: number;
}

export interface ProjectionStateRecord extends CanonicalRecordEnvelope {
  readonly kind: "projection-state";
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly status: ProjectionStateStatus;
  readonly scope?: CanonicalScope;
  readonly checkpoint: ProjectionCheckpoint;
  readonly processedEventCount: number;
  readonly lastError?: string;
  readonly rebuildRequestedAt?: IsoDateTime;
  readonly rebuiltAt?: IsoDateTime;
}

export type AdapterAuditDirection =
  | "ingress"
  | "egress"
  | "reconciliation"
  | "migration";

export type AdapterAuditStatus =
  | "started"
  | "succeeded"
  | "failed"
  | "partial"
  | "skipped";

export interface AdapterExternalRef {
  readonly provider: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly sourceProject?: SourceProject;
}

export interface AdapterAuditRecord extends CanonicalRecordEnvelope {
  readonly kind: "adapter-audit";
  readonly adapterName: string;
  readonly direction: AdapterAuditDirection;
  readonly operation: string;
  readonly status: AdapterAuditStatus;
  readonly startedAt: IsoDateTime;
  readonly completedAt?: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopySystemActor;
  readonly targetRef?: ObjectRef;
  readonly externalRef?: AdapterExternalRef;
  readonly eventIds: readonly CanopyId[];
  readonly outboxIds: readonly CanopyId[];
  readonly requestHash?: ContentHash;
  readonly responseHash?: ContentHash;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly metadata: JsonValue;
}

export type CanonicalDatabaseRecord =
  | CanonicalObjectRefRecord
  | CanonicalMappingRecord
  | EventRecord
  | OutboxRecord
  | ProjectionStateRecord
  | AdapterAuditRecord;
