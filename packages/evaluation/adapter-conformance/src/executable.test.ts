import type {
  AdapterDescriptor,
  AdapterPage,
  AdapterResult,
  AuthAdapter,
  CanonicalObjectSnapshot,
  DocumentPointer,
  DocumentStoreAdapter,
  EventStoreAdapter,
  FederationTransportAdapter,
  FederationTransportMessage,
  GeoShape,
  GeospatialAdapter,
  LegacyProjectAdapter,
  LegacySourceRecord,
  ObjectGraphAdapter,
  ObjectGraphSnapshot,
  ObjectStorageAdapter,
  PersistenceAdapter,
  TimeSeriesAdapter,
  TimeSeriesPoint,
  VectorAdapter,
  VectorEmbedding,
  VectorSearchHit
} from "@canopy/contracts-adapters";
import type {
  CanopyEvent,
  CanopyId,
  ObjectRef,
  RelationshipRef
} from "@canopy/contracts-kernel";
import { describe, expect, it } from "vitest";
import { adapterKinds, type AdapterKind } from "./adapter-kinds";
import {
  type ExecutableAdapter,
  runExecutableAdapterConformance,
  runExecutableAdapterConformanceSuite
} from "./executable";
import { getAdapterConformanceSuite } from "./registry";

const NOW = "2026-01-01T00:00:00.000Z";
const SOURCE = {
  sourceProject: "canopy" as const,
  sourceEntity: "adapter-conformance",
  sourceId: "mock"
};

describe("executable adapter conformance", () => {
  it("runs every registered invariant suite against simple concrete adapters", async () => {
    for (const kind of adapterKinds) {
      const result = await runExecutableAdapterConformance(createPassingAdapter(kind), {
        evaluatedAt: NOW
      });

      expect(result.suiteKind).toBe(kind);
      expect(result.adapter.kind).toBe(kind);
      expect(result.passed, `${kind} conformance should pass`).toBe(true);
      expect(result.results).toHaveLength(getAdapterConformanceSuite(kind).cases.length);
      expect(result.results.every((caseResult) => caseResult.passed)).toBe(true);
    }
  });

  it("fails clearly when the concrete adapter kind does not match the suite", async () => {
    const result = await runExecutableAdapterConformanceSuite(
      getAdapterConformanceSuite("auth"),
      createPassingAdapter("persistence")
    );

    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.issues[0]).toMatchObject({
      path: ["adapter", "kind"],
      code: "ADAPTER_KIND_MISMATCH"
    });
  });

  it("fails clearly when an executable invariant is breached", async () => {
    const result = await runExecutableAdapterConformance(
      createPersistenceAdapter({ breakRefIntegrity: true })
    );
    const breached = result.results.find(
      (caseResult) =>
        caseResult.invariantId === "adapter.persistence.object-ref-integrity"
    );

    expect(result.passed).toBe(false);
    expect(breached?.passed).toBe(false);
    expect(breached?.issues[0]).toMatchObject({
      path: ["readObject", "value", "ref"],
      code: "PERSISTENCE_REF_INTEGRITY_LOST"
    });
  });
});

function createPassingAdapter(kind: AdapterKind): ExecutableAdapter {
  switch (kind) {
    case "auth":
      return createAuthAdapter();
    case "persistence":
      return createPersistenceAdapter();
    case "event-store":
      return createEventStoreAdapter();
    case "object-graph":
      return createObjectGraphAdapter();
    case "document-store":
      return createDocumentStoreAdapter();
    case "object-storage":
      return createObjectStorageAdapter();
    case "geospatial":
      return createGeospatialAdapter();
    case "time-series":
      return createTimeSeriesAdapter();
    case "vector":
      return createVectorAdapter();
    case "federation-transport":
      return createFederationTransportAdapter();
    case "legacy-project":
      return createLegacyProjectAdapter();
  }
}

function createAuthAdapter(): AuthAdapter {
  return {
    descriptor: descriptor("auth"),
    health: healthy("auth"),
    resolveSession: async () =>
      ok({
        accountRef: ref("account.fixture", "account"),
        personRef: ref("person.fixture", "person"),
        membershipRefs: [ref("membership.fixture", "role")],
        roleAssignmentRefs: [ref("role-assignment.fixture", "mandate")]
      }),
    linkAccount: async () => ok(ref("account.fixture", "account")),
    revokeSession: async () => okVoid()
  };
}

