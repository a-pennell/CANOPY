import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import type { Decision, Issue, Proposal } from "@canopy/contracts-governance";
import {
  createLedgerAccount,
  postLedgerEntry
} from "@canopy/capabilities-allocation-accounting";
import {
  createClaim,
  ingestEvidence,
  linkEvidenceToClaim,
  reviewClaim
} from "@canopy/capabilities-claims-evidence";
import {
  createIssue,
  createProposal,
  recordDecision
} from "@canopy/capabilities-governance";
import {
  createResource,
  grantUseRight,
  proposeUseRight,
  recordResourceContext,
  type UseRightScope
} from "@canopy/capabilities-stewardship";
import { buildPersistedCanopyShellSnapshot } from "@canopy/app-shell";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { dryRunStewardshipImport } from "@canopy/database-import-plans";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import { buildCivicMemoryProjection } from "@canopy/projections-civic-memory";
import { buildObjectPageProjection } from "@canopy/projections-object-page";
import { createPersistentOutbox } from "@canopy/workflows-outbox";
import {
  executeCanopyCommand,
  executeCreateClaimCommand,
  executeCreateProposalCommand,
  executeCreateResourceCommand,
  executeGrantUseRightCommand,
  executeLinkEvidenceToClaimCommand,
  executePostLedgerEntryCommand,
  executeRecordDecisionCommand
} from "@canopy/workflows-command-runtime";
import {
  createImportReviewReport,
  executeReviewedImport
} from "@canopy/workflows-import-execution";
import {
  createInMemoryMaterializedProjectionStore,
  projectionMaterializedTargetRef,
  readMaterializedProjection,
  rebuildAndPersistAllProjections
} from "@canopy/workflows-projection-rebuild";

const occurredAt = "2026-06-13T16:00:00.000Z";
const namespace = "canopy.vertical.food-resilience";
const orgId = "org.riverbend-food-commons";
const commonsId = "commons.riverbend-foodshed";
const livingSystemId = "living-system.riverbend-creek";

const actorRef = ref("person.mira", "person");
const mandateRef = ref("mandate.food-resilience.2026", "mandate");
const claimRef = ref("claim.school-procurement-need", "claim");
const evidenceRef = ref("evidence.school-procurement-note", "evidence");
const sourceRef = ref("source.school-kitchen-intake", "source");
const issueRef = governanceRef("issue.food-resilience-procurement", "issue");
const proposalRef = governanceRef("proposal.route-surplus-to-school", "proposal");
const decisionRef = governanceRef("decision.route-surplus-to-school", "decision");
const resourceRef = ref("resource.north-pasture-surplus-crop", "resource");
const useRightRef = ref("use-right.school-procurement-crop-share", "use-right");
const cashLedgerRef = ref("ledger-account.food-commons-reserve", "ledger-account");
const stewardshipLedgerRef = ref("ledger-account.stewardship-allocation", "ledger-account");
const ledgerEntryRef = ref("ledger-entry.food-flow-allocation", "ledger-entry");

