export type DrizzlePlaceholderColumn = {
  readonly name: string;
  readonly intent: "id" | "text" | "integer" | "optionalText";
};

export type DrizzlePlaceholderTable = {
  readonly name: string;
  readonly columns: readonly DrizzlePlaceholderColumn[];
  readonly appendOnly: boolean;
};

export const drizzlePlaceholderTables: readonly DrizzlePlaceholderTable[] = [
  {
    name: "canopy_object_refs",
    appendOnly: false,
    columns: [
      { name: "object_ref", intent: "id" },
      { name: "object_kind", intent: "text" },
      { name: "namespace", intent: "text" },
      { name: "created_at", intent: "text" },
      { name: "created_by", intent: "optionalText" },
      { name: "metadata_text", intent: "optionalText" },
    ],
  },
  {
    name: "canopy_canonical_mappings",
    appendOnly: false,
    columns: [
      { name: "mapping_ref", intent: "id" },
      { name: "source_system", intent: "text" },
      { name: "source_ref", intent: "text" },
      { name: "object_ref", intent: "text" },
      { name: "mapping_kind", intent: "text" },
      { name: "valid_from", intent: "text" },
      { name: "valid_to", intent: "optionalText" },
      { name: "metadata_text", intent: "optionalText" },
    ],
  },
  {
    name: "canopy_events",
    appendOnly: true,
    columns: [
      { name: "event_ref", intent: "id" },
      { name: "object_ref", intent: "text" },
      { name: "event_type", intent: "text" },
      { name: "event_version", intent: "integer" },
      { name: "occurred_at", intent: "text" },
      { name: "recorded_at", intent: "text" },
      { name: "causation_ref", intent: "optionalText" },
      { name: "correlation_ref", intent: "optionalText" },
      { name: "actor_ref", intent: "optionalText" },
      { name: "payload_text", intent: "text" },
      { name: "metadata_text", intent: "optionalText" },
    ],
  },
  {
    name: "canopy_outbox",
    appendOnly: true,
    columns: [
      { name: "outbox_ref", intent: "id" },
      { name: "event_ref", intent: "text" },
      { name: "destination", intent: "text" },
      { name: "message_type", intent: "text" },
      { name: "message_text", intent: "text" },
      { name: "status", intent: "text" },
      { name: "available_at", intent: "text" },
      { name: "claimed_at", intent: "optionalText" },
      { name: "completed_at", intent: "optionalText" },
      { name: "failure_text", intent: "optionalText" },
    ],
  },
  {
    name: "canopy_projection_state",
    appendOnly: false,
    columns: [
      { name: "projector_ref", intent: "id" },
      { name: "projection_name", intent: "text" },
      { name: "last_event_ref", intent: "optionalText" },
      { name: "last_event_recorded_at", intent: "optionalText" },
      { name: "rebuild_ref", intent: "optionalText" },
      { name: "checkpoint_text", intent: "optionalText" },
      { name: "updated_at", intent: "text" },
    ],
  },
  {
    name: "canopy_adapter_audit",
    appendOnly: true,
    columns: [
      { name: "audit_ref", intent: "id" },
      { name: "adapter_ref", intent: "text" },
      { name: "operation_kind", intent: "text" },
      { name: "object_ref", intent: "optionalText" },
      { name: "external_ref", intent: "optionalText" },
      { name: "event_ref", intent: "optionalText" },
      { name: "occurred_at", intent: "text" },
      { name: "evidence_text", intent: "text" },
      { name: "metadata_text", intent: "optionalText" },
    ],
  },
];

export const appendOnlyEnforcementPlaceholder =
  "Provider implementations must block historical UPDATE and DELETE operations or represent corrections as new facts.";
