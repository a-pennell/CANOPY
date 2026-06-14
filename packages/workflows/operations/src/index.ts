import type {
  AdapterAuditRecord,
  AdapterAuditStatus,
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
  runOutboxWorker,
  type OutboxRuntime,
  type OutboxWorkerResult
} from "@canopy/workflows-outbox";
import {
  rebuildAndPersistAllProjections,
  type MaterializedProjectionStore,
  type PersistentProjectionRebuildResult
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

const expectedProjectionNames = [
  "object-page",
  "civic-memory",
  "authority",
  "claim-evidence",
  "resource-stewardship",
  "decision-packet"
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
  const invariantDriftAlerts = collectInvariantDriftAlerts({
    counts: input.runtime.counts(),
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
    failedImportRemediation,
    invariantDriftAlerts,
    adapterAudits,
    ...optionalReportShell(shell)
  });
  const readiness = readinessForFindings(findings);
  const counts = input.runtime.counts();

  return optionalOperationsReport({
    generatedAt: input.generatedAt,
    readiness,
    health: summarizeHealth(input.generatedAt, readiness, invariantDriftAlerts, findings),
    counts,
    outbox: outboxSummary,
    projections,
    adapterAuditReview,
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
  const completedAt = audits
    .map((audit) => audit.completedAt)
    .filter((value): value is IsoDateTime => value !== undefined)
    .sort();

  return optionalLatestCompletedAt({
    total: audits.length,
    byStatus: auditStatusCounts(audits),
    failedAuditIds: auditIdsByStatus(audits, "failed"),
    partialAuditIds: auditIdsByStatus(audits, "partial"),
    warningAuditIds: audits
      .filter((audit) => audit.warnings.length > 0)
      .map((audit) => audit.id),
    unresolvedAuditIds: audits
      .filter((audit) =>
        audit.status === "started" ||
        audit.status === "failed" ||
        audit.status === "partial"
      )
      .map((audit) => audit.id),
    latestCompletedAt: completedAt.at(-1)
  });
}

function summarizeFailedImportRemediation(
  audits: readonly AdapterAuditRecord[],
  outboxRecords: readonly OutboxRecord[]
): CanopyFailedImportRemediationSummary {
  const auditItems = audits
    .filter((audit) => isImportAudit(audit) && isRemediableAudit(audit))
    .map(importAuditRemediationItem);
  const auditOutboxIds = new Set(auditItems.flatMap((item) => item.outboxIds));
  const outboxItems = outboxRecords
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

  return alerts;
}

function collectFindings(input: {
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly shell?: CanopyShellOperationsSummary;
  readonly adapterAuditReview: CanopyAdapterAuditReviewSummary;
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

  if (input.projections.failedStateIds.length > 0) {
    findings.push("projection rebuild has failed states");
  }

  if (input.projections.staleStateIds.length > 0) {
    findings.push("projection rebuild has stale states");
  }

  if (input.projections.missingProjectionNames.length > 0) {
    findings.push("expected projections have not been built");
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
