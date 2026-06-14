import { describe, expect, it } from "vitest";
import type { LocalSourcePointer, ObjectRef } from "@canopy/contracts-kernel";
import { ObjectRegistryError, createObjectRegistry } from "./index.js";

const source: LocalSourcePointer = {
  sourceProject: "common-credit",
  sourceEntity: "legacy_person",
  sourceId: "42",
  sourceVersion: "v1",
  importedAt: "2026-06-13T00:00:00.000Z"
};

const ref: ObjectRef = {
  id: "canopy:person:ada",
  type: "person",
  namespace: "people",
  lifecycleStatus: "active",
  source
};

describe("object registry", () => {
  it("returns a stable canonical ref for structurally identical registrations", () => {
    const registry = createObjectRegistry();
    const first = registry.register(ref);
    const second = registry.register({ ...ref, source: { ...source } });

    expect(second).toBe(first);
    expect(registry.resolve(ref.id)).toBe(first);
    expect(registry.resolve(ref)).toBe(first);
    expect(first).toEqual(ref);
  });

  it("rejects duplicate canonical ids with different structure", () => {
    const registry = createObjectRegistry();
    registry.register(ref);

    expect(() =>
      registry.register({
        ...ref,
        lifecycleStatus: "retired"
      })
    ).toThrow(ObjectRegistryError);
  });

  it("preserves type namespace lifecycle and source details", () => {
    const registry = createObjectRegistry();
    const canonical = registry.register(ref);

    expect(canonical).toMatchObject({
      id: "canopy:person:ada",
      type: "person",
      namespace: "people",
      lifecycleStatus: "active",
      source
    });
  });

  it("treats provider ids as source mappings instead of canonical ids", () => {
    const registry = createObjectRegistry();
    const mapping = registry.mapSource(source, ref);

    expect(mapping.ref.id).toBe("canopy:person:ada");
    expect(mapping.source.sourceId).toBe("42");
    expect(registry.resolveSource(source)).toBe(mapping.ref);
    expect(registry.resolve("42")).toBeUndefined();
  });

  it("does not remap a source to a different ref without supersession metadata", () => {
    const registry = createObjectRegistry();
    registry.mapSource(source, ref);

    expect(() =>
      registry.mapSource(source, {
        ...ref,
        id: "canopy:person:ada-2",
        supersedes: [ref.id]
      })
    ).toThrow(ObjectRegistryError);
  });

  it("records explicit supersession metadata when remapping a source", () => {
    const registry = createObjectRegistry();
    const first = registry.mapSource(source, ref);
    const supersedingRef: ObjectRef = {
      ...ref,
      id: "canopy:person:ada-2",
      lifecycleStatus: "active",
      supersedes: [ref.id]
    };

    const second = registry.mapSource(source, supersedingRef, {
      supersededAt: "2026-06-13T01:00:00.000Z",
      reason: "merged duplicate import"
    });

    expect(second.ref.id).toBe("canopy:person:ada-2");
    expect(second.supersession).toMatchObject({
      previousRef: first.ref,
      supersededByRef: second.ref,
      supersededAt: "2026-06-13T01:00:00.000Z",
      reason: "merged duplicate import"
    });
    expect(registry.resolveSource(source)).toBe(second.ref);
  });
});
