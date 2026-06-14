import type {
  CanopyCapability,
  CanopyId,
  CanopyObjectType,
  IsoDateTime,
  ObjectRef,
} from "./primitives.js";
import type { VersionedContract } from "./versioning.js";

export type PermissionEffect = "allow" | "deny" | "require-review";

export type AccessRuleStatus =
  | "draft"
  | "active"
  | "paused"
  | "superseded"
  | "revoked"
  | "retired";

export type PermissionDecision = "allowed" | "denied";

export type PermissionDenialReasonCode =
  | "missing_authority"
  | "inactive_membership"
  | "role_not_assigned"
  | "mandate_required"
  | "mandate_expired"
  | "delegation_missing"
  | "delegation_revoked"
  | "guardian_restricted"
  | "policy_restricted"
  | "agreement_restricted"
  | "use_right_required"
  | "scope_mismatch"
  | "target_restricted"
  | "purpose_required"
  | "emergency_not_allowed"
  | "review_required"
  | "data_stewardship_restricted"
  | "federation_restricted"
  | "protected_information"
  | "unknown";

export type AuthorityTraceStepKind =
  | "membership"
  | "role-assignment"
  | "mandate"
  | "delegation"
  | "guardian"
  | "policy"
  | "agreement"
  | "use-right"
  | "emergency-authority"
  | "access-rule";

export type AuthorityTraceStepResult =
  | "matched"
  | "missing"
  | "expired"
  | "revoked"
  | "out-of-scope"
  | "requires-review"
  | "redacted";

export interface PermissionAtom extends VersionedContract {
  readonly key: string;
  readonly capability: CanopyCapability;
  readonly action: string;
  readonly targetType?: CanopyObjectType;
  readonly consequential: boolean;
  readonly binding: boolean;
  readonly description?: string;
}

export interface AccessCondition {
  readonly key: string;
  readonly operator:
    | "equals"
    | "not-equals"
    | "includes"
    | "before"
    | "after"
    | "exists"
    | "requires-ref";
  readonly value?: string | number | boolean;
  readonly ref?: ObjectRef;
}

export interface AccessRuleSubject {
  readonly personRefs?: readonly ObjectRef[];
  readonly membershipRefs?: readonly ObjectRef[];
  readonly roleRefs?: readonly ObjectRef[];
  readonly organizationRefs?: readonly ObjectRef[];
  readonly guardianRefs?: readonly ObjectRef[];
}

export interface AccessRuleScope {
  readonly orgRef?: ObjectRef;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly targetRefs?: readonly ObjectRef[];
  readonly targetTypes?: readonly CanopyObjectType[];
  readonly purposeKeys?: readonly string[];
  readonly emergencyOnly?: boolean;
}

export interface AppealPathRef {
  readonly ref: ObjectRef;
  readonly label?: string;
  readonly instructions?: string;
}

export interface PermissionDenialReason {
  readonly code: PermissionDenialReasonCode;
  readonly message?: string;
  readonly safeToExplain: boolean;
  readonly sourceRefs: readonly ObjectRef[];
  readonly appealPathRef?: AppealPathRef;
}

