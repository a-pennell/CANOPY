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
