import type {
  CanopyEvent,
  CanopyId,
  IsoDateTime,
  ObjectRef,
} from "@canopy/contracts-kernel";
import type { CivicMemoryService } from "@canopy/kernel-civic-memory";
import type { ObjectRegistry } from "@canopy/kernel-object-registry";

export const ALLOCATION_ACCOUNTING_CAPABILITY = "allocation-accounting" as const;

export type LedgerSide = "debit" | "credit";

export interface AllocationAccountingContext {
  readonly objectRegistry: ObjectRegistry;
  readonly civicMemory: CivicMemoryService;
}

export interface LedgerLine {
  readonly accountRef: ObjectRef;
  readonly side: LedgerSide;
  readonly amount: number;
  readonly unit: string;
  readonly memo?: string;
  readonly relatedRefs?: readonly ObjectRef[];
}

export interface CreateLedgerAccountCommand extends EventCommandMetadata {
  readonly ledgerAccountRef: ObjectRef;
  readonly parentLedgerAccountRef?: ObjectRef;
  readonly stewardRefs?: readonly ObjectRef[];
  readonly accountCode?: string;
  readonly label?: string;
  readonly normalSide?: LedgerSide;
}

export interface PostLedgerEntryCommand extends EventCommandMetadata {
  readonly ledgerEntryRef: ObjectRef;
  readonly lines: readonly LedgerLine[];
  readonly memo?: string;
  readonly effectiveAt?: IsoDateTime;
}

export interface ReverseLedgerEntryCommand extends EventCommandMetadata {
  readonly reversalLedgerEntryRef: ObjectRef;
  readonly originalEventId: CanopyId;
  readonly memo?: string;
  readonly effectiveAt?: IsoDateTime;
}

export interface EventCommandMetadata {
  readonly commandId?: CanopyId;
  readonly eventId?: CanopyId;
  readonly occurredAt: IsoDateTime;
  readonly actorRef?: ObjectRef;
  readonly authorityRefs?: readonly ObjectRef[];
  readonly orgId?: CanopyId;
  readonly placeId?: CanopyId;
  readonly commonsId?: CanopyId;
  readonly livingSystemId?: CanopyId;
  readonly visibility?: CanopyEvent["visibility"];
  readonly dataState?: CanopyEvent["dataState"];
}

export interface AllocationAccountingResult {
  readonly ref: ObjectRef;
  readonly event: CanopyEvent;
}

export class AllocationAccountingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AllocationAccountingError";
    this.code = code;
  }
}

export interface AllocationAccountingHandlers {
  createLedgerAccount(
    command: CreateLedgerAccountCommand
  ): AllocationAccountingResult;
  postLedgerEntry(command: PostLedgerEntryCommand): AllocationAccountingResult;
  reverseLedgerEntry(
    command: ReverseLedgerEntryCommand
  ): AllocationAccountingResult;
}

export function createAllocationAccountingHandlers(
  context: AllocationAccountingContext
): AllocationAccountingHandlers {
  return {
    createLedgerAccount: (command) => createLedgerAccount(context, command),
    postLedgerEntry: (command) => postLedgerEntry(context, command),
    reverseLedgerEntry: (command) => reverseLedgerEntry(context, command),
  };
}

export function createLedgerAccount(
  context: AllocationAccountingContext,
  command: CreateLedgerAccountCommand
): AllocationAccountingResult {
  assertObjectRefType(command.ledgerAccountRef, "ledger-account", "ledgerAccountRef");
  if (command.parentLedgerAccountRef !== undefined) {
    requireRegisteredRef(
      context.objectRegistry,
      command.parentLedgerAccountRef,
      "ledger-account",
      "parentLedgerAccountRef"
    );
  }

  const ref = context.objectRegistry.register(command.ledgerAccountRef);
  const relatedRefs = compactRefs([
    command.parentLedgerAccountRef,
    ...(command.stewardRefs ?? []),
  ]);
  const event = buildEvent(command, {
    type: "accounting.ledger_account.created",
    defaultEventId: `event.accounting.ledger_account.created.${ref.id}`,
    objectRef: ref,
    relatedRefs,
    authorityRefs: command.authorityRefs ?? [],
    payload: {
      accountCode: command.accountCode,
      label: command.label,
      normalSide: command.normalSide,
      parentLedgerAccountRefId: command.parentLedgerAccountRef?.id,
      stewardRefIds: (command.stewardRefs ?? []).map((stewardRef) => stewardRef.id),
    },
  });

  return {
    ref,
    event: context.civicMemory.appendEvent(event).event,
  };
}