export interface AccessRule extends VersionedContract {
  readonly id: CanopyId;
  readonly ref: ObjectRef;
  readonly permission: PermissionAtom;
  readonly effect: PermissionEffect;
  readonly status: AccessRuleStatus;
  readonly subject: AccessRuleSubject;
  readonly scope: AccessRuleScope;
  readonly conditions: readonly AccessCondition[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly appealPathRef?: AppealPathRef;
  readonly priority?: number;
  readonly startsAt?: IsoDateTime;
  readonly endsAt?: IsoDateTime;
  readonly reviewDueAt?: IsoDateTime;
}

export interface PermissionCheckContext {
  readonly purpose?: string;
  readonly emergency?: boolean;
  readonly actingMandateRef?: ObjectRef;
  readonly actingDelegationRef?: ObjectRef;
  readonly actingGuardianRef?: ObjectRef;
  readonly sourceCapability?: CanopyCapability;
  readonly requestedAt?: IsoDateTime;
  readonly relatedRefs?: readonly ObjectRef[];
}

export interface PermissionCheckRequest extends VersionedContract {
  readonly actorRef: ObjectRef;
  readonly permission: PermissionAtom;
  readonly targetRef: ObjectRef;
  readonly context?: PermissionCheckContext;
}

export interface AuthorityTraceStep {
  readonly kind: AuthorityTraceStepKind;
  readonly ref?: ObjectRef;
  readonly result: AuthorityTraceStepResult;
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly message?: string;
}

export interface AuthorityTrace {
  readonly actorRef: ObjectRef;
  readonly targetRef: ObjectRef;
  readonly permissionKey: string;
  readonly decision: PermissionDecision;
  readonly evaluatedAt: IsoDateTime;
  readonly steps: readonly AuthorityTraceStep[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly redacted: boolean;
}

export interface PermissionCheckResult extends VersionedContract {
  readonly allowed: boolean;
  readonly sourceRefs: readonly ObjectRef[];
  readonly reason?: string;
  readonly denialReasons?: readonly PermissionDenialReason[];
  readonly requiredAppealPathRef?: ObjectRef;
  readonly appealPathRefs?: readonly AppealPathRef[];
  readonly authorityTrace?: AuthorityTrace;
}

export type AccessConditionEvaluationResult =
  | "matched"
  | "missing"
  | "mismatched"
  | "unsupported";

export interface AccessConditionEvaluation {
  readonly condition: AccessCondition;
  readonly result: AccessConditionEvaluationResult;
  readonly actualValue?: string | number | boolean;
}

export interface AccessRuleEvaluation {
  readonly ruleRef: ObjectRef;
  readonly effect: PermissionEffect;
  readonly status: AccessRuleStatus;
  readonly matched: boolean;
  readonly active: boolean;
  readonly conditionResults: readonly AccessConditionEvaluation[];
  readonly sourceRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly message?: string;
}

export interface PermissionPolicyEvaluation extends PermissionCheckResult {
  readonly evaluatedAt: IsoDateTime;
  readonly request: PermissionCheckRequest;
  readonly ruleEvaluations: readonly AccessRuleEvaluation[];
}

export interface PermissionPolicyEvaluationInput {
  readonly request: PermissionCheckRequest;
  readonly accessRules: readonly AccessRule[];
  readonly evaluatedAt: IsoDateTime;
  readonly facts?: Readonly<Record<string, string | number | boolean | readonly string[]>>;
}

export function evaluatePermissionPolicy(
  input: PermissionPolicyEvaluationInput
): PermissionPolicyEvaluation {
  const ruleEvaluations = input.accessRules.map((rule) =>
    evaluateAccessRule(rule, input)
  );
  const matchedRules = ruleEvaluations.filter(
    (evaluation) => evaluation.matched && evaluation.active
  );
  const denyRule = matchedRules.find((evaluation) => evaluation.effect === "deny");
  const reviewRule = matchedRules.find(
    (evaluation) => evaluation.effect === "require-review"
  );
  const allowRules = matchedRules.filter((evaluation) => evaluation.effect === "allow");
  const allowed = denyRule === undefined && reviewRule === undefined && allowRules.length > 0;
  const denialReasons = buildPermissionDenialReasons(denyRule, reviewRule, allowRules, input.request);
  const sourceRefs = dedupeRefs(matchedRules.flatMap((evaluation) => evaluation.sourceRefs));
  const authorityRefs = dedupeRefs(matchedRules.flatMap((evaluation) => evaluation.authorityRefs));

  return {
    schemaVersion: input.request.schemaVersion,
    allowed,
    evaluatedAt: input.evaluatedAt,
    request: input.request,
    sourceRefs,
    ...(allowed
      ? {}
      : {
          reason: denialReasons[0]?.message ?? "Permission policy did not allow the request.",
          denialReasons
        }),
    appealPathRefs: input.accessRules
      .map((rule) => rule.appealPathRef)
      .filter((ref): ref is AppealPathRef => ref !== undefined),
    authorityTrace: {
      actorRef: input.request.actorRef,
      targetRef: input.request.targetRef,
      permissionKey: input.request.permission.key,
      decision: allowed ? "allowed" : "denied",
      evaluatedAt: input.evaluatedAt,
      steps: ruleEvaluations.map(toAuthorityTraceStep),
      sourceRefs,
      authorityRefs,
      redacted: false
    },
    ruleEvaluations
  };
}

function evaluateAccessRule(
  rule: AccessRule,
  input: PermissionPolicyEvaluationInput
): AccessRuleEvaluation {
  const active = isActiveRule(rule, input.evaluatedAt);
  const permissionMatches =
    rule.permission.key === input.request.permission.key &&
    rule.permission.capability === input.request.permission.capability &&
    rule.permission.action === input.request.permission.action;
  const subjectMatches = subjectMatchesRequest(rule.subject, input.request);
  const scopeMatches = scopeMatchesRequest(rule.scope, input.request);
  const conditionResults = rule.conditions.map((condition) =>
    evaluateCondition(condition, input.facts ?? {})
  );
  const conditionsMatch = conditionResults.every((result) => result.result === "matched");
  const matched = active && permissionMatches && subjectMatches && scopeMatches && conditionsMatch;

  return {
    ruleRef: rule.ref,
    effect: rule.effect,
    status: rule.status,
    matched,
    active,
    conditionResults,
    sourceRefs: rule.sourceRefs,
    authorityRefs: rule.authorityRefs,
    message: matched ? "Access rule matched." : "Access rule did not match request."
  };
}

function buildPermissionDenialReasons(
  denyRule: AccessRuleEvaluation | undefined,
  reviewRule: AccessRuleEvaluation | undefined,
  allowRules: readonly AccessRuleEvaluation[],
  request: PermissionCheckRequest
): readonly PermissionDenialReason[] {
  if (denyRule !== undefined) {
    return [
      {
        code: "policy_restricted",
        message: "A matching deny access rule restricted the request.",
        safeToExplain: true,
        sourceRefs: denyRule.sourceRefs
      }
    ];
  }

  if (reviewRule !== undefined) {
    return [
      {
        code: "review_required",
        message: "A matching access rule requires review before the request can proceed.",
        safeToExplain: true,
        sourceRefs: reviewRule.sourceRefs
      }
    ];
  }

  if (allowRules.length === 0) {
    return [
      {
        code: "missing_authority",
        message: `No active access rule allowed ${request.permission.key}.`,
        safeToExplain: true,
        sourceRefs: []
      }
    ];
  }

  return [];
}

function isActiveRule(rule: AccessRule, evaluatedAt: IsoDateTime): boolean {
  if (rule.status !== "active") {
    return false;
  }

  if (rule.startsAt !== undefined && rule.startsAt > evaluatedAt) {
    return false;
  }

  return !(rule.endsAt !== undefined && rule.endsAt <= evaluatedAt);
}

function subjectMatchesRequest(
  subject: AccessRuleSubject,
  request: PermissionCheckRequest
): boolean {
  const constrained =
    (subject.personRefs?.length ?? 0) > 0 ||
    (subject.membershipRefs?.length ?? 0) > 0 ||
    (subject.roleRefs?.length ?? 0) > 0 ||
    (subject.organizationRefs?.length ?? 0) > 0 ||
    (subject.guardianRefs?.length ?? 0) > 0;

  if (!constrained) {
    return true;
  }

  const candidateRefs = [
    request.actorRef,
    request.context?.actingMandateRef,
    request.context?.actingDelegationRef,
    request.context?.actingGuardianRef,
    ...(request.context?.relatedRefs ?? [])
  ].filter((ref): ref is ObjectRef => ref !== undefined);
  const allowedRefs = [
    ...(subject.personRefs ?? []),
    ...(subject.membershipRefs ?? []),
    ...(subject.roleRefs ?? []),
    ...(subject.organizationRefs ?? []),
    ...(subject.guardianRefs ?? [])
  ];

  return candidateRefs.some((candidate) =>
    allowedRefs.some((allowed) => sameRef(candidate, allowed))
  );
}

function scopeMatchesRequest(
  scope: AccessRuleScope,
  request: PermissionCheckRequest
): boolean {
  if (
    scope.targetRefs !== undefined &&
    scope.targetRefs.length > 0 &&
    !scope.targetRefs.some((targetRef) => sameRef(targetRef, request.targetRef))
  ) {
    return false;
  }

  if (
    scope.targetTypes !== undefined &&
    scope.targetTypes.length > 0 &&
    !scope.targetTypes.includes(request.targetRef.type)
  ) {
    return false;
  }

  if (
    scope.purposeKeys !== undefined &&
    scope.purposeKeys.length > 0 &&
    (request.context?.purpose === undefined ||
      !scope.purposeKeys.includes(request.context.purpose))
  ) {
    return false;
  }

  return !(scope.emergencyOnly === true && request.context?.emergency !== true);
}

function evaluateCondition(
  condition: AccessCondition,
  facts: Readonly<Record<string, string | number | boolean | readonly string[]>>
): AccessConditionEvaluation {
  const actualValue = facts[condition.key];

  if (actualValue === undefined) {
    return { condition, result: "missing" };
  }

  if (Array.isArray(actualValue)) {
    return {
      condition,
      result:
        condition.operator === "includes" &&
        typeof condition.value === "string" &&
        actualValue.includes(condition.value)
          ? "matched"
          : "mismatched"
    };
  }

  if (
    typeof actualValue !== "string" &&
    typeof actualValue !== "number" &&
    typeof actualValue !== "boolean"
  ) {
    return { condition, result: "unsupported" };
  }

  if (condition.operator === "exists") {
    return { condition, result: "matched", actualValue };
  }

  if (condition.operator === "equals") {
    return {
      condition,
      result: actualValue === condition.value ? "matched" : "mismatched",
      actualValue
    };
  }

  if (condition.operator === "not-equals") {
    return {
      condition,
      result: actualValue !== condition.value ? "matched" : "mismatched",
      actualValue
    };
  }

  if (
    (condition.operator === "before" || condition.operator === "after") &&
    typeof actualValue === "string" &&
    typeof condition.value === "string"
  ) {
    return {
      condition,
      result:
        condition.operator === "before"
          ? actualValue < condition.value
            ? "matched"
            : "mismatched"
          : actualValue > condition.value
            ? "matched"
            : "mismatched",
      actualValue
    };
  }

  return { condition, result: "unsupported", actualValue };
}

function toAuthorityTraceStep(
  evaluation: AccessRuleEvaluation
): AuthorityTraceStep {
  const step: Omit<AuthorityTraceStep, "message"> = {
    kind: "access-rule",
    ref: evaluation.ruleRef,
    result: evaluation.matched
      ? evaluation.effect === "require-review"
        ? "requires-review"
        : "matched"
      : "out-of-scope",
    sourceRefs: evaluation.sourceRefs,
    authorityRefs: evaluation.authorityRefs
  };

  return evaluation.message === undefined ? step : { ...step, message: evaluation.message };
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  return [...new Map(refs.map((ref) => [refKey(ref), ref])).values()];
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}
