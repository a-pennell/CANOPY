import type {
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  Delegation,
  Mandate,
  IsoDateTime,
  ObjectRef,
  RoleAssignment
} from "@canopy/contracts-kernel";
import type {
  Appeal,
  Decision,
  DecisionMethodConfig,
  DecisionPacket,
  Issue,
  Proposal
} from "@canopy/contracts-governance";
import type {
  CivicMemoryAppendResult,
  CivicMemoryService
} from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

export type GovernanceCommandErrorCode =
  | "binding-decision-missing-authority"
  | "binding-decision-membership-only-authority"
  | "authority-missing-authority"
  | "authority-membership-only"
  | "authority-empty-scope"
  | "authority-inactive-record"
  | "delegation-empty-grant"
  | "delegation-self-delegation"
  | "proposal-missing-proposer"
  | "proposal-missing-eligible-voters"
  | "proposal-unresolved-blocking-objections"
  | "decision-missing-decider"
  | "decision-unresolved-objections"
  | "appeal-missing-grounds"
  | "appeal-missing-reviewer"
  | "emergency-missing-authority"
  | "emergency-missing-constraints";

export class GovernanceCommandError extends Error {
  readonly code: GovernanceCommandErrorCode;

  constructor(code: GovernanceCommandErrorCode, message: string) {
    super(message);
    this.name = "GovernanceCommandError";
    this.code = code;
  }
}

export interface GovernanceCommandServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface GovernanceCommandContext {
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly systemActor?: CanopyEvent["systemActor"];
  readonly eventId?: CanopyId;
}

export interface GovernanceCommandResult<TRecord> {
  readonly record: TRecord;
  readonly ref: ObjectRef;
  readonly appendResult: CivicMemoryAppendResult;
}

export interface CreateIssueCommand extends GovernanceCommandContext {
  readonly issue: Issue;
}

export interface CreateProposalCommand extends GovernanceCommandContext {
  readonly proposal: Proposal;
}

export interface RecordDecisionCommand extends GovernanceCommandContext {
  readonly decision: Decision;
}

export interface RecordDecisionPacketCommand extends GovernanceCommandContext {
  readonly decisionPacket: DecisionPacket;
}

export interface OpenProposalCommand extends GovernanceCommandContext {
  readonly proposal: Proposal;
}

export interface OpenAppealCommand extends GovernanceCommandContext {
  readonly appeal: Appeal;
}

export interface GovernanceAuthorityValidationIssue {
  readonly code: GovernanceCommandErrorCode;
  readonly message: string;
}

export interface GovernanceAuthorityValidationResult {
  readonly valid: boolean;
  readonly issues: readonly GovernanceAuthorityValidationIssue[];
}

export function createIssue(
  services: GovernanceCommandServices,
  command: CreateIssueCommand
): GovernanceCommandResult<Issue> {
  const ref = refFor(command.issue, "issue");
  registerRefs(services.registry, [
    ref,
    ...refsForIssue(command.issue),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.issue.created",
    objectRef: ref,
    relatedRefs: refsForIssue(command.issue),
    authorityRefs: command.issue.authorityRefs,
    orgId: command.issue.orgId,
    visibility: command.issue.visibility,
    dataState: command.issue.dataState,
    payload: {
      command: "createIssue",
      issue: command.issue
    },
    record: command.issue
  });
}

export function createProposal(
  services: GovernanceCommandServices,
  command: CreateProposalCommand
): GovernanceCommandResult<Proposal> {
  assertValidAuthority(validateProposalOpeningAuthority(command.proposal));
  const ref = refFor(command.proposal, "proposal");
  registerRefs(services.registry, [
    ref,
    ...refsForProposal(command.proposal),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.proposal.created",
    objectRef: ref,
    relatedRefs: refsForProposal(command.proposal),
    authorityRefs: command.proposal.authorityRefs,
    orgId: command.proposal.orgId,
    visibility: command.proposal.visibility,
    dataState: command.proposal.dataState,
    payload: {
      command: "createProposal",
      proposal: command.proposal
    },
    record: command.proposal
  });
}

