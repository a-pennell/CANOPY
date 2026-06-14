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
  CanopyObjectType,
  ContentHash,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";

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

export interface ActivityPubTransportPrototypeSnapshot {
  readonly outbox: readonly ActivityPubStoredMessage[];
  readonly inbox: readonly ActivityPubStoredMessage[];
  readonly acknowledgedMessageIds: readonly CanopyId[];
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

    const stored = this.store(sanitizeMessage(message, rule), "inbound", rule);
    return ok(cloneMessage(stored.message));
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
      acknowledgedMessageIds
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

function freeze<TValue>(value: TValue): TValue {
  return Object.freeze(value);
}
