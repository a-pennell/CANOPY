import type {
  CanopyId,
  IsoDateTime,
  ObjectRef,
  VersionedContract,
} from "@canopy/contracts-kernel";
import type {
  Contestability,
  DataState,
  DataVisibility,
  ReviewState,
} from "./claims-evidence.js";

export type GovernanceReviewState = ReviewState;

export type GovernanceRecordStatus =
  | "draft"
  | "open"
  | "active"
  | "under_review"
  | "paused"
  | "closed"
  | "resolved"
  | "rejected"
  | "fulfilled"
  | "breached"
  | "upheld"
  | "remedied"
  | "withdrawn"
  | "in_process"
  | "escalated"
  | "superseded"
  | "retired"
  | "redacted";

export type IssueType =
  | "question"
  | "need"
  | "risk"
  | "conflict"
  | "threshold_breach"
  | "policy_gap"
  | "resource_allocation"
  | "stewardship"
  | "data_governance"
  | "federation"
  | "other";

export type IssuePriority = "low" | "normal" | "high" | "urgent";

export type PerspectiveType =
  | "affected_experience"
  | "local_knowledge"
  | "expertise"
  | "guardian_review"
  | "minority_report"
  | "implementation_note"
  | "risk_assessment"
  | "values_statement";

export type ProposalType =
  | "policy_change"
  | "agreement"
  | "allocation"
  | "use_right"
  | "threshold_change"
  | "mandate"
  | "delegation"
  | "federation_change"
  | "data_stewardship"
  | "operational_action"
  | "other";

export type AmendmentType =
  | "text_change"
  | "scope_change"
  | "condition_added"
  | "condition_removed"
  | "timeline_change"
  | "authority_change"
  | "implementation_change";

export type ObjectionType =
  | "harm"
  | "rights"
  | "authority"
  | "evidence"
  | "process"
  | "ecological"
  | "feasibility"
  | "equity"
  | "data_stewardship";

export type ObjectionDisposition =
  | "unresolved"
  | "answered"
  | "accepted"
  | "withdrawn"
  | "preserved";

export type DecisionOutcome =
  | "passed"
  | "rejected"
  | "deferred"
  | "superseded"
  | "withdrawn";

export type DecisionEffect =
  | "advisory"
  | "binding"
  | "temporary"
  | "emergency"
  | "retrospective";

export type AgreementStatus =
  | "draft"
  | "active"
  | "fulfilled"
  | "breached"
  | "paused"
  | "superseded"
  | "retired";

export type PolicyType =
  | "governance"
  | "stewardship"
  | "allocation"
  | "data_stewardship"
  | "federation"
  | "ecological_threshold"
  | "membership"
  | "authority"
  | "other";

export type PolicyRuleLevel =
  | "constitutional"
  | "policy"
  | "procedure"
  | "guideline"
  | "emergency";

export type PolicyVersionStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "superseded"
  | "retired"
  | "redacted";

export type AppealStatus =
  | "open"
  | "under_review"
  | "upheld"
  | "rejected"
  | "remedied"
  | "withdrawn"
  | "closed";

export type ConflictType =
  | "interpersonal"
  | "organizational"
  | "resource"
  | "stewardship"
  | "governance"
  | "data"
  | "federation"
  | "ecological"
  | "other";

export type ConflictStatus =
  | "open"
  | "in_process"
  | "resolved"
  | "paused"
  | "escalated"
  | "closed";

export type VoteChoice =
  | "yes"
  | "no"
  | "abstain"
  | "block"
  | "ranked_choice"
  | "score"
  | "present";

export type ConsentSignalValue =
  | "consent"
  | "stand_aside"
  | "concern"
  | "block"
  | "withhold"
  | "not_participating";

export type QuorumStatus =
  | "not_started"
  | "collecting"
  | "met"
  | "not_met"
  | "waived"
  | "expired";

export type GuardianReviewStatus =
  | "required"
  | "in_review"
  | "cleared"
  | "cleared_with_conditions"
  | "contested"
  | "blocked"
  | "not_required";

export type DecisionMethodKind =
  | "consensus"
  | "consent"
  | "majority_vote"
  | "supermajority_vote"
  | "delegated_authority"
  | "guardian_review"
  | "emergency_authority"
  | "sortition"
  | "custom";

export interface GovernanceScope {
  readonly orgId?: CanopyId;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly affectedRefs: readonly ObjectRef[];
}

export interface DeliberationWindow {
  readonly opensAt?: IsoDateTime;
  readonly closesAt?: IsoDateTime;
  readonly reviewAt?: IsoDateTime;
}

