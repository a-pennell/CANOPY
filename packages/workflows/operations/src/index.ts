import type {
  AdapterAuditRecord,
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

export type CanopyOperationsReadiness =
  | "ready"
  | "attention"
  | "blocked";

export interface CanopyOutboxOperationsSummary {
  readonly total: number;
  readonly byStatus: Readonly<Record<OutboxStatus, number>>;
  readonly readyToLease: number;
  readonly delayed: number;
  readonly expiredLeases: number;
  readonly exhaustedFailures: number;
  readonly pendingRecordIds: readonly CanopyId[];
  readonly failedRecordIds: readonly CanopyId[];
  readonly deadLetteredRecordIds: readonly CanopyId[];
}

export interface CanopyProjectionOperationsSummary {
  readonly states: readonly ProjectionStateRecord[];
  readonly currentStateIds: readonly CanopyId[];
  readonly staleStateIds: readonly CanopyId[];
  readonly failedStateIds: readonly CanopyId[];
  readonly missingProjectionNames: readonly string[];
}

export interface CanopyShellOperationsSummary {
  readonly activeMode: CanopyShellMode;
  readonly sourceEventIds: readonly CanopyId[];
  readonly attentionCount: number;
  readonly commandCount: number;
  readonly projectionReadCount: number;
  readonly surfaceKinds: readonly string[];
}

export interface CanopyOperationsReport {
  readonly generatedAt: IsoDateTime;
  readonly readiness: CanopyOperationsReadiness;
  readonly counts: CanonicalRecordCounts;
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly adapterAudits: readonly AdapterAuditRecord[];
  readonly shell?: CanopyShellOperationsSummary;
  readonly findings: readonly string[];
}

export interface BuildCanopyOperationsReportInput {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly generatedAt: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly shell?: PersistedCanopyShellSnapshotResult;
  readonly expectedProjectionNames?: readonly string[];
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
}

export interface CanopyOperationsCycleResult {
  readonly worker: OutboxWorkerResult;
  readonly shell: PersistedCanopyShellSnapshotResult;
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
  const outboxSummary = summarizeOutbox(outbox, input.generatedAt);
  const projections = summarizeProjections(
    input.runtime.listProjectionStates(),
    input.expectedProjectionNames ?? expectedProjectionNames
  );
  const adapterAudits = input.runtime.listAdapterAudits();
  const shell = input.shell === undefined ? undefined : summarizeShell(input.shell);
  const findings = collectFindings({
    outbox: outboxSummary,
    projections,
    adapterAudits,
    ...optionalReportShell(shell)
  });

  return optionalOperationsReport({
    generatedAt: input.generatedAt,
    readiness: readinessForFindings(findings),
    counts: input.runtime.counts(),
    outbox: outboxSummary,
    projections,
    adapterAudits,
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
    shell
  });

  return { worker, shell, report };
}

function summarizeOutbox(
  outbox: OutboxRuntime,
  now: IsoDateTime
): CanopyOutboxOperationsSummary {
  const reconciliation = outbox.reconcile({ now });
  const records = outbox.list();

  return {
    total: reconciliation.total,
    byStatus: reconciliation.byStatus,
    readyToLease: reconciliation.readyToLease,
    delayed: reconciliation.delayed,
    expiredLeases: reconciliation.expiredLeases,
    exhaustedFailures: reconciliation.exhaustedFailures,
    pendingRecordIds: recordIdsByStatus(records, "pending"),
    failedRecordIds: recordIdsByStatus(records, "failed"),
    deadLetteredRecordIds: recordIdsByStatus(records, "dead-lettered")
  };
}

function summarizeProjections(
  states: readonly ProjectionStateRecord[],
  expectedNames: readonly string[]
): CanopyProjectionOperationsSummary {
  const presentNames = new Set(states.map((state) => state.projectionName));

  return {
    states,
    currentStateIds: states
      .filter((state) => state.status === "current")
      .map((state) => state.id),
    staleStateIds: states
      .filter((state) => state.status === "stale")
      .map((state) => state.id),
    failedStateIds: states
      .filter((state) => state.status === "failed")
      .map((state) => state.id),
    missingProjectionNames: expectedNames.filter((name) => !presentNames.has(name))
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

function collectFindings(input: {
  readonly outbox: CanopyOutboxOperationsSummary;
  readonly projections: CanopyProjectionOperationsSummary;
  readonly shell?: CanopyShellOperationsSummary;
  readonly adapterAudits: readonly AdapterAuditRecord[];
}): readonly string[] {
  const findings: string[] = [];

  if (input.outbox.failedRecordIds.length > 0) {
    findings.push("outbox has failed records");
  }

  if (input.outbox.deadLetteredRecordIds.length > 0) {
    findings.push("outbox has dead-lettered records");
  }

  if (input.projections.failedStateIds.length > 0) {
    findings.push("projection rebuild has failed states");
  }

  if (input.projections.missingProjectionNames.length > 0) {
    findings.push("expected projections have not been built");
  }

  if (input.shell !== undefined && input.shell.sourceEventIds.length === 0) {
    findings.push("shell has no source events");
  }

  if (input.adapterAudits.some((audit) => audit.status === "failed")) {
    findings.push("adapter audit contains failed operations");
  }

  return findings;
}

function readinessForFindings(
  findings: readonly string[]
): CanopyOperationsReadiness {
  if (
    findings.includes("outbox has dead-lettered records") ||
    findings.includes("projection rebuild has failed states") ||
    findings.includes("adapter audit contains failed operations")
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

function optionalOperationsReport(
  report: {
    readonly generatedAt: IsoDateTime;
    readonly readiness: CanopyOperationsReadiness;
    readonly counts: CanonicalRecordCounts;
    readonly outbox: CanopyOutboxOperationsSummary;
    readonly projections: CanopyProjectionOperationsSummary;
    readonly adapterAudits: readonly AdapterAuditRecord[];
    readonly shell: CanopyShellOperationsSummary | undefined;
    readonly findings: readonly string[];
  }
): CanopyOperationsReport {
  if (report.shell === undefined) {
    return {
      generatedAt: report.generatedAt,
      readiness: report.readiness,
      counts: report.counts,
      outbox: report.outbox,
      projections: report.projections,
      adapterAudits: report.adapterAudits,
      findings: report.findings
    };
  }

  return {
    generatedAt: report.generatedAt,
    readiness: report.readiness,
    counts: report.counts,
    outbox: report.outbox,
    projections: report.projections,
    adapterAudits: report.adapterAudits,
    shell: report.shell,
    findings: report.findings
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
