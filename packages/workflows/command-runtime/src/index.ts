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
  createProposal,
  recordDecision,
  type CreateProposalCommand,
  type RecordDecisionCommand
} from "@canopy/capabilities-governance";
import {
  createResource,
  grantUseRight,
  type CreateResourceCommand,
  type GrantUseRightCommand
} from "@canopy/capabilities-stewardship";
import {
  postLedgerEntry,
  type PostLedgerEntryCommand
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

export function createResourceCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<CreateResourceCommand> {
  return (command) => createResource(services, command).append.event;
}

export function grantUseRightCommandHandler(
  services: CanopyCommandServices
): CanopyCommandHandler<GrantUseRightCommand> {
  return (command) => grantUseRight(services, command).append.event;
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

export function executeCreateResourceCommand(
  input: ExecuteCanonicalCanopyCommandInput<CreateResourceCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: createResourceCommandHandler(input.services)
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

export function executePostLedgerEntryCommand(
  input: ExecuteCanonicalCanopyCommandInput<PostLedgerEntryCommand>
): Promise<ExecuteCanopyCommandResult> {
  return executeCanopyCommand({
    ...input,
    handle: postLedgerEntryCommandHandler(input.services)
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
