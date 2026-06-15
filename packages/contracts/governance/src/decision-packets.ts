import type {
  CanopyId,
  ContentHash,
  IsoDateTime,
  ObjectRef,
  VersionedContract,
} from "@canopy/contracts-kernel";
import type {
  DataState,
  DataVisibility,
} from "./claims-evidence.js";
import type {
  DecisionMethodConfig,
  DecisionOutcome,
} from "./governance.js";

export type EcologicalRelevance =
  | "not_material"
  | "advisory"
  | "governance_trigger"
  | "binding";

export type DecisionPacketStatus =
  | "draft"
  | "complete"
  | "exported"
  | "superseded"
  | "redacted";

export interface EcologicalHooks {
  readonly relevance: EcologicalRelevance;
  readonly affectedLivingSystemRefs: readonly ObjectRef[];
  readonly indicatorRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly ecologicalClaimRefs: readonly ObjectRef[];
  readonly impactModelRefs: readonly ObjectRef[];
  readonly notes?: string;
}

export interface DataStewardshipSummary {
  readonly visibility: DataVisibility;
  readonly dataState: DataState;
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
  readonly consentSignalRefs: readonly ObjectRef[];
  readonly allowedUses: readonly string[];
  readonly prohibitedUses: readonly string[];
  readonly retentionRule?: string;
  readonly exportRule?: string;
  readonly federationRuleRefs: readonly ObjectRef[];
}

export interface RedactionSummary {
  readonly hasRedactions: boolean;
  readonly redactedRefs: readonly ObjectRef[];
  readonly sealedRefs: readonly ObjectRef[];
  readonly reason?: string;
  readonly redactedByRef?: ObjectRef;
  readonly redactedAt?: IsoDateTime;
  readonly continuityEventRefs: readonly ObjectRef[];
}

export interface DecisionPacketVersionRef {
  readonly contractName: string;
  readonly schemaVersion: string;
}

export interface DecisionPacket extends VersionedContract {
  readonly id: CanopyId;
  readonly type: "decision-packet";
  readonly orgId?: CanopyId;
  readonly status: DecisionPacketStatus;
  readonly issueRefs: readonly ObjectRef[];
  readonly proposalRefs: readonly ObjectRef[];
  readonly decisionRef: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly decisionMethod: DecisionMethodConfig;
  readonly scopeRefs: readonly ObjectRef[];
  readonly affectedObjectRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly evidenceLinkRefs: readonly ObjectRef[];
  readonly perspectiveRefs: readonly ObjectRef[];
  readonly scenarioRefs: readonly ObjectRef[];
  readonly modelRefs: readonly ObjectRef[];
  readonly guardianReviewRefs: readonly ObjectRef[];
  readonly unresolvedObjectionRefs: readonly ObjectRef[];
  readonly conflictRefs?: readonly ObjectRef[];
  readonly unresolvedObjectionsSummary: string;
  readonly outcome: DecisionOutcome;
  readonly rationale: string;
  readonly conditions: readonly string[];
  readonly obligationRefs: readonly ObjectRef[];
  readonly agreementRefs: readonly ObjectRef[];
  readonly policyRefs: readonly ObjectRef[];
  readonly policyVersionRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
  readonly appealPathRef?: ObjectRef;
  readonly ecologicalHooks?: EcologicalHooks;
  readonly dataStewardship: DataStewardshipSummary;
  readonly redactionSummary: RedactionSummary;
  readonly eventRefs: readonly ObjectRef[];
  readonly schemaVersions: readonly DecisionPacketVersionRef[];
  readonly contentHash?: ContentHash;
  readonly createdAt: IsoDateTime;
  readonly createdByRef: ObjectRef;
  readonly exportedAt?: IsoDateTime;
  readonly supersedesDecisionPacketRef?: ObjectRef;
}
