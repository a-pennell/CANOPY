import type {
  CanopyEvent,
  CanopyEventType,
  CanopyExportEnvelope,
  CanopyId,
  CanopyObjectType,
  CanonicalMapping,
  ContentHash,
  ContentHashFields,
  ExportedDataStewardshipAgreement,
  ExportFormat,
  ImportWarning,
  IsoDateTime,
  ObjectRef,
  RedactionSummary
} from "@canopy/contracts-kernel";

export interface FederationExportProjectionOptions {
  readonly envelopeId?: CanopyId;
  readonly exportedAt?: IsoDateTime;
  readonly exportedByRef?: ObjectRef;
  readonly scopeRef?: ObjectRef;
  readonly format?: ExportFormat;
  readonly schemaVersion?: number;
  readonly federationRuleRef?: ObjectRef;
}

export interface FederationExportIncludedObject {
  readonly ref: ObjectRef;
  readonly type: CanopyObjectType;
  readonly eventIds: readonly CanopyId[];
}

export interface FederationExportIncludedEvent {
  readonly id: CanopyId;
  readonly type: CanopyEventType;
  readonly objectRef: ObjectRef;
  readonly relatedRefs: readonly ObjectRef[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly schemaVersion: number;
  readonly visibility: CanopyEvent["visibility"];
  readonly contentHash?: ContentHash;
  readonly isRedactedStub: boolean;
}

export interface FederationExportRedactionSummary extends RedactionSummary {
  readonly redactedEventsByReason: readonly FederationExportRedactionReasonCount[];
}

export interface FederationExportRedactionReasonCount {
  readonly reason: string;
  readonly count: number;
}

export interface FederationExportPreview {
  readonly eventIds: readonly CanopyId[];
  readonly eventTypes: readonly CanopyEventType[];
  readonly includedObjects: readonly FederationExportIncludedObject[];
  readonly includedObjectTypes: readonly CanopyObjectType[];
  readonly schemaVersions: readonly number[];
  readonly authorityRefs: readonly ObjectRef[];
  readonly dataStewardshipAgreementRefs: readonly ObjectRef[];
  readonly dataStewardshipAgreements: readonly ExportedDataStewardshipAgreement[];
  readonly localMappings: readonly CanonicalMapping[];
  readonly redactionSummary: FederationExportRedactionSummary;
  readonly federationReadinessWarnings: readonly ImportWarning[];
  readonly contentHash: ContentHash;
  readonly contentHashFields: ContentHashFields;
}

export interface FederationExportEnvelopeReadModel {
  readonly envelope: CanopyExportEnvelope;
  readonly preview: FederationExportPreview;
  readonly includedEvents: readonly FederationExportIncludedEvent[];
}

export const buildFederationExportPreview = (
  events: readonly CanopyEvent[]
): FederationExportPreview => {
  const sortedEvents = [...events].sort(compareEvents);
  const includedEvents = sortedEvents.map(toIncludedEvent);
  const includedObjects = collectIncludedObjects(sortedEvents);
  const authorityRefs = collectAuthorityRefs(sortedEvents);
  const dataStewardshipAgreementRefs = collectDataStewardshipAgreementRefs(sortedEvents);
  const dataStewardshipAgreements = collectDataStewardshipAgreements(sortedEvents);
  const localMappings = collectLocalMappings(sortedEvents);
  const redactionSummary = collectRedactionSummary(sortedEvents);
  const eventIds = includedEvents.map((event) => event.id);
  const contentHash = deterministicContentHash(eventIds);

  return {
    eventIds,
    eventTypes: sortedStrings(uniqueStrings(includedEvents.map((event) => event.type))),
    includedObjects,
    includedObjectTypes: sortedStrings(
      uniqueStrings(includedObjects.map((object) => object.type))
    ),
    schemaVersions: uniqueNumbers(includedEvents.map((event) => event.schemaVersion)),
    authorityRefs,
    dataStewardshipAgreementRefs,
    dataStewardshipAgreements,
    localMappings,
    redactionSummary,
    federationReadinessWarnings: collectFederationReadinessWarnings(
      sortedEvents,
      dataStewardshipAgreementRefs,
      localMappings
    ),
    contentHash,
    contentHashFields: {
      contentHash,
      hashAlgorithm: "sha256",
      canonicalization: "json_canonical"
    }
  };
};

export const buildFederationExportEnvelopeReadModel = (
  events: readonly CanopyEvent[],
  options: FederationExportProjectionOptions = {}
): FederationExportEnvelopeReadModel => {
  const sortedEvents = [...events].sort(compareEvents);
  const preview = buildFederationExportPreview(sortedEvents);
  const includedEvents = sortedEvents.map(toIncludedEvent);
  const scopeRef = options.scopeRef ?? firstFederationExportRef(sortedEvents) ?? firstObjectRef(sortedEvents);
  const exportedByRef = options.exportedByRef ?? firstActorRef(sortedEvents) ?? scopeRef;
  const federationRuleRef =
    options.federationRuleRef ?? firstRefByType(preview.includedObjects.map((object) => object.ref), "policy");

  const envelope = optionalEnvelope({
    id: options.envelopeId ?? `export-envelope.${preview.contentHash.slice("sha256:".length)}`,
    exportedAt: options.exportedAt ?? latestOccurredAt(sortedEvents),
    exportedByRef,
    scopeRef,
    format: options.format ?? firstPayloadFormat(sortedEvents) ?? "json",
    schemaVersion: options.schemaVersion ?? maxNumber(preview.schemaVersions, 1),
    includes: preview.includedObjectTypes,
    authorityRefs: preview.authorityRefs,
    federationRuleRef,
    dataStewardshipAgreements: preview.dataStewardshipAgreements,
    localMappings: preview.localMappings,
    contentHash: preview.contentHash,
    contentHashFields: preview.contentHashFields,
    redactionSummary: preview.redactionSummary
  });

  return { envelope, preview, includedEvents };
};

const toIncludedEvent = (event: CanopyEvent): FederationExportIncludedEvent =>
  optionalIncludedEvent({
    id: event.id,
    type: event.type,
    objectRef: event.objectRef,
    relatedRefs: sortedRefs(event.relatedRefs),
    authorityRefs: sortedRefs(event.authorityRefs),
    schemaVersion: event.schemaVersion,
    visibility: event.visibility,
    contentHash: event.contentHash,
    isRedactedStub: event.redaction?.isRedactedStub === true
  });

const collectIncludedObjects = (
  events: readonly CanopyEvent[]
): readonly FederationExportIncludedObject[] => {
  const refsByEvent = new Map<string, { ref: ObjectRef; eventIds: CanopyId[] }>();

  for (const event of events) {
    for (const ref of eventRefs(event)) {
      const key = refKey(ref);
      const entry = refsByEvent.get(key) ?? { ref, eventIds: [] };
      entry.eventIds.push(event.id);
      refsByEvent.set(key, entry);
    }
  }

  return [...refsByEvent.values()]
    .map((entry) => ({
      ref: entry.ref,
      type: entry.ref.type,
      eventIds: sortedStrings(uniqueStrings(entry.eventIds))
    }))
    .sort((left, right) => compareStrings(refKey(left.ref), refKey(right.ref)));
};

const collectAuthorityRefs = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs(events.flatMap((event) => event.authorityRefs)));

