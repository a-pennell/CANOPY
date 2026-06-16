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
  buildCanopyOperationsRemediationPlan,
  buildCanopyOperationsReport,
  drainCanopyOutboxControl,
  executeCanopyOperationsRemediationCommands,
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
      "decision-packet",
      "federation-export"
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
      projectionStates: 7,
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
      "projection-state.federation-export",
      "projection-state.object-page",
      "projection-state.resource-stewardship"
    ]);
    expect(cycle.report.shell).toMatchObject({
      activeMode: "scope",
      sourceEventIds: [
        "event.import.common-credit.transaction.tx-ops-1.accounting-ledger-entry-posted"
      ],
      projectionReadCount: 7
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

    expect(control.projectionRebuild.persistedStates).toHaveLength(7);
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
      "federation-export",
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

  it("surfaces Phase 8 operational readiness checks", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-phase-8-readiness",
        from: "account-a",
        to: "account-b",
        amount: 42,
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

    runtime.putProjectionState(staleReplayProjectionState());
    runtime.putProjectionState(laggingProjectionState());
    runtime.putProjectionState(currentFederationProjectionState());
    runtime.putOutbox(pendingFederationOutboxRecord());
    runtime.putAdapterAudit(failedFederationAuditRecord());

    const report = buildCanopyOperationsReport({
      runtime,
      generatedAt: "2026-06-13T19:30:00.000Z",
      expectedProjectionNames: [
        "postgres-event-store.event-log",
        "civic-memory",
        "federation-export"
      ]
    });

    expect(report.readiness).toBe("blocked");
    expect(report.readinessChecks.replayFreshness).toMatchObject({
      status: "attention",
      evidenceIds: ["projection-state.postgres-event-store.event-log"]
    });
    expect(report.readinessChecks.projectionLag).toMatchObject({
      status: "attention",
      evidenceIds: ["projection-state.civic-memory"]
    });
    expect(report.readinessChecks.outboxBacklog).toMatchObject({
      status: "attention",
      evidenceIds: ["outbox.federation.pending"]
    });
    expect(report.readinessChecks.adapterAuditHealth).toMatchObject({
      status: "blocked",
      evidenceIds: ["adapter-audit.federation.failed"]
    });
    expect(report.readinessChecks.federationHealth).toMatchObject({
      status: "blocked",
      evidenceIds: [
        "adapter-audit.federation.failed",
        "outbox.federation.pending"
      ]
    });
    expect(report.findings).toEqual(
      expect.arrayContaining([
        "replay cursor is stale",
        "projection checkpoints lag event log",
        "outbox backlog is open",
        "adapter audit contains failed operations",
        "federation operations have failures"
      ])
    );
  });

  it("raises a federation-specific drift alert for quarantined import reconciliation", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    runtime.putAdapterAudit(failedFederationImportAuditRecord());

    const report = buildCanopyOperationsReport({
      runtime,
      generatedAt: "2026-06-13T19:35:00.000Z",
      expectedProjectionNames: []
    });

    expect(report.failedImportRemediation.items).toEqual([
      expect.objectContaining({
        id: "adapter-audit.federation-import.failed",
        operation: "federation.import.reconcile",
        severity: "blocked"
      })
    ]);
    expect(report.invariantDriftAlerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining([
        "drift.import-remediation.open",
        "drift.federation-import.quarantine-open"
      ])
    );
    expect(report.invariantDriftAlerts.find(
      (alert) => alert.id === "drift.federation-import.quarantine-open"
    )).toMatchObject({
      level: "critical",
      action: "Open the federation quarantine review, then accept, reject, or remediate each remote record."
    });
  });

  it("turns operations reports into operator remediation commands", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => now });
    runtime.putProjectionState(failedProjectionState());
    runtime.putOutbox(retryableOutboxRecord());
    runtime.putOutbox(failedImportOutboxRecord());
    runtime.putAdapterAudit(failedImportAuditRecord());

    const report = buildCanopyOperationsReport({
      runtime,
      generatedAt: now,
      expectedProjectionNames: ["civic-memory"]
    });
    const plan = buildCanopyOperationsRemediationPlan({
      report,
      generatedAt: "2026-06-13T19:05:00.000Z"
    });

    expect(plan.commands.map((command) => command.type)).toEqual([
      "retry-failed-outbox",
      "request-projection-rebuild",
      "quarantine-failed-import",
      "acknowledge-adapter-audit-failure",
      "create-invariant-drift-ticket",
      "create-invariant-drift-ticket",
      "create-invariant-drift-ticket",
      "create-invariant-drift-ticket"
    ]);

    const remediation = executeCanopyOperationsRemediationCommands({
      runtime,
      commands: plan.commands,
      now: "2026-06-13T19:10:00.000Z",
      expectedProjectionNames: ["civic-memory"]
    });

    expect(remediation.commands.every((command) => command.status === "applied")).toBe(
      true
    );
    expect(runtime.getOutbox("outbox.retryable.failed")).toMatchObject({
      status: "pending"
    });
    expect(runtime.getOutbox("outbox.retryable.failed")?.lastError).toBeUndefined();
    expect(runtime.getOutbox("outbox.import.failed")).toMatchObject({
      status: "cancelled",
      updatedAt: "2026-06-13T19:10:00.000Z"
    });
    expect(runtime.getProjectionState("projection-state.civic-memory")).toMatchObject({
      status: "failed",
      rebuildRequestedAt: "2026-06-13T19:10:00.000Z"
    });
    const audits = runtime.listAdapterAudits();
    const auditOperations = audits.map((audit) => audit.operation);
    expect(auditOperations).toEqual(
      expect.arrayContaining([
        "adapter-audit.acknowledge-failure",
        "import.execute-reviewed",
        "import.quarantine",
        "operations.remediation-command"
      ])
    );
    expect(
      auditOperations.filter((operation) => operation === "invariant-drift.ticket-created")
    ).toHaveLength(4);
    expect(
      auditOperations.filter((operation) => operation === "operations.remediation-command")
    ).toHaveLength(plan.commands.length);
    expect(commandOutcomeAudit(audits, "retry-failed-outbox")).toMatchObject({
      status: "succeeded",
      outboxIds: ["outbox.retryable.failed"],
      metadata: {
        commandType: "retry-failed-outbox",
        status: "applied",
        changedRecordIds: ["outbox.retryable.failed"],
        skippedRecordIds: []
      }
    });
    expect(commandOutcomeAudit(audits, "request-projection-rebuild")).toMatchObject({
      status: "succeeded",
      metadata: {
        commandType: "request-projection-rebuild",
        status: "applied",
        changedRecordIds: ["projection-state.civic-memory"],
        affectedProjectionStateIds: ["projection-state.civic-memory"]
      }
    });
    expect(commandOutcomeAudit(audits, "quarantine-failed-import")).toMatchObject({
      status: "succeeded",
      outboxIds: ["outbox.import.failed"],
      metadata: {
        commandType: "quarantine-failed-import",
        status: "applied",
        remediatedAdapterAuditIds: ["adapter-audit.import.failed"]
      }
    });
    expect(remediation.report.adapterAuditReview.unresolvedAuditIds).toEqual([]);
    expect(
      remediation.report.adapterAudits.filter(
        (audit) => audit.operation === "operations.remediation-command"
      )
    ).toHaveLength(plan.commands.length);
    expect(remediation.report.failedImportRemediation.total).toBe(0);

    const followUpPlan = buildCanopyOperationsRemediationPlan({
      report: remediation.report,
      generatedAt: "2026-06-13T19:15:00.000Z"
    });

    expect(followUpPlan.commands.map((command) => command.type)).not.toContain(
      "create-invariant-drift-ticket"
    );
  });
});

