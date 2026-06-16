import type {
  AdapterAuditRecord,
  AdapterAuditStatus,
  JsonValue,
  OutboxDestination,
  OutboxRecord,
  OutboxStatus,
  ProjectionStateRecord
} from "@canopy/contracts-database";
import type { CanopyId, IsoDateTime, ObjectRef } from "@canopy/contracts-kernel";
import type {
  CanonicalPersistenceRuntime,
  CanonicalRecordCounts
} from "@canopy/database-runtime";
import {
  buildPersistedCanopyShellSnapshot,
  type CanopyShellMode,
  type CanopyShellScope,
  type PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import {
  createPersistentOutbox,
  retryOutboxRecords,
  runOutboxWorker,
  type OutboxRuntime,
  type OutboxWorkerResult
} from "@canopy/workflows-outbox";
import {
  rebuildAndPersistAllProjections,
  requestProjectionRebuild,
  type MaterializedProjectionStore,
  type PersistentProjectionRebuildResult,
  type ProjectionRebuilderName
} from "@canopy/workflows-projection-rebuild";

export type CanopyOperationsReadiness =
  | "ready"
  | "attention"
  | "blocked";

export interface CanopyOutboxOperationsSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<OutboxStatus, number>>;
  readonly drainStatus: CanopyOutboxDrainStatus;
  readonly readyToLease: number;
  readonly delayed: number;
  readonly expiredLeases: number;
  readonly exhaustedFailures: number;
  readonly leasedRecordIds: readonly CanopyId[];
  readonly publishedRecordIds: readonly CanopyId[];
  readonly pendingRecordIds: readonly CanopyId[];
  readonly failedRecordIds: readonly CanopyId[];
  readonly retryableFailedRecordIds: readonly CanopyId[];
  readonly exhaustedFailureRecordIds: readonly CanopyId[];
  readonly expiredLeaseRecordIds: readonly CanopyId[];
  readonly deadLetteredRecordIds: readonly CanopyId[];
}

export type CanopyOutboxDrainStatus =
  | "drained"
  | "ready"
  | "waiting"
  | "blocked";

export interface CanopyProjectionOperationsSummary {
  readonly states: readonly ProjectionStateRecord[];
  readonly expectedProjectionNames: readonly string[];
  readonly rebuildStatus: CanopyProjectionRebuildStatus;
  readonly rebuildable: boolean;
  readonly currentStateIds: readonly CanopyId[];
  readonly rebuildingStateIds: readonly CanopyId[];
  readonly pausedStateIds: readonly CanopyId[];
  readonly staleStateIds: readonly CanopyId[];
  readonly failedStateIds: readonly CanopyId[];
  readonly requestedRebuildStateIds: readonly CanopyId[];
  readonly currentProjectionNames: readonly string[];
  readonly staleProjectionNames: readonly string[];
  readonly failedProjectionNames: readonly string[];
  readonly missingProjectionNames: readonly string[];
  readonly lastRebuiltAtByName: readonly CanopyProjectionRebuildTimestamp[];
}

export type CanopyProjectionRebuildStatus =
  | "current"
  | "needs-rebuild"
  | "rebuilding"
  | "paused"
  | "blocked";

export interface CanopyProjectionRebuildTimestamp {
  readonly projectionName: string;
  readonly rebuiltAt: IsoDateTime;
}

export interface CanopyShellOperationsSummary {
  readonly activeMode: CanopyShellMode;
  readonly sourceEventIds: readonly CanopyId[];
  readonly attentionCount: number;
  readonly commandCount: number;
  readonly projectionReadCount: number;
  readonly surfaceKinds: readonly string[];
}

export interface CanopyOperationsHealthSummary {
  readonly status: CanopyOperationsReadiness;
  readonly generatedAt: IsoDateTime;
  readonly blockerCount: number;
  readonly attentionCount: number;
  readonly alertCount: number;
}

export type CanopyOperationalReadinessCheckStatus =
  | CanopyOperationsReadiness
  | "not-observed";

export interface CanopyOperationalReadinessCheck {
  readonly id: string;
  readonly status: CanopyOperationalReadinessCheckStatus;
  readonly message: string;
  readonly evidenceIds: readonly CanopyId[];
}

export interface CanopyOperationalReadinessChecks {
  readonly replayFreshness: CanopyOperationalReadinessCheck;
  readonly projectionLag: CanopyOperationalReadinessCheck;
  readonly outboxBacklog: CanopyOperationalReadinessCheck;
  readonly adapterAuditHealth: CanopyOperationalReadinessCheck;
  readonly federationHealth: CanopyOperationalReadinessCheck;
}

export interface CanopyAdapterAuditReviewSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<AdapterAuditStatus, number>>;
  readonly failedAuditIds: readonly CanopyId[];
  readonly partialAuditIds: readonly CanopyId[];
  readonly warningAuditIds: readonly CanopyId[];
  readonly unresolvedAuditIds: readonly CanopyId[];
  readonly latestCompletedAt?: IsoDateTime;
}

export type CanopyFailedImportRemediationSeverity =
  | "retry"
  | "review"
  | "blocked";

export interface CanopyFailedImportRemediationItem {
  readonly id: CanopyId;
  readonly source: "adapter-audit" | "outbox";
  readonly severity: CanopyFailedImportRemediationSeverity;
  readonly adapterName?: string;
  readonly operation?: string;
  readonly status: string;
  readonly eventIds: readonly CanopyId[];
  readonly outboxIds: readonly CanopyId[];
  readonly action: string;
}

export interface CanopyFailedImportRemediationSummary {
  readonly total: number;
  readonly blockedCount: number;
  readonly items: readonly CanopyFailedImportRemediationItem[];
}

export type CanopyInvariantDriftLevel = "warning" | "critical";

export interface CanopyInvariantDriftAlert {
  readonly id: CanopyId;
  readonly level: CanopyInvariantDriftLevel;
  readonly invariant: string;
  readonly message: string;
  readonly evidenceIds: readonly CanopyId[];
  readonly action: string;
}

export interface CanopyOperationsReport {
  readonly generatedAt: IsoDateTime;
  readonly readiness: CanopyOperationsReadiness;
  readonly health: CanopyOperationsHealthSummary;
  readonly counts: CanonicalRecordCounts;
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
  readonly readinessChecks: CanopyOperationalReadinessChecks;
  readonly adapterAudits: readonly AdapterAuditRecord[];
  readonly failedImportRemediation: CanopyFailedImportRemediationSummary;
  readonly invariantDriftAlerts: readonly CanopyInvariantDriftAlert[];
  readonly shell?: CanopyShellOperationsSummary;
  readonly findings: readonly string[];
}

export interface BuildCanopyOperationsReportInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly generatedAt: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly shell?: PersistedCanopyShellSnapshotResult;
  readonly expectedProjectionNames?: readonly string[];
  readonly leaseTimeoutMs?: number;
}

export interface RunCanopyOperationsCycleInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly scope: CanopyShellScope;
  readonly workerId: string;
  readonly now: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly selectedObjectRef?: ObjectRef;
  readonly activeMode?: CanopyShellMode;
  readonly workerLimit?: number;
  readonly leaseTimeoutMs?: number;
}

export interface CanopyOperationsCycleResult {
  readonly worker: OutboxWorkerResult;
  readonly shell: PersistedCanopyShellSnapshotResult;
  readonly report: CanopyOperationsReport;
}

export interface DrainCanopyOutboxControlInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly workerId: string;
  readonly now: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly destination?: OutboxDestination;
  readonly workerLimit?: number;
  readonly leaseDurationMs?: number;
  readonly leaseTimeoutMs?: number;
  readonly expectedProjectionNames?: readonly string[];
}

export interface CanopyOutboxDrainControlResult {
  readonly worker: OutboxWorkerResult;
  readonly report: CanopyOperationsReport;
}

export interface RunCanopyProjectionRebuildControlInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly rebuiltAt: IsoDateTime;
  readonly materializedProjections?: MaterializedProjectionStore;
  readonly objectRefs?: readonly ObjectRef[];
  readonly resourceRefs?: readonly ObjectRef[];
  readonly decisionRefs?: readonly ObjectRef[];
  readonly outbox?: OutboxRuntime;
  readonly expectedProjectionNames?: readonly string[];
  readonly leaseTimeoutMs?: number;
}

export interface CanopyProjectionRebuildControlResult {
  readonly projectionRebuild: PersistentProjectionRebuildResult;
  readonly report: CanopyOperationsReport;
}

export type CanopyOperationsRemediationCommandType =
  | "retry-failed-outbox"
  | "request-projection-rebuild"
  | "quarantine-failed-import"
  | "acknowledge-adapter-audit-failure"
  | "create-invariant-drift-ticket";

