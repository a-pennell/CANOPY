import { describe, expect, it } from "vitest";
import { buildCanopyShellSession } from "@canopy/app-shell";
import {
  executeRiverbendCyberneticSlice,
  executeRiverbendTrustHardeningSlice
} from "./index.js";

describe("Phase 8 Riverbend trust and governance hardening", () => {
  it("runs an appeal lifecycle against the adaptive decision without mutating the Phase 7 decision stream", () => {
    const phase7 = executeRiverbendCyberneticSlice();
    const phase8 = executeRiverbendTrustHardeningSlice();
    const appealEvents = phase8.events.filter(
      (event) => event.objectRef.id === phase8.refs.adaptiveAppealRef.id
    );
    const conflictEvents = phase8.events.filter(
      (event) => event.objectRef.id === phase8.refs.adaptiveConflictRef.id
    );
    const adaptiveDecisions = phase8.events.filter(
      (event) =>
        event.type === "governance.decision.recorded" &&
        event.objectRef.id === phase8.refs.adaptiveDecisionRef.id
    );

    expect(phase8.events.slice(0, phase7.events.length).map((event) => event.id)).toEqual(
      phase7.events.map((event) => event.id)
    );
    expect(phase8.phase8EventIds).toEqual([
      "event.governance.appeal.opened.food-flow-pause",
      "event.governance.appeal.reviewed.food-flow-pause",
      "event.governance.conflict.opened.food-flow-pause",
      "event.governance.conflict.reviewed.food-flow-pause",
      "event.stewardship.consent.recorded.school-kitchen-intake",
      "event.stewardship.consent.revoked.school-kitchen-intake",
      "event.stewardship.redaction.requested.consent-revoked-school-kitchen-intake",
      "event.system.redaction.applied.consent-revoked-school-kitchen-intake",
      "event.governance.appeal.remedy_recorded.food-flow-pause",
      "event.governance.conflict.remedy_recorded.food-flow-pause",
      "event.governance.appeal.closed.food-flow-pause",
      "event.governance.conflict.closed.food-flow-pause"
    ]);
    expect(adaptiveDecisions).toHaveLength(1);
    expect(appealEvents.map((event) => event.type)).toEqual([
      "governance.appeal.opened",
      "governance.appeal.reviewed",
      "governance.appeal.remedy_recorded",
      "governance.appeal.closed"
    ]);
    expect(conflictEvents.map((event) => event.type)).toEqual([
      "governance.conflict.opened",
      "governance.conflict.reviewed",
      "governance.conflict.remedy_recorded",
      "governance.conflict.closed"
    ]);
    expect(appealEvents[0]?.relatedRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        phase8.refs.adaptiveDecisionRef.id,
        phase8.refs.evidenceRef.id,
        phase8.refs.redactionRef.id
      ])
    );
    expect(appealEvents.at(-1)?.payload["appeal"]).toMatchObject({
      status: "upheld",
      outcome: "Appeal upheld after remedy preserved the decision and strengthened redaction continuity.",
      closedAt: "2026-06-14T12:00:00.000Z"
    });
    expect(appealEvents.at(-1)?.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        phase8.refs.appealPathRef.id,
        phase8.refs.dataStewardshipAgreementRef.id
      ])
    );
    expect(conflictEvents.at(-1)?.payload["conflict"]).toMatchObject({
      status: "closed",
      remedyRefs: expect.arrayContaining([
        phase8.refs.adaptiveAppealRef,
        phase8.refs.consentRedactionRef
      ]),
      closedAt: "2026-06-14T12:00:00.000Z"
    });
  });

  it("turns consent revocation into continuity-preserving redaction events", () => {
    const phase8 = executeRiverbendTrustHardeningSlice();
    const consentRecorded = phase8.events.find(
      (event) => event.type === "stewardship.consent.recorded"
    );
    const consentRevoked = phase8.events.find(
      (event) => event.type === "stewardship.consent.revoked"
    );
    const consentRedaction = phase8.events.find(
      (event) =>
        event.id === "event.system.redaction.applied.consent-revoked-school-kitchen-intake"
    );

    expect(consentRecorded?.objectRef).toEqual(phase8.refs.schoolConsentRef);
    expect(consentRevoked?.objectRef).toEqual(phase8.refs.schoolConsentRevocationRef);
    expect(consentRevoked?.payload).toMatchObject({
      supersedesConsentRecordId: phase8.refs.schoolConsentRef.id,
      status: "revoked"
    });
    expect(consentRedaction?.redaction).toMatchObject({
      originalEventId: "event.evidence.created.school-kitchen-intake",
      reason: "consent_revoked",
      removedPayloadKeys: [
        "payload.schoolContact",
        "payload.pickupNotes",
        "payload.deliveryAccessNotes"
      ],
      dataStewardshipAgreementRef: phase8.refs.dataStewardshipAgreementRef
    });
    expect(consentRedaction?.payload).toMatchObject({
      originalEventPreserved: true,
      method: "stub_only"
    });
  });

  it("carries the Phase 8 trust hardening trail into federation export readiness", () => {
    const phase8 = executeRiverbendTrustHardeningSlice();
    const preview = phase8.federationExport.preview;

    expect(preview.eventIds).toEqual(
      expect.arrayContaining([...phase8.phase8EventIds])
    );
    expect(preview.includedObjectTypes).toEqual(
      expect.arrayContaining(["appeal", "agreement", "conflict", "evidence"])
    );
    expect(preview.authorityRefs.map((ref) => ref.id)).toEqual(
      expect.arrayContaining([
        phase8.refs.adaptiveAppealRef.id,
        phase8.refs.appealPathRef.id,
        phase8.refs.dataStewardshipAgreementRef.id
      ])
    );
    expect(preview.includedObjects.map((object) => object.ref.id)).toEqual(
      expect.arrayContaining([phase8.refs.adaptiveConflictRef.id])
    );
    expect(preview.redactionSummary.redactionCount).toBeGreaterThanOrEqual(2);
    expect(preview.redactionSummary.reasons).toEqual(
      expect.arrayContaining(["consent_revoked", "vulnerable_group_protection"])
    );
    expect(preview.redactionSummary.removedFields).toEqual(
      expect.arrayContaining<string>([
        "payload.deliveryAccessNotes",
        "payload.pickupNotes",
        "payload.schoolContact"
      ])
    );
  });

  it("projects the Phase 8 trail into the decision packet proof artifact", () => {
    const phase8 = executeRiverbendTrustHardeningSlice();
    const session = buildCanopyShellSession({
      events: phase8.events,
      scope: {
        label: "Riverbend Foodshed Commons",
        scope: { orgRef: "org.riverbend-foodshed-commons" }
      },
      selectedObjectRef: phase8.refs.adaptiveDecisionRef,
      activeMode: "decisions",
      route: "/decisions"
    });
    const packet = session.snapshot.surfaces.decisionPacket;

    expect(packet?.appealRefs).toEqual([phase8.refs.adaptiveAppealRef]);
    expect(packet?.conflictRefs).toEqual([phase8.refs.adaptiveConflictRef]);
    expect(packet?.objectionRefs).toEqual([phase8.refs.adaptiveObjectionRef]);
    expect(packet?.policyVersionRefs).toEqual([phase8.refs.policyVersionRef]);
    expect(packet?.redactionSummary.reasons).toEqual(
      expect.arrayContaining(["consent_revoked", "vulnerable_group_protection"])
    );
    expect(packet?.redactionSummary.removedFields).toEqual(
      expect.arrayContaining<string>([
        "payload.deliveryAccessNotes",
        "payload.pickupNotes",
        "payload.schoolContact"
      ])
    );
    expect(packet?.redactionSummary.continuityEventIds).toEqual(
      expect.arrayContaining(phase8.phase8EventIds.filter((eventId) => eventId.includes("redaction.applied")))
    );
    expect(packet?.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "governance.appeal.opened",
        "governance.appeal.reviewed",
        "governance.appeal.remedy_recorded",
        "governance.appeal.closed",
        "governance.conflict.opened",
        "governance.conflict.reviewed",
        "governance.conflict.remedy_recorded",
        "governance.conflict.closed"
      ])
    );
  });
});
