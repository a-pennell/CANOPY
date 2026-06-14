import type {
  CanopyId,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  ObjectRef,
} from "./primitives.js";

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

export type DataUse =
  | "view"
  | "store"
  | "search"
  | "analyze"
  | "aggregate"
  | "verify"
  | "challenge"
  | "coordinate"
  | "allocate"
  | "govern"
  | "model"
  | "train_model"
  | "publish"
  | "export"
  | "federate"
  | "commercialize"
  | "rank_people"
  | "eligibility_scoring";

export type ConsentStatus =
  | "not_required"
  | "required"
  | "granted"
  | "denied"
  | "revoked"
  | "expired";

export type ConsentScope =
  | "single_record"
  | "object"
  | "scope"
  | "purpose"
  | "time_bounded"
  | "crisis_bounded";

export interface ConsentRule {
  readonly id: CanopyId;
  readonly status: ConsentStatus;
  readonly scope: ConsentScope;
  readonly subjectRef?: ObjectRef;
  readonly consentingRefs: readonly ObjectRef[];
  readonly purpose?: string;
  readonly allowedUses: readonly DataUse[];
  readonly expiresAt?: IsoDateTime;
  readonly revocable: boolean;
  readonly revocationProcessRef?: ObjectRef;
  readonly evidenceRefs: readonly ObjectRef[];
}

export interface ConsentRecord {
  readonly id: CanopyId;
  readonly ruleRef: ObjectRef;
  readonly consentingRef: ObjectRef;
  readonly status: ConsentStatus;
  readonly recordedAt: IsoDateTime;
  readonly recordedByRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly supersedesConsentRecordId?: CanopyId;
  readonly note?: string;
}

export type DisclosureAudience =
  | "public"
  | "federation_peer"
  | "organization_members"
  | "commons_participants"
  | "role_holders"
  | "guardians"
  | "named_recipients"
  | "auditors"
  | "emergency_responders";

export interface DisclosureRule {
  readonly id: CanopyId;
  readonly audience: DisclosureAudience;
  readonly visibility: DataVisibility;
  readonly purpose?: string;
  readonly allowedUses: readonly DataUse[];
  readonly prohibitedUses: readonly DataUse[];
  readonly recipientRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly consentRequired: boolean;
  readonly startsAt?: IsoDateTime;
  readonly expiresAt?: IsoDateTime;
  readonly reviewAt?: IsoDateTime;
}

export type RetentionDisposition =
  | "preserve"
  | "archive"
  | "review"
  | "redact"
  | "delete";

export interface RetentionRule {
  readonly id: CanopyId;
  readonly disposition: RetentionDisposition;
  readonly basis: string;
  readonly retainUntil?: IsoDateTime;
  readonly minimumRetainUntil?: IsoDateTime;
  readonly reviewAt?: IsoDateTime;
  readonly authorityRefs: readonly ObjectRef[];
  readonly exceptionRefs: readonly ObjectRef[];
}

export type DataStewardshipExportFormat = "json" | "jsonl" | "csv_bundle";

export interface ExportRule {
  readonly id: CanopyId;
  readonly exportAllowed: boolean;
  readonly allowedFormats: readonly DataStewardshipExportFormat[];
  readonly allowedObjectTypes: readonly CanopyObjectType[];
  readonly allowedRecipientRefs: readonly ObjectRef[];
  readonly prohibitedRecipientRefs: readonly ObjectRef[];
  readonly includeRedactionStubs: boolean;
  readonly consentRequired: boolean;
  readonly authorityRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
}

export type StewardshipFederationSyncMode =
  | "manual"
  | "scheduled"
  | "near_real_time";

export type StewardshipFederationConflictPolicy =
  | "preserve_both"
  | "local_wins"
  | "remote_wins"
  | "governance_required";

export interface DataStewardshipFederationRule {
  readonly id: CanopyId;
  readonly federationAllowed: boolean;
  readonly peerRefs: readonly ObjectRef[];
  readonly allowedObjectTypes: readonly CanopyObjectType[];
  readonly allowedEventTypes: readonly string[];
  readonly syncMode: StewardshipFederationSyncMode;
  readonly conflictPolicy: StewardshipFederationConflictPolicy;
  readonly requiresLocalMapping: boolean;
  readonly redactionRequired: boolean;
  readonly authorityRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
}

export type RedactionReason =
  | "consent_revoked"
  | "privacy"
  | "safety"
  | "source_confidentiality"
  | "living_system_protection"
  | "vulnerable_group_protection"
  | "legal_requirement"
  | "retention_expired"
  | "governance_decision"
  | "data_minimization";

export type RedactionMethod =
  | "field_removed"
  | "field_generalized"
  | "payload_removed"
  | "sealed"
  | "stub_only"
  | "hash_only";

export interface RedactionMetadata {
  readonly id: CanopyId;
  readonly targetRef: ObjectRef;
  readonly redactedAt: IsoDateTime;
  readonly redactedByRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly reason: RedactionReason;
  readonly method: RedactionMethod;
  readonly redactedFields: readonly string[];
  readonly preservedFields: readonly string[];
  readonly originalContentHash?: ContentHash;
  readonly redactedContentHash?: ContentHash;
  readonly redactionEventId?: CanopyId;
  readonly replacementEventId?: CanopyId;
  readonly dataStewardshipAgreementRef?: ObjectRef;
  readonly note?: string;
}

export interface RedactionPolicy {
  readonly defaultMethod: RedactionMethod;
  readonly preserveEnvelopeContinuity: boolean;
  readonly preserveContentHash: boolean;
  readonly allowedReasons: readonly RedactionReason[];
  readonly authorityRefs: readonly ObjectRef[];
}

export interface DataStewardshipAgreement {
  readonly id: CanopyId;
  readonly governedRef: ObjectRef;
  readonly stewardRefs: readonly ObjectRef[];
  readonly visibility: DataVisibility;
  readonly dataState?: DataState;
  readonly allowedUses: readonly DataUse[];
  readonly prohibitedUses: readonly DataUse[];
  readonly consentRequired: boolean;
  readonly consentRules: readonly ConsentRule[];
  readonly disclosureRules: readonly DisclosureRule[];
  readonly retentionRule?: RetentionRule;
  readonly exportRule?: ExportRule;
  readonly federationRule?: DataStewardshipFederationRule;
  readonly redactionPolicy?: RedactionPolicy;
  readonly reviewAt?: IsoDateTime;
  readonly schemaVersion: number;
}
