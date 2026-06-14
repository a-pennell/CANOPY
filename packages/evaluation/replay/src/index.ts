import type { CanopyEvent, ObjectRef } from "@canopy/contracts-kernel";
import type { GoldenFixtureManifest } from "@canopy/contracts-testing";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  buildObjectPageProjection,
  type ObjectPageProjection
} from "@canopy/projections-object-page";

export interface GoldenReplayResult {
  readonly registeredRefs: readonly ObjectRef[];
  readonly replayedEvents: readonly CanopyEvent[];
  readonly projections: readonly ObjectPageProjection[];
}

export function replayGoldenFixtureManifest(
  manifest: GoldenFixtureManifest,
  projectionRefs: readonly ObjectRef[]
): GoldenReplayResult {
  const registry = createObjectRegistry();
  const memory = createInMemoryCivicMemory();

  for (const object of manifest.objects) {
    registry.register(object.ref);

    if (object.ref.source !== undefined) {
      registry.mapSource(object.ref.source, object.ref);
    }
  }

  for (const event of manifest.events) {
    memory.appendEvent(event);
  }

  const replayedEvents: CanopyEvent[] = [];
  let cursor = memory.replay({ limit: 4 });
  replayedEvents.push(...cursor.events);

  while (cursor.nextCursor !== undefined) {
    cursor = memory.replay(cursor.nextCursor);
    replayedEvents.push(...cursor.events);
  }

  return {
    registeredRefs: registry.listRefs(),
    replayedEvents,
    projections: projectionRefs.map((projectionRef) =>
      buildObjectPageProjection(projectionRef, replayedEvents)
    )
  };
}
