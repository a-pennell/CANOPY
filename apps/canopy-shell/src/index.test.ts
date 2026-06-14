import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import type { ImportDryRunResult } from "@canopy/database-import-plans";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import { createInMemoryMaterializedProjectionStore } from "@canopy/workflows-projection-rebuild";
import {
  buildCanopyShellNavigation,
  buildCanopyShellSession,
  buildCanopyShellSnapshot,
  buildPersistedCanopyShellSession,
  buildPersistedCanopyShellSnapshot,
  executeCanopyShellCommand,
  executePersistedCanopyShellCommand,
  renderCanopyShell
} from "./index.js";

const namespace = "canopy.shell.test";
const occurredAt = "2026-06-13T17:00:00.000Z";
const orgId = "org.riverbend";
const claimRef = ref("claim.school-need", "claim");
const decisionRef = ref("decision.school-need", "decision");
const mandateRef = ref("mandate.food-commons", "mandate");
const policyRef = ref("policy.export-foodshed", "policy");
const resourceRef = ref("resource.cooling-center", "resource");
const useRightRef = ref("use-right.cooling-center-shelter", "use-right");
const agreementRef = ref(
  "agreement.data-stewardship.foodshed",
  "agreement",
  "canopy.data-stewardship"
);
const exportRef = ref("export.foodshed-packet", "source");