export function openProposal(
  services: GovernanceCommandServices,
  command: OpenProposalCommand
): GovernanceCommandResult<Proposal> {
  assertValidAuthority(validateProposalOpeningAuthority(command.proposal));
  const ref = refFor(command.proposal, "proposal");
  registerRefs(services.registry, [
    ref,
    ...refsForProposal(command.proposal),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.proposal.opened",
    objectRef: ref,
    relatedRefs: refsForProposal(command.proposal),
    authorityRefs: command.proposal.authorityRefs,
    orgId: command.proposal.orgId,
    visibility: command.proposal.visibility,
    dataState: command.proposal.dataState,
    payload: {
      command: "openProposal",
      proposal: command.proposal
    },
    record: command.proposal
  });
}

export function recordDecision(
  services: GovernanceCommandServices,
  command: RecordDecisionCommand
): GovernanceCommandResult<Decision> {
  assertValidAuthority(validateDecisionRecordingAuthority(command.decision));
  const ref = refFor(command.decision, "decision");
  registerRefs(services.registry, [
    ref,
    ...refsForDecision(command.decision),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.decision.recorded",
    objectRef: ref,
    relatedRefs: refsForDecision(command.decision),
    authorityRefs: command.decision.authorityRefs,
    orgId: command.decision.orgId,
    visibility: command.decision.visibility,
    dataState: command.decision.dataState,
    payload: {
      command: "recordDecision",
      decision: command.decision
    },
    record: command.decision
  });
}

export function recordDecisionPacket(
  services: GovernanceCommandServices,
  command: RecordDecisionPacketCommand
): GovernanceCommandResult<DecisionPacket> {
  const ref = refFor(command.decisionPacket, "decision-packet");
  registerRefs(services.registry, [
    ref,
    ...refsForDecisionPacket(command.decisionPacket),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.decision_packet.recorded",
    objectRef: ref,
    relatedRefs: refsForDecisionPacket(command.decisionPacket),
    authorityRefs: command.decisionPacket.authorityRefs,
    orgId: command.decisionPacket.orgId,
    visibility: command.decisionPacket.dataStewardship.visibility,
    dataState: command.decisionPacket.dataStewardship.dataState,
    payload: {
      command: "recordDecisionPacket",
      decisionPacket: command.decisionPacket
    },
    record: command.decisionPacket
  });
}

export function openAppeal(
  services: GovernanceCommandServices,
  command: OpenAppealCommand
): GovernanceCommandResult<Appeal> {
  assertValidAuthority(validateAppealAuthority(command.appeal));
  const ref = refFor(command.appeal, "appeal");
  registerRefs(services.registry, [
    ref,
    ...refsForAppeal(command.appeal),
    command.actorRef
  ]);

  return appendGovernanceEvent(services, command, {
    type: "governance.appeal.opened",
    objectRef: ref,
    relatedRefs: refsForAppeal(command.appeal),
    authorityRefs: command.appeal.authorityRefs,
    orgId: command.appeal.orgId,
    visibility: command.appeal.visibility,
    dataState: command.appeal.dataState,
    payload: {
      command: "openAppeal",
      appeal: command.appeal
    },
    record: command.appeal
  });
}

export function validateMandateAuthority(
  mandate: Mandate
): GovernanceAuthorityValidationResult {
  return result([
    ...validateActiveAuthorityRecord(mandate.status),
    ...validateNonMembershipAuthority(mandate.authorityRefs),
    ...validateAuthorityScope(mandate.scope),
    ...validateEmergencyAuthority(
      mandate.kind === "emergency",
      mandate.authorityRefs,
      mandate.scope.conditions
    )
  ]);
}

export function validateRoleAssignmentAuthority(
  assignment: RoleAssignment
): GovernanceAuthorityValidationResult {
  return result([
    ...validateActiveAuthorityRecord(assignment.status),
    ...validateNonMembershipAuthority(assignment.authorityRefs),
    ...validateAuthorityScope(assignment.scope)
  ]);
}

