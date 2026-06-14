import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import type { Decision, Issue, Proposal } from "@canopy/contracts-governance";
import {
  createLedgerAccount,
  postLedgerEntry
} from "@canopy/capabilities-allocation-accounting";
import {
  ingestEvidence,
  reviewClaim
} from "@canopy/capabilities-claims-evidence";
import {
  createIssue,
  recordDecision
} from "@canopy/capabilities-governance";
import {
  recordResourceContext,
  proposeUseRight,
  type UseRightScope
} from "@canopy/capabilities-stewardship";
import { buildPersistedCanopyShellSnapshot } from "@canopy/app-shell";
import { dryRunSensemakingImport } from "@canopy/database-import-plans";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  executeCanopyCommand,
  executeCreateClaimCommand,
  executeCreateProposalCommand,
  executeCreateResourceCommand,
  executeGrantUseRightCommand,
  executePostLedgerEntryCommand,
  executeRecordDecisionCommand
} from "@canopy/workflows-command-runtime";
import {
  createImportReviewReport,
  executeReviewedImport
} from "@canopy/workflows-import-execution";
import { runOutboxWorker } from "@canopy/workflows-outbox";
import {
  createInMemoryMaterializedProjectionStore,
  projectionMaterializedTargetRef,
  readMaterializedProjection,
  rebuildAndPersistAllProjections
} from "@canopy/workflows-projection-rebuild";

const occurredAt = "2026-06-14T18:30:00.000Z";
const namespace = "canopy.vertical.heat-response";
const orgId = "org.eastbank-commons";
const commonsId = "commons.eastbank-neighborhood";
const livingSystemId = "living-system.eastbank-heat-island";

const stewardRef = ref("person.lena", "person");
const neighborRef = ref("person.omar", "person");
const mandateRef = ref("mandate.heat-response.2026", "mandate");
const claimRef = ref("claim.cooling-need-elder-block", "claim");
const evidenceRef = ref("evidence.sensor-and-visit-heat-risk", "evidence");
const sourceRef = ref("source.block-heat-observation", "source");
const issueRef = governanceRef("issue.heat-response-elder-block", "issue");
const proposalRef = governanceRef("proposal.open-cooling-room", "proposal");
const decisionRef = governanceRef("decision.open-cooling-room", "decision");
const resourceRef = ref("resource.library-cooling-room", "resource");
const useRightRef = ref("use-right.library-cooling-access", "use-right");
const reserveLedgerRef = ref("ledger-account.heat-response-reserve", "ledger-account");
const coordinationLedgerRef = ref("ledger-account.cooling-room-coordination", "ledger-account");
const ledgerEntryRef = ref("ledger-entry.cooling-room-stipend", "ledger-entry");

