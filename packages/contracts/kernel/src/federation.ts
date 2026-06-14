import type {
  CanopyId,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
} from "./primitives.js";

type DataVisibility =
  | "public"
  | "federation"
  | "organization"
  | "commons"
  | "role_restricted"
  | "guardian_restricted"
  | "private"
  | "embargoed"
  | "sealed";

export type FederationSyncMode = "manual" | "scheduled" | "near_real_time";

export type FederationConflictPolicy =
  | "preserve_both"
  | "local_wins"
  | "remote_wins"
  | "governance_required";

export type FederationRuleStatus =
  | "draft"
  | "active"
  | "paused"
  | "defederating"
  | "retired";

export interface FederationRule {
  readonly id: CanopyId;
  readonly localScopeRef: ObjectRef;
  readonly remoteScopeRef: ObjectRef;
  readonly allowedObjectTypes: readonly CanopyObjectType[];
  readonly allowedEventTypes: readonly string[];
  readonly syncMode: FederationSyncMode;
  readonly conflictPolicy: FederationConflictPolicy;
  readonly status: FederationRuleStatus;
  readonly authorityRefs: readonly ObjectRef[];
  readonly exportRuleRefs: readonly ObjectRef[];
  readonly requiresLocalMapping: boolean;
  readonly requiresRedactionReview: boolean;
  readonly reviewAt?: IsoDateTime;
  readonly schemaVersion: number;
}

export type ExportFormat = "json" | "jsonl" | "csv_bundle";

export type ContentHashAlgorithm = "sha256" | "sha512";

export interface ContentHashFields {
  readonly contentHash: ContentHash;
  readonly hashAlgorithm: ContentHashAlgorithm;
  readonly canonicalization:
    | "json_canonical"
    | "jsonl_ordered"
    | "csv_bundle_manifest";
  readonly hashedAt?: IsoDateTime;
}

export type MappingDisposition =
  | "keep"
  | "merge"
  | "subtype"
  | "alias"
  | "artifact"
  | "retire"
  | "value";

export interface LocalTerm {
  readonly id: CanopyId;
  readonly label: string;
  readonly description?: string;
  readonly locale?: string;
  readonly scopeRef?: ObjectRef;
  readonly source?: LocalSourcePointer;
  readonly schemaVersion: number;
}

export interface CanonicalMapping {
  readonly id: CanopyId;
  readonly localTermRef?: ObjectRef;
  readonly localLabel: string;
  readonly localType?: string;
  readonly localId?: string;
  readonly canonicalType: CanopyObjectType;
  readonly canonicalRef?: ObjectRef;
  readonly disposition: MappingDisposition;
  readonly mappedByRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly confidence?: number;
  readonly source?: LocalSourcePointer;
  readonly schemaVersion: number;
}

export interface ExportedDataStewardshipAgreement {
  readonly id: CanopyId;
  readonly governedRef: ObjectRef;
  readonly stewardRefs: readonly ObjectRef[];
  readonly visibility: DataVisibility;
  readonly allowedUses: readonly string[];
  readonly prohibitedUses: readonly string[];
  readonly consentRequired: boolean;
  readonly retentionRule?: Readonly<Record<string, unknown>>;
  readonly exportRule?: Readonly<Record<string, unknown>>;
  readonly federationRuleRef?: ObjectRef;
  readonly reviewAt?: IsoDateTime;
  readonly schemaVersion: number;
}

export interface RedactionSummary {
  readonly redactionCount: number;
  readonly redactedObjectRefs: readonly ObjectRef[];
  readonly redactedEventIds: readonly CanopyId[];
  readonly stubEventIds: readonly CanopyId[];
  readonly reasons: readonly string[];
  readonly removedFields: readonly string[];
  readonly contentHashBeforeRedaction?: ContentHash;
  readonly contentHashAfterRedaction?: ContentHash;
  readonly notes?: readonly string[];
}

export type FederationVerificationStatus = "verified" | "warning" | "rejected";

export type FederationVerificationIssueCode =
  | "duplicate_event_id"
  | "content_hash_mismatch"
  | "authority_refs_missing"
  | "provenance_missing"
  | "signature_required"
  | "redaction_continuity_gap"
  | "schema_version_mismatch"
  | "unsupported_event_type";

export interface FederationVerificationIssue {
  readonly code: FederationVerificationIssueCode;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly path: readonly string[];
  readonly eventId?: CanopyId;
  readonly affectedRef?: ObjectRef;
}

export interface FederationDedupeAuditEntry {
  readonly eventId: CanopyId;
  readonly occurrenceCount: number;
  readonly disposition: "accepted" | "duplicate" | "quarantined";
  readonly contentHashes: readonly ContentHash[];
}

export interface FederationVerificationSummary {
  readonly status: FederationVerificationStatus;
  readonly verifiedAt: IsoDateTime;
  readonly issues: readonly FederationVerificationIssue[];
  readonly dedupe: readonly FederationDedupeAuditEntry[];
  readonly signedEventIds: readonly CanopyId[];
  readonly unsignedRequiredEventIds: readonly CanopyId[];
}

export interface CanopyExportEnvelope {
  readonly id: CanopyId;
  readonly exportedAt: IsoDateTime;
  readonly exportedByRef: ObjectRef;
  readonly scopeRef: ObjectRef;
  readonly format: ExportFormat;
  readonly schemaVersion: number;
  readonly includes: readonly CanopyObjectType[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly federationRuleRef?: ObjectRef;
  readonly dataStewardshipAgreements: readonly ExportedDataStewardshipAgreement[];
  readonly localMappings: readonly CanonicalMapping[];
  readonly contentHash: ContentHash;
  readonly contentHashFields: ContentHashFields;
  readonly redactionSummary?: RedactionSummary;
  readonly verification?: FederationVerificationSummary;
}

export type ImportWarningSeverity = "info" | "warning" | "error";

export type ImportWarningCode =
  | "unknown_object_type"
  | "missing_local_mapping"
  | "schema_version_mismatch"
  | "content_hash_mismatch"
  | "redaction_stub_only"
  | "stewardship_rule_conflict"
  | "authority_refs_missing"
  | "federation_rule_conflict"
  | "unsupported_event_type";

export interface ImportWarning {
  readonly code: ImportWarningCode;
  readonly severity: ImportWarningSeverity;
  readonly message: string;
  readonly path: readonly string[];
  readonly affectedRef?: ObjectRef;
  readonly source?: LocalSourcePointer;
  readonly localMappingId?: CanopyId;
  readonly recommendedAction?: string;
}

export interface CanopyImportReport {
  readonly id: CanopyId;
  readonly importedAt: IsoDateTime;
  readonly importedByRef?: ObjectRef;
  readonly sourceEnvelopeId: CanopyId;
  readonly sourceContentHash: ContentHash;
  readonly acceptedObjectRefs: readonly ObjectRef[];
  readonly acceptedEventIds: readonly CanopyId[];
  readonly localMappings: readonly CanonicalMapping[];
  readonly warnings: readonly ImportWarning[];
  readonly schemaVersion: number;
}
