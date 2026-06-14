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

export const icosImportPlan = {
  id: "icos-fold-in",
  sourceProject: "icos",
  displayName: "ICOS import plan",
  sourceProjectSummary:
    "Institutional coordination, roles, mandates, policies, issues, proposals, and decision records from the ICOS folded source project.",
  canopyRole:
    "Fold ICOS into Canopy as governance, identity authority, and coordination memory for the cybernetic commons.",
  capabilityMapping: [
    {
      nativeCapability: "role and mandate management",
      canopyCapabilities: ["identity-authority", "governance"],
      rationale:
        "Role assignments and mandates become authority objects that gate rights-changing events.",
    },
    {
      nativeCapability: "proposal and decision process",
      canopyCapabilities: ["governance", "civic-memory"],
      rationale:
        "Issues, proposals, objections, amendments, and decisions become contestable governance memory.",
    },
    {
      nativeCapability: "operational coordination",
      canopyCapabilities: ["stewardship", "learning-accountability"],
      rationale:
        "Implementation tasks and retrospectives connect governance intent to accountable action.",
    },
  ],
  sourceObjects: [
    {
      sourceObject: "actor",
      description: "Person, organization, group, or system participant recognized by ICOS.",
      identityKey: "stable actor identifier",
      requiredFields: ["source id", "actor kind", "display name"],
      optionalFields: ["contact handle", "affiliations", "status"],
      authorityHints: ["membership record", "organization registry"],
    },
    {
      sourceObject: "role assignment",
      description: "Grant, revocation, or scoped assignment of authority.",
      identityKey: "role assignment identifier and version",
      requiredFields: ["source id", "assignee", "role", "status"],
      optionalFields: ["scope", "starts at", "ends at", "delegated by"],
      authorityHints: ["assigning role", "mandate", "policy"],
    },
    {
      sourceObject: "mandate",
      description: "Delegated authority to act within a scope.",
      identityKey: "mandate identifier and version",
      requiredFields: ["source id", "holder", "scope", "status"],
      optionalFields: ["conditions", "review date", "supersedes"],
      authorityHints: ["decision record", "delegation chain"],
    },
    {
      sourceObject: "governance item",
      description: "Issue, proposal, objection, amendment, decision, appeal, or policy version.",
      identityKey: "item identifier plus item type plus version",
      requiredFields: ["source id", "item type", "title", "status"],
      optionalFields: ["body", "parent item", "decision method", "evidence links"],
      authorityHints: ["process rule", "quorum record", "eligible participants"],
    },
  ],
  targetCanonicalObjects: [
    {
      objectType: "person",
      purpose: "Represent individual governance participants.",
      requiredRelationships: ["member of organization or commons when known"],
      eventTypes: ["identity.person.created", "identity.membership.activated"],
    },
    {
      objectType: "organization",
      purpose: "Represent councils, teams, institutions, or participating collectives.",
      requiredRelationships: ["contains roles", "participates in governance scope"],
      eventTypes: ["identity.organization.created", "identity.membership.activated"],
    },
    {
      objectType: "role",
      purpose: "Represent reusable authority roles and scoped permissions.",
      requiredRelationships: ["assigned to actor", "governed by policy or mandate"],
      eventTypes: ["authority.role.assigned", "authority.role.revoked"],
    },
    {
      objectType: "mandate",
      purpose: "Represent delegated authority with scope, term, and accountability.",
      requiredRelationships: ["granted to actor", "authorized by decision or policy"],
      eventTypes: ["authority.mandate.granted", "authority.mandate.revoked"],
    },
    {
      objectType: "issue",
      purpose: "Represent questions, risks, policy gaps, or conflicts requiring governance attention.",
      requiredRelationships: ["scoped to commons, organization, place, or resource"],
      eventTypes: ["governance.issue.created", "governance.issue.scoped"],
    },
    {
      objectType: "proposal",
      purpose: "Represent proposed changes, allocations, agreements, and operational actions.",
      requiredRelationships: ["responds to issue", "supported by evidence or perspective records"],
      eventTypes: ["governance.proposal.created", "governance.proposal.opened"],
    },
    {
      objectType: "decision",
      purpose: "Represent recorded governance outcomes and effects.",
      requiredRelationships: ["decides proposal", "authorized by method and participant authority"],
      eventTypes: ["governance.decision.recorded", "governance.policy.versioned"],
    },
  ],
  eventOrdering: [
    {
      order: 1,
      phase: "actors and organizations",
      sourceObjects: ["actor"],
      targetObjects: ["person", "organization"],
      emitsEvents: ["identity.person.created", "identity.organization.created", "identity.membership.activated"],
      dependsOn: [],
    },
    {
      order: 2,
      phase: "authority graph",
      sourceObjects: ["role assignment", "mandate"],
      targetObjects: ["role", "mandate"],
      emitsEvents: ["authority.role.assigned", "authority.mandate.granted", "authority.delegation.granted"],
      dependsOn: ["actors and organizations"],
    },
    {
      order: 3,
      phase: "governance deliberation",
      sourceObjects: ["governance item"],
      targetObjects: ["issue", "proposal", "evidence", "claim"],
      emitsEvents: [
        "governance.issue.created",
        "governance.perspective.submitted",
        "governance.proposal.created",
        "governance.objection.raised",
        "governance.amendment.submitted",
      ],
      dependsOn: ["authority graph"],
    },
    {
      order: 4,
      phase: "decisions and policies",
      sourceObjects: ["governance item"],
      targetObjects: ["decision", "policy", "appeal"],
      emitsEvents: ["governance.decision.recorded", "governance.policy.versioned", "governance.appeal.opened"],
      dependsOn: ["governance deliberation"],
    },
  ],
  authorityAndDataStewardship: [
    {
      concern: "authority escalation",
      requiredTreatment:
        "Preserve delegation chains and require an accepted authority basis for role, mandate, policy, and binding-decision events.",
      blocksImportWhen: "a rights-changing event has no assigner, mandate, policy, or decision authority.",
    },
    {
      concern: "minority reports and objections",
      requiredTreatment:
        "Import dissent as preserved governance memory rather than comments to be overwritten by the final decision.",
      blocksImportWhen: "the import would erase unresolved objections or process concerns.",
    },
    {
      concern: "private deliberation",
      requiredTreatment:
        "Apply source visibility to deliberation bodies and redact private notes to stubs when public memory is needed.",
      blocksImportWhen: "private participant data would become public without consent or policy authority.",
    },
  ],
  dryRunChecks: [
    {
      check: "delegation graph closure",
      expectedResult: "Every active role and mandate can trace to a valid assigner, policy, or decision.",
      failureAction: "stop authority import and list broken delegation chains.",
    },
    {
      check: "governance item parentage",
      expectedResult: "Each proposal, objection, amendment, and appeal resolves to its parent issue, proposal, or decision.",
      failureAction: "quarantine orphaned governance items.",
    },
    {
      check: "decision effect classification",
      expectedResult: "Each decision is classified as advisory, binding, temporary, emergency, or retrospective.",
      failureAction: "mark decision draft and require governance review before activation.",
    },
  ],
  prohibitedOutcomes: [
    {
      outcome: "granting active authority from ambiguous source roles",
      reason: "Authority must be explicit before Canopy lets records change rights or obligations.",
    },
    {
      outcome: "flattening deliberation into final decisions only",
      reason: "Canopy civic memory requires issues, perspectives, objections, amendments, and appeals.",
    },
    {
      outcome: "importing hidden private notes as public evidence",
      reason: "Data stewardship rules must preserve confidentiality and consent boundaries.",
    },
  ],
} satisfies ImportPlanTemplate;

