import { describe, expect, it } from "vitest";
import { executeRiverbendCyberneticSlice } from "./index.js";

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
        "learning.outcome.recorded"
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
        "task"
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
      format: "json"
    });
    expect(preview.contentHash).toMatch(/^sha256:/);
  });
});