describe("watershed food resilience vertical slice", () => {
  it("runs native Canopy capabilities through replay and projections", () => {
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const shared = { registry, memory };

    createClaim(shared, {
      eventId: "event.claim.created.school-procurement-need",
      occurredAt,
      actorRef,
      claimRef,
      relatedRefs: [resourceRef],
      orgId,
      commonsId,
      livingSystemId,
      dataState: "testimony_derived",
      payload: {
        title: "School needs local produce this week",
        summary: "The school kitchen can absorb a small crop surplus."
      }
    });
    ingestEvidence(shared, {
      eventId: "event.evidence.created.school-kitchen-intake",
      occurredAt,
      actorRef,
      evidenceRef,
      sourceRef,
      relatedRefs: [claimRef],
      orgId,
      commonsId,
      dataState: "locally_verified",
      payload: {
        evidenceKind: "procurement_note",
        summary: "Kitchen confirms capacity for twenty produce boxes."
      }
    });
    linkEvidenceToClaim(shared, {
      eventId: "event.evidence.linked_to_claim.school-kitchen-intake",
      occurredAt,
      actorRef,
      evidenceRef,
      claimRef,
      relation: "supports",
      orgId,
      commonsId
    });
    reviewClaim(shared, {
      eventId: "event.claim.reviewed.school-procurement-need",
      occurredAt,
      actorRef,
      reviewerRef: actorRef,
      claimRef,
      evidenceRefs: [evidenceRef],
      authorityRefs: [mandateRef],
      disposition: "accepted",
      orgId,
      commonsId,
      dataState: "expert_reviewed"
    });

    createIssue({ registry, memory }, {
      occurredAt,
      actorRef,
      issue: makeIssue()
    });
    createProposal({ registry, memory }, {
      occurredAt,
      actorRef,
      proposal: makeProposal()
    });
    recordDecision({ registry, memory }, {
      occurredAt,
      actorRef,
      decision: makeDecision()
    });

    createResource(shared, {
      eventId: "event.stewardship.resource.created.surplus-crop",
      occurredAt,
      actorRef,
      resourceRef,
      stewardRefs: [actorRef],
      authorityRefs: [mandateRef],
      orgId,
      commonsId,
      livingSystemId,
      title: "North pasture surplus crop",
      resourceKind: "food_surplus"
    });
    recordResourceContext(shared, {
      eventId: "event.stewardship.resource_context.recorded.surplus-crop",
      occurredAt,
      actorRef,
      resourceRef,
      relatedRefs: [claimRef, evidenceRef],
      authorityRefs: [mandateRef],
      orgId,
      commonsId,
      livingSystemId,
      context: {
        availableBoxes: 20,
        harvestWindow: "2026-06-14",
        watershedCondition: "normal"
      }
    });
    proposeUseRight(shared, {
      eventId: "event.stewardship.use_right.proposed.school-crop-share",
      occurredAt,
      actorRef,
      useRightRef,
      proposalRef,
      scope: useRightScope(),
      orgId,
      commonsId,
      livingSystemId,
      rationale: "School procurement need is verified and crop surplus is available."
    });
    grantUseRight(shared, {
      eventId: "event.stewardship.use_right.granted.school-crop-share",
      occurredAt,
      actorRef,
      useRightRef,
      decisionRef,
      scope: useRightScope(),
      authorityRefs: [mandateRef, decisionRef],
      orgId,
      commonsId,
      livingSystemId,
      grantNote: "Temporary crop-share use right for verified school need."
    });

    const allocationContext = { objectRegistry: registry, civicMemory: memory };
    createLedgerAccount(allocationContext, {
      occurredAt,
      actorRef,
      authorityRefs: [mandateRef],
      ledgerAccountRef: cashLedgerRef,
      orgId,
      commonsId,
      accountCode: "1000",
      label: "Food commons reserve",
      normalSide: "debit"
    });
    createLedgerAccount(allocationContext, {
      occurredAt,
      actorRef,
      authorityRefs: [mandateRef],
      ledgerAccountRef: stewardshipLedgerRef,
      orgId,
      commonsId,
      accountCode: "5100",
      label: "Stewardship allocation",
      normalSide: "credit"
    });
    postLedgerEntry(allocationContext, {
      occurredAt,
      actorRef,
      authorityRefs: [decisionRef],
      ledgerEntryRef,
      orgId,
      commonsId,
      memo: "Allocate coordination budget for school crop share.",
      lines: [
        {
          accountRef: stewardshipLedgerRef,
          side: "debit",
          amount: 2000,
          unit: "COMMON_CREDIT",
          relatedRefs: [useRightRef]
        },
        {
          accountRef: cashLedgerRef,
          side: "credit",
          amount: 2000,
          unit: "COMMON_CREDIT",
          relatedRefs: [decisionRef]
        }
      ]
    });

    const events = memory.replay().events;
    const eventTypes = events.map((event) => event.type);
    const civicProjection = buildCivicMemoryProjection(events, {
      scope: { orgRef: orgId }
    });
    const resourcePage = buildObjectPageProjection(resourceRef, events);
    const useRightPage = buildObjectPageProjection(useRightRef, events);

    expect(eventTypes).toEqual([
      "claim.created",
      "evidence.created",
      "evidence.linked_to_claim",
      "claim.reviewed",
      "governance.issue.created",
      "governance.proposal.created",
      "governance.decision.recorded",
      "stewardship.resource.created",
      "stewardship.resource_context.recorded",
      "stewardship.use_right.proposed",
      "stewardship.use_right.granted",
      "accounting.ledger_account.created",
      "accounting.ledger_account.created",
      "accounting.ledger_entry.posted"
    ]);
    expect(
      events.some((event) =>
        event.authorityRefs.some((authorityRef) => authorityRef.id === "account.mira")
      )
    ).toBe(false);
    expect(civicProjection.sourceCapabilities).toEqual([
      "allocation-accounting",
      "claims-evidence",
      "governance",
      "stewardship"
    ]);
    expect(civicProjection.replayCheckpoint.projectedEventCount).toBe(events.length);
    expect(resourcePage.timelineEvents.map((event) => event.type)).toContain(
      "stewardship.resource_context.recorded"
    );
    expect(useRightPage.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([mandateRef.id, decisionRef.id])
    );
    expect(
      events.find((event) => event.type === "accounting.ledger_entry.posted")?.payload
    ).toMatchObject({
      totals: {
        COMMON_CREDIT: {
          debit: 2000,
          credit: 2000
        }
      }
    });
  });

  it("lets a reviewer trace a persisted source-to-shell food resilience scenario", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const services = { registry, memory };
    const materializedStore = createInMemoryMaterializedProjectionStore();
    const allocationContext = { objectRegistry: registry, civicMemory: memory };

    await executeCreateClaimCommand({
      command: {
        eventId: "event.persisted.claim.created.school-procurement-need",
        occurredAt,
        actorRef,
        claimRef,
        relatedRefs: [resourceRef],
        orgId,
        commonsId,
        livingSystemId,
        visibility: "commons",
        dataState: "testimony_derived",
        payload: {
          title: "School needs local produce this week",
          summary: "The school kitchen can absorb a small crop surplus."
        }
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.evidence.created.school-kitchen-intake",
        occurredAt,
        actorRef,
        evidenceRef,
        sourceRef,
        relatedRefs: [claimRef],
        orgId,
        commonsId,
        visibility: "commons" as const,
        dataState: "locally_verified" as const,
        payload: {
          evidenceKind: "procurement_note",
          summary: "Kitchen confirms capacity for twenty produce boxes."
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => ingestEvidence(services, command).event
    });
    await executeLinkEvidenceToClaimCommand({
      command: {
        eventId: "event.persisted.evidence.linked_to_claim.school-kitchen-intake",
        occurredAt,
        actorRef,
        evidenceRef,
        claimRef,
        relation: "supports",
        orgId,
        commonsId
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.claim.reviewed.school-procurement-need",
        occurredAt,
        actorRef,
        reviewerRef: actorRef,
        claimRef,
        evidenceRefs: [evidenceRef],
        authorityRefs: [mandateRef],
        disposition: "accepted" as const,
        orgId,
        commonsId,
        dataState: "expert_reviewed" as const
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => reviewClaim(services, command).event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.issue.created.food-resilience-procurement",
        occurredAt,
        actorRef,
        issue: makeIssue()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createIssue(services, command).appendResult.event
    });
    await executeCreateProposalCommand({
      command: {
        eventId: "event.persisted.proposal.created.route-surplus-to-school",
        occurredAt,
        actorRef,
        proposal: makeProposal()
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeRecordDecisionCommand({
      command: {
        eventId: "event.persisted.decision.recorded.route-surplus-to-school",
        occurredAt,
        actorRef,
        decision: makeDecision()
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCreateResourceCommand({
      command: {
        eventId: "event.persisted.resource.created.surplus-crop",
        occurredAt,
        actorRef,
        resourceRef,
        stewardRefs: [actorRef],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        livingSystemId,
        title: "North pasture surplus crop",
        resourceKind: "food_surplus",
        summary: "Harvest-ready crop surplus available for commons allocation."
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.resource_context.recorded.surplus-crop",
        occurredAt,
        actorRef,
        resourceRef,
        relatedRefs: [claimRef, evidenceRef],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        livingSystemId,
        context: {
          availableBoxes: 20,
          harvestWindow: "2026-06-14",
          watershedCondition: "normal"
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => recordResourceContext(services, command).append.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.use_right.proposed.school-crop-share",
        occurredAt,
        actorRef,
        useRightRef,
        proposalRef,
        scope: useRightScope(),
        orgId,
        commonsId,
        livingSystemId,
        rationale: "School procurement need is verified and crop surplus is available."
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => proposeUseRight(services, command).append.event
    });
    await executeGrantUseRightCommand({
      command: {
        eventId: "event.persisted.use_right.granted.school-crop-share",
        occurredAt,
        actorRef,
        useRightRef,
        decisionRef,
        scope: useRightScope(),
        authorityRefs: [mandateRef, decisionRef],
        orgId,
        commonsId,
        livingSystemId,
        grantNote: "Temporary crop-share use right for verified school need."
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.ledger_account.created.reserve",
        occurredAt,
        actorRef,
        authorityRefs: [mandateRef],
        ledgerAccountRef: cashLedgerRef,
        orgId,
        commonsId,
        accountCode: "1000",
        label: "Food commons reserve",
        normalSide: "debit" as const
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createLedgerAccount(allocationContext, command).event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.persisted.ledger_account.created.stewardship",
        occurredAt,
        actorRef,
        authorityRefs: [mandateRef],
        ledgerAccountRef: stewardshipLedgerRef,
        orgId,
        commonsId,
        accountCode: "5100",
        label: "Stewardship allocation",
        normalSide: "credit" as const
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createLedgerAccount(allocationContext, command).event
    });
    await executePostLedgerEntryCommand({
      command: {
        eventId: "event.persisted.ledger_entry.posted.food-flow-allocation",
        occurredAt,
        actorRef,
        authorityRefs: [decisionRef],
        ledgerEntryRef,
        orgId,
        commonsId,
        memo: "Allocate coordination budget for school crop share.",
        lines: [
          {
            accountRef: stewardshipLedgerRef,
            side: "debit",
            amount: 2000,
            unit: "COMMON_CREDIT",
            relatedRefs: [useRightRef]
          },
          {
            accountRef: cashLedgerRef,
            side: "credit",
            amount: 2000,
            unit: "COMMON_CREDIT",
            relatedRefs: [decisionRef]
          }
        ]
      },
      services,
      runtime,
      rebuildProjections: false
    });

    const dryRun = dryRunStewardshipImport([
      {
        sourceObject: "resource",
        id: "legacy-orchard-surplus-2026-06-13",
        sourceId: "legacy-orchard-surplus-2026-06-13",
        name: "Legacy orchard surplus",
        resource_kind: "food_surplus",
        resourceKind: "food_surplus",
        quantity: "12 boxes",
        condition: "available",
        location: "generalized Riverbend foodshed",
        steward: "person.mira",
        authorityRef: mandateRef.id,
        occurredAt
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: occurredAt,
      reviewedByRef: actorRef
    });
    const importExecution = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: occurredAt
    });

    const outbox = createPersistentOutbox({ runtime, now: () => occurredAt });
    const leased = outbox.lease({
      leasedBy: "vertical-slice-projection-worker",
      limit: 1,
      now: occurredAt
    });
    const acknowledged = outbox.acknowledge(
      outbox.publish(requireFirst(leased).id, occurredAt).id,
      occurredAt
    );
    const projectionRebuild = rebuildAndPersistAllProjections(runtime, {
      rebuiltAt: occurredAt,
      materializedProjections: materializedStore,
      civicMemory: {
        scope: { orgRef: orgId }
      }
    });
    const shell = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Riverbend food commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: useRightRef,
      activeMode: "stewardship",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    }).snapshot;
    const decisionShell = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Riverbend food commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      activeMode: "decisions",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    }).snapshot;
    const resourceShell = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Riverbend food commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: resourceRef,
      activeMode: "stewardship",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    }).snapshot;
    const useRightDocument = readMaterializedProjection(materializedStore, {
      projectionName: "object-page",
      targetRef: useRightRef
    });
    const authorityDocument = readMaterializedProjection(materializedStore, {
      projectionName: "authority",
      targetRef: projectionMaterializedTargetRef("authority")
    });

    expect(dryRun.status).toBe("pass");
    expect(review.status).toBe("ready");
    expect(importExecution.status).toBe("applied");
    expect(importExecution.mappingRecords).toHaveLength(1);
    expect(importExecution.eventRecords).toHaveLength(1);
    expect(importExecution.eventRecords[0]?.event.payload).toMatchObject({
      dryRun: false,
      sourceProject: "stewardship"
    });
    expect(acknowledged.status).toBe("acknowledged");
    expect(runtime.listOutbox().map((record) => record.eventType)).toEqual(
      expect.arrayContaining([
        "claim.created",
        "governance.decision.recorded",
        "stewardship.use_right.granted",
        "accounting.ledger_entry.posted"
      ])
    );
    expect(projectionRebuild.persistedStates.map((state) => state.id)).toEqual(
      expect.arrayContaining([
        "projection-state.object-page",
        "projection-state.civic-memory",
        "projection-state.authority",
        "projection-state.claim-evidence",
        "projection-state.resource-stewardship",
        "projection-state.decision-packet"
      ])
    );
    expect(useRightDocument?.processedEventCount).toBe(runtime.counts().events);
    expect(authorityDocument?.processedEventCount).toBe(runtime.counts().events);
    expect(shell.sourceCapabilities).toEqual(
      expect.arrayContaining([
        "allocation-accounting",
        "claims-evidence",
        "governance",
        "stewardship"
      ])
    );
    expect(shell.availableModes).toEqual(
      expect.arrayContaining(["decisions", "stewardship", "coordination"])
    );
    expect(shell.claimEvidence.claims.find((claim) => sameRef(claim.claimRef, claimRef))).toMatchObject({
      status: "accepted",
      evidenceRefs: expect.arrayContaining([evidenceRef])
    });
    expect(decisionShell.decisionPacket?.decision?.ref).toEqual(decisionRef);
    expect(decisionShell.decisionPacket?.stewardshipOutcomes.map((outcome) => outcome.ref)).toEqual(
      expect.arrayContaining([useRightRef])
    );
    expect(
      decisionShell.decisionPacket?.allocationAccountingOutcomes.map((outcome) => outcome.ref)
    ).toEqual(expect.arrayContaining([ledgerEntryRef]));
    expect(resourceShell.resourceStewardship?.useRights.map((right) => right.useRightRef)).toEqual(
      expect.arrayContaining([useRightRef])
    );
    expect(shell.surfaces.objectPage?.projectionRead.kind).toBe("materialized");
    expect(shell.surfaces.objectPage?.timeline.map((entry) => entry.type)).toEqual(
      expect.arrayContaining([
        "stewardship.use_right.proposed",
        "stewardship.use_right.granted",
        "accounting.ledger_entry.posted"
      ])
    );
    expect(shell.surfaces.authorityTrace.status).toBe("ok");
    expect(shell.surfaces.authorityTrace.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "stewardship.use_right.granted",
        "accounting.ledger_entry.posted"
      ])
    );
    expect(decisionShell.surfaces.authorityTrace.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.decision.recorded",
        "stewardship.use_right.granted",
        "accounting.ledger_entry.posted"
      ])
    );
    expect(shell.surfaces.authorityTrace.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([mandateRef.id, decisionRef.id])
    );
    expect(shell.surfaces.sourceProvenancePanel).toMatchObject({
      sourceTreatment: "folded-source",
      sourceProjects: expect.arrayContaining(["canopy", "stewardship"])
    });
    expect(shell.surfaces.importReview).toMatchObject({
      sourceProject: "stewardship",
      sourceTreatment: "folded-source",
      canonicalNamespace: "canopy",
      candidateEventIds: dryRun.candidateEvents.map((event) => event.id)
    });

    const allPersistedEvents = runtime.queryEvents().items.map((record) => record.event);
    expect(findEvent(allPersistedEvents, "accounting.ledger_entry.posted").payload).toMatchObject({
      totals: {
        COMMON_CREDIT: {
          debit: 2000,
          credit: 2000
        }
      }
    });
    expect(
      findEvent(allPersistedEvents, "stewardship.use_right.granted").authorityRefs.map(
        (ref) => ref.id
      )
    ).toEqual(expect.arrayContaining([mandateRef.id, decisionRef.id]));
  });
});