export function validateDelegationAuthority(
  delegation: Delegation
): GovernanceAuthorityValidationResult {
  return result([
    ...validateActiveAuthorityRecord(delegation.status),
    ...validateNonMembershipAuthority(delegation.authorityRefs),
    ...validateAuthorityScope(delegation.scope),
    ...(delegation.delegatedAuthorityRefs.length === 0
      ? [
          issue(
            "delegation-empty-grant",
            "Delegations must name at least one delegatedAuthorityRef."
          )
        ]
      : []),
    ...(sameRef(delegation.delegatorRef, delegation.delegateRef)
      ? [
          issue(
            "delegation-self-delegation",
            "Delegations cannot delegate authority back to the same actor."
          )
        ]
      : [])
  ]);
}

export function validateProposalOpeningAuthority(
  proposal: Proposal
): GovernanceAuthorityValidationResult {
  return result([
    ...validateNonMembershipAuthority([
      ...proposal.authorityRefs,
      ...proposal.decisionMethod.authorityRefs
    ]),
    ...validateDecisionMethodAuthority(proposal.decisionMethod),
    ...(proposal.proposedByRefs.length === 0
      ? [
          issue(
            "proposal-missing-proposer",
            "Open proposals require at least one proposedByRef."
          )
        ]
      : []),
    ...(proposal.objectionRefs.length > 0 &&
    proposal.decisionMethod.kind === "emergency_authority"
      ? [
          issue(
            "proposal-unresolved-blocking-objections",
            "Emergency proposal opening cannot bypass existing objectionRefs."
          )
        ]
      : [])
  ]);
}

export function validateDecisionRecordingAuthority(
  decision: Decision
): GovernanceAuthorityValidationResult {
  if (decision.effect !== "binding") {
    return result(
      decision.decidedByRefs.length === 0
        ? [
            issue(
              "decision-missing-decider",
              "Recorded decisions require at least one decidedByRef."
            )
          ]
        : []
    );
  }

  return result([
    ...validateNonMembershipAuthority(decision.authorityRefs, {
      missingCode: "binding-decision-missing-authority",
      missingMessage: "Binding decisions require explicit authorityRefs.",
      membershipOnlyCode: "binding-decision-membership-only-authority",
      membershipOnlyMessage: "Binding decisions cannot rely only on membership authority."
    }),
    ...validateDecisionMethodAuthority(decision.method),
    ...(decision.decidedByRefs.length === 0
      ? [
          issue(
            "decision-missing-decider",
            "Recorded decisions require at least one decidedByRef."
          )
        ]
      : []),
    ...(decision.unresolvedObjectionRefs.length > 0 &&
    decision.method.kind !== "emergency_authority"
      ? [
          issue(
            "decision-unresolved-objections",
            "Binding decisions cannot be recorded with unresolvedObjectionRefs unless the method is emergency_authority."
          )
        ]
      : []),
    ...validateEmergencyAuthority(
      decision.method.kind === "emergency_authority",
      [...decision.authorityRefs, ...decision.method.authorityRefs],
      decision.conditions
    )
  ]);
}

export function validateAppealAuthority(
  appeal: Appeal
): GovernanceAuthorityValidationResult {
  return result([
    ...validateNonMembershipAuthority(appeal.authorityRefs),
    ...(appeal.grounds.length === 0
      ? [
          issue(
            "appeal-missing-grounds",
            "Appeals require at least one stated ground."
          )
        ]
      : []),
    ...(appeal.status !== "open" && appeal.reviewerRefs.length === 0
      ? [
          issue(
            "appeal-missing-reviewer",
            "Appeals under review or later require at least one reviewerRef."
          )
        ]
      : [])
  ]);
}

interface AppendGovernanceEventInput<TRecord> {
  readonly type: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly orgId: CanopyId | undefined;
  readonly visibility: CanopyEvent["visibility"];
  readonly dataState: CanopyEvent["dataState"] | undefined;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly record: TRecord;
}

function appendGovernanceEvent<TRecord>(
  services: GovernanceCommandServices,
  command: GovernanceCommandContext,
  input: AppendGovernanceEventInput<TRecord>
): GovernanceCommandResult<TRecord> {
  const event = buildEvent(command, input);
  const appendResult = services.memory.appendEvent(event);

  return {
    record: input.record,
    ref: input.objectRef,
    appendResult
  };
}

