import { describe, expect, it } from "vitest";
import type { ExportRule, ObjectRef } from "@canopy/contracts-kernel";
import type { Decision, DecisionPacket, Issue, Proposal } from "@canopy/contracts-governance";
import {
  contestClaim,
  createClaim,
  ingestEvidence
} from "@canopy/capabilities-claims-evidence";
import { approveExport } from "@canopy/capabilities-data-stewardship";
import {
  createIssue,
  createProposal,
  recordDecision,
  recordDecisionPacket
} from "@canopy/capabilities-governance";
import {
  buildPersistedCanopyShellSession,
  executePersistedCanopyShellCommand
} from "@canopy/app-shell";
import {
  dryRunCommonCreditImport,
  dryRunSensemakingImport
} from "@canopy/database-import-plans";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import { executeCanopyCommand } from "@canopy/workflows-command-runtime";
import {
  createImportReviewReport,
  executeReviewedImport
} from "@canopy/workflows-import-execution";
import {
  createInMemoryMaterializedProjectionStore,
  rebuildAndPersistAllProjections
} from "@canopy/workflows-projection-rebuild";

const occurredAt = "2026-06-14T15:00:00.000Z";
const namespace = "canopy.vertical.runtime-shell";
const orgId = "org.shell-demo-commons";
const commonsId = "commons.shell-demo";

const actorRef = ref("person.mira", "person");
const reviewerRef = ref("person.ren", "person");
const mandateRef = ref("mandate.shell-demo", "mandate");
const exportPolicyRef = ref("policy.peer-federation", "policy");
const peerCommonsRef = ref("organization.peer-commons", "organization");
const claimRef = ref("claim.soil-moisture-risk", "claim");
const contestRef = ref("claim.soil-moisture-counter", "claim");
const evidenceRef = ref("evidence.sensor-recheck", "evidence");
const sourceRef = ref("source.sensor-recheck", "source");
const issueRef = governanceRef("issue.soil-moisture-response", "issue");
const proposalRef = governanceRef("proposal.delay-irrigation", "proposal");
const decisionRef = governanceRef("decision.delay-irrigation", "decision");
const packetRef = governanceRef("decision-packet.delay-irrigation", "decision-packet");
const exportRef = ref("source.export.delay-irrigation", "source");

