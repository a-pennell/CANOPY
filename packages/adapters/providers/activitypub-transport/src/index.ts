import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  FederationTransportAdapter,
  FederationTransportMessage
} from "@canopy/contracts-adapters";
import type {
  CanopyId,
  CanopyEvent,
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type {
  AdapterAuditRecord,
  CanonicalDatabaseRecord,
  CanonicalMappingRecord,
  CanonicalObjectRefRecord,
  EventRecord,
  JsonValue,
  OutboxRecord
} from "@canopy/contracts-database";
import {
  createCanonicalSqlExecutionPlan,
  type CanonicalSqlExecutionPlan
} from "@canopy/database-runtime";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export type ActivityPubTransportDirection = "outbound" | "inbound";
export type ActivityPubTransportMessageKind = "export" | "import" | "sync";

export interface ActivityPubPeer {
  readonly ref: ObjectRef;
  readonly actorId: string;
  readonly inbox: string;
  readonly sharedInbox?: string;
}

export interface ActivityPubTransportRule {
  readonly federationRuleRef: ObjectRef;
  readonly peerRef: ObjectRef;
  readonly allowedObjectTypes: readonly CanopyObjectType[];
  readonly allowedEventTypes: readonly string[];
  readonly exportAllowed: boolean;
  readonly importAllowed: boolean;
  readonly redactionRequired: boolean;
  readonly blockedPayloadFields: readonly string[];
}

export interface ActivityPubActivityRecord {
  readonly id: CanopyId;
  readonly type: "Create" | "Announce";
  readonly actor: string;
  readonly to: readonly string[];
  readonly object: {
    readonly id: CanopyId;
    readonly type: "CanopyFederationMessage";
    readonly direction: ActivityPubTransportDirection;
    readonly messageKind: ActivityPubTransportMessageKind;
    readonly federationRuleRef: ObjectRef;
    readonly eventIds: readonly CanopyId[];
    readonly objectRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly contentHash?: ContentHash;
    readonly schemaVersion: number;
  };
  readonly published: IsoDateTime;
}

export interface ActivityPubStoredMessage {
  readonly message: FederationTransportMessage;
  readonly direction: ActivityPubTransportDirection;
  readonly messageKind: ActivityPubTransportMessageKind;
  readonly peerRef: ObjectRef;
  readonly activity: ActivityPubActivityRecord;
  readonly storedAt: IsoDateTime;
  readonly acknowledgedAt?: IsoDateTime;
}

export type ActivityPubInboundCanonicalStatus = "accepted" | "duplicate";

export interface ActivityPubInboundConflictReport {
  readonly messageId: CanopyId;
  readonly dedupeKey: string;
  readonly code: "message-id-conflict" | "missing-object-ref";
  readonly message: string;
  readonly existingMessageId?: CanopyId;
  readonly occurredAt: IsoDateTime;
}

export interface ActivityPubInboundCanonicalResult {
  readonly status: ActivityPubInboundCanonicalStatus;
  readonly dedupeKey: string;
  readonly message: FederationTransportMessage;
  readonly storedMessage: ActivityPubStoredMessage;
  readonly objectRefs: readonly CanonicalObjectRefRecord[];
  readonly mapping: CanonicalMappingRecord;
  readonly event: EventRecord;
  readonly outbox: OutboxRecord;
  readonly adapterAudit: AdapterAuditRecord;
  readonly canonicalRecords: readonly CanonicalDatabaseRecord[];
  readonly canonicalSqlPlan: CanonicalSqlExecutionPlan;
  readonly conflicts: readonly ActivityPubInboundConflictReport[];
}

export interface ActivityPubTransportPrototypeSnapshot {
  readonly outbox: readonly ActivityPubStoredMessage[];
  readonly inbox: readonly ActivityPubStoredMessage[];
  readonly acknowledgedMessageIds: readonly CanopyId[];
  readonly inboundCanonicalResults: readonly ActivityPubInboundCanonicalResult[];
  readonly inboundConflicts: readonly ActivityPubInboundConflictReport[];
  readonly inboundAdapterAudits: readonly AdapterAuditRecord[];
}

export interface ActivityPubTransportPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly localActorId?: string;
  readonly defaultPeer?: ActivityPubPeer;
  readonly rules?: readonly ActivityPubTransportRule[];
  readonly seedInbox?: readonly FederationTransportMessage[];
  readonly seedOutbox?: readonly FederationTransportMessage[];
}

