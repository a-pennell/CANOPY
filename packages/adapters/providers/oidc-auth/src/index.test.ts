import { describe, expect, it } from "vitest";
import type { AccessRule, ObjectRef, PermissionAtom } from "@canopy/contracts-kernel";
import {
  createOidcAuthAdapter,
  permissionRequestFromOidcSession
} from "./index.js";

const now = "2026-06-14T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.oidc",
  lifecycleStatus: "active"
});

const personRef = ref("person.mira", "person");
const useRightRef = ref("use-right.north-pasture", "use-right");
const mandateRef = ref("mandate.stewardship.2026", "mandate");
const policyRef = ref("policy.stewardship.permissions", "policy");

const permission: PermissionAtom = {
  schemaVersion: "0.0.0",
  key: "stewardship.use_right.approve",
  capability: "stewardship",
  action: "approve",
  targetType: "use-right",
  consequential: true,
  binding: true
};

describe("OIDC auth permission bridge", () => {
  it("resolves provider sessions into provider-free permission checks", async () => {
    const adapter = createOidcAuthAdapter({ now: () => now });
    await adapter.linkAccount({
      personRef,
      provider: "oidc",
      providerSubject: "mira@example.test",
      handle: "mira",
      authorityRefs: [mandateRef]
    });

    const session = await adapter.resolveAuthoritySession({
      providerSubject: "mira@example.test",
      requestedAt: now
    });

    expect(session.ok).toBe(true);
    expect(session.value?.personRef).toEqual(personRef);
    expect(session.value?.authorityRefs).toEqual([mandateRef]);
    expect(session.value?.roleAssignmentRefs[0]?.id).toContain(mandateRef.id);

    const request = permissionRequestFromOidcSession({
      principal: session.value!,
      permission,
      targetRef: useRightRef,
      context: { purpose: "stewardship_review" }
    });

    expect(request.actorRef).toEqual(personRef);
    expect(request.context?.relatedRefs?.map((relatedRef) => relatedRef.id)).toContain(
      mandateRef.id
    );

    const result = await adapter.checkPermission({
      providerSubject: "mira@example.test",
      requestedAt: now,
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

    expect(result.ok).toBe(true);
    expect(result.value?.allowed).toBe(true);
    expect(result.value?.authorityTrace?.actorRef).toEqual(personRef);
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
