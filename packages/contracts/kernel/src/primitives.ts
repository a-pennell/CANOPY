export type CanopyId = string;
export type IsoDateTime = string;
export type ContentHash = string;

export type SourceProject =
  | "canopy"
  | "common-credit"
  | "icos"
  | "sensemaking"
  | "stewardship";

export interface LocalSourcePointer {
  readonly sourceProject: SourceProject;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly sourceVersion?: string;
  readonly importedAt?: IsoDateTime;
}

export type CanopyObjectType =
  | "account"
  | "agreement"
  | "appeal"
  | "budget"
  | "claim"
  | "commitment"
  | "commons"
  | "decision"
  | "decision-packet"
  | "evidence"
  | "flow"
  | "guardian-review"
  | "indicator"
  | "issue"
  | "ledger-account"
  | "ledger-entry"
  | "living-system"
  | "mandate"
  | "model"
  | "need"
  | "offer"
  | "organization"
  | "person"
  | "place"
  | "policy"
  | "proposal"
  | "resource"
  | "role"
  | "source"
  | "task"
  | "threshold"
  | "use-right";

export type CanopyCapability =
  | "allocation-accounting"
  | "claims-evidence"
  | "civic-memory"
  | "data-stewardship"
  | "ecological-modeling"
  | "federation"
  | "governance"
  | "identity-authority"
  | "learning-accountability"
  | "stewardship";

export type LifecycleStatus =
  | "draft"
  | "active"
  | "paused"
  | "superseded"
  | "retired"
  | "redacted";

export interface ObjectRef {
  readonly id: CanopyId;
  readonly type: CanopyObjectType;
  readonly namespace: string;
  readonly lifecycleStatus: LifecycleStatus;
  readonly source?: LocalSourcePointer;
  readonly supersedes?: readonly CanopyId[];
}

export interface RelationshipRef {
  readonly from: ObjectRef;
  readonly to: ObjectRef;
  readonly kind: string;
  readonly assertedBy?: ObjectRef;
  readonly validFrom?: IsoDateTime;
  readonly validUntil?: IsoDateTime;
}
