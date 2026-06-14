import type {
  AdapterResult,
  AuthAdapter,
  CanonicalObjectSnapshot,
  DocumentStoreAdapter,
  EventStoreAdapter,
  FederationTransportAdapter,
  GeoShape,
  GeospatialAdapter,
  LegacyProjectAdapter,
  ObjectGraphAdapter,
  ObjectStorageAdapter,
  PersistenceAdapter,
  TimeSeriesAdapter,
  TimeSeriesPoint,
  VectorAdapter
} from "@canopy/contracts-adapters";
import type {
  CanopyEvent,
  CanopyId,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
  RelationshipRef,
  ValidationIssue
} from "@canopy/contracts-kernel";
import {
  type AdapterCaseResult,
  type AdapterConformanceCase,
  type AdapterConformanceRunner,
  type AdapterConformanceSuite,
  type AdapterInvariantDefinition,
  type AdapterSuiteResult,
  type AdapterUnderTest,
  runAdapterConformanceSuite
} from "./harness.js";
import { getAdapterConformanceSuite } from "./registry.js";

export type ExecutableAdapter =
  | AuthAdapter
  | PersistenceAdapter
  | EventStoreAdapter
  | ObjectGraphAdapter
  | DocumentStoreAdapter
  | ObjectStorageAdapter
  | GeospatialAdapter
  | TimeSeriesAdapter
  | VectorAdapter
  | FederationTransportAdapter
  | LegacyProjectAdapter;

export interface ExecutableAdapterConformanceOptions {
  readonly evaluatedAt?: IsoDateTime;
}

interface ExecutableCheckContext {
  readonly suite: AdapterConformanceSuite;
  readonly conformanceCase: AdapterConformanceCase;
  readonly invariant: AdapterInvariantDefinition;
}

type ExecutableCheck = (
  adapter: ExecutableAdapter,
  context: ExecutableCheckContext
) => Promise<Readonly<Record<string, unknown>> | undefined>;

const NOW = "2026-01-01T00:00:00.000Z";
const EARLIER = "2025-12-31T23:59:59.000Z";
const LATER = "2026-01-01T00:00:01.000Z";
const LATEST = "2026-01-01T00:00:02.000Z";
const AFTER = "2026-01-01T00:00:03.000Z";

const SOURCE: LocalSourcePointer = {
  sourceProject: "canopy",
  sourceEntity: "adapter-conformance",
  sourceId: "fixture"
};

const AUTHORITY_REF = objectRef("authority.fixture", "role");
const PERSON_REF = objectRef("person.fixture", "person");
const PERSISTED_REF = objectRef("persistence.fixture", "resource", "active", SOURCE);
const EVENT_REF = objectRef("event.fixture", "resource");
const EVENT_STREAM_REF = objectRef("event-stream.fixture", "resource");
const GRAPH_FROM_REF = objectRef("graph.from", "place");
const GRAPH_TO_REF = objectRef("graph.to", "resource");
const GRAPH_REDACTED_REF = objectRef("graph.redacted", "evidence", "redacted");
const DOCUMENT_REF = objectRef("document.fixture", "evidence");
const DOCUMENT_REDACTED_REF = objectRef("document.redacted", "evidence", "redacted");
const STORAGE_AUTHORITY_REF = objectRef("storage.authority", "role");
const GEO_PLACE_REF = objectRef("geo.place.a", "place");
const GEO_OTHER_PLACE_REF = objectRef("geo.resource.b", "resource");
const SERIES_REF = objectRef("series.fixture", "indicator");
const VECTOR_REF = objectRef("vector.evidence", "evidence");
const VECTOR_OTHER_REF = objectRef("vector.account", "account");
const FEDERATION_RULE_REF = objectRef("federation.rule", "policy");

