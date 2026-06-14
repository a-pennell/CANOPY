import {
  buildDryRunResult,
  candidateEvent,
  containsToken,
  hasAnyField,
  mappingCandidate,
  planProhibitedOutcome,
  planSourceObject,
  planTargetObject,
  prohibitedOutcome,
  requiredFieldWarnings,
  sourceIdFor,
  sourceObjectKind,
  textField,
  warning,
} from "./dry-run.js";
import type { CanopyEvent, CanopyEventType } from "@canopy/contracts-kernel";
import type {
  CanonicalMappingCandidate,
  ImportDryRunProhibitedOutcome,
  ImportDryRunResult,
  ImportDryRunWarning,
  ImportPlanTemplate,
  LegacySourceRecord,
} from "./types.js";

export const sensemakingImportPlan = {
  id: "sensemaking-fold-in",
  sourceProject: "sensemaking",
  displayName: "Sensemaking import plan",
  sourceProjectSummary:
    "Claims, evidence, sources, models, assumptions, indicators, scenarios, and learning records from the Sensemaking folded source project.",
  canopyRole:
    "Fold Sensemaking into Canopy as claims-evidence, civic memory, ecological modeling, and learning accountability.",
  capabilityMapping: [
    {
      nativeCapability: "claim and evidence graph",
      canopyCapabilities: ["claims-evidence", "civic-memory"],
      rationale:
        "Assertions and supporting material become contestable records with provenance and review state.",
    },
    {
      nativeCapability: "models and scenarios",
      canopyCapabilities: ["ecological-modeling", "learning-accountability"],
      rationale:
        "Assumptions, parameters, outputs, and audits map to Canopy model memory and review workflows.",
    },
    {
      nativeCapability: "collective interpretation",
      canopyCapabilities: ["governance", "learning-accountability"],
      rationale:
        "Interpretive synthesis becomes evidence for governance without collapsing uncertainty into fact.",
    },
  ],
  sourceObjects: [
    {
      sourceObject: "source",
      description: "Publication, dataset, testimony, observation, sensor feed, or imported file reference.",
      identityKey: "source identifier, content hash, or stable citation key",
      requiredFields: ["source id", "source kind", "title or label"],
      optionalFields: ["author", "published at", "license", "content hash"],
      authorityHints: ["source steward", "disclosure rule", "license"],
    },
    {
      sourceObject: "claim",
      description: "Assertion, finding, hypothesis, interpretation, or contested statement.",
      identityKey: "claim identifier and version",
      requiredFields: ["source id", "statement", "status"],
      optionalFields: ["confidence", "scope", "supersedes", "review state"],
      authorityHints: ["claim author", "reviewer", "governance context"],
    },
    {
      sourceObject: "evidence link",
      description: "Relationship between a source and a claim.",
      identityKey: "claim id plus source id plus relation kind",
      requiredFields: ["claim", "source", "relation kind"],
      optionalFields: ["excerpt location", "weight", "review note"],
      authorityHints: ["evidence curator", "source permission"],
    },
    {
      sourceObject: "model",
      description: "Formal or informal model, scenario, assumption set, or output artifact.",
      identityKey: "model identifier and version",
      requiredFields: ["source id", "model kind", "title", "status"],
      optionalFields: ["assumptions", "parameters", "outputs", "audit notes"],
      authorityHints: ["model steward", "reviewer", "affected domain authority"],
    },
  ],
  targetCanonicalObjects: [
    {
      objectType: "source",
      purpose: "Represent provenance for evidence, datasets, testimony, and observations.",
      requiredRelationships: ["supports or contests claim", "governed by data stewardship agreement"],
      eventTypes: ["evidence.source.ingested"],
    },
    {
      objectType: "evidence",
      purpose: "Represent usable evidence units while preserving source boundaries.",
      requiredRelationships: ["derived from source", "linked to claim"],
      eventTypes: ["evidence.created", "evidence.linked_to_claim"],
    },
    {
      objectType: "claim",
      purpose: "Represent assertions with contestability, review state, and supersession.",
      requiredRelationships: ["supported by evidence", "scoped to object or governance issue"],
      eventTypes: ["claim.created", "claim.reviewed", "claim.contested", "claim.superseded"],
    },
    {
      objectType: "model",
      purpose: "Represent models, assumptions, scenarios, outputs, and audits.",
      requiredRelationships: ["uses evidence", "emits outputs", "reviewed by authority or steward"],
      eventTypes: ["model.created", "model.assumption.added", "model.scenario.created", "model.audit.completed"],
    },
    {
      objectType: "indicator",
      purpose: "Represent measured signals used by claims, thresholds, or governance.",
      requiredRelationships: ["observes living-system, resource, place, or commons"],
      eventTypes: ["ecology.indicator.recorded"],
    },
  ],
  eventOrdering: [
    {
      order: 1,
      phase: "source ingestion",
      sourceObjects: ["source"],
      targetObjects: ["source"],
      emitsEvents: ["evidence.source.ingested"],
      dependsOn: [],
    },
    {
      order: 2,
      phase: "claim shells",
      sourceObjects: ["claim"],
      targetObjects: ["claim"],
      emitsEvents: ["claim.created"],
      dependsOn: ["source ingestion"],
    },
    {
      order: 3,
      phase: "evidence graph",
      sourceObjects: ["evidence link"],
      targetObjects: ["evidence", "claim"],
      emitsEvents: ["evidence.created", "evidence.linked_to_claim", "claim.reviewed", "claim.contested"],
      dependsOn: ["claim shells"],
    },
    {
      order: 4,
      phase: "models and learning",
      sourceObjects: ["model"],
      targetObjects: ["model", "indicator", "threshold"],
      emitsEvents: [
        "model.created",
        "model.assumption.added",
        "model.scenario.created",
        "model.output.generated",
        "model.audit.completed",
        "learning.outcome.recorded",
      ],
      dependsOn: ["evidence graph"],
    },
  ],
  authorityAndDataStewardship: [
    {
      concern: "uncertainty preservation",
      requiredTreatment:
        "Import confidence, contestability, review state, and supersession rather than normalizing claims into facts.",
      blocksImportWhen: "claim status or evidence relation cannot be represented without overstating certainty.",
    },
    {
      concern: "source confidentiality",
      requiredTreatment:
        "Preserve source metadata and content hashes while redacting sensitive excerpts to stubs where required.",
      blocksImportWhen: "source terms prohibit storage, search, publication, or federation in the requested scope.",
    },
    {
      concern: "model-derived records",
      requiredTreatment:
        "Mark model outputs as model-derived and preserve assumptions, limitations, and audit trail.",
      blocksImportWhen: "outputs would be imported as observations or institutionally certified facts.",
    },
  ],
  dryRunChecks: [
    {
      check: "source hash stability",
      expectedResult: "Each source with content has a stable hash or citation key for provenance.",
      failureAction: "import source shell only and require steward review for evidence use.",
    },
    {
      check: "claim evidence relation typing",
      expectedResult: "Each evidence link has a relation such as supports, contests, qualifies, or contextualizes.",
      failureAction: "quarantine untyped evidence links.",
    },
    {
      check: "model output classification",
      expectedResult: "All outputs are classified as model-derived and attached to assumptions and audit status.",
      failureAction: "block model output activation.",
    },
  ],
  prohibitedOutcomes: [
    {
      outcome: "turning contested claims into authoritative facts",
      reason: "Canopy must preserve contestability and review state for governance-grade memory.",
    },
    {
      outcome: "publishing confidential source material by default",
      reason: "Evidence provenance does not override consent, license, safety, or source confidentiality.",
    },
    {
      outcome: "detaching model outputs from assumptions",
      reason: "Model-derived knowledge is not accountable without its assumptions and validation context.",
    },
  ],
} satisfies ImportPlanTemplate;

