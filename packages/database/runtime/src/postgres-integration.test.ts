import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import {
  createCanonicalSqlExecutionPlan,
  createInMemoryCanonicalPersistence,
  executeCanonicalSqlPlanWithPostgres
} from "./index.js";

const databaseUrl = process.env.CANOPY_TEST_DATABASE_URL;
const occurredAt = "2026-06-14T08:00:00.000Z";
const recordedAt = "2026-06-14T08:01:00.000Z";

describe.skipIf(databaseUrl === undefined)("Postgres canonical runtime integration", () => {
  it("executes canonical rows against a migrated Postgres database", async () => {
    if (databaseUrl === undefined) {
      throw new Error("CANOPY_TEST_DATABASE_URL is required for this integration test.");
    }

    const { Client } = await importPostgresClient();
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await client.query("BEGIN");
      await applyMinimalCanonicalSchema(client);

      const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });
      runtime.appendEvent(canopyEvent());
      const plan = createCanonicalSqlExecutionPlan(runtime.listRecords());

      await executeCanonicalSqlPlanWithPostgres(client, plan, {
        requireMigrationReady: true,
        useTransaction: false
      });

      const eventCount = await client.query(
        "SELECT count(*)::int AS count FROM canopy_events WHERE event_ref = $1",
        ["event.integration.claim-created"]
      );
      expect(eventCount.rows[0]?.count).toBe(1);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});

type PostgresClientConstructor = new (options: {
  readonly connectionString?: string;
}) => {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(text: string, params?: readonly unknown[]): Promise<{ readonly rows: readonly any[] }>;
};

async function importPostgresClient(): Promise<{ readonly Client: PostgresClientConstructor }> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string
  ) => Promise<{ readonly Client: PostgresClientConstructor }>;
  return dynamicImport("pg");
}

async function applyMinimalCanonicalSchema(client: {
  query(text: string, params?: readonly unknown[]): Promise<unknown>;
}): Promise<void> {
  await client.query("DROP TABLE IF EXISTS canopy_adapter_audit");
  await client.query("DROP TABLE IF EXISTS canopy_projection_state");
  await client.query("DROP TABLE IF EXISTS canopy_outbox");
  await client.query("DROP TABLE IF EXISTS canopy_events");
  await client.query("DROP TABLE IF EXISTS canopy_canonical_mappings");
  await client.query("DROP TABLE IF EXISTS canopy_object_refs");
  await client.query(`
    CREATE TABLE canopy_object_refs (
      object_ref TEXT PRIMARY KEY,
      object_kind TEXT NOT NULL,
      namespace TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      metadata_text TEXT
    )
  `);
  await client.query(`
    CREATE TABLE canopy_canonical_mappings (
      mapping_ref TEXT PRIMARY KEY,
      source_system TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      object_ref TEXT NOT NULL,
      mapping_kind TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT,
      metadata_text TEXT
    )
  `);
  await client.query(`
    CREATE TABLE canopy_events (
      event_ref TEXT PRIMARY KEY,
      object_ref TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_version INTEGER NOT NULL,
      occurred_at TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      causation_ref TEXT,
      correlation_ref TEXT,
      actor_ref TEXT,
      payload_text TEXT NOT NULL,
      metadata_text TEXT
    )
  `);
  await client.query(`
    CREATE TABLE canopy_outbox (
      outbox_ref TEXT PRIMARY KEY,
      event_ref TEXT NOT NULL,
      destination TEXT NOT NULL,
      message_type TEXT NOT NULL,
      message_text TEXT NOT NULL,
      status TEXT NOT NULL,
      available_at TEXT NOT NULL,
      claimed_at TEXT,
      completed_at TEXT,
      failure_text TEXT,
      metadata_text TEXT
    )
  `);
  await client.query(`
    CREATE TABLE canopy_projection_state (
      projector_ref TEXT PRIMARY KEY,
      projection_name TEXT NOT NULL,
      last_event_ref TEXT,
      last_event_recorded_at TEXT,
      rebuild_ref TEXT,
      checkpoint_text TEXT,
      updated_at TEXT NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE canopy_adapter_audit (
      audit_ref TEXT PRIMARY KEY,
      adapter_ref TEXT NOT NULL,
      operation_kind TEXT NOT NULL,
      object_ref TEXT,
      external_ref TEXT,
      event_ref TEXT,
      occurred_at TEXT NOT NULL,
      evidence_text TEXT NOT NULL,
      metadata_text TEXT
    )
  `);
}

function canopyEvent(): CanopyEvent {
  return {
    id: "event.integration.claim-created",
    type: "claim.created",
    occurredAt,
    actorRef: ref("person.integration", "person"),
    objectRef: ref("claim.integration", "claim"),
    relatedRefs: [ref("evidence.integration", "evidence")],
    authorityRefs: [ref("mandate.integration", "mandate")],
    orgId: "org.integration",
    sourceCapability: "claims-evidence",
    payload: { title: "Integration claim" },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "testimony_derived"
  };
}

function ref(id: string, type: ObjectRef["type"]): ObjectRef {
  return {
    id,
    type,
    namespace: "canopy.database.integration",
    lifecycleStatus: "active"
  };
}
