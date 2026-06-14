import { describe, expect, it } from "vitest";
import type { AccessRule, ObjectRef, PermissionAtom } from "@canopy/contracts-kernel";
import { createOidcAuthAdapter } from "@canopy/adapters-provider-oidc-auth";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import { buildAuthorityProjection } from "@canopy/projections-authority";
import {
  appealUseRight,
  approveUseRight,
  denyUseRight,
  revokeUseRight
} from "@canopy/capabilities-stewardship";

const occurredAt = "2026-06-14T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.vertical.identity-stewardship",
  lifecycleStatus: "active"
});

const personRef = ref("person.mira", "person");
const resourceRef = ref("resource.north-pasture", "resource");
const useRightRef = ref("use-right.north-pasture.grazing", "use-right");
const mandateRef = ref("mandate.watershed-steward.2026", "mandate");
const policyRef = ref("policy.stewardship-runtime-permissions", "policy");
const issueRef = ref("issue.north-pasture-review", "issue");
const decisionRef = ref("decision.north-pasture-use-right", "decision");
const proposalRef = ref("proposal.north-pasture-use-right", "proposal");
const appealRef = ref("appeal.north-pasture-use-right", "appeal");

const permission: PermissionAtom = {
  schemaVersion: "0.0.0",
  key: "stewardship.use_right.approve",
  capability: "stewardship",
  action: "approve",
  targetType: "use-right",
  consequential: true,
  binding: true
};

const scope = {
  holderRef: personRef,
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

describe("identity to stewardship authority vertical slice", () => {
  it("bridges an OIDC session into permission checks and stewardship enforcement", async () => {
    const oidc = createOidcAuthAdapter({ now: () => occurredAt });
    await oidc.linkAccount({
      personRef,
      provider: "oidc",
      providerSubject: "mira@example.test",
      handle: "mira",
      authorityRefs: [mandateRef]
    });

    const session = await oidc.resolveAuthoritySession({
      providerSubject: "mira@example.test",
      requestedAt: occurredAt
    });
    expect(session.ok).toBe(true);

    const permissionResult = await oidc.checkPermission({
      providerSubject: "mira@example.test",
      requestedAt: occurredAt,
      permission,
      targetRef: useRightRef,
      context: { purpose: "stewardship_review" },
      accessRules: [
        accessRule({
          subject: { roleRefs: session.value!.roleAssignmentRefs },
          scope: {
            targetTypes: ["use-right"],
            purposeKeys: ["stewardship_review"]
          }
        })
      ]
    });
    expect(permissionResult.value?.allowed).toBe(true);

    const registry = createObjectRegistry();
    const memory = createInMemoryCivicMemory();
    const services = { registry, memory };
    const authorityRefs = session.value!.authorityRefs;

    approveUseRight(services, {
      eventId: "event.vertical.use-right.approved",
      occurredAt,
      actorRef: personRef,
      useRightRef,
      scope,
      decisionRef,
      authorityRefs
    });
    denyUseRight(services, {
      eventId: "event.vertical.use-right.denied",
      occurredAt,
      actorRef: personRef,
      useRightRef,
      holderRef: personRef,
      resourceRef,
      proposalRef,
      decisionRef,
      appealPathRef: issueRef,
      reason: "Watershed threshold requires a pause.",
      authorityRefs
    });
    revokeUseRight(services, {
      eventId: "event.vertical.use-right.revoked",
      occurredAt,
      actorRef: personRef,
      useRightRef,
      holderRef: personRef,
      resourceRef,
      decisionRef,
      revocationPathRef: issueRef,
      appealPathRef: issueRef,
      reason: "Condition violation confirmed.",
      authorityRefs
    });
    appealUseRight(services, {
      eventId: "event.vertical.use-right.appealed",
      occurredAt,
      actorRef: personRef,
      appealRef,
      useRightRef,
      reviewPathRef: issueRef,
      grounds: ["revocation evidence is contested"],
      requestedRemedy: "restore the use right pending review"
    });

    const events = memory.queryEvents();
    const projection = buildAuthorityProjection(events);

    expect(events.map((event) => event.type)).toEqual([
      "stewardship.use_right.granted",
      "stewardship.use_right.denied",
      "stewardship.use_right.revoked",
      "stewardship.use_right.appealed"
    ]);
    expect(projection.indicators.status).toBe("ok");
    expect(
      projection.tracesByObject.find((trace) => trace.objectRef.id === useRightRef.id)?.events.map(
        (event) => event.type
      )
    ).toEqual([
      "stewardship.use_right.appealed",
      "stewardship.use_right.denied",
      "stewardship.use_right.granted",
      "stewardship.use_right.revoked"
    ]);
  });
});

function accessRule(overrides: Partial<AccessRule>): AccessRule {
  return {
    schemaVersion: "0.0.0",
    id: "access-rule.stewardship.approve",
    ref: ref("access-rule.stewardship.approve", "policy"),
    permission,
    effect: "allow",
    status: "active",
    subject: {},
    scope: {},
    conditions: [],
    authorityRefs: [policyRef],
    sourceRefs: [policyRef],
    ...overrides
  };
}
