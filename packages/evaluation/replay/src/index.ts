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

export interface CanonicalReplayInput {
  readonly objectRefs: readonly ObjectRef[];
  readonly events: readonly CanopyEvent[];
}

export function replayGoldenFixtureManifest(
  manifest: GoldenFixtureManifest,
  projectionRefs: readonly ObjectRef[]
): GoldenReplayResult {
  return replayCanonicalEventStream(
    {
      objectRefs: manifest.objects.map((object) => object.ref),
      events: manifest.events
    },
    projectionRefs
  );
}

export function replayCanonicalEventStream(
  input: CanonicalReplayInput,
  projectionRefs: readonly ObjectRef[]
): GoldenReplayResult {
  const registry = createObjectRegistry();
  const memory = createInMemoryCivicMemory();

  for (const objectRef of input.objectRefs) {
    registry.register(objectRef);

    if (objectRef.source !== undefined) {
      registry.mapSource(objectRef.source, objectRef);
    }
  }

  for (const event of input.events) {
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
