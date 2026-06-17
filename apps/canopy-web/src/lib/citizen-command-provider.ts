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

export interface CitizenCommandStorageRecord {
  readonly commandId: string;
  readonly commandType: CitizenCommandType;
  readonly status: CitizenCommandStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly payload: CitizenCommandStoragePayload;
  readonly statusHistory: readonly CitizenCommandStatusHistoryEntry[];
}

export interface CitizenCommandStoragePayload {
  readonly label: string;
  readonly contextLabel: string;
  readonly reviewOwner: string;
  readonly submittedBy: string;
  readonly visibility: CitizenVisibilityPreference | "public-summary";
  readonly civicMemoryEffect: string;
  readonly reviewActionLabel: string;
  readonly dueLabel: string;
}

export interface CitizenCommandStatusHistoryEntry {
  readonly status: CitizenCommandStatus;
  readonly changedAt: string;
}

export interface CitizenCommandRepository {
  list(): readonly CitizenCommandStorageRecord[];
  upsert(record: CitizenCommandStorageRecord): void;
  get(commandId: string): CitizenCommandStorageRecord | undefined;
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

export function createMemoryCitizenCommandRepository({
  initialRecords = []
}: {
  readonly initialRecords?: readonly CitizenCommandStorageRecord[];
} = {}): CitizenCommandRepository {
  const recordsById = new Map<string, CitizenCommandStorageRecord>(
    initialRecords.map((record) => [record.commandId, record])
  );

  return {
    list() {
      return Array.from(recordsById.values());
    },
    upsert(record) {
      recordsById.set(record.commandId, record);
    },
    get(commandId) {
      return recordsById.get(commandId);
    }
  };
}

export function createPersistentCitizenCommandProvider({
  repository,
  now = () => new Date().toISOString()
}: {
  readonly repository: CitizenCommandRepository;
  readonly now?: () => string;
}): CitizenCommandProvider {
  return {
    listCommands() {
      return repository.list().map(commandFromStorageRecord);
    },
    saveDraft(input) {
      const timestamp = now();
      const record: CitizenCommandStorageRecord = {
        commandId: input.id,
        commandType: input.type,
        status: "draft",
        createdAt: timestamp,
        updatedAt: timestamp,
        payload: storagePayloadFromInput(input),
        statusHistory: [
          {
            status: "draft",
            changedAt: timestamp
          }
        ]
      };

      repository.upsert(record);

      return commandFromStorageRecord(record);
    },
    submitCommand(commandId) {
      return updatePersistentStatus(repository, commandId, "submitted", now());
    },
    cancelCommand(commandId) {
      return updatePersistentStatus(repository, commandId, "cancelled", now());
    },
    moveToReview(commandId) {
      return updatePersistentStatus(repository, commandId, "needs-review", now());
    }
  };
}

export function createReportConcernCommandInput({
  contextLabel = "Riverbend Neighborhood",
  description
}: {
  readonly contextLabel?: string;
  readonly description?: string | undefined;
} = {}): CitizenCommandDraftInput {
  const label =
    description === undefined || description.trim().length === 0
      ? "Report concern from citizen form"
      : `Report: ${description.trim()}`;

  return {
    id: "command.report.generated-neighborhood-concern",
    label,
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

function storagePayloadFromInput(input: CitizenCommandDraftInput): CitizenCommandStoragePayload {
  return {
    label: input.label,
    contextLabel: input.contextLabel,
    reviewOwner: input.reviewOwner,
    submittedBy: input.submittedBy,
    visibility: input.visibility,
    civicMemoryEffect: input.civicMemoryEffect,
    reviewActionLabel: input.reviewActionLabel,
    dueLabel: input.dueLabel
  };
}

function commandFromStorageRecord(record: CitizenCommandStorageRecord): CitizenCommandRecord {
  return {
    id: record.commandId,
    label: record.payload.label,
    type: record.commandType,
    status: record.status,
    contextLabel: record.payload.contextLabel,
    reviewOwner: record.payload.reviewOwner,
    submittedBy: record.payload.submittedBy,
    visibility: record.payload.visibility,
    route: `/citizen/review-queue?command=${encodeURIComponent(record.commandId)}`,
    civicMemoryEffect: record.payload.civicMemoryEffect,
    reviewActionLabel: record.payload.reviewActionLabel,
    dueLabel: record.payload.dueLabel
  };
}

function updatePersistentStatus(
  repository: CitizenCommandRepository,
  commandId: string,
  status: CitizenCommandStatus,
  changedAt: string
): CitizenCommandRecord {
  const record = repository.get(commandId);

  if (record === undefined) {
    throw new Error(`Unknown citizen command: ${commandId}`);
  }

  const updated: CitizenCommandStorageRecord = {
    ...record,
    status,
    updatedAt: changedAt,
    statusHistory: [
      ...record.statusHistory,
      {
        status,
        changedAt
      }
    ]
  };

  repository.upsert(updated);

  return commandFromStorageRecord(updated);
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