export function postLedgerEntry(
  context: AllocationAccountingContext,
  command: PostLedgerEntryCommand
): AllocationAccountingResult {
  assertObjectRefType(command.ledgerEntryRef, "ledger-entry", "ledgerEntryRef");
  assertAuthorityRefs(command.authorityRefs);
  const normalizedLines = normalizeLines(context.objectRegistry, command.lines);
  assertBalanced(normalizedLines);

  const ref = context.objectRegistry.register(command.ledgerEntryRef);
  const lineRefs = normalizedLines.flatMap((line) => [
    line.accountRef,
    ...(line.relatedRefs ?? []),
  ]);
  const event = buildEvent(command, {
    type: "accounting.ledger_entry.posted",
    defaultEventId: `event.accounting.ledger_entry.posted.${ref.id}`,
    objectRef: ref,
    relatedRefs: dedupeRefs(lineRefs),
    authorityRefs: command.authorityRefs,
    payload: {
      effectiveAt: command.effectiveAt ?? command.occurredAt,
      memo: command.memo,
      lines: normalizedLines.map(lineToPayload),
      totals: totalsPayload(normalizedLines),
    },
  });

  return {
    ref,
    event: context.civicMemory.appendEvent(event).event,
  };
}

export function reverseLedgerEntry(
  context: AllocationAccountingContext,
  command: ReverseLedgerEntryCommand
): AllocationAccountingResult {
  assertObjectRefType(
    command.reversalLedgerEntryRef,
    "ledger-entry",
    "reversalLedgerEntryRef"
  );
  assertAuthorityRefs(command.authorityRefs);

  const originalEvent = context.civicMemory.getEvent(command.originalEventId);
  if (originalEvent === undefined) {
    throw new AllocationAccountingError(
      "unknown-original-event",
      `Original ledger event ${command.originalEventId} is not in civic memory.`
    );
  }

  if (originalEvent.type !== "accounting.ledger_entry.posted") {
    throw new AllocationAccountingError(
      "not-posted-ledger-entry",
      `Original event ${command.originalEventId} is not a posted ledger entry.`
    );
  }

  assertNotAlreadyReversed(context.civicMemory, originalEvent);
  const originalLines = readPostedLines(originalEvent);
  const reversalLines = normalizeLines(
    context.objectRegistry,
    originalLines.map((line) => ({
      ...line,
      side: oppositeSide(line.side),
    }))
  );
  assertBalanced(reversalLines);

  const ref = context.objectRegistry.register(command.reversalLedgerEntryRef);
  const event = buildEvent(command, {
    type: "accounting.ledger_entry.reversed",
    defaultEventId: `event.accounting.ledger_entry.reversed.${ref.id}`,
    objectRef: ref,
    relatedRefs: dedupeRefs([
      originalEvent.objectRef,
      ...originalEvent.relatedRefs,
      ...reversalLines.map((line) => line.accountRef),
    ]),
    authorityRefs: command.authorityRefs,
    payload: {
      effectiveAt: command.effectiveAt ?? command.occurredAt,
      memo: command.memo,
      originalEventId: originalEvent.id,
      originalLedgerEntryRefId: originalEvent.objectRef.id,
      lines: reversalLines.map(lineToPayload),
      totals: totalsPayload(reversalLines),
    },
    supersedesEventId: originalEvent.id,
    supersession: {
      supersedesEventId: originalEvent.id,
      supersededAt: command.occurredAt,
      reason: command.memo ?? "ledger entry reversed",
      replacementObjectRef: ref,
      authorityRefs: command.authorityRefs,
    },
  });

  return {
    ref,
    event: context.civicMemory.appendEvent(event).event,
  };
}

