import type {
  CanopyCapability,
  CanopyEvent,
  CanopyObjectType,
  LocalSourcePointer,
  ObjectRef,
  SourceProject,
} from "@canopy/contracts-kernel";

export type ImportPlanId =
  | "common-credit-fold-in"
  | "icos-fold-in"
  | "sensemaking-fold-in"
  | "stewardship-fold-in";

export interface CapabilityMapping {
  readonly nativeCapability: string;
  readonly canopyCapabilities: readonly CanopyCapability[];
  readonly rationale: string;
}

export interface SourceObjectPlan {
  readonly sourceObject: string;
  readonly description: string;
  readonly identityKey: string;
  readonly requiredFields: readonly string[];
  readonly optionalFields: readonly string[];
  readonly authorityHints: readonly string[];
}

export interface TargetCanonicalObjectPlan {
  readonly objectType: CanopyObjectType;
  readonly purpose: string;
  readonly requiredRelationships: readonly string[];
  readonly eventTypes: readonly string[];
}

export interface ImportOrderStep {
  readonly order: number;
  readonly phase: string;
  readonly sourceObjects: readonly string[];
  readonly targetObjects: readonly CanopyObjectType[];
  readonly emitsEvents: readonly string[];
  readonly dependsOn: readonly string[];
}

export interface StewardshipConcern {
  readonly concern: string;
  readonly requiredTreatment: string;
  readonly blocksImportWhen: string;
}

export interface DryRunCheck {
  readonly check: string;
  readonly expectedResult: string;
  readonly failureAction: string;
}

export interface ProhibitedOutcome {
  readonly outcome: string;
  readonly reason: string;
}

export interface ImportPlanTemplate {
  readonly id: ImportPlanId;
  readonly sourceProject: SourceProject;
  readonly displayName: string;
  readonly sourceProjectSummary: string;
  readonly canopyRole: string;
  readonly capabilityMapping: readonly CapabilityMapping[];
  readonly sourceObjects: readonly SourceObjectPlan[];
  readonly targetCanonicalObjects: readonly TargetCanonicalObjectPlan[];
  readonly eventOrdering: readonly ImportOrderStep[];
  readonly authorityAndDataStewardship: readonly StewardshipConcern[];
  readonly dryRunChecks: readonly DryRunCheck[];
  readonly prohibitedOutcomes: readonly ProhibitedOutcome[];
}

export type ImportDryRunStatus = "pass" | "warn" | "blocked";

export type ImportDryRunWarningSeverity = "info" | "warning" | "blocker";

export type ImportDryRunDisposition = "create" | "alias" | "needs-review";

export type ImportDryRunConfidence = "high" | "medium" | "low";

export type LegacySourceRecord = Readonly<Record<string, unknown>>;

export interface CanonicalMappingCandidate {
  readonly source: LocalSourcePointer;
  readonly canonicalRef: ObjectRef;
  readonly canonicalType: CanopyObjectType;
  readonly disposition: ImportDryRunDisposition;
  readonly confidence: ImportDryRunConfidence;
  readonly rationale: string;
  readonly requiredRelationships: readonly string[];
  readonly authorityHints: readonly string[];
}

export interface ImportDryRunWarning {
  readonly code: string;
  readonly severity: ImportDryRunWarningSeverity;
  readonly message: string;
  readonly source?: LocalSourcePointer;
}

export interface ImportDryRunProhibitedOutcome extends ProhibitedOutcome {
  readonly source?: LocalSourcePointer;
  readonly triggeredBy: string;
}

export interface ImportDryRunResult {
  readonly importPlanId: ImportPlanId;
  readonly sourceProject: SourceProject;
  readonly sourceTreatment: "folded-source";
  readonly canonicalNamespace: "canopy";
  readonly status: ImportDryRunStatus;
  readonly mappingCandidates: readonly CanonicalMappingCandidate[];
  readonly warnings: readonly ImportDryRunWarning[];
  readonly prohibitedOutcomes: readonly ImportDryRunProhibitedOutcome[];
  readonly candidateEvents: readonly CanopyEvent[];
}
