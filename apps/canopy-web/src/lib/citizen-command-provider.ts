import type {
  CitizenCommandRecord,
  CitizenCommandStatus,
  CitizenCommandType,
  CitizenVisibilityPreference
} from "./citizen-data";

export interface CitizenCommandDraftInput {
  readonly id: string;
  readonly label: string;
  readonly type: CitizenCommandType;
  readonly contextLabel: string;
  readonly reviewOwner: string;
  readonly submittedBy: string;
  readonly visibility: CitizenVisibilityPreference | "public-summary";
  readonly civicMemoryEffect: string;
  readonly reviewActionLabel: string;
  readonly dueLabel: string;
}

export interface CitizenCommandProvider {
  listCommands(): readonly CitizenCommandRecord[];
  saveDraft(input: CitizenCommandDraftInput): CitizenCommandRecord;
  submitCommand(commandId: string): CitizenCommandRecord;
  cancelCommand(commandId: string): CitizenCommandRecord;
  moveToReview(commandId: string): CitizenCommandRecord;
}

export function createInMemoryCitizenCommandProvider({
  initialCommands = []
}: {
  readonly initialCommands?: readonly CitizenCommandRecord[];
} = {}): CitizenCommandProvider {
  const commandsById = new Map<string, CitizenCommandRecord>(
    initialCommands.map((command) => [command.id, command])
  );

  return {
    listCommands() {
      return Array.from(commandsById.values());
    },
    saveDraft(input) {
      const command = commandFromInput(input, "draft");
      commandsById.set(command.id, command);
      return command;
    },
    submitCommand(commandId) {
      const command = requireCommand(commandsById, commandId);
      const submitted = { ...command, status: "submitted" as const };
      commandsById.set(commandId, submitted);
      return submitted;
    },
    cancelCommand(commandId) {
      const command = requireCommand(commandsById, commandId);
      const cancelled = { ...command, status: "cancelled" as const };
      commandsById.set(commandId, cancelled);
      return cancelled;
    },
    moveToReview(commandId) {
      const command = requireCommand(commandsById, commandId);
      const review = { ...command, status: "needs-review" as const };
      commandsById.set(commandId, review);
      return review;
    }
  };
}

export function createReportConcernCommandInput({
  contextLabel = "Riverbend Neighborhood"
}: {
  readonly contextLabel?: string;
} = {}): CitizenCommandDraftInput {
  return {
    id: "command.report.generated-neighborhood-concern",
    label: "Report concern from citizen form",
    type: "report",
    contextLabel,
    reviewOwner: "Riverbend neighborhood reviewers",
    submittedBy: "resident",
    visibility: "commons-visible",
    civicMemoryEffect: "Creates a public concern record for review",
    reviewActionLabel: "Approve for review",
    dueLabel: "Before the next neighborhood review circle"
  };
}

export function createNeedOfferMatchCommandInput({
  needLabel,
  offerLabel
}: {
  readonly needLabel: string;
  readonly offerLabel: string;
}): CitizenCommandDraftInput {
  return {
    id: "command.match.generated-need-offer",
    label: `Match ${needLabel} with ${offerLabel}`,
    type: "match",
    contextLabel: "Riverbend Food Commons",
    reviewOwner: "Commons steward and school guardian reviewers",
    submittedBy: "commons steward",
    visibility: "role-restricted",
    civicMemoryEffect: "Creates a commitment review entry before any task is assigned",
    reviewActionLabel: "Send to guardian review",
    dueLabel: "This week"
  };
}

function commandFromInput(
  input: CitizenCommandDraftInput,
  status: CitizenCommandStatus
): CitizenCommandRecord {
  return {
    ...input,
    status,
    route: `/citizen/review-queue?command=${encodeURIComponent(input.id)}`
  };
}

function requireCommand(
  commandsById: ReadonlyMap<string, CitizenCommandRecord>,
  commandId: string
): CitizenCommandRecord {
  const command = commandsById.get(commandId);

  if (command === undefined) {
    throw new Error(`Unknown citizen command: ${commandId}`);
  }

  return command;
}