export type CanopyOperationsRemediationCommand =
  | RetryFailedOutboxCommand
  | RequestProjectionRebuildCommand
  | QuarantineFailedImportCommand
  | AcknowledgeAdapterAuditFailureCommand
  | CreateInvariantDriftTicketCommand;

export interface CanopyOperationsRemediationCommandBase {
  readonly id: CanopyId;
  readonly type: CanopyOperationsRemediationCommandType;
  readonly createdAt: IsoDateTime;
  readonly reason: string;
  readonly evidenceIds: readonly CanopyId[];
}

export interface RetryFailedOutboxCommand
  extends CanopyOperationsRemediationCommandBase {
  readonly type: "retry-failed-outbox";
  readonly outboxRecordIds: readonly CanopyId[];
  readonly resetAttemptCount: boolean;
}

export interface RequestProjectionRebuildCommand
  extends CanopyOperationsRemediationCommandBase {
  readonly type: "request-projection-rebuild";
  readonly projectionNames: readonly ProjectionRebuilderName[];
}

export interface QuarantineFailedImportCommand
  extends CanopyOperationsRemediationCommandBase {
  readonly type: "quarantine-failed-import";
  readonly remediationItemIds: readonly CanopyId[];
  readonly adapterAuditIds: readonly CanopyId[];
  readonly outboxRecordIds: readonly CanopyId[];
}

export interface AcknowledgeAdapterAuditFailureCommand
  extends CanopyOperationsRemediationCommandBase {
  readonly type: "acknowledge-adapter-audit-failure";
  readonly adapterAuditIds: readonly CanopyId[];
}

export interface CreateInvariantDriftTicketCommand
  extends CanopyOperationsRemediationCommandBase {
  readonly type: "create-invariant-drift-ticket";
  readonly alertId: CanopyId;
  readonly level: CanopyInvariantDriftLevel;
  readonly invariant: string;
  readonly message: string;
}

export interface CanopyOperationsRemediationPlan {
  readonly generatedAt: IsoDateTime;
  readonly reportGeneratedAt: IsoDateTime;
  readonly commands: readonly CanopyOperationsRemediationCommand[];
}

export type CanopyOperationsRemediationCommandStatus =
  | "applied"
  | "skipped"
  | "failed";

export interface CanopyOperationsRemediationCommandResult {
  readonly commandId: CanopyId;
  readonly type: CanopyOperationsRemediationCommandType;
  readonly status: CanopyOperationsRemediationCommandStatus;
  readonly changedRecordIds: readonly CanopyId[];
  readonly skippedRecordIds: readonly CanopyId[];
  readonly error?: string;
}

export interface BuildCanopyOperationsRemediationPlanInput {
  readonly report: CanopyOperationsReport;
  readonly generatedAt?: IsoDateTime;
}

export interface ExecuteCanopyOperationsRemediationCommandsInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly commands: readonly CanopyOperationsRemediationCommand[];
  readonly now: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly expectedProjectionNames?: readonly string[];
  readonly leaseTimeoutMs?: number;
}

export interface CanopyOperationsRemediationResult {
  readonly commands: readonly CanopyOperationsRemediationCommandResult[];
  readonly report: CanopyOperationsReport;
}

const expectedProjectionNames = [
  "object-page",
  "civic-memory",
  "authority",
  "claim-evidence",
  "resource-stewardship",
  "decision-packet",
  "federation-export"
] as const;

export function buildCanopyOperationsReport(
  input: BuildCanopyOperationsReportInput
): CanopyOperationsReport {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });
  const outboxRecords = outbox.list();
  const outboxSummary = summarizeOutbox(outbox, outboxRecords, {
    now: input.generatedAt,
    ...optionalLeaseTimeout(input.leaseTimeoutMs)
  });
  const projections = summarizeProjections(
    input.runtime.listProjectionStates(),
    input.expectedProjectionNames ?? expectedProjectionNames
  );
  const adapterAudits = input.runtime.listAdapterAudits();
  const adapterAuditReview = summarizeAdapterAudits(adapterAudits);
  const failedImportRemediation = summarizeFailedImportRemediation(
    adapterAudits,
    outboxRecords
  );
  const counts = input.runtime.counts();
  const readinessChecks = summarizeReadinessChecks({
    counts,
    outbox: outboxSummary,
    outboxRecords,
    projections,
    adapterAuditReview,
    adapterAudits
  });
  const invariantDriftAlerts = collectInvariantDriftAlerts({
    counts,
    outbox: outboxSummary,
    projections,
    adapterAuditReview,
    failedImportRemediation
  });
  const shell = input.shell === undefined ? undefined : summarizeShell(input.shell);
  const findings = collectFindings({
    outbox: outboxSummary,
    projections,
    adapterAuditReview,
    readinessChecks,
    failedImportRemediation,
    invariantDriftAlerts,
    adapterAudits,
    ...optionalReportShell(shell)
  });
  const readiness = readinessForFindings(findings);

  return optionalOperationsReport({
    generatedAt: input.generatedAt,
    readiness,
    health: summarizeHealth(input.generatedAt, readiness, invariantDriftAlerts, findings),
    counts,
    outbox: outboxSummary,
    projections,
    adapterAuditReview,
    readinessChecks,
    adapterAudits,
    failedImportRemediation,
    invariantDriftAlerts,
    shell,
    findings
  });
}

export async function runCanopyOperationsCycle(
  input: RunCanopyOperationsCycleInput
): Promise<CanopyOperationsCycleResult> {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });
  const worker = await runOutboxWorker({
    runtime: input.runtime,
    outbox,
    workerId: input.workerId,
    now: input.now,
    ...optionalWorkerLimit(input.workerLimit)
  });
  const shell = buildPersistedCanopyShellSnapshot({
    runtime: input.runtime,
    scope: input.scope,
    rebuiltAt: input.now,
    persistProjectionState: false,
    ...optionalSelectedObject(input.selectedObjectRef),
    ...optionalActiveMode(input.activeMode)
  });
  const report = buildCanopyOperationsReport({
    runtime: input.runtime,
    generatedAt: input.now,
    outbox,
    shell,
    ...optionalLeaseTimeout(input.leaseTimeoutMs)
  });

  return { worker, shell, report };
}

export async function drainCanopyOutboxControl(
  input: DrainCanopyOutboxControlInput
): Promise<CanopyOutboxDrainControlResult> {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });
  const worker = await runOutboxWorker({
    runtime: input.runtime,
    outbox,
    workerId: input.workerId,
    now: input.now,
    ...optionalWorkerLimit(input.workerLimit),
    ...optionalLeaseDuration(input.leaseDurationMs),
    ...optionalDestination(input.destination)
  });
  const report = buildCanopyOperationsReport({
    runtime: input.runtime,
    generatedAt: input.now,
    outbox,
    ...optionalExpectedProjectionNames(input.expectedProjectionNames),
    ...optionalLeaseTimeout(input.leaseTimeoutMs)
  });

  return { worker, report };
}

export function runCanopyProjectionRebuildControl(
  input: RunCanopyProjectionRebuildControlInput
): CanopyProjectionRebuildControlResult {
  const projectionRebuild = rebuildAndPersistAllProjections(input.runtime, {
    rebuiltAt: input.rebuiltAt,
    ...optionalMaterializedProjections(input.materializedProjections),
    ...optionalObjectRefs(input.objectRefs),
    ...optionalResourceRefs(input.resourceRefs),
    ...optionalDecisionRefs(input.decisionRefs)
  });
  const report = buildCanopyOperationsReport({
    runtime: input.runtime,
    generatedAt: input.rebuiltAt,
    ...optionalReportOutbox(input.outbox),
    ...optionalExpectedProjectionNames(input.expectedProjectionNames),
    ...optionalLeaseTimeout(input.leaseTimeoutMs)
  });

  return { projectionRebuild, report };
}

export function buildCanopyOperationsRemediationPlan(
  input: BuildCanopyOperationsRemediationPlanInput
): CanopyOperationsRemediationPlan {
  const generatedAt = input.generatedAt ?? input.report.generatedAt;
  const commands = [
    retryFailedOutboxCommand(input.report, generatedAt),
    requestProjectionRebuildCommand(input.report, generatedAt),
    quarantineFailedImportCommand(input.report, generatedAt),
    acknowledgeAdapterAuditFailureCommand(input.report, generatedAt),
    ...createInvariantDriftTicketCommands(input.report, generatedAt)
  ].filter(isDefined);

  return {
    generatedAt,
    reportGeneratedAt: input.report.generatedAt,
    commands
  };
}