function createPersistenceAdapter(
  options: { readonly breakRefIntegrity?: boolean } = {}
): PersistenceAdapter {
  const snapshots = new Map<CanopyId, CanonicalObjectSnapshot>();

  return {
    descriptor: descriptor("persistence"),
    health: healthy("persistence"),
    readObject: async (object) => {
      const snapshot = snapshots.get(object.id);
      if (!snapshot) {
        return ok(undefined);
      }

      if (options.breakRefIntegrity) {
        return ok({
          ...snapshot,
          ref: { ...snapshot.ref, id: `${snapshot.ref.id}.changed` }
        });
      }

      return ok(snapshot);
    },
    queryObjects: async () => ok(page([...snapshots.values()])),
    writeObject: async (write) => {
      snapshots.set(write.snapshot.ref.id, write.snapshot);
      return ok(write.snapshot);
    },
    withTransaction: async (_authorityRefs, work) =>
      ok(
        await work({
          id: "transaction.fixture",
          startedAt: NOW,
          authorityRefs: [ref("authority.fixture", "role")]
        })
      )
  };
}

function createEventStoreAdapter(): EventStoreAdapter {
  const events: CanopyEvent[] = [];

  return {
    descriptor: descriptor("event-store"),
    health: healthy("event-store"),
    appendEvent: async (request) => {
      const existing = events.find((event) => event.id === request.event.id);
      if (!existing) {
        events.push(request.event);
      }
      return ok(request.event);
    },
    getEvent: async (eventId) => ok(events.find((event) => event.id === eventId)),
    queryEvents: async (query) =>
      ok(
        page(
          events.filter(
            (event) => !query.objectRef || event.objectRef.id === query.objectRef.id
          )
        )
      ),
    replay: async function* () {
      for (const event of events) {
        yield ok(event);
      }
    }
  };
}

function createObjectGraphAdapter(): ObjectGraphAdapter {
  const relationships: RelationshipRef[] = [];

  return {
    descriptor: descriptor("object-graph"),
    health: healthy("object-graph"),
    putRelationship: async (write) => {
      relationships.push(write.relationship);
      return ok(write.relationship);
    },
    queryGraph: async (query) => {
      const graphRelationships = relationships.filter(
        (relationship) =>
          query.includeOutgoing &&
          relationship.from.id === query.rootRef.id &&
          relationship.to.lifecycleStatus !== "redacted"
      );
      const objectRefs = [
        query.rootRef,
        ...graphRelationships.map((relationship) => relationship.to)
      ];

      return ok<ObjectGraphSnapshot>({
        rootRef: query.rootRef,
        objectRefs,
        relationships: graphRelationships,
        builtAt: NOW
      });
    }
  };
}

function createDocumentStoreAdapter(): DocumentStoreAdapter {
  const documents = new Map<CanopyId, DocumentPointer>();

  return {
    descriptor: descriptor("document-store"),
    health: healthy("document-store"),
    ingestDocument: async (request) => {
      const id = `document.${documents.size + 1}`;
      const pointerBase: DocumentPointer = {
        id,
        objectRef: request.objectRef,
        uri: request.uri ?? `memory://adapter-conformance/${id}`,
        format: request.format,
        contentHash: hashFromText(request.text ?? request.uri ?? id),
        schemaVersion: 1
      };
      const pointer = request.source
        ? { ...pointerBase, source: request.source }
        : pointerBase;
      documents.set(pointer.id, pointer);
      return ok(pointer);
    },
    getDocument: async (pointer) => ok(documents.get(pointer.id) ?? pointer),
    searchDocuments: async (query) =>
      ok(page([...documents.values()].filter((pointer) => pointer.uri.includes(query))))
  };
}

function createObjectStorageAdapter(): ObjectStorageAdapter {
  const objects = new Map<string, Uint8Array>();

  return {
    descriptor: descriptor("object-storage"),
    health: healthy("object-storage"),
    putObject: async (request) => {
      objects.set(storageKey(request.pointer.bucket, request.pointer.key), request.bytes);
      return ok({
        ...request.pointer,
        sizeBytes: request.bytes.byteLength
      });
    },
    getObject: async (pointer) =>
      ok(objects.get(storageKey(pointer.bucket, pointer.key)) ?? new Uint8Array()),
    deleteObject: async (pointer) => {
      objects.delete(storageKey(pointer.bucket, pointer.key));
      return okVoid();
    }
  };
}

function createGeospatialAdapter(): GeospatialAdapter {
  const shapes: GeoShape[] = [];

  return {
    descriptor: descriptor("geospatial"),
    health: healthy("geospatial"),
    putShape: async (shape) => {
      shapes.push(shape);
      return ok(shape);
    },
    queryShapes: async (query) => {
      if (query.within) {
        return ok(page(shapes.filter((shape) => shape.objectRef.id === query.within?.objectRef.id)));
      }

      if (query.near) {
        return ok(page(shapes.filter((shape) => shape.id === query.near?.id)));
      }

      if (query.objectTypes) {
        return ok(page(shapes.filter((shape) => query.objectTypes?.includes(shape.objectRef.type))));
      }

      return ok(page(shapes));
    }
  };
}

