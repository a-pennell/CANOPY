import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  StewardshipCommandError,
  createResource,
  grantUseRight,
  proposeUseRight,
  recordResourceContext
} from "./index.js";

const occurredAt = "2026-06-13T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.stewardship",
  lifecycleStatus: "active"
});

const holderRef = ref("person.mira", "person");
const resourceRef = ref("resource.north-pasture", "resource");
const useRightRef = ref("use-right.north-pasture.grazing", "use-right");
const mandateRef = ref("mandate.watershed.steward.2026", "mandate");
const issueRef = ref("issue.north-pasture-review", "issue");
const decisionRef = ref("decision.north-pasture-use-right", "decision");
const proposalRef = ref("proposal.north-pasture-use-right", "proposal");

const scope = {
  holderRef,
  resourceRef,
  permissions: ["graze.light"],
  conditions: ["no grazing inside riparian buffer"],
  term: {
    startsAt: "2026-06-15T00:00:00.000Z",
    endsAt: "2026-09-15T00:00:00.000Z"
  },
  review: {
    reviewPathRef: issueRef,
    reviewAt: "2026-08-15T00:00:00.000Z"
  },
  revocation: {
    revocable: true,
    revocationPathRef: issueRef,
    revocationConditions: ["threshold breach", "unresolved condition violation"]
  }
};

function services() {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory()
  };
}

describe("stewardship capability", () => {
  it("creates resources by registering refs and appending a canonical event", () => {
    const ctx = services();
    const result = createResource(ctx, {
      eventId: "event.stewardship.resource.created.north-pasture",
      occurredAt,
      resourceRef,
      stewardRefs: [holderRef],
      resourceKind: "pasture",
      title: "North pasture"
    });

    expect(result.append.sequence).toBe(1);
    expect(ctx.registry.require(resourceRef.id)).toEqual(resourceRef);
    expect(ctx.registry.require(holderRef.id)).toEqual(holderRef);
    expect(ctx.memory.getEvent(result.append.event.id)).toMatchObject({
      type: "stewardship.resource.created",
      objectRef: resourceRef,
      sourceCapability: "stewardship",
      payload: {
        resourceRefId: resourceRef.id,
        resourceKind: "pasture",
        title: "North pasture",
        stewardRefIds: [holderRef.id]
      }
    });
  });

  it("proposes use rights with scoped holder, resource, review, and revocation semantics", () => {
    const ctx = services();
    const result = proposeUseRight(ctx, {
      eventId: "event.stewardship.use_right.proposed.north-pasture",
      occurredAt,
      useRightRef,
      scope,
      proposalRef,
      rationale: "seasonal shared grazing"
    });

    expect(result.append.event.type).toBe("stewardship.use_right.proposed");
    expect(result.append.event.relatedRefs.map((related) => related.id)).toEqual([
      holderRef.id,
      resourceRef.id,
      issueRef.id,
      proposalRef.id
    ]);
    expect(result.append.event.payload).toMatchObject({
      holderRefId: holderRef.id,
      resourceRefId: resourceRef.id,
      permissions: ["graze.light"],
      conditions: ["no grazing inside riparian buffer"],
      state: "proposed",
      review: {
        reviewPathRefId: issueRef.id,
        reviewAt: "2026-08-15T00:00:00.000Z"
      },
      revocation: {
        revocable: true,
        revocationPathRefId: issueRef.id
      }
    });
  });

  it("grants use rights only with explicit authority refs", () => {
    const ctx = services();

    expect(() =>
      grantUseRight(ctx, {
        eventId: "event.stewardship.use_right.granted.denied",
        occurredAt,
        useRightRef,
        scope,
        decisionRef
      })
    ).toThrow(StewardshipCommandError);

    const result = grantUseRight(ctx, {
      eventId: "event.stewardship.use_right.granted.north-pasture",
      occurredAt,
      useRightRef,
      scope,
      decisionRef,
      authorityRefs: [mandateRef]
    });

    expect(result.append.event).toMatchObject({
      type: "stewardship.use_right.granted",
      objectRef: useRightRef,
      authorityRefs: [mandateRef],
      payload: {
        authorityRefIds: [mandateRef.id],
        holderRefId: holderRef.id,
        resourceRefId: resourceRef.id,
        state: "active"
      }
    });
  });

  it("rejects grants without complete scope and revocation or review semantics", () => {
    const ctx = services();

    expect(() =>
      grantUseRight(ctx, {
        eventId: "event.stewardship.use_right.granted.no-conditions",
        occurredAt,
        useRightRef,
        scope: {
          ...scope,
          conditions: []
        },
        authorityRefs: [mandateRef]
      })
    ).toThrow(StewardshipCommandError);

    expect(() =>
      grantUseRight(ctx, {
        eventId: "event.stewardship.use_right.granted.no-revocation",
        occurredAt,
        useRightRef,
        scope: {
          ...scope,
          revocation: {
            revocable: false,
            revocationConditions: []
          }
        },
        authorityRefs: [mandateRef]
      })
    ).toThrow(StewardshipCommandError);
  });

  it("records ecological and resource context without providers or persistence assumptions", () => {
    const ctx = services();
    const result = recordResourceContext(ctx, {
      eventId: "event.stewardship.resource_context.recorded.north-pasture",
      occurredAt,
      resourceRef,
      livingSystemId: "living-system.riverbend-creek",
      context: {
        soilMoisture: "low",
        carryingCapacity: 12,
        ecologicalConcern: "riparian recovery"
      }
    });

    expect(result.append.event).toMatchObject({
      type: "stewardship.resource_context.recorded",
      objectRef: resourceRef,
      relatedRefs: [resourceRef],
      livingSystemId: "living-system.riverbend-creek",
      payload: {
        resourceRefId: resourceRef.id,
        observedAt: occurredAt,
        context: {
          soilMoisture: "low",
          carryingCapacity: 12,
          ecologicalConcern: "riparian recovery"
        }
      }
    });
  });
});
