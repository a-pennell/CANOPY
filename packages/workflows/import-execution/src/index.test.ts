import { describe, expect, it } from "vitest";
import {
  dryRunCommonCreditImport,
  foldedSourceSampleExportBundles
} from "@canopy/database-import-plans";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import {
  ImportExecutionError,
  createImportReviewReport,
  executeSampleExportBundleImports,
  executeReviewedImport,
  materializeAcceptedImportEvent
} from "./index.js";

const reviewedAt = "2026-06-13T12:00:00.000Z";

describe("import execution workflow", () => {
  it("keeps dry-run candidates inert until a review accepts mappings and events", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => reviewedAt });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-1",
        from: "account-a",
        to: "account-b",
        amount: 5,
        posted_at: "2026-06-13T10:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun);

    expect(dryRun.status).toBe("pass");
    expect(review.status).toBe("review-required");
    expect(() => executeReviewedImport({ dryRun, review, runtime })).toThrow(
      ImportExecutionError
    );
    expect(runtime.counts()).toMatchObject({ mappings: 0, events: 0 });
  });

  it("writes accepted mappings and materialized import events to the canonical runtime", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => reviewedAt });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-1",
        from: "account-a",
        to: "account-b",
        amount: 5,
        posted_at: "2026-06-13T10:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt
    });

    const result = executeReviewedImport({ dryRun, review, runtime, recordedAt: reviewedAt });

    expect(review.status).toBe("ready");
    expect(result.status).toBe("applied");
    expect(result.mappingRecords).toHaveLength(1);
    expect(result.eventRecords).toHaveLength(1);
    expect(runtime.counts()).toMatchObject({ mappings: 1, events: 1 });
    expect(result.mappingRecords[0]?.status).toBe("approved");
    expect(result.mappingRecords[0]?.source).toMatchObject({
      sourceProject: "common-credit",
      sourceEntity: "transaction",
      sourceId: "tx-1"
    });
    expect(result.eventRecords[0]?.eventId).toBe(
      "event.import.common-credit.transaction.tx-1.accounting-ledger-entry-posted"
    );
    expect(result.eventRecords[0]?.event.payload).toMatchObject({
      dryRun: false,
      importedFromCandidateEventId:
        "event.import-dry-run.common-credit.transaction.tx-1.accounting-ledger-entry-posted"
    });
    expect(result.outboxRecords).toHaveLength(1);
    expect(result.outboxRecords[0]).toMatchObject({
      eventId: "event.import.common-credit.transaction.tx-1.accounting-ledger-entry-posted",
      destination: {
        kind: "workflow",
        name: "projection-rebuild"
      },
      status: "pending"
    });
    expect(result.adapterAuditRecords).toHaveLength(1);
    expect(result.adapterAuditRecords[0]).toMatchObject({
      adapterName: "import.common-credit",
      direction: "migration",
      operation: "import.execute-reviewed",
      status: "succeeded",
      outboxIds: [result.outboxRecords[0]?.id]
    });
    expect(runtime.counts()).toMatchObject({
      mappings: 1,
      events: 1,
      outbox: 1,
      adapterAudits: 1
    });
  });

  it("can execute accepted imports without enqueueing projection work", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => reviewedAt });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-no-outbox",
        from: "account-a",
        to: "account-b",
        amount: 5,
        posted_at: "2026-06-13T10:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt
    });

    const result = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: reviewedAt,
      enqueueProjectionRebuild: false
    });

    expect(result.status).toBe("applied");
    expect(result.outboxRecords).toEqual([]);
    expect(result.adapterAuditRecords[0]?.outboxIds).toEqual([]);
    expect(runtime.counts()).toMatchObject({
      mappings: 1,
      events: 1,
      outbox: 0,
      adapterAudits: 1
    });
  });

  it("executes sample export bundles for all folded source projects", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => reviewedAt });

    const results = executeSampleExportBundleImports({
      bundles: foldedSourceSampleExportBundles,
      runtime,
      recordedAt: reviewedAt
    });

    expect(results.map((result) => result.bundle.sourceProject)).toEqual([
      "common-credit",
      "icos",
      "sensemaking",
      "stewardship"
    ]);
    expect(results.map((result) => result.dryRun.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass"
    ]);
    expect(results.map((result) => result.execution.review.status)).toEqual([
      "ready",
      "ready",
      "ready",
      "ready"
    ]);
    expect(results.map((result) => result.execution.status)).toEqual([
      "applied",
      "applied",
      "applied",
      "applied"
    ]);

    const expectedRecordCount = foldedSourceSampleExportBundles.reduce(
      (total, bundle) =>
        total + bundle.files.reduce((bundleTotal, file) => bundleTotal + file.records.length, 0),
      0
    );
    const mappingRecords = results.flatMap((result) => result.execution.mappingRecords);
    const eventRecords = results.flatMap((result) => result.execution.eventRecords);
    const outboxRecords = results.flatMap((result) => result.execution.outboxRecords);

    expect(mappingRecords).toHaveLength(expectedRecordCount);
    expect(eventRecords).toHaveLength(expectedRecordCount);
    expect(outboxRecords).toHaveLength(expectedRecordCount);
    expect(results.flatMap((result) => result.execution.adapterAuditRecords)).toHaveLength(4);
    expect(runtime.counts()).toMatchObject({
      mappings: expectedRecordCount,
      events: expectedRecordCount,
      outbox: expectedRecordCount,
      adapterAudits: 4
    });
    expect(mappingRecords.map((record) => record.canonicalType)).toEqual(
      expect.arrayContaining([
        "person",
        "organization",
        "ledger-account",
        "ledger-entry",
        "role",
        "mandate",
        "decision",
        "claim",
        "evidence",
        "model",
        "living-system",
        "resource",
        "use-right",
        "task"
      ])
    );
    expect(eventRecords.map((record) => record.eventType)).toEqual(
      expect.arrayContaining([
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed",
        "authority.role.assigned",
        "authority.mandate.granted",
        "governance.decision.recorded",
        "claim.contested",
        "evidence.linked_to_claim",
        "ecology.living_system.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed"
      ])
    );
    expect(
      eventRecords.every((record) => record.event.payload.dryRun === false)
    ).toBe(true);
    expect(
      eventRecords.every((record) => typeof record.event.payload.importedFromCandidateEventId === "string")
    ).toBe(true);
    expect(
      outboxRecords.every(
        (record) =>
          record.destination.kind === "workflow" &&
          record.destination.name === "projection-rebuild" &&
          record.status === "pending" &&
          jsonObject(record.payload)?.source === "import-execution"
      )
    ).toBe(true);

    const commonCreditLedgerEvent = eventRecords.find(
      (record) => record.eventId === "event.import.common-credit.transaction.cc-tx-food-hub-1.accounting-ledger-entry-posted"
    );
    expect(commonCreditLedgerEvent?.event.payload).toMatchObject({
      sourceBundleId: "sample.common-credit.riverbend.2026-01-16",
      sourceBundleFilePath: "exports/common-credit/ledger.jsonl",
      sourceBundleFileFormat: "jsonl",
      sourceBundleFileContentHash: "sha256:sample-common-credit-ledger"
    });
    expect(commonCreditLedgerEvent?.event.provenance).toMatchObject({
      kind: "imported",
      sourceEnvelopeId: "sample.common-credit.riverbend.2026-01-16",
      sourceContentHash: "sha256:sample-common-credit-ledger",
      collectedAt: "2026-01-16T12:00:00.000Z"
    });
  });

  it("does not execute blocked dry-runs even when callers request acceptance", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => reviewedAt });
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-2",
        from: "account-a",
        to: "account-b",
        amount: 5,
        posted_at: "2026-06-13T10:00:00.000Z",
        status: "posted"
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt
    });

    expect(dryRun.status).toBe("blocked");
    expect(review.status).toBe("blocked");
    expect(() => executeReviewedImport({ dryRun, review, runtime })).toThrow(
      /blocker warnings or prohibited outcomes/
    );
    expect(runtime.counts()).toMatchObject({ mappings: 0, events: 0 });
  });

  it("materializes accepted import events without mutating candidate events", () => {
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "transaction",
        id: "tx-3",
        from: "account-a",
        to: "account-b",
        amount: 8,
        posted_at: "2026-06-13T11:00:00.000Z",
        authorityRef: "agreement.local-ledger",
        status: "posted"
      }
    ]);
    const candidate = dryRun.candidateEvents[0];

    if (candidate === undefined) {
      throw new Error("expected a candidate event");
    }

    const accepted = materializeAcceptedImportEvent(candidate);

    expect(candidate.payload.dryRun).toBe(true);
    expect(accepted.payload.dryRun).toBe(false);
    expect(accepted.id).not.toBe(candidate.id);
    expect(accepted.objectRef).toEqual(candidate.objectRef);
  });
});

function jsonObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}
