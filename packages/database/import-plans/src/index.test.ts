import { describe, expect, it } from "vitest";
import {
  dryRunCommonCreditImport,
  dryRunIcosImport,
  dryRunSensemakingImport,
  dryRunStewardshipImport,
} from "./index.js";
import type { ImportDryRunResult, LegacySourceRecord } from "./types.js";

describe("folded source import dry runs", () => {
  it("dry-runs CommonCredit records into canonical accounting candidates", () => {
    const records = freezeRecords([
      {
        sourceObject: "member",
        id: "member-1",
        name: "Mira",
        memberKind: "person",
        state: "active",
      },
      {
        sourceObject: "account",
        id: "account-1",
        owner: "member-1",
        kind: "member",
        authorityRef: "policy-ledger",
        balance: 15,
      },
      {
        sourceObject: "transaction",
        id: "tx-1",
        from: "account-1",
        to: "account-2",
        amount: 5,
        postedAt: "2026-06-13T10:00:00.000Z",
        status: "posted",
      },
    ]);

    const result = dryRunCommonCreditImport(records);

    expect(result.status).toBe("blocked");
    expectCandidateSourceTreatment(result, "common-credit");
    expect(result.mappingCandidates.map((candidate) => candidate.canonicalType)).toEqual([
      "person",
      "ledger-account",
      "ledger-entry",
    ]);
    expect(result.candidateEvents.map((event) => event.type)).toContain(
      "accounting.ledger_entry.posted",
    );
    expect(result.prohibitedOutcomes.map((outcome) => outcome.outcome)).toContain(
      "creating spendable credit from unverified balances",
    );
  });

  it("dry-runs ICOS authority and governance records", () => {
    const records = freezeRecords([
      {
        sourceObject: "actor",
        id: "actor-1",
        actorKind: "organization",
        name: "River Council",
      },
      {
        sourceObject: "role assignment",
        id: "role-1",
        assignee: "actor-1",
        role: "facilitator",
        status: "active",
      },
      {
        sourceObject: "governance item",
        id: "proposal-1",
        itemType: "proposal",
        title: "Open north pasture access",
        status: "open",
      },
    ]);

    const result = dryRunIcosImport(records);

    expect(result.status).toBe("blocked");
    expectCandidateSourceTreatment(result, "icos");
    expect(result.mappingCandidates.map((candidate) => candidate.canonicalType)).toEqual([
      "organization",
      "role",
      "proposal",
    ]);
    expect(result.warnings.map((item) => item.code)).toContain(
      "missing-authority-delegation-chain",
    );
    expect(result.warnings.map((item) => item.code)).toContain("orphaned-governance-item");
  });

  it("dry-runs Sensemaking records while preserving uncertainty", () => {
    const records = freezeRecords([
      {
        sourceObject: "source",
        id: "source-1",
        kind: "dataset",
        title: "Water observations",
        contentHash: "sha256:abc",
      },
      {
        sourceObject: "claim",
        id: "claim-1",
        statement: "The creek is fully restored.",
        status: "fact",
      },
      {
        sourceObject: "evidence link",
        id: "link-1",
        claim: "claim-1",
        source: "source-1",
      },
      {
        sourceObject: "model",
        id: "model-1",
        modelKind: "scenario",
        title: "Runoff model",
        status: "draft",
        outputs: ["restoration-score"],
      },
    ]);

    const result = dryRunSensemakingImport(records);

    expect(result.status).toBe("blocked");
    expectCandidateSourceTreatment(result, "sensemaking");
    expect(result.mappingCandidates.map((candidate) => candidate.canonicalType)).toEqual([
      "source",
      "claim",
      "evidence",
      "model",
    ]);
    expect(result.prohibitedOutcomes.map((outcome) => outcome.outcome)).toContain(
      "turning contested claims into authoritative facts",
    );
    expect(result.warnings.map((item) => item.code)).toContain("model-output-unclassified");
  });

  it("dry-runs Stewardship records with use-right and protected-location safeguards", () => {
    const records = freezeRecords([
      {
        sourceObject: "place",
        id: "place-1",
        name: "North Pasture",
        placeKind: "pasture",
      },
      {
        sourceObject: "resource",
        id: "resource-1",
        name: "Well",
        resourceKind: "water",
        location: "place-1",
      },
      {
        sourceObject: "use right",
        id: "right-1",
        holder: "actor-1",
        resource: "resource-1",
        permission: "withdraw",
        state: "active",
      },
      {
        sourceObject: "living system",
        id: "nesting-zone",
        name: "Nesting Zone",
        livingSystemKind: "habitat",
        boundary: "precise coordinates",
        sensitivity: "protected",
      },
    ]);

    const result = dryRunStewardshipImport(records);

    expect(result.status).toBe("blocked");
    expectCandidateSourceTreatment(result, "stewardship");
    expect(result.mappingCandidates.map((candidate) => candidate.canonicalType)).toEqual([
      "place",
      "resource",
      "use-right",
      "living-system",
    ]);
    expect(result.warnings.map((item) => item.code)).toContain("missing-use-right-authority");
    expect(result.prohibitedOutcomes.map((outcome) => outcome.outcome)).toContain(
      "publicly exposing protected ecological or cultural locations",
    );
  });
});

function expectCandidateSourceTreatment(
  result: ImportDryRunResult,
  sourceProject: ImportDryRunResult["sourceProject"],
): void {
  expect(result.sourceTreatment).toBe("folded-source");
  expect(result.canonicalNamespace).toBe("canopy");
  expect(result.sourceProject).toBe(sourceProject);
  expect(result.mappingCandidates.every((candidate) => candidate.canonicalRef.namespace === "canopy")).toBe(
    true,
  );
  expect(
    result.mappingCandidates.every((candidate) => candidate.source.sourceProject === sourceProject),
  ).toBe(true);
  expect(result.candidateEvents.every((event) => event.systemActor === "importer")).toBe(true);
}

function freezeRecords(
  records: readonly LegacySourceRecord[],
): readonly LegacySourceRecord[] {
  records.forEach((record) => Object.freeze(record));
  return Object.freeze([...records]);
}
