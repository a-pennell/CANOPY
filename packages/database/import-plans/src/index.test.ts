import { describe, expect, it } from "vitest";
import {
  dryRunSampleExportBundle,
  foldedSourceSampleExportBundles,
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

  it("accepts representative folded-source records without leaking provider-shaped canonical types", () => {
    const commonCredit = dryRunCommonCreditImport(
      freezeRecords([
        {
          sourceObject: "member",
          id: "cc-member-kai",
          name: "Kai Chen",
          memberKind: "person",
          state: "active",
        },
        {
          sourceObject: "account",
          id: "cc-account-food-hub",
          owner: "cc-member-kai",
          kind: "reserve",
          authorityRef: "agreement-food-hub-distribution",
          balance: 0,
        },
        {
          sourceObject: "allocation agreement",
          id: "agreement-food-hub-distribution",
          participants: "food hub, watershed commons",
          scope: "dawn irrigation distribution",
          status: "active",
          decisionRef: "decision-irrigation-window",
        },
        {
          sourceObject: "transaction",
          id: "cc-tx-food-hub-1",
          from: "cc-account-food-hub",
          to: "cc-account-commons",
          amount: 320,
          postedAt: "2026-01-16T09:00:00.000Z",
          posted_at: "2026-01-16T09:00:00.000Z",
          status: "posted",
          agreementRef: "agreement-food-hub-distribution",
        },
      ]),
    );
    const icos = dryRunIcosImport(
      freezeRecords([
        {
          sourceObject: "actor",
          id: "icos-council",
          actorKind: "organization",
          actor_kind: "organization",
          name: "Riverbend Council",
        },
        {
          sourceObject: "role assignment",
          id: "role-steward-2026",
          assignee: "person.mira",
          role: "watershed steward",
          status: "active",
          policyRef: "policy-drought-protocol-v2",
        },
        {
          sourceObject: "mandate",
          id: "mandate-irrigation-window",
          holder: "person.mira",
          scope: "drought irrigation windows",
          status: "active",
          decisionRef: "decision-irrigation-window",
        },
        {
          sourceObject: "governance item",
          id: "decision-irrigation-window",
          itemType: "decision",
          item_type: "decision",
          title: "Grant dawn irrigation window",
          status: "recorded",
          decisionMethod: "consent",
        },
      ]),
    );
    const sensemaking = dryRunSensemakingImport(
      freezeRecords([
        {
          sourceObject: "source",
          id: "riparian-survey",
          kind: "field survey",
          title: "Riparian survey",
          contentHash: "sha256:riparian-survey",
        },
        {
          sourceObject: "claim",
          id: "riparian-stress",
          statement: "The south canal corridor shows medium stress.",
          status: "contested",
          confidence: "medium",
        },
        {
          sourceObject: "evidence link",
          id: "survey-qualifies-claim",
          claim: "riparian-stress",
          source: "riparian-survey",
          relation: "qualifies",
        },
        {
          sourceObject: "model",
          id: "riparian-scenario",
          modelKind: "scenario",
          model_kind: "scenario",
          title: "Dawn window evaporation scenario",
          status: "reviewed",
          outputs: ["riparian-risk"],
          outputClassification: "model_derived",
        },
      ]),
    );
    const stewardship = dryRunStewardshipImport(
      freezeRecords([
        {
          sourceObject: "place",
          id: "south-canal",
          name: "South canal",
          placeKind: "canal reach",
          place_kind: "canal reach",
          boundary: "generalized reach",
        },
        {
          sourceObject: "living system",
          id: "riparian-corridor",
          name: "Riparian corridor",
          livingSystemKind: "riparian corridor",
          living_system_kind: "riparian corridor",
          boundary: "generalized reach",
          sensitivity: "protected",
          locationTreatment: "generalized",
        },
        {
          sourceObject: "resource",
          id: "irrigation-gate",
          name: "South canal irrigation gate",
          resourceKind: "irrigation gate",
          resource_kind: "irrigation gate",
          location: "south-canal",
        },
        {
          sourceObject: "use right",
          id: "dawn-window",
          holder: "cc-member-kai",
          resource: "irrigation-gate",
          permission: "open_gate.dawn_window",
          state: "active",
          mandateRef: "mandate-irrigation-window",
        },
      ]),
    );
    const results = [commonCredit, icos, sensemaking, stewardship];

    expect(results.map((result) => result.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass",
    ]);
    expect(results.flatMap((result) => result.prohibitedOutcomes)).toEqual([]);
    expect(results.flatMap((result) => result.warnings)).toEqual([]);
    expect(
      results.flatMap((result) =>
        result.mappingCandidates.map((candidate) => candidate.canonicalType),
      ),
    ).toEqual([
      "person",
      "ledger-account",
      "agreement",
      "ledger-entry",
      "organization",
      "role",
      "mandate",
      "decision",
      "source",
      "claim",
      "evidence",
      "model",
      "place",
      "living-system",
      "resource",
      "use-right",
    ]);
    expect(
      results.flatMap((result) =>
        result.candidateEvents.map((event) => event.payload.sourceProject),
      ),
    ).toEqual([
      "common-credit",
      "common-credit",
      "common-credit",
      "common-credit",
      "icos",
      "icos",
      "icos",
      "icos",
      "sensemaking",
      "sensemaking",
      "sensemaking",
      "sensemaking",
      "stewardship",
      "stewardship",
      "stewardship",
      "stewardship",
    ]);
    expect(
      commonCredit.candidateEvents.find(
        (event) => event.type === "accounting.ledger_entry.posted",
      )?.payload.legacyRecord,
    ).toMatchObject({
      agreementRef: "agreement-food-hub-distribution",
    });
    expect(
      sensemaking.candidateEvents.find((event) => event.type === "model.created")?.payload,
    ).toMatchObject({
      preservesUncertainty: true,
    });
  });

  it("dry-runs realistic source export bundles into canonical mapping candidates", () => {
    const results = foldedSourceSampleExportBundles.map((bundle) => ({
      bundle,
      result: dryRunSampleExportBundle(bundle),
    }));

    expect(results.map(({ result }) => result.status)).toEqual([
      "pass",
      "pass",
      "pass",
      "pass",
    ]);
    expect(results.map(({ bundle, result }) => [bundle.sourceProject, result.sourceProject])).toEqual([
      ["common-credit", "common-credit"],
      ["icos", "icos"],
      ["sensemaking", "sensemaking"],
      ["stewardship", "stewardship"],
    ]);
    expect(
      results.flatMap(({ bundle }) =>
        bundle.files.map((item) => [bundle.sourceProject, item.path, item.contentHash]),
      ),
    ).toEqual([
      ["common-credit", "exports/common-credit/members.json", "sha256:sample-common-credit-members"],
      ["common-credit", "exports/common-credit/accounts.json", "sha256:sample-common-credit-accounts"],
      ["common-credit", "exports/common-credit/allocation-agreements.json", "sha256:sample-common-credit-agreements"],
      ["common-credit", "exports/common-credit/ledger.jsonl", "sha256:sample-common-credit-ledger"],
      ["icos", "exports/icos/actors.json", "sha256:sample-icos-actors"],
      ["icos", "exports/icos/authority.json", "sha256:sample-icos-authority"],
      ["icos", "exports/icos/governance-items.jsonl", "sha256:sample-icos-governance"],
      ["sensemaking", "exports/sensemaking/sources.json", "sha256:sample-sensemaking-sources"],
      ["sensemaking", "exports/sensemaking/claims.json", "sha256:sample-sensemaking-claims"],
      ["sensemaking", "exports/sensemaking/evidence-links.csv", "sha256:sample-sensemaking-evidence-links"],
      ["sensemaking", "exports/sensemaking/models.json", "sha256:sample-sensemaking-models"],
      ["stewardship", "exports/stewardship/places.json", "sha256:sample-stewardship-places"],
      ["stewardship", "exports/stewardship/living-systems.json", "sha256:sample-stewardship-living-systems"],
      ["stewardship", "exports/stewardship/resources.json", "sha256:sample-stewardship-resources"],
      ["stewardship", "exports/stewardship/use-rights.json", "sha256:sample-stewardship-use-rights"],
      ["stewardship", "exports/stewardship/tasks.jsonl", "sha256:sample-stewardship-tasks"],
    ]);
    expect(results.flatMap(({ result }) => result.warnings)).toEqual([]);
    expect(results.flatMap(({ result }) => result.prohibitedOutcomes)).toEqual([]);
    expect(
      results.flatMap(({ result }) =>
        result.mappingCandidates.map((candidate) => [
          candidate.source.sourceProject,
          candidate.source.sourceEntity,
          candidate.source.sourceId,
          candidate.canonicalType,
          candidate.canonicalRef.namespace,
        ]),
      ),
    ).toEqual([
      ["common-credit", "member", "cc-member-kai", "person", "canopy"],
      ["common-credit", "member", "cc-member-food-hub", "organization", "canopy"],
      ["common-credit", "account", "cc-account-food-hub-reserve", "ledger-account", "canopy"],
      ["common-credit", "allocation agreement", "agreement-food-hub-distribution", "agreement", "canopy"],
      ["common-credit", "transaction", "cc-tx-food-hub-1", "ledger-entry", "canopy"],
      ["common-credit", "transaction", "cc-tx-food-hub-1-correction", "ledger-entry", "canopy"],
      ["icos", "actor", "icos-council-riverbend", "organization", "canopy"],
      ["icos", "role assignment", "role-watershed-steward-2026", "role", "canopy"],
      ["icos", "mandate", "mandate-irrigation-window", "mandate", "canopy"],
      ["icos", "governance item", "issue-irrigation-window", "issue", "canopy"],
      ["icos", "governance item", "proposal-irrigation-window", "proposal", "canopy"],
      ["icos", "governance item", "decision-irrigation-window", "decision", "canopy"],
      ["sensemaking", "source", "source-riparian-survey", "source", "canopy"],
      ["sensemaking", "claim", "claim-riparian-stress", "claim", "canopy"],
      ["sensemaking", "evidence link", "link-survey-qualifies-claim", "evidence", "canopy"],
      ["sensemaking", "model", "model-riparian-scenario", "model", "canopy"],
      ["stewardship", "place", "place-south-canal", "place", "canopy"],
      ["stewardship", "living system", "living-system-riparian-corridor", "living-system", "canopy"],
      ["stewardship", "resource", "resource-irrigation-gate", "resource", "canopy"],
      ["stewardship", "use right", "use-right-irrigation-gate-window", "use-right", "canopy"],
      ["stewardship", "stewardship activity", "task-south-canal-check", "task", "canopy"],
    ]);
    expect(results.flatMap(({ result }) => result.candidateEvents.map((event) => event.type))).toEqual(
      expect.arrayContaining([
        "accounting.ledger_entry.posted",
        "accounting.ledger_entry.reversed",
        "authority.role.assigned",
        "authority.mandate.granted",
        "claim.contested",
        "evidence.source.ingested",
        "ecology.living_system.created",
        "stewardship.use_right.granted",
        "stewardship.task.completed",
      ]),
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