function commandOutcomeAudit(
  audits: readonly AdapterAuditRecord[],
  commandType: string
): AdapterAuditRecord | undefined {
  return audits.find(
    (audit) =>
      audit.operation === "operations.remediation-command" &&
      isMetadataRecord(audit.metadata) &&
      audit.metadata.commandType === commandType
  );
}

function isMetadataRecord(
  metadata: AdapterAuditRecord["metadata"]
): metadata is { readonly [key: string]: AdapterAuditRecord["metadata"] } {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata);
}

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

function staleReplayProjectionState(): ProjectionStateRecord {
  return {
    id: "projection-state.postgres-event-store.event-log",
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: now,
    projectionName: "postgres-event-store.event-log",
    projectionVersion: "0.0.0",
    status: "current",
    checkpoint: {
      processedAt: "2026-06-13T18:00:00.000Z",
      cursor: "0",
      sequence: 0
    },
    processedEventCount: 0,
    rebuiltAt: "2026-06-13T18:00:00.000Z"
  };
}

function laggingProjectionState(): ProjectionStateRecord {
  return {
    id: "projection-state.civic-memory",
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: now,
    projectionName: "civic-memory",
    projectionVersion: "0.0.0",
    status: "current",
    checkpoint: { processedAt: "2026-06-13T18:00:00.000Z", sequence: 0 },
    processedEventCount: 0,
    rebuiltAt: "2026-06-13T18:00:00.000Z"
  };
}

