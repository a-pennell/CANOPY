import type {
  CanopyId,
  ContentHash,
  IsoDateTime,
  ObjectRef,
  VersionedContract,
} from "@canopy/contracts-kernel";

export type DataVisibility =
  | "public"
  | "federation"
  | "organization"
  | "commons"
  | "role_restricted"
  | "guardian_restricted"
  | "private"
  | "embargoed"
  | "sealed";

export type DataState =
  | "unverified"
  | "locally_verified"
  | "expert_reviewed"
  | "institutionally_certified"
  | "contested"
  | "outdated"
  | "sensitive"
  | "archived"
  | "machine_inferred"
  | "sensor_derived"
  | "testimony_derived"
  | "model_derived";

export type ReviewState =
  | "pending"
  | "accepted"
  | "rejected"
  | "contested"
  | "superseded"
  | "preserved";

export type ClaimReviewState = ReviewState;
export type CounterclaimReviewState = ReviewState;
export type EvidenceReviewState = ReviewState;

export type ClaimType =
  | "fact"
  | "causal"
  | "value"
  | "assumption"
  | "preference"
  | "forecast"
  | "risk"
  | "need"
  | "capability"
  | "impact"
  | "condition"
  | "model"
  | "outcome";

export type EvidenceType =
  | "testimony"
  | "measurement"
  | "sensor_reading"
  | "local_knowledge"
  | "scientific_study"
  | "institutional_record"
  | "media_artifact"
  | "model_output"
  | "ai_interpretation"
  | "legal_document"
  | "financial_record"
  | "field_note";

export type SourceType =
  | "person"
  | "organization"
  | "institution"
  | "sensor"
  | "model"
  | "document"
  | "dataset"
  | "media"
  | "legacy_import"
  | "federated_record"
  | "ai_system"
  | "local_knowledge";

export type ProvenanceKind =
  | "human_submitted"
  | "imported"
  | "machine_inferred"
  | "sensor_derived"
  | "model_derived"
  | "testimony_derived"
  | "federated"
  | "legacy_migrated";

export type EvidenceRelation =
  | "supports"
  | "challenges"
  | "contextualizes"
  | "qualifies"
  | "supersedes";

export type ContestabilityState =
  | "open"
  | "under_review"
  | "resolved"
  | "preserved"
  | "closed";

export interface StewardedRecord extends VersionedContract {
  readonly id: CanopyId;
  readonly orgId?: CanopyId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
  readonly dataState: DataState;
  readonly visibility: DataVisibility;
  readonly authorityRefs: readonly ObjectRef[];
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
}

export interface ProvenanceRecord {
  readonly kind: ProvenanceKind;
  readonly sourceRef?: ObjectRef;
  readonly sourceUri?: string;
  readonly sourceVersion?: string;
  readonly contentHash?: ContentHash;
  readonly collectedAt?: IsoDateTime;
  readonly importedAt?: IsoDateTime;
  readonly generatedAt?: IsoDateTime;
  readonly method?: string;
  readonly actorRef?: ObjectRef;
  readonly toolRef?: ObjectRef;
  readonly notes?: string;
}

export interface Contestability {
  readonly state: ContestabilityState;
  readonly challengedByRefs: readonly ObjectRef[];
  readonly counterclaimRefs: readonly ObjectRef[];
  readonly objectionRefs: readonly ObjectRef[];
  readonly appealRefs: readonly ObjectRef[];
  readonly reviewRequired: boolean;
  readonly reviewAt?: IsoDateTime;
  readonly resolutionRef?: ObjectRef;
}

export interface Source extends StewardedRecord {
  readonly type: "source";
  readonly sourceType: SourceType;
  readonly title: string;
  readonly description?: string;
  readonly stewardRefs: readonly ObjectRef[];
  readonly subjectRefs: readonly ObjectRef[];
  readonly uri?: string;
  readonly storageRef?: string;
  readonly citation?: string;
  readonly provenance: ProvenanceRecord;
}

export interface Claim extends StewardedRecord {
  readonly type: "claim";
  readonly claimantRef: ObjectRef;
  readonly aboutRefs: readonly ObjectRef[];
  readonly claimType: ClaimType;
  readonly text: string;
  readonly structuredValue?: Record<string, unknown>;
  readonly confidence?: number;
  readonly reviewStatus: ClaimReviewState;
  readonly reviewedByRefs: readonly ObjectRef[];
  readonly reviewedAt?: IsoDateTime;
  readonly acceptedForRefs: readonly ObjectRef[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly evidenceLinkRefs: readonly ObjectRef[];
  readonly provenance: ProvenanceRecord;
  readonly contestability: Contestability;
}

export interface Counterclaim extends StewardedRecord {
  readonly type: "counterclaim";
  readonly targetClaimRef: ObjectRef;
  readonly claimantRef: ObjectRef;
  readonly text: string;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly evidenceLinkRefs: readonly ObjectRef[];
  readonly reviewStatus: CounterclaimReviewState;
  readonly reviewedByRefs: readonly ObjectRef[];
  readonly reviewedAt?: IsoDateTime;
  readonly preservationRationale?: string;
  readonly provenance: ProvenanceRecord;
}

export interface Evidence extends StewardedRecord {
  readonly type: "evidence";
  readonly submittedByRef: ObjectRef;
  readonly evidenceType: EvidenceType;
  readonly title: string;
  readonly summary?: string;
  readonly sourceRef?: ObjectRef;
  readonly sourceUri?: string;
  readonly storageRef?: string;
  readonly quote?: string;
  readonly observedAt?: IsoDateTime;
  readonly validFrom?: IsoDateTime;
  readonly validUntil?: IsoDateTime;
  readonly reviewStatus: EvidenceReviewState;
  readonly reviewedByRefs: readonly ObjectRef[];
  readonly reviewedAt?: IsoDateTime;
  readonly aboutRefs: readonly ObjectRef[];
  readonly provenance: ProvenanceRecord;
  readonly contestability: Contestability;
}

export interface EvidenceLink extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "evidence-link";
  readonly orgId?: CanopyId;
  readonly claimRef: ObjectRef;
  readonly evidenceRef: ObjectRef;
  readonly relation: EvidenceRelation;
  readonly note?: string;
  readonly confidence?: number;
  readonly createdByRef: ObjectRef;
  readonly createdAt: IsoDateTime;
  readonly supersedesEvidenceLinkRefs: readonly ObjectRef[];
  readonly dataState: DataState;
  readonly visibility: DataVisibility;
}