const executableChecks: Readonly<Record<CanopyId, ExecutableCheck>> = {
  "adapter.auth.subject-account-separation": async (adapter, context) => {
    const auth = requireKind(adapter, "auth");
    const linkedAccount = requireValue(
      await auth.linkAccount({
        personRef: PERSON_REF,
        provider: "conformance",
        providerSubject: "subject.fixture",
        handle: "fixture",
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "linkAccount"
    );
    const principal = requireValue(
      await auth.resolveSession({
        providerSubject: "subject.fixture",
        requestedAt: NOW
      }),
      context,
      "resolveSession"
    );

    expectCondition(
      !sameRef(linkedAccount, PERSON_REF),
      context,
      ["linkAccount", "value"],
      "Linked account ref must not collapse into the person ref."
    );
    expectCondition(
      !principal.personRef || !sameRef(principal.accountRef, principal.personRef),
      context,
      ["resolveSession", "personRef"],
      "Resolved principal must keep account and person refs separate."
    );
    expectCondition(
      principal.membershipRefs.every((membershipRef) => !sameRef(membershipRef, principal.accountRef)),
      context,
      ["resolveSession", "membershipRefs"],
      "Resolved principal must not reuse the account ref as a membership ref."
    );

    return {
      accountRef: principal.accountRef.id,
      personRef: principal.personRef?.id ?? null
    };
  },
  "adapter.auth.permission-trace-required": async (adapter, context) => {
    const auth = requireKind(adapter, "auth");
    requireValue(
      await auth.linkAccount({
        personRef: PERSON_REF,
        provider: "conformance",
        providerSubject: "subject.fixture",
        handle: "fixture",
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "linkAccount"
    );
    const principal = requireValue(
      await auth.resolveSession({
        providerSubject: "subject.fixture",
        requestedAt: NOW
      }),
      context,
      "resolveSession"
    );

    const authorityTraceRefs = [
      ...principal.membershipRefs,
      ...principal.roleAssignmentRefs
    ];

    expectCondition(
      authorityTraceRefs.every((traceRef) => !sameRef(traceRef, principal.accountRef)),
      context,
      ["resolveSession", "authorityTrace"],
      "Resolved principal authority trace must not collapse into the account ref."
    );

    return {
      membershipRefs: principal.membershipRefs.map((ref) => ref.id),
      roleAssignmentRefs: principal.roleAssignmentRefs.map((ref) => ref.id)
    };
  },
  "adapter.persistence.object-ref-integrity": async (adapter, context) => {
    const persistence = requireKind(adapter, "persistence");
    const snapshot: CanonicalObjectSnapshot = {
      ref: PERSISTED_REF,
      objectType: PERSISTED_REF.type,
      payload: { label: "persistence fixture" },
      contentHash: "sha256:persistence-fixture",
      schemaVersion: 1,
      updatedAt: NOW
    };

    const written = requireValue(
      await persistence.writeObject({
        snapshot,
        authorityRefs: [AUTHORITY_REF],
        idempotencyKey: "adapter-conformance.persistence.object-ref-integrity"
      }),
      context,
      "writeObject"
    );
    const read = requirePresent(
      requireValue(await persistence.readObject(written.ref), context, "readObject"),
      context,
      "readObject"
    );

    expectCondition(
      sameRef(read.ref, PERSISTED_REF),
      context,
      ["readObject", "value", "ref"],
      "Read snapshot must preserve the canonical object ref."
    );
    expectCondition(
      read.ref.lifecycleStatus === PERSISTED_REF.lifecycleStatus,
      context,
      ["readObject", "value", "ref", "lifecycleStatus"],
      "Read snapshot must preserve lifecycle status."
    );

    return { ref: read.ref.id, lifecycleStatus: read.ref.lifecycleStatus };
  },
  "adapter.persistence.stewardship-metadata-preserved": async (adapter, context) => {
    const persistence = requireKind(adapter, "persistence");
    const stewardship = {
      visibility: "commons",
      consentRequired: true,
      retentionRule: "retain-for-review"
    };
    const snapshot: CanonicalObjectSnapshot = {
      ref: PERSISTED_REF,
      objectType: PERSISTED_REF.type,
      payload: { stewardship },
      contentHash: "sha256:persistence-stewardship",
      schemaVersion: 1,
      updatedAt: LATER
    };

    const written = requireValue(
      await persistence.writeObject({
        snapshot,
        authorityRefs: [AUTHORITY_REF],
        idempotencyKey: "adapter-conformance.persistence.stewardship"
      }),
      context,
      "writeObject"
    );
    const read = requirePresent(
      requireValue(await persistence.readObject(written.ref), context, "readObject"),
      context,
      "readObject"
    );

    expectCondition(
      deepEqual(read.payload.stewardship, stewardship),
      context,
      ["readObject", "value", "payload", "stewardship"],
      "Read snapshot must preserve stewardship metadata."
    );
    expectCondition(
      deepEqual(read.ref.source, SOURCE),
      context,
      ["readObject", "value", "ref", "source"],
      "Read snapshot must preserve source metadata on the object ref."
    );

    return { stewardship: read.payload.stewardship as Readonly<Record<string, unknown>> };
  },
  "adapter.event-store.append-only": async (adapter, context) => {
    const eventStore = requireKind(adapter, "event-store");
    const original = canopyEvent("event.append-only.original", EVENT_REF, NOW, {
      value: "original"
    });
    const redaction = canopyEvent(
      "event.append-only.redaction",
      EVENT_REF,
      LATER,
      { redacts: original.id },
      "system.redaction.applied"
    );

    const appended = requireValue(
      await eventStore.appendEvent({ event: original }),
      context,
      "appendEvent"
    );
    requireValue(await eventStore.appendEvent({ event: redaction }), context, "appendEvent");
    const reread = requirePresent(
      requireValue(await eventStore.getEvent(appended.id), context, "getEvent"),
      context,
      "getEvent"
    );

    expectCondition(
      deepEqual(reread.payload, original.payload),
      context,
      ["getEvent", "value", "payload"],
      "Appending a correction or redaction event must not mutate the original event payload."
    );

    return { originalEventId: reread.id };
  },
  "adapter.event-store.event-order-stable": async (adapter, context) => {
    const eventStore = requireKind(adapter, "event-store");
    const first = canopyEvent("event.order.first", EVENT_STREAM_REF, NOW, {
      sequence: 1
    });
    const second = canopyEvent("event.order.second", EVENT_STREAM_REF, LATER, {
      sequence: 2
    });

    requireValue(await eventStore.appendEvent({ event: first }), context, "appendEvent");
    requireValue(
      await eventStore.appendEvent({
        event: second
      }),
      context,
      "appendEvent"
    );
    const queried = requireValue(
      await eventStore.queryEvents({ objectRef: EVENT_STREAM_REF }),
      context,
      "queryEvents"
    );
    const replayed = await collectReplay(eventStore, context);
    const queriedIds = queried.items.map((event) => event.id);
    const replayedIds = replayed.map((event) => event.id);

    expectCondition(
      orderedPairPresent(queriedIds, first.id, second.id),
      context,
      ["queryEvents", "value", "items"],
      "Queried events must preserve append order for a stream."
    );
    expectCondition(
      orderedPairPresent(replayedIds, first.id, second.id),
      context,
      ["replay"],
      "Replayed events must preserve append order."
    );

    return { queriedIds, replayedIds };
  },
  "adapter.object-graph.relationship-direction-preserved": async (adapter, context) => {
    const objectGraph = requireKind(adapter, "object-graph");
    const relationship: RelationshipRef = {
      from: GRAPH_FROM_REF,
      to: GRAPH_TO_REF,
      kind: "contains",
      assertedBy: AUTHORITY_REF,
      validFrom: NOW
    };

    const written = requireValue(
      await objectGraph.putRelationship({
        relationship,
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "putRelationship"
    );
    const graph = requireValue(
      await objectGraph.queryGraph({
        rootRef: GRAPH_FROM_REF,
        includeIncoming: false,
        includeOutgoing: true
      }),
      context,
      "queryGraph"
    );

    expectCondition(
      graph.relationships.some(
        (candidate) =>
          sameRef(candidate.from, written.from) &&
          sameRef(candidate.to, written.to) &&
          candidate.kind === written.kind &&
          (!candidate.assertedBy || sameRef(candidate.assertedBy, AUTHORITY_REF))
      ),
      context,
      ["queryGraph", "value", "relationships"],
      "Queried graph must preserve relationship direction and assertion source."
    );

    return { from: written.from.id, to: written.to.id, kind: written.kind };
  },
  "adapter.object-graph.lifecycle-filtering": async (adapter, context) => {
    const objectGraph = requireKind(adapter, "object-graph");
    requireValue(
      await objectGraph.putRelationship({
        relationship: {
          from: GRAPH_FROM_REF,
          to: GRAPH_REDACTED_REF,
          kind: "mentions",
          assertedBy: AUTHORITY_REF
        },
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "putRelationship"
    );
    const graph = requireValue(
      await objectGraph.queryGraph({
        rootRef: GRAPH_FROM_REF,
        includeIncoming: false,
        includeOutgoing: true
      }),
      context,
      "queryGraph"
    );

    expectCondition(
      graph.objectRefs.every((ref) => ref.lifecycleStatus !== "redacted"),
      context,
      ["queryGraph", "value", "objectRefs"],
      "Graph traversal must not return redacted refs as active graph objects."
    );
    expectCondition(
      graph.relationships.every((relationship) => relationship.to.lifecycleStatus !== "redacted"),
      context,
      ["queryGraph", "value", "relationships"],
      "Graph traversal must filter relationships pointing at redacted refs."
    );

    return { objectRefs: graph.objectRefs.map((ref) => ref.id) };
  },
  "adapter.document-store.content-hash-stable": async (adapter, context) => {
    const documentStore = requireKind(adapter, "document-store");
    const pointer = requireValue(
      await documentStore.ingestDocument({
        objectRef: DOCUMENT_REF,
        format: "plain_text",
        text: "adapter conformance document",
        source: SOURCE,
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "ingestDocument"
    );
    const read = requireValue(await documentStore.getDocument(pointer), context, "getDocument");

    expectCondition(
      Boolean(pointer.contentHash),
      context,
      ["ingestDocument", "value", "contentHash"],
      "Ingested document pointer must include a content hash."
    );
    expectCondition(
      pointer.contentHash === read.contentHash,
      context,
      ["getDocument", "value", "contentHash"],
      "Document content hash must remain stable across ingest and read."
    );

    return { contentHash: read.contentHash ?? null };
  },
  "adapter.document-store.redaction-stubs": async (adapter, context) => {
    const documentStore = requireKind(adapter, "document-store");
    const pointer = requireValue(
      await documentStore.ingestDocument({
        objectRef: DOCUMENT_REDACTED_REF,
        format: "plain_text",
        text: "redacted document stub",
        uri: "memory://adapter-conformance/redaction-stub",
        source: SOURCE,
        authorityRefs: [AUTHORITY_REF]
      }),
      context,
      "ingestDocument"
    );
    const read = requireValue(await documentStore.getDocument(pointer), context, "getDocument");

    expectCondition(
      read.objectRef.lifecycleStatus === "redacted",
      context,
      ["getDocument", "value", "objectRef", "lifecycleStatus"],
      "Redacted document reads must preserve the redacted stub ref."
    );
    expectCondition(
      read.uri.includes("redaction") || read.uri.includes("stub"),
      context,
      ["getDocument", "value", "uri"],
      "Redacted document reads must leave an auditable stub pointer."
    );

    return { uri: read.uri };
  },
  "adapter.object-storage.object-hash-stable": async (adapter, context) => {
    const objectStorage = requireKind(adapter, "object-storage");
    const bytes = new Uint8Array([1, 2, 3]);
    const pointer = requireValue(
      await objectStorage.putObject({
        pointer: {
          bucket: "adapter-conformance",
          key: "hash-stable.bin",
          contentHash: "sha256:010203",
          contentType: "application/octet-stream"
        },
        bytes,
        authorityRefs: [STORAGE_AUTHORITY_REF],
        metadata: { fixture: "object-hash-stable" }
      }),
      context,
      "putObject"
    );
    const read = requireValue(await objectStorage.getObject(pointer), context, "getObject");

    expectCondition(
      Boolean(pointer.contentHash),
      context,
      ["putObject", "value", "contentHash"],
      "Stored object pointer must include a content hash."
    );
    expectCondition(
      bytesEqual(bytes, read),
      context,
      ["getObject", "value"],
      "Read object bytes must match written object bytes."
    );

    return { contentHash: pointer.contentHash ?? null };
  },
  "adapter.object-storage.namespace-isolation": async (adapter, context) => {
    const objectStorage = requireKind(adapter, "object-storage");
    const firstBytes = new Uint8Array([10]);
    const secondBytes = new Uint8Array([20]);
    const firstPointer = requireValue(
      await objectStorage.putObject({
        pointer: {
          bucket: "namespace-a",
          key: "shared-key.bin",
          contentHash: "sha256:namespace-a"
        },
        bytes: firstBytes,
        authorityRefs: [STORAGE_AUTHORITY_REF],
        metadata: { namespace: "a" }
      }),
      context,
      "putObject"
    );
    requireValue(
      await objectStorage.putObject({
        pointer: {
          bucket: "namespace-b",
          key: "shared-key.bin",
          contentHash: "sha256:namespace-b"
        },
        bytes: secondBytes,
        authorityRefs: [STORAGE_AUTHORITY_REF],
        metadata: { namespace: "b" }
      }),
      context,
      "putObject"
    );
    const read = requireValue(await objectStorage.getObject(firstPointer), context, "getObject");

    expectCondition(
      bytesEqual(firstBytes, read),
      context,
      ["getObject", "value"],
      "Object storage reads must stay isolated by bucket and key namespace."
    );

    return { bucket: firstPointer.bucket, key: firstPointer.key };
  },
  "adapter.geospatial.place-scope-query": async (adapter, context) => {
    const geospatial = requireKind(adapter, "geospatial");
    const firstShape = geoShape("geo.shape.a", GEO_PLACE_REF, [0, 0]);
    const secondShape = geoShape("geo.shape.b", GEO_OTHER_PLACE_REF, [10, 10]);

    requireValue(await geospatial.putShape(firstShape, [AUTHORITY_REF]), context, "putShape");
    requireValue(await geospatial.putShape(secondShape, [AUTHORITY_REF]), context, "putShape");
    const page = requireValue(
      await geospatial.queryShapes({ objectTypes: [GEO_PLACE_REF.type] }),
      context,
      "queryShapes"
    );

    expectCondition(
      page.items.length > 0 && page.items.every((shape) => sameRef(shape.objectRef, GEO_PLACE_REF)),
      context,
      ["queryShapes", "value", "items"],
      "Place scoped geospatial query must return only matching place refs."
    );

    return { shapeIds: page.items.map((shape) => shape.id) };
  },
  "adapter.geospatial.geometry-round-trip": async (adapter, context) => {
    const geospatial = requireKind(adapter, "geospatial");
    const shape = geoShape("geo.shape.round-trip", GEO_PLACE_REF, [1, 2]);

    const written = requireValue(await geospatial.putShape(shape, [AUTHORITY_REF]), context, "putShape");
    const page = requireValue(await geospatial.queryShapes({ near: shape }), context, "queryShapes");
    const read = page.items.find((candidate) => candidate.id === written.id);

    expectCondition(Boolean(read), context, ["queryShapes", "value", "items"], "Round-tripped shape must be queryable.");
    expectCondition(
      read?.coordinateSystem === shape.coordinateSystem && deepEqual(read.coordinates, shape.coordinates),
      context,
      ["queryShapes", "value", "items", "coordinates"],
      "Geometry must round trip without changing coordinate semantics."
    );

    return { shapeId: written.id };
  },
  "adapter.time-series.observation-order-stable": async (adapter, context) => {
    const timeSeries = requireKind(adapter, "time-series");
    const points: readonly TimeSeriesPoint[] = [
      timeSeriesPoint("series.fixture", LATEST, 3),
      timeSeriesPoint("series.fixture", NOW, 1),
      timeSeriesPoint("series.fixture", LATER, 2)
    ];

    requireValue(await timeSeries.appendPoints(points, [AUTHORITY_REF]), context, "appendPoints");
    const page = requireValue(
      await timeSeries.queryPoints({ seriesIds: ["series.fixture"] }),
      context,
      "queryPoints"
    );
    const values = page.items.map((point) => point.value);

    expectCondition(
      deepEqual(values, [1, 2, 3]),
      context,
      ["queryPoints", "value", "items"],
      "Time-series observations must replay in stable timestamp order."
    );

    return { values };
  },
  "adapter.time-series.window-boundaries-inclusive": async (adapter, context) => {
    const timeSeries = requireKind(adapter, "time-series");
    const points: readonly TimeSeriesPoint[] = [
      timeSeriesPoint("series.boundary", EARLIER, "outside-before"),
      timeSeriesPoint("series.boundary", NOW, "before"),
      timeSeriesPoint("series.boundary", LATER, "inside"),
      timeSeriesPoint("series.boundary", LATEST, "after"),
      timeSeriesPoint("series.boundary", AFTER, "outside-after")
    ];

    requireValue(await timeSeries.appendPoints(points, [AUTHORITY_REF]), context, "appendPoints");
    const page = requireValue(
      await timeSeries.queryPoints({
        seriesIds: ["series.boundary"],
        measuredAfter: NOW,
        measuredBefore: LATEST
      }),
      context,
      "queryPoints"
    );
    const values = page.items.map((point) => point.value);
    const valuesApplyBounds =
      deepEqual(values, ["inside"]) || deepEqual(values, ["before", "inside", "after"]);

    expectCondition(
      valuesApplyBounds,
      context,
      ["queryPoints", "value", "items"],
      "Time-series window queries must apply explicit after and before boundaries without leaking outside points.",
      { values }
    );

    return { values };
  },
  "adapter.vector.source-ref-preserved": async (adapter, context) => {
    const vector = requireKind(adapter, "vector");
    const embedding = {
      id: "vector.embedding.source",
      objectRef: VECTOR_REF,
      dimensions: 3,
      values: [0.1, 0.2, 0.3],
      contentHash: "sha256:vector-source",
      createdAt: NOW
    };

    requireValue(await vector.upsertEmbedding(embedding, [AUTHORITY_REF]), context, "upsertEmbedding");
    const hits = requireValue(
      await vector.search({ vector: embedding.values, dimensions: 3, limit: 1 }),
      context,
      "search"
    );
    const topHit = hits[0];

    expectCondition(Boolean(topHit), context, ["search", "value"], "Vector search must return the upserted embedding.");
    expectCondition(
      topHit ? sameRef(topHit.embedding.objectRef, VECTOR_REF) : false,
      context,
      ["search", "value", "0", "embedding", "objectRef"],
      "Vector search hit must preserve the source object ref."
    );
    expectCondition(
      topHit?.embedding.contentHash === embedding.contentHash,
      context,
      ["search", "value", "0", "embedding", "contentHash"],
      "Vector search hit must preserve the source content hash."
    );

    return { hitId: topHit?.embedding.id ?? null };
  },
  "adapter.vector.stewardship-filtering": async (adapter, context) => {
    const vector = requireKind(adapter, "vector");
    requireValue(
      await vector.upsertEmbedding(
        {
          id: "vector.embedding.evidence",
          objectRef: VECTOR_REF,
          dimensions: 2,
          values: [1, 0],
          contentHash: "sha256:vector-evidence",
          createdAt: NOW
        },
        [AUTHORITY_REF]
      ),
      context,
      "upsertEmbedding"
    );
    requireValue(
      await vector.upsertEmbedding(
        {
          id: "vector.embedding.account",
          objectRef: VECTOR_OTHER_REF,
          dimensions: 2,
          values: [1, 0],
          contentHash: "sha256:vector-account",
          createdAt: NOW
        },
        [AUTHORITY_REF]
      ),
      context,
      "upsertEmbedding"
    );
    const hits = requireValue(
      await vector.search({
        vector: [1, 0],
        dimensions: 2,
        objectTypes: ["evidence"],
        limit: 10
      }),
      context,
      "search"
    );

    expectCondition(
      hits.length > 0 && hits.every((hit) => hit.embedding.objectRef.type === "evidence"),
      context,
      ["search", "value"],
      "Vector search must respect object type stewardship filters."
    );

    return { hitObjectTypes: hits.map((hit) => hit.embedding.objectRef.type) };
  },
  "adapter.federation-transport.envelope-integrity": async (adapter, context) => {
    const federation = requireKind(adapter, "federation-transport");
    const message = {
      id: "federation.message.integrity",
      federationRuleRef: FEDERATION_RULE_REF,
      eventIds: ["event.order.first"],
      objectRefs: [EVENT_STREAM_REF],
      payload: { envelopeId: "export.fixture", schemaVersion: 1 },
      contentHash: "sha256:federation-envelope",
      schemaVersion: 1
    };

    const sent = requireValue(await federation.send(message), context, "send");
    const page = requireValue(await federation.receive(), context, "receive");
    const received = page.items.find((candidate) => candidate.id === sent.id);

    expectCondition(Boolean(received), context, ["receive", "value", "items"], "Sent federation message must be receivable.");
    expectCondition(
      received?.contentHash === message.contentHash && received.schemaVersion === message.schemaVersion,
      context,
      ["receive", "value", "items"],
      "Federation transport must preserve envelope hashes and schema versions."
    );

    return { messageId: sent.id, contentHash: sent.contentHash ?? null };
  },
  "adapter.federation-transport.redaction-respected": async (adapter, context) => {
    const federation = requireKind(adapter, "federation-transport");
    const message = {
      id: "federation.message.redaction",
      federationRuleRef: FEDERATION_RULE_REF,
      eventIds: ["event.append-only.redaction"],
      objectRefs: [DOCUMENT_REDACTED_REF],
      payload: {
        public: "visible",
        redactionSummary: {
          redactionCount: 1,
          removedFields: ["privateNote"]
        }
      },
      contentHash: "sha256:federation-redaction",
      schemaVersion: 1
    };

    const sent = requireValue(await federation.send(message), context, "send");
    const page = requireValue(await federation.receive(), context, "receive");
    const received = page.items.find((candidate) => candidate.id === sent.id);

    expectCondition(Boolean(received), context, ["receive", "value", "items"], "Sent redaction-reviewed message must be receivable.");
    expectCondition(
      received ? !Object.hasOwn(received.payload, "privateNote") : false,
      context,
      ["receive", "value", "items", "payload", "privateNote"],
      "Federation transport must not send fields removed by redaction review."
    );

    return { messageId: sent.id };
  },
  "adapter.legacy-project.source-pointer-required": async (adapter, context) => {
    const legacy = requireKind(adapter, "legacy-project");
    const page = requireValue(await legacy.inspectSource(), context, "inspectSource");
    const record = page.items[0];

    expectCondition(Boolean(record?.source), context, ["inspectSource", "value", "items", "0", "source"], "Legacy source records must carry source pointers.");

    return { sourceId: record?.source.sourceId ?? null };
  },
  "adapter.legacy-project.canonical-mapping-reviewed": async (adapter, context) => {
    const legacy = requireKind(adapter, "legacy-project");
    const record = {
      source: SOURCE,
      objectTypeHint: "resource" as const,
      payload: { label: "legacy fixture" },
      contentHash: "sha256:legacy-record"
    };
    const mapping = requireValue(await legacy.mapRecord(record), context, "mapRecord");
    const expectedCanonicalId = `${record.objectTypeHint}.${record.source.sourceId}`;

    expectCondition(
      mapping.canonicalRef.id === expectedCanonicalId &&
        mapping.canonicalRef.type === record.objectTypeHint &&
        mapping.canonicalRef.lifecycleStatus === "active" &&
        deepEqual(mapping.canonicalRef.source, record.source),
      context,
      ["mapRecord", "value", "canonicalRef"],
      "Legacy records must map to source-derived canonical object refs.",
      { canonicalRef: mapping.canonicalRef, expectedCanonicalId }
    );
    expectCondition(
      mapping.reviewRequired || mapping.notes.length > 0,
      context,
      ["mapRecord", "value"],
      "Legacy mappings must include a reviewable disposition."
    );

    return { canonicalRef: mapping.canonicalRef.id, reviewRequired: mapping.reviewRequired };
  }
};

export function adapterUnderTestFromExecutable(
  adapter: ExecutableAdapter,
  options: ExecutableAdapterConformanceOptions = {}
): AdapterUnderTest {
  const adapterUnderTest: AdapterUnderTest = {
    id: adapter.descriptor.id,
    kind: adapter.descriptor.kind,
    contractVersion: adapter.descriptor.version
  };

  return options.evaluatedAt
    ? { ...adapterUnderTest, evaluatedAt: options.evaluatedAt }
    : adapterUnderTest;
}

export function createExecutableAdapterRunner(
  suite: AdapterConformanceSuite,
  adapter: ExecutableAdapter
): AdapterConformanceRunner {
  return {
    evaluate: async (_adapter, conformanceCase) =>
      evaluateExecutableCase(suite, adapter, conformanceCase)
  };
}

export async function runExecutableAdapterConformanceSuite(
  suite: AdapterConformanceSuite,
  adapter: ExecutableAdapter,
  options: ExecutableAdapterConformanceOptions = {}
): Promise<AdapterSuiteResult> {
  return runAdapterConformanceSuite(
    suite,
    adapterUnderTestFromExecutable(adapter, options),
    createExecutableAdapterRunner(suite, adapter)
  );
}

export async function runExecutableAdapterConformance(
  adapter: ExecutableAdapter,
  options: ExecutableAdapterConformanceOptions = {}
): Promise<AdapterSuiteResult> {
  return runExecutableAdapterConformanceSuite(
    getAdapterConformanceSuite(adapter.descriptor.kind),
    adapter,
    options
  );
}

async function evaluateExecutableCase(
  suite: AdapterConformanceSuite,
  adapter: ExecutableAdapter,
  conformanceCase: AdapterConformanceCase
): Promise<AdapterCaseResult> {
  const invariant = suite.invariants.find(
    (candidate) => candidate.id === conformanceCase.invariantId
  );

  if (!invariant) {
    return failedResult(conformanceCase, {
      path: ["case", "invariantId"],
      code: "ADAPTER_INVARIANT_NOT_REGISTERED",
      message: `Case ${conformanceCase.id} references unknown invariant ${conformanceCase.invariantId}.`
    });
  }

  const check = executableChecks[invariant.id];
  if (!check) {
    return failedResult(conformanceCase, {
      path: ["case", "invariantId"],
      code: "ADAPTER_INVARIANT_EXECUTOR_MISSING",
      message: `No executable check is registered for invariant ${invariant.id}.`
    });
  }

  try {
    const evidence = await check(adapter, { suite, conformanceCase, invariant });
    const result: AdapterCaseResult = {
      caseId: conformanceCase.id,
      invariantId: conformanceCase.invariantId,
      passed: true,
      issues: []
    };

    return evidence ? { ...result, evidence } : result;
  } catch (error) {
    if (error instanceof InvariantBreach) {
      return failedResult(
        conformanceCase,
        {
          path: error.path,
          code: invariant.failureCode,
          message: error.message
        },
        error.evidence
      );
    }

    return failedResult(conformanceCase, {
      path: ["adapter"],
      code: "ADAPTER_INVARIANT_EXECUTION_FAILED",
      message: error instanceof Error ? error.message : "Adapter invariant execution failed."
    });
  }
}

function failedResult(
  conformanceCase: AdapterConformanceCase,
  issue: ValidationIssue,
  evidence?: Readonly<Record<string, unknown>>
): AdapterCaseResult {
  const result: AdapterCaseResult = {
    caseId: conformanceCase.id,
    invariantId: conformanceCase.invariantId,
    passed: false,
    issues: [issue]
  };

  return evidence ? { ...result, evidence } : result;
}

function requireKind<TKind extends ExecutableAdapter["descriptor"]["kind"]>(
  adapter: ExecutableAdapter,
  kind: TKind
): Extract<ExecutableAdapter, { readonly descriptor: { readonly kind: TKind } }> {
  if (adapter.descriptor.kind !== kind) {
    throw new Error(
      `Executable check expected ${kind} adapter but received ${adapter.descriptor.kind}.`
    );
  }

  return adapter as Extract<ExecutableAdapter, { readonly descriptor: { readonly kind: TKind } }>;
}

function requireValue<TValue>(
  result: AdapterResult<TValue>,
  context: ExecutableCheckContext,
  operation: string
): NonNullable<TValue> {
  if (!result.ok) {
    throw new InvariantBreach(
      ["adapter", operation],
      `${operation} returned adapter errors: ${result.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join("; ")}`,
      { invariantId: context.invariant.id, operation }
    );
  }

  if (!("value" in result) || result.value === undefined) {
    throw new InvariantBreach(
      ["adapter", operation, "value"],
      `${operation} did not return a value required by the invariant probe.`,
      { invariantId: context.invariant.id, operation }
    );
  }

  return result.value as NonNullable<TValue>;
}

function requirePresent<TValue>(
  value: TValue | undefined,
  context: ExecutableCheckContext,
  operation: string
): TValue {
  if (value === undefined) {
    throw new InvariantBreach(
      ["adapter", operation, "value"],
      `${operation} returned an empty value required by the invariant probe.`,
      { invariantId: context.invariant.id, operation }
    );
  }

  return value;
}

function expectCondition(
  condition: boolean,
  context: ExecutableCheckContext,
  path: readonly string[],
  message: string,
  evidence: Readonly<Record<string, unknown>> = {}
): void {
  if (!condition) {
    throw new InvariantBreach(path, message, {
      invariantId: context.invariant.id,
      ...evidence
    });
  }
}

async function collectReplay(
  eventStore: EventStoreAdapter,
  context: ExecutableCheckContext
): Promise<readonly CanopyEvent[]> {
  const replayed: CanopyEvent[] = [];
  for await (const result of eventStore.replay({})) {
    replayed.push(requireValue(result, context, "replay"));
    if (replayed.length >= 25) {
      break;
    }
  }

  return replayed;
}

function objectRef(
  id: CanopyId,
  type: ObjectRef["type"],
  lifecycleStatus: ObjectRef["lifecycleStatus"] = "active",
  source?: LocalSourcePointer
): ObjectRef {
  const ref = {
    id,
    type,
    namespace: "adapter-conformance",
    lifecycleStatus
  };

  return source ? { ...ref, source } : ref;
}

function canopyEvent(
  id: CanopyId,
  object: ObjectRef,
  occurredAt: IsoDateTime,
  payload: Readonly<Record<string, unknown>>,
  type: CanopyEvent["type"] = "object.created"
): CanopyEvent {
  return {
    id,
    type,
    occurredAt,
    systemActor: "importer",
    objectRef: object,
    relatedRefs: [],
    authorityRefs: [AUTHORITY_REF],
    sourceCapability: "civic-memory",
    payload,
    schemaVersion: 1,
    visibility: "commons",
    contentHash: `sha256:${id}`
  };
}

function geoShape(id: CanopyId, object: ObjectRef, coordinates: readonly [number, number]): GeoShape {
  return {
    id,
    kind: "point",
    coordinates,
    coordinateSystem: "wgs84",
    objectRef: object,
    validAt: NOW,
    source: SOURCE
  };
}

function timeSeriesPoint(
  seriesId: CanopyId,
  measuredAt: IsoDateTime,
  value: TimeSeriesPoint["value"]
): TimeSeriesPoint {
  return {
    seriesId,
    objectRef: SERIES_REF,
    measuredAt,
    value,
    unit: "count",
    source: SOURCE
  };
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.namespace === right.namespace &&
    left.lifecycleStatus === right.lifecycleStatus
  );
}

function orderedPairPresent(ids: readonly CanopyId[], first: CanopyId, second: CanopyId): boolean {
  const firstIndex = ids.indexOf(first);
  const secondIndex = ids.indexOf(second);
  return firstIndex >= 0 && secondIndex > firstIndex;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  return left.every((byte, index) => byte === right[index]);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

class InvariantBreach extends Error {
  readonly path: readonly string[];
  readonly evidence: Readonly<Record<string, unknown>>;

  constructor(
    path: readonly string[],
    message: string,
    evidence: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.path = path;
    this.evidence = evidence;
  }
}