function createTimeSeriesAdapter(): TimeSeriesAdapter {
  const points: TimeSeriesPoint[] = [];

  return {
    descriptor: descriptor("time-series"),
    health: healthy("time-series"),
    appendPoints: async (nextPoints) => {
      points.push(...nextPoints);
      return ok(nextPoints);
    },
    queryPoints: async (query) =>
      ok(
        page(
          points
            .filter(
              (point) =>
                (!query.seriesIds || query.seriesIds.includes(point.seriesId)) &&
                (!query.measuredAfter || point.measuredAt >= query.measuredAfter) &&
                (!query.measuredBefore || point.measuredAt <= query.measuredBefore)
            )
            .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
        )
      )
  };
}

function createVectorAdapter(): VectorAdapter {
  const embeddings: VectorEmbedding[] = [];

  return {
    descriptor: descriptor("vector"),
    health: healthy("vector"),
    upsertEmbedding: async (embedding) => {
      const existingIndex = embeddings.findIndex((candidate) => candidate.id === embedding.id);
      if (existingIndex >= 0) {
        embeddings[existingIndex] = embedding;
      } else {
        embeddings.push(embedding);
      }
      return ok(embedding);
    },
    search: async (query) => {
      const hits: VectorSearchHit[] = embeddings
        .filter(
          (embedding) =>
            embedding.dimensions === query.dimensions &&
            (!query.objectTypes || query.objectTypes.includes(embedding.objectRef.type))
        )
        .slice(0, query.limit)
        .map((embedding) => ({ embedding, score: 1 }));

      return ok(hits);
    }
  };
}

function createFederationTransportAdapter(): FederationTransportAdapter {
  const messages: FederationTransportMessage[] = [];

  return {
    descriptor: descriptor("federation-transport"),
    health: healthy("federation-transport"),
    send: async (message) => {
      messages.push(message);
      return ok(message);
    },
    receive: async () => ok(page(messages)),
    acknowledge: async () => okVoid()
  };
}

function createLegacyProjectAdapter(): LegacyProjectAdapter {
  const record: LegacySourceRecord = {
    source: SOURCE,
    objectTypeHint: "resource",
    payload: { label: "legacy fixture" },
    contentHash: "sha256:legacy-record"
  };

  return {
    descriptor: descriptor("legacy-project"),
    health: healthy("legacy-project"),
    inspectSource: async () => ok(page([record])),
    mapRecord: async (sourceRecord) =>
      ok({
        source: sourceRecord.source,
        canonicalRef: ref(
          `${sourceRecord.objectTypeHint ?? "source"}.${sourceRecord.source.sourceId}`,
          sourceRecord.objectTypeHint ?? "source",
          "active",
          sourceRecord.source
        ),
        mappedObjectType: "resource",
        capability: "federation",
        confidence: 1,
        reviewRequired: true,
        notes: ["reviewed by adapter conformance mock"]
      }),
    importBatch: async (batch) =>
      ok({
        id: batch.id,
        sourceProject: batch.sourceProject,
        dryRun: batch.dryRun,
        acceptedMappings: [],
        emittedEvents: [],
        warnings: [],
        prohibitedOutcomes: []
      })
  };
}

function descriptor<TKind extends AdapterKind>(
  kind: TKind
): AdapterDescriptor & { readonly kind: TKind } {
  return {
    id: `mock.${kind}`,
    kind,
    name: `Mock ${kind}`,
    version: "0.0.0-test",
    schemaVersion: 1,
    capabilities: [
      "read",
      "write",
      "append",
      "search",
      "stream",
      "replay",
      "export",
      "import",
      "redaction",
      "audit"
    ],
    supportedObjectTypes: ["account", "evidence", "mandate", "person", "place", "resource", "role"],
    supportedEventTypes: ["object.created", "system.redaction.applied"]
  };
}

function healthy(kind: AdapterKind) {
  return async () => ({
    adapterId: `mock.${kind}`,
    status: "healthy" as const,
    checkedAt: NOW,
    warnings: []
  });
}

function ok<TValue>(value: TValue): AdapterResult<TValue> {
  return { ok: true, value, errors: [] };
}

function okVoid(): AdapterResult<void> {
  return { ok: true, errors: [] };
}

function page<TValue>(items: readonly TValue[]): AdapterPage<TValue> {
  return { items, hasMore: false };
}

function ref(
  id: CanopyId,
  type: ObjectRef["type"],
  lifecycleStatus: ObjectRef["lifecycleStatus"] = "active",
  source?: ObjectRef["source"]
): ObjectRef {
  const object = {
    id,
    type,
    namespace: "adapter-conformance",
    lifecycleStatus
  };

  return source ? { ...object, source } : object;
}

function hashFromText(text: string): string {
  return `sha256:${Array.from(text)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)}`;
}

function storageKey(bucket: string, key: string): string {
  return `${bucket}/${key}`;
}
