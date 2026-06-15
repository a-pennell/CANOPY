import type {
  EventRecord,
  JsonValue,
  OutboxDestination,
  OutboxRecord
} from "@canopy/contracts-database";
import type { CanopyEvent, CanopyId, IsoDateTime } from "@canopy/contracts-kernel";
import type { CivicMemoryService } from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import {
  createClaim,
  linkEvidenceToClaim,
  type CreateClaimCommand,
  type LinkEvidenceToClaimCommand
} from "@canopy/capabilities-claims-evidence";
import {
  closeAppeal,
  createProposal,
  completeGuardianReview,
  openAppeal,
  raiseObjection,
  recordAppealRemedy,
  recordDecision,
  requestGuardianReview,
  reviewAppeal,
  submitAmendment,
  versionPolicy,
  type CloseAppealCommand,
  type CompleteGuardianReviewCommand,
  type CreateProposalCommand,
  type OpenAppealCommand,
  type RaiseObjectionCommand,
  type RecordAppealRemedyCommand,
  type RecordDecisionCommand,
  type RequestGuardianReviewCommand,
  type ReviewAppealCommand,
  type SubmitAmendmentCommand,
  type VersionPolicyCommand
} from "@canopy/capabilities-governance";
import {
  applyRedaction,
  requestRedaction,
  type ApplyRedactionCommand,
  type RequestRedactionCommand
} from "@canopy/capabilities-data-stewardship";
import {
  completeTask,
  createResource,
  createTask,
  grantUseRight,
  recordFoodFlow,
  revokeUseRight,
  type CompleteTaskCommand,
  type CreateResourceCommand,
  type CreateTaskCommand,
  type GrantUseRightCommand,
  type RecordFoodFlowCommand,
  type RevokeUseRightCommand
} from "@canopy/capabilities-stewardship";
import {
  createLivingSystem,
  createModelScenario,
  createThreshold,
  recordThresholdBreach,
  type CreateLivingSystemCommand,
  type CreateModelScenarioCommand,
  type CreateThresholdCommand,
  type RecordThresholdBreachCommand
} from "@canopy/capabilities-ecological-modeling";
import {
  completeLearningRetrospective,
  recordLearningOutcome,
  type CompleteLearningRetrospectiveCommand,
  type RecordLearningOutcomeCommand
} from "@canopy/capabilities-learning-accountability";
import {
  createCommitment,
  createNeed,
  createOffer,
  postLedgerEntry,
  reverseLedgerEntry,
  type CreateCommitmentCommand,
  type CreateNeedCommand,
  type CreateOfferCommand,
  type PostLedgerEntryCommand,
  type ReverseLedgerEntryCommand
} from "@canopy/capabilities-allocation-accounting";
import {
  buildPersistedCanopyShellSnapshot,
  type BuildPersistedCanopyShellSnapshotInput,
  type CanopyShellScope,
  type PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import {
  createPersistentOutbox,
  type OutboxRuntime
} from "@canopy/workflows-outbox";
import {
  rebuildAndPersistAllProjections,
  type PersistentProjectionRebuildResult
} from "@canopy/workflows-projection-rebuild";

export type CanopyCommandHandler<TCommand> = (
  command: TCommand
) => CanopyEvent | CommandEventResult | Promise<CanopyEvent | CommandEventResult>;

export interface CommandEventResult {
  readonly event: CanopyEvent;
}

export interface CanopyCommandServices {
  readonly registry: ObjectRegistry;
  readonly memory: CivicMemoryService;
}

export interface ExecuteCanopyCommandInput<TCommand> {
  readonly command: TCommand;
  readonly handle: CanopyCommandHandler<TCommand>;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox?: OutboxRuntime;
  readonly outboxDestination?: OutboxDestination;
  readonly shell?: ExecuteCanopyCommandShellOptions;
  readonly now?: IsoDateTime;
  readonly rebuildProjections?: boolean;
}

export interface ExecuteCanonicalCanopyCommandInput<TCommand>
  extends Omit<ExecuteCanopyCommandInput<TCommand>, "handle"> {
  readonly services: CanopyCommandServices;
}

export interface ExecuteCanopyCommandShellOptions
  extends Omit<BuildPersistedCanopyShellSnapshotInput, "runtime" | "rebuiltAt"> {
  readonly scope: CanopyShellScope;
}

export interface ExecuteCanopyCommandResult {
  readonly event: CanopyEvent;
  readonly eventRecord: EventRecord;
  readonly outboxRecord: OutboxRecord;
  readonly projectionRebuild?: PersistentProjectionRebuildResult;
  readonly shell?: PersistedCanopyShellSnapshotResult;
}

const defaultOutboxDestination: OutboxDestination = {
  kind: "workflow",
  name: "projection-rebuild"
};

export async function executeCanopyCommand<TCommand>(
  input: ExecuteCanopyCommandInput<TCommand>
): Promise<ExecuteCanopyCommandResult> {
  const handled = await input.handle(input.command);
  const event = "event" in handled ? handled.event : handled;
  const eventRecord = input.runtime.appendEvent(event);
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });
  const outboxRecord = outbox.enqueue({
    eventId: event.id,
    eventType: event.type,
    destination: input.outboxDestination ?? defaultOutboxDestination,
    payload: commandOutboxPayload(event),
    dedupeKey: `event:${event.id}:projection-rebuild`,
    createdAt: input.now ?? event.occurredAt
  });
  const projectionRebuild =
    input.rebuildProjections === false
      ? undefined
      : rebuildAndPersistAllProjections(input.runtime, {
          rebuiltAt: input.now ?? event.occurredAt
        });
  const shell =
    input.shell === undefined
      ? undefined
      : buildPersistedCanopyShellSnapshot({
          ...input.shell,
          runtime: input.runtime,
          rebuiltAt: input.now ?? event.occurredAt,
          persistProjectionState: false
        });

  return optionalCommandResult({
    event,
    eventRecord,
    outboxRecord,
    projectionRebuild,
    shell
  });
}