export function executeCanopyOperationsRemediationCommands(
  input: ExecuteCanopyOperationsRemediationCommandsInput
): CanopyOperationsRemediationResult {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });
  const results = input.commands.map((command) =>
    executeCanopyOperationsRemediationCommand({
      runtime: input.runtime,
      outbox,
      command,
      now: input.now
    })
  );
  const report = buildCanopyOperationsReport({
    runtime: input.runtime,
    generatedAt: input.now,
    outbox,
    ...optionalExpectedProjectionNames(input.expectedProjectionNames),
    ...optionalLeaseTimeout(input.leaseTimeoutMs)
  });

  return { commands: results, report };
}

function retryFailedOutboxCommand(
  report: CanopyOperationsReport,
  createdAt: IsoDateTime
): RetryFailedOutboxCommand | undefined {
  const outboxRecordIds = report.outbox.retryableFailedRecordIds;
  if (outboxRecordIds.length === 0) {
    return undefined;
  }

  return {
    id: commandId("retry-failed-outbox", outboxRecordIds),
    type: "retry-failed-outbox",
    createdAt,
    reason: "Retry failed outbox messages that remain below their attempt ceiling.",
    evidenceIds: outboxRecordIds,
    outboxRecordIds,
    resetAttemptCount: false
  };
}

function requestProjectionRebuildCommand(
  report: CanopyOperationsReport,
  createdAt: IsoDateTime
): RequestProjectionRebuildCommand | undefined {
  const projectionNames = sortedProjectionNames([
    ...report.projections.missingProjectionNames,
    ...report.projections.staleProjectionNames,
    ...report.projections.failedProjectionNames,
    ...projectionNamesBehindEventLog(report)
  ]);
  if (projectionNames.length === 0) {
    return undefined;
  }

  return {
    id: commandId("request-projection-rebuild", projectionNames),
    type: "request-projection-rebuild",
    createdAt,
    reason: "Request projection rebuild for missing, stale, failed, or lagging states.",
    evidenceIds: [
      ...report.projections.missingProjectionNames,
      ...report.projections.staleStateIds,
      ...report.projections.failedStateIds
    ],
    projectionNames
  };
}

function quarantineFailedImportCommand(
  report: CanopyOperationsReport,
  createdAt: IsoDateTime
): QuarantineFailedImportCommand | undefined {
  const items = report.failedImportRemediation.items.filter(
    (item) => item.severity === "blocked"
  );
  if (items.length === 0) {
    return undefined;
  }

  const remediationItemIds = items.map((item) => item.id);
  const adapterAuditIds = dedupeStrings(
    items
      .filter((item) => item.source === "adapter-audit")
      .map((item) => item.id)
  );
  const outboxRecordIds = dedupeStrings(items.flatMap((item) => item.outboxIds));

  return {
    id: commandId("quarantine-failed-import", remediationItemIds),
    type: "quarantine-failed-import",
    createdAt,
    reason: "Quarantine blocked import failures before any further replay.",
    evidenceIds: remediationItemIds,
    remediationItemIds,
    adapterAuditIds,
    outboxRecordIds
  };
}

function acknowledgeAdapterAuditFailureCommand(
  report: CanopyOperationsReport,
  createdAt: IsoDateTime
): AcknowledgeAdapterAuditFailureCommand | undefined {
  const adapterAuditIds = dedupeStrings(report.adapterAuditReview.failedAuditIds);
  if (adapterAuditIds.length === 0) {
    return undefined;
  }

  return {
    id: commandId("acknowledge-adapter-audit-failure", adapterAuditIds),
    type: "acknowledge-adapter-audit-failure",
    createdAt,
    reason: "Acknowledge failed adapter audits after operator review.",
    evidenceIds: adapterAuditIds,
    adapterAuditIds
  };
}

function createInvariantDriftTicketCommands(
  report: CanopyOperationsReport,
  createdAt: IsoDateTime
): readonly CreateInvariantDriftTicketCommand[] {
  const ticketedAlertIds = new Set(
    report.adapterAudits
      .map((audit) => ticketedDriftAlertId(audit))
      .filter(isDefined)
  );

  return report.invariantDriftAlerts
    .filter((alert) => !ticketedAlertIds.has(alert.id))
    .map((alert) => ({
      id: commandId("create-invariant-drift-ticket", [alert.id]),
      type: "create-invariant-drift-ticket",
      createdAt,
      reason: "Create an operator ticket for invariant drift.",
      evidenceIds: alert.evidenceIds,
      alertId: alert.id,
      level: alert.level,
      invariant: alert.invariant,
      message: alert.message
    }));
}

function executeCanopyOperationsRemediationCommand(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox: OutboxRuntime;
  readonly command: CanopyOperationsRemediationCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  const result = executeCanopyOperationsRemediationCommandAction(input);
  writeCommandOutcomeAudit(input.runtime, {
    command: input.command,
    result,
    now: input.now
  });

  return result;
}

function executeCanopyOperationsRemediationCommandAction(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox: OutboxRuntime;
  readonly command: CanopyOperationsRemediationCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  try {
    switch (input.command.type) {
      case "retry-failed-outbox":
        return executeRetryFailedOutboxCommand({
          outbox: input.outbox,
          command: input.command,
          now: input.now
        });
      case "request-projection-rebuild":
        return executeRequestProjectionRebuildCommand({
          runtime: input.runtime,
          command: input.command,
          now: input.now
        });
      case "quarantine-failed-import":
        return executeQuarantineFailedImportCommand({
          runtime: input.runtime,
          outbox: input.outbox,
          command: input.command,
          now: input.now
        });
      case "acknowledge-adapter-audit-failure":
        return executeAcknowledgeAdapterAuditFailureCommand({
          runtime: input.runtime,
          command: input.command,
          now: input.now
        });
      case "create-invariant-drift-ticket":
        return executeCreateInvariantDriftTicketCommand({
          runtime: input.runtime,
          command: input.command,
          now: input.now
        });
    }
  } catch (error) {
    return failedCommandResult(input.command, error);
  }
}

function writeCommandOutcomeAudit(
  runtime: CanonicalPersistenceRuntime,
  input: {
    readonly command: CanopyOperationsRemediationCommand;
    readonly result: CanopyOperationsRemediationCommandResult;
    readonly now: IsoDateTime;
  }
): AdapterAuditRecord {
  return runtime.putAdapterAudit(
    operatorAudit({
      id: `adapter-audit.operations.command.${input.command.id}`,
      now: input.now,
      operation: "operations.remediation-command",
      status: commandAuditStatus(input.result.status),
      eventIds: [],
      outboxIds: commandOutboxIds(input.command),
      errors: input.result.error === undefined ? [] : [input.result.error],
      metadata: commandOutcomeMetadata(input)
    })
  );
}