describe("canopy shell snapshot", () => {
  it("hydrates one operating surface from event projections", () => {
    const snapshot = buildCanopyShellSnapshot({
      events: shellEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      activeMode: "decisions"
    });

    expect(snapshot.app.name).toBe("canopy-shell");
    expect(snapshot.legacyProjectNavigation).toEqual([]);
    expect(snapshot.availableModes).toEqual([
      "scope",
      "objects",
      "memory",
      "decisions",
      "federation"
    ]);
    expect(snapshot.sourceCapabilities).toEqual([
      "claims-evidence",
      "data-stewardship",
      "ecological-modeling",
      "governance"
    ]);
    expect(snapshot.claimEvidence.claimRefs.map((ref) => ref.id)).toEqual([
      claimRef.id
    ]);
    expect(snapshot.authority.bindingCoverage.map((entry) => entry.eventId)).toEqual([
      "event.governance.decision.recorded.school-need"
    ]);
    expect(snapshot.decisionPacket?.decisionRef.id).toBe(decisionRef.id);
    expect(snapshot.federationExport?.envelope.id).toBe(
      "export-envelope.canopy-export:event.claim.created.school-need|event.federation.export.approved.foodshed|event.governance.decision.recorded.school-need|event.model.output.generated.school-need"
    );
    expect(
      snapshot.federationExport?.preview.federationReadinessWarnings
    ).toEqual([]);
    expect(snapshot.federationExport?.preview.dataStewardshipAgreementRefs).toEqual([
      agreementRef
    ]);
    expect(snapshot.objectPage?.timelineEvents.map((event) => event.type)).toEqual([
      "federation.export.approved",
      "governance.decision.recorded"
    ]);
    expect(snapshot.commands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        "command.search-objects",
        "command.open-memory",
        "command.create-claim",
        "command.record-decision",
        "command.preview-export"
      ])
    );
    expect(snapshot.attention.map((item) => item.kind)).toEqual([
      "machine-output"
    ]);
    expect(snapshot.surfaces.objectPage?.objectRef).toEqual(decisionRef);
    expect(snapshot.surfaces.objectPage?.projectionRead.kind).toBe("live");
    expect(snapshot.surfaces.civicMemoryStream.timeline.map((entry) => entry.id)).toEqual([
      "event.claim.created.school-need",
      "event.federation.export.approved.foodshed",
      "event.governance.decision.recorded.school-need",
      "event.model.output.generated.school-need"
    ]);
    expect(snapshot.surfaces.sourceProvenancePanel).toMatchObject({
      sourceTreatment: "native-canopy",
      sourceProjects: ["canopy"],
      sourceCapabilities: [
        "claims-evidence",
        "data-stewardship",
        "ecological-modeling",
        "governance"
      ]
    });
    expect(snapshot.surfaces.authorityTrace).toMatchObject({
      objectRef: decisionRef,
      status: "ok"
    });
    expect(snapshot.surfaces.claimEvidence).toMatchObject({
      kind: "claim-evidence",
      counts: {
        claims: 1,
        evidence: 1,
        evidenceLinks: 0,
        reviews: 0,
        contests: 0,
        aiNonAuthorityIndicators: 1
      }
    });
    expect(snapshot.surfaces.claimEvidence.claims[0]).toMatchObject({
      claimRef,
      status: "review_required",
      aiIndicatorEventIds: ["event.model.output.generated.school-need"]
    });
    expect(snapshot.surfaces.decisionPacket).toMatchObject({
      kind: "decision-packet",
      decisionRef,
      claimRefs: [claimRef],
      hasRedactions: false,
      hasSupersessions: false
    });
    expect(snapshot.surfaces.claimEvidence.evidence[0]).toMatchObject({
      evidenceRef: ref("evidence.model-output.school-need", "evidence"),
      isAiOrModelOutput: true
    });
    expect(snapshot.surfaces.federationExportState).toMatchObject({
      kind: "federation-export-state",
      status: "ready",
      envelopeId:
        "export-envelope.canopy-export:event.claim.created.school-need|event.federation.export.approved.foodshed|event.governance.decision.recorded.school-need|event.model.output.generated.school-need",
      dataStewardshipAgreementRefs: [agreementRef],
      localMappingIds: ["mapping.school-need"],
      readinessWarnings: []
    });
    expect(snapshot.projectionReads.map((read) => read.projectionName)).toEqual([
      "object-page",
      "civic-memory",
      "authority",
      "claim-evidence",
      "resource-stewardship",
      "decision-packet"
    ]);
  });

  it("hydrates the operating surface from persisted canonical events", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T18:00:00.000Z"
    });
    const materializedProjectionStore = createInMemoryMaterializedProjectionStore();

    for (const event of shellEvents) {
      runtime.appendEvent(event);
    }

    const persisted = buildPersistedCanopyShellSnapshot({
      runtime,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      activeMode: "decisions",
      rebuiltAt: "2026-06-13T18:05:00.000Z",
      materializedProjectionStore
    });

    expect(persisted.sourceEventIds).toEqual([
      "event.claim.created.school-need",
      "event.federation.export.approved.foodshed",
      "event.governance.decision.recorded.school-need",
      "event.model.output.generated.school-need"
    ]);
    expect(persisted.snapshot.decisionPacket?.decisionRef).toEqual(decisionRef);
    expect(persisted.snapshot.federationExport?.preview.dataStewardshipAgreementRefs).toEqual([
      agreementRef
    ]);
    expect(persisted.snapshot.commands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["command.record-decision", "command.preview-export"])
    );
    expect(persisted.persistedProjectionStateIds).toEqual([
      "projection-state.object-page",
      "projection-state.civic-memory",
      "projection-state.authority",
      "projection-state.claim-evidence",
      "projection-state.resource-stewardship",
      "projection-state.decision-packet"
    ]);
    expect(runtime.getProjectionState("projection-state.civic-memory")).toMatchObject({
      processedEventCount: shellEvents.length,
      rebuiltAt: "2026-06-13T18:05:00.000Z"
    });
    expect(persisted.snapshot.surfaces.civicMemoryStream.projectionRead).toMatchObject({
      kind: "materialized",
      projectionName: "civic-memory",
      processedEventCount: shellEvents.length,
      freshness: "current"
    });
    expect(persisted.snapshot.surfaces.objectPage?.projectionRead).toMatchObject({
      kind: "materialized",
      projectionName: "object-page",
      targetRef: decisionRef
    });
  });

  it("exposes resource stewardship as a selected object surface", () => {
    const snapshot = buildCanopyShellSnapshot({
      events: stewardshipEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: resourceRef,
      activeMode: "stewardship"
    });

    expect(snapshot.availableModes).toEqual([
      "scope",
      "objects",
      "memory",
      "decisions",
      "stewardship",
      "federation"
    ]);
    expect(snapshot.commands.map((command) => command.id)).toEqual(
      expect.arrayContaining(["command.grant-use-right"])
    );
    expect(snapshot.resourceStewardship?.resourceRef).toEqual(resourceRef);
    expect(snapshot.surfaces.resourceStewardship).toMatchObject({
      kind: "resource-stewardship",
      resourceRef,
      title: "Cooling center",
      resourceKind: "community-space",
      ecologicalContextIds: ["living-system.heat-response"],
      counts: {
        totalEvents: 2,
        contextEvents: 1,
        proposedUseRights: 0,
        grantedUseRights: 1,
        revokedUseRights: 0
      }
    });
    expect(snapshot.surfaces.resourceStewardship?.useRights).toEqual([
      expect.objectContaining({
        useRightRef,
        state: "granted",
        holderRef: ref("person.mira", "person"),
        resourceRef,
        permissions: ["shelter"],
        conditions: ["heat emergency"],
        decisionRefs: [decisionRef],
        authorityRefs: [mandateRef]
      })
    ]);
    expect(snapshot.surfaces.objectPage?.objectRef).toEqual(resourceRef);
  });

  it("exposes folded-source import review as a shell surface", () => {
    const snapshot = buildCanopyShellSnapshot({
      events: shellEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: claimRef,
      importDryRun: importDryRunResult
    });

    expect(snapshot.surfaces.importReview).toMatchObject({
      kind: "import-review",
      sourceProject: "common-credit",
      sourceTreatment: "folded-source",
      canonicalNamespace: "canopy",
      status: "warn",
      defaultDisposition: "defer"
    });
    expect(snapshot.surfaces.importReview?.candidates).toEqual([
      expect.objectContaining({
        canonicalRef: claimRef,
        proposedDisposition: "alias",
        reviewDisposition: "defer",
        confidence: "medium"
      })
    ]);
    expect(snapshot.surfaces.importReview?.warnings.map((warning) => warning.code)).toEqual([
      "missing-authority-hint"
    ]);
  });

  it("builds a runnable session with routes and a text renderer", () => {
    const session = buildCanopyShellSession({
      events: shellEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: decisionRef,
      activeMode: "decisions",
      route: "/federation"
    });

    expect(session.prompt).toBe("Riverbend Foodshed Commons /federation>");
    expect(session.navigation.activePath).toBe("/federation");
    expect(session.navigation.routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        "/scope",
        "/objects",
        "/claims-evidence",
        "/decisions",
        "/stewardship",
        "/imports",
        "/federation",
        `/objects/decision/${decisionRef.id}`,
        `/objects/claim/${claimRef.id}`
      ])
    );
    expect(session.screen.text).toContain("Federation Export: ready");
    expect(session.screen.text).toContain("Data stewardship agreements: agreement:agreement.data-stewardship.foodshed");
    expect(renderCanopyShell(session.snapshot, "/claims-evidence")).toContain(
      "Counts: 1 claims, 1 evidence, 0 contests, 1 AI indicators"
    );
  });

  it("builds persisted sessions that hydrate object routes from canonical runtime events", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T18:00:00.000Z"
    });
    const materializedProjectionStore = createInMemoryMaterializedProjectionStore();

    for (const event of stewardshipEvents) {
      runtime.appendEvent(event);
    }

    const persisted = buildPersistedCanopyShellSession({
      runtime,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      route: "/objects/resource/resource.cooling-center",
      rebuiltAt: "2026-06-13T18:05:00.000Z",
      materializedProjectionStore
    });

    expect(persisted.session.navigation.activePath).toBe(
      "/objects/resource/resource.cooling-center"
    );
    expect(persisted.session.snapshot.selectedObjectRef).toEqual(resourceRef);
    expect(persisted.session.snapshot.activeMode).toBe("stewardship");
    expect(persisted.session.screen.text).toContain("Object Page: Cooling center");
    expect(persisted.session.snapshot.surfaces.objectPage?.projectionRead).toMatchObject({
      kind: "materialized",
      projectionName: "object-page",
      targetRef: resourceRef
    });
    expect(persisted.session.snapshot.surfaces.resourceStewardship?.projectionRead).toMatchObject({
      kind: "materialized",
      projectionName: "resource-stewardship",
      targetRef: resourceRef
    });
  });

  it("executes persisted commands by rebuilding the target runtime-backed screen", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T18:00:00.000Z"
    });
    const materializedProjectionStore = createInMemoryMaterializedProjectionStore();

    for (const event of stewardshipEvents) {
      runtime.appendEvent(event);
    }

    const execution = executePersistedCanopyShellCommand({
      runtime,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      command: "open /objects/resource/resource.cooling-center",
      rebuiltAt: "2026-06-13T18:05:00.000Z",
      materializedProjectionStore
    });

    expect(execution.status).toBe("handled");
    expect(execution.message).toBe("Opened resource: resource.cooling-center.");
    expect(execution.session.snapshot.selectedObjectRef).toEqual(resourceRef);
    expect(execution.screen.text).toContain("Object Page: Cooling center");
    expect(execution.sourceEventIds).toEqual(
      expect.arrayContaining(stewardshipEvents.map((event) => event.id))
    );
    expect(execution.sourceEventIds).toHaveLength(stewardshipEvents.length);
  });

  it("executes CLI-like aliases over shell surfaces", () => {
    const snapshot = buildCanopyShellSnapshot({
      events: stewardshipEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: resourceRef,
      activeMode: "stewardship",
      importDryRun: importDryRunResult
    });

    expect(executeCanopyShellCommand(snapshot, "claims")).toMatchObject({
      status: "handled",
      message: "Opened Claims and evidence."
    });
    expect(executeCanopyShellCommand(snapshot, "claims").screen.text).toContain(
      "Claims and Evidence"
    );
    expect(executeCanopyShellCommand(snapshot, "open /imports").screen.text).toContain(
      "Import Review: common-credit-fold-in"
    );
    expect(executeCanopyShellCommand(snapshot, "stewardship").screen.text).toContain(
      "Resource Stewardship: Cooling center"
    );
    expect(executeCanopyShellCommand(snapshot, "open /objects/resource/resource.cooling-center").screen.text).toContain(
      "Object Page: Cooling center"
    );
  });

  it("keeps unavailable routes navigable with an explanation", () => {
    const snapshot = buildCanopyShellSnapshot({
      events: shellEvents,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: orgId }
      },
      selectedObjectRef: claimRef
    });

    const navigation = buildCanopyShellNavigation(snapshot, "/stewardship");
    const stewardshipRoute = navigation.routes.find((route) => route.path === "/stewardship");
    const command = executeCanopyShellCommand(snapshot, "stewardship");

    expect(stewardshipRoute).toMatchObject({
      status: "unavailable",
      disabledReason: "Select a resource object to hydrate stewardship state."
    });
    expect(command).toMatchObject({
      status: "unavailable",
      message: "Stewardship is not available in this shell state."
    });
    expect(command.screen.text).toContain("Stewardship: unavailable");
  });
});

