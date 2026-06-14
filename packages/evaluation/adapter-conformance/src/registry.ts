import {
  adapterCapabilityGroupsByKind,
  adapterKinds,
  type AdapterKind
} from "./adapter-kinds.js";
import {
  defineAdapterCase,
  defineAdapterConformanceSuite,
  defineAdapterInvariant,
  type AdapterConformanceSuite,
  type AdapterInvariantDefinition
} from "./harness.js";

const invariantTemplates = {
  auth: [
    invariant(
      "adapter.auth.subject-account-separation",
      "Subject identity, login account, membership, and authority refs stay separate.",
      "Auth adapters must not collapse authentication into civic authority.",
      ["identity", "permission"],
      ["person", "account", "membership", "authority-source"],
      "AUTH_SUBJECT_ACCOUNT_COLLAPSED"
    ),
    invariant(
      "adapter.auth.permission-trace-required",
      "Permission decisions return an authority trace.",
      "Every allow or deny must be explainable through kernel authority contracts.",
      ["permission", "observe"],
      ["actor", "target", "permission"],
      "AUTH_TRACE_MISSING"
    )
  ],
  persistence: [
    invariant(
      "adapter.persistence.object-ref-integrity",
      "Persisted records preserve canonical object refs and lifecycle status.",
      "Persistence is shared civic memory, not an opaque row store.",
      ["create", "read", "update"],
      ["object-ref", "stored-record"],
      "PERSISTENCE_REF_INTEGRITY_LOST"
    ),
    invariant(
      "adapter.persistence.stewardship-metadata-preserved",
      "Visibility, consent, retention, and source metadata survive round trips.",
      "Stored data must remain governable after retrieval.",
      ["create", "read", "redact"],
      ["stewardship-rule", "stored-record"],
      "PERSISTENCE_STEWARDSHIP_METADATA_DROPPED"
    )
  ],
  "event-store": [
    invariant(
      "adapter.event-store.append-only",
      "Events are appended, never mutated in place.",
      "Civic memory requires continuity-preserving correction, redaction, and supersession.",
      ["append", "read", "redact"],
      ["event", "redaction-event"],
      "EVENT_STORE_MUTATED_IN_PLACE"
    ),
    invariant(
      "adapter.event-store.event-order-stable",
      "Event ordering is stable by stream and replay cursor.",
      "Replay, projection, and federation need deterministic event order.",
      ["append", "query", "sync"],
      ["event-stream", "cursor"],
      "EVENT_STORE_ORDER_UNSTABLE"
    )
  ],
  "object-graph": [
    invariant(
      "adapter.object-graph.relationship-direction-preserved",
      "Relationship direction and assertion source are preserved.",
      "Object graph adapters must keep relationship semantics inspectable.",
      ["create", "query", "read"],
      ["from-ref", "to-ref", "relationship"],
      "OBJECT_GRAPH_DIRECTION_LOST"
    ),
    invariant(
      "adapter.object-graph.lifecycle-filtering",
      "Graph traversal respects lifecycle and redaction state.",
      "Retired or redacted objects cannot silently appear as active facts.",
      ["query", "redact"],
      ["active-ref", "redacted-ref"],
      "OBJECT_GRAPH_LIFECYCLE_IGNORED"
    )
  ],
  "document-store": [
    invariant(
      "adapter.document-store.content-hash-stable",
      "Document bytes resolve to stable content hashes.",
      "Document storage must support evidence integrity and export verification.",
      ["create", "read", "export"],
      ["document", "content-hash"],
      "DOCUMENT_HASH_UNSTABLE"
    ),
    invariant(
      "adapter.document-store.redaction-stubs",
      "Document redaction leaves auditable stubs.",
      "Sensitive documents need continuity without leaking removed content.",
      ["redact", "read"],
      ["document", "redaction-stub"],
      "DOCUMENT_REDACTION_STUB_MISSING"
    )
  ],
  "object-storage": [
    invariant(
      "adapter.object-storage.object-hash-stable",
      "Stored objects resolve to stable content hashes.",
      "Object storage must support evidence integrity and federation manifests.",
      ["create", "read", "export"],
      ["object", "content-hash"],
      "OBJECT_HASH_UNSTABLE"
    ),
    invariant(
      "adapter.object-storage.namespace-isolation",
      "Object keys are scoped by namespace and object ref.",
      "Shared storage cannot leak data across commons, organizations, or peers.",
      ["create", "read", "query"],
      ["namespace", "object-ref"],
      "OBJECT_STORAGE_NAMESPACE_LEAK"
    )
  ],
  geospatial: [
    invariant(
      "adapter.geospatial.place-scope-query",
      "Place scoped queries return only matching place refs.",
      "Geospatial indexes are authority and stewardship boundaries, not just coordinates.",
      ["query", "search"],
      ["place-ref", "geometry"],
      "GEOSPATIAL_SCOPE_LEAK"
    ),
    invariant(
      "adapter.geospatial.geometry-round-trip",
      "Geometry round trips without changing declared coordinate semantics.",
      "Ecological modeling depends on stable spatial interpretation.",
      ["create", "read", "query"],
      ["geometry", "place-ref"],
      "GEOSPATIAL_GEOMETRY_CHANGED"
    )
  ],
  "time-series": [
    invariant(
      "adapter.time-series.observation-order-stable",
      "Observations replay in stable timestamp and sequence order.",
      "Indicators and model inputs require deterministic temporal replay.",
      ["append", "query", "read"],
      ["series", "observation"],
      "TIME_SERIES_ORDER_UNSTABLE"
    ),
    invariant(
      "adapter.time-series.window-boundaries-inclusive",
      "Window queries handle inclusive or exclusive bounds explicitly.",
      "Temporal aggregations must not hide boundary assumptions.",
      ["query"],
      ["series", "window"],
      "TIME_SERIES_WINDOW_BOUNDARY_AMBIGUOUS"
    )
  ],
  vector: [
    invariant(
      "adapter.vector.source-ref-preserved",
      "Vector records preserve source object refs and content hashes.",
      "Similarity search results must remain evidence-linked.",
      ["create", "search", "read"],
      ["embedding", "source-ref", "content-hash"],
      "VECTOR_SOURCE_REF_DROPPED"
    ),
    invariant(
      "adapter.vector.stewardship-filtering",
      "Vector search respects visibility, consent, and purpose filters.",
      "Embedding indexes cannot bypass data stewardship.",
      ["search", "permission"],
      ["embedding", "stewardship-rule"],
      "VECTOR_STEWARDSHIP_FILTER_BYPASSED"
    )
  ],
  "federation-transport": [
    invariant(
      "adapter.federation-transport.envelope-integrity",
      "Transport preserves export envelope hashes and schema versions.",
      "Federation peers need verifiable, versioned exchange boundaries.",
      ["export", "import", "sync"],
      ["export-envelope", "peer"],
      "FEDERATION_ENVELOPE_INTEGRITY_LOST"
    ),
    invariant(
      "adapter.federation-transport.redaction-respected",
      "Transport never sends fields removed by redaction review.",
      "Federation must honor local stewardship before peer sync.",
      ["sync", "redact"],
      ["redaction-summary", "peer"],
      "FEDERATION_REDACTION_LEAK"
    )
  ],
  "legacy-project": [
    invariant(
      "adapter.legacy-project.source-pointer-required",
      "Folded records carry source project pointers.",
      "Legacy projects are sources inside Canopy, not separate application authorities.",
      ["import", "read"],
      ["legacy-record", "source-pointer"],
      "LEGACY_SOURCE_POINTER_MISSING"
    ),
    invariant(
      "adapter.legacy-project.canonical-mapping-reviewed",
      "Legacy terms map to canonical objects with reviewable disposition.",
      "Imported semantics must be visible and governable.",
      ["import", "query"],
      ["legacy-term", "canonical-mapping"],
      "LEGACY_MAPPING_UNREVIEWED"
    )
  ]
} as const satisfies Readonly<Record<AdapterKind, readonly AdapterInvariantDefinition[]>>;