function executeRetryFailedOutboxCommand(input: {
  readonly outbox: OutboxRuntime;
  readonly command: RetryFailedOutboxCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  const retry = retryOutboxRecords({
    outbox: input.outbox,
    recordIds: input.command.outboxRecordIds,
    now: input.now,
    resetAttemptCount: input.command.resetAttemptCount
  });

  return commandResult(input.command, {
    changedRecordIds: retry.retriedRecords.map((record) => record.id),
    skippedRecordIds: retry.skippedRecordIds
  });
}

function executeRequestProjectionRebuildCommand(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly command: RequestProjectionRebuildCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  const rebuild = requestProjectionRebuild({
    runtime: input.runtime,
    requestedAt: input.now,
    projectionNames: input.command.projectionNames,
    reason: input.command.reason
  });

  return commandResult(input.command, {
    changedRecordIds: rebuild.requestedStates.map((state) => state.id),
    skippedRecordIds: []
  });
}

function executeQuarantineFailedImportCommand(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox: OutboxRuntime;
  readonly command: QuarantineFailedImportCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  const changedRecordIds: CanopyId[] = [];
  const skippedRecordIds: CanopyId[] = [];

  for (const outboxRecordId of input.command.outboxRecordIds) {
    const record = input.outbox.get(outboxRecordId);
    if (
      record === undefined ||
      record.status === "acknowledged" ||
      record.status === "cancelled" ||
      record.status === "dead-lettered"
    ) {
      skippedRecordIds.push(outboxRecordId);
      continue;
    }

    changedRecordIds.push(input.outbox.cancel(outboxRecordId, input.now).id);
  }

  if (
    input.command.adapterAuditIds.length === 0 &&
    input.command.outboxRecordIds.length > 0 &&
    !hasQuarantinedOutboxAudit(input.runtime.listAdapterAudits(), input.command.outboxRecordIds)
  ) {
    changedRecordIds.push(
      input.runtime.putAdapterAudit(
        operatorAudit({
          id: `adapter-audit.operations.quarantine.${input.command.id}`,
          now: input.now,
          operation: "import.quarantine",
          status: "skipped",
          eventIds: [],
          outboxIds: input.command.outboxRecordIds,
          metadata: {
            quarantinedOutboxIds: input.command.outboxRecordIds,
            reason: input.command.reason
          }
        })
      ).id
    );
  }

  for (const auditId of input.command.adapterAuditIds) {
    if (hasQuarantineAudit(input.runtime.listAdapterAudits(), auditId)) {
      skippedRecordIds.push(auditId);
      continue;
    }

    changedRecordIds.push(
      input.runtime.putAdapterAudit(
        operatorAudit({
          id: `adapter-audit.operations.quarantine.${auditId}`,
          now: input.now,
          operation: "import.quarantine",
          status: "skipped",
          eventIds: [],
          outboxIds: input.command.outboxRecordIds,
          metadata: {
            remediatesAuditId: auditId,
            quarantinedOutboxIds: input.command.outboxRecordIds,
            reason: input.command.reason
          }
        })
      ).id
    );
  }

  return commandResult(input.command, { changedRecordIds, skippedRecordIds });
}

function executeAcknowledgeAdapterAuditFailureCommand(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly command: AcknowledgeAdapterAuditFailureCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  const changedRecordIds: CanopyId[] = [];
  const skippedRecordIds: CanopyId[] = [];

  for (const auditId of input.command.adapterAuditIds) {
    if (hasAcknowledgementAudit(input.runtime.listAdapterAudits(), auditId)) {
      skippedRecordIds.push(auditId);
      continue;
    }

    changedRecordIds.push(
      input.runtime.putAdapterAudit(
        operatorAudit({
          id: `adapter-audit.operations.acknowledge.${auditId}`,
          now: input.now,
          operation: "adapter-audit.acknowledge-failure",
          status: "skipped",
          eventIds: [],
          outboxIds: [],
          metadata: {
            remediatesAuditId: auditId,
            acknowledgedAuditId: auditId,
            reason: input.command.reason
          }
        })
      ).id
    );
  }

  return commandResult(input.command, { changedRecordIds, skippedRecordIds });
}

function executeCreateInvariantDriftTicketCommand(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly command: CreateInvariantDriftTicketCommand;
  readonly now: IsoDateTime;
}): CanopyOperationsRemediationCommandResult {
  if (hasDriftTicket(input.runtime.listAdapterAudits(), input.command.alertId)) {
    return commandResult(input.command, {
      changedRecordIds: [],
      skippedRecordIds: [input.command.alertId]
    });
  }

  const audit = input.runtime.putAdapterAudit(
    operatorAudit({
      id: `adapter-audit.operations.drift-ticket.${input.command.alertId}`,
      now: input.now,
      operation: "invariant-drift.ticket-created",
      status: "succeeded",
      eventIds: [],
      outboxIds: [],
      metadata: {
        driftAlertId: input.command.alertId,
        level: input.command.level,
        invariant: input.command.invariant,
        message: input.command.message,
        evidenceIds: input.command.evidenceIds
      }
    })
  );

  return commandResult(input.command, {
    changedRecordIds: [audit.id],
    skippedRecordIds: []
  });
}

function commandResult(
  command: CanopyOperationsRemediationCommand,
  input: {
    readonly changedRecordIds: readonly CanopyId[];
    readonly skippedRecordIds: readonly CanopyId[];
  }
): CanopyOperationsRemediationCommandResult {
  return {
    commandId: command.id,
    type: command.type,
    status: input.changedRecordIds.length === 0 ? "skipped" : "applied",
    changedRecordIds: input.changedRecordIds,
    skippedRecordIds: input.skippedRecordIds
  };
}

function failedCommandResult(
  command: CanopyOperationsRemediationCommand,
  error: unknown
): CanopyOperationsRemediationCommandResult {
  return optionalCommandError({
    commandId: command.id,
    type: command.type,
    status: "failed",
    changedRecordIds: [],
    skippedRecordIds: [],
    error: error instanceof Error ? error.message : String(error)
  });
}

function commandAuditStatus(
  status: CanopyOperationsRemediationCommandStatus
): AdapterAuditStatus {
  if (status === "applied") {
    return "succeeded";
  }
  if (status === "failed") {
    return "failed";
  }

  return "skipped";
}

function commandOutboxIds(
  command: CanopyOperationsRemediationCommand
): readonly CanopyId[] {
  if (
    command.type === "retry-failed-outbox" ||
    command.type === "quarantine-failed-import"
  ) {
    return command.outboxRecordIds;
  }

  return [];
}

function commandOutcomeMetadata(input: {
  readonly command: CanopyOperationsRemediationCommand;
  readonly result: CanopyOperationsRemediationCommandResult;
  readonly now: IsoDateTime;
}): JsonValue {
  return optionalMetadataError({
    commandId: input.command.id,
    commandType: input.command.type,
    commandCreatedAt: input.command.createdAt,
    executedAt: input.now,
    reason: input.command.reason,
    evidenceIds: input.command.evidenceIds,
    status: input.result.status,
    changedRecordIds: input.result.changedRecordIds,
    skippedRecordIds: input.result.skippedRecordIds,
    affectedProjectionStateIds: input.result.changedRecordIds.filter(isProjectionStateId),
    remediatedAdapterAuditIds: commandAdapterAuditIds(input.command),
    error: input.result.error
  });
}

function commandAdapterAuditIds(
  command: CanopyOperationsRemediationCommand
): readonly CanopyId[] {
  if (
    command.type === "quarantine-failed-import" ||
    command.type === "acknowledge-adapter-audit-failure"
  ) {
    return command.adapterAuditIds;
  }

  return [];
}

function isProjectionStateId(id: CanopyId): boolean {
  return id.startsWith("projection-state.");
}

function operatorAudit(input: {
  readonly id: CanopyId;
  readonly now: IsoDateTime;
  readonly operation: string;
  readonly status: AdapterAuditStatus;
  readonly eventIds: readonly CanopyId[];
  readonly outboxIds: readonly CanopyId[];
  readonly errors?: readonly string[];
  readonly metadata: JsonValue;
}): AdapterAuditRecord {
  return {
    id: input.id,
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: input.now,
    adapterName: "operations.operator",
    direction: "reconciliation",
    operation: input.operation,
    status: input.status,
    startedAt: input.now,
    completedAt: input.now,
    eventIds: input.eventIds,
    outboxIds: input.outboxIds,
    warnings: [],
    errors: input.errors ?? [],
    metadata: input.metadata
  };
}

function commandId(
  type: CanopyOperationsRemediationCommandType,
  evidenceIds: readonly string[]
): CanopyId {
  return `operations-command.${type}.${evidenceIds.join("+")}`;
}

function projectionNamesBehindEventLog(
  report: CanopyOperationsReport
): readonly string[] {
  return report.projections.states
    .filter(
      (state) =>
        state.status === "current" &&
        state.processedEventCount < report.counts.events
    )
    .map((state) => state.projectionName);
}

function sortedProjectionNames(
  names: readonly string[]
): readonly ProjectionRebuilderName[] {
  return dedupeStrings(names)
    .filter(isProjectionRebuilderName)
    .sort();
}

function dedupeStrings<TValue extends string>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}

function isProjectionRebuilderName(value: string): value is ProjectionRebuilderName {
  return expectedProjectionNames.includes(value as ProjectionRebuilderName);
}

function hasAcknowledgementAudit(
  audits: readonly AdapterAuditRecord[],
  auditId: CanopyId
): boolean {
  return audits.some((audit) => acknowledgedAuditId(audit) === auditId);
}

function hasQuarantineAudit(
  audits: readonly AdapterAuditRecord[],
  auditId: CanopyId
): boolean {
  return audits.some((audit) => quarantinedAuditId(audit) === auditId);
}

function hasQuarantinedOutboxAudit(
  audits: readonly AdapterAuditRecord[],
  outboxRecordIds: readonly CanopyId[]
): boolean {
  const remediatedOutboxIds = collectRemediatedOutboxIds(audits);

  return outboxRecordIds.every((id) => remediatedOutboxIds.has(id));
}

function hasDriftTicket(
  audits: readonly AdapterAuditRecord[],
  alertId: CanopyId
): boolean {
  return audits.some((audit) => ticketedDriftAlertId(audit) === alertId);
}