const shellEvents = [
  {
    id: "event.claim.created.school-need",
    type: "claim.created",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef: claimRef,
    relatedRefs: [],
    authorityRefs: [],
    orgId,
    sourceCapability: "claims-evidence",
    payload: { title: "School produce need" },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "testimony_derived"
  },
  {
    id: "event.model.output.generated.school-need",
    type: "model.output.generated",
    occurredAt,
    systemActor: "ai_assistant",
    objectRef: ref("evidence.model-output.school-need", "evidence"),
    relatedRefs: [claimRef],
    authorityRefs: [],
    orgId,
    sourceCapability: "ecological-modeling",
    payload: { canAuthorizeBindingAction: false },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "machine_inferred"
  },
  {
    id: "event.governance.decision.recorded.school-need",
    type: "governance.decision.recorded",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef: decisionRef,
    relatedRefs: [claimRef],
    authorityRefs: [mandateRef],
    orgId,
    sourceCapability: "governance",
    payload: { title: "Approve school produce allocation" },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "institutionally_certified"
  },
  {
    id: "event.federation.export.approved.foodshed",
    type: "federation.export.approved",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef: exportRef,
    relatedRefs: [claimRef, decisionRef, agreementRef],
    authorityRefs: [policyRef],
    orgId,
    sourceCapability: "data-stewardship",
    payload: {
      format: "json",
      dataStewardshipAgreementRef: agreementRef,
      dataStewardshipAgreements: [
        {
          id: "dsa.foodshed",
          governedRef: claimRef,
          stewardRefs: [ref("person.mira", "person")],
          visibility: "federation",
          allowedUses: ["recipient commons coordination"],
          prohibitedUses: ["resale"],
          consentRequired: false,
          federationRuleRef: policyRef,
          schemaVersion: 1
        }
      ],
      localMappings: [
        {
          id: "mapping.school-need",
          localLabel: "school produce need",
          localType: "need_statement",
          localId: "school-need-1",
          canonicalType: "claim",
          canonicalRef: claimRef,
          disposition: "alias",
          authorityRefs: [policyRef],
          schemaVersion: 1
        }
      ]
    },
    schemaVersion: 1,
    visibility: "federation",
    dataState: "institutionally_certified"
  }
] as const satisfies readonly CanopyEvent[];

