import { describe, expect, it } from "vitest";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { createPostgresEventStoreAdapter } from "./index.js";

const objectRef: ObjectRef = {
  id: "claim.water-quality",
  type: "claim",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const relatedRef: ObjectRef = {
  id: "evidence.sample-1",
  type: "evidence",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

const authorityRef: ObjectRef = {
  id: "mandate.event-store-test",
  type: "mandate",
  namespace: "canopy.test",
  lifecycleStatus: "active"
};

function event(
  id: string,
  occurredAt: string,
  payload: Readonly<Record<string, unknown>> = { statement: "Water is clear." }
): CanopyEvent {
  return {
    id,
    type: "claim.created",
    occurredAt,
    systemActor: "migration",
    objectRef,
    relatedRefs: [relatedRef],
    authorityRefs: [authorityRef],
    sourceCapability: "claims-evidence",
    payload,
    schemaVersion: 1,
    visibility: "commons",
    dataState: "locally_verified"
  };
}

describe("PostgresEventStoreAdapter prototype", () => {
  it("appends, gets, queries, and replays events in deterministic order", async () => {
    const adapter = createPostgresEventStoreAdapter({
      now: () => "2026-06-13T13:00:00.000Z"
    });
    const first = event("event.claim.1", "2026-06-13T09:00:00.000Z");
    const second = event("event.claim.2", "2026-06-13T10:00:00.000Z");

    expect((await adapter.appendEvent({ event: second })).ok).toBe(true);
    expect(
      (
        await adapter.appendEvent({
          event: first,
          idempotencyKey: "append.claim.1"
        })
      ).ok
    ).toBe(true);

    const fetched = await adapter.getEvent("event.claim.1");

    expect(fetched.ok).toBe(true);
    expect(fetched.value).toEqual(first);
    expect(fetched.value).not.toBe(first);

    const queried = await adapter.queryEvents({
      objectRef,
      relatedRef,
      eventTypes: ["claim.created"],
      page: { limit: 1 }
    });

    expect(queried.value?.items.map((item) => item.id)).toEqual(["event.claim.1"]);
    expect(queried.value?.nextCursor).toBe("1");
    expect(queried.value?.hasMore).toBe(true);

    const replayed: string[] = [];
    for await (const result of adapter.replay({})) {
      if (result.ok && result.value !== undefined) {
        replayed.push(result.value.id);
      }
    }

    expect(replayed).toEqual(["event.claim.1", "event.claim.2"]);
    expect(adapter.snapshotTables().events.map((row) => row.eventId)).toEqual([
      "event.claim.1",
      "event.claim.2"
    ]);
  });

  it("allows identical idempotent appends and rejects event mutation", async () => {
    const adapter = createPostgresEventStoreAdapter();
    const original = event("event.claim.idempotent", "2026-06-13T09:00:00.000Z");

    const first = await adapter.appendEvent({
      event: original,
      idempotencyKey: "append.same"
    });
    const second = await adapter.appendEvent({
      event: original,
      idempotencyKey: "append.same"
    });
    const mutated = await adapter.appendEvent({
      event: event("event.claim.idempotent", "2026-06-13T09:00:00.000Z", {
        statement: "Changed after append."
      })
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(adapter.snapshotTables().events).toHaveLength(1);
    expect(mutated.ok).toBe(false);
    expect(mutated.errors[0]?.code).toBe("append_only_violation");
  });

  it("enforces expected previous event ids per object stream", async () => {
    const adapter = createPostgresEventStoreAdapter();
    const first = event("event.claim.previous.1", "2026-06-13T09:00:00.000Z");
    const second = event("event.claim.previous.2", "2026-06-13T10:00:00.000Z");

    await adapter.appendEvent({ event: first });

    const conflict = await adapter.appendEvent({
      event: second,
      expectedPreviousEventId: "event.some-other-stream-tip"
    });

    expect(conflict.ok).toBe(false);
    expect(conflict.errors[0]?.code).toBe("conflict");

    const appended = await adapter.appendEvent({
      event: second,
      expectedPreviousEventId: first.id
    });

    expect(appended.ok).toBe(true);
  });

  it("replays after event ids, cursors, and occurred-at boundaries", async () => {
    const adapter = createPostgresEventStoreAdapter({
      seedEvents: [
        event("event.claim.replay.1", "2026-06-13T09:00:00.000Z"),
        event("event.claim.replay.2", "2026-06-13T10:00:00.000Z"),
        event("event.claim.replay.3", "2026-06-13T11:00:00.000Z")
      ]
    });

    const afterEvent: string[] = [];
    for await (const result of adapter.replay({ fromEventId: "event.claim.replay.1" })) {
      if (result.ok && result.value !== undefined) {
        afterEvent.push(result.value.id);
      }
    }

    const afterTime: string[] = [];
    for await (const result of adapter.replay({
      fromOccurredAt: "2026-06-13T09:30:00.000Z",
      cursor: "1"
    })) {
      if (result.ok && result.value !== undefined) {
        afterTime.push(result.value.id);
      }
    }

    expect(afterEvent).toEqual(["event.claim.replay.2", "event.claim.replay.3"]);
    expect(afterTime).toEqual(["event.claim.replay.3"]);
  });
});