const collectDataStewardshipAgreementRefs = (
  events: readonly CanopyEvent[]
): readonly ObjectRef[] =>
  sortedRefs(
    dedupeRefs(
      events.flatMap((event) =>
        extractObjectRefs(event.payload).filter(
          (ref) =>
            ref.type === "agreement" &&
            (ref.id.includes("data-stewardship") ||
              ref.id.includes("stewardship-agreement") ||
              ref.namespace.includes("data-stewardship"))
        )
      )
    )
  );

const collectDataStewardshipAgreements = (
  events: readonly CanopyEvent[]
): readonly ExportedDataStewardshipAgreement[] =>
  [...dedupeById(
    events.flatMap((event) =>
      extractObjects(event.payload).filter(isExportedDataStewardshipAgreement)
    )
  )].sort((left, right) => compareStrings(left.id, right.id));

const collectLocalMappings = (events: readonly CanopyEvent[]): readonly CanonicalMapping[] =>
  [...dedupeById(
    events.flatMap((event) => extractObjects(event.payload).filter(isCanonicalMapping))
  )].sort((left, right) => compareStrings(left.id, right.id));

const collectRedactionSummary = (
  events: readonly CanopyEvent[]
): FederationExportRedactionSummary => {
  const redactedEvents = events.filter(
    (event) => event.redaction?.isRedactedStub === true || event.type === "system.redaction.applied"
  );
  const reasons = sortedStrings(
    uniqueStrings(
      redactedEvents
        .map((event) => event.redaction?.reason ?? payloadString(event.payload, ["reason"]))
        .filter(isDefined)
    )
  );
  const removedFields = sortedStrings(
    uniqueStrings(
      redactedEvents.flatMap((event) => [
        ...(event.redaction?.removedPayloadKeys ?? []),
        ...payloadStringArray(event.payload, ["removedPayloadKeys", "removedFields"])
      ])
    )
  );
  const redactedEventIds = sortedStrings(
    uniqueStrings(
      redactedEvents.map((event) => event.redaction?.originalEventId ?? event.id)
    )
  );
  const stubEventIds = sortedStrings(
    uniqueStrings(
      redactedEvents
        .filter((event) => event.redaction?.isRedactedStub === true)
        .map((event) => event.id)
    )
  );
  const redactedObjectRefs = sortedRefs(
    dedupeRefs(redactedEvents.flatMap((event) => [event.objectRef, ...event.relatedRefs]))
  );

  return optionalRedactionSummary({
    redactionCount: redactedEvents.length,
    redactedObjectRefs,
    redactedEventIds,
    stubEventIds,
    reasons,
    removedFields,
    contentHashBeforeRedaction: firstString(
      redactedEvents.map((event) => event.redaction?.originalContentHash)
    ),
    contentHashAfterRedaction: firstString(
      redactedEvents.map((event) => event.redaction?.redactedContentHash)
    ),
    notes: redactedEvents.length > 0 ? ["Redaction summary was derived from visible event continuity."] : undefined,
    redactedEventsByReason: reasons.map((reason) => ({
      reason,
      count: redactedEvents.filter(
        (event) => (event.redaction?.reason ?? payloadString(event.payload, ["reason"])) === reason
      ).length
    }))
  });
};