const stewardshipEvents = [
  ...shellEvents,
  {
    id: "event.stewardship.resource_context.recorded.cooling-center",
    type: "stewardship.resource_context.recorded",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef: resourceRef,
    relatedRefs: [],
    authorityRefs: [mandateRef],
    orgId,
    sourceCapability: "stewardship",
    livingSystemId: "living-system.heat-response",
    payload: {
      title: "Cooling center",
      resourceKind: "community-space",
      observedAt: "2026-06-13T16:00:00.000Z",
      context: { risk: "heat" }
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "locally_verified"
  },
  {
    id: "event.stewardship.use_right.granted.cooling-center",
    type: "stewardship.use_right.granted",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef: useRightRef,
    relatedRefs: [resourceRef, decisionRef, ref("person.mira", "person")],
    authorityRefs: [mandateRef],
    orgId,
    sourceCapability: "stewardship",
    payload: {
      holderRefId: "person.mira",
      resourceRefId: resourceRef.id,
      decisionRefId: decisionRef.id,
      permissions: ["shelter"],
      conditions: ["heat emergency"]
    },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "institutionally_certified"
  }
] as const satisfies readonly CanopyEvent[];

const importDryRunResult = {
  importPlanId: "common-credit-fold-in",
  sourceProject: "common-credit",
  sourceTreatment: "folded-source",
  canonicalNamespace: "canopy",
  status: "warn",
  mappingCandidates: [
    {
      source: {
        sourceProject: "common-credit",
        sourceEntity: "need",
        sourceId: "school-need-1"
      },
      canonicalRef: claimRef,
      canonicalType: "claim",
      disposition: "alias",
      confidence: "medium",
      rationale: "Legacy need maps to a canonical claim.",
      requiredRelationships: ["evidence"],
      authorityHints: []
    }
  ],
  warnings: [
    {
      code: "missing-authority-hint",
      severity: "warning",
      message: "Review authority before importing candidate events."
    }
  ],
  prohibitedOutcomes: [],
  candidateEvents: [shellEvents[0]]
} as const satisfies ImportDryRunResult;

function ref(id: string, type: ObjectRef["type"], namespace = "canopy.shell.test"): ObjectRef {
  return {
    id,
    type,
    namespace,
    lifecycleStatus: "active"
  };
}