export const activitypubTransportAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "federation-transport";
} = {
  id: "adapter.provider.activitypub.federation-transport",
  kind: "federation-transport",
  name: "ActivityPub federation transport adapter",
  provider: "activitypub",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: [
    "read",
    "write",
    "stream",
    "export",
    "import",
    "redaction",
    "audit"
  ],
  supportedObjectTypes: ["source", "decision-packet"],
  supportedEventTypes: ["federation.export.created", "federation.import.received"]
};

export const activitypubTransportAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.federation-transport.activitypub",
  descriptor: activitypubTransportAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/activitypub-transport",
  conformanceSuiteKind: "federation-transport",
  productionGates: [
    "adapter.federation-transport.envelope-integrity",
    "adapter.federation-transport.redaction-respected"
  ]
};

export function activitypubTransportAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: activitypubTransportAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the ActivityPub-shaped in-memory prototype; no network transport or external ActivityPub SDK is bound."
    ]
  };
}

export function createActivityPubTransportAdapter(
  options: ActivityPubTransportPrototypeOptions = {}
): ActivityPubTransportAdapter {
  return new ActivityPubTransportAdapter(options);
}

export class ActivityPubTransportAdapter implements FederationTransportAdapter {
  readonly descriptor = activitypubTransportAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly localActorId: string;
  private readonly defaultPeer: ActivityPubPeer;
  private readonly rules = new Map<string, ActivityPubTransportRule>();
  private readonly outbox = new Map<CanopyId, ActivityPubStoredMessage>();
  private readonly inbox = new Map<CanopyId, ActivityPubStoredMessage>();
  private readonly inboundCanonicalResults = new Map<CanopyId, ActivityPubInboundCanonicalResult>();
  private readonly inboundConflicts: ActivityPubInboundConflictReport[] = [];
  private readonly inboundAdapterAudits = new Map<CanopyId, AdapterAuditRecord>();
  private auditSequence = 0;

  constructor(options: ActivityPubTransportPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.localActorId = options.localActorId ?? "https://canopy.local/actors/canopy";
    this.defaultPeer = options.defaultPeer ?? defaultPeer();

    for (const rule of options.rules ?? []) {
      this.rules.set(refKey(rule.federationRuleRef), freezeRule(rule));
    }

    for (const message of options.seedOutbox ?? []) {
      this.store(message, "outbound");
    }

    for (const message of options.seedInbox ?? []) {
      this.store(message, "inbound");
    }
  }

  async health(): Promise<AdapterHealth> {
    return activitypubTransportAdapterHealth(this.now());
  }

  async send(
    message: FederationTransportMessage
  ): Promise<AdapterResult<FederationTransportMessage>> {
    const rule = this.ruleFor(message.federationRuleRef);
    const validation = validateMessageForRule(message, rule, "outbound");
    if (validation !== undefined) {
      return failure(validation.code, validation.message, validation.path);
    }

    const sanitized = sanitizeMessage(message, rule);
    const existing = this.outbox.get(sanitized.id);
    if (existing !== undefined) {
      if (stableStringify(existing.message) === stableStringify(sanitized)) {
        return ok(cloneMessage(existing.message));
      }

      return failure(
        "conflict",
        `Federation message ${sanitized.id} already exists and cannot be mutated.`,
        ["id"]
      );
    }

    const stored = this.store(sanitized, "outbound", rule);
    this.inbox.set(stored.message.id, cloneStoredMessage(stored, "inbound"));

    return ok(cloneMessage(stored.message));
  }

