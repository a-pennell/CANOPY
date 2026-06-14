import type {
  CanopyId,
  IsoDateTime,
  ObjectRef,
  RelationshipRef
} from "@canopy/contracts-kernel";

export type PlaceKind =
  | "site"
  | "parcel"
  | "facility"
  | "neighborhood"
  | "municipality"
  | "watershed"
  | "foodshed"
  | "airshed"
  | "bioregion"
  | "custom";

export type CommonsKind =
  | "land"
  | "water"
  | "food"
  | "energy"
  | "housing"
  | "infrastructure"
  | "data"
  | "cultural"
  | "care"
  | "multi-resource";

export type LivingSystemKind =
  | "watershed"
  | "forest"
  | "aquifer"
  | "habitat"
  | "species"
  | "soil-system"
  | "airshed"
  | "wetland"
  | "coastal-system"
  | "bioregion"
  | "other";

export type ResourceKind =
  | "material"
  | "energy"
  | "spatial"
  | "infrastructure"
  | "informational"
  | "cultural"
  | "productive-capacity"
  | "food"
  | "water"
  | "waste"
  | "transport";

export type FlowKind =
  | "food"
  | "water"
  | "energy"
  | "material"
  | "transport"
  | "waste"
  | "money"
  | "credit"
  | "labor"
  | "information"
  | "care";

export type ThresholdClass = "advisory" | "governance_trigger" | "binding";

export type ThresholdDirection =
  | "above"
  | "at_or_above"
  | "below"
  | "at_or_below"
  | "outside_range"
  | "inside_range";

export type ThresholdBreachState =
  | "unknown"
  | "within_threshold"
  | "approaching"
  | "breached"
  | "resolved";

export type GuardianReviewState =
  | "not_required"
  | "required"
  | "requested"
  | "in_review"
  | "completed"
  | "contested"
  | "superseded";

export type GuardianReviewOutcome =
  | "no_objection"
  | "conditions_required"
  | "objection_preserved"
  | "escalation_required"
  | "insufficient_information";

export type ModelValidationStatus =
  | "draft"
  | "pending_review"
  | "validated_for_purpose"
  | "contested"
  | "deprecated"
  | "superseded";

export type AssumptionKind =
  | "fact"
  | "causal"
  | "value"
  | "method"
  | "parameter"
  | "risk"
  | "impact"
  | "limitation";

export type ScenarioStatus =
  | "draft"
  | "ready_for_deliberation"
  | "contested"
  | "selected"
  | "superseded"
  | "retired";

export interface EcologicalQuantity {
  readonly amount: number;
  readonly unit: string;
}

export interface MeasuredRange {
  readonly min?: number;
  readonly max?: number;
  readonly unit: string;
}

export interface TimeInterval {
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
}

export interface BoundaryRef {
  readonly kind:
    | "geospatial"
    | "legal"
    | "customary"
    | "ecological"
    | "administrative"
    | "described";
  readonly sourceRef?: ObjectRef;
  readonly description?: string;
  readonly contentHash?: string;
}

export interface EcologicalConstraint {
  readonly id: CanopyId;
  readonly thresholdRef?: ObjectRef;
  readonly policyRef?: ObjectRef;
  readonly description: string;
  readonly severity: "notice" | "condition" | "blocker";
  readonly reviewPathRef?: ObjectRef;
}

export interface EcologicalHooks {
  readonly affectedLivingSystemRefs: readonly ObjectRef[];
  readonly indicatorRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly guardianReviewRequired: boolean;
  readonly ecologicalClaimRefs: readonly ObjectRef[];
  readonly impactModelRefs: readonly ObjectRef[];
  readonly constraints?: readonly EcologicalConstraint[];
  readonly limitations?: readonly string[];
}

export interface Place {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly kind: PlaceKind;
  readonly boundary?: BoundaryRef;
  readonly parentPlaceRefs: readonly ObjectRef[];
  readonly containedPlaceRefs: readonly ObjectRef[];
  readonly commonsRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly livingSystemRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly localTermRefs: readonly ObjectRef[];
  readonly relationshipRefs?: readonly RelationshipRef[];
  readonly schemaVersion: number;
}

export interface Commons {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly kind: CommonsKind;
  readonly placeRefs: readonly ObjectRef[];
  readonly boundary?: BoundaryRef;
  readonly participantRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly governanceRuleRefs: readonly ObjectRef[];
  readonly resourceRefs: readonly ObjectRef[];
  readonly livingSystemRefs: readonly ObjectRef[];
  readonly accessRuleRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: EcologicalHooks;
  readonly schemaVersion: number;
}

export interface LivingSystem {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly kind: LivingSystemKind;
  readonly placeRefs: readonly ObjectRef[];
  readonly boundary?: BoundaryRef;
  readonly guardianRefs: readonly ObjectRef[];
  readonly indicatorRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly ecologicalNeedRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly sensitiveLocation: boolean;
  readonly schemaVersion: number;
}