function summarizeOutbox(
  outbox: OutboxRuntime,
  records: readonly OutboxRecord[],
  options: {
    readonly now: IsoDateTime;
    readonly leaseTimeoutMs?: number;
  }
): CanopyOutboxOperationsSummary {
  const reconciliation = outbox.reconcile(
    optionalReconcileOptions(options.now, options.leaseTimeoutMs)
  );
  const exhaustedFailureRecordIds = recordIdsByPredicate(records, isExhaustedFailure);
  const expiredLeaseRecordIds = recordIdsByPredicate(records, (record) =>
    isExpiredLease(record, options.now, options.leaseTimeoutMs)
  );

  return {
    total: reconciliation.total,
    byStatus: reconciliation.byStatus,
    drainStatus: drainStatus({
      total: reconciliation.total,
      readyToLease: reconciliation.readyToLease,
      delayed: reconciliation.delayed,
      expiredLeases: reconciliation.expiredLeases,
      exhaustedFailures: reconciliation.exhaustedFailures,
      byStatus: reconciliation.byStatus
    }),
    readyToLease: reconciliation.readyToLease,
    delayed: reconciliation.delayed,
    expiredLeases: reconciliation.expiredLeases,
    exhaustedFailures: reconciliation.exhaustedFailures,
    leasedRecordIds: recordIdsByStatus(records, "leased"),
    publishedRecordIds: recordIdsByStatus(records, "published"),
    pendingRecordIds: recordIdsByStatus(records, "pending"),
    failedRecordIds: recordIdsByStatus(records, "failed"),
    retryableFailedRecordIds: recordIdsByPredicate(
      records,
      (record) => record.status === "failed" && !isExhaustedFailure(record)
    ),
    exhaustedFailureRecordIds,
    expiredLeaseRecordIds,
    deadLetteredRecordIds: recordIdsByStatus(records, "dead-lettered")
  };
}

function summarizeProjections(
  states: readonly ProjectionStateRecord[],
  expectedNames: readonly string[]
): CanopyProjectionOperationsSummary {
  const presentNames = new Set(states.map((state) => state.projectionName));
  const failedStateIds = states
    .filter((state) => state.status === "failed")
    .map((state) => state.id);
  const staleStateIds = states
    .filter((state) => state.status === "stale")
    .map((state) => state.id);
  const rebuildingStateIds = states
    .filter((state) => state.status === "rebuilding")
    .map((state) => state.id);
  const pausedStateIds = states
    .filter((state) => state.status === "paused")
    .map((state) => state.id);
  const missingProjectionNames = expectedNames.filter((name) => !presentNames.has(name));

  return {
    states,
    expectedProjectionNames: expectedNames,
    rebuildStatus: projectionRebuildStatus({
      missingProjectionNames,
      failedStateIds,
      staleStateIds,
      rebuildingStateIds,
      pausedStateIds
    }),
    rebuildable: failedStateIds.length === 0,
    currentStateIds: states
      .filter((state) => state.status === "current")
      .map((state) => state.id),
    rebuildingStateIds,
    pausedStateIds,
    staleStateIds,
    failedStateIds,
    requestedRebuildStateIds: states
      .filter((state) => state.rebuildRequestedAt !== undefined)
      .map((state) => state.id),
    currentProjectionNames: projectionNamesByStatus(states, "current"),
    staleProjectionNames: projectionNamesByStatus(states, "stale"),
    failedProjectionNames: projectionNamesByStatus(states, "failed"),
    missingProjectionNames,
    lastRebuiltAtByName: states
      .filter((state) => state.rebuiltAt !== undefined)
      .map((state) => ({
        projectionName: state.projectionName,
        rebuiltAt: state.rebuiltAt as IsoDateTime
      }))
  };
}

function summarizeShell(
  shell: PersistedCanopyShellSnapshotResult
): CanopyShellOperationsSummary {
  const surfaces = shell.snapshot.surfaces;

  return {
    activeMode: shell.snapshot.activeMode,
    sourceEventIds: shell.sourceEventIds,
    attentionCount: shell.snapshot.attention.length,
    commandCount: shell.snapshot.commands.length,
    projectionReadCount: shell.snapshot.projectionReads.length,
    surfaceKinds: optionalSurfaceKinds([
      surfaces.objectPage?.kind,
      surfaces.civicMemoryStream.kind,
      surfaces.sourceProvenancePanel.kind,
      surfaces.authorityTrace.kind,
      surfaces.importReview?.kind
    ])
  };
}

function summarizeAdapterAudits(
  audits: readonly AdapterAuditRecord[]
): CanopyAdapterAuditReviewSummary {
  const remediatedAuditIds = collectRemediatedAuditIds(audits);
  const unresolvedAudits = audits.filter(
    (audit) =>
      (audit.status === "started" ||
        audit.status === "failed" ||
        audit.status === "partial") &&
      !remediatedAuditIds.has(audit.id)
  );
  const completedAt = audits
    .map((audit) => audit.completedAt)
    .filter((value): value is IsoDateTime => value !== undefined)
    .sort();

  return optionalLatestCompletedAt({
    total: audits.length,
    byStatus: auditStatusCounts(audits),
    failedAuditIds: auditIdsByStatus(unresolvedAudits, "failed"),
    partialAuditIds: auditIdsByStatus(unresolvedAudits, "partial"),
    warningAuditIds: audits
      .filter((audit) => audit.warnings.length > 0 && !remediatedAuditIds.has(audit.id))
      .map((audit) => audit.id),
    unresolvedAuditIds: unresolvedAudits.map((audit) => audit.id),
    latestCompletedAt: completedAt.at(-1)
  });
}

function summarizeFailedImportRemediation(
  audits: readonly AdapterAuditRecord[],
  outboxRecords: readonly OutboxRecord[]
): CanopyFailedImportRemediationSummary {
  const remediatedAuditIds = collectRemediatedAuditIds(audits);
  const remediatedOutboxIds = collectRemediatedOutboxIds(audits);
  const auditItems = audits
    .filter((audit) => !remediatedAuditIds.has(audit.id))
    .filter((audit) => isImportAudit(audit) && isRemediableAudit(audit))
    .map(importAuditRemediationItem);
  const auditOutboxIds = new Set(auditItems.flatMap((item) => item.outboxIds));
  const outboxItems = outboxRecords
    .filter((record) => !remediatedOutboxIds.has(record.id))
    .filter((record) => isImportOutbox(record) && isRemediableOutbox(record))
    .filter((record) => !auditOutboxIds.has(record.id))
    .map(importOutboxRemediationItem);
  const items = [...auditItems, ...outboxItems];

  return {
    total: items.length,
    blockedCount: items.filter((item) => item.severity === "blocked").length,
    items
  };
}

function summarizeHealth(
  generatedAt: IsoDateTime,
  status: CanopyOperationsReadiness,
  alerts: readonly CanopyInvariantDriftAlert[],
  findings: readonly string[]
): CanopyOperationsHealthSummary {
  const blockerCount = alerts.filter((alert) => alert.level === "critical").length;

  return {
    status,
    generatedAt,
    blockerCount,
    attentionCount: findings.length + alerts.length - blockerCount,
    alertCount: alerts.length
  };
}

function summarizeReadinessChecks(input: {
  readonly counts: CanonicalRecordCounts;
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly outboxRecords: readonly OutboxRecord[];
  readonly projections: CanopyProjectionOperationsSummary;
  readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
  readonly adapterAudits: readonly AdapterAuditRecord[];
}): CanopyOperationalReadinessChecks {
  return {
    replayFreshness: summarizeReplayFreshness(input),
    projectionLag: summarizeProjectionLag(input),
    outboxBacklog: summarizeOutboxBacklog(input),
    adapterAuditHealth: summarizeAdapterAuditHealth(input.adapterAuditReview),
    federationHealth: summarizeFederationHealth(input)
  };
}

function summarizeReplayFreshness(input: {
  readonly counts: CanonicalRecordCounts;
  readonly projections: CanopyProjectionOperationsSummary;
}): CanopyOperationalReadinessCheck {
  const replayStates = input.projections.states.filter(isReplayProjectionState);
  if (replayStates.length === 0) {
    return readinessCheck({
      id: "readiness.replay-freshness",
      status: "not-observed",
      message: "No replay cursor state is available in the current data model.",
      evidenceIds: []
    });
  }

  const staleReplayStateIds = replayStates
    .filter((state) => state.processedEventCount < input.counts.events)
    .map((state) => state.id);

  return readinessCheck({
    id: "readiness.replay-freshness",
    status: staleReplayStateIds.length > 0 ? "attention" : "ready",
    message:
      staleReplayStateIds.length > 0
        ? "Replay cursor state lags the canonical event log."
        : "Replay cursor state covers the canonical event log.",
    evidenceIds: staleReplayStateIds
  });
}

function summarizeProjectionLag(input: {
  readonly counts: CanonicalRecordCounts;
  readonly projections: CanopyProjectionOperationsSummary;
}): CanopyOperationalReadinessCheck {
  const laggingStateIds = projectionStateIdsBehindEventLog(
    input.projections,
    input.counts.events
  );

  return readinessCheck({
    id: "readiness.projection-lag",
    status: laggingStateIds.length > 0 ? "attention" : "ready",
    message:
      laggingStateIds.length > 0
        ? "Projection checkpoints lag the canonical event log."
        : "Projection checkpoints cover the canonical event log.",
    evidenceIds: laggingStateIds
  });
}