function buildEvent<TRecord>(
  command: GovernanceCommandContext,
  input: AppendGovernanceEventInput<TRecord>
): CanopyEvent {
  const baseEvent: Omit<
    CanopyEvent,
    "actorRef" | "systemActor" | "orgId" | "dataState"
  > = {
    id: command.eventId ?? defaultEventId(input.objectRef, input.type),
    type: input.type,
    occurredAt: command.occurredAt,
    objectRef: input.objectRef,
    relatedRefs: uniqueRefs(input.relatedRefs),
    authorityRefs: uniqueRefs(input.authorityRefs),
    sourceCapability: "governance",
    payload: input.payload,
    schemaVersion: 1,
    visibility: input.visibility
  };

  return withOptionalEventFields(baseEvent, command, input);
}

function withOptionalEventFields(
  event: Omit<
    CanopyEvent,
    "actorRef" | "systemActor" | "orgId" | "dataState"
  >,
  command: GovernanceCommandContext,
  input: Pick<AppendGovernanceEventInput<unknown>, "orgId" | "dataState">
): CanopyEvent {
  const optionalFields: {
    actorRef?: ObjectRef;
    systemActor?: NonNullable<CanopyEvent["systemActor"]>;
    orgId?: CanopyId;
    dataState?: NonNullable<CanopyEvent["dataState"]>;
  } = {};

  if (command.actorRef !== undefined && command.systemActor !== undefined) {
    optionalFields.actorRef = command.actorRef;
    optionalFields.systemActor = command.systemActor;
  } else if (command.actorRef !== undefined) {
    optionalFields.actorRef = command.actorRef;
  } else if (command.systemActor !== undefined) {
    optionalFields.systemActor = command.systemActor;
  }

  if (input.orgId !== undefined) {
    optionalFields.orgId = input.orgId;
  }

  if (input.dataState !== undefined) {
    optionalFields.dataState = input.dataState;
  }

  return {
    ...event,
    ...optionalFields
  };
}

function assertValidAuthority(result: GovernanceAuthorityValidationResult): void {
  const firstIssue = result.issues[0];

  if (firstIssue === undefined) {
    return;
  }

  throw new GovernanceCommandError(firstIssue.code, firstIssue.message);
}

function isMembershipAuthorityRef(ref: ObjectRef): boolean {
  return ref.id.includes("membership") || ref.type === "organization";
}

function refFor(record: { readonly id: CanopyId }, type: ObjectRef["type"]): ObjectRef {
  return {
    id: record.id,
    type,
    namespace: "governance",
    lifecycleStatus: "active"
  };
}

function registerRefs(
  registry: ObjectRegistry,
  refs: readonly (ObjectRef | undefined)[]
): void {
  for (const ref of uniqueRefs(refs)) {
    registry.register(ref);
  }
}

function refsForIssue(issue: Issue): readonly ObjectRef[] {
  return compactRefs([
    issue.createdByRef,
    ...issue.authorityRefs,
    ...issue.dataStewardshipAgreementRefs,
    issue.scope.placeRef,
    issue.scope.commonsRef,
    issue.scope.livingSystemRef,
    ...issue.scope.affectedRefs,
    ...issue.claimRefs,
    ...issue.evidenceRefs,
    ...issue.perspectiveRefs,
    ...issue.proposalRefs,
    ...issue.decisionRefs,
    issue.reopenedFromIssueRef
  ]);
}

function refsForProposal(proposal: Proposal): readonly ObjectRef[] {
  return compactRefs([
    proposal.createdByRef,
    ...proposal.authorityRefs,
    ...proposal.dataStewardshipAgreementRefs,
    proposal.issueRef,
    ...proposal.proposedByRefs,
    ...proposal.affectedRefs,
    ...proposal.claimRefs,
    ...proposal.evidenceRefs,
    ...proposal.perspectiveRefs,
    ...proposal.scenarioRefs,
    ...proposal.amendmentRefs,
    ...proposal.objectionRefs,
    ...proposal.decisionMethod.eligibleVoterRefs,
    ...proposal.decisionMethod.authorityRefs,
    proposal.decisionMethod.appealPathRef
  ]);
}