export function createClaimCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateClaimCommand> {
  return (command) => createClaim(services, command).event;
}

export function linkEvidenceToClaimCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<LinkEvidenceToClaimCommand> {
  return (command) => linkEvidenceToClaim(services, command).event;
}

export function createProposalCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateProposalCommand> {
  return (command) => createProposal(services, command).appendResult.event;
}

export const openProposalCommandHandler = createProposalCommandHandler;

export function recordDecisionCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RecordDecisionCommand> {
  return (command) => recordDecision(services, command).appendResult.event;
}

export function submitAmendmentCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<SubmitAmendmentCommand> {
  return (command) => submitAmendment(services, command).appendResult.event;
}

export function raiseObjectionCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RaiseObjectionCommand> {
  return (command) => raiseObjection(services, command).appendResult.event;
}

export function versionPolicyCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<VersionPolicyCommand> {
  return (command) => versionPolicy(services, command).appendResult.event;
}

export function requestGuardianReviewCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RequestGuardianReviewCommand> {
  return (command) => requestGuardianReview(services, command).appendResult.event;
}

export function completeGuardianReviewCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CompleteGuardianReviewCommand> {
  return (command) => completeGuardianReview(services, command).appendResult.event;
}

export function openAppealCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<OpenAppealCommand> {
  return (command) => openAppeal(services, command).appendResult.event;
}

export function reviewAppealCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<ReviewAppealCommand> {
  return (command) => reviewAppeal(services, command).appendResult.event;
}

export function recordAppealRemedyCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RecordAppealRemedyCommand> {
  return (command) => recordAppealRemedy(services, command).appendResult.event;
}

export function closeAppealCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CloseAppealCommand> {
  return (command) => closeAppeal(services, command).appendResult.event;
}

export function createThresholdCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateThresholdCommand> {
  return (command) => createThreshold(services, command).append.event;
}

export function createLivingSystemCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateLivingSystemCommand> {
  return (command) => createLivingSystem(services, command).append.event;
}

export function recordThresholdBreachCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RecordThresholdBreachCommand> {
  return (command) => recordThresholdBreach(services, command).append.event;
}

export function createModelScenarioCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateModelScenarioCommand> {
  return (command) => createModelScenario(services, command).append.event;
}

export function createResourceCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateResourceCommand> {
  return (command) => createResource(services, command).append.event;
}

export function createTaskCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateTaskCommand> {
  return (command) => createTask(services, command).append.event;
}

export function completeTaskCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CompleteTaskCommand> {
  return (command) => completeTask(services, command).append.event;
}

