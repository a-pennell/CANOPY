import { describe, expect, it } from "vitest";
import type {
  AdapterAuditRecord,
  OutboxRecord,
  ProjectionStateRecord
} from "@canopy/contracts-database";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { dryRunCommonCreditImport } from "@canopy/database-import-plans";
import {
  createImportReviewReport,
  executeReviewedImport
} from "@canopy/workflows-import-execution";
import {
  buildCanopyOperationsReport,
  drainCanopyOutboxControl,
  runCanopyProjectionRebuildControl,
  runCanopyOperationsCycle
} from "./index.js";

const now = "2026-06-13T19:00:00.000Z";

describe("canopy operations workflow", () => {
  it("reports attention before projections and shell data exist", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });

    const report = buildCanopyOperationsReport({
      runtime,
      generatedAt: now
    });

    expect(report.readiness).toBe("attention");
    expect(report.health).toMatchObject({
      status: "attention",
      alertCount: 1
    });
    expect(report.findings).toEqual([
      "expected projections have not been built",
      "invariant drift alerts are open"
    ]);
    expect(report.outbox.total).toBe(0);
    expect(report.outbox.drainStatus).toBe("drained");
    expect(report.projections.rebuildStatus).toBe("needs-rebuild");
    expect(report.projections.missingProjectionNames).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet"
    ]);
    expect(report.adapterAuditReview.total).toBe(0);
    expect(report.failedImportRemediation.total).toBe(0);
    expect(report.invariantDriftAlerts.map((alert) => alert.id)).toEqual([
      "drift.projection-state.missing"
    ]);
  });

  it("runs import-created outbox work and reports a ready operating spine", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-ops-1",
        from: "account-a",
        to: "account-b",
        amount: 12,
        posted_at: "2026-06-13T18:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: now
    });
    const importResult = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: now
    });
    const selectedObjectRef = importResult.eventRecords[0]?.objectRef;

    if (selectedObjectRef === undefined) {
      throw new Error("expected imported event object ref");
    }

    const cycle = await runCanopyOperationsCycle({
      runtime,
      workerId: "operations.worker",
      now: "2026-06-13T19:05:00.000Z",
      scope: {
        label: "Operations Test Commons",
        scope: {}
      },
      selectedObjectRef
    });

    expect(cycle.worker).toMatchObject({
      leasedCount: 1,
      acknowledgedCount: 1,
      failedCount: 0
    });
    expect(cycle.report.readiness).toBe("ready");
    expect(cycle.report.findings).toEqual([]);
    expect(cycle.report.health).toMatchObject({
      status: "ready",
      alertCount: 0
    });
    expect(cycle.report.counts).toMatchObject({
      mappings: 1,
      events: 1,
      outbox: 1,
      projectionStates: 6,
      adapterAudits: 2
    });
    expect(cycle.report.outbox.byStatus.acknowledged).toBe(1);
    expect(cycle.report.outbox.drainStatus).toBe("drained");
    expect(cycle.report.projections.rebuildStatus).toBe("current");
    expect(cycle.report.adapterAuditReview.byStatus.succeeded).toBe(2);
    expect(cycle.report.failedImportRemediation.total).toBe(0);
    expect(cycle.report.invariantDriftAlerts).toEqual([]);
    expect(cycle.report.projections.currentStateIds).toEqual([
      "projection-state.authority",
      "projection-state.civic-memory",
      "projection-state.claim-evidence",
      "projection-state.decision-packet",
      "projection-state.object-page",
      "projection-state.resource-stewardship"
    ]);
    expect(cycle.report.shell).toMatchObject({
      activeMode: "scope",
      sourceEventIds: [
        "event.import.common-credit.transaction.tx-ops-1.accounting-ledger-entry-posted"
      ],
      projectionReadCount: 6
    });
    expect(cycle.report.shell?.surfaceKinds).toEqual([
      "object-page",
      "civic-memory-stream",
      "source-provenance-panel",
      "authority-trace"
    ]);
  });

  it("rebuilds projections directly as an operator control", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-rebuild-1",
        from: "account-a",
        to: "account-b",
        amount: 20,
        posted_at: "2026-06-13T18:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: now
    });
    executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: now,
      enqueueProjectionRebuild: false
    });

    const control = runCanopyProjectionRebuildControl({
      runtime,
      rebuiltAt: "2026-06-13T19:10:00.000Z"
    });

    expect(control.projectionRebuild.persistedStates).toHaveLength(6);
    expect(control.report.readiness).toBe("ready");
    expect(control.report.outbox.drainStatus).toBe("drained");
    expect(control.report.projections).toMatchObject({
      rebuildStatus: "current",
      rebuildable: true,
      missingProjectionNames: []
    });
    expect(control.report.projections.currentProjectionNames).toEqual([
      "authority",
      "civic-memory",
      "claim-evidence",
      "decision-packet",
      "object-page",
      "resource-stewardship"
    ]);
  });

  it("surfaces blocked drift, audit review, and failed import remediation", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    runtime.putProjectionState(failedProjectionState());
    runtime.putOutbox(failedImportOutboxRecord());
    runtime.putAdapterAudit(failedImportAuditRecord());

    const drain = await drainCanopyOutboxControl({
      runtime,
      workerId: "operations.worker",
      now,
      workerLimit: 0,
      expectedProjectionNames: ["civic-memory"]
    });

    expect(drain.worker.leasedCount).toBe(0);
    expect(drain.report.readiness).toBe("blocked");
    expect(drain.report.outbox).toMatchObject({
      drainStatus: "blocked",
      exhaustedFailures: 1,
      failedRecordIds: ["outbox.import.failed"],
      exhaustedFailureRecordIds: ["outbox.import.failed"]
    });
    expect(drain.report.projections.failedStateIds).toEqual([
      "projection-state.civic-memory"
    ]);
    expect(drain.report.adapterAuditReview).toMatchObject({
      failedAuditIds: ["adapter-audit.import.failed"],
      unresolvedAuditIds: ["adapter-audit.import.failed"]
    });
    expect(drain.report.failedImportRemediation.items).toMatchObject([
      {
        id: "adapter-audit.import.failed",
        source: "adapter-audit",
        severity: "blocked"
      }
    ]);
    expect(drain.report.invariantDriftAlerts.map((alert) => alert.id)).toEqual([
      "drift.projection-state.failed",
      "drift.outbox.terminal-failure",
      "drift.adapter-audit.unresolved",
      "drift.import-remediation.open"
    ]);
  });
});

