import { describe, expect, it } from "vitest";
import type {
  FederationTransportMessage,
  LegacySourceRecord,
  TimeSeriesPoint,
  VectorEmbedding
} from "@canopy/contracts-adapters";
import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryReferenceAdapters } from "./index.js";

const now = "2026-06-13T12:00:00.000Z";
const personRef = ref("person.mira", "person");
const claimRef = ref("claim.water", "claim");
const evidenceRef = ref("evidence.sensor", "evidence");
const authorityRef = ref("mandate.water", "mandate");

describe("reference in-memory adapters", () => {
  it("builds a complete Canopy adapter registry", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });

    expect(adapters.auth.descriptor.kind).toBe("auth");
    expect(adapters.persistence.descriptor.kind).toBe("persistence");
    expect(adapters.eventStore.descriptor.kind).toBe("event-store");
    expect(adapters.objectGraph.descriptor.kind).toBe("object-graph");
    expect(adapters.documentStore.descriptor.kind).toBe("document-store");
    expect(adapters.objectStorage.descriptor.kind).toBe("object-storage");
    expect(adapters.geospatial.descriptor.kind).toBe("geospatial");
    expect(adapters.timeSeries.descriptor.kind).toBe("time-series");
    expect(adapters.vector.descriptor.kind).toBe("vector");
    expect(adapters.federationTransport.descriptor.kind).toBe("federation-transport");
    expect(adapters.legacyProjectAdapters[0]?.descriptor.kind).toBe("legacy-project");
    expect((await adapters.eventStore.health()).status).toBe("healthy");
  });

  it("keeps auth account identity separate from civic person refs", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });

    const linked = await adapters.auth.linkAccount({
      personRef,
      provider: "local",
      providerSubject: "mira@example.test",
      handle: "mira",
      authorityRefs: [authorityRef]
    });
    const session = await adapters.auth.resolveSession({
      providerSubject: "mira@example.test",
      requestedAt: now
    });

    expect(linked.value?.type).toBe("account");
    expect(session.value?.accountRef.type).toBe("account");
    expect(session.value?.personRef).toEqual(personRef);
    expect(session.value?.accountRef.id).not.toBe(personRef.id);
  });

  it("round-trips canonical objects through persistence and canonical runtime records", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });

    const written = await adapters.persistence.writeObject({
      snapshot: {
        ref: claimRef,
        objectType: "claim",
        payload: { title: "Water quality" },
        schemaVersion: 1,
        updatedAt: now
      },
      authorityRefs: [authorityRef]
    });
    const read = await adapters.persistence.readObject(claimRef);

    expect(written.value?.ref).toEqual(claimRef);
    expect(read.value?.payload).toEqual({ title: "Water quality" });
    expect(adapters.persistenceRuntime.getObjectRef(claimRef)?.objectType).toBe("claim");
  });

  it("appends events immutably and replays them in deterministic order", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const event = canopyEvent("event.claim.created", claimRef);

    expect((await adapters.eventStore.appendEvent({ event })).ok).toBe(true);
    expect((await adapters.eventStore.appendEvent({ event: { ...event, payload: { changed: true } } })).ok).toBe(
      false
    );

    const replayed: CanopyEvent[] = [];
    for await (const result of adapters.eventStore.replay({})) {
      if (result.value !== undefined) {
        replayed.push(result.value);
      }
    }

    expect(replayed.map((entry) => entry.id)).toEqual([event.id]);
  });

  it("preserves graph direction and filters redacted refs", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const redactedRef = { ...evidenceRef, lifecycleStatus: "redacted" as const };

    await adapters.objectGraph.putRelationship({
      relationship: { from: claimRef, to: redactedRef, kind: "supported-by" },
      authorityRefs: [authorityRef]
    });
    const graph = await adapters.objectGraph.queryGraph({
      rootRef: claimRef,
      includeIncoming: false,
      includeOutgoing: true,
      maxDepth: 1
    });

    expect(graph.value?.objectRefs).toEqual([claimRef]);
    expect(graph.value?.relationships).toEqual([]);
  });

  it("stores documents and object bytes with stable hashes", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const bytes = new TextEncoder().encode("water evidence");

    const document = await adapters.documentStore.ingestDocument({
      objectRef: evidenceRef,
      format: "plain_text",
      text: "water evidence",
      authorityRefs: [authorityRef]
    });
    const object = await adapters.objectStorage.putObject({
      pointer: { bucket: "evidence", key: "water.txt" },
      bytes,
      authorityRefs: [authorityRef],
      metadata: {}
    });
    const retrieved = await adapters.objectStorage.getObject(object.value!);

    expect(document.value?.contentHash).toMatch(/^sha256:/);
    expect(object.value?.contentHash).toMatch(/^sha256:/);
    expect(new TextDecoder().decode(retrieved.value)).toBe("water evidence");
  });

  it("queries geospatial shapes and time-series windows", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const point: TimeSeriesPoint = {
      seriesId: "series.water-quality",
      objectRef: evidenceRef,
      measuredAt: now,
      value: 7.1,
      unit: "ph"
    };

    await adapters.geospatial.putShape(
      {
        id: "shape.place",
        kind: "point",
        coordinates: [-73, 42],
        coordinateSystem: "wgs84",
        objectRef: ref("place.river", "place")
      },
      [authorityRef]
    );
    await adapters.timeSeries.appendPoints([point], [authorityRef]);

    expect((await adapters.geospatial.queryShapes({ objectTypes: ["place"] })).value?.items).toHaveLength(1);
    expect(
      (await adapters.timeSeries.queryPoints({ measuredAfter: "2026-06-13T11:59:59.000Z", measuredBefore: "2026-06-13T12:00:01.000Z" })).value?.items
    ).toEqual([point]);
  });

  it("searches vectors with source object refs preserved", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const embedding: VectorEmbedding = {
      id: "embedding.evidence",
      objectRef: evidenceRef,
      dimensions: 3,
      values: [1, 0, 0],
      contentHash: "sha256:evidence",
      createdAt: now
    };

    await adapters.vector.upsertEmbedding(embedding, [authorityRef]);
    const hits = await adapters.vector.search({
      vector: [1, 0, 0],
      dimensions: 3,
      limit: 1
    });

    expect(hits.value?.[0]?.embedding.objectRef).toEqual(evidenceRef);
    expect(hits.value?.[0]?.score).toBe(1);
  });

  it("sends, receives, and acknowledges federation messages", async () => {
    const adapters = createInMemoryReferenceAdapters({ now: () => now });
    const message: FederationTransportMessage = {
      id: "message.export",
      federationRuleRef: ref("policy.export", "policy"),
      eventIds: ["event.claim.created"],
      objectRefs: [claimRef],
      payload: { envelopeId: "export.first" },
      schemaVersion: 1
    };

    const sent = await adapters.federationTransport.send(message);
    const received = await adapters.federationTransport.receive();
    await adapters.federationTransport.acknowledge(message.id, [authorityRef]);

    expect(sent.value?.contentHash).toMatch(/^sha256:/);
    expect(received.value?.items.map((item) => item.id)).toEqual([message.id]);
    expect((await adapters.federationTransport.receive()).value?.items).toEqual([]);
  });

  it("maps legacy project records as sources inside Canopy", async () => {
    const legacyRecord: LegacySourceRecord = {
      source: {
        sourceProject: "common-credit",
        sourceEntity: "ledger",
        sourceId: "legacy-ledger-1"
      },
      objectTypeHint: "ledger-entry",
      payload: { amount: 10 }
    };
    const adapters = createInMemoryReferenceAdapters({
      now: () => now,
      legacyRecords: [legacyRecord]
    });
    const legacy = adapters.legacyProjectAdapters[0]!;
    const inspected = await legacy.inspectSource();
    const report = await legacy.importBatch({
      id: "import.common-credit",
      sourceProject: "common-credit",
      records: [legacyRecord],
      dryRun: true,
      authorityRefs: [authorityRef]
    });

    expect(inspected.value?.items).toEqual([legacyRecord]);
    expect(report.value?.acceptedMappings[0]?.canonicalRef.source).toEqual(legacyRecord.source);
    expect(report.value?.prohibitedOutcomes.join(" ")).toContain("separate Canopy applications");
  });
});

function canopyEvent(id: string, objectRef: ObjectRef): CanopyEvent {
  return {
    id,
    type: "claim.created",
    occurredAt: now,
    actorRef: personRef,
    objectRef,
    relatedRefs: [evidenceRef],
    authorityRefs: [authorityRef],
    orgId: "org.riverbend",
    sourceCapability: "claims-evidence",
    payload: { title: "Water quality" },
    schemaVersion: 1,
    visibility: "commons",
    dataState: "testimony_derived"
  };
}

function ref(id: string, type: ObjectRef["type"]): ObjectRef {
  return {
    id,
    type,
    namespace: "canopy.adapters.reference.test",
    lifecycleStatus: "active"
  };
}
