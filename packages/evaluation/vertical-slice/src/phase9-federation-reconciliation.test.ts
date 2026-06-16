import { describe, expect, it } from "vitest";
import {
  executeRiverbendFederationReconciliationSlice,
  executeRiverbendTrustHardeningSlice
} from "./index.js";
import { reconcileFederationImport } from "@canopy/workflows-federation-reconciliation";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import type { FederationTransportMessage } from "@canopy/contracts-adapters";
import type { CanopyEvent } from "@canopy/contracts-kernel";

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

  it("imports the Riverbend export when strict stewardship agreement presence is required", () => {
    const phase9 = executeRiverbendFederationReconciliationSlice();
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-14T12:00:00.000Z"
    });

    expect(phase9.federationExport.envelope.dataStewardshipAgreements).toEqual([
      expect.objectContaining({
        governedRef: phase9.refs.retrospectiveRef,
        federationRuleRef: phase9.refs.dataStewardshipAgreementRef,
        visibility: "federation",
        allowedUses: expect.arrayContaining(["export", "federate"])
      })
    ]);

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

    expect(strict.status).toBe("applied");
    expect(strict.trustAssessment.status).toBe("trusted");
    expect(strict.trustAssessment.issues).toEqual([]);
    expect(strict.eventRecords.length).toBeGreaterThan(10);
    expect(strict.lifecycleEventRecords[1]?.event.payload).toMatchObject({
      trustStatus: "trusted",
      trustIssueCodes: []
    });
  });

  it("reconciles multi-peer duplicate object-ref conflicts into quarantine review", () => {
    const phase9 = executeRiverbendFederationReconciliationSlice();
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-14T12:00:00.000Z"
    });
    const localEvents = [
      requiredEvent(phase9.events, "event.claim.created.school-meal-need"),
      requiredEvent(phase9.events, "event.evidence.created.school-kitchen-intake"),
      requiredEvent(phase9.events, "event.stewardship.use_right.granted.school-crop-share")
    ];
    for (const event of localEvents) {
      runtime.appendEvent(event, { recordedAt: "2026-06-14T12:00:00.000Z" });
    }

    const messages = buildPeerConflictMessages(phase9);
    const reconciliations = messages.map((message) =>
      reconcileFederationImport({
        message,
        runtime,
        receivedAt: "2026-06-14T12:00:00.000Z",
        importedByRef: phase9.refs.federationPeerRef
      })
    );

    expect(messages.map((message) => message.id)).toEqual([
      "message.federation.downstream.phase-9-conflicts",
      "message.federation.hilltown.phase-9-conflicts"
    ]);
    expect(reconciliations.map((result) => result.status)).toEqual([
      "quarantined",
      "quarantined"
    ]);
    expect(reconciliations.flatMap((result) =>
      result.decisions.map((decision) => ({
        sourceEventId: decision.sourceEventId,
        objectRefId: decision.objectRef.id,
        disposition: decision.disposition,
        warningCodes: decision.warnings.map((warning) => warning.code)
      }))
    )).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceEventId: "event.claim.created.school-meal-need",
          objectRefId: "claim.school-meal-produce-need",
          disposition: "quarantined",
          warningCodes: expect.arrayContaining(["federation_rule_conflict"])
        }),
        expect.objectContaining({
          sourceEventId: "event.evidence.created.school-kitchen-intake",
          objectRefId: "evidence.school-kitchen-intake",
          disposition: "quarantined",
          warningCodes: expect.arrayContaining(["federation_rule_conflict"])
        }),
        expect.objectContaining({
          sourceEventId: "event.stewardship.use_right.granted.school-crop-share",
          objectRefId: "use-right.school-crop-share",
          disposition: "quarantined",
          warningCodes: expect.arrayContaining(["federation_rule_conflict"])
        })
      ])
    );
    expect(reconciliations.flatMap((result) =>
      result.lifecycleEventRecords.map((record) => record.event.payload)
    )).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "quarantined",
          quarantineReview: expect.arrayContaining([
            expect.objectContaining({
              sourceEventId: "event.claim.created.school-meal-need",
              nextAction: "remediate"
            })
          ])
        }),
        expect.objectContaining({
          status: "quarantined",
          quarantineReview: expect.arrayContaining([
            expect.objectContaining({
              sourceEventId: "event.stewardship.use_right.granted.school-crop-share",
              nextAction: "remediate"
            })
          ])
        })
      ])
    );
  });
});