function failedProjectionState(): ProjectionStateRecord {
  return {
    id: "projection-state.civic-memory",
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: now,
    projectionName: "civic-memory",
    projectionVersion: "0.0.0",
    status: "failed",
    checkpoint: { processedAt: now, sequence: 0 },
    processedEventCount: 0,
    lastError: "projection builder rejected import payload",
    rebuildRequestedAt: now
  };
}

function failedImportOutboxRecord(): OutboxRecord {
  return {
    id: "outbox.import.failed",
    kind: "outbox",
    schemaVersion: 1,
    createdAt: now,
    eventId: "event.import.common-credit.transaction.tx-failed.accounting-ledger-entry-posted",
    eventType: "accounting.ledger-entry.posted",
    destination: {
      kind: "workflow",
      name: "projection-rebuild"
    },
    status: "failed",
    payload: {
      eventId: "event.import.common-credit.transaction.tx-failed.accounting-ledger-entry-posted"
    },
    dedupeKey:
      "import:event.import.common-credit.transaction.tx-failed.accounting-ledger-entry-posted:projection-rebuild",
    attemptCount: 1,
    maxAttempts: 1,
    lastError: "projection builder rejected import payload"
  };
}

function failedImportAuditRecord(): AdapterAuditRecord {
  return {
    id: "adapter-audit.import.failed",
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: now,
    adapterName: "import.common-credit",
    direction: "migration",
    operation: "import.execute-reviewed",
    status: "failed",
    startedAt: now,
    completedAt: now,
    eventIds: [
      "event.import.common-credit.transaction.tx-failed.accounting-ledger-entry-posted"
    ],
    outboxIds: ["outbox.import.failed"],
    warnings: [],
    errors: ["projection builder rejected import payload"],
    metadata: { importPlanId: "common-credit.transaction" }
  };
}
