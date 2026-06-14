import { describe, expect, it } from "vitest";
import type {
  AdapterAuditRecord,
  CanonicalMappingRecord,
  OutboxRecord,
  ProjectionStateRecord
} from "@canopy/contracts-database";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import {
  CanonicalPersistenceError,
  checkPostgresCanonicalMigrationReadiness,
  createCanonicalSqlExecutionPlan,
  createInMemoryCanonicalPersistence,
  executeCanonicalSqlPlan,
  executeCanonicalSqlPlanWithPostgres
} from "./index.js";

const occurredAt = "2026-06-13T10:00:00.000Z";
const recordedAt = "2026-06-13T10:01:00.000Z";
const claimRef = ref("claim.water", "claim");
const evidenceRef = ref("evidence.sensor", "evidence");
const authorityRef = ref("mandate.water", "mandate");

describe("in-memory canonical persistence runtime", () => {
  it("stores canonical object refs and queries lifecycle/object type filters", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });

    runtime.upsertObjectRef(claimRef);
    runtime.upsertObjectRef({ ...evidenceRef, lifecycleStatus: "redacted" });

    expect(runtime.queryObjectRefs({ objectTypes: ["claim"] }).items.map((record) => record.ref)).toEqual([
      claimRef
    ]);
    expect(runtime.queryObjectRefs({ lifecycleStatuses: ["redacted"] }).items[0]?.objectId).toBe(
      evidenceRef.id
    );
  });

  it("appends immutable events and exposes deterministic event queries", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });
    const event = canopyEvent("event.claim.created", claimRef);

    const first = runtime.appendEvent(event);
    const duplicate = runtime.appendEvent(event);

    expect(duplicate).toBe(first);
    expect(runtime.queryEvents({ relatedRef: evidenceRef }).items.map((record) => record.eventId)).toEqual([
      event.id
    ]);
    expect(runtime.getObjectRef(ref("person.mira", "person"))?.objectId).toBe("person.mira");
    expect(runtime.counts()).toMatchObject({ objectRefs: 4, events: 1 });
    expect(() =>
      runtime.appendEvent({ ...event, payload: { title: "Changed in place" } })
    ).toThrow(CanonicalPersistenceError);
  });

  it("stores mappings, outbox records, projection state, and adapter audit records", () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });

    runtime.putMapping(mappingRecord());
    runtime.putOutbox(outboxRecord());
    runtime.putProjectionState(projectionState());
    runtime.putAdapterAudit(adapterAudit());

    expect(runtime.getMapping("mapping.water")?.canonicalRef).toEqual(claimRef);
    expect(runtime.getOutbox("outbox.claim")?.status).toBe("pending");
    expect(runtime.getProjectionState("projection-state.civic-memory")?.status).toBe("current");
    expect(runtime.listAdapterAudits().map((record) => record.operation)).toEqual([
      "appendEvent"
    ]);
    expect(runtime.listRecords()).toHaveLength(4);
  });

  it("plans canonical records as executable Postgres statements in causal order", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });

    runtime.appendEvent(canopyEvent("event.claim.created", claimRef));
    runtime.putMapping(mappingRecord());
    runtime.putOutbox(outboxRecord());
    runtime.putProjectionState(projectionState());
    runtime.putAdapterAudit(adapterAudit());

    const plan = createCanonicalSqlExecutionPlan(runtime.listRecords());
    const executed: string[] = [];

    await executeCanonicalSqlPlan(
      {
        execute: async (statement) => {
          executed.push(`${statement.tableName}:${statement.recordId}`);
          expect(statement.text).toContain(`INSERT INTO ${statement.tableName}`);
          expect(statement.params.length).toBeGreaterThan(0);
        }
      },
      plan
    );

    expect(plan.migrationArtifact).toBe(
      "packages/database/migrations/sql/0000_canonical_homes.sql"
    );
    expect(plan.appendOnlyTables).toEqual([
      "canopy_events",
      "canopy_outbox",
      "canopy_adapter_audit"
    ]);
    expect(plan.statements.map((statement) => statement.tableName)).toEqual([
      "canopy_object_refs",
      "canopy_object_refs",
      "canopy_object_refs",
      "canopy_object_refs",
      "canopy_canonical_mappings",
      "canopy_events",
      "canopy_outbox",
      "canopy_projection_state",
      "canopy_adapter_audit"
    ]);
    expect(
      plan.statements
        .filter((statement) => statement.appendOnly)
        .map((statement) => statement.tableName)
    ).toEqual(["canopy_events", "canopy_outbox", "canopy_adapter_audit"]);
    expect(executed.at(-1)).toBe("canopy_adapter_audit:adapter-audit.append");
  });

  it("checks Postgres migration readiness before executing canonical SQL", async () => {
    const missingClient = new FakePostgresClient(["canopy_events"]);

    const readiness = await checkPostgresCanonicalMigrationReadiness(missingClient);

    expect(readiness.status).toBe("missing");
    expect(readiness.missingTables).toContain("canopy_events");
    await expect(
      executeCanonicalSqlPlanWithPostgres(
        missingClient,
        createCanonicalSqlExecutionPlan([]),
        { requireMigrationReady: true }
      )
    ).rejects.toMatchObject({
      code: "record-not-found"
    });
  });

  it("executes canonical SQL in a transaction and normalizes append-only failures", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });
    runtime.appendEvent(canopyEvent("event.claim.created", claimRef));
    runtime.putOutbox(outboxRecord());

    const plan = createCanonicalSqlExecutionPlan(runtime.listRecords());
    const client = new FakePostgresClient([], {
      failOnTable: "canopy_events",
      error: Object.assign(new Error("Canopy historical facts are append-only"), {
        code: "P0001",
        routine: "canopy_reject_historical_mutation"
      })
    });

    await expect(executeCanonicalSqlPlanWithPostgres(client, plan)).rejects.toMatchObject({
      code: "append-only-violation"
    });
    expect(client.executed.map((entry) => entry.text)).toContain("BEGIN");
    expect(client.executed.map((entry) => entry.text)).toContain("ROLLBACK");
    expect(client.executed.map((entry) => entry.text)).not.toContain("COMMIT");
  });

  it("executes a ready Postgres canonical SQL plan through commit", async () => {
    const runtime = createInMemoryCanonicalPersistence({ now: () => recordedAt });
    runtime.appendEvent(canopyEvent("event.claim.created", claimRef));
    runtime.putOutbox(outboxRecord());

    const client = new FakePostgresClient();
    const plan = createCanonicalSqlExecutionPlan(runtime.listRecords());

    await executeCanonicalSqlPlanWithPostgres(client, plan);

    expect(client.executed.map((entry) => entry.text).at(-1)).toBe("COMMIT");
    expect(
      client.executed
        .filter((entry) => entry.text.startsWith("INSERT INTO"))
        .map((entry) => entry.text.match(/^INSERT INTO ([^(]+)/)?.[1])
    ).toEqual([
      "canopy_object_refs ",
      "canopy_object_refs ",
      "canopy_object_refs ",
      "canopy_object_refs ",
      "canopy_events ",
      "canopy_outbox "
    ]);
  });
});

