import {
  buildDryRunResult,
  candidateEvent,
  containsToken,
  hasAnyField,
  hasAuthority,
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

export const stewardshipImportPlan = {
  id: "stewardship-fold-in",
  sourceProject: "stewardship",
  displayName: "Stewardship import plan",
  sourceProjectSummary:
    "Commons, places, resources, living systems, use rights, tasks, contributions, flows, and guardian reviews from the Stewardship folded source project.",
  canopyRole:
    "Fold Stewardship into Canopy as the resource, place, commons, ecological, and accountable-action memory of the ecosystem.",
  capabilityMapping: [
    {
      nativeCapability: "resource and commons registry",
      canopyCapabilities: ["stewardship", "ecological-modeling"],
      rationale:
        "Places, resources, commons, and living systems become canonical objects that other capabilities coordinate around.",
    },
    {
      nativeCapability: "use rights and access rules",
      canopyCapabilities: ["stewardship", "governance", "identity-authority"],
      rationale:
        "Use rights change access and obligations, so they require authority and governance continuity.",
    },
    {
      nativeCapability: "work, contribution, and care records",
      canopyCapabilities: ["stewardship", "learning-accountability", "allocation-accounting"],
      rationale:
        "Tasks and contributions connect ecological care to accountability, recognition, and allocation.",
    },
  ],
  sourceObjects: [
    {
      sourceObject: "place",
      description: "Site, parcel, facility, watershed, neighborhood, or other bounded context.",
      identityKey: "place identifier and boundary reference",
      requiredFields: ["source id", "name", "place kind"],
      optionalFields: ["boundary", "parent place", "stewards"],
      authorityHints: ["place steward", "registry authority"],
    },
    {
      sourceObject: "commons",
      description: "Collectively governed resource domain or shared care context.",
      identityKey: "commons identifier and scope",
      requiredFields: ["source id", "name", "commons kind"],
      optionalFields: ["participants", "rules", "resources"],
      authorityHints: ["governance rule", "participant membership"],
    },
    {
      sourceObject: "resource",
      description: "Material, ecological, spatial, informational, cultural, or productive capacity resource.",
      identityKey: "resource identifier and stewarded scope",
      requiredFields: ["source id", "name", "resource kind"],
      optionalFields: ["quantity", "condition", "location", "related commons"],
      authorityHints: ["resource steward", "use-right agreement"],
    },
    {
      sourceObject: "living system",
      description: "Ecological system with indicators, thresholds, guardians, and needs.",
      identityKey: "living system identifier and ecological boundary",
      requiredFields: ["source id", "name", "living system kind"],
      optionalFields: ["boundary", "guardians", "indicators", "thresholds"],
      authorityHints: ["guardian appointment", "ecological policy"],
    },
    {
      sourceObject: "use right",
      description: "Access, stewardship, withdrawal, benefit, restriction, or delegation right.",
      identityKey: "use-right identifier and version",
      requiredFields: ["source id", "holder", "resource or commons", "permission", "state"],
      optionalFields: ["starts at", "ends at", "conditions", "review date"],
      authorityHints: ["granting authority", "policy", "agreement", "guardian condition"],
    },
    {
      sourceObject: "stewardship activity",
      description: "Task, contribution, routine, observation, review, or outcome.",
      identityKey: "activity identifier and activity type",
      requiredFields: ["source id", "activity type", "status", "subject"],
      optionalFields: ["assigned actor", "completed at", "evidence", "outcome"],
      authorityHints: ["task assigner", "reviewer", "resource steward"],
    },
    {
      sourceObject: "policy",
      description: "Commons rule, access policy, care protocol, or policy family.",
      identityKey: "policy identifier and governed scope",
      requiredFields: ["source id", "title", "status"],
      optionalFields: ["scope", "policy version", "authority"],
      authorityHints: ["governance decision", "policy authority", "commons steward"],
    },
    {
      sourceObject: "policy version",
      description: "Versioned policy text, amendment, or protocol revision.",
      identityKey: "policy identifier plus version",
      requiredFields: ["source id", "policy", "version", "status"],
      optionalFields: ["supersedes", "effective date", "decision"],
      authorityHints: ["governance decision", "policy authority"],
    },
    {
      sourceObject: "decision",
      description: "Recorded decision affecting a resource, right, policy, task, or flow.",
      identityKey: "decision identifier and decision body",
      requiredFields: ["source id", "title", "status"],
      optionalFields: ["decision method", "policy", "resource", "outcome"],
      authorityHints: ["decision body", "mandate", "policy"],
    },
    {
      sourceObject: "food flow",
      description: "Food, harvest, distribution, waste, or mutual-aid movement record.",
      identityKey: "flow identifier and movement context",
      requiredFields: ["source id", "from", "to", "quantity"],
      optionalFields: ["resource", "agreement", "occurred at", "unit"],
      authorityHints: ["allocation agreement", "resource steward", "commons policy"],
    },
  ],
  targetCanonicalObjects: [
    {
      objectType: "place",
      purpose: "Represent spatial, customary, administrative, or ecological context.",
      requiredRelationships: ["contains resources, commons, or living systems when known"],
      eventTypes: ["object.created", "object.relationship.created"],
    },
    {
      objectType: "commons",
      purpose: "Represent collectively governed resource domains and participant scope.",
      requiredRelationships: ["located in place", "governed by policy", "contains resources"],
      eventTypes: ["object.created", "object.relationship.created"],
    },
    {
      objectType: "resource",
      purpose: "Represent stewarded assets, capacities, and shared resource states.",
      requiredRelationships: ["located in place", "governed by commons", "stewarded by actor"],
      eventTypes: ["stewardship.resource.created"],
    },
    {
      objectType: "living-system",
      purpose: "Represent ecological systems that require indicators, thresholds, and guardian review.",
      requiredRelationships: ["located in place", "observed by indicators", "guarded by appointed guardians"],
      eventTypes: ["ecology.living_system.created", "ecology.guardian.review_requested"],
    },
    {
      objectType: "use-right",
      purpose: "Represent access, withdrawal, stewardship, benefit, restriction, or delegation rights.",
      requiredRelationships: ["granted to holder", "applies to resource or commons", "authorized by policy or agreement"],
      eventTypes: ["stewardship.use_right.granted", "stewardship.use_right.revoked"],
    },
    {
      objectType: "task",
      purpose: "Represent stewardship work, routines, repairs, observations, and care commitments.",
      requiredRelationships: ["assigned to actor when known", "affects resource, place, commons, or living system"],
      eventTypes: ["stewardship.task.created", "stewardship.task.completed"],
    },
    {
      objectType: "guardian-review",
      purpose: "Represent ecological or vulnerable-group review and conditions.",
      requiredRelationships: ["reviews proposal, threshold, use right, or activity"],
      eventTypes: ["ecology.guardian.review_requested", "ecology.guardian.review_completed"],
    },
    {
      objectType: "policy",
      purpose: "Represent commons rules, access protocols, and their version continuity.",
      requiredRelationships: ["authorized by decision or mandate", "governs resource, commons, or use right"],
      eventTypes: ["governance.policy.versioned"],
    },
    {
      objectType: "decision",
      purpose: "Represent governance outcomes that authorize rights, policies, care, and flows.",
      requiredRelationships: ["authorized by mandate, role, or policy"],
      eventTypes: ["governance.decision.recorded"],
    },
    {
      objectType: "flow",
      purpose: "Represent food, transport, waste, and material flows as canonical movement memory.",
      requiredRelationships: ["scoped to resource, agreement, place, commons, or decision when known"],
      eventTypes: ["flow.food.recorded", "flow.transport.recorded", "flow.waste.recorded"],
    },
  ],
  eventOrdering: [
    {
      order: 1,
      phase: "place and commons foundation",
      sourceObjects: ["place", "commons"],
      targetObjects: ["place", "commons"],
      emitsEvents: ["object.created", "object.relationship.created"],
      dependsOn: [],
    },
    {
      order: 2,
      phase: "resource and living-system inventory",
      sourceObjects: ["resource", "living system"],
      targetObjects: ["resource", "living-system", "indicator", "threshold"],
      emitsEvents: [
        "stewardship.resource.created",
        "ecology.living_system.created",
        "ecology.indicator.recorded",
        "ecology.threshold.created",
      ],
      dependsOn: ["place and commons foundation"],
    },
    {
      order: 3,
      phase: "use rights and guardians",
      sourceObjects: ["use right", "living system"],
      targetObjects: ["use-right", "guardian-review", "role"],
      emitsEvents: [
        "authority.guardian.appointed",
        "stewardship.use_right.granted",
        "stewardship.use_right.revoked",
        "ecology.guardian.review_requested",
      ],
      dependsOn: ["resource and living-system inventory"],
    },
    {
      order: 4,
      phase: "activities and outcomes",
      sourceObjects: ["stewardship activity"],
      targetObjects: ["task", "commitment", "flow", "evidence", "decision", "policy"],
      emitsEvents: [
        "stewardship.task.created",
        "stewardship.task.completed",
        "stewardship.contribution.logged",
        "governance.policy.versioned",
        "governance.decision.recorded",
        "flow.food.recorded",
        "flow.transport.recorded",
        "flow.waste.recorded",
        "learning.outcome.recorded",
      ],
      dependsOn: ["use rights and guardians"],
    },
  ],
  authorityAndDataStewardship: [
    {
      concern: "rights-changing imports",
      requiredTreatment:
        "Use rights, guardian appointments, restrictions, and revocations require policy, agreement, mandate, or guardian authority refs.",
      blocksImportWhen: "a source right would become active without a valid authority basis.",
    },
    {
      concern: "sensitive ecological locations",
      requiredTreatment:
        "Generalize, embargo, or seal precise location data for vulnerable species, sacred sites, or protected systems.",
      blocksImportWhen: "the import would expose protected location data beyond its allowed audience.",
    },
    {
      concern: "contribution recognition",
      requiredTreatment:
        "Import contributions with actor consent and avoid converting care records into accounting claims unless explicitly authorized.",
      blocksImportWhen: "recognition, compensation, or allocation effects are inferred without agreement.",
    },
  ],
  dryRunChecks: [
    {
      check: "boundary reference availability",
      expectedResult: "Places, commons, and living systems have a boundary description, reference, or explicit unknown marker.",
      failureAction: "import object shell only and require stewardship review.",
    },
    {
      check: "use-right authority coverage",
      expectedResult: "Every active use right has holder, subject, permission, state, and authority basis.",
      failureAction: "mark use right proposed and block activation.",
    },
    {
      check: "protected-location screening",
      expectedResult: "Sensitive ecological and cultural locations are generalized, embargoed, or sealed before import.",
      failureAction: "stop affected records and request data steward treatment.",
    },
  ],
  prohibitedOutcomes: [
    {
      outcome: "activating use rights from incomplete source records",
      reason: "Access and benefit rights change obligations and must be grounded in authority.",
    },
    {
      outcome: "publicly exposing protected ecological or cultural locations",
      reason: "Stewardship data must not create new harm to living systems or vulnerable communities.",
    },
    {
      outcome: "treating task completion as verified ecological improvement",
      reason: "Activity records and ecological outcome claims require separate evidence and review.",
    },
  ],
} satisfies ImportPlanTemplate;

export function dryRunStewardshipImport(
  records: readonly LegacySourceRecord[],
): ImportDryRunResult {
  const mappingCandidates: CanonicalMappingCandidate[] = [];
  const warnings: ImportDryRunWarning[] = [];
  const prohibitedOutcomes: ImportDryRunProhibitedOutcome[] = [];
  const candidateEvents: CanopyEvent[] = [];

  records.forEach((record, index) => {
    const sourceEntity = stewardshipSourceEntity(record);
    const sourceId = sourceIdFor(record, sourceEntity, index);
    const sourcePlan = planSourceObject(stewardshipImportPlan, sourceEntity);
    const source = {
      sourceProject: stewardshipImportPlan.sourceProject,
      sourceEntity,
      sourceId,
    };
    const canonicalType = stewardshipCanonicalType(sourceEntity, record);
    const targetPlan = planTargetObject(stewardshipImportPlan, canonicalType);
    const candidate = mappingCandidate({
      sourceProject: stewardshipImportPlan.sourceProject,
      sourceEntity,
      sourceId,
      canonicalType,
      record,
      sourcePlan,
      targetPlan,
      confidence: sourcePlan === undefined ? "low" : "medium",
      rationale: `Stewardship ${sourceEntity} dry-runs as Canopy ${canonicalType} care memory, not as a separate application.`,
    });

    mappingCandidates.push(candidate);
    warnings.push(...requiredFieldWarnings(sourcePlan, record, source));
    candidateEvents.push(
      candidateEvent({
        sourceProject: stewardshipImportPlan.sourceProject,
        sourceEntity,
        sourceId,
        canonicalRef: candidate.canonicalRef,
        type: stewardshipEventType(sourceEntity, record),
        sourceCapability: "stewardship",
        record,
        payload: { canonicalType },
      }),
    );

    if (
      (sourceEntity === "place" || sourceEntity === "commons" || sourceEntity === "living system") &&
      !hasAnyField(record, ["boundary", "boundaryRef", "boundary_ref", "location", "unknownBoundary"])
    ) {
      warnings.push(
        warning({
          code: "missing-boundary-reference",
          source,
          message:
            "Stewardship context can only be dry-run as an object shell until a boundary reference or explicit unknown marker is present.",
        }),
      );
    }

    if (sourceEntity === "use right" && isActiveOrGranted(record) && !hasAuthority(record)) {
      warnings.push(
        warning({
          code: "missing-use-right-authority",
          severity: "blocker",
          source,
          message:
            "Active use right has no policy, agreement, mandate, guardian, or grant authority basis.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(stewardshipImportPlan, "use rights"),
          source,
          "active use right without authority basis",
        ),
      );
    }

    if (hasProtectedLocation(record) && !hasLocationTreatment(record)) {
      warnings.push(
        warning({
          code: "protected-location-untreated",
          severity: "blocker",
          source,
          message:
            "Protected ecological or cultural location requires generalized, embargoed, or sealed treatment before import.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(stewardshipImportPlan, "protected ecological"),
          source,
          "protected location lacks data stewardship treatment",
        ),
      );
    }
  });

  return buildDryRunResult({
    plan: stewardshipImportPlan,
    mappingCandidates,
    warnings,
    prohibitedOutcomes,
    candidateEvents,
  });
}

function stewardshipSourceEntity(record: LegacySourceRecord): string {
  const kind = sourceObjectKind(record);
  if (containsToken(kind, "living")) {
    return "living system";
  }
  if (containsToken(kind, "policy version") || containsToken(kind, "policy_version")) {
    return "policy version";
  }
  if (containsToken(kind, "policy")) {
    return "policy";
  }
  if (containsToken(kind, "decision")) {
    return "decision";
  }
  if (containsToken(kind, "food flow") || containsToken(kind, "food_flow")) {
    return "food flow";
  }
  if (containsToken(kind, "use right") || containsToken(kind, "right")) {
    return "use right";
  }
  if (
    containsToken(kind, "activity") ||
    containsToken(kind, "task") ||
    containsToken(kind, "maintenance") ||
    containsToken(kind, "contribution")
  ) {
    return "stewardship activity";
  }
  if (containsToken(kind, "commons")) {
    return "commons";
  }
  if (containsToken(kind, "resource")) {
    return "resource";
  }
  return "place";
}

function stewardshipCanonicalType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanonicalMappingCandidate["canonicalType"] {
  if (sourceEntity === "living system") {
    return "living-system";
  }
  if (sourceEntity === "use right") {
    return "use-right";
  }
  if (sourceEntity === "policy" || sourceEntity === "policy version") {
    return "policy";
  }
  if (sourceEntity === "decision") {
    return "decision";
  }
  if (sourceEntity === "food flow") {
    return "flow";
  }
  if (sourceEntity === "stewardship activity") {
    const activityType = textField(record, ["activityType", "activity_type", "kind", "type"]);
    if (containsToken(activityType, "review")) {
      return "guardian-review";
    }
    if (containsToken(activityType, "contribution")) {
      return "commitment";
    }
    return "task";
  }
  if (sourceEntity === "commons") {
    return "commons";
  }
  if (sourceEntity === "resource") {
    return "resource";
  }
  return "place";
}

function stewardshipEventType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanopyEventType {
  if (sourceEntity === "resource") {
    return "stewardship.resource.created";
  }
  if (sourceEntity === "living system") {
    return "ecology.living_system.created";
  }
  if (sourceEntity === "use right") {
    return isRevoked(record)
      ? "stewardship.use_right.revoked"
      : "stewardship.use_right.granted";
  }
  if (sourceEntity === "policy" || sourceEntity === "policy version") {
    return "governance.policy.versioned";
  }
  if (sourceEntity === "decision") {
    return "governance.decision.recorded";
  }
  if (sourceEntity === "food flow") {
    return "flow.food.recorded";
  }
  if (sourceEntity === "stewardship activity") {
    const status = textField(record, ["status", "state"]);
    const activityType = textField(record, ["activityType", "activity_type", "kind", "type"]);
    if (containsToken(activityType, "contribution")) {
      return "stewardship.contribution.logged";
    }
    return containsToken(status, "complete")
      ? "stewardship.task.completed"
      : "stewardship.task.created";
  }
  return "object.created";
}

function isRevoked(record: LegacySourceRecord): boolean {
  const status = textField(record, ["status", "state"]);
  return containsToken(status, "revoked") || containsToken(status, "retired");
}

function isActiveOrGranted(record: LegacySourceRecord): boolean {
  const status = textField(record, ["status", "state"]);
  return status === undefined || containsToken(status, "active") || containsToken(status, "granted");
}

function hasProtectedLocation(record: LegacySourceRecord): boolean {
  const sensitivity = textField(record, ["sensitivity", "locationSensitivity", "location_sensitivity"]);
  return (
    containsToken(sensitivity, "protected") ||
    containsToken(sensitivity, "sacred") ||
    containsToken(sensitivity, "vulnerable") ||
    containsToken(sensitivity, "sensitive")
  );
}

function hasLocationTreatment(record: LegacySourceRecord): boolean {
  const treatment = textField(record, ["locationTreatment", "location_treatment", "visibility", "embargo"]);
  return (
    containsToken(treatment, "generalized") ||
    containsToken(treatment, "embargo") ||
    containsToken(treatment, "sealed")
  );
}
