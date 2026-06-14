import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendOnlySubjects,
  canonicalMigrationHomes,
  createMigrationHealthReport,
  applyMigrationRunnerPlan,
  canonicalSqlReadinessTables,
  checkMigrationReadiness,
  createCanonicalSqlMigrationArtifact,
  createMigrationRunnerPlan,
  findForbiddenProviderSdkCoupling,
  forbiddenProviderSdkSpecifiers,
  migrationArtifacts,
  providerMigrationTracks,
  requiredMigrationSubjects,
  requiredProviderMigrationTracks,
} from "../src/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const sqlIntent = readFileSync(
  join(packageRoot, "sql", "0000_canonical_homes.sql"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
) as {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
};

describe("database migration manifest", () => {
  it("names every canonical migration home", () => {
    expect(requiredMigrationSubjects).toEqual([
      "objectRefs",
      "canonicalMappings",
      "events",
      "outbox",
      "projectionState",
      "adapterAudit",
      "appendOnlyEnforcement",
    ]);
  });

  it("marks historical fact homes as append-only", () => {
    expect(appendOnlySubjects).toEqual([
      "events",
      "outbox",
      "adapterAudit",
      "appendOnlyEnforcement",
    ]);
  });

  it("keeps provider tracks as provider-free artifacts", () => {
    expect(migrationArtifacts.map((artifact) => artifact.providerTrack)).toEqual(
      [
        "sql",
        "prisma",
        "drizzle",
        "postgres",
        "postgis",
        "pgvector",
        "s3-compatible",
      ],
    );
    expect(canonicalMigrationHomes).toHaveLength(7);
  });

  it("declares provider track readiness without importing provider SDKs", () => {
    expect(providerMigrationTracks.map((track) => track.id)).toEqual(
      requiredProviderMigrationTracks,
    );
    expect(
      providerMigrationTracks.map((track) => track.providerSdkCoupling),
    ).toEqual(providerMigrationTracks.map(() => "forbidden-in-this-package"));
    expect(
      providerMigrationTracks
        .filter((track) => track.status === "ready-for-prototype")
        .map((track) => track.id),
    ).toEqual(["postgres", "postgis", "pgvector"]);
    expect(
      providerMigrationTracks.find((track) => track.id === "s3-compatible")
        ?.status,
    ).toBe("external-provider-intent");
  });

  it("reports migration health for canonical homes and provider tracks", () => {
    expect(createMigrationHealthReport()).toMatchObject({
      status: "pass",
      canonicalHomeCount: 7,
      providerTrackCount: 7,
      issues: [],
    });

    expect(
      createMigrationHealthReport({
        providerTracks: providerMigrationTracks.filter(
          (track) => track.id !== "postgres",
        ),
      }).issues,
    ).toContainEqual({
      code: "missing-provider-track",
      message: "Missing provider migration track postgres.",
    });
  });

  it("guards against provider SDK coupling in the migration package", () => {
    const dependencySpecifiers = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ];

    expect(findForbiddenProviderSdkCoupling(dependencySpecifiers)).toEqual([]);
    expect(
      createMigrationHealthReport({
        dependencySpecifiers: [...dependencySpecifiers, "pg"],
      }).issues,
    ).toContainEqual({
      code: "provider-sdk-coupling",
      message:
        "Provider SDK pg must stay out of @canopy/database-migrations.",
    });
    expect(forbiddenProviderSdkSpecifiers).toContain("@aws-sdk/client-s3");
  });

  it("keeps SQL intent aligned to canonical homes and provider tracks", () => {
    for (const table of [
      "canopy_object_refs",
      "canopy_canonical_mappings",
      "canopy_events",
      "canopy_outbox",
      "canopy_projection_state",
      "canopy_adapter_audit",
      "canopy_provider_track_status",
    ]) {
      expect(sqlIntent).toContain(`CREATE TABLE ${table}`);
    }

    for (const providerTrack of [
      "postgres",
      "postgis",
      "pgvector",
      "s3-compatible",
    ]) {
      expect(sqlIntent).toContain(providerTrack);
    }
  });

  it("keeps append-only invariants visible in SQL intent", () => {
    expect(sqlIntent).toContain("canopy_reject_historical_mutation");
    expect(sqlIntent).toContain("canopy_events_append_only");
    expect(sqlIntent).toContain("canopy_adapter_audit_append_only");
    expect(sqlIntent).toContain("canopy_outbox_acknowledged_append_only");
    expect(sqlIntent).toContain("CREATE INDEX canopy_events_object_ref_recorded_at_idx");
    expect(sqlIntent).toContain("CHECK (status IN");
  });

  it("plans the canonical SQL artifact without splitting trigger bodies", () => {
    const artifact = createCanonicalSqlMigrationArtifact(sqlIntent);
    const plan = createMigrationRunnerPlan(artifact);

    expect(artifact.path).toBe("sql/0000_canonical_homes.sql");
    expect(plan.providerTrack).toBe("postgres");
    expect(plan.readinessTables).toEqual(canonicalSqlReadinessTables);
    expect(plan.statements.some((statement) => statement.includes("RETURNS trigger AS $$"))).toBe(
      true,
    );
    expect(plan.statements.filter((statement) => statement.includes("RAISE EXCEPTION"))).toHaveLength(
      1,
    );
  });

  it("checks migration readiness and returns missing canonical tables", async () => {
    const client = new FakeMigrationClient(["canopy_events"]);

    await expect(checkMigrationReadiness(client)).resolves.toEqual(["canopy_events"]);
  });

  it("applies the canonical migration plan and returns a ready audit", async () => {
    const client = new FakeMigrationClient();
    const plan = createMigrationRunnerPlan(createCanonicalSqlMigrationArtifact(sqlIntent));

    const result = await applyMigrationRunnerPlan(client, plan, {
      now: () => "2026-06-14T00:00:00.000Z",
    });

    expect(result.audit).toMatchObject({
      status: "ready",
      artifactPath: "sql/0000_canonical_homes.sql",
      missingTables: [],
      checkedAt: "2026-06-14T00:00:00.000Z",
    });
    expect(client.executed[0]?.text).toBe("BEGIN");
    expect(client.executed.map((entry) => entry.text)).toContain("COMMIT");
  });

  it("rolls back failed migration application and records failure audit", async () => {
    const client = new FakeMigrationClient([], "CREATE TABLE canopy_events");
    const plan = createMigrationRunnerPlan(createCanonicalSqlMigrationArtifact(sqlIntent));

    const result = await applyMigrationRunnerPlan(client, plan, {
      now: () => "2026-06-14T00:00:00.000Z",
    });

    expect(result.audit.status).toBe("failed");
    expect(result.audit.errors[0]).toContain("migration failed");
    expect(client.executed.map((entry) => entry.text)).toContain("ROLLBACK");
    expect(client.executed.map((entry) => entry.text)).not.toContain("COMMIT");
  });
});

class FakeMigrationClient {
  readonly executed: { readonly text: string; readonly params?: readonly unknown[] }[] = [];

  constructor(
    private readonly missingTables: readonly string[] = [],
    private readonly failOnStatement: string | undefined = undefined,
  ) {}

  async query(text: string, params?: readonly unknown[]): Promise<unknown> {
    this.executed.push(params === undefined ? { text } : { text, params });

    if (this.failOnStatement !== undefined && text.includes(this.failOnStatement)) {
      throw new Error("migration failed");
    }

    if (text === "SELECT to_regclass($1) AS table_name") {
      const tableName = String(params?.[0]);
      return {
        rows: [
          {
            table_name: this.missingTables.includes(tableName) ? null : tableName,
          },
        ],
      };
    }

    return { rows: [] };
  }
}
