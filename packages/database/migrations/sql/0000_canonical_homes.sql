-- Canopy canonical migration homes.
-- Provider-neutral DDL intent only. Do not execute this file directly.

CREATE TABLE canopy_object_refs (
  object_ref TEXT PRIMARY KEY,
  object_kind TEXT NOT NULL,
  namespace TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  metadata_text TEXT
);

CREATE INDEX canopy_object_refs_kind_idx
  ON canopy_object_refs (namespace, object_kind, created_at);

CREATE TABLE canopy_canonical_mappings (
  mapping_ref TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  object_ref TEXT NOT NULL,
  mapping_kind TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  metadata_text TEXT,
  UNIQUE (source_system, source_ref, mapping_kind)
);

CREATE INDEX canopy_canonical_mappings_object_ref_idx
  ON canopy_canonical_mappings (object_ref, mapping_kind);

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
);

CREATE INDEX canopy_events_object_ref_recorded_at_idx
  ON canopy_events (object_ref, recorded_at);

CREATE INDEX canopy_events_correlation_ref_idx
  ON canopy_events (correlation_ref);

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
  CHECK (status IN ('pending', 'leased', 'published', 'acknowledged', 'failed'))
);

CREATE INDEX canopy_outbox_status_available_at_idx
  ON canopy_outbox (status, available_at);

CREATE INDEX canopy_outbox_event_ref_idx
  ON canopy_outbox (event_ref);

CREATE TABLE canopy_projection_state (
  projector_ref TEXT PRIMARY KEY,
  projection_name TEXT NOT NULL,
  last_event_ref TEXT,
  last_event_recorded_at TEXT,
  rebuild_ref TEXT,
  checkpoint_text TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX canopy_projection_state_name_idx
  ON canopy_projection_state (projection_name, updated_at);

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
);

CREATE INDEX canopy_adapter_audit_adapter_occurred_at_idx
  ON canopy_adapter_audit (adapter_ref, occurred_at);

CREATE INDEX canopy_adapter_audit_object_ref_idx
  ON canopy_adapter_audit (object_ref);

CREATE TABLE canopy_provider_track_status (
  provider_track TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  canonical_subjects_text TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    status IN (
      'intent',
      'ready-for-prototype',
      'external-provider-intent',
      'implemented',
      'deprecated'
    )
  )
);

INSERT INTO canopy_provider_track_status (
  provider_track,
  status,
  canonical_subjects_text,
  artifact_path,
  updated_at
) VALUES
  (
    'postgres',
    'ready-for-prototype',
    'objectRefs,canonicalMappings,events,outbox,projectionState,adapterAudit,appendOnlyEnforcement',
    'sql/0000_canonical_homes.sql',
    'MIGRATION_TIMESTAMP'
  ),
  (
    'postgis',
    'ready-for-prototype',
    'objectRefs,canonicalMappings,projectionState,adapterAudit',
    'sql/0000_canonical_homes.sql',
    'MIGRATION_TIMESTAMP'
  ),
  (
    'pgvector',
    'ready-for-prototype',
    'objectRefs,canonicalMappings,projectionState,adapterAudit',
    'sql/0000_canonical_homes.sql',
    'MIGRATION_TIMESTAMP'
  ),
  (
    's3-compatible',
    'external-provider-intent',
    'objectRefs,canonicalMappings,adapterAudit',
    'sql/0000_canonical_homes.sql',
    'MIGRATION_TIMESTAMP'
  );

-- Append-only enforcement home.
-- Provider implementations must prevent UPDATE and DELETE for:
-- - canopy_events
-- - canopy_adapter_audit
-- - acknowledged, published, or failed canopy_outbox rows, unless represented
--   by a compensating event.
--
-- Implementations may use triggers, row-level policies, grants, ledger tables,
-- immutable storage, or migration-runner controls. The invariant is provider
-- neutral: historical facts are corrected by new records, not mutated in place.

-- Postgres provider-track trigger template.
-- This is migration intent, not an executable migration for every provider.
CREATE FUNCTION canopy_reject_historical_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Canopy historical facts are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canopy_events_append_only
  BEFORE UPDATE OR DELETE ON canopy_events
  FOR EACH ROW EXECUTE FUNCTION canopy_reject_historical_mutation();

CREATE TRIGGER canopy_adapter_audit_append_only
  BEFORE UPDATE OR DELETE ON canopy_adapter_audit
  FOR EACH ROW EXECUTE FUNCTION canopy_reject_historical_mutation();

CREATE TRIGGER canopy_outbox_acknowledged_append_only
  BEFORE UPDATE OR DELETE ON canopy_outbox
  FOR EACH ROW
  WHEN (OLD.status IN ('published', 'acknowledged', 'failed'))
  EXECUTE FUNCTION canopy_reject_historical_mutation();

-- PostGIS provider-track intent:
-- - Keep canonical object identity in canopy_object_refs.
-- - Store geometry/geography in a provider package table keyed by object_ref.
-- - Record source geometry imports in canopy_canonical_mappings and
--   canopy_adapter_audit.
-- - Keep spatial projection rebuild cursors in canopy_projection_state.
--
-- pgvector provider-track intent:
-- - Keep canonical object identity in canopy_object_refs.
-- - Store vector embeddings in a provider package table keyed by object_ref and
--   projection_name.
-- - Record embedding model, source event, and rebuild evidence in
--   canopy_adapter_audit.
-- - Keep semantic index cursors in canopy_projection_state.
--
-- S3-compatible provider-track intent:
-- - Keep document/object identity in canopy_object_refs.
-- - Map bucket/key/version identifiers through canopy_canonical_mappings.
-- - Store content hashes, retention state, and access evidence in
--   canopy_adapter_audit.
-- - Never treat object storage keys as canonical Canopy identity.
