import { describe, expect, it } from "vitest";
import type { FederationTransportMessage } from "@canopy/contracts-adapters";
import type {
  CanopyEvent,
  CanopyExportEnvelope,
  CanopyId,
  ObjectRef
} from "@canopy/contracts-kernel";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryMaterializedProjectionStore } from "@canopy/workflows-projection-rebuild";
import {
  FederationReconciliationError,
  materializeFederatedEvent,
  reconcileFederationImport
} from "./index.js";

const receivedAt = "2026-06-15T09:30:00.000Z";

describe("federation reconciliation workflow", () => {
  it("accepts a governed export envelope into canonical runtime state", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => receivedAt });
    const materializedProjections = createInMemoryMaterializedProjectionStore();
    const events = [
      canopyEvent({
        id: "event.claim.created.upriver-nitrate",
        type: "claim.created",
        objectRef: ref("claim.upriver-nitrate", "claim"),
        relatedRefs: [ref("evidence.sensor-reading", "evidence")]
      }),
      canopyEvent({
        id: "event.system.redaction.applied.upriver-nitrate",
        type: "system.redaction.applied",
        objectRef: ref("evidence.sensor-reading", "evidence"),
        relatedRefs: [ref("claim.upriver-nitrate", "claim")],
        redacted: true
      })
    ];
    const envelope = exportEnvelope(events);
    const message = transportMessage({ envelope, events });

    const result = reconcileFederationImport({
      message,
      runtime,
      receivedAt,
      projectionRebuildOptions: {
        materializedProjections
      }
    });

    expect(result.status).toBe("applied");
    expect(result.decisions.map((decision) => decision.disposition)).toEqual([
      "accepted",
      "accepted"
    ]);
    expect(result.importReport).toMatchObject({
      sourceEnvelopeId: envelope.id,
      sourceContentHash: envelope.contentHash,
      acceptedEventIds: result.eventRecords.map((record) => record.eventId)
    });
    expect(result.importReport.warnings.map((item) => item.code)).toContain(
      "redaction_stub_only"
    );
    expect(result.mappingRecords.map((record) => record.canonicalRef.id)).toEqual([
      "claim.upriver-nitrate",
      "evidence.sensor-reading"
    ]);
    expect(result.eventRecords).toHaveLength(2);
    expect(result.eventRecords[0]?.eventId).toBe(
      "event.federation.import.envelope-upriver-nitrate.event-claim-created-upriver-nitrate"
    );
    expect(result.eventRecords[0]?.event.provenance).toMatchObject({
      kind: "federated",
      sourceEventId: "event.claim.created.upriver-nitrate",
      sourceEnvelopeId: envelope.id,
      sourceContentHash: envelope.contentHash,
      importedAt: receivedAt
    });
    expect(result.eventRecords[0]?.event.payload).toMatchObject({
      importedFromFederationEnvelopeId: envelope.id,
      importedFromFederationMessageId: message.id,
      importedFromFederationEventId: "event.claim.created.upriver-nitrate",
      importedAt: receivedAt
    });
    expect(result.outboxRecords.map((record) => record.destination)).toEqual([
      { kind: "workflow", name: "projection-rebuild" },
      { kind: "workflow", name: "projection-rebuild" }
    ]);
    expect(result.adapterAuditRecords[0]).toMatchObject({
      adapterName: "workflow.federation-reconciliation",
      direction: "reconciliation",
      operation: "federation.import.reconcile",
      status: "succeeded",
      eventIds: result.eventRecords.map((record) => record.eventId),
      outboxIds: result.outboxRecords.map((record) => record.id)
    });
    expect(result.projectionRebuild?.persistedStates.map((state) => state.id)).toEqual([
      "projection-state.object-page",
      "projection-state.civic-memory",
      "projection-state.authority",
      "projection-state.claim-evidence",
      "projection-state.resource-stewardship",
      "projection-state.decision-packet",
      "projection-state.federation-export"
    ]);
    expect(runtime.counts()).toMatchObject({
      mappings: 2,
      events: 2,
      outbox: 2,
      projectionStates: 7,
      adapterAudits: 1
    });
  });

  it("treats a repeated federation message as duplicate-only and does not append events twice", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => receivedAt });
    const events = [canopyEvent({ id: "event.claim.created.once" })];
    const envelope = exportEnvelope(events);
    const message = transportMessage({ envelope, events });

    reconcileFederationImport({ message, runtime, receivedAt });
    const result = reconcileFederationImport({ message, runtime, receivedAt });

    expect(result.status).toBe("duplicates-only");
    expect(result.eventRecords).toEqual([]);
    expect(result.outboxRecords).toEqual([]);
    expect(result.importReport.acceptedEventIds).toEqual([]);
    expect(result.adapterAuditRecords[0]?.status).toBe("skipped");
    expect(runtime.counts()).toMatchObject({
      events: 1,
      outbox: 1,
      adapterAudits: 1
    });
  });

  it("quarantines private events and conflicting remote source ids", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => receivedAt });
    const conflictingEvent = canopyEvent({ id: "event.claim.created.conflict" });
    runtime.appendEvent(conflictingEvent, { recordedAt: receivedAt });
    const privateEvent = canopyEvent({
      id: "event.claim.created.private",
      objectRef: ref("claim.private", "claim"),
      visibility: "private"
    });
    const events = [conflictingEvent, privateEvent];
    const envelope = exportEnvelope(events);
    const message = transportMessage({ envelope, events });

    const result = reconcileFederationImport({ message, runtime, receivedAt });

    expect(result.status).toBe("quarantined");
    expect(result.decisions.map((decision) => decision.disposition)).toEqual([
      "quarantined",
      "quarantined"
    ]);
    expect(result.importReport.acceptedEventIds).toEqual([]);
    expect(result.importReport.warnings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "federation_rule_conflict",
        "stewardship_rule_conflict"
      ])
    );
    expect(result.mappingRecords).toEqual([]);
    expect(result.eventRecords).toEqual([]);
    expect(result.outboxRecords).toEqual([]);
    expect(result.adapterAuditRecords[0]?.status).toBe("failed");
    expect(runtime.counts()).toMatchObject({ events: 1, outbox: 0 });
  });

  it("fails closed when the transport hash does not match the envelope", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => receivedAt });
    const events = [canopyEvent({ id: "event.claim.created.hash-check" })];
    const envelope = exportEnvelope(events);
    const message = transportMessage({
      envelope,
      events,
      contentHash: "sha256:not-the-envelope"
    });

    expect(() => reconcileFederationImport({ message, runtime, receivedAt })).toThrow(
      FederationReconciliationError
    );
    expect(runtime.counts()).toMatchObject({ events: 0, mappings: 0 });
  });

  it("materializes deterministic local ids for federated events", () => {
    const event = canopyEvent({ id: "event.claim.created.local-id" });
    const envelope = exportEnvelope([event]);
    const message = transportMessage({ envelope, events: [event] });

    expect(
      materializeFederatedEvent(event, { envelope, message, receivedAt }).id
    ).toBe("event.federation.import.envelope-upriver-nitrate.event-claim-created-local-id");
  });
});