  async receive(
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<FederationTransportMessage>>> {
    const messages = [...this.inbox.values()]
      .sort(compareStoredMessages)
      .map((stored) => cloneMessage(stored.message));

    return ok(page(messages, pageRequest));
  }

  async acknowledge(
    messageId: CanopyId,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Acknowledging federation messages requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const stored = this.inbox.get(messageId);
    if (stored === undefined) {
      return failure("not_found", `Federation message ${messageId} was not found.`, [
        "messageId"
      ]);
    }

    this.inbox.set(
      messageId,
      freeze(
        withoutUndefined({
          ...stored,
          acknowledgedAt: this.now()
        }) as ActivityPubStoredMessage
      )
    );

    return ok(undefined);
  }

  async importMessage(
    message: FederationTransportMessage
  ): Promise<AdapterResult<FederationTransportMessage>> {
    const rule = this.ruleFor(message.federationRuleRef);
    const validation = validateMessageForRule(message, rule, "inbound");
    if (validation !== undefined) {
      return failure(validation.code, validation.message, validation.path);
    }

    const sanitized = sanitizeMessage(message, rule);
    const existing = this.inbox.get(sanitized.id);
    if (existing !== undefined) {
      if (
        stableStringify(stripTransportTimestamps(existing.message)) ===
        stableStringify(stripTransportTimestamps(sanitized))
      ) {
        return ok(cloneMessage(existing.message));
      }

      return failure(
        "conflict",
        `Inbound federation message ${sanitized.id} already exists and cannot be mutated.`,
        ["id"]
      );
    }

    const stored = this.store(sanitized, "inbound", rule);
    return ok(cloneMessage(stored.message));
  }

  async receiveCanonical(
    message: FederationTransportMessage
  ): Promise<AdapterResult<ActivityPubInboundCanonicalResult>> {
    const startedAt = this.now();
    const rule = this.ruleFor(message.federationRuleRef);
    const validation = validateMessageForRule(message, rule, "inbound");
    if (validation !== undefined) {
      this.recordInboundAuditForMessage(message, "failed", startedAt, {
        errors: [validation.message],
        metadata: toJsonValue({
          reason: validation.code,
          path: validation.path
        })
      });
      return failure(validation.code, validation.message, validation.path);
    }

    const sanitized = sanitizeMessage(message, rule);
    const dedupeKey = inboundDedupeKey(sanitized);
    if (sanitized.objectRefs.length === 0) {
      const report = this.recordInboundConflict({
        messageId: sanitized.id,
        dedupeKey,
        code: "missing-object-ref",
        message: "Inbound ActivityPub messages require at least one canonical object ref.",
        occurredAt: startedAt
      });
      this.recordInboundAuditForMessage(sanitized, "failed", startedAt, {
        errors: [report.message],
        metadata: toJsonValue({
          reason: report.code,
          dedupeKey,
          conflicts: [report]
        })
      });
      return failure("validation_failed", report.message, ["objectRefs"]);
    }

    const existing = this.inbox.get(sanitized.id);
    if (existing !== undefined) {
      if (
        stableStringify(stripTransportTimestamps(existing.message)) ===
        stableStringify(stripTransportTimestamps(sanitized))
      ) {
        const result = this.inboundCanonicalResultFromStored(
          existing,
          "duplicate",
          startedAt,
          []
        );
        this.inboundCanonicalResults.set(result.message.id, result);
        return ok(result);
      }

      const report = this.recordInboundConflict({
        messageId: sanitized.id,
        dedupeKey,
        code: "message-id-conflict",
        message: `Inbound federation message ${sanitized.id} already exists and cannot be mutated.`,
        existingMessageId: existing.message.id,
        occurredAt: startedAt
      });
      this.recordInboundAuditForMessage(sanitized, "failed", startedAt, {
        errors: [report.message],
        metadata: toJsonValue({
          reason: report.code,
          dedupeKey,
          conflicts: [report]
        })
      });
      return failure("conflict", report.message, ["id"]);
    }

    const stored = this.store(sanitized, "inbound", rule);
    const result = this.inboundCanonicalResultFromStored(stored, "accepted", startedAt, []);
    this.inboundCanonicalResults.set(result.message.id, result);
    return ok(result);
  }

  async exportMessages(
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<FederationTransportMessage>>> {
    const messages = [...this.outbox.values()]
      .sort(compareStoredMessages)
      .map((stored) => cloneMessage(stored.message));

    return ok(page(messages, pageRequest));
  }

  snapshot(): ActivityPubTransportPrototypeSnapshot {
    const outbox = [...this.outbox.values()]
      .sort(compareStoredMessages)
      .map((stored) => cloneStoredMessage(stored));
    const inbox = [...this.inbox.values()]
      .sort(compareStoredMessages)
      .map((stored) => cloneStoredMessage(stored));
    const acknowledgedMessageIds = inbox
      .filter((stored) => stored.acknowledgedAt !== undefined)
      .map((stored) => stored.message.id);

    return freeze({
      outbox,
      inbox,
      acknowledgedMessageIds,
      inboundCanonicalResults: sortedByString(
        this.inboundCanonicalResults.values(),
        (result) => result.message.id
      ).map((result) => freeze(result)),
      inboundConflicts: [...this.inboundConflicts].map((report) => freeze(report)),
      inboundAdapterAudits: sortedByString(
        this.inboundAdapterAudits.values(),
        (record) => record.id
      ).map((record) => freeze(record))
    });
  }

  private store(
    message: FederationTransportMessage,
    direction: ActivityPubTransportDirection,
    rule = this.ruleFor(message.federationRuleRef)
  ): ActivityPubStoredMessage {
    const peer = this.peerFor(rule);
    const stored = freeze(
      withoutUndefined({
        message: cloneMessageWithTimestamps(message, direction, this.now()),
        direction,
        messageKind: classifyMessage(message),
        peerRef: cloneRef(peer.ref),
        activity: activityFromMessage({
          message,
          direction,
          peer,
          actor: this.localActorId,
          published: this.now()
        }),
        storedAt: this.now()
      }) as ActivityPubStoredMessage
    );

    if (direction === "outbound") {
      this.outbox.set(stored.message.id, stored);
    } else {
      this.inbox.set(stored.message.id, stored);
    }

    return stored;
  }

  private ruleFor(federationRuleRef: ObjectRef): ActivityPubTransportRule | undefined {
    return this.rules.get(refKey(federationRuleRef));
  }

  private peerFor(rule: ActivityPubTransportRule | undefined): ActivityPubPeer {
    if (rule === undefined) {
      return this.defaultPeer;
    }

    const peer = {
      ref: cloneRef(rule.peerRef),
      actorId: `${this.defaultPeer.actorId}/${encodeURIComponent(rule.peerRef.id)}`,
      inbox: this.defaultPeer.inbox
    };

    if (this.defaultPeer.sharedInbox === undefined) {
      return peer;
    }

    return {
      ...peer,
      sharedInbox: this.defaultPeer.sharedInbox
    };
  }

  private inboundCanonicalResultFromStored(
    stored: ActivityPubStoredMessage,
    status: ActivityPubInboundCanonicalStatus,
    startedAt: IsoDateTime,
    conflicts: readonly ActivityPubInboundConflictReport[]
  ): ActivityPubInboundCanonicalResult {
    const message = cloneMessage(stored.message);
    const receivedAt = message.receivedAt ?? stored.storedAt;
    const dedupeKey = inboundDedupeKey(message);
    const objectRefs = uniqueRefs([
      ...message.objectRefs,
      message.federationRuleRef,
      stored.peerRef
    ]).map((ref) => objectRefRecord(ref, receivedAt));
    const mapping = mappingRecordFromMessage(message, receivedAt);
    const event = eventRecordFromInboundMessage(message, stored, receivedAt);
    const outbox = outboxRecordFromInboundMessage(message, event, stored, dedupeKey);
    const adapterAudit = this.recordInboundAuditForStored(stored, status, startedAt, {
      eventIds: [event.eventId],
      outboxIds: [outbox.id],
      metadata: toJsonValue({
        status,
        dedupeKey,
        messageKind: stored.messageKind,
        activityId: stored.activity.id,
        conflicts
      })
    });
    const canonicalRecords: readonly CanonicalDatabaseRecord[] = freeze([
      ...objectRefs,
      mapping,
      event,
      outbox,
      adapterAudit
    ]);

    return freeze({
      status,
      dedupeKey,
      message,
      storedMessage: cloneStoredMessage(stored),
      objectRefs,
      mapping,
      event,
      outbox,
      adapterAudit,
      canonicalRecords,
      canonicalSqlPlan: createCanonicalSqlExecutionPlan(canonicalRecords),
      conflicts
    });
  }

  private recordInboundConflict(
    report: ActivityPubInboundConflictReport
  ): ActivityPubInboundConflictReport {
    const stored = freeze(report);
    this.inboundConflicts.push(stored);
    return stored;
  }

  private recordInboundAuditForStored(
    stored: ActivityPubStoredMessage,
    status: ActivityPubInboundCanonicalStatus,
    startedAt: IsoDateTime,
    details: {
      readonly eventIds?: readonly CanopyId[];
      readonly outboxIds?: readonly CanopyId[];
      readonly errors?: readonly string[];
      readonly warnings?: readonly string[];
      readonly metadata?: JsonValue;
    } = {}
  ): AdapterAuditRecord {
    return this.recordInboundAuditForMessage(stored.message, status === "duplicate" ? "skipped" : "succeeded", startedAt, {
      ...details,
      externalRef: {
        provider: "activitypub",
        resourceType: "activity",
        resourceId: stored.activity.id,
        sourceProject: "canopy"
      },
      ...optionalTargetRef(stored.message.objectRefs[0])
    });
  }

  private recordInboundAuditForMessage(
    message: FederationTransportMessage,
    status: AdapterAuditRecord["status"],
    startedAt: IsoDateTime,
    details: {
      readonly eventIds?: readonly CanopyId[];
      readonly outboxIds?: readonly CanopyId[];
      readonly errors?: readonly string[];
      readonly warnings?: readonly string[];
      readonly metadata?: JsonValue;
      readonly externalRef?: AdapterAuditRecord["externalRef"];
      readonly targetRef?: ObjectRef;
    } = {}
  ): AdapterAuditRecord {
    const completedAt = this.now();
    const record: AdapterAuditRecord = freeze(
      withoutUndefined({
        id: `adapter-audit.activitypub.receive.${++this.auditSequence}`,
        kind: "adapter-audit",
        schemaVersion: 1,
        createdAt: completedAt,
        adapterName: activitypubTransportAdapterDescriptor.id,
        direction: "ingress",
        operation: "receiveCanonical",
        status,
        startedAt,
        completedAt,
        targetRef: details.targetRef ?? message.objectRefs[0],
        externalRef: details.externalRef,
        eventIds: details.eventIds ?? [],
        outboxIds: details.outboxIds ?? [],
        requestHash: message.contentHash,
        warnings: details.warnings ?? [],
        errors: details.errors ?? [],
        metadata: details.metadata ?? {}
      }) as AdapterAuditRecord
    );
    this.inboundAdapterAudits.set(record.id, record);
    return record;
  }
}

function objectRefRecord(ref: ObjectRef, timestamp: IsoDateTime): CanonicalObjectRefRecord {
  return freeze(
    withoutUndefined({
      id: `object-ref.${ref.namespace}.${ref.type}.${ref.id}`,
      kind: "canonical-object-ref",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      ref: cloneRef(ref),
      objectId: ref.id,
      objectType: ref.type,
      namespace: ref.namespace,
      lifecycleStatus: ref.lifecycleStatus,
      source: ref.source,
      supersedes: ref.supersedes ?? [],
      relationshipRefs: []
    }) as CanonicalObjectRefRecord
  );
}

function mappingRecordFromMessage(
  message: FederationTransportMessage,
  timestamp: IsoDateTime
): CanonicalMappingRecord {
  const canonicalRef = message.objectRefs[0] as ObjectRef;

  return freeze(
    withoutUndefined({
      id: `canonical-mapping.activitypub.${idToken(message.id)}`,
      kind: "canonical-mapping",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      contentHash: message.contentHash,
      source: {
        sourceProject: "canopy",
        sourceEntity: "activitypub-message",
        sourceId: message.id,
        sourceVersion: message.contentHash
      },
      sourcePointer: {
        sourceProject: "canopy",
        sourceEntity: "activitypub-message",
        sourceId: message.id,
        sourceVersion: message.contentHash,
        importedAt: timestamp
      },
      localLabel: stringPayloadValue(message.payload, "importEnvelopeId") ??
        stringPayloadValue(message.payload, "envelopeId") ??
        message.id,
      localType: classifyMessage(message),
      canonicalRef: cloneRef(canonicalRef),
      canonicalType: canonicalRef.type,
      disposition: "artifact",
      status: "approved",
      confidence: 1,
      mappedByRef: cloneRef(message.federationRuleRef),
      authorityRefs: [cloneRef(message.federationRuleRef)],
      evidenceRefs: message.objectRefs.map(cloneRef),
      reviewedAt: timestamp
    }) as CanonicalMappingRecord
  );
}

function eventRecordFromInboundMessage(
  message: FederationTransportMessage,
  stored: ActivityPubStoredMessage,
  timestamp: IsoDateTime
): EventRecord {
  const event = inboundEventFromMessage(message, stored, timestamp);

  return freeze(
    withoutUndefined({
      id: `event.${event.id}`,
      kind: "event",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      contentHash: event.contentHash,
      eventId: event.id,
      eventType: event.type,
      occurredAt: event.occurredAt,
      recordedAt: timestamp,
      systemActor: event.systemActor,
      objectRef: cloneRef(event.objectRef),
      relatedRefs: event.relatedRefs.map(cloneRef),
      authorityRefs: event.authorityRefs.map(cloneRef),
      scope: {},
      sourceCapability: event.sourceCapability,
      visibility: event.visibility,
      dataState: event.dataState,
      payload: toJsonValue(event.payload),
      event
    }) as EventRecord
  );
}

function inboundEventFromMessage(
  message: FederationTransportMessage,
  stored: ActivityPubStoredMessage,
  timestamp: IsoDateTime
): CanopyEvent {
  const objectRef = message.objectRefs[0] as ObjectRef;
  const relatedRefs = uniqueRefs([
    ...message.objectRefs.slice(1),
    message.federationRuleRef,
    stored.peerRef
  ]);

  return freeze(
    withoutUndefined({
      id: inboundEventId(message),
      type: "federation.import.received",
      occurredAt: message.receivedAt ?? timestamp,
      systemActor: "federation_peer",
      objectRef: cloneRef(objectRef),
      relatedRefs,
      authorityRefs: [cloneRef(message.federationRuleRef)],
      sourceCapability: "federation",
      payload: {
        messageId: message.id,
        activityId: stored.activity.id,
        messageKind: stored.messageKind,
        eventIds: [...message.eventIds],
        objectRefs: message.objectRefs.map(refKey),
        contentHash: message.contentHash,
        dedupeKey: inboundDedupeKey(message),
        payload: cloneRecord(message.payload)
      },
      schemaVersion: 1,
      visibility: "federation",
      dataState: "unverified",
      contentHash: message.contentHash
    }) as CanopyEvent
  );
}

function outboxRecordFromInboundMessage(
  message: FederationTransportMessage,
  event: EventRecord,
  stored: ActivityPubStoredMessage,
  dedupeKey: string
): OutboxRecord {
  return freeze({
    id: `outbox.${event.eventId}.federation-receive`,
    kind: "outbox",
    schemaVersion: 1,
    createdAt: event.recordedAt,
    ...optionalContentHash(message.contentHash),
    eventId: event.eventId,
    eventType: event.eventType,
    destination: {
      kind: "workflow",
      name: "federation-receive",
      targetRef: cloneRef(event.objectRef)
    },
    status: "pending",
    payload: toJsonValue({
      messageId: message.id,
      activityId: stored.activity.id,
      canonicalRef: refKey(event.objectRef),
      receivedAt: event.recordedAt,
      dedupeKey
    }),
    dedupeKey,
    attemptCount: 0
  });
}

function inboundEventId(message: FederationTransportMessage): CanopyId {
  return (
    message.eventIds.find((eventId) => eventId.includes("federation.import.received")) ??
    `event.federation.import.received.${idToken(message.id)}`
  );
}

function inboundDedupeKey(message: FederationTransportMessage): string {
  return `activitypub:inbound:${message.id}`;
}

function uniqueRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  const byKey = new Map<string, ObjectRef>();
  for (const ref of refs) {
    byKey.set(refKey(ref), cloneRef(ref));
  }
  return [...byKey.values()];
}

function stringPayloadValue(
  payload: Readonly<Record<string, unknown>>,
  key: string
): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function idToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function validateMessageForRule(
  message: FederationTransportMessage,
  rule: ActivityPubTransportRule | undefined,
  direction: ActivityPubTransportDirection
): AdapterError | undefined {
  if (message.schemaVersion < 1) {
    return error("schema_mismatch", "Federation messages require a positive schema version.", [
      "schemaVersion"
    ]);
  }

  if (message.contentHash !== undefined && !message.contentHash.startsWith("sha")) {
    return error("validation_failed", "Federation message content hashes must include an algorithm prefix.", [
      "contentHash"
    ]);
  }

  if (rule === undefined) {
    return undefined;
  }

  if (direction === "outbound" && !rule.exportAllowed) {
    return error("forbidden", "Federation rule does not allow export.", [
      "federationRuleRef"
    ]);
  }

  if (direction === "inbound" && !rule.importAllowed) {
    return error("forbidden", "Federation rule does not allow import.", [
      "federationRuleRef"
    ]);
  }

  const blockedObjectRef = message.objectRefs.find(
    (ref) =>
      ref.lifecycleStatus !== "redacted" &&
      rule.allowedObjectTypes.length > 0 &&
      !rule.allowedObjectTypes.includes(ref.type)
  );
  if (blockedObjectRef !== undefined) {
    return error(
      "forbidden",
      `Federation rule does not allow object type ${blockedObjectRef.type}.`,
      ["objectRefs"]
    );
  }

  const blockedEventId = message.eventIds.find(
    (eventId) =>
      rule.allowedEventTypes.length > 0 &&
      !rule.allowedEventTypes.some((eventType) => eventId.includes(eventType))
  );
  if (blockedEventId !== undefined) {
    return error(
      "forbidden",
      `Federation rule does not allow event ${blockedEventId}.`,
      ["eventIds"]
    );
  }

  if (rule.redactionRequired && redactionFields(message).length === 0) {
    const hasSensitiveRef = message.objectRefs.some((ref) => ref.lifecycleStatus === "redacted");
    if (hasSensitiveRef) {
      return error(
        "redaction_required",
        "Federation rule requires redaction review before sending redacted refs.",
        ["payload", "redactionSummary"]
      );
    }
  }

  return undefined;
}

function sanitizeMessage(
  message: FederationTransportMessage,
  rule: ActivityPubTransportRule | undefined
): FederationTransportMessage {
  const removedFields = new Set([
    ...redactionFields(message),
    ...(rule?.blockedPayloadFields ?? [])
  ]);
  const payload = removePayloadFields(message.payload, removedFields);
  const objectRefs = message.objectRefs.map((ref) =>
    ref.lifecycleStatus === "redacted" ? redactedStubRef(ref) : cloneRef(ref)
  );

  const sanitized = {
    id: message.id,
    federationRuleRef: cloneRef(message.federationRuleRef),
    eventIds: [...message.eventIds],
    objectRefs,
    payload,
    schemaVersion: message.schemaVersion
  };
  const withContentHash =
    message.contentHash === undefined
      ? sanitized
      : { ...sanitized, contentHash: message.contentHash };
  const withSentAt =
    message.sentAt === undefined ? withContentHash : { ...withContentHash, sentAt: message.sentAt };
  const withReceivedAt =
    message.receivedAt === undefined
      ? withSentAt
      : { ...withSentAt, receivedAt: message.receivedAt };

  return freeze(withReceivedAt);
}

function redactionFields(message: FederationTransportMessage): readonly string[] {
  const redactionSummary = message.payload.redactionSummary;
  if (!isRecord(redactionSummary) || !Array.isArray(redactionSummary.removedFields)) {
    return [];
  }

  return redactionSummary.removedFields.filter((field): field is string => typeof field === "string");
}

function removePayloadFields(
  value: unknown,
  removedFields: ReadonlySet<string>
): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([key]) => !removedFields.has(key))
    .map(([key, entryValue]) => [key, removeFieldFromValue(entryValue, removedFields)] as const);

  return freeze(Object.fromEntries(entries));
}