export function recordFoodFlowCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RecordFoodFlowCommand> {
  return (command) => recordFoodFlow(services, command).append.event;
}

export function grantUseRightCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<GrantUseRightCommand> {
  return (command) => grantUseRight(services, command).append.event;
}

export function revokeUseRightCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RevokeUseRightCommand> {
  return (command) => revokeUseRight(services, command).append.event;
}

export function recordLearningOutcomeCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RecordLearningOutcomeCommand> {
  return (command) => recordLearningOutcome(services, command).append.event;
}

export function completeLearningRetrospectiveCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CompleteLearningRetrospectiveCommand> {
  return (command) => completeLearningRetrospective(services, command).append.event;
}

export function postLedgerEntryCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<PostLedgerEntryCommand> {
  return (command) =>
    postLedgerEntry(
      {
        objectRegistry: services.registry,
        civicMemory: services.memory
      },
      command
    ).event;
}

export function requestRedactionCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<RequestRedactionCommand> {
  return (command) => requestRedaction(services, command).append.event;
}

export function applyRedactionCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<ApplyRedactionCommand> {
  return (command) => applyRedaction(services, command).append.event;
}

export function reverseLedgerEntryCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<ReverseLedgerEntryCommand> {
  return (command) =>
    reverseLedgerEntry(
      {
        objectRegistry: services.registry,
        civicMemory: services.memory
      },
      command
    ).event;
}

export function createNeedCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateNeedCommand> {
  return (command) =>
    createNeed(
      {
        objectRegistry: services.registry,
        civicMemory: services.memory
      },
      command
    ).event;
}

export function createOfferCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateOfferCommand> {
  return (command) =>
    createOffer(
      {
        objectRegistry: services.registry,
        civicMemory: services.memory
      },
      command
    ).event;
}

export function createCommitmentCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateCommitmentCommand> {
  return (command) =>
    createCommitment(
      {
        objectRegistry: services.registry,
        civicMemory: services.memory
      },
      command
    ).event;
}

export function executeCreateClaimCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateClaimCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createClaimCommandHandler(input.services)
  });
}

export function executeLinkEvidenceToClaimCommand(
  input: ExecuteCanonicalCanopyCommandInput<LinkEvidenceToClaimCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: linkEvidenceToClaimCommandHandler(input.services)
  });
}

export function executeCreateProposalCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateProposalCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createProposalCommandHandler(input.services)
  });
}

export const executeOpenProposalCommand = executeCreateProposalCommand;

export function executeRecordDecisionCommand(
  input: ExecuteCanonicalCanopyCommandInput<RecordDecisionCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: recordDecisionCommandHandler(input.services)
  });
}

export function executeSubmitAmendmentCommand(
  input: ExecuteCanonicalCanopyCommandInput<SubmitAmendmentCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: submitAmendmentCommandHandler(input.services)
  });
}

export function executeRaiseObjectionCommand(
  input: ExecuteCanonicalCanopyCommandInput<RaiseObjectionCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: raiseObjectionCommandHandler(input.services)
  });
}

export function executeVersionPolicyCommand(
  input: ExecuteCanonicalCanopyCommandInput<VersionPolicyCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: versionPolicyCommandHandler(input.services)
  });
}

export function executeRequestGuardianReviewCommand(
  input: ExecuteCanonicalCanopyCommandInput<RequestGuardianReviewCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: requestGuardianReviewCommandHandler(input.services)
  });
}

export function executeCompleteGuardianReviewCommand(
  input: ExecuteCanonicalCanopyCommandInput<CompleteGuardianReviewCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: completeGuardianReviewCommandHandler(input.services)
  });
}

export function executeOpenAppealCommand(
  input: ExecuteCanonicalCanopyCommandInput<OpenAppealCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: openAppealCommandHandler(input.services)
  });
}

export function executeReviewAppealCommand(
  input: ExecuteCanonicalCanopyCommandInput<ReviewAppealCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: reviewAppealCommandHandler(input.services)
  });
}

export function executeRecordAppealRemedyCommand(
  input: ExecuteCanonicalCanopyCommandInput<RecordAppealRemedyCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: recordAppealRemedyCommandHandler(input.services)
  });
}