function transportMessage(input: {
  readonly envelope: CanopyExportEnvelope;
  readonly events: readonly CanopyEvent[];
  readonly contentHash?: string;
}): FederationTransportMessage {
  return optionalTransportMessage({
    id: "message.upriver-nitrate",
    federationRuleRef: ref("agreement.upriver-data-sharing", "agreement"),
    sentAt: "2026-06-15T09:00:00.000Z",
    receivedAt,
    eventIds: input.events.map((event) => event.id),
    objectRefs: input.events.map((event) => event.objectRef),
    payload: {
      envelope: input.envelope,
      events: input.events
    },
    contentHash: input.contentHash ?? input.envelope.contentHash,
    schemaVersion: 1
  });
}

function exportEnvelope(events: readonly CanopyEvent[]): CanopyExportEnvelope {
  return {
    id: "envelope.upriver-nitrate",
    exportedAt: "2026-06-15T09:00:00.000Z",
    exportedByRef: ref("org.upriver-food-commons", "organization"),
    scopeRef: ref("commons.upriver-foodshed", "commons"),
    format: "json",
    schemaVersion: 1,
    includes: [...new Set(events.map((event) => event.objectRef.type))].sort(),
    authorityRefs: [ref("agreement.upriver-data-sharing", "agreement")],
    federationRuleRef: ref("agreement.upriver-data-sharing", "agreement"),
    dataStewardshipAgreements: [],
    localMappings: [],
    contentHash: "sha256:upriver-nitrate-export",
    contentHashFields: {
      contentHash: "sha256:upriver-nitrate-export",
      hashAlgorithm: "sha256",
      canonicalization: "json_canonical"
    }
  };
}

function canopyEvent(input: {
  readonly id: CanopyId;
  readonly type?: CanopyEvent["type"];
  readonly objectRef?: ObjectRef;
  readonly relatedRefs?: readonly ObjectRef[];
  readonly visibility?: CanopyEvent["visibility"];
  readonly redacted?: boolean;
}): CanopyEvent {
  const authorityRef = ref("agreement.upriver-data-sharing", "agreement");
  const objectRef = input.objectRef ?? ref("claim.upriver-nitrate", "claim");
  return optionalEvent({
    id: input.id,
    type: input.type ?? "claim.created",
    occurredAt: "2026-06-15T08:45:00.000Z",
    actorRef: ref("person.nia", "person"),
    objectRef,
    relatedRefs: input.relatedRefs ?? [],
    authorityRefs: [authorityRef],
    orgId: "org.upriver-food-commons",
    placeId: "place.upriver",
    commonsId: "commons.upriver-foodshed",
    sourceCapability: objectRef.type === "evidence" ? "data-stewardship" : "claims-evidence",
    payload: {
      title: "Upriver nitrate claim",
      remote: true
    },
    schemaVersion: 1,
    visibility: input.visibility ?? "commons",
    contentHash: `sha256:${input.id}`,
    ...(input.redacted === true
      ? {
          redaction: {
            isRedactedStub: true,
            originalEventId: "event.evidence.created.sensor-reading",
            redactionEventId: input.id,
            redactedAt: "2026-06-15T08:45:00.000Z",
            reason: "privacy" as const,
            preservedFields: ["id", "type", "objectRef"],
            removedPayloadKeys: ["payload.preciseLocation"],
            originalContentHash: "sha256:full-sensor-reading",
            redactedContentHash: `sha256:${input.id}`,
            dataStewardshipAgreementRef: authorityRef
          }
        }
      : {})
  });
}

function ref(id: CanopyId, type: ObjectRef["type"], namespace = "canopy.test"): ObjectRef {
  return {
    id,
    type,
    namespace,
    lifecycleStatus: "active"
  };
}

function optionalEvent(event: CanopyEvent): CanopyEvent {
  return JSON.parse(JSON.stringify(event)) as CanopyEvent;
}

function optionalTransportMessage(message: FederationTransportMessage): FederationTransportMessage {
  return JSON.parse(JSON.stringify(message)) as FederationTransportMessage;
}