function removeFieldFromValue(value: unknown, removedFields: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => removeFieldFromValue(item, removedFields));
  }

  if (!isRecord(value)) {
    return value;
  }

  return removePayloadFields(value, removedFields);
}

function cloneMessageWithTimestamps(
  message: FederationTransportMessage,
  direction: ActivityPubTransportDirection,
  timestamp: IsoDateTime
): FederationTransportMessage {
  return freeze(
    withoutUndefined({
      ...cloneMessage(message),
      sentAt: message.sentAt ?? (direction === "outbound" ? timestamp : undefined),
      receivedAt: message.receivedAt ?? (direction === "inbound" ? timestamp : undefined)
    }) as FederationTransportMessage
  );
}

function activityFromMessage(input: {
  readonly message: FederationTransportMessage;
  readonly direction: ActivityPubTransportDirection;
  readonly peer: ActivityPubPeer;
  readonly actor: string;
  readonly published: IsoDateTime;
}): ActivityPubActivityRecord {
  const message = cloneMessage(input.message);

  return freeze(
    withoutUndefined({
      id: `activitypub.activity.${input.direction}.${message.id}`,
      type: input.direction === "outbound" ? "Create" : "Announce",
      actor: input.actor,
      to: [input.peer.actorId],
      object: withoutUndefined({
        id: message.id,
        type: "CanopyFederationMessage",
        direction: input.direction,
        messageKind: classifyMessage(message),
        federationRuleRef: cloneRef(message.federationRuleRef),
        eventIds: [...message.eventIds],
        objectRefs: message.objectRefs.map(cloneRef),
        payload: cloneRecord(message.payload),
        contentHash: message.contentHash,
        schemaVersion: message.schemaVersion
      }),
      published: input.published
    }) as ActivityPubActivityRecord
  );
}

