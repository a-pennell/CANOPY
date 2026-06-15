import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  AllocationAccountingError,
  type PostLedgerEntryCommand,
  createCommitment,
  createLedgerAccount,
  createNeed,
  createOffer,
  postLedgerEntry,
  reverseLedgerEntry,
} from "./index.js";

const occurredAt = "2026-06-13T12:00:00.000Z";

const authorityRef: ObjectRef = {
  id: "canopy:mandate:finance-steward",
  type: "mandate",
  namespace: "governance",
  lifecycleStatus: "active",
};

const cashRef: ObjectRef = {
  id: "canopy:ledger-account:cash",
  type: "ledger-account",
  namespace: "allocation-accounting",
  lifecycleStatus: "active",
};

const revenueRef: ObjectRef = {
  id: "canopy:ledger-account:member-dues",
  type: "ledger-account",
  namespace: "allocation-accounting",
  lifecycleStatus: "active",
};

const authAccountRef: ObjectRef = {
  id: "canopy:account:mira",
  type: "account",
  namespace: "identity",
  lifecycleStatus: "active",
};

const needRef: ObjectRef = {
  id: "canopy:need:school-produce",
  type: "need",
  namespace: "allocation-accounting",
  lifecycleStatus: "active",
};

const offerRef: ObjectRef = {
  id: "canopy:offer:green-acre-produce",
  type: "offer",
  namespace: "allocation-accounting",
  lifecycleStatus: "active",
};

const commitmentRef: ObjectRef = {
  id: "canopy:commitment:produce-delivery",
  type: "commitment",
  namespace: "allocation-accounting",
  lifecycleStatus: "active",
};

function createContext() {
  return {
    objectRegistry: createObjectRegistry({ refs: [authorityRef] }),
    civicMemory: createInMemoryCivicMemory(),
  };
}