function refsForDecision(decision: Decision): readonly ObjectRef[] {
  return compactRefs([
    decision.createdByRef,
    ...decision.authorityRefs,
    ...decision.dataStewardshipAgreementRefs,
    ...decision.issueRefs,
    ...decision.proposalRefs,
    ...decision.method.eligibleVoterRefs,
    ...decision.method.authorityRefs,
    decision.method.appealPathRef,
    ...decision.decidedByRefs,
    ...decision.affectedRefs,
    ...decision.claimRefs,
    ...decision.evidenceRefs,
    ...decision.perspectiveRefs,
    ...decision.unresolvedObjectionRefs,
    ...decision.obligationRefs,
    ...decision.agreementRefs,
    ...decision.policyRefs,
    decision.appealPathRef,
    ...decision.supersedesDecisionRefs
  ]);
}

function refsForDecisionPacket(packet: DecisionPacket): readonly ObjectRef[] {
  return compactRefs([
    packet.createdByRef,
    ...packet.issueRefs,
    ...packet.proposalRefs,
    packet.decisionRef,
    ...packet.authorityRefs,
    ...packet.decisionMethod.eligibleVoterRefs,
    ...packet.decisionMethod.authorityRefs,
    packet.decisionMethod.appealPathRef,
    ...packet.scopeRefs,
    ...packet.affectedObjectRefs,
    ...packet.claimRefs,
    ...packet.evidenceRefs,
    ...packet.evidenceLinkRefs,
    ...packet.perspectiveRefs,
    ...packet.scenarioRefs,
    ...packet.modelRefs,
    ...packet.guardianReviewRefs,
    ...packet.unresolvedObjectionRefs,
    ...packet.obligationRefs,
    ...packet.agreementRefs,
    ...packet.policyRefs,
    ...packet.policyVersionRefs,
    packet.appealPathRef,
    ...packet.dataStewardship.dataStewardshipAgreementRefs,
    ...packet.dataStewardship.consentSignalRefs,
    ...packet.dataStewardship.federationRuleRefs,
    ...packet.redactionSummary.redactedRefs,
    ...packet.redactionSummary.sealedRefs,
    packet.redactionSummary.redactedByRef,
    ...packet.redactionSummary.continuityEventRefs,
    ...packet.eventRefs,
    packet.supersedesDecisionPacketRef
  ]);
}

function refsForAppeal(appeal: Appeal): readonly ObjectRef[] {
  return compactRefs([
    appeal.createdByRef,
    ...appeal.authorityRefs,
    ...appeal.dataStewardshipAgreementRefs,
    appeal.targetRef,
    appeal.openedByRef,
    ...appeal.reviewerRefs,
    ...appeal.decisionRefs,
    ...appeal.evidenceRefs
  ]);
}

function validateActiveAuthorityRecord(
  status: string
): readonly GovernanceAuthorityValidationIssue[] {
  return ["active", "verified"].includes(status)
    ? []
    : [
        issue(
          "authority-inactive-record",
          "Authority records must be active before they can authorize governance action."
        )
      ];
}

function validateAuthorityScope(scope: {
  readonly orgRef?: ObjectRef;
  readonly placeRef?: ObjectRef;
  readonly commonsRef?: ObjectRef;
  readonly livingSystemRef?: ObjectRef;
  readonly targetRefs?: readonly ObjectRef[];
  readonly capability?: unknown;
  readonly actionKeys?: readonly string[];
}): readonly GovernanceAuthorityValidationIssue[] {
  const hasScope =
    scope.orgRef !== undefined ||
    scope.placeRef !== undefined ||
    scope.commonsRef !== undefined ||
    scope.livingSystemRef !== undefined ||
    (scope.targetRefs?.length ?? 0) > 0 ||
    scope.capability !== undefined ||
    (scope.actionKeys?.length ?? 0) > 0;

  return hasScope
    ? []
    : [
        issue(
          "authority-empty-scope",
          "Authority records must define an organization, place, commons, living system, target, capability, or action scope."
        )
      ];
}

