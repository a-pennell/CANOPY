import { describe, expect, it } from "vitest";
import { getCanopyWebModel } from "./canopy-data.js";

describe("phase 7 Riverbend/Mill Creek acceptance", () => {
  it("starts from the Mill Creek threshold breach and reaches the food allocation decision", () => {
    const model = getCanopyWebModel({
      routePath: "/objects/threshold/threshold.mill-creek-nitrate"
    });
    const objectPage = model.session.snapshot.surfaces.objectPage;
    const decisionWorkspace = model.workspaces.find((workspace) => workspace.id === "decisions");
    const decisionPacket = decisionWorkspace?.session.snapshot.surfaces.decisionPacket;

    expect(model.selectedObjectRef).toMatchObject({
      type: "threshold",
      id: "threshold.mill-creek-nitrate"
    });
    expect(objectPage?.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "ecology.threshold.breached",
        "model.scenario.created",
        "ecology.guardian.review_requested",
        "ecology.guardian.review_completed",
        "governance.decision.recorded"
      ])
    );
    expect(objectPage?.relatedRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        "claim.school-meal-produce-need",
        "proposal.route-surplus-to-school",
        "guardian-review.mill-creek-food-flow",
        "decision.route-surplus-to-school"
      ])
    );
    expect(decisionPacket?.decisionRef).toMatchObject({
      type: "decision",
      id: "decision.route-surplus-to-school"
    });
    expect(decisionPacket?.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.decision.recorded",
        "stewardship.use_right.granted",
        "accounting.ledger_entry.posted",
        "flow.food.recorded",
        "learning.outcome.recorded"
      ])
    );
  });

  it("hydrates resource, use-right, learning, and federation surfaces from the same Phase 7 stream", () => {
    const model = getCanopyWebModel();
    const resourceWorkspace = model.workspaces.find((workspace) => workspace.id === "resource-care");
    const federationWorkspace = model.workspaces.find((workspace) => workspace.id === "federation");
    const outcomeModel = getCanopyWebModel({
      routePath: "/objects/evidence/outcome.school-meal-produce-gap-closed"
    });

    expect(model.pathway.map((step) => step.label)).toEqual([
      "Observe",
      "Understand",
      "Coordinate",
      "Deliberate",
      "Act",
      "Learn",
      "Federate"
    ]);
    expect(resourceWorkspace?.session.snapshot.surfaces.resourceStewardship).toMatchObject({
      resourceRef: {
        id: "resource.green-acre-surplus-produce"
      }
    });
    expect(
      resourceWorkspace?.session.snapshot.surfaces.resourceStewardship?.useRights.map(
        (right) => right.useRightRef.id
      )
    ).toEqual(expect.arrayContaining(["use-right.school-crop-share"]));
    expect(outcomeModel.session.snapshot.surfaces.objectPage?.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "flow.food.recorded",
        "stewardship.task.completed",
        "learning.outcome.recorded",
        "learning.retrospective.completed"
      ])
    );
    expect(
      federationWorkspace?.session.snapshot.surfaces.federationExportState?.includedObjectRefs.map(
        (ref) => ref.id
      )
    ).toEqual(
      expect.arrayContaining([
        "threshold.mill-creek-nitrate",
        "decision.route-surplus-to-school",
        "use-right.school-crop-share",
        "flow.green-acre-to-northside",
        "outcome.school-meal-produce-gap-closed"
      ])
    );
    expect(model.federationReview?.contentHash).toMatch(/^sha256:/);
  });

  it("surfaces the adaptive objection, redaction summary, and policy version", () => {
    const model = getCanopyWebModel({
      routePath: "/objects/decision/decision.pause-and-revise-food-flow-policy"
    });
    const packet = model.session.snapshot.surfaces.decisionPacket;
    const federationWorkspace = model.workspaces.find((workspace) => workspace.id === "federation");
    const federationState = federationWorkspace?.session.snapshot.surfaces.federationExportState;

    expect(packet?.decisionRef).toMatchObject({
      type: "decision",
      id: "decision.pause-and-revise-food-flow-policy"
    });
    expect(packet?.unresolvedObjectionRefs.map((ref) => ref.id)).toEqual([
      "objection.downstream-school-data-stewardship"
    ]);
    expect(packet?.hasRedactions).toBe(true);
    expect(packet?.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.objection.raised",
        "system.redaction.applied",
        "governance.decision_packet.recorded",
        "governance.policy.versioned"
      ])
    );
    expect(
      packet?.timeline
        .filter((event) => event.type === "governance.policy.versioned")
        .map((event) => event.objectRef.id)
    ).toEqual(["policy.breach-window-food-flow"]);
    expect(federationState?.redactionSummary?.redactionCount).toBeGreaterThan(0);
    expect(federationState?.redactionSummary?.removedFields).toEqual(
      expect.arrayContaining(["payload.schoolContact", "payload.pickupNotes"])
    );
    expect(model.dataStewardshipReview.redactionSummary).toContain("redaction");
    expect(model.federationReview?.redactionSummary).toContain("removed fields");
  });
});
