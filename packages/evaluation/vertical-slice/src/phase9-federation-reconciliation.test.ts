import { describe, expect, it } from "vitest";
import {
  executeRiverbendFederationReconciliationSlice,
  executeRiverbendTrustHardeningSlice
} from "./index.js";
import { reconcileFederationImport } from "@canopy/workflows-federation-reconciliation";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";

describe("Phase 9 Riverbend federation reconciliation", () => {
  it("imports the Phase 8 export envelope into a receiving canonical runtime", () => {
    const phase8 = executeRiverbendTrustHardeningSlice();
    const phase9 = executeRiverbendFederationReconciliationSlice();

    expect(phase9.federationTransportMessage.contentHash).toBe(
      phase8.federationExport.envelope.contentHash
    );
    expect(phase9.federationTransportMessage.eventIds).toEqual(
      phase8.federationExport.preview.eventIds
    );
    expect(phase9.federationReconciliation.status).toBe("applied");
    expect(phase9.federationReconciliation.trustAssessment.status).toBe("trusted");
    expect(phase9.federationReconciliation.lifecycleEventRecords.map((record) => record.eventType)).toEqual([
      "federation.import.received",
      "federation.reconciliation.completed"
    ]);
    expect(phase9.federationReconciliation.lifecycleEventRecords[1]?.event.payload).toMatchObject({
      status: "applied",
      trustStatus: "trusted",
      sourceEnvelopeId: phase9.federationExport.envelope.id
    });
    expect(phase9.phase9EventIds).toHaveLength(phase9.federationTransportMessage.eventIds.length);
    expect(phase9.phase9EventIds.every((eventId) =>
      eventId.startsWith("event.federation.import.")
    )).toBe(true);
    expect(phase9.federationReconciliation.eventRecords.map((record) => record.eventId)).toEqual(
      phase9.phase9EventIds
    );
    expect(phase9.federationReceivingRuntime.counts()).toMatchObject({
      mappings: phase9.federationReconciliation.mappingRecords.length,
      events: phase9.phase9EventIds.length + phase9.federationReconciliation.lifecycleEventRecords.length,
      outbox: phase9.phase9EventIds.length + phase9.federationReconciliation.lifecycleEventRecords.length,
      projectionStates: 7,
      adapterAudits: 1
    });
  });

  it("preserves remote provenance, local mappings, and redaction warnings", () => {
    const phase9 = executeRiverbendFederationReconciliationSlice();
    const sourceEventIds = new Set(phase9.federationTransportMessage.eventIds);
    const importedEvents = phase9.federationReconciliation.eventRecords.map(
      (record) => record.event
    );

    expect(importedEvents.every((event) => !sourceEventIds.has(event.id))).toBe(true);
    expect(importedEvents[0]?.provenance).toMatchObject({
      kind: "federated",
      sourceEnvelopeId: phase9.federationExport.envelope.id,
      sourceContentHash: phase9.federationExport.envelope.contentHash,
      importedAt: "2026-06-14T12:00:00.000Z"
    });
    expect(importedEvents[0]?.payload).toMatchObject({
      importedFromFederationEnvelopeId: phase9.federationExport.envelope.id,
      importedFromFederationMessageId: phase9.federationTransportMessage.id
    });
    expect(phase9.federationReconciliation.importReport.acceptedObjectRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        phase9.refs.adaptiveAppealRef.id,
        phase9.refs.adaptiveConflictRef.id,
        phase9.refs.consentRedactionRef.id,
        phase9.refs.evidenceRef.id
      ])
    );
    expect(phase9.federationReconciliation.importReport.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["redaction_stub_only"])
    );
    expect(phase9.federationReconciliation.adapterAuditRecords[0]).toMatchObject({
      adapterName: "workflow.federation-reconciliation",
      operation: "federation.import.reconcile",
      status: "succeeded"
    });
  });

  it("is idempotent when the same federation message is reconciled again", () => {
    const phase9 = executeRiverbendFederationReconciliationSlice();
    const duplicate = reconcileFederationImport({
      message: phase9.federationTransportMessage,
      runtime: phase9.federationReceivingRuntime,
      receivedAt: "2026-06-14T12:00:00.000Z"
    });

    expect(duplicate.status).toBe("duplicates-only");
    expect(duplicate.eventRecords).toEqual([]);
    expect(duplicate.lifecycleEventRecords.map((record) => record.eventType)).toEqual([
      "federation.import.received",
      "federation.reconciliation.completed"
    ]);
    expect(duplicate.outboxRecords).toHaveLength(2);
    expect(duplicate.adapterAuditRecords[0]?.status).toBe("skipped");
    expect(phase9.federationReceivingRuntime.counts().events).toBe(
      phase9.phase9EventIds.length + 3
    );
  });

  it("quarantines the Riverbend export when strict stewardship agreement presence is required", () => {
    const phase9 = executeRiverbendFederationReconciliationSlice();
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-14T12:00:00.000Z"
    });

    expect(phase9.federationExport.envelope.dataStewardshipAgreements).toEqual([]);

    const strict = reconcileFederationImport({
      message: phase9.federationTransportMessage,
      runtime,
      receivedAt: "2026-06-14T12:00:00.000Z",
      trustPolicy: {
        allowedSenderRefs: [phase9.federationExport.envelope.exportedByRef],
        allowedSchemaVersions: [phase9.federationExport.envelope.schemaVersion],
        expectedFederationRuleRefs: [phase9.refs.dataStewardshipAgreementRef],
        requireDataStewardshipAgreement: true
      }
    });

    expect(strict.status).toBe("quarantined");
    expect(strict.trustAssessment.issues.map((issue) => issue.code)).toEqual([
      "stewardship_agreement_missing"
    ]);
    expect(strict.eventRecords).toEqual([]);
    expect(strict.lifecycleEventRecords[1]?.event.payload).toMatchObject({
      trustStatus: "rejected",
      trustIssueCodes: ["stewardship_agreement_missing"]
    });
  });
});