function summarizeOutboxBacklog(input: {
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly outboxRecords: readonly OutboxRecord[];
}): CanopyOperationalReadinessCheck {
  const backlogRecordIds = input.outboxRecords
    .filter((record) => !isTerminalOutboxStatus(record.status))
    .map((record) => record.id);
  const status =
    input.outbox.drainStatus === "blocked"
      ? "blocked"
      : backlogRecordIds.length > 0
        ? "attention"
        : "ready";

  return readinessCheck({
    id: "readiness.outbox-backlog",
    status,
    message:
      backlogRecordIds.length > 0
        ? "Outbox contains work that has not reached a terminal state."
        : "Outbox has no open backlog.",
    evidenceIds: backlogRecordIds
  });
}

function summarizeAdapterAuditHealth(
  review: CanopyAdapterAuditReviewSummary
): CanopyOperationalReadinessCheck {
  const evidenceIds = dedupeStrings([
    ...review.failedAuditIds,
    ...review.partialAuditIds,
    ...review.warningAuditIds,
    ...review.unresolvedAuditIds
  ]);
  const status =
    review.failedAuditIds.length > 0
      ? "blocked"
      : evidenceIds.length > 0
        ? "attention"
        : "ready";

  return readinessCheck({
    id: "readiness.adapter-audit-health",
    status,
    message:
      evidenceIds.length > 0
        ? "Adapter audit records require operator review."
        : "Adapter audit records are resolved.",
    evidenceIds
  });
}

function summarizeFederationHealth(input: {
  readonly outboxRecords: readonly OutboxRecord[];
  readonly adapterAudits: readonly AdapterAuditRecord[];
}): CanopyOperationalReadinessCheck {
  const failedAuditIds = input.adapterAudits
    .filter((audit) => isFederationAudit(audit) && isRemediableAudit(audit))
    .map((audit) => audit.id);
  const blockedOutboxIds = input.outboxRecords
    .filter(isFederationOutbox)
    .filter(
      (record) =>
        record.status === "failed" ||
        record.status === "dead-lettered" ||
        isExhaustedFailure(record)
    )
    .map((record) => record.id);
  const pendingOutboxIds = input.outboxRecords
    .filter(isFederationOutbox)
    .filter((record) => !isTerminalOutboxStatus(record.status))
    .map((record) => record.id);
  const evidenceIds = dedupeStrings([
    ...failedAuditIds,
    ...blockedOutboxIds,
    ...pendingOutboxIds
  ]);
  const status =
    failedAuditIds.length > 0 || blockedOutboxIds.length > 0
      ? "blocked"
      : pendingOutboxIds.length > 0
        ? "attention"
        : "ready";

  return readinessCheck({
    id: "readiness.federation-health",
    status,
    message:
      status === "blocked"
        ? "Federation operations have failed or terminal dispatch records."
        : pendingOutboxIds.length > 0
          ? "Federation dispatch has pending work."
          : "Federation operations have no observed failures.",
    evidenceIds
  });
}

function readinessCheck(
  check: CanopyOperationalReadinessCheck
): CanopyOperationalReadinessCheck {
  return check;
}

function collectInvariantDriftAlerts(input: {
  readonly counts: CanonicalRecordCounts;
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
  readonly failedImportRemediation: CanopyFailedImportRemediationSummary;
}): readonly CanopyInvariantDriftAlert[] {
  const alerts: CanopyInvariantDriftAlert[] = [];

  if (input.projections.missingProjectionNames.length > 0) {
    alerts.push({
      id: "drift.projection-state.missing",
      level: "warning",
      invariant: "expected projections are materialized",
      message: "One or more expected projection states have not been built.",
      evidenceIds: input.projections.missingProjectionNames,
      action: "Run the projection rebuild control."
    });
  }

  if (input.projections.failedStateIds.length > 0) {
    alerts.push({
      id: "drift.projection-state.failed",
      level: "critical",
      invariant: "projection rebuilds finish without failed states",
      message: "Projection state contains failed rebuilds.",
      evidenceIds: input.projections.failedStateIds,
      action: "Review projection errors and rerun the rebuild control."
    });
  }

  const laggingProjectionIds = input.projections.states
    .filter(
      (state) =>
        state.status === "current" && state.processedEventCount < input.counts.events
    )
    .map((state) => state.id);
  if (laggingProjectionIds.length > 0) {
    alerts.push({
      id: "drift.projection-checkpoint.behind-event-log",
      level: "warning",
      invariant: "current projections cover the canonical event log",
      message: "Current projection checkpoints lag behind the event log count.",
      evidenceIds: laggingProjectionIds,
      action: "Rebuild projections from the canonical event log."
    });
  }

  if (
    input.outbox.deadLetteredRecordIds.length > 0 ||
    input.outbox.exhaustedFailureRecordIds.length > 0
  ) {
    alerts.push({
      id: "drift.outbox.terminal-failure",
      level: "critical",
      invariant: "outbox records stay recoverable until dispatched",
      message: "Outbox dispatch has terminal or exhausted failures.",
      evidenceIds: [
        ...input.outbox.deadLetteredRecordIds,
        ...input.outbox.exhaustedFailureRecordIds
      ],
      action: "Review failed payloads, then retry or dead-letter intentionally."
    });
  }

  if (input.adapterAuditReview.unresolvedAuditIds.length > 0) {
    alerts.push({
      id: "drift.adapter-audit.unresolved",
      level:
        input.adapterAuditReview.failedAuditIds.length > 0 ? "critical" : "warning",
      invariant: "adapter audits resolve to succeeded, skipped, or reviewed",
      message: "Adapter audits contain unresolved operations.",
      evidenceIds: input.adapterAuditReview.unresolvedAuditIds,
      action: "Review audit errors and record remediation before the next drain."
    });
  }

  if (input.failedImportRemediation.total > 0) {
    alerts.push({
      id: "drift.import-remediation.open",
      level: input.failedImportRemediation.blockedCount > 0 ? "critical" : "warning",
      invariant: "failed imports have explicit remediation",
      message: "Import failures or partial imports need operator action.",
      evidenceIds: input.failedImportRemediation.items.map((item) => item.id),
      action: "Use the remediation queue to retry, review, or block the import."
    });
  }

  const federationImportItems = input.failedImportRemediation.items.filter(
    (item) => item.operation === "federation.import.reconcile"
  );
  if (federationImportItems.length > 0) {
    alerts.push({
      id: "drift.federation-import.quarantine-open",
      level: federationImportItems.some((item) => item.severity === "blocked")
        ? "critical"
        : "warning",
      invariant: "federation imports resolve through explicit reconciliation",
      message: "Federation import reconciliation has quarantined or partial records.",
      evidenceIds: federationImportItems.map((item) => item.id),
      action: "Open the federation quarantine review, then run executeAcceptFederationQuarantineCommand, executeRejectFederationQuarantineCommand, or executeRemediateFederationQuarantineCommand for each remote record."
    });
  }

  return alerts;
}

function collectFindings(input: {
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly shell?: CanopyShellOperationsSummary;
  readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
  readonly readinessChecks: CanopyOperationalReadinessChecks;
  readonly failedImportRemediation: CanopyFailedImportRemediationSummary;
  readonly invariantDriftAlerts: readonly CanopyInvariantDriftAlert[];
  readonly adapterAudits: readonly AdapterAuditRecord[];
}): readonly string[] {
  const findings: string[] = [];

  if (input.outbox.failedRecordIds.length > 0) {
    findings.push("outbox has failed records");
  }

  if (input.outbox.exhaustedFailureRecordIds.length > 0) {
    findings.push("outbox has exhausted failures");
  }

  if (input.outbox.deadLetteredRecordIds.length > 0) {
    findings.push("outbox has dead-lettered records");
  }

  if (input.readinessChecks.outboxBacklog.status !== "ready") {
    findings.push("outbox backlog is open");
  }

  if (input.projections.failedStateIds.length > 0) {
    findings.push("projection rebuild has failed states");
  }

  if (input.projections.staleStateIds.length > 0) {
    findings.push("projection rebuild has stale states");
  }

  if (input.projections.missingProjectionNames.length > 0) {
    findings.push("expected projections have not been built");
  }

  if (input.readinessChecks.replayFreshness.status === "attention") {
    findings.push("replay cursor is stale");
  }

  if (input.readinessChecks.projectionLag.status === "attention") {
    findings.push("projection checkpoints lag event log");
  }

  if (input.shell !== undefined && input.shell.sourceEventIds.length === 0) {
    findings.push("shell has no source events");
  }

  if (input.adapterAuditReview.failedAuditIds.length > 0) {
    findings.push("adapter audit contains failed operations");
  }

  if (input.adapterAuditReview.partialAuditIds.length > 0) {
    findings.push("adapter audit contains partial operations");
  }

  if (input.readinessChecks.federationHealth.status === "blocked") {
    findings.push("federation operations have failures");
  } else if (input.readinessChecks.federationHealth.status === "attention") {
    findings.push("federation operations need review");
  }

  if (input.failedImportRemediation.total > 0) {
    findings.push("failed import remediation is open");
  }

  if (input.invariantDriftAlerts.length > 0) {
    findings.push("invariant drift alerts are open");
  }

  return findings;
}