function buildEvent(
  metadata: EventCommandMetadata,
  options: {
    readonly type: CanopyEvent["type"];
    readonly defaultEventId: CanopyId;
    readonly objectRef: ObjectRef;
    readonly relatedRefs: readonly ObjectRef[];
    readonly authorityRefs: readonly ObjectRef[];
    readonly payload: Readonly<Record<string, unknown>>;
    readonly supersedesEventId?: CanopyId;
    readonly supersession?: CanopyEvent["supersession"];
  }
): CanopyEvent {
  const event: CanopyEvent = {
    id: metadata.eventId ?? metadata.commandId ?? options.defaultEventId,
    type: options.type,
    occurredAt: metadata.occurredAt,
    objectRef: options.objectRef,
    relatedRefs: options.relatedRefs,
    authorityRefs: options.authorityRefs,
    sourceCapability: ALLOCATION_ACCOUNTING_CAPABILITY,
    payload: stripUndefined(options.payload),
    schemaVersion: 1,
    visibility: metadata.visibility ?? "organization",
  };

  return stripUndefined({
    ...event,
    actorRef: metadata.actorRef,
    orgId: metadata.orgId,
    placeId: metadata.placeId,
    commonsId: metadata.commonsId,
    livingSystemId: metadata.livingSystemId,
    dataState: metadata.dataState,
    supersedesEventId: options.supersedesEventId,
    supersession: options.supersession,
  }) as unknown as CanopyEvent;
}

function normalizeLines(
  registry: ObjectRegistry,
  lines: readonly LedgerLine[]
): readonly LedgerLine[] {
  if (lines.length < 2) {
    throw new AllocationAccountingError(
      "insufficient-ledger-lines",
      "A ledger entry requires at least two lines."
    );
  }

  return lines.map((line, index) => {
    if (line.side !== "debit" && line.side !== "credit") {
      throw new AllocationAccountingError(
        "invalid-ledger-side",
        `Ledger line ${index} has invalid side ${String(line.side)}.`
      );
    }

    if (!Number.isSafeInteger(line.amount) || line.amount <= 0) {
      throw new AllocationAccountingError(
        "invalid-ledger-amount",
        `Ledger line ${index} amount must be a positive safe integer.`
      );
    }

    if (line.unit.trim() === "") {
      throw new AllocationAccountingError(
        "missing-ledger-unit",
        `Ledger line ${index} must include a non-empty unit.`
      );
    }

    const accountRef = requireRegisteredRef(
      registry,
      line.accountRef,
      "ledger-account",
      `lines[${index}].accountRef`
    );

    return {
      ...line,
      accountRef,
      unit: line.unit.trim(),
    };
  });
}

function requireRegisteredRef(
  registry: ObjectRegistry,
  ref: ObjectRef,
  type: ObjectRef["type"],
  label: string
): ObjectRef {
  assertObjectRefType(ref, type, label);
  const registered = registry.require(ref);
  assertObjectRefType(registered, type, label);
  return registered;
}

function assertObjectRefType(
  ref: ObjectRef,
  type: ObjectRef["type"],
  label: string
): void {
  if (ref.type !== type) {
    throw new AllocationAccountingError(
      "invalid-object-ref-type",
      `${label} must reference ObjectRef type ${type}; received ${ref.type}.`
    );
  }
}

function assertAuthorityRefs(
  authorityRefs: readonly ObjectRef[] | undefined
): asserts authorityRefs is readonly ObjectRef[] {
  if (authorityRefs === undefined || authorityRefs.length === 0) {
    throw new AllocationAccountingError(
      "missing-authority-refs",
      "Posting and reversing ledger entries require authorityRefs."
    );
  }
}

function assertBalanced(lines: readonly LedgerLine[]): void {
  for (const [unit, totals] of totalsByUnit(lines).entries()) {
    if (totals.debit !== totals.credit) {
      throw new AllocationAccountingError(
        "unbalanced-ledger-entry",
        `Ledger entry is not balanced for ${unit}: debit ${totals.debit}, credit ${totals.credit}.`
      );
    }
  }
}