describe("neighborhood heat response cybernetic loop", () => {
  it("traces observe, learn, decide, act, measure, and adapt through shell surfaces", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const services = { registry, memory };
    const allocationContext = { objectRegistry: registry, civicMemory: memory };
    const materializedStore = createInMemoryMaterializedProjectionStore();

    await executeCanopyCommand({
      command: {
        eventId: "event.observe.evidence.created.block-heat-risk",
        occurredAt,
        actorRef: stewardRef,
        evidenceRef,
        sourceRef,
        relatedRefs: [claimRef, resourceRef],
        orgId,
        commonsId,
        visibility: "commons" as const,
        dataState: "locally_verified" as const,
        payload: {
          loopPhase: "observe",
          evidenceKind: "sensor_and_visit",
          summary: "Three apartments report unsafe indoor heat after sensor readings spike."
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => ingestEvidence(services, command).event
    });
    await executeCreateClaimCommand({
      command: {
        eventId: "event.interpret.claim.created.cooling-need",
        occurredAt,
        actorRef: stewardRef,
        claimRef,
        relatedRefs: [evidenceRef, resourceRef],
        orgId,
        commonsId,
        livingSystemId,
        visibility: "commons",
        dataState: "testimony_derived",
        payload: {
          loopPhase: "interpret",
          title: "Elder block needs cooling access tonight",
          summary: "Neighbor check-ins and sensor data indicate a short-term cooling need."
        }
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.interpret.claim.reviewed.cooling-need",
        occurredAt,
        actorRef: stewardRef,
        reviewerRef: stewardRef,
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
        eventId: "event.deliberate.issue.created.heat-response",
        occurredAt,
        actorRef: stewardRef,
        issue: makeIssue()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createIssue(services, command).appendResult.event
    });
    await executeCreateProposalCommand({
      command: {
        eventId: "event.deliberate.proposal.created.cooling-room",
        occurredAt,
        actorRef: stewardRef,
        proposal: makeProposal()
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeRecordDecisionCommand({
      command: {
        eventId: "event.decide.decision.recorded.cooling-room",
        occurredAt,
        actorRef: stewardRef,
        decision: makeDecision()
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCreateResourceCommand({
      command: {
        eventId: "event.coordinate.resource.created.cooling-room",
        occurredAt,
        actorRef: stewardRef,
        resourceRef,
        stewardRefs: [stewardRef],
        relatedRefs: [claimRef, evidenceRef],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        livingSystemId,
        title: "Library cooling room",
        resourceKind: "cooling_space",
        summary: "A shared room opened for heat-response coordination."
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.coordinate.use-right.proposed.cooling-access",
        occurredAt,
        actorRef: stewardRef,
        useRightRef,
        proposalRef,
        scope: useRightScope(),
        orgId,
        commonsId,
        livingSystemId,
        rationale: "Reviewed evidence supports temporary access for the elder block."
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => proposeUseRight(services, command).append.event
    });
    await executeGrantUseRightCommand({
      command: {
        eventId: "event.act.use-right.granted.cooling-access",
        occurredAt,
        actorRef: stewardRef,
        useRightRef,
        decisionRef,
        scope: useRightScope(),
        relatedRefs: [claimRef, evidenceRef],
        authorityRefs: [mandateRef, decisionRef],
        orgId,
        commonsId,
        livingSystemId,
        grantNote: "Open the cooling room until the nighttime heat threshold clears."
      },
      services,
      runtime,
      rebuildProjections: false
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.measure.resource-context.recorded.cooling-room",
        occurredAt,
        actorRef: stewardRef,
        resourceRef,
        relatedRefs: [claimRef, useRightRef],
        authorityRefs: [mandateRef, decisionRef],
        orgId,
        commonsId,
        livingSystemId,
        observedAt: "2026-06-14T23:00:00.000Z",
        context: {
          loopPhase: "measure",
          visitorsServed: 18,
          apartmentsChecked: 7,
          indoorHeatRisk: "reduced",
          nextLearningQuestion: "Should earlier neighbor checks trigger the room opening?"
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => recordResourceContext(services, command).append.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.coordinate.ledger-account.created.reserve",
        occurredAt,
        actorRef: stewardRef,
        authorityRefs: [mandateRef],
        ledgerAccountRef: reserveLedgerRef,
        orgId,
        commonsId,
        accountCode: "1000",
        label: "Heat response reserve",
        normalSide: "debit" as const
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createLedgerAccount(allocationContext, command).event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.coordinate.ledger-account.created.cooling-room",
        occurredAt,
        actorRef: stewardRef,
        authorityRefs: [mandateRef],
        ledgerAccountRef: coordinationLedgerRef,
        orgId,
        commonsId,
        accountCode: "5200",
        label: "Cooling room coordination",
        normalSide: "credit" as const
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createLedgerAccount(allocationContext, command).event
    });
    await executePostLedgerEntryCommand({
      command: {
        eventId: "event.act.ledger-entry.posted.cooling-room-stipend",
        occurredAt,
        actorRef: stewardRef,
        authorityRefs: [decisionRef],
        ledgerEntryRef,
        orgId,
        commonsId,
        memo: "Stipend neighbors coordinating cooling room access and wellness checks.",
        lines: [
          {
            accountRef: coordinationLedgerRef,
            side: "debit",
            amount: 750,
            unit: "COMMON_CREDIT",
            relatedRefs: [useRightRef]
          },
          {
            accountRef: reserveLedgerRef,
            side: "credit",
            amount: 750,
            unit: "COMMON_CREDIT",
            relatedRefs: [decisionRef]
          }
        ]
      },
      services,
      runtime,
      rebuildProjections: false
    });

    const dryRun = dryRunSensemakingImport([
      {
        sourceObject: "model",
        sourceId: "heat-response-after-action-2026-06-14",
        source_id: "heat-response-after-action-2026-06-14",
        modelKind: "learning model",
        model_kind: "learning model",
        title: "Cooling room after-action learning",
        status: "reviewed",
        assumptions: ["neighbor check-ins are a leading indicator"],
        outputs: ["open cooling room at lower threshold for high-risk blocks"],
        outputClassification: "model_derived",
        sourceIdRef: sourceRef.id,
        occurredAt
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: occurredAt,
      reviewedByRef: stewardRef
    });
    const importExecution = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: occurredAt
    });
    const worker = await runOutboxWorker({
      runtime,
      workerId: "vertical-slice-heat-response-worker",
      now: occurredAt,
      limit: 50
    });
    const projectionRebuild = rebuildAndPersistAllProjections(runtime, {
      rebuiltAt: occurredAt,
      materializedProjections: materializedStore,
      civicMemory: {
        scope: { orgRef: orgId }
      }
    });
    const resourceShell = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Eastbank heat response commons",
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
    const decisionShell = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Eastbank heat response commons",
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
    const resourceDocument = readMaterializedProjection(materializedStore, {
      projectionName: "resource-stewardship",
      targetRef: resourceRef
    });
    const authorityDocument = readMaterializedProjection(materializedStore, {
      projectionName: "authority",
      targetRef: projectionMaterializedTargetRef("authority")
    });
    const events = runtime.queryEvents().items.map((record) => record.event);

    expect(dryRun.status).toBe("pass");
    expect(review.status).toBe("ready");
    expect(importExecution.status).toBe("applied");
    expect(importExecution.eventRecords[0]?.event.type).toBe("model.created");
    expect(importExecution.eventRecords[0]?.event.payload).toMatchObject({
      dryRun: false,
      sourceProject: "sensemaking",
      preservesUncertainty: true,
      importedFromCandidateEventId: dryRun.candidateEvents[0]?.id
    });
    expect(worker.failedCount).toBe(0);
    expect(worker.acknowledgedCount).toBeGreaterThanOrEqual(12);
    expect(runtime.listOutbox().every((record) => record.status === "acknowledged")).toBe(true);
    expect(runtime.listAdapterAudits().map((record) => record.operation)).toEqual(
      expect.arrayContaining(["import.execute-reviewed", "outbox.dispatch"])
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
    expect(resourceDocument?.processedEventCount).toBe(events.length);
    expect(authorityDocument?.processedEventCount).toBe(events.length);
    expect(loopPhases(events)).toEqual(
      expect.arrayContaining(["observe", "interpret", "measure"])
    );
    expect(findEvent(events, "accounting.ledger_entry.posted").payload).toMatchObject({
      totals: {
        COMMON_CREDIT: {
          debit: 750,
          credit: 750
        }
      }
    });
    expect(
      findEvent(events, "stewardship.use_right.granted").authorityRefs.map((ref) => ref.id)
    ).toEqual(expect.arrayContaining([mandateRef.id, decisionRef.id]));
    expect(resourceShell.resourceStewardship?.contextEvents.map((context) => context.summary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          visitorsServed: 18,
          nextLearningQuestion: "Should earlier neighbor checks trigger the room opening?"
        })
      ])
    );
    expect(resourceShell.surfaces.objectPage?.timeline.map((entry) => entry.type)).toEqual(
      expect.arrayContaining([
        "stewardship.resource_context.recorded",
        "stewardship.use_right.granted"
      ])
    );
    expect(resourceShell.surfaces.authorityTrace.status).toBe("ok");
    expect(resourceShell.surfaces.authorityTrace.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([mandateRef.id, decisionRef.id])
    );
    expect(resourceShell.surfaces.sourceProvenancePanel).toMatchObject({
      sourceTreatment: "folded-source",
      sourceProjects: expect.arrayContaining(["canopy", "sensemaking"])
    });
    expect(resourceShell.surfaces.importReview).toMatchObject({
      sourceProject: "sensemaking",
      sourceTreatment: "folded-source",
      canonicalNamespace: "canopy",
      candidateEventIds: dryRun.candidateEvents.map((event) => event.id)
    });
    expect(decisionShell.decisionPacket?.decision?.ref).toEqual(decisionRef);
    expect(decisionShell.decisionPacket?.stewardshipOutcomes.map((outcome) => outcome.ref)).toEqual(
      expect.arrayContaining([useRightRef])
    );
    expect(
      decisionShell.decisionPacket?.allocationAccountingOutcomes.map((outcome) => outcome.ref)
    ).toEqual(expect.arrayContaining([ledgerEntryRef]));
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
    createdByRef: stewardRef,
    authorityRefs: [mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueType: "stewardship",
    title: "Respond to elder block heat risk",
    description: "Decide whether a nearby room should open for heat-response cooling access.",
    priority: "urgent",
    scope: {
      orgId,
      affectedRefs: [neighborRef, resourceRef]
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
    createdByRef: stewardRef,
    authorityRefs: [mandateRef],
    dataState: "locally_verified",
    visibility: "commons",
    dataStewardshipAgreementRefs: [],
    issueRef,
    proposalType: "operational_action",
    title: "Open the library room as a cooling room",
    summary: "Grant temporary access and coordinate neighbor wellness checks.",
    proposedByRefs: [stewardRef],
    affectedRefs: [neighborRef, resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    scenarioRefs: [],
    amendmentRefs: [],
    objectionRefs: [],
    decisionMethod: decisionMethod(),
    deliberationWindow: {},
    conditions: ["recheck indoor heat before sunrise"]
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
    createdByRef: stewardRef,
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
    decidedByRefs: [stewardRef],
    affectedRefs: [neighborRef, resourceRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "Reviewed evidence shows immediate heat risk and available cooling capacity.",
    conditions: ["record visitors served and follow-up learning question"],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [],
    supersedesDecisionRefs: []
  };
}

function decisionMethod() {
  return {
    kind: "consent",
    eligibleVoterRefs: [stewardRef],
    authorityRefs: [mandateRef],
    guardianReviewRequired: false
  } as const;
}

function useRightScope(): UseRightScope {
  return {
    holderRef: neighborRef,
    resourceRef,
    permissions: ["enter.cooling-room", "coordinate.wellness-checks"],
    conditions: ["respect quiet hours", "record visitor count"],
    term: {
      startsAt: "2026-06-14T19:00:00.000Z",
      endsAt: "2026-06-15T07:00:00.000Z"
    },
    review: {
      reviewPathRef: issueRef,
      reviewAt: "2026-06-15T12:00:00.000Z"
    },
    revocation: {
      revocable: true,
      revocationPathRef: issueRef,
      revocationConditions: ["heat risk clears", "space becomes unsafe"]
    }
  };
}

function loopPhases(events: readonly CanopyEvent[]): readonly string[] {
  return events.flatMap((event) => {
    const phases = [];
    if (typeof event.payload.loopPhase === "string") {
      phases.push(event.payload.loopPhase);
    }
    const context = event.payload.context;
    if (isRecord(context) && typeof context.loopPhase === "string") {
      phases.push(context.loopPhase);
    }
    return phases;
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