export function executeCloseAppealCommand(
  input: ExecuteCanonicalCanopyCommandInput<CloseAppealCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: closeAppealCommandHandler(input.services)
  });
}

export function executeCreateThresholdCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateThresholdCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createThresholdCommandHandler(input.services)
  });
}

export function executeCreateLivingSystemCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateLivingSystemCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createLivingSystemCommandHandler(input.services)
  });
}

export function executeRecordThresholdBreachCommand(
  input: ExecuteCanonicalCanopyCommandInput<RecordThresholdBreachCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: recordThresholdBreachCommandHandler(input.services)
  });
}

export function executeCreateModelScenarioCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateModelScenarioCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createModelScenarioCommandHandler(input.services)
  });
}

export function executeCreateResourceCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateResourceCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createResourceCommandHandler(input.services)
  });
}

export function executeCreateTaskCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateTaskCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createTaskCommandHandler(input.services)
  });
}

export function executeCompleteTaskCommand(
  input: ExecuteCanonicalCanopyCommandInput<CompleteTaskCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: completeTaskCommandHandler(input.services)
  });
}

export function executeRecordFoodFlowCommand(
  input: ExecuteCanonicalCanopyCommandInput<RecordFoodFlowCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: recordFoodFlowCommandHandler(input.services)
  });
}

export function executeGrantUseRightCommand(
  input: ExecuteCanonicalCanopyCommandInput<GrantUseRightCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: grantUseRightCommandHandler(input.services)
  });
}

export function executeRevokeUseRightCommand(
  input: ExecuteCanonicalCanopyCommandInput<RevokeUseRightCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: revokeUseRightCommandHandler(input.services)
  });
}

export function executeRecordLearningOutcomeCommand(
  input: ExecuteCanonicalCanopyCommandInput<RecordLearningOutcomeCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: recordLearningOutcomeCommandHandler(input.services)
  });
}

export function executeCompleteLearningRetrospectiveCommand(
  input: ExecuteCanonicalCanopyCommandInput<CompleteLearningRetrospectiveCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: completeLearningRetrospectiveCommandHandler(input.services)
  });
}

export function executePostLedgerEntryCommand(
  input: ExecuteCanonicalCanopyCommandInput<PostLedgerEntryCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: postLedgerEntryCommandHandler(input.services)
  });
}

export function executeRequestRedactionCommand(
  input: ExecuteCanonicalCanopyCommandInput<RequestRedactionCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: requestRedactionCommandHandler(input.services)
  });
}

export function executeApplyRedactionCommand(
  input: ExecuteCanonicalCanopyCommandInput<ApplyRedactionCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: applyRedactionCommandHandler(input.services)
  });
}

export function executeReverseLedgerEntryCommand(
  input: ExecuteCanonicalCanopyCommandInput<ReverseLedgerEntryCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: reverseLedgerEntryCommandHandler(input.services)
  });
}

export function executeCreateNeedCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateNeedCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createNeedCommandHandler(input.services)
  });
}

export function executeCreateOfferCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateOfferCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createOfferCommandHandler(input.services)
  });
}

export function executeCreateCommitmentCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateCommitmentCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createCommitmentCommandHandler(input.services)
  });
}

function commandOutboxPayload(event: CanopyEvent): JsonValue {
  return {
    eventId: event.id,
    eventType: event.type,
    objectRefId: event.objectRef.id,
    sourceCapability: event.sourceCapability
  };
}

function optionalCommandResult(
  result: {
    readonly event: CanopyEvent;
    readonly eventRecord: EventRecord;
    readonly outboxRecord: OutboxRecord;
    readonly projectionRebuild: PersistentProjectionRebuildResult | undefined;
    readonly shell: PersistedCanopyShellSnapshotResult | undefined;
  }
): ExecuteCanopyCommandResult {
  const optionalFields: {
    projectionRebuild?: PersistentProjectionRebuildResult;
    shell?: PersistedCanopyShellSnapshotResult;
  } = {};

  if (result.projectionRebuild !== undefined) {
    optionalFields.projectionRebuild = result.projectionRebuild;
  }

  if (result.shell !== undefined) {
    optionalFields.shell = result.shell;
  }

  return {
    event: result.event,
    eventRecord: result.eventRecord,
    outboxRecord: result.outboxRecord,
    ...optionalFields
  };
}
