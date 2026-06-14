import type {
  CanopyCapability,
  CanopyId,
  IsoDateTime,
  ObjectRef,
  RelationshipRef,
} from "./primitives.js";
import type { VersionedContract } from "./versioning.js";

export type IdentityRecordStatus =
  | "draft"
  | "active"
  | "paused"
  | "revoked"
  | "expired"
  | "superseded"
  | "retired"
  | "redacted";

export type OrganizationKind =
  | "formal"
  | "informal"
  | "cooperative"
  | "public-agency"
  | "commons"
  | "network"
  | "working-group";

export type MembershipStatus =
  | "invited"
  | "active"
  | "paused"
  | "suspended"
  | "ended"
  | "revoked";

export type AccountKind =
  | "login"
  | "recovery"
  | "service"
  | "federated"
  | "imported";

export type CredentialStatus =
  | "draft"
  | "issued"
  | "verified"
  | "challenged"
  | "revoked"
  | "expired"
  | "redacted";

export type MandateKind =
  | "decide"
  | "act"
  | "represent"
  | "steward"
  | "review"
  | "coordinate"
  | "emergency";

export type GuardianInterestKind =
  | "living-system"
  | "future-generation"
  | "vulnerable-interest"
  | "non-participating-affected-party";

export interface AuthorityScope {
  readonly orgRef?: ObjectRef;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly targetRefs?: readonly ObjectRef[];
  readonly capability?: CanopyCapability;
  readonly actionKeys?: readonly string[];
  readonly conditions?: readonly string[];
}

export interface TermWindow {
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
  readonly reviewDueAt?: IsoDateTime;
}

export interface RevocationState {
  readonly revokedAt?: IsoDateTime;
  readonly revokedByRef?: ObjectRef;
  readonly revocationReason?: string;
  readonly supersededByRef?: ObjectRef;
}

export interface Person extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly displayName: string;
  readonly preferredName?: string;
  readonly legalName?: string;
  readonly status: IdentityRecordStatus;
  readonly accountRefs: readonly ObjectRef[];
  readonly membershipRefs: readonly ObjectRef[];
  readonly guardianRefs: readonly ObjectRef[];
  readonly credentialRefs: readonly ObjectRef[];
  readonly relationshipRefs?: readonly RelationshipRef[];
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
}

export interface Account extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly personRef: ObjectRef;
  readonly kind: AccountKind;
  readonly handle: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly status: IdentityRecordStatus;
  readonly linkedAt: IsoDateTime;
  readonly verifiedAt?: IsoDateTime;
  readonly lastSeenAt?: IsoDateTime;
  readonly unlinkedAt?: IsoDateTime;
}

export interface Organization extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly name: string;
  readonly kind: OrganizationKind;
  readonly status: IdentityRecordStatus;
  readonly parentOrganizationRef?: ObjectRef;
  readonly scopeRefs: readonly ObjectRef[];
  readonly membershipRefs: readonly ObjectRef[];
  readonly roleRefs: readonly ObjectRef[];
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
}

export interface Membership extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly personRef: ObjectRef;
  readonly organizationRef: ObjectRef;
  readonly status: MembershipStatus;
  readonly scopeRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly term: TermWindow;
  readonly activatedAt?: IsoDateTime;
  readonly endedAt?: IsoDateTime;
}

export interface Role extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly organizationRef?: ObjectRef;
  readonly name: string;
  readonly description?: string;
  readonly responsibilities: readonly string[];
  readonly possiblePermissionKeys: readonly string[];
  readonly status: IdentityRecordStatus;
  readonly createdAt: IsoDateTime;
  readonly retiredAt?: IsoDateTime;
}

export interface RoleAssignment extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly roleRef: ObjectRef;
  readonly assigneeRef: ObjectRef;
  readonly membershipRef?: ObjectRef;
  readonly scope: AuthorityScope;
  readonly status: IdentityRecordStatus;
  readonly authorityRefs: readonly ObjectRef[];
  readonly term: TermWindow;
  readonly assignedAt: IsoDateTime;
  readonly assignedByRef?: ObjectRef;
  readonly revocation?: RevocationState;
}

export interface Mandate extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly holderRef: ObjectRef;
  readonly grantorRef?: ObjectRef;
  readonly kind: MandateKind;
  readonly purpose: string;
  readonly scope: AuthorityScope;
  readonly status: IdentityRecordStatus;
  readonly authorityRefs: readonly ObjectRef[];
  readonly issuedAt: IsoDateTime;
  readonly term: TermWindow;
  readonly revocation?: RevocationState;
}

export interface Delegation extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly delegatorRef: ObjectRef;
  readonly delegateRef: ObjectRef;
  readonly delegatedAuthorityRefs: readonly ObjectRef[];
  readonly scope: AuthorityScope;
  readonly status: IdentityRecordStatus;
  readonly revocable: true;
  readonly authorityRefs: readonly ObjectRef[];
  readonly delegatedAt: IsoDateTime;
  readonly term: TermWindow;
  readonly revocation?: RevocationState;
}

export interface Guardian extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly guardianRef: ObjectRef;
  readonly representedInterestRef: ObjectRef;
  readonly interestKind: GuardianInterestKind;
  readonly authorityLimit: "representational-only";
  readonly scope: AuthorityScope;
  readonly duties: readonly string[];
  readonly constraints: readonly string[];
  readonly status: IdentityRecordStatus;
  readonly authorityRefs: readonly ObjectRef[];
  readonly appointedAt: IsoDateTime;
  readonly appointedByRef?: ObjectRef;
  readonly term: TermWindow;
  readonly revocation?: RevocationState;
}

export interface CredentialClaim {
  readonly key: string;
  readonly value: string | number | boolean;
  readonly evidenceRefs?: readonly ObjectRef[];
}

export interface Credential extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly subjectRef: ObjectRef;
  readonly issuerRef?: ObjectRef;
  readonly kind: string;
  readonly status: CredentialStatus;
  readonly claims: readonly CredentialClaim[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly issuedAt?: IsoDateTime;
  readonly verifiedAt?: IsoDateTime;
  readonly expiresAt?: IsoDateTime;
  readonly revocation?: RevocationState;
}