function classifyMessage(message: FederationTransportMessage): ActivityPubTransportMessageKind {
  const eventText = message.eventIds.join(" ");
  const payloadText = stableStringify(message.payload);

  if (eventText.includes("import") || payloadText.includes("import")) {
    return "import";
  }

  if (eventText.includes("export") || payloadText.includes("export")) {
    return "export";
  }

  return "sync";
}

function cloneStoredMessage(
  stored: ActivityPubStoredMessage,
  direction: ActivityPubTransportDirection = stored.direction
): ActivityPubStoredMessage {
  return freeze(
    withoutUndefined({
      ...stored,
      direction,
      message: cloneMessageWithTimestamps(stored.message, direction, stored.storedAt),
      peerRef: cloneRef(stored.peerRef),
      activity: cloneActivity(stored.activity, direction),
      acknowledgedAt: stored.acknowledgedAt
    }) as ActivityPubStoredMessage
  );
}

function cloneActivity(
  activity: ActivityPubActivityRecord,
  direction: ActivityPubTransportDirection
): ActivityPubActivityRecord {
  return freeze(
    withoutUndefined({
      ...activity,
      object: withoutUndefined({
        ...activity.object,
        direction,
        federationRuleRef: cloneRef(activity.object.federationRuleRef),
        eventIds: [...activity.object.eventIds],
        objectRefs: activity.object.objectRefs.map(cloneRef),
        payload: cloneRecord(activity.object.payload),
        contentHash: activity.object.contentHash
      }),
      to: [...activity.to]
    }) as ActivityPubActivityRecord
  );
}