function currentFederationProjectionState(): ProjectionStateRecord {
  return {
    id: "projection-state.federation-export",
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: now,
    projectionName: "federation-export",
    projectionVersion: "0.0.0",
    status: "current",
    checkpoint: {
      eventId:
        "event.import.common-credit.transaction.tx-phase-8-readiness.accounting-ledger-entry-posted",
      processedAt: now,
      sequence: 1
    },
    processedEventCount: 1,
    rebuiltAt: now
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

function retryableOutboxRecord(): OutboxRecord {
  return {
    id: "outbox.retryable.failed",
    kind: "outbox",
    schemaVersion: 1,
    createdAt: now,
    eventId: "event.resource.changed",
    eventType: "stewardship.resource.updated",
    destination: {
      kind: "workflow",
      name: "projection-rebuild"
    },
    status: "failed",
    payload: {
      eventId: "event.resource.changed"
    },
    dedupeKey: "resource:event.resource.changed:projection-rebuild",
    attemptCount: 1,
    maxAttempts: 3,
    lastError: "temporary projection worker failure"
  };
}

function pendingFederationOutboxRecord(): OutboxRecord {
  return {
    id: "outbox.federation.pending",
    kind: "outbox",
    schemaVersion: 1,
    createdAt: now,
    eventId:
      "event.import.common-credit.transaction.tx-phase-8-readiness.accounting-ledger-entry-posted",
    eventType: "accounting.ledger-entry.posted",
    destination: {
      kind: "federation-peer",
      name: "riverbend-peer"
    },
    status: "pending",
    payload: {
      eventId:
        "event.import.common-credit.transaction.tx-phase-8-readiness.accounting-ledger-entry-posted"
    },
    dedupeKey:
      "federation:event.import.common-credit.transaction.tx-phase-8-readiness.accounting-ledger-entry-posted:riverbend-peer",
    attemptCount: 0,
    maxAttempts: 3
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

function failedFederationAuditRecord(): AdapterAuditRecord {
  return {
    id: "adapter-audit.federation.failed",
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: now,
    adapterName: "federation.activitypub",
    direction: "egress",
    operation: "federation.export",
    status: "failed",
    startedAt: now,
    completedAt: now,
    eventIds: [
      "event.import.common-credit.transaction.tx-phase-8-readiness.accounting-ledger-entry-posted"
    ],
    outboxIds: ["outbox.federation.pending"],
    warnings: [],
    errors: ["ActivityPub peer rejected redacted export envelope"],
    metadata: { peer: "riverbend-peer" }
  };
}

function failedFederationImportAuditRecord(): AdapterAuditRecord {
  return {
    id: "adapter-audit.federation-import.failed",
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: now,
    adapterName: "workflow.federation-reconciliation",
    direction: "reconciliation",
    operation: "federation.import.reconcile",
    status: "failed",
    startedAt: now,
    completedAt: now,
    eventIds: ["event.federation.reconciliation.completed.peer.quarantined"],
    outboxIds: [],
    warnings: ["Remote event is private."],
    errors: ["Quarantined event.remote.private."],
    metadata: {
      importReportId: "import-report.federation.peer",
      acceptedEventIds: [],
      dispositions: [
        {
          sourceEventId: "event.remote.private",
          localEventId: "event.federation.import.peer.event-remote-private",
          disposition: "quarantined"
        }
      ]
    }
  };
}