export interface DecisionMethodConfig {
  readonly kind: DecisionMethodKind;
  readonly name?: string;
  readonly threshold?: number;
  readonly quorumRequired?: number;
  readonly eligibleVoterRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly guardianReviewRequired: boolean;
  readonly appealPathRef?: ObjectRef;
  readonly notes?: string;
}

export interface GovernanceRecord extends VersionedContract {
  readonly id: CanopyId;
  readonly orgId?: CanopyId;
  readonly status: GovernanceRecordStatus;
  readonly createdAt: IsoDateTime;
  readonly updatedAt?: IsoDateTime;
  readonly createdByRef: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly dataState: DataState;
  readonly visibility: DataVisibility;
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
}

export interface Issue extends GovernanceRecord {
  readonly type: "issue";
  readonly issueType: IssueType;
  readonly title: string;
  readonly description?: string;
  readonly priority: IssuePriority;
  readonly scope: GovernanceScope;
  readonly scopeRationale?: string;
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly perspectiveRefs: readonly ObjectRef[];
  readonly proposalRefs: readonly ObjectRef[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly reopenedFromIssueRef?: ObjectRef;
  readonly dueAt?: IsoDateTime;
  readonly closedAt?: IsoDateTime;
}

export interface Perspective extends GovernanceRecord {
  readonly type: "perspective";
  readonly issueRef?: ObjectRef;
  readonly proposalRef?: ObjectRef;
  readonly authorRef: ObjectRef;
  readonly perspectiveType: PerspectiveType;
  readonly title?: string;
  readonly text: string;
  readonly affectedGroupRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly contestability: Contestability;
}

export interface Proposal extends GovernanceRecord {
  readonly type: "proposal";
  readonly issueRef: ObjectRef;
  readonly proposalType: ProposalType;
  readonly title: string;
  readonly summary: string;
  readonly body?: string;
  readonly proposedByRefs: readonly ObjectRef[];
  readonly affectedRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly perspectiveRefs: readonly ObjectRef[];
  readonly scenarioRefs: readonly ObjectRef[];
  readonly amendmentRefs: readonly ObjectRef[];
  readonly objectionRefs: readonly ObjectRef[];
  readonly decisionMethod: DecisionMethodConfig;
  readonly deliberationWindow: DeliberationWindow;
  readonly conditions: readonly string[];
  readonly expectedDecisionAt?: IsoDateTime;
}

export interface Amendment extends GovernanceRecord {
  readonly type: "amendment";
  readonly parentProposalRef: ObjectRef;
  readonly amendmentType: AmendmentType;
  readonly title?: string;
  readonly summary: string;
  readonly rationale?: string;
  readonly proposedByRef: ObjectRef;
  readonly replacesText?: string;
  readonly proposedText?: string;
  readonly affectedRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
}

export interface Objection extends GovernanceRecord {
  readonly type: "objection";
  readonly proposalRef: ObjectRef;
  readonly authorRef: ObjectRef;
  readonly objectionType: ObjectionType;
  readonly text: string;
  readonly severity?: "low" | "medium" | "high" | "blocking";
  readonly disposition: ObjectionDisposition;
  readonly response?: string;
  readonly responseByRef?: ObjectRef;
  readonly resolvedAt?: IsoDateTime;
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly preservationRationale?: string;
}

export interface Decision extends GovernanceRecord {
  readonly type: "decision";
  readonly issueRefs: readonly ObjectRef[];
  readonly proposalRefs: readonly ObjectRef[];
  readonly outcome: DecisionOutcome;
  readonly effect: DecisionEffect;
  readonly method: DecisionMethodConfig;
  readonly decidedAt: IsoDateTime;
  readonly decidedByRefs: readonly ObjectRef[];
  readonly affectedRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly perspectiveRefs: readonly ObjectRef[];
  readonly unresolvedObjectionRefs: readonly ObjectRef[];
  readonly rationale: string;
  readonly conditions: readonly string[];
  readonly obligationRefs: readonly ObjectRef[];
  readonly agreementRefs: readonly ObjectRef[];
  readonly policyRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
  readonly appealPathRef?: ObjectRef;
  readonly supersedesDecisionRefs: readonly ObjectRef[];
}

export interface Agreement extends GovernanceRecord {
  readonly type: "agreement";
  readonly title: string;
  readonly summary?: string;
  readonly status: AgreementStatus;
  readonly partyRefs: readonly ObjectRef[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly policyRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly obligationRefs: readonly ObjectRef[];
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
  readonly reviewAt?: IsoDateTime;
  readonly terms: readonly string[];
  readonly supersedesAgreementRefs: readonly ObjectRef[];
}

export interface Policy extends GovernanceRecord {
  readonly type: "policy";
  readonly policyType: PolicyType;
  readonly ruleLevel: PolicyRuleLevel;
  readonly title: string;
  readonly summary?: string;
  readonly scope: GovernanceScope;
  readonly currentVersionRef?: ObjectRef;
  readonly versionRefs: readonly ObjectRef[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
}

export interface PolicyVersion extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "policy-version";
  readonly orgId?: CanopyId;
  readonly policyRef: ObjectRef;
  readonly version: string;
  readonly status: PolicyVersionStatus;
  readonly title: string;
  readonly body: string;
  readonly summaryOfChanges: string;
  readonly decisionRef: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly effectiveAt?: IsoDateTime;
  readonly expiresAt?: IsoDateTime;
  readonly createdAt: IsoDateTime;
  readonly createdByRef: ObjectRef;
  readonly supersedesPolicyVersionRef?: ObjectRef;
  readonly dataState: DataState;
  readonly visibility: DataVisibility;
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
}

export interface Appeal extends GovernanceRecord {
  readonly type: "appeal";
  readonly targetRef: ObjectRef;
  readonly openedByRef: ObjectRef;
  readonly grounds: readonly string[];
  readonly requestedRemedy?: string;
  readonly status: AppealStatus;
  readonly reviewerRefs: readonly ObjectRef[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly outcome?: string;
  readonly closedAt?: IsoDateTime;
}

export interface Conflict extends GovernanceRecord {
  readonly type: "conflict";
  readonly conflictType: ConflictType;
  readonly title: string;
  readonly description?: string;
  readonly status: ConflictStatus;
  readonly affectedRefs: readonly ObjectRef[];
  readonly participantRefs: readonly ObjectRef[];
  readonly facilitatorRefs: readonly ObjectRef[];
  readonly relatedIssueRefs: readonly ObjectRef[];
  readonly relatedDecisionRefs: readonly ObjectRef[];
  readonly resolutionRef?: ObjectRef;
  readonly remedyRefs: readonly ObjectRef[];
  readonly closedAt?: IsoDateTime;
}

export interface Vote extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "vote";
  readonly orgId?: CanopyId;
  readonly proposalRef: ObjectRef;
  readonly decisionMethod: DecisionMethodKind;
  readonly voterRef: ObjectRef;
  readonly choice: VoteChoice;
  readonly rankedChoices?: readonly ObjectRef[];
  readonly score?: number;
  readonly weight?: number;
  readonly rationale?: string;
  readonly castAt: IsoDateTime;
  readonly visibility: DataVisibility;
  readonly dataState: DataState;
}

export interface ConsentSignal extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "consent-signal";
  readonly orgId?: CanopyId;
  readonly proposalRef: ObjectRef;
  readonly participantRef: ObjectRef;
  readonly signal: ConsentSignalValue;
  readonly concernText?: string;
  readonly conditionText?: string;
  readonly objectionRef?: ObjectRef;
  readonly recordedAt: IsoDateTime;
  readonly visibility: DataVisibility;
  readonly dataState: DataState;
}

export interface QuorumState extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "quorum-state";
  readonly orgId?: CanopyId;
  readonly proposalRef: ObjectRef;
  readonly status: QuorumStatus;
  readonly eligibleCount: number;
  readonly requiredCount: number;
  readonly participatingCount: number;
  readonly consentCount?: number;
  readonly voteCount?: number;
  readonly measuredAt: IsoDateTime;
  readonly expiresAt?: IsoDateTime;
  readonly notes?: string;
}

export interface GuardianReview extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "guardian-review";
  readonly orgId?: CanopyId;
  readonly targetRef: ObjectRef;
  readonly guardianRefs: readonly ObjectRef[];
  readonly status: GuardianReviewStatus;
  readonly requiredByRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly conditionRefs: readonly ObjectRef[];
  readonly summary?: string;
  readonly createdAt: IsoDateTime;
  readonly reviewedAt?: IsoDateTime;
  readonly reviewAt?: IsoDateTime;
  readonly visibility: DataVisibility;
  readonly dataState: DataState;
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
}

export interface GovernanceHooks {
  readonly issueRefs: readonly ObjectRef[];
  readonly proposalRefs: readonly ObjectRef[];
  readonly decisionRefs: readonly ObjectRef[];
  readonly agreementRefs: readonly ObjectRef[];
  readonly policyRefs: readonly ObjectRef[];
  readonly appealRefs: readonly ObjectRef[];
  readonly conflictRefs: readonly ObjectRef[];
}
