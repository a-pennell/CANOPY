import { describe, expect, it } from "vitest";
import type { CanopyEvent, ConsentRule, ExportRule, ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  DataStewardshipCommandError,
  applyRedaction,
  approveExport,
  recordConsent,
  requestRedaction,
  revokeConsent,
  setVisibilityRule
} from "./index.js";

const occurredAt = "2026-06-13T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.data-stewardship",
  lifecycleStatus: "active"
});

const actorRef = ref("person.mira", "person");
const policyRef = ref("policy.privacy", "policy");
const agreementRef = ref("agreement.dataset", "agreement");
const datasetRef = ref("source.dataset", "source");
const consentRef = ref("agreement.consent.mira", "agreement");
const consentRuleRef = ref("policy.consent.rule", "policy");
const evidenceRef = ref("evidence.consent-form", "evidence");
const redactionRequestRef = ref("issue.redaction-request", "issue");
const redactionRef = ref("evidence.redaction-summary", "evidence");
const exportRef = ref("source.export.2026", "source");
const recipientRef = ref("organization.peer-commons", "organization");

const consentRule: ConsentRule = {
  id: "consent-rule.research",
  status: "required",
  scope: "purpose",
  subjectRef: datasetRef,
  consentingRefs: [actorRef],
  purpose: "commons research",
  allowedUses: ["analyze", "aggregate"],
  revocable: true,
  revocationProcessRef: consentRuleRef,
  evidenceRefs: [evidenceRef]
};

const exportRule: ExportRule = {
  id: "export-rule.peer-commons",
  exportAllowed: true,
  allowedFormats: ["jsonl"],
  allowedObjectTypes: ["source", "evidence"],
  allowedRecipientRefs: [recipientRef],
  prohibitedRecipientRefs: [],
  includeRedactionStubs: true,
  consentRequired: true,
  authorityRefs: [policyRef]
};

const originalEvent: CanopyEvent = {
  id: "event.evidence.created.sensitive",
  type: "evidence.created",
  occurredAt,
  actorRef,
  objectRef: datasetRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "claims-evidence",
  payload: {
    preciseLocation: "hidden place",
    observation: "nesting"
  },
  schemaVersion: 1,
  visibility: "guardian_restricted",
  dataState: "sensitive",
  contentHash: "sha256:before"
};

function services(initialEvents: readonly CanopyEvent[] = []) {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory(initialEvents)
  };
}