function ref(id: string, type: ObjectRef["type"]): ObjectRef {
  return {
    id,
    type,
    namespace,
    lifecycleStatus: "active"
  };
}

function governanceRef(id: string, type: ObjectRef["type"]): ObjectRef {
  return {
    id,
    type,
    namespace: "governance",
    lifecycleStatus: "active"
  };
}

function makeIssue(): Issue {
  return {
    schemaVersion: "0.0.0",
    id: issueRef.id,
    type: "issue",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueType: "stewardship",
    title: "Route verified surplus crop to school",
    description: "Decide whether the verified crop surplus can meet the school need.",
    priority: "high",
    scope: {
      orgId,
      affectedRefs: [actorRef, resourceRef]
    },
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    proposalRefs: [proposalRef],
    decisionRefs: []
  };
}

function makeProposal(): Proposal {
  return {
    schemaVersion: "0.0.0",
    id: proposalRef.id,
    type: "proposal",
    orgId,
    status: "open",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef,
    proposalType: "operational_action",
    title: "Allocate crop share to school kitchen",
    summary: "Grant a temporary use right and budget allocation for delivery.",
    proposedByRefs: [actorRef],
    affectedRefs: [actorRef, resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    scenarioRefs: [],
    amendmentRefs: [],
    objectionRefs: [],
    decisionMethod: decisionMethod(),
    deliberationWindow: {},
    conditions: ["review watershed condition before harvest"]
  };
}

function makeDecision(): Decision {
  return {
    schemaVersion: "0.0.0",
    id: decisionRef.id,
    type: "decision",
    orgId,
    status: "resolved",
    createdAt: occurredAt,
    createdByRef: actorRef,
    authorityRefs: [mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRefs: [issueRef],
    proposalRefs: [proposalRef],
    outcome: "passed",
    effect: "binding",
    method: decisionMethod(),
    decidedAt: occurredAt,
    decidedByRefs: [actorRef],
    affectedRefs: [actorRef, resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "Evidence supports the need and stewardship context allows action.",
    conditions: ["use right sunsets after one delivery window"],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [],
    supersedesDecisionRefs: []
  };
}

function decisionMethod() {
  return {
    kind: "consent",
    eligibleVoterRefs: [actorRef],
    authorityRefs: [mandateRef],
    guardianReviewRequired: false
  } as const;
}

function useRightScope(): UseRightScope {
  return {
    holderRef: actorRef,
    resourceRef,
    permissions: ["harvest.boxes.20", "deliver.school"],
    conditions: ["stay within harvest window", "record delivery outcome"],
    term: {
      startsAt: "2026-06-14T00:00:00.000Z",
      endsAt: "2026-06-21T00:00:00.000Z"
    },
    review: {
      reviewPathRef: issueRef,
      reviewAt: "2026-06-22T00:00:00.000Z"
    },
    revocation: {
      revocable: true,
      revocationPathRef: issueRef,
      revocationConditions: ["threshold breach", "school need withdrawn"]
    }
  };
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.namespace === right.namespace
  );
}

function requireFirst<TValue>(values: readonly TValue[]): TValue {
  const value = values[0];

  if (value === undefined) {
    throw new Error("Expected at least one value.");
  }

  return value;
}

function findEvent(
  events: readonly CanopyEvent[],
  eventType: CanopyEvent["type"]
): CanopyEvent {
  const event = events.find((candidate) => candidate.type === eventType);

  if (event === undefined) {
    throw new Error(`Expected event type ${eventType}.`);
  }

  return event;
}