class FakePostgresClient {
  readonly executed: { readonly text: string; readonly params?: readonly unknown[] }[] = [];

  constructor(
    private readonly missingTables: readonly string[] = [],
    private readonly failure: {
      readonly failOnTable: string;
      readonly error: Error;
    } | undefined = undefined
  ) {}

  async query(text: string, params?: readonly unknown[]): Promise<unknown> {
    this.executed.push(params === undefined ? { text } : { text, params });

    if (text === "SELECT to_regclass($1) AS table_name") {
      const tableName = String(params?.[0]);
      return {
        rows: [
          {
            table_name: this.missingTables.includes(tableName) ? null : tableName
          }
        ]
      };
    }

    if (
      this.failure !== undefined &&
      text.startsWith(`INSERT INTO ${this.failure.failOnTable}`)
    ) {
      throw this.failure.error;
    }

    return { rows: [] };
  }
}

function canopyEvent(id: string, objectRef: ObjectRef): CanopyEvent {
  return {
    id,
    type: "claim.created",
    occurredAt,
    actorRef: ref("person.mira", "person"),
    objectRef,
    relatedRefs: [evidenceRef],
    authorityRefs: [authorityRef],
    orgId: "org.riverbend",
    sourceCapability: "claims-evidence",
    payload: { title: "Water quality claim" },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "testimony_derived"
  };
}

function mappingRecord(): CanonicalMappingRecord {
  return {
    id: "mapping.water",
    kind: "canonical-mapping",
    schemaVersion: 1,
    createdAt: recordedAt,
    source: {
      sourceProject: "common-credit",
      sourceEntity: "claim",
      sourceId: "legacy-claim"
    },
    canonicalRef: claimRef,
    canonicalType: "claim",
    disposition: "alias",
    status: "approved",
    authorityRefs: [authorityRef],
    evidenceRefs: [evidenceRef]
  };
}

function outboxRecord(): OutboxRecord {
  return {
    id: "outbox.claim",
    kind: "outbox",
    schemaVersion: 1,
    createdAt: recordedAt,
    eventId: "event.claim.created",
    eventType: "claim.created",
    destination: { kind: "projection", name: "civic-memory" },
    status: "pending",
    payload: { eventId: "event.claim.created" },
    attemptCount: 0
  };
}

function projectionState(): ProjectionStateRecord {
  return {
    id: "projection-state.civic-memory",
    kind: "projection-state",
    schemaVersion: 1,
    createdAt: recordedAt,
    projectionName: "civic-memory",
    projectionVersion: "0.0.0",
    status: "current",
    checkpoint: { eventId: "event.claim.created", processedAt: recordedAt, sequence: 1 },
    processedEventCount: 1,
    rebuiltAt: recordedAt
  };
}

function adapterAudit(): AdapterAuditRecord {
  return {
    id: "adapter-audit.append",
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: recordedAt,
    adapterName: "in-memory-event-store",
    direction: "ingress",
    operation: "appendEvent",
    status: "succeeded",
    startedAt: recordedAt,
    completedAt: recordedAt,
    eventIds: ["event.claim.created"],
    outboxIds: [],
    warnings: [],
    errors: [],
    metadata: { package: "database-runtime" }
  };
}

function ref(id: string, type: ObjectRef["type"]): ObjectRef {
  return {
    id,
    type,
    namespace: "canopy.database.runtime.test",
    lifecycleStatus: "active"
  };
}
