import { describe, expect, it } from "vitest";
import { createActivityPubTransportAdapter } from "@canopy/adapters-provider-activitypub-transport";
import { createPostgresEventStoreAdapter } from "@canopy/adapters-provider-postgres-event-store";
import type { FederationTransportMessage } from "@canopy/contracts-adapters";
import type { CanopyEvent, CanopyEventType, CanopyId, ObjectRef } from "@canopy/contracts-kernel";
import { executeRiverbendCyberneticSlice } from "./index.js";

const providerNow = "2026-06-15T14:00:00.000Z";

const providerGateEventTypes = [
  "governance.decision.recorded",
  "stewardship.use_right.granted",
  "stewardship.use_right.revoked",
  "governance.policy.versioned",
  "stewardship.redaction.requested",
  "system.redaction.applied",
  "federation.export.approved"
] as const satisfies readonly CanopyEventType[];
const providerGateEventTypeSet: ReadonlySet<CanopyEventType> = new Set(providerGateEventTypes);

describe("Phase 8 provider trust hardening", () => {
  it("preserves Riverbend authority, audit, outbox, and export redaction invariants", async () => {
    const slice = executeRiverbendCyberneticSlice();
    const eventStore = createPostgresEventStoreAdapter({
      now: () => providerNow
    });

    for (const event of slice.events) {
      const appended = await eventStore.appendEvent({
        event,
        idempotencyKey: `phase-8-provider-hardening:${event.id}`
      });

      expect(appended.ok).toBe(true);
    }

    const replayedEvents: CanopyEvent[] = [];
    for await (const replayResult of eventStore.replay({ cursor: "0" })) {
      expect(replayResult.ok).toBe(true);
      if (replayResult.value !== undefined) {
        replayedEvents.push(replayResult.value);
      }
    }

    expect(replayedEvents.map((event) => event.id)).toEqual(
      slice.events.map((event) => event.id)
    );
    for (const originalEvent of slice.events) {
      const replayedEvent = requireEvent(replayedEvents, originalEvent.id);

      expect(refIds(replayedEvent.authorityRefs)).toEqual(refIds(originalEvent.authorityRefs));
    }

    const tables = eventStore.snapshotTables();
    const gateEvents = slice.events.filter((event) =>
      providerGateEventTypeSet.has(event.type)
    );

    expect(gateEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([...providerGateEventTypes])
    );
    for (const event of gateEvents) {
      const audit = tables.adapterAudits.find((record) =>
        record.eventIds.includes(event.id)
      );
      const outbox = tables.outbox.find((record) => record.eventId === event.id);
      const eventRecord = tables.eventRecords.find((record) => record.eventId === event.id);

      expect(eventRecord?.authorityRefs.map((ref) => ref.id)).toEqual(
        event.authorityRefs.map((ref) => ref.id)
      );
      expect(audit).toMatchObject({
        adapterName: "adapter.provider.postgres.event-store",
        direction: "ingress",
        operation: "appendEvent",
        status: "succeeded",
        targetRef: event.objectRef,
        eventIds: [event.id]
      });
      expect(audit?.outboxIds).toContain(`outbox.${event.id}.canonical-event-log`);
      expect(outbox).toMatchObject({
        eventId: event.id,
        eventType: event.type,
        destination: { kind: "projection", name: "canonical-event-log" },
        status: "pending"
      });
    }

    const redactedEvidenceRef: ObjectRef = {
      ...slice.refs.evidenceRef,
      lifecycleStatus: "redacted"
    };
    const activityPub = createActivityPubTransportAdapter({
      now: () => providerNow,
      rules: [
        {
          federationRuleRef: slice.refs.dataStewardshipAgreementRef,
          peerRef: slice.refs.federationPeerRef,
          allowedObjectTypes: slice.federationExport.preview.includedObjectTypes,
          allowedEventTypes: [],
          exportAllowed: true,
          importAllowed: true,
          redactionRequired: true,
          blockedPayloadFields: ["operatorOnlyNote", "internalReviewerEmail"]
        }
      ]
    });
    const message: FederationTransportMessage = {
      id: "federation.message.riverbend-phase-8-provider-hardening",
      federationRuleRef: slice.refs.dataStewardshipAgreementRef,
      eventIds: [...slice.federationExport.preview.eventIds],
      objectRefs: [
        ...slice.federationExport.preview.includedObjects
          .map((object) => object.ref)
          .filter((ref) => ref.id !== slice.refs.evidenceRef.id),
        redactedEvidenceRef
      ],
      payload: {
        envelope: slice.federationExport.envelope,
        publicSummary: "Riverbend export is safe for federation review.",
        schoolContact: "must not leave Riverbend",
        pickupNotes: "must not leave Riverbend",
        operatorOnlyNote: "blocked by provider rule",
        internalReviewerEmail: "reviewer@example.invalid",
        nested: {
          public: "nested safe detail",
          schoolContact: "nested secret",
          pickupNotes: "nested pickup secret",
          operatorOnlyNote: "nested blocked note",
          internalReviewerEmail: "nested@example.invalid"
        },
        redactionSummary: {
          ...slice.federationExport.preview.redactionSummary,
          removedFields: [
            ...slice.federationExport.preview.redactionSummary.removedFields,
            "schoolContact",
            "pickupNotes"
          ]
        }
      },
      contentHash: slice.federationExport.preview.contentHash,
      schemaVersion: 1
    };

    const sent = await activityPub.send(message);
    const received = await activityPub.receive();
    const sanitizedPayload = sent.value?.payload;
    const serializedPayload = JSON.stringify(sanitizedPayload);

    expect(sent.ok).toBe(true);
    expect(sanitizedPayload).toMatchObject({
      publicSummary: "Riverbend export is safe for federation review.",
      nested: {
        public: "nested safe detail"
      },
      redactionSummary: {
        redactionCount: slice.federationExport.preview.redactionSummary.redactionCount
      }
    });
    expect(sanitizedPayload).not.toHaveProperty("schoolContact");
    expect(sanitizedPayload).not.toHaveProperty("pickupNotes");
    expect(sanitizedPayload).not.toHaveProperty("operatorOnlyNote");
    expect(sanitizedPayload).not.toHaveProperty("internalReviewerEmail");
    expect(serializedPayload).not.toContain("must not leave Riverbend");
    expect(serializedPayload).not.toContain("blocked by provider rule");
    expect(serializedPayload).not.toContain("reviewer@example.invalid");
    expect(sent.value?.objectRefs).toContainEqual(redactedEvidenceRef);
    expect(received.value?.items[0]?.payload).toEqual(sanitizedPayload);
  });
});

function requireEvent(events: readonly CanopyEvent[], eventId: CanopyId): CanopyEvent {
  const event = events.find((candidate) => candidate.id === eventId);
  expect(event).toBeDefined();
  return event as CanopyEvent;
}

function refIds(refs: readonly ObjectRef[]): readonly CanopyId[] {
  return refs.map((ref) => ref.id);
}
