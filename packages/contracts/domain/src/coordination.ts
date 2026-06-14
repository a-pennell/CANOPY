import type {
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

export type NeedKind =
  | "food"
  | "water"
  | "energy"
  | "housing"
  | "care"
  | "transport"
  | "material"
  | "labor"
  | "funding"
  | "knowledge"
  | "infrastructure"
  | "governance";

export type CapabilityKind =
  | "production"
  | "storage"
  | "distribution"
  | "care"
  | "labor"
  | "funding"
  | "knowledge"
  | "governance"
  | "stewardship"
  | "infrastructure";

export type RequestStatus =
  | "draft"
  | "open"
  | "matched"
  | "allocated"
  | "fulfilled"
  | "withdrawn"
  | "superseded";

export type OfferStatus =
  | "draft"
  | "open"
  | "matched"
  | "allocated"
  | "fulfilled"
  | "withdrawn"
  | "superseded";

export type CommitmentState =
  | "proposed"
  | "active"
  | "fulfilled"
  | "partially_fulfilled"
  | "breached"
  | "released"
  | "superseded";

export type AllocationState =
  | "proposed"
  | "authorized"
  | "active"
  | "completed"
  | "contested"
  | "revoked"
  | "superseded";

export type ObligationState =
  | "proposed"
  | "active"
  | "met"
  | "overdue"
  | "waived"
  | "contested"
  | "superseded";

export type UseRightPermission =
  | "access"
  | "withdraw"
  | "occupy"
  | "modify"
  | "steward"
  | "maintain"
  | "benefit"
  | "restrict"
  | "transfer"
  | "delegate";

export type UseRightState =
  | "proposed"
  | "active"
  | "suspended"
  | "revoked"
  | "expired"
  | "superseded";

export type LedgerAccountKind =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "mutual_credit"
  | "memo";

export type LedgerEntryState = "posted" | "reversed" | "superseded";

export type RoutineCadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "seasonal"
  | "annual"
  | "event_based"
  | "custom";

export type TaskState =
  | "draft"
  | "ready"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled"
  | "superseded";

export type ContributionKind =
  | "labor"
  | "care"
  | "knowledge"
  | "material"
  | "funds"
  | "coordination"
  | "review"
  | "support";

export type OutcomeKind =
  | "delivery"
  | "repair"
  | "maintenance"
  | "learning"
  | "ecological_change"
  | "allocation_result"
  | "governance_result"
  | "accounting_result";

export type AuditKind =
  | "authority"
  | "allocation"
  | "ledger"
  | "use_right"
  | "ecological"
  | "data_stewardship"
  | "federation"
  | "model"
  | "process";

export interface TimeWindow {
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
}

export interface CoordinationQuantity {
  readonly amount: number;
  readonly unit: string;
}

export interface CoordinationEcologicalHooks {
  readonly affectedLivingSystemRefs: readonly ObjectRef[];
  readonly indicatorRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly guardianReviewRequired: boolean;
  readonly ecologicalClaimRefs: readonly ObjectRef[];
  readonly impactModelRefs: readonly ObjectRef[];
}

export interface Need {
  readonly ref: ObjectRef;
  readonly kind: NeedKind;
  readonly title: string;
  readonly description?: string;
  readonly neededByRef?: ObjectRef;
  readonly beneficiaryRefs: readonly ObjectRef[];
  readonly placeRefs: readonly ObjectRef[];
  readonly commonsRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly quantity?: CoordinationQuantity;
  readonly neededDuring?: TimeWindow;
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly requestRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: CoordinationEcologicalHooks;
  readonly schemaVersion: number;
}

export interface Capability {
  readonly ref: ObjectRef;
  readonly kind: CapabilityKind;
  readonly title: string;
  readonly description?: string;
  readonly providedByRef: ObjectRef;
  readonly placeRefs: readonly ObjectRef[];
  readonly commonsRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly availableQuantity?: CoordinationQuantity;
  readonly availableDuring?: TimeWindow;
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly offerRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: CoordinationEcologicalHooks;
  readonly schemaVersion: number;
}

export interface Request {
  readonly ref: ObjectRef;
  readonly needRef: ObjectRef;
  readonly requesterRef: ObjectRef;
  readonly status: RequestStatus;
  readonly requestedQuantity?: CoordinationQuantity;
  readonly requestedDuring?: TimeWindow;
  readonly conditions: readonly string[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly matchedOfferRefs: readonly ObjectRef[];
  readonly allocationRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Offer {
  readonly ref: ObjectRef;
  readonly capabilityRef?: ObjectRef;
  readonly offeredByRef: ObjectRef;
  readonly status: OfferStatus;
  readonly offeredQuantity?: CoordinationQuantity;
  readonly availableDuring?: TimeWindow;
  readonly conditions: readonly string[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly matchedRequestRefs: readonly ObjectRef[];
  readonly allocationRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface CommitmentParty {
  readonly partyRef: ObjectRef;
  readonly role: "provider" | "recipient" | "steward" | "guarantor" | "reviewer";
}

export interface Commitment {
  readonly ref: ObjectRef;
  readonly title: string;
  readonly parties: readonly CommitmentParty[];
  readonly requestRefs: readonly ObjectRef[];
  readonly offerRefs: readonly ObjectRef[];
  readonly allocationRef?: ObjectRef;
  readonly obligationRefs: readonly ObjectRef[];
  readonly dueAt?: IsoDateTime;
  readonly state: CommitmentState;
  readonly authorityRefs: readonly ObjectRef[];
  readonly fulfillmentEvidenceRefs: readonly ObjectRef[];
  readonly outcomeRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Allocation {
  readonly ref: ObjectRef;
  readonly title: string;
  readonly state: AllocationState;
  readonly requestRefs: readonly ObjectRef[];
  readonly offerRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly useRightRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly obligationRefs: readonly ObjectRef[];
  readonly quantity?: CoordinationQuantity;
  readonly authorizedByRefs: readonly ObjectRef[];
  readonly decisionRef?: ObjectRef;
  readonly policyRef?: ObjectRef;
  readonly agreementRef?: ObjectRef;
  readonly ecologicalHooks?: CoordinationEcologicalHooks;
  readonly schemaVersion: number;
}

export interface Obligation {
  readonly ref: ObjectRef;
  readonly owedByRef: ObjectRef;
  readonly owedToRef?: ObjectRef;
  readonly subjectRefs: readonly ObjectRef[];
  readonly state: ObligationState;
  readonly dueAt?: IsoDateTime;
  readonly conditions: readonly string[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly fulfilledByRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface UseRight {
  readonly ref: ObjectRef;
  readonly holderRef: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly permissions: readonly UseRightPermission[];
  readonly state: UseRightState;
  readonly conditions: readonly string[];
  readonly accessRuleRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly reviewPathRef?: ObjectRef;
  readonly startsAt: IsoDateTime;
  readonly endsAt?: IsoDateTime;
  readonly revokedByRef?: ObjectRef;
  readonly supersedesRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface LedgerAccount {
  readonly ref: ObjectRef;
  readonly kind: LedgerAccountKind;
  readonly name: string;
  readonly stewardRef?: ObjectRef;
  readonly holderRef?: ObjectRef;
  readonly currencyOrUnit: string;
  readonly useRightRefs: readonly ObjectRef[];
  readonly budgetRefs: readonly ObjectRef[];
  readonly treasuryRefs: readonly ObjectRef[];
  readonly isIdentityAccount: false;
  readonly schemaVersion: number;
}

export interface LedgerLine {
  readonly accountRef: ObjectRef;
  readonly debit?: CoordinationQuantity;
  readonly credit?: CoordinationQuantity;
  readonly memo?: string;
}

export interface LedgerEntry {
  readonly ref: ObjectRef;
  readonly postedAt: IsoDateTime;
  readonly postedByRef: ObjectRef;
  readonly lines: readonly LedgerLine[];
  readonly state: LedgerEntryState;
  readonly authorityRefs: readonly ObjectRef[];
  readonly commitmentRef?: ObjectRef;
  readonly allocationRef?: ObjectRef;
  readonly obligationRef?: ObjectRef;
  readonly reversesEntryRef?: ObjectRef;
  readonly reversalEntryRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface Budget {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly scopeRef: ObjectRef;
  readonly period: TimeWindow;
  readonly lineRefs: readonly ObjectRef[];
  readonly allocationRefs: readonly ObjectRef[];
  readonly ledgerAccountRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Treasury {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly scopeRef: ObjectRef;
  readonly stewardRefs: readonly ObjectRef[];
  readonly ledgerAccountRefs: readonly ObjectRef[];
  readonly budgetRefs: readonly ObjectRef[];
  readonly allocationRefs: readonly ObjectRef[];
  readonly policyRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Routine {
  readonly ref: ObjectRef;
  readonly title: string;
  readonly cadence: RoutineCadence;
  readonly scopeRef: ObjectRef;
  readonly resourceRefs: readonly ObjectRef[];
  readonly livingSystemRefs: readonly ObjectRef[];
  readonly taskTemplateRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: CoordinationEcologicalHooks;
  readonly schemaVersion: number;
}

export interface Task {
  readonly ref: ObjectRef;
  readonly title: string;
  readonly state: TaskState;
  readonly routineRef?: ObjectRef;
  readonly projectRef?: ObjectRef;
  readonly commitmentRef?: ObjectRef;
  readonly assignedToRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly dueAt?: IsoDateTime;
  readonly authorityRefs: readonly ObjectRef[];
  readonly contributionRefs: readonly ObjectRef[];
  readonly outcomeRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Contribution {
  readonly ref: ObjectRef;
  readonly kind: ContributionKind;
  readonly contributorRef?: ObjectRef;
  readonly subjectRefs: readonly ObjectRef[];
  readonly quantity?: CoordinationQuantity;
  readonly occurredDuring?: TimeWindow;
  readonly evidenceRefs: readonly ObjectRef[];
  readonly outcomeRefs: readonly ObjectRef[];
  readonly mustNotCreatePortableScore: true;
  readonly schemaVersion: number;
}

export interface Outcome {
  readonly ref: ObjectRef;
  readonly kind: OutcomeKind;
  readonly title: string;
  readonly occurredAt: IsoDateTime;
  readonly subjectRefs: readonly ObjectRef[];
  readonly taskRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly allocationRefs: readonly ObjectRef[];
  readonly flowRefs: readonly ObjectRef[];
  readonly indicatorRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly followUpIssueRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: CoordinationEcologicalHooks;
  readonly schemaVersion: number;
}

export interface AuditFinding {
  readonly id: CanopyId;
  readonly severity: "info" | "warning" | "violation" | "critical";
  readonly summary: string;
  readonly targetRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly recommendedAction?: string;
}

export interface Audit {
  readonly ref: ObjectRef;
  readonly kind: AuditKind;
  readonly scopeRef: ObjectRef;
  readonly auditorRefs: readonly ObjectRef[];
  readonly startedAt: IsoDateTime;
  readonly completedAt?: IsoDateTime;
  readonly targetRefs: readonly ObjectRef[];
  readonly findings: readonly AuditFinding[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly outcomeRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Retrospective {
  readonly ref: ObjectRef;
  readonly scopeRef: ObjectRef;
  readonly subjectRefs: readonly ObjectRef[];
  readonly facilitatorRefs: readonly ObjectRef[];
  readonly completedAt: IsoDateTime;
  readonly outcomeRefs: readonly ObjectRef[];
  readonly learningClaimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly actionTaskRefs: readonly ObjectRef[];
  readonly policyReviewRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}