describe("allocation accounting capability", () => {
  it("creates coordination needs, offers, and commitments", () => {
    const context = createContext();
    const need = createNeed(context, {
      eventId: "event.need.created",
      occurredAt,
      needRef,
      relatedRefs: [authorityRef],
      authorityRefs: [authorityRef],
      title: "School produce need",
      quantity: "20 boxes",
    });
    const offer = createOffer(context, {
      eventId: "event.offer.created",
      occurredAt,
      offerRef,
      relatedRefs: [needRef],
      authorityRefs: [authorityRef],
      title: "Green Acre produce offer",
      quantity: "20 boxes",
    });
    const commitment = createCommitment(context, {
      eventId: "event.commitment.created",
      occurredAt,
      commitmentRef,
      relatedRefs: [needRef, offerRef],
      committedByRef: authorityRef,
      authorityRefs: [authorityRef],
      title: "Deliver produce boxes",
    });

    expect(need.event).toMatchObject({
      type: "coordination.need.created",
      objectRef: needRef,
      sourceCapability: "allocation-accounting",
      payload: {
        title: "School produce need",
        quantity: "20 boxes",
      },
    });
    expect(offer.event).toMatchObject({
      type: "coordination.offer.created",
      objectRef: offerRef,
    });
    expect(commitment.event).toMatchObject({
      type: "coordination.commitment.created",
      objectRef: commitmentRef,
      relatedRefs: [authorityRef, needRef, offerRef],
    });
  });

  it("creates ledger accounts by registering refs and appending canonical events", () => {
    const context = createContext();

    const result = createLedgerAccount(context, {
      ledgerAccountRef: cashRef,
      occurredAt,
      actorRef: authorityRef,
      authorityRefs: [authorityRef],
      accountCode: "1000",
      label: "Cash",
      normalSide: "debit",
    });

    expect(context.objectRegistry.resolve(cashRef.id)).toEqual(result.ref);
    expect(result.event).toMatchObject({
      id: `event.accounting.ledger_account.created.${cashRef.id}`,
      type: "accounting.ledger_account.created",
      objectRef: cashRef,
      sourceCapability: "allocation-accounting",
      schemaVersion: 1,
      payload: {
        accountCode: "1000",
        label: "Cash",
        normalSide: "debit",
      },
    });
    expect(context.civicMemory.getEvent(result.event.id)).toEqual(result.event);
  });

  it("posts balanced ledger entries with only ledger-account line refs", () => {
    const context = createContext();
    context.objectRegistry.register(cashRef);
    context.objectRegistry.register(revenueRef);

    const entryRef: ObjectRef = {
      id: "canopy:ledger-entry:dues-001",
      type: "ledger-entry",
      namespace: "allocation-accounting",
      lifecycleStatus: "active",
    };

    const result = postLedgerEntry(context, {
      ledgerEntryRef: entryRef,
      occurredAt,
      authorityRefs: [authorityRef],
      lines: [
        {
          accountRef: cashRef,
          side: "debit",
          amount: 5000,
          unit: "USD",
        },
        {
          accountRef: revenueRef,
          side: "credit",
          amount: 5000,
          unit: "USD",
        },
      ],
    });

    expect(context.objectRegistry.resolve(entryRef.id)).toEqual(result.ref);
    expect(result.event.type).toBe("accounting.ledger_entry.posted");
    expect(result.event.authorityRefs).toEqual([authorityRef]);
    expect(result.event.relatedRefs.map((ref) => ref.id)).toEqual([
      cashRef.id,
      revenueRef.id,
    ]);
    expect(result.event.payload["totals"]).toEqual({
      USD: { debit: 5000, credit: 5000 },
    });
  });

  it("rejects auth account refs in ledger lines", () => {
    const context = createContext();
    context.objectRegistry.register(authAccountRef);
    context.objectRegistry.register(revenueRef);

    expect(() =>
      postLedgerEntry(context, {
        ledgerEntryRef: {
          id: "canopy:ledger-entry:bad-auth-account",
          type: "ledger-entry",
          namespace: "allocation-accounting",
          lifecycleStatus: "active",
        },
        occurredAt,
        authorityRefs: [authorityRef],
        lines: [
          {
            accountRef: authAccountRef,
            side: "debit",
            amount: 1,
            unit: "USD",
          },
          {
            accountRef: revenueRef,
            side: "credit",
            amount: 1,
            unit: "USD",
          },
        ],
      })
    ).toThrow(AllocationAccountingError);
  });

  it("rejects unbalanced ledger entries and missing posting authority", () => {
    const context = createContext();
    context.objectRegistry.register(cashRef);
    context.objectRegistry.register(revenueRef);

    const command: PostLedgerEntryCommand = {
      ledgerEntryRef: {
        id: "canopy:ledger-entry:unbalanced",
        type: "ledger-entry",
        namespace: "allocation-accounting",
        lifecycleStatus: "active",
      } satisfies ObjectRef,
      occurredAt,
      authorityRefs: [authorityRef],
      lines: [
        {
          accountRef: cashRef,
          side: "debit",
          amount: 5000,
          unit: "USD",
        },
        {
          accountRef: revenueRef,
          side: "credit",
          amount: 4000,
          unit: "USD",
        },
      ],
    };

    expect(() => postLedgerEntry(context, command)).toThrow(
      /not balanced for USD/
    );
    expect(() =>
      postLedgerEntry(context, { ...command, authorityRefs: [] })
    ).toThrow(/require authorityRefs/);
  });

  it("reverses posted ledger entries with opposite lines and supersession continuity", () => {
    const context = createContext();
    context.objectRegistry.register(cashRef);
    context.objectRegistry.register(revenueRef);

    const posted = postLedgerEntry(context, {
      ledgerEntryRef: {
        id: "canopy:ledger-entry:dues-002",
        type: "ledger-entry",
        namespace: "allocation-accounting",
        lifecycleStatus: "active",
      },
      occurredAt,
      authorityRefs: [authorityRef],
      lines: [
        {
          accountRef: cashRef,
          side: "debit",
          amount: 5000,
          unit: "USD",
        },
        {
          accountRef: revenueRef,
          side: "credit",
          amount: 5000,
          unit: "USD",
        },
      ],
    });

    const reversal = reverseLedgerEntry(context, {
      reversalLedgerEntryRef: {
        id: "canopy:ledger-entry:dues-002-reversal",
        type: "ledger-entry",
        namespace: "allocation-accounting",
        lifecycleStatus: "active",
      },
      originalEventId: posted.event.id,
      occurredAt: "2026-06-13T13:00:00.000Z",
      authorityRefs: [authorityRef],
      memo: "void duplicate dues posting",
    });

    expect(reversal.event.type).toBe("accounting.ledger_entry.reversed");
    expect(reversal.event.supersedesEventId).toBe(posted.event.id);
    expect(reversal.event.supersession).toMatchObject({
      supersedesEventId: posted.event.id,
      replacementObjectRef: reversal.ref,
      authorityRefs: [authorityRef],
    });
    expect(reversal.event.payload["lines"]).toMatchObject([
      { accountRef: cashRef, side: "credit", amount: 5000, unit: "USD" },
      { accountRef: revenueRef, side: "debit", amount: 5000, unit: "USD" },
    ]);
    expect(() =>
      reverseLedgerEntry(context, {
        reversalLedgerEntryRef: {
          id: "canopy:ledger-entry:dues-002-reversal-again",
          type: "ledger-entry",
          namespace: "allocation-accounting",
          lifecycleStatus: "active",
        },
        originalEventId: posted.event.id,
        occurredAt: "2026-06-13T14:00:00.000Z",
        authorityRefs: [authorityRef],
      })
    ).toThrow(/already has reversal continuity/);
  });
});
