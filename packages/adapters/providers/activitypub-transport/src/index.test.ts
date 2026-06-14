import { describe, expect, it } from "vitest";
import type {
  FederationTransportMessage
} from "@canopy/contracts-adapters";
import type { ObjectRef } from "@canopy/contracts-kernel";
import {
  activitypubTransportAdapterTrack,
  createActivityPubTransportAdapter
} from "./index.js";

const federationRuleRef: ObjectRef = {
  id: "federation-rule.neighbor-commons",
  type: "policy",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const peerRef: ObjectRef = {
  id: "federation-peer.neighbor-commons",
  type: "source",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const authorityRef: ObjectRef = {
  id: "mandate.federation",
  type: "mandate",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const evidenceRef: ObjectRef = {
  id: "evidence.water-sample",
  type: "evidence",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const redactedEvidenceRef: ObjectRef = {
  id: "evidence.protected-location",
  type: "evidence",
  namespace: "canopy.test",
  lifecycleStatus: "redacted",
  source: {
    sourceProject: "canopy",
    sourceEntity: "evidence",
    sourceId: "protected-location"
  }
};

const baseMessage: FederationTransportMessage = {
  id: "federation.message.export.water",
  federationRuleRef,
  eventIds: ["event.federation.export.created.water"],
  objectRefs: [evidenceRef],
  payload: {
    envelopeId: "export.water",
    schemaVersion: 1,
    public: "safe to share"
  },
  contentHash: "sha256:water-envelope",
  schemaVersion: 1
};

describe("ActivityPubTransportAdapter prototype", () => {
  it("stores sent exports as receivable ActivityPub-shaped messages with hash metadata", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T10:00:00.000Z"
    });

    const sent = await adapter.send(baseMessage);
    const received = await adapter.receive();
    const exported = await adapter.exportMessages();

    expect(sent.ok).toBe(true);
    expect(sent.value).toMatchObject({
      id: baseMessage.id,
      contentHash: "sha256:water-envelope",
      schemaVersion: 1,
      sentAt: "2026-06-13T10:00:00.000Z"
    });
    expect(received.value?.items[0]).toMatchObject({
      id: baseMessage.id,
      contentHash: "sha256:water-envelope",
      schemaVersion: 1,
      receivedAt: "2026-06-13T10:00:00.000Z"
    });
    expect(exported.value?.items.map((message) => message.id)).toEqual([baseMessage.id]);

    const snapshot = adapter.snapshot();
    expect(snapshot.outbox[0]?.activity).toMatchObject({
      type: "Create",
      object: {
        type: "CanopyFederationMessage",
        messageKind: "export",
        contentHash: "sha256:water-envelope",
        schemaVersion: 1
      }
    });
  });

  it("removes redaction-reviewed and rule-blocked payload fields without mutating input", async () => {
    const adapter = createActivityPubTransportAdapter({
      rules: [
        {
          federationRuleRef,
          peerRef,
          allowedObjectTypes: ["evidence"],
          allowedEventTypes: ["federation.export.created"],
          exportAllowed: true,
          importAllowed: true,
          redactionRequired: true,
          blockedPayloadFields: ["internalMemo"]
        }
      ]
    });
    const message: FederationTransportMessage = {
      ...baseMessage,
      id: "federation.message.export.redacted",
      objectRefs: [redactedEvidenceRef],
      payload: {
        public: "visible",
        privateNote: "must not leave",
        internalMemo: "peer should not see",
        nested: {
          privateNote: "nested secret",
          visible: "nested visible"
        },
        redactionSummary: {
          redactionCount: 1,
          removedFields: ["privateNote"]
        }
      },
      contentHash: "sha256:redacted-envelope"
    };

    const sent = await adapter.send(message);

    expect(sent.ok).toBe(true);
    expect(sent.value?.payload).toEqual({
      public: "visible",
      nested: {
        visible: "nested visible"
      },
      redactionSummary: {
        redactionCount: 1,
        removedFields: ["privateNote"]
      }
    });
    expect(message.payload).toHaveProperty("privateNote");
    expect(message.payload).toHaveProperty("internalMemo");
    expect(sent.value?.objectRefs[0]).toEqual(redactedEvidenceRef);
  });

  it("enforces stewardship rule object/event filters and redaction review", async () => {
    const adapter = createActivityPubTransportAdapter({
      rules: [
        {
          federationRuleRef,
          peerRef,
          allowedObjectTypes: ["evidence"],
          allowedEventTypes: ["federation.export.created"],
          exportAllowed: true,
          importAllowed: false,
          redactionRequired: true,
          blockedPayloadFields: []
        }
      ]
    });

    const blockedObject = await adapter.send({
      ...baseMessage,
      id: "federation.message.blocked-object",
      objectRefs: [
        {
          id: "decision.not-shareable",
          type: "decision",
          namespace: "canopy.test",
          lifecycleStatus: "active"
        }
      ]
    });
    const blockedImport = await adapter.importMessage({
      ...baseMessage,
      id: "federation.message.blocked-import"
    });
    const missingRedaction = await adapter.send({
      ...baseMessage,
      id: "federation.message.needs-redaction",
      objectRefs: [redactedEvidenceRef]
    });

    expect(blockedObject.ok).toBe(false);
    expect(blockedObject.errors[0]?.code).toBe("forbidden");
    expect(blockedImport.ok).toBe(false);
    expect(blockedImport.errors[0]?.code).toBe("forbidden");
    expect(missingRedaction.ok).toBe(false);
    expect(missingRedaction.errors[0]?.code).toBe("redaction_required");
  });

  it("imports inbound messages, pages receives, and records acknowledgements", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T11:00:00.000Z"
    });

    await adapter.importMessage({
      ...baseMessage,
      id: "federation.message.import.1",
      eventIds: ["event.federation.import.received.1"],
      payload: {
        importEnvelopeId: "import.1",
        schemaVersion: 1
      }
    });
    await adapter.importMessage({
      ...baseMessage,
      id: "federation.message.import.2",
      eventIds: ["event.federation.import.received.2"],
      payload: {
        importEnvelopeId: "import.2",
        schemaVersion: 1
      }
    });

    const firstPage = await adapter.receive({ limit: 1 });
    const acknowledged = await adapter.acknowledge(
      "federation.message.import.1",
      [authorityRef]
    );

    expect(firstPage.value?.items.map((message) => message.id)).toEqual([
      "federation.message.import.1"
    ]);
    expect(firstPage.value?.nextCursor).toBe("1");
    expect(acknowledged.ok).toBe(true);
    expect(adapter.snapshot().acknowledgedMessageIds).toEqual([
      "federation.message.import.1"
    ]);
    expect(adapter.snapshot().inbox[0]?.activity.object.messageKind).toBe("import");
  });

  it("receives inbound ActivityPub messages as canonical mapping, event, outbox, audit, and SQL-plan records", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T11:15:00.000Z"
    });
    const message: FederationTransportMessage = {
      ...baseMessage,
      id: "federation.message.import.canonical",
      eventIds: ["event.federation.import.received.canonical"],
      payload: {
        importEnvelopeId: "import.canonical",
        schemaVersion: 1,
        public: "peer claim"
      }
    };

    const received = await adapter.receiveCanonical(message);
    const duplicate = await adapter.receiveCanonical(message);

    expect(received.ok).toBe(true);
    expect(received.value).toMatchObject({
      status: "accepted",
      dedupeKey: "activitypub:inbound:federation.message.import.canonical",
      mapping: {
        kind: "canonical-mapping",
        source: {
          sourceEntity: "activitypub-message",
          sourceId: "federation.message.import.canonical"
        },
        canonicalRef: evidenceRef,
        disposition: "artifact",
        status: "approved"
      },
      event: {
        kind: "event",
        eventId: "event.federation.import.received.canonical",
        eventType: "federation.import.received",
        objectRef: evidenceRef
      },
      outbox: {
        kind: "outbox",
        eventId: "event.federation.import.received.canonical",
        destination: {
          kind: "workflow",
          name: "federation-receive"
        },
        status: "pending"
      },
      adapterAudit: {
        kind: "adapter-audit",
        operation: "receiveCanonical",
        status: "succeeded"
      }
    });
    expect(
      received.value?.canonicalSqlPlan.statements.map((statement) => statement.tableName)
    ).toEqual([
      "canopy_object_refs",
      "canopy_object_refs",
      "canopy_object_refs",
      "canopy_canonical_mappings",
      "canopy_events",
      "canopy_outbox",
      "canopy_adapter_audit"
    ]);
    expect(duplicate.ok).toBe(true);
    expect(duplicate.value?.status).toBe("duplicate");
    expect(duplicate.value?.adapterAudit.status).toBe("skipped");
    expect(adapter.snapshot().inboundCanonicalResults[0]?.status).toBe("duplicate");
    expect(adapter.snapshot().inboundAdapterAudits.map((record) => record.status)).toEqual([
      "succeeded",
      "skipped"
    ]);
  });

  it("dedupes repeated inbound messages by envelope id", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T11:30:00.000Z"
    });
    const message: FederationTransportMessage = {
      ...baseMessage,
      id: "federation.message.import.dedupe",
      eventIds: ["event.federation.import.received.dedupe"],
      payload: {
        importEnvelopeId: "import.dedupe",
        schemaVersion: 1
      }
    };

    const first = await adapter.importMessage(message);
    const second = await adapter.importMessage(message);
    const conflict = await adapter.importMessage({
      ...message,
      payload: {
        importEnvelopeId: "import.dedupe.changed",
        schemaVersion: 1
      }
    });
    const received = await adapter.receive();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(conflict.ok).toBe(false);
    expect(conflict.errors[0]?.code).toBe("conflict");
    expect(received.value?.items.map((item) => item.id)).toEqual([
      "federation.message.import.dedupe"
    ]);
  });

  it("reports canonical receive conflicts without mutating the stored inbound message", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T11:45:00.000Z"
    });
    const message: FederationTransportMessage = {
      ...baseMessage,
      id: "federation.message.import.conflict",
      eventIds: ["event.federation.import.received.conflict"],
      payload: {
        importEnvelopeId: "import.conflict",
        schemaVersion: 1
      }
    };

    const first = await adapter.receiveCanonical(message);
    const conflict = await adapter.receiveCanonical({
      ...message,
      payload: {
        importEnvelopeId: "import.conflict.changed",
        schemaVersion: 1
      }
    });

    expect(first.ok).toBe(true);
    expect(conflict.ok).toBe(false);
    expect(conflict.errors[0]?.code).toBe("conflict");
    expect(adapter.snapshot().inboundConflicts).toEqual([
      {
        messageId: "federation.message.import.conflict",
        dedupeKey: "activitypub:inbound:federation.message.import.conflict",
        code: "message-id-conflict",
        message: "Inbound federation message federation.message.import.conflict already exists and cannot be mutated.",
        existingMessageId: "federation.message.import.conflict",
        occurredAt: "2026-06-13T11:45:00.000Z"
      }
    ]);
    expect(adapter.snapshot().inbox.map((stored) => stored.message.payload)).toEqual([
      {
        importEnvelopeId: "import.conflict",
        schemaVersion: 1
      }
    ]);
    expect(adapter.snapshot().inboundAdapterAudits.map((record) => record.status)).toEqual([
      "succeeded",
      "failed"
    ]);
  });

  it("reports prototype health and production gates", async () => {
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-13T12:00:00.000Z"
    });

    await expect(adapter.health()).resolves.toMatchObject({
      adapterId: "adapter.provider.activitypub.federation-transport",
      status: "healthy"
    });
    expect(activitypubTransportAdapterTrack.status).toBe("prototype");
    expect(activitypubTransportAdapterTrack.productionGates).toContain(
      "adapter.federation-transport.redaction-respected"
    );
  });
});
