import { describe, expect, it } from "vitest";
import type { AccessRule, ObjectRef, PermissionAtom, PermissionCheckRequest } from "./index.js";
import { evaluatePermissionPolicy, validateEventAuthority } from "./index.js";

const occurredAt = "2026-06-14T00:00:00.000Z";

const actorRef = ref("canopy:person:ada", "person", "people");
const roleRef = ref("canopy:role:steward", "role", "authority");
const claimRef = ref("canopy:claim:water", "claim", "claims");
const policyRef = ref("canopy:policy:data", "policy", "governance");

const permission: PermissionAtom = {
  schemaVersion: "0.0.0",
  key: "claims.verify",
  capability: "claims-evidence",
  action: "verify",
  targetType: "claim",
  consequential: true,
  binding: true
};

describe("runtime policy contracts", () => {
  it("evaluates provider-free permission policy allow, deny, and review surfaces", () => {
    const request: PermissionCheckRequest = {
      schemaVersion: "0.0.0",
      actorRef,
      permission,
      targetRef: claimRef,
      context: {
        purpose: "governance_review",
        relatedRefs: [roleRef]
      }
    };
    const allowRule = accessRule("rule.allow", "allow", {
      subject: { roleRefs: [roleRef] },
      conditions: [{ key: "trainingComplete", operator: "equals", value: true }]
    });
    const denyRule = accessRule("rule.deny", "deny", {
      conditions: [{ key: "embargoed", operator: "equals", value: true }]
    });

    const allowed = evaluatePermissionPolicy({
      request,
      accessRules: [allowRule, denyRule],
      evaluatedAt: occurredAt,
      facts: {
        trainingComplete: true,
        embargoed: false
      }
    });

    expect(allowed.allowed).toBe(true);
    expect(allowed.authorityTrace?.steps.map((step) => step.result)).toEqual([
      "matched",
      "out-of-scope"
    ]);

    const denied = evaluatePermissionPolicy({
      request,
      accessRules: [allowRule, denyRule],
      evaluatedAt: occurredAt,
      facts: {
        trainingComplete: true,
        embargoed: true
      }
    });

    expect(denied.allowed).toBe(false);
    expect(denied.denialReasons?.[0]?.code).toBe("policy_restricted");
  });

  it("validates event authority requirements at runtime", () => {
    expect(
      validateEventAuthority({
        eventType: "governance.decision.recorded",
        authorityRefs: []
      })
    ).toMatchObject({
      ok: false,
      authorityRequired: true,
      issues: [{ code: "authority_refs_missing" }]
    });

    expect(
      validateEventAuthority({
        eventType: "governance.decision.recorded",
        authorityRefs: [policyRef]
      }).ok
    ).toBe(true);
  });
});

function accessRule(
  id: string,
  effect: AccessRule["effect"],
  overrides: Partial<AccessRule>
): AccessRule {
  return {
    schemaVersion: "0.0.0",
    id,
    ref: ref(`canopy:access-rule:${id}`, "policy", "authority"),
    permission,
    effect,
    status: "active",
    subject: {},
    scope: {
      targetTypes: ["claim"],
      purposeKeys: ["governance_review"]
    },
    conditions: [],
    authorityRefs: [policyRef],
    sourceRefs: [policyRef],
    ...overrides
  };
}

function ref(
  id: string,
  type: ObjectRef["type"],
  namespace: string
): ObjectRef {
  return {
    id,
    type,
    namespace,
    lifecycleStatus: "active"
  };
}