const collectFederationReadinessWarnings = (
  events: readonly CanopyEvent[],
  dataStewardshipAgreementRefs: readonly ObjectRef[],
  localMappings: readonly CanonicalMapping[]
): readonly ImportWarning[] => {
  const warnings: ImportWarning[] = [];
  const schemaVersions = uniqueNumbers(events.map((event) => event.schemaVersion));

  if (schemaVersions.length > 1) {
    warnings.push({
      code: "schema_version_mismatch",
      severity: "warning",
      message: "Export stream contains multiple event schema versions.",
      path: ["events", "schemaVersion"],
      recommendedAction: "Review schema migration compatibility before federation."
    });
  }

  for (const event of events) {
    if (event.authorityRefs.length === 0 && event.type.startsWith("federation.")) {
      warnings.push({
        code: "authority_refs_missing",
        severity: "warning",
        message: "Federation event has no authority refs.",
        path: ["events", event.id, "authorityRefs"],
        affectedRef: event.objectRef,
        recommendedAction: "Attach a policy, mandate, agreement, or other authority basis."
      });
    }

    if (event.redaction?.isRedactedStub === true) {
      warnings.push({
        code: "redaction_stub_only",
        severity: "info",
        message: "Export includes a redacted event stub.",
        path: ["events", event.id, "redaction"],
        affectedRef: event.objectRef,
        recommendedAction: "Ensure the receiving commons can interpret redaction continuity."
      });
    }
  }

  if (dataStewardshipAgreementRefs.length === 0) {
    warnings.push({
      code: "stewardship_rule_conflict",
      severity: "info",
      message: "No data stewardship agreement refs were visible in the export stream.",
      path: ["dataStewardshipAgreementRefs"],
      recommendedAction: "Confirm export rules outside the stream before federation."
    });
  }

  if (localMappings.length === 0) {
    warnings.push({
      code: "missing_local_mapping",
      severity: "info",
      message: "No local mappings were visible in the export stream.",
      path: ["localMappings"],
      recommendedAction: "Confirm canonical mappings when sharing local terms."
    });
  }

  return warnings.sort((left, right) => compareStrings(left.code, right.code) || comparePath(left.path, right.path));
};

