import { describe, expect, it } from "vitest";
import { createActivityPubTransportAdapter } from "@canopy/adapters-provider-activitypub-transport";
import { createPostgresEventStoreAdapter } from "@canopy/adapters-provider-postgres-event-store";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import {
  buildRiverbendPersistedRuntimeScenario,
  executeRiverbendCyberneticSlice
} from "./index.js";

describe("Phase 7 Riverbend cybernetic slice", () => {
  it("runs one Riverbend/Mill Creek path from observe through federation export", () => {
    const slice = executeRiverbendCyberneticSlice();
    const eventTypes = slice.events.map((event) => event.type);
    const phases = slice.steps.map((step) => step.phase);

    expect(phases).toEqual(
      expect.arrayContaining([
        "observe",
        "understand",
        "simulate",
        "deliberate",
        "coordinate",
        "act",
        "learn",
        "federate"
      ])
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        "ecology.threshold.breached",
        "coordination.need.created",
        "coordination.offer.created",
        "claim.created",
        "evidence.created",
        "model.scenario.created",
        "governance.proposal.created",
        "ecology.guardian.review_requested",
        "ecology.guardian.review_completed",
        "governance.decision.recorded",
        "stewardship.use_right.granted",
        "coordination.commitment.created",
        "accounting.ledger_entry.posted",
        "flow.food.recorded",
        "learning.outcome.recorded",
        "learning.retrospective.completed",
        "governance.amendment.submitted",
        "governance.objection.raised",
        "stewardship.use_right.revoked",
        "accounting.ledger_entry.reversed",
        "governance.policy.versioned",
        "stewardship.redaction.requested",
        "system.redaction.applied",
        "governance.decision_packet.recorded",
        "federation.export.approved"
      ])
    );
    expect(slice.civicMemory.replayCheckpoint.projectedEventCount).toBe(
      slice.events.length
    );
    expect(slice.civicMemory.sourceCapabilities).toEqual(
      expect.arrayContaining([
        "allocation-accounting",
        "claims-evidence",
        "data-stewardship",
        "ecological-modeling",
        "governance",
        "learning-accountability",
        "stewardship"
      ])
    );
  });

  it("traces the Mill Creek threshold breach to the food allocation decision", () => {
    const slice = executeRiverbendCyberneticSlice();

    expect(slice.objectPages.threshold.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "ecology.threshold.created",
        "ecology.threshold.breached",
        "model.scenario.created",
        "ecology.guardian.review_requested",
        "ecology.guardian.review_completed",
        "governance.decision.recorded",
        "flow.food.recorded",
        "learning.outcome.recorded",
        "learning.retrospective.completed",
        "governance.policy.versioned"
      ])
    );
    expect(slice.objectPages.threshold.relatedRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        slice.refs.claimRef.id,
        slice.refs.proposalRef.id,
        slice.refs.guardianReviewRef.id,
        slice.refs.decisionRef.id,
        slice.refs.flowRef.id,
        slice.refs.outcomeRef.id
      ])
    );
    expect(slice.objectPages.decision.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.decision.recorded",
        "stewardship.use_right.granted",
        "coordination.commitment.created",
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed",
        "flow.food.recorded",
        "learning.outcome.recorded"
      ])
    );
    expect(slice.objectPages.useRight.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        slice.refs.decisionRef.id,
        slice.refs.mandateRef.id,
        slice.refs.watershedGuardianRef.id
      ])
    );
    expect(slice.objectPages.useRight.timelineEvents.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "stewardship.use_right.granted",
        "stewardship.use_right.revoked",
        "accounting.ledger_entry.reversed",
        "governance.policy.versioned"
      ])
    );
  });

  it("adapts when learning reveals the first policy is insufficient", () => {
    const slice = executeRiverbendCyberneticSlice();
    const eventTypes = slice.events.map((event) => event.type);
    const policyVersioned = slice.events.find(
      (event) => event.type === "governance.policy.versioned"
    );
    const reversal = slice.events.find(
      (event) => event.type === "accounting.ledger_entry.reversed"
    );
    const revocation = slice.events.find(
      (event) => event.type === "stewardship.use_right.revoked"
    );

    expect(
      eventTypes.filter((eventType) => eventType === "ecology.threshold.breached")
    ).toHaveLength(2);
    expect(eventTypes.indexOf("learning.retrospective.completed")).toBeLessThan(
      eventTypes.indexOf("governance.amendment.submitted")
    );
    expect(eventTypes.indexOf("governance.decision.recorded")).toBeLessThan(
      eventTypes.indexOf("stewardship.use_right.revoked")
    );
    expect(revocation?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([slice.refs.adaptiveDecisionRef.id])
    );
    expect(reversal?.supersedesEventId).toBe(
      "event.accounting.ledger_entry.posted.ledger-entry.food-flow-allocation"
    );
    expect(policyVersioned?.objectRef).toEqual(slice.refs.policyRef);
    expect(policyVersioned?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([slice.refs.adaptiveDecisionRef.id])
    );
  });

  it("preserves contested governance and redaction continuity in the adaptive packet", () => {
    const slice = executeRiverbendCyberneticSlice();
    const eventTypes = slice.events.map((event) => event.type);
    const objection = slice.events.find(
      (event) => event.type === "governance.objection.raised"
    );
    const redaction = slice.events.find(
      (event) => event.type === "system.redaction.applied"
    );
    const packet = slice.events.find(
      (event) => event.type === "governance.decision_packet.recorded"
    );
    const decisionPacket = packet?.payload["decisionPacket"] as
      | {
          unresolvedObjectionRefs?: readonly { id: string }[];
          redactionSummary?: {
            hasRedactions?: boolean;
            redactedRefs?: readonly { id: string }[];
            continuityEventRefs?: readonly { id: string }[];
          };
        }
      | undefined;

    expect(eventTypes.indexOf("governance.objection.raised")).toBeLessThan(
      eventTypes.indexOf("governance.decision_packet.recorded")
    );
    expect(eventTypes.indexOf("system.redaction.applied")).toBeLessThan(
      eventTypes.indexOf("federation.export.approved")
    );
    expect(objection?.objectRef).toEqual(slice.refs.adaptiveObjectionRef);
    expect(redaction?.redaction).toMatchObject({
      originalEventId: "event.evidence.created.school-kitchen-intake",
      reason: "vulnerable_group_protection",
      removedPayloadKeys: ["payload.schoolContact", "payload.pickupNotes"]
    });
    expect(decisionPacket?.unresolvedObjectionRefs?.map((ref) => ref.id)).toEqual([
      slice.refs.adaptiveObjectionRef.id
    ]);
    expect(decisionPacket?.redactionSummary?.hasRedactions).toBe(true);
    expect(decisionPacket?.redactionSummary?.redactedRefs?.map((ref) => ref.id)).toEqual([
      slice.refs.evidenceRef.id
    ]);
    expect(decisionPacket?.redactionSummary?.continuityEventRefs?.map((ref) => ref.id)).toEqual([
      slice.refs.redactionRef.id
    ]);
    expect(slice.federationExport.preview.redactionSummary.redactionCount).toBeGreaterThan(0);
    expect(slice.federationExport.preview.redactionSummary.removedFields).toEqual(
      expect.arrayContaining(["payload.schoolContact", "payload.pickupNotes"])
    );
  });

  it("exports the proof path with authority refs, stewardship agreement, and replayable objects", () => {
    const slice = executeRiverbendCyberneticSlice();
    const preview = slice.federationExport.preview;

    expect(preview.eventIds).toHaveLength(slice.events.length);
    expect(preview.eventIds).toEqual(
      expect.arrayContaining(slice.events.map((event) => event.id))
    );
    expect(preview.includedObjectTypes).toEqual(
      expect.arrayContaining([
        "threshold",
        "claim",
        "proposal",
        "guardian-review",
        "decision",
        "use-right",
        "flow",
        "task",
        "amendment",
        "objection",
        "decision-packet",
        "evidence",
        "policy"
      ])
    );
    expect(preview.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        slice.refs.mandateRef.id,
        slice.refs.watershedGuardianRef.id,
        slice.refs.decisionRef.id,
        slice.refs.dataStewardshipAgreementRef.id
      ])
    );
    expect(slice.federationExport.envelope).toMatchObject({
      scopeRef: slice.refs.commonsRef,
      federationRuleRef: slice.refs.dataStewardshipAgreementRef,
      dataStewardshipAgreements: [
        expect.objectContaining({
          governedRef: slice.refs.retrospectiveRef,
          federationRuleRef: slice.refs.dataStewardshipAgreementRef,
          visibility: "federation"
        })
      ],
      format: "json"
    });
    expect(preview.contentHash).toMatch(/^sha256:/);
  });

  it("builds a persisted runtime with materialized shell sessions for Phase 7 routes", () => {
    const scenario = buildRiverbendPersistedRuntimeScenario();

    expect(scenario.runtime.counts().events).toBe(scenario.slice.events.length);
    expect(scenario.materializedDocuments.map((document) => document.projectionName)).toEqual(
      expect.arrayContaining([
        "object-page",
        "civic-memory",
        "authority",
        "claim-evidence",
        "resource-stewardship",
        "decision-packet",
        "federation-export"
      ])
    );
    expect(scenario.shell.snapshot.civicMemory.replayCheckpoint.projectedEventCount).toBe(
      scenario.slice.events.length
    );
    expect(scenario.shellSessions.threshold.navigation.activePath).toBe(
      "/objects/threshold/threshold.mill-creek-nitrate"
    );
    expect(scenario.shellSessions.threshold.snapshot.surfaces.objectPage?.timeline.map(
      (event) => event.type
    )).toEqual(expect.arrayContaining(["ecology.threshold.breached"]));
    expect(scenario.shellSessions.decision.snapshot.surfaces.decisionPacket?.decisionRef).toEqual(
      scenario.slice.refs.decisionRef
    );
    expect(scenario.shellSessions.resource.snapshot.surfaces.resourceStewardship?.resourceRef).toEqual(
      scenario.slice.refs.resourceRef
    );
    expect(scenario.shellSessions.outcome.snapshot.surfaces.objectPage?.timeline.map(
      (event) => event.type
    )).toEqual(expect.arrayContaining(["learning.outcome.recorded"]));
    expect(scenario.shellSessions.federation.snapshot.surfaces.federationExportState?.includedEventIds).toHaveLength(
      scenario.slice.events.length
    );
  });

  it("replays Phase 7 through the Postgres event-store provider prototype", async () => {
    const slice = executeRiverbendCyberneticSlice();
    const adapter = createPostgresEventStoreAdapter({
      now: () => "2026-06-15T13:00:00.000Z"
    });

    for (const event of slice.events) {
      const appended = await adapter.appendEvent({
        event,
        idempotencyKey: `phase-7:${event.id}`
      });

      expect(appended.ok).toBe(true);
    }

    const replayed = [];
    for await (const result of adapter.replay({ cursor: "0" })) {
      expect(result.ok).toBe(true);
      if (result.value !== undefined) {
        replayed.push(result.value);
      }
    }

    const thresholdPage = await adapter.queryEvents({
      objectRef: slice.refs.thresholdRef,
      page: { limit: 4 }
    });
    const thresholdRelatedPage = await adapter.queryEvents({
      relatedRef: slice.refs.thresholdRef,
      page: { limit: 20 }
    });
    const redactionPage = await adapter.queryEvents({
      eventTypes: ["system.redaction.applied"],
      page: { limit: 2 }
    });
    const tables = adapter.snapshotTables();

    expect(replayed.map((event) => event.id)).toEqual(
      slice.events.map((event) => event.id)
    );
    expect(thresholdPage.value?.items.map((event) => event.type)).toEqual(
      expect.arrayContaining(["ecology.threshold.created", "ecology.threshold.breached"])
    );
    expect(thresholdRelatedPage.value?.items.map((event) => event.type)).toEqual(
      expect.arrayContaining(["governance.policy.versioned"])
    );
    expect(redactionPage.value?.items).toHaveLength(1);
    expect(tables.eventRecords).toHaveLength(slice.events.length);
    expect(tables.outbox).toHaveLength(slice.events.length);
    expect(tables.adapterAudits).toHaveLength(slice.events.length);
    expect(tables.canonicalSqlPlan.statements.length).toBeGreaterThan(slice.events.length);
    expect(tables.canonicalSqlPlan.appendOnlyTables).toEqual(
      expect.arrayContaining(["canopy_events", "canopy_outbox", "canopy_adapter_audit"])
    );
  });

  it("sends the Phase 7 export through redaction-aware ActivityPub transport", async () => {
    const slice = executeRiverbendCyberneticSlice();
    const redactedEvidenceRef = {
      ...slice.refs.evidenceRef,
      lifecycleStatus: "redacted" as const
    };
    const adapter = createActivityPubTransportAdapter({
      now: () => "2026-06-15T13:10:00.000Z",
      rules: [
        {
          federationRuleRef: slice.refs.dataStewardshipAgreementRef,
          peerRef: slice.refs.federationPeerRef,
          allowedObjectTypes: slice.federationExport.preview.includedObjectTypes,
          allowedEventTypes: [],
          exportAllowed: true,
          importAllowed: true,
          redactionRequired: true,
          blockedPayloadFields: ["operatorOnlyNote"]
        }
      ]
    });
    const message = {
      id: "federation.message.riverbend-phase-7",
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
        redactionSummary: {
          ...slice.federationExport.preview.redactionSummary,
          removedFields: [
            ...slice.federationExport.preview.redactionSummary.removedFields,
            "schoolContact",
            "pickupNotes"
          ]
        },
        publicSummary: "Riverbend Phase 7 export with redaction continuity.",
        schoolContact: "must not leave Riverbend",
        pickupNotes: "must not leave Riverbend",
        operatorOnlyNote: "blocked by federation rule"
      },
      contentHash: slice.federationExport.preview.contentHash,
      schemaVersion: 1
    };

    const sent = await adapter.send(message);
    const received = await adapter.receive();

    expect(sent.ok).toBe(true);
    expect(sent.value?.payload).not.toHaveProperty("schoolContact");
    expect(sent.value?.payload).not.toHaveProperty("pickupNotes");
    expect(sent.value?.payload).not.toHaveProperty("operatorOnlyNote");
    expect(sent.value?.payload).toHaveProperty("redactionSummary");
    expect(sent.value?.objectRefs).toContainEqual(redactedEvidenceRef);
    expect(received.value?.items[0]?.id).toBe(message.id);
  });

  it("replays the Phase 7 event stream across civic-memory cursors", () => {
    const slice = executeRiverbendCyberneticSlice();
    const memory = createInMemoryCivicMemory(slice.events);
    const replayed = [];
    let cursor = memory.replay({ limit: 5 });

    replayed.push(...cursor.events);

    while (cursor.nextCursor !== undefined) {
      cursor = memory.replay(cursor.nextCursor);
      replayed.push(...cursor.events);
    }

    expect(replayed.map((event) => event.id)).toEqual(
      slice.events.map((event) => event.id)
    );
    expect(cursor.nextCursor).toBeUndefined();
  });
});
