import type {
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef,
  SourceProject
} from "@canopy/contracts-kernel";

export type AliasDisposition =
  | "canonical"
  | "accepted_alias"
  | "deprecated_alias"
  | "ambiguous"
  | "unmapped"
  | "blocked";

export type CanonicalMappingStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "needs_review"
  | "superseded";

export type LocalLabelRenderMode =
  | "local_only"
  | "canonical_only"
  | "local_with_canonical"
  | "canonical_with_local";

export type CanonicalArtifactType =
  | "access-rule"
  | "affected-group"
  | "assumption"
  | "canonical-mapping"
  | "consent-signal"
  | "counterclaim"
  | "credential"
  | "data-stewardship-agreement"
  | "delegation"
  | "export-envelope"
  | "federation-rule"
  | "guardian"
  | "local-term"
  | "membership"
  | "model-output"
  | "obligation"
  | "perspective"
  | "policy-version"
  | "quorum-state"
  | "retrospective"
  | "role-assignment"
  | "scenario"
  | "stock"
  | "vote";

export type CanonicalAdditionalObjectType =
  | "allocation"
  | "audit"
  | "capability"
  | "contribution"
  | "delegation"
  | "ledger-account"
  | "ledger-entry"
  | "local-term"
  | "obligation"
  | "request"
  | "retrospective"
  | "routine"
  | "scenario"
  | "stock"
  | "taxonomy"
  | "treasury";

export type CanonicalMappingTargetType =
  | CanopyObjectType
  | CanonicalAdditionalObjectType
  | CanonicalArtifactType;

export interface LocalLabelRendering {
  readonly mode: LocalLabelRenderMode;
  readonly separator?: string;
  readonly includeCanonicalType: boolean;
  readonly includeSourceProject: boolean;
  readonly fallbackLocale: string;
}

export interface Taxonomy {
  readonly ref: ObjectRef;
  readonly name: string;
  readonly scopeRef: ObjectRef;
  readonly stewardRefs: readonly ObjectRef[];
  readonly defaultLocale: string;
  readonly localTermRefs: readonly ObjectRef[];
  readonly canonicalMappingRefs: readonly ObjectRef[];
  readonly labelRendering: LocalLabelRendering;
  readonly effectiveAt?: IsoDateTime;
  readonly supersedesRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface LocalTerm {
  readonly ref: ObjectRef;
  readonly taxonomyRef: ObjectRef;
  readonly term: string;
  readonly plural?: string;
  readonly locale: string;
  readonly description?: string;
  readonly sourceProject?: SourceProject;
  readonly sourceEntity?: string;
  readonly scopeRef?: ObjectRef;
  readonly disposition: AliasDisposition;
  readonly canonicalMappingRefs: readonly ObjectRef[];
  readonly stewardRefs: readonly ObjectRef[];
  readonly supersedesRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface CanonicalMapping {
  readonly ref: ObjectRef;
  readonly taxonomyRef: ObjectRef;
  readonly localTermRef: ObjectRef;
  readonly localLabel: string;
  readonly canonicalType: CanonicalMappingTargetType;
  readonly canonicalRef?: ObjectRef;
  readonly disposition: AliasDisposition;
  readonly status: CanonicalMappingStatus;
  readonly rationale?: string;
  readonly confidence?: number;
  readonly reviewedByRefs: readonly ObjectRef[];
  readonly evidenceRefs: readonly ObjectRef[];
  readonly effectiveAt?: IsoDateTime;
  readonly supersedesRef?: ObjectRef;
  readonly schemaVersion: number;
}

export interface AliasResolution {
  readonly id: CanopyId;
  readonly inputLabel: string;
  readonly locale?: string;
  readonly taxonomyRef: ObjectRef;
  readonly localTermRef?: ObjectRef;
  readonly canonicalMappingRef?: ObjectRef;
  readonly canonicalRef?: ObjectRef;
  readonly disposition: AliasDisposition;
  readonly requiresReview: boolean;
}

export interface RenderLocalLabelRequest {
  readonly canonicalRef?: ObjectRef;
  readonly canonicalType?: CanonicalMappingTargetType;
  readonly localTermRef?: ObjectRef;
  readonly localLabel?: string;
  readonly canonicalLabel?: string;
  readonly rendering: LocalLabelRendering;
}

export interface RenderedLocalLabel {
  readonly text: string;
  readonly mode: LocalLabelRenderMode;
  readonly localTermRef?: ObjectRef;
  readonly canonicalRef?: ObjectRef;
}