export const adapterConformanceSuites = adapterKinds.map((kind) =>
  defineAdapterConformanceSuite({
    kind,
    capabilityGroups: adapterCapabilityGroupsByKind[kind],
    invariants: invariantTemplates[kind],
    cases: invariantTemplates[kind].map((template) =>
      defineAdapterCase({
        id: template.id.replace("adapter.", "case."),
        invariantId: template.id,
        title: template.title,
        intent: template.intents[0] ?? "observe",
        fixtures: [],
        expectedBehavior: template.rationale
      })
    )
  })
) satisfies readonly AdapterConformanceSuite[];

export const adapterConformanceRegistry = Object.fromEntries(
  adapterConformanceSuites.map((suite) => [suite.kind, suite])
) as Readonly<Record<AdapterKind, AdapterConformanceSuite>>;

export function getAdapterConformanceSuite(kind: AdapterKind): AdapterConformanceSuite {
  return adapterConformanceRegistry[kind];
}

function invariant(
  id: AdapterInvariantDefinition["id"],
  title: string,
  rationale: string,
  intents: AdapterInvariantDefinition["intents"],
  fixtureRoles: AdapterInvariantDefinition["fixtureRoles"],
  failureCode: string
): AdapterInvariantDefinition {
  return defineAdapterInvariant({
    id,
    level: "must",
    title,
    rationale,
    intents,
    fixtureRoles,
    failureCode
  });
}
