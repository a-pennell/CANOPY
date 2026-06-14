import { describe, expect, it } from "vitest";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { dryRunCommonCreditImport } from "@canopy/database-import-plans";
import {
  createImportReviewReport,
  executeReviewedImport
} from "@canopy/workflows-import-execution";
import {
  buildCanopyOperationsReport,
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
    expect(report.findings).toEqual(["expected projections have not been built"]);
    expect(report.outbox.total).toBe(0);
    expect(report.projections.missingProjectionNames).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet"
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
    expect(cycle.report.counts).toMatchObject({
      mappings: 1,
      events: 1,
      outbox: 1,
      projectionStates: 6,
      adapterAudits: 2
    });
    expect(cycle.report.outbox.byStatus.acknowledged).toBe(1);
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
});
