import { describe, expect, it } from "vitest";
import {
  allocationAccountingWrapperFixture,
  claimsEvidenceWrapperFixture,
  executeLegacyCapabilityWrapper,
  findUnknownLocalSubtypes,
  governanceAuthorityWrapperFixture,
  mappingForLocalRow,
  readWrapperProjection,
  resourceCareWrapperFixture
} from "./index.js";

describe("legacy capability source wrappers", () => {
  it("runs resource-care rows through canonical mappings, projections, and validation", () => {
    const result = executeLegacyCapabilityWrapper(resourceCareWrapperFixture);
    const resourceMapping = mappingForLocalRow(result, "resource", "resource.north-pasture");
    const useRightMapping = mappingForLocalRow(result, "use right", "use-right.dawn-grazing-window");
    const decisionMapping = mappingForLocalRow(result, "decision", "decision.dawn-grazing-window");

    expect(result.validation.unresolvedRisks).toEqual([]);
    expect(result.validation.status).toBe("pass");
    expect(result.validation.shellLeakage.findings).toEqual([]);
    expect(result.unknownLocalSubtypes).toEqual([]);
    expect(resourceMapping?.canonicalRef).toMatchObject({
      id: "canopy.resource.stewardship.resource.resource-north-pasture",
      type: "resource"
    });
    expect(useRightMapping?.sourcePointer).toMatchObject({
      sourceProject: "stewardship",
      sourceEntity: "use right",
      sourceId: "use-right.dawn-grazing-window"
    });
    expect(result.execution.mappingRecords).toHaveLength(resourceCareWrapperFixture.rows.length);
    expect(result.execution.adapterAuditRecords).toHaveLength(1);

    const resourceRef = resourceMapping?.canonicalRef;
    expect(resourceRef).toBeDefined();
    const objectPage = readWrapperProjection(result, "object-page", resourceRef!);
    const resourceProjection = readWrapperProjection(result, "resource-stewardship", resourceRef!);

    expect(objectPage?.projection).toMatchObject({
      objectRef: resourceRef,
      title: "North Pasture",
      sourceCapabilities: ["stewardship"]
    });
    expect(objectPage?.projection.timelineEvents.map((event) => event.type)).toContain(
      "stewardship.resource.created"
    );
    expect(resourceProjection?.projection).toMatchObject({
      resourceRef,
      title: "North Pasture",
      resourceKind: "grazing and food resilience"
    });
    expect(resourceProjection?.projection.ecologicalContextIds).toEqual([
      "living-system.riparian-corridor"
    ]);
    expect(resourceProjection?.projection.useRights[0]).toMatchObject({
      useRightRef: useRightMapping?.canonicalRef,
      state: "granted",
      holderRefId: "person.kai",
      resourceRef,
      permissions: ["graze.dawn_window"],
      conditions: ["avoid riparian buffer", "log herd count"],
      decisionRefIds: [decisionMapping?.canonicalRef.id]
    });
    expect(resourceProjection?.projection.linkedRefs.decisions.map((ref) => ref.id)).toContain(
      decisionMapping?.canonicalRef.id
    );
  });

  it("runs claims/evidence rows through native claim projections without making AI authoritative", () => {
    const result = executeLegacyCapabilityWrapper(claimsEvidenceWrapperFixture);
    const claimMapping = mappingForLocalRow(result, "claim", "claim.riparian-stress-medium");
    const evidenceMapping = mappingForLocalRow(result, "contribution", "evidence.grower-observation");
    const linkMapping = mappingForLocalRow(result, "evidence link", "link.survey-qualifies-claim");
    const aiMapping = mappingForLocalRow(result, "AI extraction", "ai.riparian-extraction");
    const modelMapping = mappingForLocalRow(result, "model", "model.riparian-parser");

    expect(result.validation.unresolvedRisks).toEqual([]);
    expect(result.validation.status).toBe("pass");
    expect(result.validation.shellLeakage.findings).toEqual([]);
    expect(result.unknownLocalSubtypes).toEqual([]);
    expect(claimMapping?.canonicalRef.type).toBe("claim");
    expect(evidenceMapping?.canonicalRef.type).toBe("evidence");

    const claimRef = claimMapping?.canonicalRef;
    expect(claimRef).toBeDefined();
    const objectPage = readWrapperProjection(result, "object-page", claimRef!);
    const claimEvidence = readWrapperProjection(result, "claim-evidence", {
      id: "projection.claim-evidence",
      type: "source",
      namespace: "canopy.projection-rebuild",
      lifecycleStatus: "active"
    });
    const civicMemory = readWrapperProjection(result, "civic-memory", {
      id: "projection.civic-memory",
      type: "source",
      namespace: "canopy.projection-rebuild",
      lifecycleStatus: "active"
    });
    const claim = claimEvidence?.projection.claims.find(
      (candidate) => candidate.claimRef.id === claimRef!.id
    );

    expect(objectPage?.projection).toMatchObject({
      objectRef: claimRef,
      summary: "Review accepts medium stress with uncertainty.",
      sourceCapabilities: ["claims-evidence"]
    });
    expect(claimEvidence?.projection.counts).toMatchObject({
      claims: 1,
      evidence: 3,
      evidenceLinks: 1,
      reviews: 1,
      aiNonAuthorityIndicators: 2
    });
    expect(claim).toMatchObject({
      claimRef,
      status: "reviewed",
      evidenceRefs: [
        { id: evidenceMapping?.canonicalRef.id },
        { id: linkMapping?.canonicalRef.id }
      ],
      latestReview: {
        disposition: "reviewed"
      }
    });
    expect(claim?.aiNonAuthorityIndicators.map((item) => item.objectRef.id)).toEqual([
      aiMapping?.canonicalRef.id,
      modelMapping?.canonicalRef.id
    ]);
    expect(civicMemory?.projection.replayCheckpoint.projectedEventCount).toBe(
      result.execution.eventRecords.length
    );
  });

  it("runs ICOS governance and authority rows through native authority and decision projections", () => {
    const result = executeLegacyCapabilityWrapper(governanceAuthorityWrapperFixture);
    const issueMapping = mappingForLocalRow(result, "governance item", "issue.water-window");
    const proposalMapping = mappingForLocalRow(result, "governance item", "proposal.water-window");
    const mandateMapping = mappingForLocalRow(result, "mandate", "mandate.water-steward");
    const decisionMapping = mappingForLocalRow(result, "governance item", "decision.water-window");

    expect(result.validation.unresolvedRisks).toEqual([]);
    expect(result.validation.status).toBe("pass");
    expect(result.validation.shellLeakage.findings).toEqual([]);
    expect(result.unknownLocalSubtypes).toEqual([]);
    expect(decisionMapping?.canonicalRef.type).toBe("decision");

    const authority = readWrapperProjection(result, "authority", {
      id: "projection.authority",
      type: "source",
      namespace: "canopy.projection-rebuild",
      lifecycleStatus: "active"
    });
    const decisionPacket = readWrapperProjection(result, "decision-packet", decisionMapping!.canonicalRef);
    const decisionPage = readWrapperProjection(result, "object-page", decisionMapping!.canonicalRef);

    expect(authority?.projection.indicators).toMatchObject({
      status: "ok",
      missingAuthorityEventIds: [],
      uncoveredBindingEventIds: []
    });
    expect(authority?.projection.authorityEvents.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["role", "mandate", "policy", "decision"])
    );
    expect(decisionPacket?.projection).toMatchObject({
      decisionRef: decisionMapping?.canonicalRef,
      outcome: "passed",
      decision: {
        ref: decisionMapping?.canonicalRef,
        outcome: "passed",
        effect: "binding"
      }
    });
    expect(decisionPacket?.projection.issueRefs).toEqual([issueMapping?.canonicalRef]);
    expect(decisionPacket?.projection.proposalRefs).toEqual([proposalMapping?.canonicalRef]);
    expect(decisionPacket?.projection.authorityRefs.map((ref) => ref.id)).toContain(
      mandateMapping?.canonicalRef.id
    );
    expect(decisionPage?.projection.timelineEvents.map((event) => event.type)).toContain(
      "governance.decision.recorded"
    );
  });

  it("runs CommonCredit accounting rows through native ledger events and projections", () => {
    const result = executeLegacyCapabilityWrapper(allocationAccountingWrapperFixture);
    const agreementMapping = mappingForLocalRow(
      result,
      "allocation agreement",
      "agreement.food-distribution"
    );
    const fromAccountMapping = mappingForLocalRow(result, "account", "account.food-hub");
    const toAccountMapping = mappingForLocalRow(result, "account", "account.kai");
    const ledgerEntryMapping = mappingForLocalRow(
      result,
      "transaction",
      "transaction.food-distribution-001"
    );

    expect(result.validation.unresolvedRisks).toEqual([]);
    expect(result.validation.status).toBe("pass");
    expect(result.validation.shellLeakage.findings).toEqual([]);
    expect(result.unknownLocalSubtypes).toEqual([]);
    expect(ledgerEntryMapping?.canonicalRef.type).toBe("ledger-entry");

    const authority = readWrapperProjection(result, "authority", {
      id: "projection.authority",
      type: "source",
      namespace: "canopy.projection-rebuild",
      lifecycleStatus: "active"
    });
    const civicMemory = readWrapperProjection(result, "civic-memory", {
      id: "projection.civic-memory",
      type: "source",
      namespace: "canopy.projection-rebuild",
      lifecycleStatus: "active"
    });
    const ledgerPage = readWrapperProjection(result, "object-page", ledgerEntryMapping!.canonicalRef);

    expect(authority?.projection.indicators).toMatchObject({
      status: "ok",
      missingAuthorityEventIds: [],
      uncoveredBindingEventIds: []
    });
    expect(civicMemory?.projection.replayCheckpoint.projectedEventCount).toBe(
      result.execution.eventRecords.length
    );
    expect(ledgerPage?.projection).toMatchObject({
      objectRef: ledgerEntryMapping?.canonicalRef,
      sourceCapabilities: ["allocation-accounting"]
    });
    expect(ledgerPage?.projection.authorityRefs).toEqual([agreementMapping?.canonicalRef]);
    expect(ledgerPage?.projection.timelineEvents[0]?.type).toBe("accounting.ledger_entry.posted");
    expect(ledgerPage?.projection.timelineEvents[0]?.relatedRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        fromAccountMapping?.canonicalRef.id,
        toAccountMapping?.canonicalRef.id,
        agreementMapping?.canonicalRef.id
      ])
    );
    expect(ledgerPage?.projection.timelineEvents[0]?.summary).toBe("Food hub distribution credit");
  });

  it("reports unknown local subtypes for review before execution", () => {
    const unknowns = findUnknownLocalSubtypes({
      ...resourceCareWrapperFixture,
      rows: [
        ...resourceCareWrapperFixture.rows,
        {
          sourceObject: "ritual calendar",
          id: "ritual.spring-opening",
          name: "Spring opening"
        }
      ]
    });

    expect(unknowns).toEqual([
      {
        sourceProject: "stewardship",
        sourceObject: "ritual calendar",
        sourceId: "ritual.spring-opening",
        reason: "No explicit Phase 6 wrapper mapping exists for this local subtype."
      }
    ]);
  });
});
