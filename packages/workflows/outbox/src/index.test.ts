import { describe, expect, it } from "vitest";
import type { JsonValue, OutboxDestination } from "@canopy/contracts-database";
import { createInMemoryCanonicalPersistence } from "@canopy/database-runtime";
import {
  OutboxError,
  createInMemoryOutbox,
  createPersistentOutbox,
  runOutboxWorker,
  type EnqueueOutboxRecordInput
} from "./index.js";

const destination: OutboxDestination = {
  kind: "workflow",
  name: "resource-stewardship"
};

const adapterDestination: OutboxDestination = {
  kind: "adapter",
  name: "mail"
};

const payload: JsonValue = {
  message: "resource changed",
  count: 1
};

const enqueueInput: EnqueueOutboxRecordInput = {
  eventId: "event.resource.updated",
  eventType: "stewardship.resource.updated",
  destination,
  payload,
  createdAt: "2026-06-13T00:00:00.000Z"
};

describe("in-memory outbox", () => {
  it("enqueues provider-neutral outbox records", () => {
    const outbox = createInMemoryOutbox({
      createId: () => "outbox.1"
    });

    const record = outbox.enqueue(enqueueInput);

    expect(record).toMatchObject({
      id: "outbox.1",
      kind: "outbox",
      schemaVersion: 1,
      createdAt: "2026-06-13T00:00:00.000Z",
      eventId: "event.resource.updated",
      eventType: "stewardship.resource.updated",
      destination,
      status: "pending",
      payload,
      attemptCount: 0
    });
  });

  it("deduplicates enqueue calls by dedupe key", () => {
    let nextId = 1;
    const outbox = createInMemoryOutbox({
      createId: () => `outbox.${nextId++}`
    });

    const first = outbox.enqueue({ ...enqueueInput, dedupeKey: "event:destination" });
    const second = outbox.enqueue({ ...enqueueInput, dedupeKey: "event:destination" });

    expect(second).toBe(first);
    expect(outbox.list()).toHaveLength(1);
  });

  it("leases ready records by destination and records attempt metadata", () => {
    let nextId = 1;
    const outbox = createInMemoryOutbox({
      createId: () => `outbox.${nextId++}`
    });
    outbox.enqueue({
      ...enqueueInput,
      nextAttemptAt: "2026-06-13T01:00:00.000Z"
    });
    outbox.enqueue({
      ...enqueueInput,
      destination: adapterDestination
    });
    const ready = outbox.enqueue(enqueueInput);

    const leased = outbox.lease({
      leasedBy: "worker.1",
      limit: 2,
      now: "2026-06-13T00:30:00.000Z",
      leaseDurationMs: 60_000,
      destination
    });

    expect(leased).toHaveLength(1);
    expect(leased[0]).toMatchObject({
      id: ready.id,
      status: "leased",
      leasedBy: "worker.1",
      leasedAt: "2026-06-13T00:30:00.000Z",
      attemptCount: 1
    });
  });

  it("publishes and acknowledges leased records", () => {
    const outbox = createInMemoryOutbox({
      createId: () => "outbox.1"
    });
    const record = outbox.enqueue(enqueueInput);
    outbox.lease({
      leasedBy: "worker.1",
      now: "2026-06-13T00:10:00.000Z"
    });

    const published = outbox.publish(record.id, "2026-06-13T00:11:00.000Z");
    const acknowledged = outbox.acknowledge(
      record.id,
      "2026-06-13T00:12:00.000Z"
    );

    expect(published).toMatchObject({
      status: "published",
      publishedAt: "2026-06-13T00:11:00.000Z"
    });
    expect(acknowledged).toMatchObject({
      status: "acknowledged",
      acknowledgedAt: "2026-06-13T00:12:00.000Z"
    });
  });

  it("fails leased records, retries them, and dead-letters exhausted attempts", () => {
    const outbox = createInMemoryOutbox({
      createId: () => "outbox.1"
    });
    const record = outbox.enqueue({
      ...enqueueInput,
      maxAttempts: 2
    });

    outbox.lease({ leasedBy: "worker.1", now: "2026-06-13T00:00:00.000Z" });
    const failed = outbox.fail(record.id, {
      error: "temporary network fault",
      nextAttemptAt: "2026-06-13T00:05:00.000Z",
      now: "2026-06-13T00:01:00.000Z"
    });
    const retried = outbox.retry(record.id, {
      now: "2026-06-13T00:02:00.000Z"
    });
    outbox.lease({ leasedBy: "worker.2", now: "2026-06-13T00:06:00.000Z" });
    const deadLettered = outbox.fail(record.id, {
      error: "still failing",
      now: "2026-06-13T00:07:00.000Z"
    });

    expect(failed).toMatchObject({
      status: "failed",
      lastError: "temporary network fault",
      nextAttemptAt: "2026-06-13T00:05:00.000Z"
    });
    expect(retried).toMatchObject({
      status: "pending"
    });
    expect(deadLettered).toMatchObject({
      status: "dead-lettered",
      lastError: "still failing",
      attemptCount: 2
    });
  });

  it("cancels active records and rejects invalid transitions", () => {
    const outbox = createInMemoryOutbox({
      createId: () => "outbox.1"
    });
    const record = outbox.enqueue(enqueueInput);

    const cancelled = outbox.cancel(record.id, "2026-06-13T00:30:00.000Z");

    expect(cancelled).toMatchObject({
      status: "cancelled",
      updatedAt: "2026-06-13T00:30:00.000Z"
    });
    expect(() => outbox.publish(record.id)).toThrow(OutboxError);
  });

  it("summarizes reconciliation state", () => {
    let nextId = 1;
    const outbox = createInMemoryOutbox({
      createId: () => `outbox.${nextId++}`
    });
    outbox.enqueue({
      ...enqueueInput,
      nextAttemptAt: "2026-06-13T01:00:00.000Z"
    });
    const leased = outbox.enqueue({ ...enqueueInput, destination: adapterDestination });
    const exhausted = outbox.enqueue({
      ...enqueueInput,
      maxAttempts: 1,
      dedupeKey: "exhausted"
    });
    outbox.lease({
      leasedBy: "worker.1",
      limit: 1,
      now: "2026-06-13T00:00:00.000Z"
    });
    expect(outbox.get(leased.id)?.status).toBe("leased");
    outbox.lease({
      leasedBy: "worker.2",
      limit: 1,
      now: "2026-06-13T00:01:00.000Z"
    });
    outbox.fail(exhausted.id, {
      error: "permanent",
      now: "2026-06-13T00:02:00.000Z"
    });

    const summary = outbox.reconcile({
      now: "2026-06-13T00:30:00.000Z",
      leaseTimeoutMs: 60_000
    });

    expect(summary).toEqual({
      total: 3,
      byStatus: {
        pending: 1,
        leased: 1,
        published: 0,
        acknowledged: 0,
        failed: 0,
        "dead-lettered": 1,
        cancelled: 0
      },
      readyToLease: 0,
      delayed: 1,
      expiredLeases: 1,
      exhaustedFailures: 0,
      dedupeKeys: 1
    });
  });

  it("persists records and transitions through the canonical database runtime", () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T00:00:00.000Z"
    });
    const outbox = createPersistentOutbox({
      runtime,
      createId: () => "outbox.persistent"
    });

    const enqueued = outbox.enqueue(enqueueInput);
    outbox.lease({
      leasedBy: "worker.persistent",
      now: "2026-06-13T00:10:00.000Z"
    });
    const published = outbox.publish(enqueued.id, "2026-06-13T00:11:00.000Z");

    expect(runtime.getOutbox(enqueued.id)).toMatchObject({
      id: enqueued.id,
      status: "published",
      publishedAt: "2026-06-13T00:11:00.000Z"
    });
    expect(published).toEqual(runtime.getOutbox(enqueued.id));

    const restarted = createPersistentOutbox({ runtime });
    const acknowledged = restarted.acknowledge(
      enqueued.id,
      "2026-06-13T00:12:00.000Z"
    );

    expect(acknowledged.status).toBe("acknowledged");
    expect(runtime.listOutbox().map((record) => record.status)).toEqual([
      "acknowledged"
    ]);
  });

  it("dispatches projection rebuild records and writes adapter audit records", async () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T00:00:00.000Z"
    });
    runtime.appendEvent(testEvent, { recordedAt: "2026-06-13T00:00:00.000Z" });
    const outbox = createPersistentOutbox({
      runtime,
      createId: () => "outbox.projection"
    });
    outbox.enqueue({
      eventId: testEvent.id,
      eventType: testEvent.type,
      destination: {
        kind: "workflow",
        name: "projection-rebuild"
      },
      payload: {
        eventId: testEvent.id
      },
      createdAt: "2026-06-13T00:01:00.000Z"
    });

    const result = await runOutboxWorker({
      runtime,
      outbox,
      workerId: "worker.projection",
      now: "2026-06-13T00:02:00.000Z"
    });

    expect(result).toMatchObject({
      workerId: "worker.projection",
      leasedCount: 1,
      acknowledgedCount: 1,
      failedCount: 0
    });
    expect(runtime.listOutbox().map((record) => record.status)).toEqual([
      "acknowledged"
    ]);
    expect(runtime.getProjectionState("projection-state.civic-memory")).toMatchObject({
      processedEventCount: 1,
      rebuiltAt: "2026-06-13T00:02:00.000Z"
    });
    expect(runtime.listAdapterAudits()).toHaveLength(1);
    expect(runtime.listAdapterAudits()[0]).toMatchObject({
      adapterName: "outbox.workflow.projection-rebuild",
      direction: "reconciliation",
      operation: "outbox.dispatch",
      status: "succeeded",
      eventIds: [testEvent.id],
      outboxIds: ["outbox.projection"]
    });
  });

  it("fails leased records without a matching handler and records the error", async () => {
    const runtime = createInMemoryCanonicalPersistence({
      now: () => "2026-06-13T00:00:00.000Z"
    });
    const outbox = createPersistentOutbox({
      runtime,
      createId: () => "outbox.unknown"
    });
    outbox.enqueue({
      eventId: "event.unknown",
      eventType: "claim.created",
      destination: {
        kind: "adapter",
        name: "missing"
      },
      payload: {
        eventId: "event.unknown"
      },
      createdAt: "2026-06-13T00:01:00.000Z"
    });

    const result = await runOutboxWorker({
      runtime,
      outbox,
      workerId: "worker.missing",
      now: "2026-06-13T00:02:00.000Z"
    });

    expect(result.failedCount).toBe(1);
    expect(runtime.listOutbox()[0]).toMatchObject({
      status: "failed",
      lastError: "No outbox handler registered for adapter:missing."
    });
    expect(runtime.listAdapterAudits()[0]).toMatchObject({
      status: "failed",
      errors: ["No outbox handler registered for adapter:missing."]
    });
  });
});

const testRef = {
  id: "claim.outbox-worker",
  type: "claim",
  namespace: "canopy.test",
  lifecycleStatus: "active"
} as const;

const testEvent = {
  id: "event.claim.created.outbox-worker",
  type: "claim.created",
  occurredAt: "2026-06-13T00:00:00.000Z",
  actorRef: {
    id: "person.worker",
    type: "person",
    namespace: "canopy.test",
    lifecycleStatus: "active"
  },
  objectRef: testRef,
  relatedRefs: [],
  authorityRefs: [],
  sourceCapability: "claims-evidence",
  payload: {
    title: "Outbox worker claim"
  },
  schemaVersion: 1,
  visibility: "commons",
  dataState: "testimony_derived"
} as const;