export function dryRunIcosImport(
  records: readonly LegacySourceRecord[],
): ImportDryRunResult {
  const mappingCandidates: CanonicalMappingCandidate[] = [];
  const warnings: ImportDryRunWarning[] = [];
  const prohibitedOutcomes: ImportDryRunProhibitedOutcome[] = [];
  const candidateEvents: CanopyEvent[] = [];

  records.forEach((record, index) => {
    const sourceEntity = icosSourceEntity(record);
    const sourceId = sourceIdFor(record, sourceEntity, index);
    const sourcePlan = planSourceObject(icosImportPlan, sourceEntity);
    const source = { sourceProject: icosImportPlan.sourceProject, sourceEntity, sourceId };
    const canonicalType = icosCanonicalType(sourceEntity, record);
    const targetPlan = planTargetObject(icosImportPlan, canonicalType);
    const candidate = mappingCandidate({
      sourceProject: icosImportPlan.sourceProject,
      sourceEntity,
      sourceId,
      canonicalType,
      record,
      sourcePlan,
      targetPlan,
      confidence: sourcePlan === undefined ? "low" : "medium",
      rationale: `ICOS ${sourceEntity} dry-runs as Canopy ${canonicalType} governance memory, not as a separate application.`,
    });

    mappingCandidates.push(candidate);
    warnings.push(...requiredFieldWarnings(sourcePlan, record, source));
    candidateEvents.push(
      candidateEvent({
        sourceProject: icosImportPlan.sourceProject,
        sourceEntity,
        sourceId,
        canonicalRef: candidate.canonicalRef,
        type: icosEventType(sourceEntity, record, canonicalType),
        sourceCapability: "governance",
        record,
        payload: { canonicalType },
      }),
    );

    if (
      (sourceEntity === "role assignment" || sourceEntity === "mandate") &&
      isActiveOrGranted(record) &&
      !hasAuthority(record)
    ) {
      warnings.push(
        warning({
          code: "missing-authority-delegation-chain",
          severity: "blocker",
          source,
          message:
            "Active ICOS role or mandate has no assigner, policy, mandate, or decision authority basis.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(icosImportPlan, "active authority"),
          source,
          "active authority record without delegation basis",
        ),
      );
    }

    if (
      sourceEntity === "governance item" &&
      icosNeedsParent(record) &&
      !hasAnyField(record, ["parent", "parentId", "parent_id", "issue", "proposal", "decision"])
    ) {
      warnings.push(
        warning({
          code: "orphaned-governance-item",
          source,
          message:
            "Governance item needs a parent issue, proposal, or decision before it can be imported as connected civic memory.",
        }),
      );
    }
  });

  return buildDryRunResult({
    plan: icosImportPlan,
    mappingCandidates,
    warnings,
    prohibitedOutcomes,
    candidateEvents,
  });
}

function icosSourceEntity(record: LegacySourceRecord): string {
  const kind = sourceObjectKind(record);
  if (containsToken(kind, "role")) {
    return "role assignment";
  }
  if (containsToken(kind, "mandate")) {
    return "mandate";
  }
  if (
    containsToken(kind, "issue") ||
    containsToken(kind, "governance") ||
    containsToken(kind, "proposal") ||
    containsToken(kind, "decision") ||
    containsToken(kind, "objection") ||
    containsToken(kind, "appeal") ||
    containsToken(kind, "policy")
  ) {
    return "governance item";
  }
  return "actor";
}

function icosCanonicalType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanonicalMappingCandidate["canonicalType"] {
  if (sourceEntity === "role assignment") {
    return "role";
  }
  if (sourceEntity === "mandate") {
    return "mandate";
  }
  if (sourceEntity === "governance item") {
    const itemType = textField(record, ["itemType", "item_type", "kind", "type"]);
    if (containsToken(itemType, "decision")) {
      return "decision";
    }
    if (containsToken(itemType, "proposal") || containsToken(itemType, "amendment")) {
      return "proposal";
    }
    if (containsToken(itemType, "appeal")) {
      return "appeal";
    }
    if (containsToken(itemType, "policy")) {
      return "policy";
    }
    return "issue";
  }
  const actorKind = textField(record, ["actorKind", "actor_kind", "kind", "type"]);
  return containsToken(actorKind, "org") ||
    containsToken(actorKind, "group") ||
    containsToken(actorKind, "council")
    ? "organization"
    : "person";
}

function icosEventType(
  sourceEntity: string,
  record: LegacySourceRecord,
  canonicalType: CanonicalMappingCandidate["canonicalType"],
): CanopyEventType {
  if (sourceEntity === "role assignment") {
    return isRevoked(record) ? "authority.role.revoked" : "authority.role.assigned";
  }
  if (sourceEntity === "mandate") {
    return isRevoked(record) ? "authority.mandate.revoked" : "authority.mandate.granted";
  }
  if (canonicalType === "decision") {
    return "governance.decision.recorded";
  }
  if (canonicalType === "proposal") {
    return "governance.proposal.created";
  }
  if (canonicalType === "appeal") {
    return "governance.appeal.opened";
  }
  if (canonicalType === "policy") {
    return "governance.policy.versioned";
  }
  if (canonicalType === "issue") {
    return "governance.issue.created";
  }
  return canonicalType === "organization"
    ? "identity.organization.created"
    : "identity.person.created";
}

function isRevoked(record: LegacySourceRecord): boolean {
  const status = textField(record, ["status", "state"]);
  return containsToken(status, "revoked") || containsToken(status, "retired");
}

function isActiveOrGranted(record: LegacySourceRecord): boolean {
  const status = textField(record, ["status", "state"]);
  return status === undefined || containsToken(status, "active") || containsToken(status, "granted");
}

function icosNeedsParent(record: LegacySourceRecord): boolean {
  const itemType = textField(record, ["itemType", "item_type", "kind", "type"]);
  return (
    containsToken(itemType, "proposal") ||
    containsToken(itemType, "objection") ||
    containsToken(itemType, "amendment") ||
    containsToken(itemType, "appeal")
  );
}
