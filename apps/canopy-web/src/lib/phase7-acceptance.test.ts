import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyDashboard } from "../components/canopy-dashboard.js";
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

  it("surfaces the Phase 8 adaptive trust hardening trail in the web model and dashboard", () => {
    const model = getCanopyWebModel({
      routePath: "/objects/decision/decision.pause-and-revise-food-flow-policy"
    });
    const review = model.trustHardeningReview;
    const dashboardText = collectElementStrings(CanopyDashboard({ model })).join("\n");

    expect(review.phase8EventIds).toEqual(
      expect.arrayContaining([
        "event.governance.appeal.opened.food-flow-pause",
        "event.governance.appeal.reviewed.food-flow-pause",
        "event.stewardship.consent.recorded.school-kitchen-intake",
        "event.stewardship.consent.revoked.school-kitchen-intake",
        "event.stewardship.redaction.requested.consent-revoked-school-kitchen-intake",
        "event.system.redaction.applied.consent-revoked-school-kitchen-intake",
        "event.governance.appeal.remedy_recorded.food-flow-pause",
        "event.governance.appeal.closed.food-flow-pause"
      ])
    );
    expect(review.appealRefs.map((ref) => ref.id)).toEqual([
      "appeal.food-flow-pause-data-stewardship"
    ]);
    expect(review.appealLifecycleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "event.governance.appeal.opened.food-flow-pause",
          eventType: "governance.appeal.opened",
          kind: "appeal",
          state: "under review",
          subjectRef: expect.objectContaining({
            id: "appeal.food-flow-pause-data-stewardship"
          }),
          appealRef: expect.objectContaining({
            id: "appeal.food-flow-pause-data-stewardship"
          }),
          targetRef: expect.objectContaining({
            id: "decision.pause-and-revise-food-flow-policy"
          })
        }),
        expect.objectContaining({
          eventId: "event.governance.appeal.reviewed.food-flow-pause",
          eventType: "governance.appeal.reviewed",
          state: "under review"
        }),
        expect.objectContaining({
          eventId: "event.governance.appeal.remedy_recorded.food-flow-pause",
          eventType: "governance.appeal.remedy_recorded",
          state: "remedied"
        }),
        expect.objectContaining({
          eventId: "event.governance.appeal.closed.food-flow-pause",
          eventType: "governance.appeal.closed",
          state: "upheld"
        })
      ])
    );
    expect(review.conflictRefs.map((ref) => ref.id)).toEqual([
      "conflict.food-flow-pause-data-stewardship"
    ]);
    expect(review.conflictLifecycleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "event.governance.conflict.opened.food-flow-pause",
          eventType: "governance.conflict.opened",
          kind: "conflict",
          state: "open",
          subjectRef: expect.objectContaining({
            id: "conflict.food-flow-pause-data-stewardship"
          })
        }),
        expect.objectContaining({
          eventId: "event.governance.conflict.reviewed.food-flow-pause",
          eventType: "governance.conflict.reviewed",
          state: "in process"
        }),
        expect.objectContaining({
          eventId: "event.governance.conflict.remedy_recorded.food-flow-pause",
          eventType: "governance.conflict.remedy_recorded",
          state: "resolved"
        }),
        expect.objectContaining({
          eventId: "event.governance.conflict.closed.food-flow-pause",
          eventType: "governance.conflict.closed",
          state: "closed"
        })
      ])
    );
    expect(review.contestedOutcomeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "event.governance.appeal.reviewed.food-flow-pause",
          disposition: "under review"
        }),
        expect.objectContaining({
          eventId: "event.governance.appeal.remedy_recorded.food-flow-pause",
          disposition: "remedied"
        }),
        expect.objectContaining({
          eventId: "event.governance.appeal.closed.food-flow-pause",
          disposition: "upheld"
        }),
        expect.objectContaining({
          eventId: "event.governance.conflict.closed.food-flow-pause",
          disposition: "closed"
        })
      ])
    );
    expect(review.consentRecordedRefs.map((ref) => ref.id)).toEqual([
      "agreement.consent.school-kitchen-intake-export"
    ]);
    expect(review.consentRevokedRefs.map((ref) => ref.id)).toEqual([
      "agreement.consent-revocation.school-kitchen-intake-export"
    ]);
    expect(review.redactionReasons).toEqual(
      expect.arrayContaining(["consent_revoked", "vulnerable_group_protection"])
    );
    expect(review.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        "appeal.food-flow-pause-data-stewardship",
        "policy.food-flow-appeal-path",
        "agreement.data-stewardship.riverbend-phase-7"
      ])
    );
    expect(model.session.snapshot.surfaces.civicMemoryStream.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.appeal.opened",
        "stewardship.consent.recorded",
        "stewardship.consent.revoked",
        "system.redaction.applied"
      ])
    );
    expect(dashboardText).toContain("Adaptive Trust Review");
    expect(dashboardText).toContain("appeal:food-flow-pause-data-stewardship");
    expect(dashboardText).toContain("under review via governance.appeal.opened");
    expect(dashboardText).toContain("remedied via governance.appeal.remedy_recorded");
    expect(dashboardText).toContain("upheld via governance.appeal.closed");
    expect(dashboardText).toContain("Conflict lifecycle");
    expect(dashboardText).toContain("conflict:food-flow-pause-data-stewardship");
    expect(dashboardText).toContain("Contested outcomes");
    expect(dashboardText).toContain("remedied: Consent revocation remedy recorded");
    expect(dashboardText).toContain("Consent revoked");
    expect(dashboardText).toContain("consent_revoked");
  });
});

function collectElementStrings(node: unknown): readonly string[] {
  if (node === undefined || node === null || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectElementStrings);
  }

  if (!isValidElement(node)) {
    return [];
  }

  const props = node.props as Record<string, unknown>;
  const typeName = typeof node.type === "function" ? node.type.name : undefined;
  const rendered =
    typeName !== undefined && renderableComponentNames.has(typeName)
      ? collectElementStrings((node.type as (props: Record<string, unknown>) => unknown)(props))
      : [];

  return [
    ...["title", "kicker", "label", "value"].flatMap((key) =>
      typeof props[key] === "string" ? [props[key]] : []
    ),
    ...rendered,
    ...collectElementStrings(props.children)
  ];
}

const renderableComponentNames = new Set(["TrustHardeningReview"]);
