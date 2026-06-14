import type {
  CanopyCapability,
  CanopyId,
  ContentHash,
  IsoDateTime,
  ObjectRef,
} from "./primitives.js";
import type { ValidationIssue, ValidationResult } from "./versioning.js";

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

type DataState =
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

export const CANOPY_EVENT_NAMESPACES = [
  "identity",
  "authority",
  "object",
  "evidence",
  "claim",
  "governance",
  "stewardship",
  "ecology",
  "coordination",
  "allocation",
  "accounting",
  "flow",
  "model",
  "learning",
  "federation",
  "system",
] as const;

export type CanopyEventNamespace = (typeof CANOPY_EVENT_NAMESPACES)[number];

export const CANOPY_MINIMUM_EVENT_TYPES = [
  "identity.person.created",
  "identity.account.linked",
  "identity.organization.created",
  "identity.membership.activated",
  "authority.role.assigned",
  "authority.role.revoked",
  "authority.mandate.granted",
  "authority.mandate.revoked",
  "authority.delegation.granted",
  "authority.delegation.revoked",
  "authority.guardian.appointed",
  "object.created",
  "object.relationship.created",
  "object.relationship.superseded",
  "evidence.source.ingested",
  "evidence.created",
  "evidence.linked_to_claim",
  "evidence.redacted",
  "claim.created",
  "claim.reviewed",
  "claim.contested",
  "claim.superseded",
  "governance.issue.created",
  "governance.issue.scoped",
  "governance.perspective.submitted",
  "governance.proposal.created",
  "governance.proposal.opened",
  "governance.objection.raised",
  "governance.amendment.submitted",
  "governance.decision.recorded",
  "governance.policy.versioned",
  "governance.appeal.opened",
  "stewardship.resource.created",
  "stewardship.use_right.granted",
  "stewardship.use_right.revoked",
  "stewardship.task.created",
  "stewardship.task.completed",
  "stewardship.contribution.logged",
  "ecology.living_system.created",
  "ecology.indicator.recorded",
  "ecology.threshold.created",
  "ecology.threshold.breached",
  "ecology.guardian.review_requested",
  "ecology.guardian.review_completed",
  "coordination.need.created",
  "coordination.request.created",
  "coordination.capability.created",
  "coordination.offer.created",
  "coordination.match.proposed",
  "coordination.commitment.created",
  "coordination.commitment.fulfilled",
  "allocation.created",
  "allocation.consent.recorded",
  "allocation.obligation.created",
  "accounting.ledger_entry.posted",
  "accounting.ledger_entry.reversed",
  "flow.food.recorded",
  "flow.transport.recorded",
  "flow.waste.recorded",
  "model.created",
  "model.assumption.added",
  "model.scenario.created",
  "model.output.generated",
  "model.audit.completed",
  "learning.outcome.recorded",
  "learning.retrospective.completed",
  "federation.export.created",
  "federation.import.received",
  "federation.reconciliation.completed",
  "system.redaction.applied",
] as const;

export type MinimumCanopyEventType =
  (typeof CANOPY_MINIMUM_EVENT_TYPES)[number];

export type CanopyEventType =
  | MinimumCanopyEventType
  | `${CanopyEventNamespace}.${string}`;

export type CanopySystemActor =
  | "scheduler"
  | "sensor"
  | "ai_assistant"
  | "importer"
  | "federation_peer"
  | "migration"
  | "replay_worker"
  | "outbox_dispatcher";

export type EventRedactionReason =
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

export interface EventRedactionContinuity {
  readonly isRedactedStub: boolean;
  readonly originalEventId?: CanopyId;
  readonly redactionEventId?: CanopyId;
  readonly redactedAt?: IsoDateTime;
  readonly reason?: EventRedactionReason;
  readonly preservedFields: readonly string[];
  readonly removedPayloadKeys: readonly string[];
  readonly originalContentHash?: ContentHash;
  readonly redactedContentHash?: ContentHash;
  readonly dataStewardshipAgreementRef?: ObjectRef;
}

export interface EventSupersessionPointer {
  readonly supersedesEventId?: CanopyId;
  readonly supersededByEventId?: CanopyId;
  readonly supersededAt?: IsoDateTime;
  readonly reason?: string;
  readonly replacementObjectRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
}

export interface CanopyEvent {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopySystemActor;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
  readonly sourceCapability: CanopyCapability;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly schemaVersion: number;
  readonly visibility: DataVisibility;
  readonly dataState?: DataState;
  readonly supersedesEventId?: CanopyId;
  readonly supersession?: EventSupersessionPointer;
  readonly redaction?: EventRedactionContinuity;
  readonly contentHash?: ContentHash;
}

export type AuthorityBasis =
  | "membership"
  | "role_assignment"
  | "mandate"
  | "delegation"
  | "guardian"
  | "policy"
  | "agreement"
  | "use_right"
  | "emergency_authority";

export type AuthorityRequirementReason =
  | "changes_rights"
  | "changes_obligations"
  | "changes_governance_state"
  | "changes_resource_state"
  | "changes_ecological_state"
  | "changes_data_visibility"
  | "changes_accounting_state"
  | "changes_federation_state"
  | "binding_decision"
  | "redaction";

export interface EventAuthorityRequirement {
  readonly eventType: CanopyEventType;
  readonly authorityRequired: boolean;
  readonly minimumAuthorityRefs: number;
  readonly acceptedAuthorityBasis: readonly AuthorityBasis[];
  readonly reasons: readonly AuthorityRequirementReason[];
  readonly allowEmergencyAuthority: boolean;
}

export const EVENT_TYPES_REQUIRING_AUTHORITY = [
  "authority.role.assigned",
  "authority.role.revoked",
  "authority.mandate.granted",
  "authority.mandate.revoked",
  "authority.delegation.granted",
  "authority.delegation.revoked",
  "authority.guardian.appointed",
  "object.relationship.created",
  "object.relationship.superseded",
  "evidence.redacted",
  "governance.decision.recorded",
  "governance.policy.versioned",
  "stewardship.use_right.granted",
  "stewardship.use_right.revoked",
  "ecology.threshold.created",
  "allocation.created",
  "allocation.consent.recorded",
  "allocation.obligation.created",
  "accounting.ledger_entry.posted",
  "accounting.ledger_entry.reversed",
  "federation.export.created",
  "federation.import.received",
  "federation.reconciliation.completed",
  "system.redaction.applied",
] as const satisfies readonly CanopyEventType[];

export interface EventAuthorityValidationInput {
  readonly eventType: CanopyEventType;
  readonly authorityRefs: readonly ObjectRef[];
  readonly requirement?: EventAuthorityRequirement;
  readonly emergency?: boolean;
}

export interface EventAuthorityValidationIssue extends ValidationIssue {
  readonly eventType: CanopyEventType;
  readonly missingBasis?: readonly AuthorityBasis[];
}

export interface EventAuthorityValidationResult extends ValidationResult {
  readonly eventType: CanopyEventType;
  readonly authorityRequired: boolean;
  readonly authorityRefs: readonly ObjectRef[];
  readonly issues: readonly EventAuthorityValidationIssue[];
}