function buildPeerConflictMessages(
  phase9: ReturnType<typeof executeRiverbendFederationReconciliationSlice>
): readonly FederationTransportMessage[] {
  return [
    peerConflictMessage(phase9, {
      peerToken: "downstream",
      peerLabel: "Downstream School Commons",
      events: [
        peerConflictEvent(requiredEvent(phase9.events, "event.claim.created.school-meal-need"), {
          summary: "Downstream peer reports only twelve produce boxes can be absorbed before the next meal cycle.",
          dataState: "testimony_derived"
        }),
        peerConflictEvent(requiredEvent(phase9.events, "event.evidence.created.school-kitchen-intake"), {
          summary: "Downstream kitchen note confirms twelve boxes and flags cold-storage uncertainty.",
          dataState: "unverified",
          visibility: "role_restricted"
        })
      ]
    }),
    peerConflictMessage(phase9, {
      peerToken: "hilltown",
      peerLabel: "Hilltown Stewardship Circle",
      events: [
        peerConflictEvent(requiredEvent(phase9.events, "event.stewardship.use_right.granted.school-crop-share"), {
          summary: "Hilltown steward proposes a ten-box cap until watershed follow-up is complete.",
          dataState: "contested"
        })
      ]
    })
  ];
}

function peerConflictMessage(
  phase9: ReturnType<typeof executeRiverbendFederationReconciliationSlice>,
  input: {
    readonly peerToken: string;
    readonly peerLabel: string;
    readonly events: readonly CanopyEvent[];
  }
): FederationTransportMessage {
  const envelope = {
    ...phase9.federationExport.envelope,
    id: `export-envelope.${input.peerToken}.phase-9-conflicts`,
    exportedByRef: {
      ...phase9.refs.federationPeerRef,
      id: `organization.${input.peerToken}-peer-commons`
    },
    contentHash: `sha256:${input.peerToken}-phase-9-conflicts`
  };

  return {
    id: `message.federation.${input.peerToken}.phase-9-conflicts`,
    federationRuleRef:
      envelope.federationRuleRef ??
      phase9.refs.dataStewardshipAgreementRef,
    sentAt: "2026-06-14T12:00:00.000Z",
    receivedAt: "2026-06-14T12:00:00.000Z",
    eventIds: input.events.map((event) => event.id),
    objectRefs: input.events.map((event) => event.objectRef),
    payload: {
      envelope,
      events: input.events,
      peerLabel: input.peerLabel
    },
    contentHash: envelope.contentHash,
    schemaVersion: envelope.schemaVersion
  };
}

function peerConflictEvent(
  event: CanopyEvent,
  input: {
    readonly summary: string;
    readonly dataState: NonNullable<CanopyEvent["dataState"]>;
    readonly visibility?: CanopyEvent["visibility"];
  }
): CanopyEvent {
  return {
    ...event,
    dataState: input.dataState,
    ...(input.visibility === undefined ? {} : { visibility: input.visibility }),
    payload: {
      ...event.payload,
      summary: input.summary,
      phase9PeerConflictFixture: true
    }
  };
}

function requiredEvent(
  events: readonly CanopyEvent[],
  eventId: string
): CanopyEvent {
  const event = events.find((item) => item.id === eventId);

  if (event === undefined) {
    throw new Error(`Missing Phase 9 fixture event ${eventId}.`);
  }

  return event;
}