const eventRefs = (event: CanopyEvent): readonly ObjectRef[] =>
  dedupeRefs([
    event.objectRef,
    ...event.relatedRefs,
    ...event.authorityRefs,
    ...extractObjectRefs(event.payload),
    ...(event.actorRef === undefined ? [] : [event.actorRef])
  ]);

const extractObjectRefs = (value: unknown): readonly ObjectRef[] =>
  extractObjects(value).filter(isObjectRef);

const extractObjects = (value: unknown): readonly unknown[] => {
  const objects: unknown[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }
      return;
    }

    if (!isRecord(current)) {
      return;
    }

    objects.push(current);

    for (const nested of Object.values(current)) {
      visit(nested);
    }
  };

  visit(value);
  return objects;
};

const isObjectRef = (value: unknown): value is ObjectRef =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.namespace === "string" &&
  typeof value.lifecycleStatus === "string";

const isCanonicalMapping = (
  value: unknown
): value is CanonicalMapping =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.localLabel === "string" &&
  typeof value.canonicalType === "string" &&
  typeof value.disposition === "string" &&
  Array.isArray(value.authorityRefs) &&
  typeof value.schemaVersion === "number";

const isExportedDataStewardshipAgreement = (
  value: unknown
): value is ExportedDataStewardshipAgreement =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isObjectRefRecord(value.governedRef) &&
  Array.isArray(value.stewardRefs) &&
  typeof value.visibility === "string" &&
  Array.isArray(value.allowedUses) &&
  Array.isArray(value.prohibitedUses) &&
  typeof value.consentRequired === "boolean" &&
  typeof value.schemaVersion === "number";

const isObjectRefRecord = (value: unknown): value is ObjectRef =>
  isRecord(value) && isObjectRef(value);

const firstFederationExportRef = (events: readonly CanopyEvent[]): ObjectRef | undefined =>
  events.find((event) => event.type === "federation.export.created")?.objectRef;

const firstObjectRef = (events: readonly CanopyEvent[]): ObjectRef => {
  const ref = events[0]?.objectRef;

  if (ref !== undefined) {
    return ref;
  }

  return {
    id: "export.empty",
    type: "source",
    namespace: "canopy.federation-export",
    lifecycleStatus: "active"
  };
};

const firstActorRef = (events: readonly CanopyEvent[]): ObjectRef | undefined =>
  events.map((event) => event.actorRef).find(isDefined);

const firstRefByType = (
  refs: readonly ObjectRef[],
  type: CanopyObjectType
): ObjectRef | undefined => refs.find((ref) => ref.type === type);

const firstPayloadFormat = (events: readonly CanopyEvent[]): ExportFormat | undefined => {
  const format = events
    .map((event) => event.payload.format)
    .find((value): value is ExportFormat => value === "json" || value === "jsonl" || value === "csv_bundle");

  return format;
};

