import { describe, expect, it } from "vitest";
import type { CanonicalObjectSnapshot } from "@canopy/contracts-adapters";
import type { ObjectRef } from "@canopy/contracts-kernel";
import { createPostgresPersistenceAdapter } from "./index.js";

const authorityRef: ObjectRef = {
  id: "mandate.persistence-test",
  type: "mandate",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const resourceRef: ObjectRef = {
  id: "resource.water-commons",
  type: "resource",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

function snapshot(
  payload: Readonly<Record<string, unknown>> = { name: "Water Commons" },
  updatedAt = "2026-06-13T10:00:00.000Z"
): CanonicalObjectSnapshot {
  return {
    ref: resourceRef,
    objectType: "resource",
    payload,
    schemaVersion: 1,
    updatedAt
  };
}

describe("PostgresPersistenceAdapter prototype", () => {
  it("round trips canonical object snapshots through postgres-shaped rows", async () => {
    const adapter = createPostgresPersistenceAdapter({
      now: () => "2026-06-13T10:00:00.000Z"
    });

    const written = await adapter.writeObject({
      snapshot: snapshot(),
      authorityRefs: [authorityRef],
      idempotencyKey: "write.resource.water-commons"
    });

    expect(written.ok).toBe(true);
    expect(written.value).toEqual(snapshot());
    expect(adapter.snapshotTables().objectSnapshots).toHaveLength(1);
    expect(adapter.snapshotTables().objectSnapshots[0]?.refKey).toBe(
      "canopy.test:resource:resource.water-commons"
    );
    expect(adapter.snapshotTables().objectRefs.map((record) => record.ref.id).sort()).toEqual([
      "mandate.persistence-test",
      "resource.water-commons"
    ]);
    expect(adapter.snapshotTables().projectionStates[0]).toMatchObject({
      projectionName: "postgres-persistence.object-snapshots",
      status: "current",
      checkpoint: { cursor: "1", sequence: 1 }
    });
    expect(adapter.snapshotTables().adapterAudits.map((record) => record.status)).toEqual([
      "succeeded"
    ]);

    const read = await adapter.readObject(resourceRef);

    expect(read.ok).toBe(true);
    expect(read.value).toEqual(snapshot());
    expect(read.value).not.toBe(written.value);
  });

  it("queries objects by type, lifecycle, updated time, and page", async () => {
    const adapter = createPostgresPersistenceAdapter();
    const retiredRef: ObjectRef = {
      id: "resource.retired",
      type: "resource",
      namespace: "canopy.test",
      lifecycleStatus: "retired"
    };

    await adapter.writeObject({
      snapshot: snapshot({ name: "A" }, "2026-06-13T09:00:00.000Z"),
      authorityRefs: [authorityRef]
    });
    await adapter.writeObject({
      snapshot: {
        ref: retiredRef,
        objectType: "resource",
        payload: { name: "B" },
        schemaVersion: 1,
        updatedAt: "2026-06-13T11:00:00.000Z"
      },
      authorityRefs: [authorityRef]
    });

    const page = await adapter.queryObjects({
      objectTypes: ["resource"],
      scopeRefs: [authorityRef],
      lifecycleStatuses: ["retired"],
      updatedAfter: "2026-06-13T10:00:00.000Z",
      page: { limit: 1 }
    });

    expect(page.ok).toBe(true);
    expect(page.value?.items.map((item) => item.ref.id)).toEqual(["resource.retired"]);
    expect(page.value?.hasMore).toBe(false);
  });

  it("requires authority and enforces optimistic object revisions", async () => {
    const adapter = createPostgresPersistenceAdapter();

    const forbidden = await adapter.writeObject({
      snapshot: snapshot(),
      authorityRefs: []
    });

    expect(forbidden.ok).toBe(false);
    expect(forbidden.errors[0]?.code).toBe("forbidden");

    await adapter.writeObject({
      snapshot: snapshot(),
      authorityRefs: [authorityRef]
    });

    const conflict = await adapter.writeObject({
      snapshot: snapshot({ name: "Changed" }),
      authorityRefs: [authorityRef],
      expectedVersion: 99
    });

    expect(conflict.ok).toBe(false);
    expect(conflict.errors[0]?.code).toBe("conflict");

    const typeMismatch = await adapter.writeObject({
      snapshot: {
        ...snapshot(),
        objectType: "claim"
      },
      authorityRefs: [authorityRef]
    });

    expect(typeMismatch.ok).toBe(false);
    expect(typeMismatch.errors[0]?.code).toBe("validation_failed");

    const updated = await adapter.writeObject({
      snapshot: snapshot({ name: "Changed" }),
      authorityRefs: [authorityRef],
      expectedVersion: 1
    });

    expect(updated.ok).toBe(true);
    expect(adapter.snapshotTables().objectSnapshots[0]?.revision).toBe(2);
    expect(adapter.snapshotTables().adapterAudits.map((record) => record.status)).toEqual([
      "failed",
      "succeeded",
      "failed",
      "failed",
      "succeeded"
    ]);
  });

  it("treats idempotency keys as durable postgres uniqueness rows", async () => {
    const adapter = createPostgresPersistenceAdapter();

    const first = await adapter.writeObject({
      snapshot: snapshot(),
      authorityRefs: [authorityRef],
      idempotencyKey: "write.once"
    });
    const replay = await adapter.writeObject({
      snapshot: snapshot(),
      authorityRefs: [authorityRef],
      idempotencyKey: "write.once"
    });
    const changedPayload = await adapter.writeObject({
      snapshot: snapshot({ name: "Different payload" }),
      authorityRefs: [authorityRef],
      idempotencyKey: "write.once"
    });

    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(true);
    expect(changedPayload.ok).toBe(false);
    expect(changedPayload.errors[0]?.code).toBe("conflict");
    expect(adapter.snapshotTables().idempotencyKeys).toEqual([
      {
        idempotencyKey: "write.once",
        refKey: "canopy.test:resource:resource.water-commons",
        requestHash: expect.any(String)
      }
    ]);
    expect(adapter.snapshotTables().objectSnapshots).toHaveLength(1);
  });

  it("wraps work in authority-carrying transaction contexts", async () => {
    const adapter = createPostgresPersistenceAdapter({
      now: () => "2026-06-13T12:00:00.000Z"
    });

    const result = await adapter.withTransaction([authorityRef], async (transaction) => {
      expect(transaction.id).toBe("postgres.transaction.1");
      expect(transaction.startedAt).toBe("2026-06-13T12:00:00.000Z");
      expect(transaction.authorityRefs).toEqual([authorityRef]);
      return "committed";
    });

    expect(result).toEqual({ ok: true, value: "committed", errors: [] });

    const failed = await adapter.withTransaction([authorityRef], async () => {
      throw new Error("rollback this unit");
    });

    expect(failed.ok).toBe(false);
    expect(failed.errors[0]?.code).toBe("transaction_failed");
    expect(failed.errors[0]?.retryable).toBe(true);
  });
});
