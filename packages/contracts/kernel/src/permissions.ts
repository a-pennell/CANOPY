import type {
  CanopyCapability,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef,
} from "./primitives.js";
import type { VersionedContract } from "./versioning.js";

export type PermissionEffect = "allow" | "deny" | "require-review";

export type AccessRuleStatus =
  | "draft"
  | "active"
  | "paused"
  | "superseded"
  | "revoked"
  | "retired";

export type PermissionDecision = "allowed" | "denied";

export type PermissionDenialReasonCode =
  | "missing_authority"
  | "inactive_membership"
  | "role_not_assigned"
  | "mandate_required"
  | "mandate_expired"
  | "delegation_missing"
  | "delegation_revoked"
  | "guardian_restricted"
  | "policy_restricted"
  | "agreement_restricted"
  | "use_right_required"
  | "scope_mismatch"
  | "target_restricted"
  | "purpose_required"
  | "emergency_not_allowed"
  | "review_required"
  | "data_stewardship_restricted"
  | "federation_restricted"
  | "protected_information"
  | "unknown";

export type AuthorityTraceStepKind =
  | "membership"
  | "role-assignment"
  | "mandate"
  | "delegation"
  | "guardian"
  | "policy"
  | "agreement"
  | "use-right"
  | "emergency-authority"
  | "access-rule";

export type AuthorityTraceStepResult =
  | "matched"
  | "missing"
  | "expired"
  | "revoked"
  | "out-of-scope"
  | "requires-review"
  | "redacted";

export interface PermissionAtom extends VersionedContract {
  readonly key: string;
  readonly capability: CanopyCapability;
  readonly action: string;
  readonly targetType?: CanopyObjectType;
  readonly consequential: boolean;
  readonly binding: boolean;
  readonly description?: string;
}

export interface AccessCondition {
  readonly key: string;
  readonly operator:
    | "equals"
    | "not-equals"
    | "includes"
    | "before"
    | "after"
    | "exists"
    | "requires-ref";
  readonly value?: string | number | boolean;
  readonly ref?: ObjectRef;
}

export interface AccessRuleSubject {
  readonly personRefs?: readonly ObjectRef[];
  readonly membershipRefs?: readonly ObjectRef[];
  readonly roleRefs?: readonly ObjectRef[];
  readonly organizationRefs?: readonly ObjectRef[];
  readonly guardianRefs?: readonly ObjectRef[];
}

export interface AccessRuleScope {
  readonly orgRef?: ObjectRef;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly targetRefs?: readonly ObjectRef[];
  readonly targetTypes?: readonly CanopyObjectType[];
  readonly purposeKeys?: readonly string[];
  readonly emergencyOnly?: boolean;
}

export interface AppealPathRef {
  readonly ref: ObjectRef;
  readonly label?: string;
  readonly instructions?: string;
}

export interface PermissionDenialReason {
  readonly code: PermissionDenialReasonCode;
  readonly message?: string;
  readonly safeToExplain: boolean;
  readonly sourceRefs: readonly ObjectRef[];
  readonly appealPathRef?: AppealPathRef;
}

export interface AccessRule extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly permission: PermissionAtom;
  readonly effect: PermissionEffect;
  readonly status: AccessRuleStatus;
  readonly subject: AccessRuleSubject;
  readonly scope: AccessRuleScope;
  readonly conditions: readonly AccessCondition[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly appealPathRef?: AppealPathRef;
  readonly priority?: number;
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
  readonly reviewDueAt?: IsoDateTime;
}

export interface PermissionCheckContext {
  readonly purpose?: string;
  readonly emergency?: boolean;
  readonly actingMandateRef?: ObjectRef;
  readonly actingDelegationRef?: ObjectRef;
  readonly actingGuardianRef?: ObjectRef;
  readonly sourceCapability?: CanopyCapability;
  readonly requestedAt?: IsoDateTime;
  readonly relatedRefs?: readonly ObjectRef[];
}

export interface PermissionCheckRequest extends VersionedContract {
  readonly actorRef: ObjectRef;
  readonly permission: PermissionAtom;
  readonly targetRef: ObjectRef;
  readonly context?: PermissionCheckContext;
}

export interface AuthorityTraceStep {
  readonly kind: AuthorityTraceStepKind;
  readonly ref?: ObjectRef;
  readonly result: AuthorityTraceStepResult;
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly message?: string;
}

export interface AuthorityTrace {
  readonly actorRef: ObjectRef;
  readonly targetRef: ObjectRef;
  readonly permissionKey: string;
  readonly decision: PermissionDecision;
  readonly evaluatedAt: IsoDateTime;
  readonly steps: readonly AuthorityTraceStep[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly redacted: boolean;
}

export interface PermissionCheckResult extends VersionedContract {
  readonly allowed: boolean;
  readonly sourceRefs: readonly ObjectRef[];
  readonly reason?: string;
  readonly denialReasons?: readonly PermissionDenialReason[];
  readonly requiredAppealPathRef?: ObjectRef;
  readonly appealPathRefs?: readonly AppealPathRef[];
  readonly authorityTrace?: AuthorityTrace;
}