describe("runtime-backed shell workflow slices", () => {
  it("hydrates a CommonCredit account import into materialized shell object and import screens", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const materializedStore = createInMemoryMaterializedProjectionStore();
    const dryRun = dryRunCommonCreditImport([
      {
        sourceObject: "account",
        id: "cc-account-food-hub-reserve",
        "account owner": "org.riverbend-food-hub",
        "account kind": "reserve",
        accountOwner: "org.riverbend-food-hub",
        accountKind: "reserve",
        authorityRef: mandateRef.id,
        openingBalance: 0,
        createdAt: occurredAt
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: occurredAt,
      reviewedByRef: actorRef
    });
    const imported = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: occurredAt,
      projectionRebuildOptions: {
        materializedProjections: materializedStore,
        civicMemory: {
          scope: {}
        }
      }
    });
    const accountRef = requireFirst(dryRun.mappingCandidates).canonicalRef;

    const objectSession = buildPersistedCanopyShellSession({
      runtime,
      scope: {
        label: "Runtime shell demo commons",
        scope: {}
      },
      route: `/objects/ledger-account/${accountRef.id}`,
      materializedProjectionStore: materializedStore,
      materializedProjections: imported.projectionRebuild?.persistedDocuments ?? [],
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    });
    const importCommand = executePersistedCanopyShellCommand({
      runtime,
      scope: {
        label: "Runtime shell demo commons",
        scope: {}
      },
      command: "imports",
      materializedProjectionStore: materializedStore,
      materializedProjections: imported.projectionRebuild?.persistedDocuments ?? [],
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    });

    expect(dryRun.status).toBe("pass");
    expect(review.status).toBe("ready");
    expect(imported.status).toBe("applied");
    expect(imported.projectionRebuild?.persistedStates.map((state) => state.id)).toEqual([
      "projection-state.object-page",
      "projection-state.civic-memory",
      "projection-state.authority",
      "projection-state.claim-evidence",
      "projection-state.resource-stewardship",
      "projection-state.decision-packet",
      "projection-state.federation-export"
    ]);
    expect(imported.eventRecords[0]?.event.type).toBe("object.created");
    expect(imported.eventRecords[0]?.event.sourceCapability).toBe("allocation-accounting");
    expect(objectSession.session.snapshot.selectedObjectRef).toEqual(accountRef);
    expect(objectSession.session.screen.text).toContain(`Object: ledger-account:${accountRef.id}`);
    expect(objectSession.session.snapshot.surfaces.objectPage?.projectionRead).toMatchObject({
      kind: "materialized",
      projectionName: "object-page",
      targetRef: accountRef
    });
    expect(objectSession.session.snapshot.availableModes).toEqual(
      expect.arrayContaining(["coordination"])
    );
    expect(objectSession.session.snapshot.surfaces.sourceProvenancePanel).toMatchObject({
      sourceTreatment: "folded-source",
      sourceProjects: ["common-credit"]
    });
    expect(importCommand.screen.text).toContain("Import Review: common-credit-fold-in");
    expect(importCommand.screen.text).toContain(
      `account:cc-account-food-hub-reserve -> ledger-account:${accountRef.id} defer/medium`
    );
  });

  it("projects a Sensemaking claim contest, decision packet, and federation export into shell screens", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => occurredAt });
    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const services = { registry, memory };
    const materializedStore = createInMemoryMaterializedProjectionStore();

    await executeCanopyCommand({
      command: {
        eventId: "event.claim.created.soil-moisture-risk",
        occurredAt,
        actorRef,
        claimRef,
        relatedRefs: [],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        visibility: "commons" as const,
        dataState: "testimony_derived" as const,
        payload: {
          title: "Soil moisture risk may require irrigation",
          summary: "Initial field report says orchard beds may cross the dry threshold."
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createClaim(services, command).event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.evidence.created.sensor-recheck",
        occurredAt,
        actorRef: reviewerRef,
        evidenceRef,
        sourceRef,
        relatedRefs: [claimRef],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        visibility: "commons" as const,
        dataState: "sensor_derived" as const,
        payload: {
          title: "Sensor recheck",
          summary: "Second reading shows moisture above the emergency threshold."
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => ingestEvidence(services, command).event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.claim.contested.soil-moisture-risk",
        occurredAt,
        actorRef: reviewerRef,
        claimRef,
        contestRef,
        evidenceRefs: [evidenceRef],
        authorityRefs: [mandateRef],
        orgId,
        commonsId,
        visibility: "commons" as const,
        dataState: "contested" as const,
        payload: {
          title: "Counterclaim: delay irrigation",
          summary: "The recheck contests the urgent irrigation interpretation."
        }
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => contestClaim(services, command).event
    });

    const dryRun = dryRunSensemakingImport([
      {
        sourceObject: "claim",
        id: "soil-moisture-counter-source",
        statement: "Sensor recheck contests the urgent irrigation claim.",
        status: "contested",
        confidence: "medium",
        reviewer: reviewerRef.id,
        occurredAt
      }
    ]);
    const review = createImportReviewReport(dryRun, {
      defaultDecision: "accept",
      reviewedAt: occurredAt,
      reviewedByRef: reviewerRef
    });
    const imported = executeReviewedImport({
      dryRun,
      review,
      runtime,
      recordedAt: occurredAt
    });

    await executeCanopyCommand({
      command: {
        eventId: "event.issue.created.soil-moisture-response",
        occurredAt,
        actorRef,
        issue: makeIssue()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createIssue(services, command).appendResult.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.proposal.created.delay-irrigation",
        occurredAt,
        actorRef,
        proposal: makeProposal()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => createProposal(services, command).appendResult.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.decision.recorded.delay-irrigation",
        occurredAt,
        actorRef,
        decision: makeDecision()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => recordDecision(services, command).appendResult.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.decision-packet.recorded.delay-irrigation",
        occurredAt,
        actorRef,
        decisionPacket: makeDecisionPacket()
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => recordDecisionPacket(services, command).appendResult.event
    });
    await executeCanopyCommand({
      command: {
        eventId: "event.federation.export.approved.delay-irrigation",
        occurredAt,
        actorRef,
        exportRef,
        exportRule: federationExportRule(),
        recipientRef: peerCommonsRef,
        objectRefs: [decisionRef, packetRef, claimRef, evidenceRef],
        format: "json" as const,
        authorityRefs: [exportPolicyRef],
        orgId,
        commonsId,
        note: "Share the packet with a peer commons for watershed coordination."
      },
      runtime,
      rebuildProjections: false,
      handle: (command) => approveExport(services, command).append.event
    });

    const projectionRebuild = rebuildAndPersistAllProjections(runtime, {
      rebuiltAt: occurredAt,
      materializedProjections: materializedStore,
      civicMemory: {
        scope: { orgRef: orgId }
      }
    });
    const claimSession = buildPersistedCanopyShellSession({
      runtime,
      scope: {
        label: "Runtime shell demo commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: claimRef,
      route: "/claims-evidence",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    });
    const decisionSession = buildPersistedCanopyShellSession({
      runtime,
      scope: {
        label: "Runtime shell demo commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      route: "/decisions",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    });
    const federationCommand = executePersistedCanopyShellCommand({
      runtime,
      scope: {
        label: "Runtime shell demo commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      command: "federation",
      materializedProjectionStore: materializedStore,
      materializedProjections: projectionRebuild.persistedDocuments,
      importDryRun: dryRun,
      rebuiltAt: occurredAt,
      persistProjectionState: false
    });

    expect(dryRun.status).toBe("pass");
    expect(review.status).toBe("ready");
    expect(imported.status).toBe("applied");
    expect(imported.eventRecords[0]?.event.payload).toMatchObject({
      sourceProject: "sensemaking",
      preservesUncertainty: true
    });
    expect(claimSession.session.snapshot.surfaces.claimEvidence.selectedClaim).toMatchObject({
      claimRef,
      status: "contested",
      contestRefs: [contestRef]
    });
    expect(claimSession.session.screen.text).toContain(
      `- contest claim:${contestRef.id} contests=claim:${claimRef.id} evidence=1`
    );
    expect(claimSession.session.snapshot.surfaces.claimEvidence.projectionRead.kind).toBe(
      "materialized"
    );
    expect(decisionSession.session.snapshot.surfaces.decisionPacket).toMatchObject({
      decisionRef,
      packetRef,
      outcome: "passed",
      claimRefs: expect.arrayContaining([claimRef]),
      evidenceRefs: expect.arrayContaining([evidenceRef])
    });
    expect(decisionSession.session.screen.text).toContain(
      `Decision Packet: decision:${decisionRef.id}`
    );
    expect(federationCommand.status).toBe("handled");
    expect(federationCommand.screen.text).toContain("Federation Export:");
    expect(federationCommand.screen.text).toContain("Projection: materialized/current");
    expect(
      federationCommand.session.snapshot.surfaces.federationExportState?.includedObjectRefs
    ).toEqual(expect.arrayContaining([decisionRef, packetRef, claimRef, evidenceRef]));
    expect(federationCommand.session.snapshot.surfaces.sourceProvenancePanel).toMatchObject({
      sourceTreatment: "folded-source",
      sourceProjects: expect.arrayContaining(["canopy", "sensemaking"])
    });
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
    title: "Respond to contested soil moisture risk",
    description: "Decide whether the orchard should delay irrigation after a contested reading.",
    priority: "high",
    scope: {
      orgId,
      affectedRefs: [claimRef]
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
    title: "Delay irrigation until morning recheck",
    summary: "Use the counter-evidence to avoid unnecessary irrigation.",
    proposedByRefs: [actorRef],
    affectedRefs: [claimRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    scenarioRefs: [],
    amendmentRefs: [],
    objectionRefs: [],
    decisionMethod: decisionMethod(),
    deliberationWindow: {},
    conditions: ["recheck sensor before sunrise"]
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
    affectedRefs: [claimRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    perspectiveRefs: [],
    unresolvedObjectionRefs: [],
    rationale: "The contesting evidence lowers immediate risk and supports a measured delay.",
    conditions: ["morning sensor recheck required"],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [exportPolicyRef],
    supersedesDecisionRefs: []
  };
}

function makeDecisionPacket(): DecisionPacket {
  return {
    schemaVersion: "0.0.0",
    id: packetRef.id,
    type: "decision-packet",
    orgId,
    status: "complete",
    issueRefs: [issueRef],
    proposalRefs: [proposalRef],
    decisionRef,
    authorityRefs: [mandateRef],
    decisionMethod: decisionMethod(),
    scopeRefs: [],
    affectedObjectRefs: [claimRef],
    claimRefs: [claimRef],
    evidenceRefs: [evidenceRef],
    evidenceLinkRefs: [],
    perspectiveRefs: [],
    scenarioRefs: [],
    modelRefs: [],
    guardianReviewRefs: [],
    unresolvedObjectionRefs: [],
    unresolvedObjectionsSummary: "No unresolved objections remain after the contest review.",
    outcome: "passed",
    rationale: "The packet preserves the contest and records why the decision still passed.",
    conditions: ["morning sensor recheck required"],
    obligationRefs: [],
    agreementRefs: [],
    policyRefs: [exportPolicyRef],
    policyVersionRefs: [],
    dataStewardship: {
      visibility: "commons",
      dataState: "locally_verified",
      dataStewardshipAgreementRefs: [],
      consentSignalRefs: [],
      allowedUses: ["governance_review", "coordinate"],
      prohibitedUses: ["commercialize"],
      federationRuleRefs: [exportPolicyRef]
    },
    redactionSummary: {
      hasRedactions: false,
      redactedRefs: [],
      sealedRefs: [],
      continuityEventRefs: []
    },
    eventRefs: [],
    schemaVersions: [
      {
        contractName: "@canopy/contracts-governance",
        schemaVersion: "0.0.0"
      }
    ],
    createdAt: occurredAt,
    createdByRef: actorRef
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

function federationExportRule(): ExportRule {
  return {
    id: "export-rule.peer-decision-packet",
    exportAllowed: true,
    allowedFormats: ["json"],
    allowedObjectTypes: ["decision", "decision-packet", "claim", "evidence"],
    allowedRecipientRefs: [peerCommonsRef],
    prohibitedRecipientRefs: [],
    includeRedactionStubs: true,
    consentRequired: false,
    authorityRefs: [exportPolicyRef]
  };
}

function requireFirst<TValue>(values: readonly TValue[]): TValue {
  const value = values[0];

  if (value === undefined) {
    throw new Error("Expected at least one value.");
  }

  return value;
}
