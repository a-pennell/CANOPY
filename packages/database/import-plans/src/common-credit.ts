import {
  buildDryRunResult,
  candidateEvent,
  containsToken,
  hasAuthority,
  mappingCandidate,
  numberField,
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

export const commonCreditImportPlan = {
  id: "common-credit-fold-in",
  sourceProject: "common-credit",
  displayName: "CommonCredit import plan",
  sourceProjectSummary:
    "Mutual-credit accounting, allocation agreements, obligations, and flows from the CommonCredit folded source project.",
  canopyRole:
    "Fold CommonCredit into Canopy as allocation accounting and civic memory for value flows, without treating it as a separate application.",
  capabilityMapping: [
    {
      nativeCapability: "mutual credit ledgers",
      canopyCapabilities: ["allocation-accounting", "civic-memory"],
      rationale:
        "Ledger state becomes canonical accounting memory while preserving source provenance and reversibility.",
    },
    {
      nativeCapability: "credit allocation rules",
      canopyCapabilities: ["allocation-accounting", "governance"],
      rationale:
        "Rules that change balances or obligations require Canopy authority references and governance event history.",
    },
    {
      nativeCapability: "member accounts and counterparties",
      canopyCapabilities: ["identity-authority", "federation"],
      rationale:
        "Participants map to Canopy people, organizations, accounts, roles, and federation-local source pointers.",
    },
  ],
  sourceObjects: [
    {
      sourceObject: "member",
      description: "Participant, organization, or counterparty with credit activity.",
      identityKey: "stable member identifier or verified account handle",
      requiredFields: ["source id", "display name or label", "member state"],
      optionalFields: ["organization affiliation", "contact handle", "joined at"],
      authorityHints: ["membership record", "account ownership evidence"],
    },
    {
      sourceObject: "account",
      description: "Credit account or balance-holding unit.",
      identityKey: "stable account identifier",
      requiredFields: ["source id", "account owner", "account kind"],
      optionalFields: ["credit limit", "opening balance", "currency or unit"],
      authorityHints: ["owner consent", "ledger steward authority"],
    },
    {
      sourceObject: "transaction",
      description: "Posted, reversed, or pending movement between accounts.",
      identityKey: "immutable transaction identifier plus posting sequence",
      requiredFields: ["source id", "from account", "to account", "amount", "posted at"],
      optionalFields: ["memo", "reversal id", "evidence links"],
      authorityHints: ["account signer authority", "ledger policy"],
    },
    {
      sourceObject: "allocation agreement",
      description: "Rule, consent, or agreement that authorizes a credit movement or obligation.",
      identityKey: "agreement identifier and version",
      requiredFields: ["source id", "participants", "scope", "status"],
      optionalFields: ["expires at", "terms summary", "decision reference"],
      authorityHints: ["agreement record", "governance decision", "delegated mandate"],
    },
  ],
  targetCanonicalObjects: [
    {
      objectType: "person",
      purpose: "Represent individual participants that own or authorize accounts.",
      requiredRelationships: ["linked to account", "member of organization or commons when known"],
      eventTypes: ["identity.person.created", "identity.account.linked"],
    },
    {
      objectType: "organization",
      purpose: "Represent collective account owners or counterparties.",
      requiredRelationships: ["linked to account", "participant in commons when known"],
      eventTypes: ["identity.organization.created", "identity.membership.activated"],
    },
    {
      objectType: "ledger-account",
      purpose: "Hold canonical accounting identity for balances and credit limits.",
      requiredRelationships: ["owned by person or organization", "governed by ledger policy"],
      eventTypes: ["object.created", "accounting.ledger_entry.posted"],
    },
    {
      objectType: "ledger-entry",
      purpose: "Preserve immutable posted and reversal entries with source provenance.",
      requiredRelationships: ["debits ledger-account", "credits ledger-account", "authorized by agreement"],
      eventTypes: ["accounting.ledger_entry.posted", "accounting.ledger_entry.reversed"],
    },
    {
      objectType: "agreement",
      purpose: "Capture credit terms, participant consent, and allocation authority.",
      requiredRelationships: ["binds participants", "authorizes ledger entries"],
      eventTypes: ["allocation.consent.recorded", "allocation.obligation.created"],
    },
  ],
  eventOrdering: [
    {
      order: 1,
      phase: "identity and membership",
      sourceObjects: ["member"],
      targetObjects: ["person", "organization", "account"],
      emitsEvents: ["identity.person.created", "identity.organization.created", "identity.account.linked"],
      dependsOn: [],
    },
    {
      order: 2,
      phase: "ledger account shells",
      sourceObjects: ["account"],
      targetObjects: ["ledger-account"],
      emitsEvents: ["object.created", "object.relationship.created"],
      dependsOn: ["identity and membership"],
    },
    {
      order: 3,
      phase: "allocation authority",
      sourceObjects: ["allocation agreement"],
      targetObjects: ["agreement", "policy", "mandate"],
      emitsEvents: ["allocation.consent.recorded", "allocation.obligation.created"],
      dependsOn: ["ledger account shells"],
    },
    {
      order: 4,
      phase: "ledger entries",
      sourceObjects: ["transaction"],
      targetObjects: ["ledger-entry", "flow"],
      emitsEvents: ["accounting.ledger_entry.posted", "accounting.ledger_entry.reversed"],
      dependsOn: ["allocation authority"],
    },
  ],
  authorityAndDataStewardship: [
    {
      concern: "balance-changing records",
      requiredTreatment:
        "Require authority refs for signer, account owner, ledger steward, or governing agreement before posting canonical entries.",
      blocksImportWhen: "a transaction changes accounting state without an authority basis.",
    },
    {
      concern: "member privacy",
      requiredTreatment:
        "Default member contact fields to role-restricted visibility and import only the minimum identifiers needed for reconciliation.",
      blocksImportWhen: "personal data is present without consent, policy, or data minimization mapping.",
    },
    {
      concern: "reversals and corrections",
      requiredTreatment:
        "Represent reversals as new events that point to the original entry instead of mutating imported history.",
      blocksImportWhen: "the source requires overwriting or deleting an already posted canonical entry.",
    },
  ],
  dryRunChecks: [
    {
      check: "account identity uniqueness",
      expectedResult: "Every source account resolves to one canonical ledger-account.",
      failureAction: "stop and emit duplicate-account reconciliation report.",
    },
    {
      check: "transaction ordering",
      expectedResult: "Posting sequence is total within each ledger and no reversal precedes its original entry.",
      failureAction: "stop ledger-entry import for affected ledger.",
    },
    {
      check: "authority coverage",
      expectedResult: "All balance-changing events have at least one accepted authority reference.",
      failureAction: "quarantine unauthorized entries for governance review.",
    },
  ],
  prohibitedOutcomes: [
    {
      outcome: "creating spendable credit from unverified balances",
      reason: "Imported balances are historical claims until ledger authority validates them.",
    },
    {
      outcome: "collapsing multiple members into one account without review",
      reason: "Identity merges can change rights, obligations, and accounting accountability.",
    },
    {
      outcome: "discarding reversal history",
      reason: "Accounting integrity requires continuity across corrections and disputes.",
    },
  ],
} satisfies ImportPlanTemplate;

export function dryRunCommonCreditImport(
  records: readonly LegacySourceRecord[],
): ImportDryRunResult {
  const mappingCandidates: CanonicalMappingCandidate[] = [];
  const warnings: ImportDryRunWarning[] = [];
  const prohibitedOutcomes: ImportDryRunProhibitedOutcome[] = [];
  const candidateEvents: CanopyEvent[] = [];

  records.forEach((record, index) => {
    const sourceEntity = commonCreditSourceEntity(record);
    const sourceId = sourceIdFor(record, sourceEntity, index);
    const sourcePlan = planSourceObject(commonCreditImportPlan, sourceEntity);
    const source = {
      sourceProject: commonCreditImportPlan.sourceProject,
      sourceEntity,
      sourceId,
    };
    const canonicalType = commonCreditCanonicalType(sourceEntity, record);
    const targetPlan = planTargetObject(commonCreditImportPlan, canonicalType);
    const candidate = mappingCandidate({
      sourceProject: commonCreditImportPlan.sourceProject,
      sourceEntity,
      sourceId,
      canonicalType,
      record,
      sourcePlan,
      targetPlan,
      confidence: sourcePlan === undefined ? "low" : "medium",
      rationale: commonCreditRationale(sourceEntity, canonicalType),
    });
    const eventType = commonCreditEventType(sourceEntity, record);

    mappingCandidates.push(candidate);
    warnings.push(...requiredFieldWarnings(sourcePlan, record, source));
    candidateEvents.push(
      candidateEvent({
        sourceProject: commonCreditImportPlan.sourceProject,
        sourceEntity,
        sourceId,
        canonicalRef: candidate.canonicalRef,
        type: eventType,
        sourceCapability: "allocation-accounting",
        record,
        payload: { canonicalType },
      }),
    );

    if (sourceEntity === "transaction" && !hasAuthority(record)) {
      warnings.push(
        warning({
          code: "missing-accounting-authority",
          severity: "blocker",
          source,
          message:
            "Balance-changing CommonCredit transaction has no authority basis for a canonical ledger entry.",
        }),
      );
      prohibitedOutcomes.push(
        prohibitedOutcome(
          planProhibitedOutcome(commonCreditImportPlan, "spendable credit"),
          source,
          "transaction without authority basis",
        ),
      );
    }

    const openingBalance = numberField(record, ["openingBalance", "opening_balance", "balance"]);
    if (sourceEntity === "account" && openingBalance !== undefined && !hasAuthority(record)) {
      warnings.push(
        warning({
          code: "unverified-opening-balance",
          source,
          message:
            "Opening balance is preserved as unverified source history until ledger authority validates it.",
        }),
      );
    }
  });

  return buildDryRunResult({
    plan: commonCreditImportPlan,
    mappingCandidates,
    warnings,
    prohibitedOutcomes,
    candidateEvents,
  });
}

function commonCreditSourceEntity(record: LegacySourceRecord): string {
  const kind = sourceObjectKind(record);
  if (containsToken(kind, "transaction") || containsToken(kind, "ledger entry")) {
    return "transaction";
  }
  if (containsToken(kind, "agreement") || containsToken(kind, "allocation")) {
    return "allocation agreement";
  }
  if (containsToken(kind, "account")) {
    return "account";
  }
  return "member";
}

function commonCreditCanonicalType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanonicalMappingCandidate["canonicalType"] {
  if (sourceEntity === "transaction") {
    return "ledger-entry";
  }
  if (sourceEntity === "allocation agreement") {
    return "agreement";
  }
  if (sourceEntity === "account") {
    return "ledger-account";
  }
  const memberKind = textField(record, ["memberKind", "member_kind", "kind", "type"]);
  return containsToken(memberKind, "org") || containsToken(memberKind, "collective")
    ? "organization"
    : "person";
}

function commonCreditEventType(
  sourceEntity: string,
  record: LegacySourceRecord,
): CanopyEventType {
  if (sourceEntity === "transaction") {
    const status = textField(record, ["status", "state"]);
    return containsToken(status, "reversed")
      ? "accounting.ledger_entry.reversed"
      : "accounting.ledger_entry.posted";
  }
  if (sourceEntity === "allocation agreement") {
    return "allocation.consent.recorded";
  }
  if (sourceEntity === "account") {
    return "object.created";
  }
  return commonCreditCanonicalType(sourceEntity, record) === "organization"
    ? "identity.organization.created"
    : "identity.person.created";
}

function commonCreditRationale(sourceEntity: string, canonicalType: string): string {
  return `CommonCredit ${sourceEntity} dry-runs as Canopy ${canonicalType} source memory, not as a separate application.`;
}