const latestOccurredAt = (events: readonly CanopyEvent[]): IsoDateTime =>
  events.at(-1)?.occurredAt ?? "1970-01-01T00:00:00.000Z";

const deterministicContentHash = (eventIds: readonly CanopyId[]): ContentHash =>
  `sha256:canopy-export:${eventIds.join("|") || "empty"}`;

const maxNumber = (values: readonly number[], fallback: number): number =>
  values.length === 0 ? fallback : Math.max(...values);

const payloadString = (
  payload: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const payloadStringArray = (
  payload: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): readonly string[] => {
  for (const key of keys) {
    const value = payload[key];

    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
  }

  return [];
};

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => [
  ...new Map(refs.map((ref) => [refKey(ref), ref])).values()
];

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const compareEvents = (left: CanopyEvent, right: CanopyEvent): number =>
  compareStrings(left.occurredAt, right.occurredAt) ||
  compareStrings(left.type, right.type) ||
  compareStrings(left.id, right.id);

const comparePath = (left: readonly string[], right: readonly string[]): number =>
  compareStrings(left.join("."), right.join("."));

const compareStrings = (left: string, right: string): number => left.localeCompare(right);

const sortedStrings = <Value extends string>(values: readonly Value[]): readonly Value[] =>
  [...values].sort(compareStrings);

const uniqueStrings = <Value extends string>(values: readonly Value[]): readonly Value[] => [
  ...new Set(values)
];

const uniqueNumbers = (values: readonly number[]): readonly number[] => [
  ...new Set(values)
].sort((left, right) => left - right);

const dedupeById = <Value extends { readonly id: CanopyId }>(
  values: readonly Value[]
): readonly Value[] => [...new Map(values.map((value) => [value.id, value])).values()];

const firstString = (values: readonly (string | undefined)[]): string | undefined =>
  values.find(isDefined);

const isDefined = <Value>(value: Value | undefined): value is Value => value !== undefined;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

type IncludedEventInput = Omit<FederationExportIncludedEvent, "contentHash"> & {
  readonly contentHash: ContentHash | undefined;
};

const optionalIncludedEvent = (
  event: IncludedEventInput
): FederationExportIncludedEvent => {
  const { contentHash, ...rest } = event;

  return {
    ...rest,
    ...(contentHash === undefined ? {} : { contentHash })
  };
};

type RedactionSummaryInput = Omit<
  FederationExportRedactionSummary,
  "contentHashBeforeRedaction" | "contentHashAfterRedaction" | "notes"
> & {
  readonly contentHashBeforeRedaction: ContentHash | undefined;
  readonly contentHashAfterRedaction: ContentHash | undefined;
  readonly notes: readonly string[] | undefined;
};

const optionalRedactionSummary = (
  summary: RedactionSummaryInput
): FederationExportRedactionSummary => {
  const {
    contentHashBeforeRedaction,
    contentHashAfterRedaction,
    notes,
    ...rest
  } = summary;

  return {
    ...rest,
    ...(contentHashBeforeRedaction === undefined ? {} : { contentHashBeforeRedaction }),
    ...(contentHashAfterRedaction === undefined ? {} : { contentHashAfterRedaction }),
    ...(notes === undefined ? {} : { notes })
  };
};

type EnvelopeInput = Omit<
  CanopyExportEnvelope,
  "federationRuleRef" | "redactionSummary"
> & {
  readonly federationRuleRef: ObjectRef | undefined;
  readonly redactionSummary: RedactionSummary | undefined;
};

const optionalEnvelope = (envelope: EnvelopeInput): CanopyExportEnvelope => {
  const { federationRuleRef, redactionSummary, ...rest } = envelope;

  return {
    ...rest,
    ...(federationRuleRef === undefined ? {} : { federationRuleRef }),
    ...(redactionSummary === undefined ? {} : { redactionSummary })
  };
};