function cloneMessage(message: FederationTransportMessage): FederationTransportMessage {
  return freeze(
    withoutUndefined({
      ...message,
      federationRuleRef: cloneRef(message.federationRuleRef),
      sentAt: message.sentAt,
      receivedAt: message.receivedAt,
      eventIds: [...message.eventIds],
      objectRefs: message.objectRefs.map(cloneRef),
      payload: cloneRecord(message.payload),
      contentHash: message.contentHash
    }) as FederationTransportMessage
  );
}

function stripTransportTimestamps(
  message: FederationTransportMessage
): FederationTransportMessage {
  const { receivedAt: _receivedAt, sentAt: _sentAt, ...withoutTimestamps } = cloneMessage(message);
  return freeze(withoutTimestamps);
}

function freezeRule(rule: ActivityPubTransportRule): ActivityPubTransportRule {
  return freeze({
    ...rule,
    federationRuleRef: cloneRef(rule.federationRuleRef),
    peerRef: cloneRef(rule.peerRef),
    allowedObjectTypes: [...rule.allowedObjectTypes],
    allowedEventTypes: [...rule.allowedEventTypes],
    blockedPayloadFields: [...rule.blockedPayloadFields]
  });
}

function redactedStubRef(ref: ObjectRef): ObjectRef {
  return freeze(
    withoutUndefined({
      id: ref.id,
      type: ref.type,
      namespace: ref.namespace,
      lifecycleStatus: "redacted",
      source: ref.source
    }) as ObjectRef
  );
}