function totalsByUnit(
  lines: readonly LedgerLine[]
): Map<string, { debit: number; credit: number }> {
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const line of lines) {
    const unitTotals = totals.get(line.unit) ?? { debit: 0, credit: 0 };
    const nextTotals = {
      debit: unitTotals.debit + (line.side === "debit" ? line.amount : 0),
      credit: unitTotals.credit + (line.side === "credit" ? line.amount : 0),
    };
    totals.set(line.unit, nextTotals);
  }

  return totals;
}

function totalsPayload(
  lines: readonly LedgerLine[]
): Readonly<Record<string, { debit: number; credit: number }>> {
  return Object.fromEntries(totalsByUnit(lines));
}

function lineToPayload(line: LedgerLine): Readonly<Record<string, unknown>> {
  return stripUndefined({
    accountRefId: line.accountRef.id,
    accountRef: line.accountRef,
    side: line.side,
    amount: line.amount,
    unit: line.unit,
    memo: line.memo,
    relatedRefIds: (line.relatedRefs ?? []).map((ref) => ref.id),
  });
}

function readPostedLines(event: CanopyEvent): readonly LedgerLine[] {
  const lines = event.payload["lines"];
  if (!Array.isArray(lines)) {
    throw new AllocationAccountingError(
      "unreadable-ledger-lines",
      `Posted ledger entry ${event.id} does not include line payloads.`
    );
  }

  return lines.map((line, index) => {
    if (!isLinePayload(line)) {
      throw new AllocationAccountingError(
        "unreadable-ledger-lines",
        `Posted ledger entry ${event.id} line ${index} is not readable.`
      );
    }

    return stripUndefined({
      accountRef: line.accountRef,
      side: line.side,
      amount: line.amount,
      unit: line.unit,
      memo: line.memo,
    }) as unknown as LedgerLine;
  });
}

function isLinePayload(value: unknown): value is {
  readonly accountRef: ObjectRef;
  readonly side: LedgerSide;
  readonly amount: number;
  readonly unit: string;
  readonly memo?: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<{
    readonly accountRef: ObjectRef;
    readonly side: LedgerSide;
    readonly amount: number;
    readonly unit: string;
    readonly memo: string;
  }>;

  return (
    isObjectRef(candidate.accountRef) &&
    (candidate.side === "debit" || candidate.side === "credit") &&
    typeof candidate.amount === "number" &&
    typeof candidate.unit === "string" &&
    (candidate.memo === undefined || typeof candidate.memo === "string")
  );
}

function isObjectRef(value: unknown): value is ObjectRef {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ObjectRef>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.namespace === "string" &&
    typeof candidate.lifecycleStatus === "string"
  );
}

function assertNotAlreadyReversed(
  memory: CivicMemoryService,
  originalEvent: CanopyEvent
): void {
  const reversalEvents = memory.queryEvents({
    eventTypes: ["accounting.ledger_entry.reversed"],
    relatedRefIds: [originalEvent.objectRef.id],
  });

  if (
    reversalEvents.some(
      (event) =>
        event.supersedesEventId === originalEvent.id ||
        event.payload["originalEventId"] === originalEvent.id
    )
  ) {
    throw new AllocationAccountingError(
      "ledger-entry-already-reversed",
      `Ledger entry event ${originalEvent.id} already has reversal continuity.`
    );
  }
}

function oppositeSide(side: LedgerSide): LedgerSide {
  return side === "debit" ? "credit" : "debit";
}

function compactRefs(
  refs: readonly (ObjectRef | undefined)[]
): readonly ObjectRef[] {
  return refs.filter((ref): ref is ObjectRef => ref !== undefined);
}

function dedupeRefs(refs: readonly ObjectRef[]): readonly ObjectRef[] {
  const seen = new Set<CanopyId>();
  const deduped: ObjectRef[] = [];

  for (const ref of refs) {
    if (!seen.has(ref.id)) {
      seen.add(ref.id);
      deduped.push(ref);
    }
  }

  return deduped;
}

function stripUndefined<T extends Readonly<Record<string, unknown>>>(
  record: T
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}
