import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { CanopyPage } from "../app/canopy-page.js";
import { CanopyDashboard } from "../components/canopy-dashboard.js";
import { CitizenShell } from "../components/citizen-shell.js";
import { buildCitizenCanopyModel, type CitizenCanopyModel } from "./citizen-data.js";

describe("Phase 11 citizen surface acceptance", () => {
  it("exposes My Contexts with roles, levels, authority, data posture, and attention", () => {
    const model = buildCitizenCanopyModel();

    expect(model.contexts.map((context) => context.level)).toEqual(
      expect.arrayContaining([
        "neighborhood",
        "organization",
        "commons",
        "living-system",
        "federation",
        "operator"
      ])
    );
    expect(model.contexts).toHaveLength(6);
    expect(model.contexts.every((context) => context.attentionCount > 0)).toBe(true);
    expect(model.contexts.every((context) => context.authoritySummary.length > 0)).toBe(true);
    expect(model.contexts.every((context) => context.dataPosture.length > 0)).toBe(true);
    expect(model.contexts.every((context) => context.relationshipPath.length > 0)).toBe(true);
    expect(model.activeContext).toMatchObject({
      id: "neighborhood.riverbend",
      activeRole: "resident"
    });
  });

  it("changes active role, attention, actions, and relationship path when context changes", () => {
    const neighborhoodModel = buildCitizenCanopyModel({
      activeContextId: "neighborhood.riverbend"
    });
    const schoolModel = buildCitizenCanopyModel({
      activeContextId: "organization.northside-school"
    });

    expect(neighborhoodModel.activeContext.activeRole).toBe("resident");
    expect(schoolModel.activeContext.activeRole).toBe("school steward");
    expect(neighborhoodModel.activeContext.relationshipPath).not.toEqual(
      schoolModel.activeContext.relationshipPath
    );
    expect(neighborhoodModel.activeAttentionItems.map((item) => item.contextId)).toEqual([
      "neighborhood.riverbend"
    ]);
    expect(schoolModel.activeAttentionItems.map((item) => item.contextId)).toEqual([
      "organization.northside-school"
    ]);
    expect(neighborhoodModel.suggestedActions.map((action) => action.id)).toEqual(
      neighborhoodModel.activeContext.suggestedActionIds
    );
    expect(schoolModel.suggestedActions.map((action) => action.id)).toEqual(
      schoolModel.activeContext.suggestedActionIds
    );
  });

  it("renders My Contexts, top attention, and citizen task navigation", () => {
    const model = buildCitizenCanopyModel();
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(shellText).toContain("My Contexts");
    expect(shellText).toContain("Riverbend Neighborhood");
    expect(shellText).toContain("resident");
    expect(shellText).toContain("Top attention");
    expect(shellText).toContain("Review neighborhood food resilience priority");
    expect(shellText).toContain("Home");
    expect(shellText).toContain("Around Me");
    expect(shellText).toContain("Needs & Offers");
    expect(shellText).toContain("Trust & Data");
  });

  it("routes /citizen to a separate citizen-friendly shell", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen"]
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;

    expect(model.routePath).toBe("/citizen");
    expect(model.surfaceLabel).toBe("Citizen Canopy");
    expect(model.status).toBe("prototype");
    expect(model.primaryAction).toMatchObject({
      label: "Report something",
      route: "/citizen/report"
    });
  });

  it("switches the citizen context from route search params", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen"],
      searchParams: Promise.resolve({ context: "organization.northside-school" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;

    expect(model.activeContext).toMatchObject({
      id: "organization.northside-school",
      activeRole: "school steward"
    });
    expect(model.activeAttentionItems.map((item) => item.contextId)).toEqual([
      "organization.northside-school"
    ]);
  });

  it("builds a plain-language report preview before submission", () => {
    const model = buildCitizenCanopyModel({
      activeContextId: "neighborhood.riverbend"
    });

    expect(model.reportConcernDraft).toMatchObject({
      contextId: "neighborhood.riverbend",
      descriptionPrompt: "What is happening?",
      urgency: "medium",
      visibilityPreference: "commons-visible",
      relatedSuggestions: expect.arrayContaining([
        expect.objectContaining({
          label: "Neighborhood food resilience priority"
        })
      ]),
      preview: {
        reviewOwner: "Riverbend neighborhood reviewers",
        visibilityEffect: "Visible to Riverbend Food Commons participants",
        civicMemoryEffect: "Creates a public concern record for review",
        possibleDecisionPath: "May become a neighborhood decision if reviewers confirm impact"
      }
    });
  });

  it("renders the report something flow with review preview", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "report"],
      searchParams: Promise.resolve({ context: "neighborhood.riverbend" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.routePath).toBe("/citizen/report");
    expect(shellText).toContain("Report something");
    expect(shellText).toContain("What is happening?");
    expect(shellText).toContain("Riverbend Neighborhood");
    expect(shellText).toContain("Urgency");
    expect(shellText).toContain("Visibility");
    expect(shellText).toContain("Related records");
    expect(shellText).toContain("Neighborhood food resilience priority");
    expect(shellText).toContain("Review preview");
    expect(shellText).toContain("Riverbend neighborhood reviewers");
    expect(shellText).toContain("Creates a public concern record for review");
  });

  it("keeps report flow language free of internal implementation terms", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "report"]
    });

    expect(isValidElement(element)).toBe(true);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(shellText).not.toMatch(
      /ObjectRef|projection|outbox|canonical mapping|canonical ref|materialized/i
    );
  });

  it("renders Needs & Offers with unmatched needs, available offers, and match preview", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "needs-offers"],
      searchParams: Promise.resolve({ context: "commons.riverbend-food" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.needsOffers).toMatchObject({
      unmatchedNeeds: expect.arrayContaining([
        expect.objectContaining({
          label: "School kitchen produce gap"
        })
      ]),
      availableOffers: expect.arrayContaining([
        expect.objectContaining({
          label: "Green Acre surplus produce"
        })
      ]),
      matchPreview: {
        timing: "This week",
        eligibility: "School meal program and commons stewardship rules",
        authoritySummary: "Commons steward review with school guardian visibility check",
        dataPosture: "mixed",
        ecologicalConstraints: expect.arrayContaining(["Mill Creek nitrate threshold remains under review"]),
        followThroughStates: ["offer", "match", "commitment", "task", "outcome"]
      }
    });
    expect(shellText).toContain("Needs & Offers");
    expect(shellText).toContain("Unmatched needs");
    expect(shellText).toContain("Available offers");
    expect(shellText).toContain("Match preview");
    expect(shellText).toContain("School kitchen produce gap");
    expect(shellText).toContain("Green Acre surplus produce");
    expect(shellText).toContain("Mill Creek nitrate threshold remains under review");
  });

  it("renders Decisions with question, evidence, objections, and appeal path", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "decisions"],
      searchParams: Promise.resolve({ context: "commons.riverbend-food" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.decisionSummary).toMatchObject({
      question: "Should surplus Green Acre produce be routed to Northside School this week?",
      status: "review",
      options: expect.arrayContaining(["Route surplus to school meals", "Hold for broader neighborhood distribution"]),
      evidenceSummary: expect.arrayContaining(["School meal produce gap confirmed"]),
      unresolvedObjections: expect.arrayContaining(["Downstream school data stewardship needs guardian review"]),
      decisionMethod: "consent with guardian review",
      appealPath: "Affected students, guardians, residents, or stewards can challenge the decision packet"
    });
    expect(shellText).toContain("Decisions");
    expect(shellText).toContain("Should surplus Green Acre produce be routed to Northside School this week?");
    expect(shellText).toContain("School meal produce gap confirmed");
    expect(shellText).toContain("Downstream school data stewardship needs guardian review");
    expect(shellText).toContain("Affected students, guardians, residents, or stewards can challenge the decision packet");
  });

  it("renders challenge and appeal preview with routing, reviewer, visibility, and memory effect", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "decisions"]
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.challengeAppealPreview).toMatchObject({
      label: "Challenge data-sharing details",
      reasons: expect.arrayContaining(["Prove consent revocation", "Keep sensitive school details local"]),
      reviewer: "Guardian and governance review circle",
      routing: "Opens a governance review while preserving the original decision history",
      visibility: "Role-restricted until guardian review clears public summary",
      civicMemoryEffect: "Adds the challenge, remedy, and final outcome to civic memory"
    });
    expect(shellText).toContain("Challenge data-sharing details");
    expect(shellText).toContain("Prove consent revocation");
    expect(shellText).toContain("Guardian and governance review circle");
    expect(shellText).toContain("preserving the original decision history");
  });

  it("renders Trust & Data federation conflict review in plain language", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "trust-data"],
      searchParams: Promise.resolve({ context: "federation.downstream" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.federationConflictReview).toMatchObject({
      localRecordSummary: "Riverbend record says 20 boxes are needed for school meals",
      remoteRecordSummary: "Downstream School Commons says 12 boxes before the next meal cycle",
      peerSource: "Downstream School Commons",
      trustStatus: "warning",
      conflictReason: "same school meal need differs across peers",
      availableActions: expect.arrayContaining(["accept", "reject", "remediate", "merge", "defer", "request-review"]),
      provenanceSummary: "Keeps both local and peer histories visible for reviewer comparison",
      redactionContinuitySummary: "Sensitive school contact and pickup details stay local until guardian review"
    });
    expect(shellText).toContain("Trust & Data");
    expect(shellText).toContain("Review downstream record conflict");
    expect(shellText).toContain("Riverbend record says 20 boxes");
    expect(shellText).toContain("Downstream School Commons says 12 boxes");
    expect(shellText).toContain("request-review");
    expect(shellText).toContain("Sensitive school contact and pickup details stay local");
  });

  it("renders operator release readiness with local acceptance separate from live blockers", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "release-readiness"],
      searchParams: Promise.resolve({ context: "operator.release" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.releaseReadiness).toMatchObject({
      localAcceptanceStatus: "passed",
      liveDeploymentStatus: "blocked",
      providerBlockers: expect.arrayContaining(["Production provider credentials are not connected"]),
      migrationBlockers: expect.arrayContaining(["Live database migration evidence is missing"]),
      environmentBlockers: expect.arrayContaining(["Production environment variables are not verified"]),
      observabilityBlockers: expect.arrayContaining(["Live log drain and alert evidence is missing"]),
      verificationBlockers: expect.arrayContaining(["Post-deploy smoke evidence is missing"])
    });
    expect(shellText).toContain("Release Readiness");
    expect(shellText).toContain("Local acceptance");
    expect(shellText).toContain("passed");
    expect(shellText).toContain("Live deployment");
    expect(shellText).toContain("blocked");
    expect(shellText).toContain("Production provider credentials are not connected");
    expect(shellText).toContain("Post-deploy smoke evidence is missing");
  });

  it("renders public observer mode with redaction explanations and restricted commands unavailable", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "trust-data"],
      searchParams: Promise.resolve({ mode: "public" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.publicObserver).toMatchObject({
      enabled: true,
      visibleRecords: expect.arrayContaining(["Public issues", "Published decisions", "Shared commitments", "Recorded outcomes"]),
      redactionExplanations: expect.arrayContaining([
        "Student contact details are hidden because they are guardian-restricted"
      ]),
      unavailableCommands: expect.arrayContaining(["Submit match", "Resolve federation conflict", "Review release readiness"])
    });
    expect(shellText).toContain("Public observer");
    expect(shellText).toContain("Public issues");
    expect(shellText).toContain("Student contact details are hidden because they are guardian-restricted");
    expect(shellText).toContain("Submit match");
    expect(shellText).toContain("unavailable");
  });

  it("exposes mobile task routes for the short citizen experience", () => {
    const model = buildCitizenCanopyModel();

    expect(model.mobileTaskRoutes).toEqual([
      expect.objectContaining({ label: "Today", route: "/citizen/today" }),
      expect.objectContaining({ label: "My Groups", route: "/citizen/contexts" }),
      expect.objectContaining({ label: "Around Me", route: "/citizen/around" }),
      expect.objectContaining({ label: "Report", route: "/citizen/report" }),
      expect.objectContaining({ label: "Review", route: "/citizen/decisions" }),
      expect.objectContaining({ label: "Search", route: "/citizen/search" })
    ]);
  });

  it("builds route-specific task surfaces for mobile-first citizen routes", async () => {
    const routes = [
      {
        routeSegments: ["citizen", "today"],
        surfaceId: "today",
        expectedText: "What needs attention today"
      },
      {
        routeSegments: ["citizen", "contexts"],
        surfaceId: "contexts",
        expectedText: "Groups and roles"
      },
      {
        routeSegments: ["citizen", "around"],
        surfaceId: "around",
        expectedText: "Near this place"
      },
      {
        routeSegments: ["citizen", "search"],
        surfaceId: "search",
        expectedText: "Find public records"
      }
    ] as const;

    for (const route of routes) {
      const element = await CanopyPage({
        routeSegments: route.routeSegments
      });

      expect(isValidElement(element)).toBe(true);
      expect(element.type).toBe(CitizenShell);

      const model = (element.props as { readonly model: CitizenCanopyModel }).model;
      const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

      expect(model.taskSurface.id).toBe(route.surfaceId);
      expect(model.taskSurface.items.length).toBeGreaterThan(0);
      expect(shellText).toContain(route.expectedText);
      expect(shellText).not.toContain("A separate Phase 11 surface for public, citizen, steward, and operator workflows.");
    }
  });

  it("switches role inside a context and changes authority, data posture, attention, and actions", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "contexts"],
      searchParams: Promise.resolve({
        context: "neighborhood.riverbend",
        role: "neighbor reviewer"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.activeContext).toMatchObject({
      id: "neighborhood.riverbend",
      activeRole: "neighbor reviewer",
      dataPosture: "public",
      authoritySummary: "You can review public neighborhood priorities and recommend next steps."
    });
    expect(model.activeAttentionItems.map((item) => item.role)).toEqual(["neighbor reviewer"]);
    expect(model.suggestedActions.map((action) => action.id)).toEqual([
      "review-neighborhood-priority",
      "open-public-summary"
    ]);
    expect(shellText).toContain("neighbor reviewer");
    expect(shellText).toContain("Open public summary");
  });

  it("models interactive report and match lifecycle states through route params", async () => {
    const reportElement = await CanopyPage({
      routeSegments: ["citizen", "report"],
      searchParams: Promise.resolve({ step: "submitted" })
    });
    const matchElement = await CanopyPage({
      routeSegments: ["citizen", "needs-offers"],
      searchParams: Promise.resolve({
        need: "need.neighborhood-cooling-meals",
        offer: "offer.volunteer-cold-storage",
        step: "confirmed"
      })
    });

    expect(isValidElement(reportElement)).toBe(true);
    expect(isValidElement(matchElement)).toBe(true);

    const reportModel = (reportElement.props as { readonly model: CitizenCanopyModel }).model;
    const matchModel = (matchElement.props as { readonly model: CitizenCanopyModel }).model;
    const reportText = collectElementStrings(CitizenShell({ model: reportModel })).join("\n");
    const matchText = collectElementStrings(CitizenShell({ model: matchModel })).join("\n");

    expect(reportModel.reportConcernDraft.lifecycle).toMatchObject({
      currentStep: "submitted",
      confirmationSummary: "Concern submitted for Riverbend neighborhood reviewers"
    });
    expect(matchModel.needsOffers).toMatchObject({
      selectedNeedId: "need.neighborhood-cooling-meals",
      selectedOfferId: "offer.volunteer-cold-storage",
      lifecycle: {
        currentStep: "confirmed",
        confirmationSummary: "Match confirmed for steward follow-through"
      }
    });
    expect(reportText).toContain("Submitted");
    expect(matchText).toContain("Volunteer cold storage");
    expect(matchText).toContain("Match confirmed for steward follow-through");
  });

  it("provides public observer record detail and blocks release readiness for non-operators", async () => {
    const publicElement = await CanopyPage({
      routeSegments: ["citizen", "trust-data"],
      searchParams: Promise.resolve({
        mode: "public",
        record: "public.decision.school-produce-routing"
      })
    });
    const blockedElement = await CanopyPage({
      routeSegments: ["citizen", "release-readiness"],
      searchParams: Promise.resolve({ context: "neighborhood.riverbend" })
    });

    expect(isValidElement(publicElement)).toBe(true);
    expect(isValidElement(blockedElement)).toBe(true);

    const publicModel = (publicElement.props as { readonly model: CitizenCanopyModel }).model;
    const blockedModel = (blockedElement.props as { readonly model: CitizenCanopyModel }).model;
    const publicText = collectElementStrings(CitizenShell({ model: publicModel })).join("\n");
    const blockedText = collectElementStrings(CitizenShell({ model: blockedModel })).join("\n");

    expect(publicModel.publicObserver.selectedRecord).toMatchObject({
      id: "public.decision.school-produce-routing",
      label: "School produce routing decision",
      visibility: "public-summary",
      redactionExplanation: "Student and pickup details are hidden for guardian review"
    });
    expect(blockedModel.releaseReadinessAccess).toMatchObject({
      allowed: false,
      reason: "Release readiness is limited to operator roles."
    });
    expect(publicText).toContain("School produce routing decision");
    expect(publicText).toContain("Student and pickup details are hidden for guardian review");
    expect(blockedText).toContain("Operator access needed");
    expect(blockedText).not.toContain("Production provider credentials are not connected");
  });

  it("adds federation consequence guidance, recommendation rationale, and precedent links", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "trust-data"],
      searchParams: Promise.resolve({ context: "federation.downstream" })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.federationConflictReview).toMatchObject({
      recommendationRationale:
        "Request review before merging because the peer total changes school meal planning.",
      consequencePreviews: expect.arrayContaining([
        expect.objectContaining({
          action: "merge",
          consequence: "Creates a reconciled public summary while preserving both histories"
        })
      ]),
      precedentLinks: expect.arrayContaining([
        expect.objectContaining({
          label: "Prior school meal reconciliation",
          route: "/citizen/trust-data?precedent=school-meal-reconciliation"
        })
      ])
    });
    expect(shellText).toContain("Recommendation");
    expect(shellText).toContain("Request review before merging");
    expect(shellText).toContain("Creates a reconciled public summary");
    expect(shellText).toContain("Prior school meal reconciliation");
  });

  it("exposes a persisted citizen command center with drafts, submissions, and review queue items", () => {
    const model = buildCitizenCanopyModel();

    expect(model.commandCenter).toMatchObject({
      savedDrafts: expect.arrayContaining([
        expect.objectContaining({
          id: "command.report.riverbend-food-concern",
          status: "draft",
          reviewOwner: "Riverbend neighborhood reviewers"
        })
      ]),
      submittedCommands: expect.arrayContaining([
        expect.objectContaining({
          id: "command.match.school-produce",
          status: "submitted",
          civicMemoryEffect: "Creates a commitment review entry before any task is assigned"
        })
      ]),
      reviewQueue: expect.arrayContaining([
        expect.objectContaining({
          id: "command.federation.downstream-reconciliation",
          status: "needs-review",
          reviewOwner: "Federation conflict reviewers"
        })
      ])
    });
  });

  it("renders a dedicated review queue route with selected command detail", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "review-queue"],
      searchParams: Promise.resolve({
        command: "command.report.riverbend-food-concern"
      })
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.commandCenter.selectedCommand).toMatchObject({
      id: "command.report.riverbend-food-concern",
      label: "Report neighborhood food concern",
      reviewOwner: "Riverbend neighborhood reviewers",
      reviewActionLabel: "Approve for review"
    });
    expect(model.taskSurface.id).toBe("review-queue");
    expect(shellText).toContain("Review queue");
    expect(shellText).toContain("Report neighborhood food concern");
    expect(shellText).toContain("Riverbend neighborhood reviewers");
    expect(shellText).toContain("Approve for review");
    expect(shellText).toContain("Creates a public concern record for review");
  });

  it("surfaces command drafts and review queue work from Today without internal terms", async () => {
    const element = await CanopyPage({
      routeSegments: ["citizen", "today"]
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CitizenShell);

    const model = (element.props as { readonly model: CitizenCanopyModel }).model;
    const shellText = collectElementStrings(CitizenShell({ model })).join("\n");

    expect(model.taskSurface.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "command.report.riverbend-food-concern",
        "command.federation.downstream-reconciliation"
      ])
    );
    expect(shellText).toContain("Saved draft");
    expect(shellText).toContain("Needs review");
    expect(shellText).not.toMatch(
      /ObjectRef|projection|outbox|canonical mapping|canonical ref|materialized/i
    );
  });

  it("keeps existing shell routes on the current dashboard", async () => {
    const element = await CanopyPage({
      routeSegments: ["scope"]
    });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(CanopyDashboard);
  });
});

function collectElementStrings(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElementStrings(child));
  }

  if (isValidElement<{ readonly children?: unknown }>(node)) {
    return collectElementStrings(node.props.children);
  }

  return [];
}