function defaultPeer(): ActivityPubPeer {
  return {
    ref: {
      id: "federation-peer.activitypub.prototype",
      type: "source",
      namespace: "canopy.provider.activitypub",
      lifecycleStatus: "active"
    },
    actorId: "https://peer.example/actors/canopy",
    inbox: "https://peer.example/inbox",
    sharedInbox: "https://peer.example/shared-inbox"
  };
}

function page<TValue>(
  items: readonly TValue[],
  request: AdapterPageRequest = {}
): AdapterPage<TValue> {
  const offset = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const start = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const limit = request.limit ?? items.length;
  const pageItems = items.slice(start, start + limit);
  const nextOffset = start + pageItems.length;

  const adapterPage = {
    items: pageItems,
    hasMore: nextOffset < items.length
  };

  if (nextOffset >= items.length) {
    return adapterPage;
  }

  return {
    ...adapterPage,
    nextCursor: String(nextOffset)
  };
}

function compareStoredMessages(
  left: ActivityPubStoredMessage,
  right: ActivityPubStoredMessage
): number {
  return compareStrings(left.storedAt, right.storedAt) || compareStrings(left.message.id, right.message.id);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function sortedByString<TValue>(
  values: Iterable<TValue>,
  value: (entry: TValue) => string
): readonly TValue[] {
  return [...values].sort((left, right) => compareStrings(value(left), value(right)));
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}:${ref.lifecycleStatus}`;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(
    withoutUndefined({
      ...ref,
      source: ref.source === undefined ? undefined : { ...ref.source },
      supersedes: ref.supersedes === undefined ? undefined : [...ref.supersedes]
    }) as ObjectRef
  );
}

function cloneRecord(record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return freeze(JSON.parse(JSON.stringify(record)) as Readonly<Record<string, unknown>>);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }

  if (isRecord(value)) {
    const record: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined && typeof child !== "function" && typeof child !== "symbol") {
        record[key] = toJsonValue(child);
      }
    }
    return record;
  }

  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ok<TValue>(value: TValue): AdapterResult<TValue> {
  return { ok: true, value, errors: [] };
}

function failure<TValue>(
  code: AdapterError["code"],
  message: string,
  path: readonly string[],
  retryable = false
): AdapterResult<TValue> {
  return { ok: false, errors: [error(code, message, path, retryable)] };
}

function error(
  code: AdapterError["code"],
  message: string,
  path: readonly string[],
  retryable = false
): AdapterError {
  return {
    code,
    message,
    retryable,
    path
  };
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

function withoutUndefined<TValue extends Readonly<Record<string, unknown>>>(
  value: TValue
): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as TValue;
}

function optionalTargetRef(ref: ObjectRef | undefined): { readonly targetRef?: ObjectRef } {
  return ref === undefined ? {} : { targetRef: ref };
}

function optionalContentHash(
  contentHash: string | undefined
): { readonly contentHash?: string } {
  return contentHash === undefined ? {} : { contentHash };
}

function freeze<TValue>(value: TValue): TValue {
  return Object.freeze(value);
}