describe("data stewardship capability", () => {
  it("sets visibility rules only with authority refs", () => {
    const ctx = services();

    expect(() =>
      setVisibilityRule(ctx, {
        eventId: "event.visibility.denied",
        occurredAt,
        agreementRef,
        governedRef: datasetRef,
        visibility: "private"
      })
    ).toThrow(DataStewardshipCommandError);

    const result = setVisibilityRule(ctx, {
      eventId: "event.visibility.private",
      occurredAt,
      actorRef,
      agreementRef,
      governedRef: datasetRef,
      visibility: "private",
      allowedUses: ["store", "analyze"],
      prohibitedUses: ["publish"],
      consentRequired: true,
      authorityRefs: [policyRef]
    });

    expect(result.append.event).toMatchObject({
      type: "stewardship.data_visibility_rule.set",
      sourceCapability: "data-stewardship",
      visibility: "private",
      objectRef: agreementRef,
      relatedRefs: [datasetRef],
      authorityRefs: [policyRef],
      payload: {
        governedRefId: datasetRef.id,
        visibility: "private",
        allowedUses: ["store", "analyze"],
        prohibitedUses: ["publish"],
        consentRequired: true,
        authorityRefIds: [policyRef.id]
      }
    });
  });

  it("records and revokes consent as separate append-only events", () => {
    const ctx = services();
    const recorded = recordConsent(ctx, {
      eventId: "event.consent.recorded",
      occurredAt,
      actorRef,
      consentRef,
      ruleRef: consentRuleRef,
      rule: consentRule,
      consentingRef: actorRef,
      authorityRefs: [policyRef],
      note: "signed in assembly"
    });
    const revoked = revokeConsent(ctx, {
      eventId: "event.consent.revoked",
      occurredAt: "2026-06-14T12:00:00.000Z",
      actorRef,
      consentRef,
      ruleRef: consentRuleRef,
      consentingRef: actorRef,
      supersedesConsentRecordId: consentRef.id,
      revocationReason: "participant request"
    });

    expect(recorded.append.sequence).toBe(1);
    expect(revoked.append.sequence).toBe(2);
    expect(ctx.memory.getEvent(recorded.append.event.id)).toEqual(recorded.append.event);
    expect(ctx.memory.getEvent(revoked.append.event.id)).toMatchObject({
      type: "stewardship.consent.revoked",
      payload: {
        status: "revoked",
        supersedesConsentRecordId: consentRef.id,
        consentingRefId: actorRef.id
      }
    });
  });

  it("requests redaction without mutating the target event", () => {
    const ctx = services([originalEvent]);
    const before = ctx.memory.getEvent(originalEvent.id);
    const result = requestRedaction(ctx, {
      eventId: "event.redaction.requested",
      occurredAt,
      actorRef,
      requestRef: redactionRequestRef,
      targetRef: datasetRef,
      targetEventId: originalEvent.id,
      reason: "living_system_protection",
      method: "field_removed",
      requestedFields: ["preciseLocation"]
    });

    expect(result.append.event).toMatchObject({
      type: "stewardship.redaction.requested",
      dataState: "sensitive",
      payload: {
        targetEventId: originalEvent.id,
        requestedFields: ["preciseLocation"]
      }
    });
    expect(ctx.memory.getEvent(originalEvent.id)).toEqual(before);
  });

  it("applies redaction with authority and civic memory continuity", () => {
    const ctx = services([originalEvent]);

    expect(() =>
      applyRedaction(ctx, {
        eventId: "event.redaction.applied.denied",
        occurredAt,
        redactionRef,
        originalEventId: originalEvent.id,
        targetRef: datasetRef,
        reason: "living_system_protection",
        method: "field_removed",
        redactedFields: ["preciseLocation"],
        preservedFields: ["id", "type", "occurredAt", "objectRef"]
      })
    ).toThrow(DataStewardshipCommandError);

    const before = ctx.memory.getEvent(originalEvent.id);
    const result = applyRedaction(ctx, {
      eventId: "event.redaction.applied",
      occurredAt,
      actorRef,
      redactionRef,
      originalEventId: originalEvent.id,
      targetRef: datasetRef,
      reason: "living_system_protection",
      method: "field_removed",
      redactedFields: ["preciseLocation"],
      preservedFields: ["id", "type", "occurredAt", "objectRef"],
      redactedContentHash: "sha256:after",
      authorityRefs: [policyRef]
    });

    expect(result.append.event).toMatchObject({
      type: "system.redaction.applied",
      sourceCapability: "data-stewardship",
      authorityRefs: [policyRef],
      payload: {
        originalEventPreserved: true,
        removedPayloadKeys: ["preciseLocation"]
      },
      redaction: {
        originalEventId: originalEvent.id,
        redactionEventId: "event.redaction.applied",
        removedPayloadKeys: ["preciseLocation"],
        originalContentHash: "sha256:before",
        redactedContentHash: "sha256:after"
      }
    });
    expect(ctx.memory.getEvent(originalEvent.id)).toEqual(before);
    expect(ctx.memory.requireRedactionContinuity(originalEvent.id).ok).toBe(true);
  });

  it("approves exports only with authority refs and scoped objects", () => {
    const ctx = services();

    expect(() =>
      approveExport(ctx, {
        eventId: "event.export.denied",
        occurredAt,
        exportRef,
        exportRule,
        recipientRef,
        objectRefs: [datasetRef],
        format: "jsonl"
      })
    ).toThrow(DataStewardshipCommandError);

    const result = approveExport(ctx, {
      eventId: "event.export.approved",
      occurredAt,
      actorRef,
      exportRef,
      exportRule,
      recipientRef,
      objectRefs: [datasetRef],
      format: "jsonl",
      authorityRefs: [policyRef]
    });

    expect(result.append.event).toMatchObject({
      type: "federation.export.approved",
      visibility: "federation",
      sourceCapability: "data-stewardship",
      relatedRefs: [recipientRef, datasetRef],
      authorityRefs: [policyRef],
      payload: {
        recipientRefId: recipientRef.id,
        objectRefIds: [datasetRef.id],
        format: "jsonl",
        includeRedactionStubs: true
      }
    });
  });
});