function validateDecisionMethodAuthority(
  method: DecisionMethodConfig
): readonly GovernanceAuthorityValidationIssue[] {
  const issues: GovernanceAuthorityValidationIssue[] = [];

  if (
    method.kind !== "delegated_authority" &&
    method.kind !== "guardian_review" &&
    method.kind !== "emergency_authority" &&
    method.eligibleVoterRefs.length === 0
  ) {
    issues.push(
      issue(
        "proposal-missing-eligible-voters",
        "Participatory decision methods require eligibleVoterRefs."
      )
    );
  }

  if (
    method.guardianReviewRequired &&
    method.kind !== "guardian_review" &&
    !method.authorityRefs.some(isGuardianAuthorityRef)
  ) {
    issues.push(
      issue(
        "authority-missing-authority",
        "Decision methods that require guardian review must cite guardian authority."
      )
    );
  }

  if (method.kind === "emergency_authority") {
    issues.push(
      ...validateEmergencyAuthority(true, method.authorityRefs, [method.notes].filter(isString))
    );
  }

  return issues;
}

function validateEmergencyAuthority(
  emergency: boolean,
  authorityRefs: readonly ObjectRef[],
  conditions: readonly string[] | undefined
): readonly GovernanceAuthorityValidationIssue[] {
  if (!emergency) {
    return [];
  }

  const issues: GovernanceAuthorityValidationIssue[] = [];

  if (!authorityRefs.some(isEmergencyAuthorityRef)) {
    issues.push(
      issue(
        "emergency-missing-authority",
        "Emergency authority actions must cite an emergency mandate or emergency authority ref."
      )
    );
  }

  if ((conditions ?? []).filter((condition) => condition.trim().length > 0).length === 0) {
    issues.push(
      issue(
        "emergency-missing-constraints",
        "Emergency authority actions must preserve explicit conditions, limits, or review notes."
      )
    );
  }

  return issues;
}

function validateNonMembershipAuthority(
  authorityRefs: readonly ObjectRef[],
  overrides: {
    readonly missingCode?: GovernanceCommandErrorCode;
    readonly missingMessage?: string;
    readonly membershipOnlyCode?: GovernanceCommandErrorCode;
    readonly membershipOnlyMessage?: string;
  } = {}
): readonly GovernanceAuthorityValidationIssue[] {
  if (authorityRefs.length === 0) {
    return [
      issue(
        overrides.missingCode ?? "authority-missing-authority",
        overrides.missingMessage ?? "Authority-changing governance actions require explicit authorityRefs."
      )
    ];
  }

  if (authorityRefs.every(isMembershipAuthorityRef)) {
    return [
      issue(
        overrides.membershipOnlyCode ?? "authority-membership-only",
        overrides.membershipOnlyMessage ?? "Membership cannot be the only authority basis for governance action."
      )
    ];
  }

  return [];
}

function result(
  issues: readonly GovernanceAuthorityValidationIssue[]
): GovernanceAuthorityValidationResult {
  return {
    valid: issues.length === 0,
    issues
  };
}

function issue(
  code: GovernanceCommandErrorCode,
  message: string
): GovernanceAuthorityValidationIssue {
  return { code, message };
}

function compactRefs(
  refs: readonly (ObjectRef | undefined)[]
): readonly ObjectRef[] {
  return refs.filter((ref): ref is ObjectRef => ref !== undefined);
}

function uniqueRefs(
  refs: readonly (ObjectRef | undefined)[]
): readonly ObjectRef[] {
  const seen = new Set<CanopyId>();
  const unique: ObjectRef[] = [];

  for (const ref of refs) {
    if (ref === undefined || seen.has(ref.id)) {
      continue;
    }

    seen.add(ref.id);
    unique.push(ref);
  }

  return unique;
}

function defaultEventId(objectRef: ObjectRef, type: CanopyEventType): CanopyId {
  return `${objectRef.id}:event:${type}`;
}

function isGuardianAuthorityRef(ref: ObjectRef): boolean {
  return ref.type === "guardian-review" || ref.id.includes("guardian");
}

function isEmergencyAuthorityRef(ref: ObjectRef): boolean {
  return ref.type === "mandate" && ref.id.includes("emergency");
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.namespace === right.namespace
  );
}

function isString(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}