export interface Resource {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly kind: ResourceKind;
  readonly placeRefs: readonly ObjectRef[];
  readonly commonsRefs: readonly ObjectRef[];
  readonly livingSystemRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly useRightRefs: readonly ObjectRef[];
  readonly stockRefs: readonly ObjectRef[];
  readonly flowRefs: readonly ObjectRef[];
  readonly unit?: string;
  readonly ecologicalHooks?: EcologicalHooks;
  readonly schemaVersion: number;
}

export interface Stock {
  readonly ref: ObjectRef;
  readonly resourceRef: ObjectRef;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly quantity: EcologicalQuantity;
  readonly measuredAt: IsoDateTime;
  readonly measurementMethod?: string;
  readonly indicatorRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface FlowEndpoint {
  readonly ref?: ObjectRef;
  readonly label?: string;
  readonly role: "source" | "destination" | "intermediate" | "sink";
}

export interface Flow {
  readonly ref: ObjectRef;
  readonly kind: FlowKind;
  readonly resourceRef?: ObjectRef;
  readonly from: FlowEndpoint;
  readonly to: FlowEndpoint;
  readonly quantity?: EcologicalQuantity;
  readonly period: TimeInterval;
  readonly recordedAt: IsoDateTime;
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly commitmentRefs: readonly ObjectRef[];
  readonly outcomeRefs: readonly ObjectRef[];
  readonly ecologicalHooks?: EcologicalHooks;
  readonly limitations?: readonly string[];
  readonly schemaVersion: number;
}

export interface Indicator {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly livingSystemRef?: ObjectRef;
  readonly resourceRef?: ObjectRef;
  readonly metric: string;
  readonly unit: string;
  readonly currentValue?: number;
  readonly observedAt?: IsoDateTime;
  readonly sourceRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly thresholdRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface Threshold {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly class: ThresholdClass;
  readonly indicatorRef: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly direction: ThresholdDirection;
  readonly value?: EcologicalQuantity;
  readonly range?: MeasuredRange;
  readonly breachState: ThresholdBreachState;
  readonly adoptedByRef?: ObjectRef;
  readonly authorityRefs: readonly ObjectRef[];
  readonly triggerIssueRefs: readonly ObjectRef[];
  readonly reviewPathRef?: ObjectRef;
  readonly validDuring?: TimeInterval;
  readonly schemaVersion: number;
}

export interface GuardianReview {
  readonly ref: ObjectRef;
  readonly subjectRefs: readonly ObjectRef[];
  readonly livingSystemRefs: readonly ObjectRef[];
  readonly guardianRefs: readonly ObjectRef[];
  readonly requestedByRef?: ObjectRef;
  readonly requestedAt: IsoDateTime;
  readonly completedAt?: IsoDateTime;
  readonly state: GuardianReviewState;
  readonly outcome?: GuardianReviewOutcome;
  readonly authorityRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly conditions: readonly string[];
  readonly unresolvedObjectionRefs: readonly ObjectRef[];
  readonly reviewPathRef?: ObjectRef;
  readonly supersedesRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface Model {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly purpose: string;
  readonly stewardRefs: readonly ObjectRef[];
  readonly datasetRefs: readonly ObjectRef[];
  readonly assumptionRefs: readonly ObjectRef[];
  readonly knownFailureModes: readonly string[];
  readonly validationStatus: ModelValidationStatus;
  readonly validationRefs: readonly ObjectRef[];
  readonly reviewAt?: IsoDateTime;
  readonly ecologicalHooks?: EcologicalHooks;
  readonly schemaVersion: number;
}

export interface Assumption {
  readonly ref: ObjectRef;
  readonly kind: AssumptionKind;
  readonly statement: string;
  readonly modelRefs: readonly ObjectRef[];
  readonly scenarioRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly claimRefs: readonly ObjectRef[];
  readonly contestedByRefs: readonly ObjectRef[];
  readonly reviewState:
    | "pending"
    | "accepted"
    | "rejected"
    | "contested"
    | "superseded"
    | "preserved";
  readonly schemaVersion: number;
}

export interface ScenarioInput {
  readonly name: string;
  readonly value: string | number | boolean | EcologicalQuantity | MeasuredRange;
  readonly sourceRef?: ObjectRef;
}

export interface Scenario {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly status: ScenarioStatus;
  readonly modelRef?: ObjectRef;
  readonly method?: string;
  readonly assumptionRefs: readonly ObjectRef[];
  readonly inputs: readonly ScenarioInput[];
  readonly affectedRefs: readonly ObjectRef[];
  readonly limitations: readonly string[];
  readonly uncertainty?: string;
  readonly ecologicalHooks?: EcologicalHooks;
  readonly outputRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
}

export interface ModelOutput {
  readonly ref: ObjectRef;
  readonly modelRef: ObjectRef;
  readonly scenarioRef?: ObjectRef;
  readonly generatedAt: IsoDateTime;
  readonly generatedByRef?: ObjectRef;
  readonly summary: string;
  readonly resultRefs: readonly ObjectRef[];
  readonly evidenceRef?: ObjectRef;
  readonly claimRefs: readonly ObjectRef[];
  readonly limitations: readonly string[];
  readonly uncertainty?: string;
  readonly decisionAuthority: false;
  readonly schemaVersion: number;
}
