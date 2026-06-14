import { describe, expect, it } from "vitest";
import type {
  CanopyEvent,
  CanonicalMapping,
  ExportedDataStewardshipAgreement,
  ObjectRef
} from "@canopy/contracts-kernel";
import {
  buildFederationExportEnvelopeReadModel,
  buildFederationExportPreview
} from "./index";

const ref = (id: string, type: ObjectRef["type"], namespace = "canopy.test"): ObjectRef => ({
  id,
  type,
  namespace,
  lifecycleStatus: "active"
});

const personRef = ref("person.mira", "person");
const claimRef = ref("claim.water", "claim");
const evidenceRef = ref("evidence.gauge", "evidence");
const policyRef = ref("policy.export", "policy");
const envelopeRef = ref("export.first", "source");
const agreementRef = ref("agreement.data-stewardship.water", "agreement", "canopy.data-stewardship");
const mappingAuthorityRef = ref("mandate.mapping-steward", "mandate");

const mapping = {
  id: "mapping.local-flow",
  localLabel: "flow gauge",
  localType: "legacy_flow",
  localId: "flow-1",
  canonicalType: "evidence",
  canonicalRef: evidenceRef,
  disposition: "alias",
  authorityRefs: [mappingAuthorityRef],
  schemaVersion: 1
} satisfies CanonicalMapping;

const agreement = {
  id: "dsa.water",
  governedRef: claimRef,
  stewardRefs: [personRef],
  visibility: "federation",
  allowedUses: ["watershed planning"],
  prohibitedUses: ["resale"],
  consentRequired: true,
  federationRuleRef: policyRef,
  schemaVersion: 1
} satisfies ExportedDataStewardshipAgreement;

const event = (overrides: Partial<CanopyEvent>): CanopyEvent => ({
  id: "event.default",
  type: "claim.created",
  occurredAt: "2026-06-01T00:00:00.000Z",
  actorRef: personRef,
  objectRef: claimRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "claims-evidence",
  payload: {},
  schemaVersion: 1,
  visibility: "federation",
  ...overrides
});

describe("buildFederationExportPreview", () => {
  it("summarizes included objects, events, schema versions, authority, agreements, mappings, and hash", () => {
    const preview = buildFederationExportPreview([
      event({
        id: "event.claim",
        relatedRefs: [evidenceRef],
        authorityRefs: [policyRef],
        payload: {
          title: "Water evidence claim",
          dataStewardshipAgreementRef: agreementRef,
          dataStewardshipAgreements: [agreement],
          localMappings: [mapping]
        },
        contentHash: "sha256:claim"
      }),
      event({
        id: "event.export",
        type: "federation.export.created",
        occurredAt: "2026-06-02T00:00:00.000Z",
        objectRef: envelopeRef,
        relatedRefs: [claimRef, agreementRef],
        authorityRefs: [policyRef],
        sourceCapability: "federation",
        payload: { format: "jsonl", includes: ["claim", "evidence"] }
      })
    ]);

    expect(preview.eventIds).toEqual(["event.claim", "event.export"]);
    expect(preview.eventTypes).toEqual(["claim.created", "federation.export.created"]);
    expect(preview.includedObjectTypes).toEqual([
      "agreement",
      "claim",
      "evidence",
      "mandate",
      "person",
      "policy",
      "source"
    ]);
    expect(preview.authorityRefs).toEqual([policyRef]);
    expect(preview.dataStewardshipAgreementRefs).toEqual([agreementRef]);
    expect(preview.dataStewardshipAgreements).toEqual([agreement]);
    expect(preview.localMappings).toEqual([mapping]);
    expect(preview.schemaVersions).toEqual([1]);
    expect(preview.contentHash).toBe("sha256:canopy-export:event.claim|event.export");
    expect(preview.federationReadinessWarnings).toEqual([]);
  });

  it("summarizes redactions and warns for missing federation authority and absent mappings", () => {
    const preview = buildFederationExportPreview([
      event({
        id: "event.export",
        type: "federation.export.created",
        objectRef: envelopeRef,
        sourceCapability: "federation",
        schemaVersion: 2
      }),
      event({
        id: "event.redacted",
        type: "evidence.created",
        objectRef: evidenceRef,
        relatedRefs: [agreementRef],
        schemaVersion: 1,
        redaction: {
          isRedactedStub: true,
          originalEventId: "event.evidence.original",
          redactedAt: "2026-06-03T00:00:00.000Z",
          reason: "privacy",
          preservedFields: ["id", "type"],
          removedPayloadKeys: ["preciseLocation"],
          originalContentHash: "sha256:before",
          redactedContentHash: "sha256:after",
          dataStewardshipAgreementRef: agreementRef
        }
      })
    ]);

    expect(preview.redactionSummary).toMatchObject({
      redactionCount: 1,
      redactedEventIds: ["event.evidence.original"],
      stubEventIds: ["event.redacted"],
      reasons: ["privacy"],
      removedFields: ["preciseLocation"],
      contentHashBeforeRedaction: "sha256:before",
      contentHashAfterRedaction: "sha256:after",
      redactedEventsByReason: [{ reason: "privacy", count: 1 }]
    });
    expect(preview.federationReadinessWarnings.map((warning) => warning.code)).toEqual([
      "authority_refs_missing",
      "missing_local_mapping",
      "redaction_stub_only",
      "schema_version_mismatch",
      "stewardship_rule_conflict"
    ]);
  });
});

describe("buildFederationExportEnvelopeReadModel", () => {
  it("builds a practical CanopyExportEnvelope read model from the stream", () => {
    const readModel = buildFederationExportEnvelopeReadModel(
      [
        event({
          id: "event.claim",
          authorityRefs: [policyRef],
          payload: {
            dataStewardshipAgreementRef: agreementRef,
            dataStewardshipAgreements: [agreement],
            canonicalMapping: mapping
          }
        }),
        event({
          id: "event.export",
          type: "federation.export.created",
          occurredAt: "2026-06-02T00:00:00.000Z",
          objectRef: envelopeRef,
          authorityRefs: [policyRef],
          sourceCapability: "federation",
          payload: { format: "jsonl" }
        })
      ],
      {
        envelopeId: "export-envelope.first",
        exportedAt: "2026-06-02T01:00:00.000Z"
      }
    );

    expect(readModel.envelope).toMatchObject({
      id: "export-envelope.first",
      exportedAt: "2026-06-02T01:00:00.000Z",
      exportedByRef: personRef,
      scopeRef: envelopeRef,
      format: "jsonl",
      schemaVersion: 1,
      includes: ["agreement", "claim", "evidence", "mandate", "person", "policy", "source"],
      authorityRefs: [policyRef],
      federationRuleRef: policyRef,
      dataStewardshipAgreements: [agreement],
      localMappings: [mapping],
      contentHash: "sha256:canopy-export:event.claim|event.export"
    });
    expect(readModel.includedEvents.map((includedEvent) => includedEvent.id)).toEqual([
      "event.claim",
      "event.export"
    ]);
  });
});