export function dryRunSensemakingImport(
  records: readonly LegacySourceRecord[],
): ImportDryRunResult {
  const mappingCandidates: CanonicalMappingCandidate[] = [];
  const warnings: ImportDryRunWarning[] = [];
  const prohibitedOutcomes: ImportDryRunProhibitedOutcome[] = [];
  const candidateEvents: CanopyEvent[] = [];

  records.forEach((record, index) => {
    const sourceEntity = sensemakingSourceEntity(record);
    const sourceId = sourceIdFor(record, sourceEntity, index);
    const sourcePlan = planSourceObject(sensemakingImportPlan, sourceEntity);
    const source = {
      sourceProject: sensemakingImportPlan.sourceProject,
      sourceEntity,
      sourceId,
    };
    const canonicalType = sensemakingCanonicalType(sourceEntity, record);
    const targetPlan = planTargetObject(sensemakingImportPlan, canonicalType);
    const candidate = mappingCandidate({
      sourceProject: sensemakingImportPlan.sourceProject,
      sourceEntity,
      sourceId,
      canonicalType,
      record,
      sourcePlan,
      targetPlan,
      confidence: sourcePlan === undefined ? "low" : "medium",
      rationale: `Sensemaking ${sourceEntity} dry-runs as Canopy ${canonicalType} knowledge memory, not as a separate application.`,
    });

    mappingCandidates.push(candidate);
    warnings.push(...requiredFieldWarnings(sourcePlan, record, source));
    candidateEvents.push(
      candidateEvent({
        sourceProject: sensemakingImportPlan.sourceProject,
        sourceEntity,
        sourceId,
        canonicalRef: candidate.canonicalRef,
        type: sensemakingEventType(sourceEntity, record),
        sourceCapability: "claims-evidence",
        record,
        payload: {
          canonicalType,
          preservesUncertainty: true,
        },
      }),
    );

    if (
      sourceEntity === "source" &&
      !hasAnyField(record, ["contentHash", "content_hash", "citationKey", "citation_key", "url"])
    ) {
      warnings.push(
        warning({
          code: "missing-source-provenance-key",
          source,
          message:
            "Source can only be dry-run as a shell until it has a content hash, citation key, or stable locator.",
        }),
      );
    }

    if (sourceEntity === "evidence link" && !hasAnyField(record, ["relation", "relationKind", "relation_kind"])) {
      warnings.push(
        warning({
          code: "untyped-evidence-link",
          severity: "blocker",
          source,
          message:
            "Evidence link needs a relation such as supports, contests, qualifies, or contextualizes.",
        }),
      );
    }

    if (sourceEntity === "claim" && claimOverstatesCertainty(record)) {
      warnings.push(
        warning({
          code: "claim-certainty-overstated",
          severity: "blocker",
          source,
          message:
            "Claim status would overstate certainty; preserve it as reviewed, contested, or confidence-scored memory instead.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(sensemakingImportPlan, "contested claims"),
          source,
          "claim imported as authoritative fact",
        ),
      );
    }

    if (sourceEntity === "model" && hasAnyField(record, ["outputs", "output"]) && !modelOutputIsClassified(record)) {
      warnings.push(
        warning({
          code: "model-output-unclassified",
          severity: "blocker",
          source,
          message:
            "Model outputs must remain model-derived and attached to assumptions, limitations, and audit status.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(sensemakingImportPlan, "model outputs"),
          source,
          "model output lacks model-derived classification",
        ),
      );
    }
  });

  return buildDryRunResult({
    plan: sensemakingImportPlan,
    mappingCandidates,
    warnings,
    prohibitedOutcomes,
    candidateEvents,
  });
}

function sensemakingSourceEntity(record: LegacySourceRecord): string {
  const kind = sourceObjectKind(record);
  if (containsToken(kind, "evidence link") || containsToken(kind, "link")) {
    return "evidence link";
  }
  if (containsToken(kind, "claim")) {
    return "claim";
  }
  if (containsToken(kind, "model") || containsToken(kind, "scenario")) {
    return "model";
  }
  return "source";
}

function sensemakingCanonicalType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanonicalMappingCandidate["canonicalType"] {
  if (sourceEntity === "claim") {
    return "claim";
  }
  if (sourceEntity === "evidence link") {
    return "evidence";
  }
  if (sourceEntity === "model") {
    const modelKind = textField(record, ["modelKind", "model_kind", "kind", "type"]);
    return containsToken(modelKind, "indicator") ? "indicator" : "model";
  }
  return "source";
}

function sensemakingEventType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanopyEventType {
  if (sourceEntity === "claim") {
    const status = textField(record, ["status", "reviewState", "review_state"]);
    if (containsToken(status, "contested")) {
      return "claim.contested";
    }
    if (containsToken(status, "review")) {
      return "claim.reviewed";
    }
    return "claim.created";
  }
  if (sourceEntity === "evidence link") {
    return "evidence.linked_to_claim";
  }
  if (sourceEntity === "model") {
    return "model.created";
  }
  return "evidence.source.ingested";
}

function claimOverstatesCertainty(record: LegacySourceRecord): boolean {
  const status = textField(record, ["status", "state", "reviewState", "review_state"]);
  const confidence = textField(record, ["confidence"]);
  return (
    containsToken(status, "fact") ||
    containsToken(status, "certified") ||
    containsToken(confidence, "certain")
  );
}

function modelOutputIsClassified(record: LegacySourceRecord): boolean {
  const dataState = textField(record, ["dataState", "data_state", "outputClassification", "output_classification"]);
  return containsToken(dataState, "model_derived") || containsToken(dataState, "model-derived");
}