function readinessForFindings(
  findings: readonly string[]
): CanopyOperationsReadiness {
  if (
    findings.includes("outbox has dead-lettered records") ||
    findings.includes("outbox has exhausted failures") ||
    findings.includes("federation operations have failures") ||
    findings.includes("projection rebuild has failed states") ||
    findings.includes("adapter audit contains failed operations") ||
    findings.includes("failed import remediation is open")
  ) {
    return "blocked";
  }

  return findings.length === 0 ? "ready" : "attention";
}

function recordIdsByStatus(
  records: readonly OutboxRecord[],
  status: OutboxStatus
): readonly CanopyId[] {
  return records
    .filter((record) => record.status === status)
    .map((record) => record.id);
}

function recordIdsByPredicate(
  records: readonly OutboxRecord[],
  predicate: (record: OutboxRecord) => boolean
): readonly CanopyId[] {
  return records.filter(predicate).map((record) => record.id);
}

function isExhaustedFailure(record: OutboxRecord): boolean {
  return (
    record.status === "failed" &&
    record.maxAttempts !== undefined &&
    record.attemptCount >= record.maxAttempts
  );
}

function isExpiredLease(
  record: OutboxRecord,
  now: IsoDateTime,
  leaseTimeoutMs: number | undefined
): boolean {
  if (record.status !== "leased" || record.leasedAt === undefined) {
    return false;
  }
  if (leaseTimeoutMs === undefined) {
    return false;
  }

  return Date.parse(record.leasedAt) + leaseTimeoutMs <= Date.parse(now);
}

function isTerminalOutboxStatus(status: OutboxStatus): boolean {
  return (
    status === "acknowledged" ||
    status === "cancelled" ||
    status === "dead-lettered"
  );
}

function drainStatus(input: {
  readonly total: number;
  readonly readyToLease: number;
  readonly delayed: number;
  readonly expiredLeases: number;
  readonly exhaustedFailures: number;
  readonly byStatus: Readonly<Record<OutboxStatus, number>>;
}): CanopyOutboxDrainStatus {
  if (
    input.byStatus["dead-lettered"] > 0 ||
    input.exhaustedFailures > 0 ||
    input.expiredLeases > 0
  ) {
    return "blocked";
  }
  if (input.readyToLease > 0) {
    return "ready";
  }
  if (
    input.delayed > 0 ||
    input.byStatus.leased > 0 ||
    input.byStatus.published > 0 ||
    input.byStatus.failed > 0
  ) {
    return "waiting";
  }

  return "drained";
}

function projectionNamesByStatus(
  states: readonly ProjectionStateRecord[],
  status: ProjectionStateRecord["status"]
): readonly string[] {
  return states
    .filter((state) => state.status === status)
    .map((state) => state.projectionName);
}

function projectionStateIdsBehindEventLog(
  projections: CanopyProjectionOperationsSummary,
  eventCount: number
): readonly CanopyId[] {
  return projections.states
    .filter(
      (state) =>
        state.status === "current" &&
        !isReplayProjectionState(state) &&
        state.processedEventCount < eventCount
    )
    .map((state) => state.id);
}

function isReplayProjectionState(state: ProjectionStateRecord): boolean {
  return (
    state.projectionName.includes("event-log") ||
    state.projectionName.includes("replay")
  );
}

function projectionRebuildStatus(input: {
  readonly missingProjectionNames: readonly string[];
  readonly failedStateIds: readonly CanopyId[];
  readonly staleStateIds: readonly CanopyId[];
  readonly rebuildingStateIds: readonly CanopyId[];
  readonly pausedStateIds: readonly CanopyId[];
}): CanopyProjectionRebuildStatus {
  if (input.failedStateIds.length > 0) {
    return "blocked";
  }
  if (input.pausedStateIds.length > 0) {
    return "paused";
  }
  if (input.rebuildingStateIds.length > 0) {
    return "rebuilding";
  }
  if (input.missingProjectionNames.length > 0 || input.staleStateIds.length > 0) {
    return "needs-rebuild";
  }

  return "current";
}

function auditStatusCounts(
  audits: readonly AdapterAuditRecord[]
): Readonly<Record<AdapterAuditStatus, number>> {
  const counts: Record<AdapterAuditStatus, number> = {
    started: 0,
    succeeded: 0,
    failed: 0,
    partial: 0,
    skipped: 0
  };

  for (const audit of audits) {
    counts[audit.status] += 1;
  }

  return counts;
}

function auditIdsByStatus(
  audits: readonly AdapterAuditRecord[],
  status: AdapterAuditStatus
): readonly CanopyId[] {
  return audits.filter((audit) => audit.status === status).map((audit) => audit.id);
}

function collectRemediatedAuditIds(
  audits: readonly AdapterAuditRecord[]
): ReadonlySet<CanopyId> {
  return new Set(
    audits
      .flatMap((audit) => [acknowledgedAuditId(audit), quarantinedAuditId(audit)])
      .filter(isDefined)
  );
}

function collectRemediatedOutboxIds(
  audits: readonly AdapterAuditRecord[]
): ReadonlySet<CanopyId> {
  return new Set(
    audits.flatMap((audit) => quarantinedOutboxIds(audit))
  );
}

function acknowledgedAuditId(audit: AdapterAuditRecord): CanopyId | undefined {
  if (audit.operation !== "adapter-audit.acknowledge-failure") {
    return undefined;
  }

  return metadataString(audit.metadata, "acknowledgedAuditId");
}

function quarantinedAuditId(audit: AdapterAuditRecord): CanopyId | undefined {
  if (audit.operation !== "import.quarantine") {
    return undefined;
  }

  return metadataString(audit.metadata, "remediatesAuditId");
}

function quarantinedOutboxIds(audit: AdapterAuditRecord): readonly CanopyId[] {
  if (audit.operation !== "import.quarantine") {
    return [];
  }

  return metadataStringArray(audit.metadata, "quarantinedOutboxIds");
}

function ticketedDriftAlertId(audit: AdapterAuditRecord): CanopyId | undefined {
  if (audit.operation !== "invariant-drift.ticket-created") {
    return undefined;
  }

  return metadataString(audit.metadata, "driftAlertId");
}

function isImportAudit(audit: AdapterAuditRecord): boolean {
  return audit.adapterName.startsWith("import.") || audit.operation.includes("import");
}

function isRemediableAudit(audit: AdapterAuditRecord): boolean {
  return (
    audit.status === "failed" ||
    audit.status === "partial" ||
    audit.errors.length > 0 ||
    audit.warnings.length > 0
  );
}

function importAuditRemediationItem(
  audit: AdapterAuditRecord
): CanopyFailedImportRemediationItem {
  const severity = audit.status === "failed" ? "blocked" : "review";

  return {
    id: audit.id,
    source: "adapter-audit",
    severity,
    adapterName: audit.adapterName,
    operation: audit.operation,
    status: audit.status,
    eventIds: audit.eventIds,
    outboxIds: audit.outboxIds,
    action:
      severity === "blocked"
        ? "Fix the import failure, then rerun the reviewed import."
        : "Review partial import warnings before accepting more events."
  };
}

function isImportOutbox(record: OutboxRecord): boolean {
  return (
    record.eventId.startsWith("event.import.") ||
    record.dedupeKey?.startsWith("import:") === true
  );
}

function isFederationAudit(audit: AdapterAuditRecord): boolean {
  return (
    audit.adapterName.includes("federation") ||
    audit.operation.includes("federation")
  );
}

function isFederationOutbox(record: OutboxRecord): boolean {
  return (
    record.destination.kind === "federation-peer" ||
    record.destination.name.includes("federation") ||
    record.eventType.startsWith("federation.") ||
    record.dedupeKey?.startsWith("federation:") === true
  );
}

function isRemediableOutbox(record: OutboxRecord): boolean {
  return record.status === "failed" || record.status === "dead-lettered";
}

function importOutboxRemediationItem(
  record: OutboxRecord
): CanopyFailedImportRemediationItem {
  return {
    id: record.id,
    source: "outbox",
    severity: record.status === "dead-lettered" ? "blocked" : "retry",
    status: record.status,
    eventIds: [record.eventId],
    outboxIds: [record.id],
    action:
      record.status === "dead-lettered"
        ? "Inspect the import projection payload before replaying or retiring it."
        : "Retry the import projection outbox record after resolving the last error."
  };
}

function optionalOperationsReport(
  report: {
    readonly generatedAt: IsoDateTime;
    readonly readiness: CanopyOperationsReadiness;
    readonly health: CanopyOperationsHealthSummary;
    readonly counts: CanonicalRecordCounts;
    readonly outbox: CanopyOutboxOperationsSummary;
    readonly projections: CanopyProjectionOperationsSummary;
    readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
    readonly readinessChecks: CanopyOperationalReadinessChecks;
    readonly adapterAudits: readonly AdapterAuditRecord[];
    readonly failedImportRemediation: CanopyFailedImportRemediationSummary;
    readonly invariantDriftAlerts: readonly CanopyInvariantDriftAlert[];
    readonly shell: CanopyShellOperationsSummary | undefined;
    readonly findings: readonly string[];
  }
): CanopyOperationsReport {
  if (report.shell === undefined) {
    return {
      generatedAt: report.generatedAt,
      readiness: report.readiness,
      health: report.health,
      counts: report.counts,
      outbox: report.outbox,
      projections: report.projections,
      adapterAuditReview: report.adapterAuditReview,
      readinessChecks: report.readinessChecks,
      adapterAudits: report.adapterAudits,
      failedImportRemediation: report.failedImportRemediation,
      invariantDriftAlerts: report.invariantDriftAlerts,
      findings: report.findings
    };
  }

  return {
    generatedAt: report.generatedAt,
    readiness: report.readiness,
    health: report.health,
    counts: report.counts,
    outbox: report.outbox,
    projections: report.projections,
    adapterAuditReview: report.adapterAuditReview,
    readinessChecks: report.readinessChecks,
    adapterAudits: report.adapterAudits,
    failedImportRemediation: report.failedImportRemediation,
    invariantDriftAlerts: report.invariantDriftAlerts,
    shell: report.shell,
    findings: report.findings
  };
}

function optionalLatestCompletedAt(
  summary: {
    readonly total: number;
    readonly byStatus: Readonly<Record<AdapterAuditStatus, number>>;
    readonly failedAuditIds: readonly CanopyId[];
    readonly partialAuditIds: readonly CanopyId[];
    readonly warningAuditIds: readonly CanopyId[];
    readonly unresolvedAuditIds: readonly CanopyId[];
    readonly latestCompletedAt: IsoDateTime | undefined;
  }
): CanopyAdapterAuditReviewSummary {
  if (summary.latestCompletedAt === undefined) {
    return {
      total: summary.total,
      byStatus: summary.byStatus,
      failedAuditIds: summary.failedAuditIds,
      partialAuditIds: summary.partialAuditIds,
      warningAuditIds: summary.warningAuditIds,
      unresolvedAuditIds: summary.unresolvedAuditIds
    };
  }

  return {
    total: summary.total,
    byStatus: summary.byStatus,
    failedAuditIds: summary.failedAuditIds,
    partialAuditIds: summary.partialAuditIds,
    warningAuditIds: summary.warningAuditIds,
    unresolvedAuditIds: summary.unresolvedAuditIds,
    latestCompletedAt: summary.latestCompletedAt
  };
}

function optionalCommandError(
  result: {
    readonly commandId: CanopyId;
    readonly type: CanopyOperationsRemediationCommandType;
    readonly status: "failed";
    readonly changedRecordIds: readonly CanopyId[];
    readonly skippedRecordIds: readonly CanopyId[];
    readonly error: string | undefined;
  }
): CanopyOperationsRemediationCommandResult {
  if (result.error === undefined) {
    return {
      commandId: result.commandId,
      type: result.type,
      status: result.status,
      changedRecordIds: result.changedRecordIds,
      skippedRecordIds: result.skippedRecordIds
    };
  }

  return {
    commandId: result.commandId,
    type: result.type,
    status: result.status,
    changedRecordIds: result.changedRecordIds,
    skippedRecordIds: result.skippedRecordIds,
    error: result.error
  };
}

function optionalMetadataError(
  metadata: {
    readonly commandId: CanopyId;
    readonly commandType: CanopyOperationsRemediationCommandType;
    readonly commandCreatedAt: IsoDateTime;
    readonly executedAt: IsoDateTime;
    readonly reason: string;
    readonly evidenceIds: readonly CanopyId[];
    readonly status: CanopyOperationsRemediationCommandStatus;
    readonly changedRecordIds: readonly CanopyId[];
    readonly skippedRecordIds: readonly CanopyId[];
    readonly affectedProjectionStateIds: readonly CanopyId[];
    readonly remediatedAdapterAuditIds: readonly CanopyId[];
    readonly error: string | undefined;
  }
): JsonValue {
  if (metadata.error === undefined) {
    return {
      commandId: metadata.commandId,
      commandType: metadata.commandType,
      commandCreatedAt: metadata.commandCreatedAt,
      executedAt: metadata.executedAt,
      reason: metadata.reason,
      evidenceIds: metadata.evidenceIds,
      status: metadata.status,
      changedRecordIds: metadata.changedRecordIds,
      skippedRecordIds: metadata.skippedRecordIds,
      affectedProjectionStateIds: metadata.affectedProjectionStateIds,
      remediatedAdapterAuditIds: metadata.remediatedAdapterAuditIds
    };
  }

  return {
    commandId: metadata.commandId,
    commandType: metadata.commandType,
    commandCreatedAt: metadata.commandCreatedAt,
    executedAt: metadata.executedAt,
    reason: metadata.reason,
    evidenceIds: metadata.evidenceIds,
    status: metadata.status,
    changedRecordIds: metadata.changedRecordIds,
    skippedRecordIds: metadata.skippedRecordIds,
    affectedProjectionStateIds: metadata.affectedProjectionStateIds,
    remediatedAdapterAuditIds: metadata.remediatedAdapterAuditIds,
    error: metadata.error
  };
}

function metadataString(metadata: JsonValue, key: string): string | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function metadataStringArray(metadata: JsonValue, key: string): readonly string[] {
  if (!isRecord(metadata)) {
    return [];
  }

  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}

function optionalReportShell(
  shell: CanopyShellOperationsSummary | undefined
): { readonly shell?: CanopyShellOperationsSummary } {
  return shell === undefined ? {} : { shell };
}

function optionalSurfaceKinds(
  kinds: readonly (string | undefined)[]
): readonly string[] {
  return kinds.filter((kind): kind is string => kind !== undefined);
}

function optionalWorkerLimit(
  limit: number | undefined
): { readonly limit?: number } {
  return limit === undefined ? {} : { limit };
}

function optionalLeaseDuration(
  leaseDurationMs: number | undefined
): { readonly leaseDurationMs?: number } {
  return leaseDurationMs === undefined ? {} : { leaseDurationMs };
}

function optionalDestination(
  destination: OutboxDestination | undefined
): { readonly destination?: OutboxDestination } {
  return destination === undefined ? {} : { destination };
}

function optionalLeaseTimeout(
  leaseTimeoutMs: number | undefined
): { readonly leaseTimeoutMs?: number } {
  return leaseTimeoutMs === undefined ? {} : { leaseTimeoutMs };
}

function optionalReconcileOptions(
  now: IsoDateTime,
  leaseTimeoutMs: number | undefined
): { readonly now: IsoDateTime; readonly leaseTimeoutMs?: number } {
  return leaseTimeoutMs === undefined ? { now } : { now, leaseTimeoutMs };
}

function optionalReportOutbox(
  outbox: OutboxRuntime | undefined
): { readonly outbox?: OutboxRuntime } {
  return outbox === undefined ? {} : { outbox };
}

function optionalExpectedProjectionNames(
  names: readonly string[] | undefined
): { readonly expectedProjectionNames?: readonly string[] } {
  return names === undefined ? {} : { expectedProjectionNames: names };
}

function optionalSelectedObject(
  selectedObjectRef: ObjectRef | undefined
): { readonly selectedObjectRef?: ObjectRef } {
  return selectedObjectRef === undefined ? {} : { selectedObjectRef };
}

function optionalActiveMode(
  activeMode: CanopyShellMode | undefined
): { readonly activeMode?: CanopyShellMode } {
  return activeMode === undefined ? {} : { activeMode };
}

function optionalMaterializedProjections(
  materializedProjections: MaterializedProjectionStore | undefined
): { readonly materializedProjections?: MaterializedProjectionStore } {
  return materializedProjections === undefined ? {} : { materializedProjections };
}

function optionalObjectRefs(
  objectRefs: readonly ObjectRef[] | undefined
): { readonly objectRefs?: readonly ObjectRef[] } {
  return objectRefs === undefined ? {} : { objectRefs };
}

function optionalResourceRefs(
  resourceRefs: readonly ObjectRef[] | undefined
): { readonly resourceRefs?: readonly ObjectRef[] } {
  return resourceRefs === undefined ? {} : { resourceRefs };
}

function optionalDecisionRefs(
  decisionRefs: readonly ObjectRef[] | undefined
): { readonly decisionRefs?: readonly ObjectRef[] } {
  return decisionRefs === undefined ? {} : { decisionRefs };
}
