import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  completeLearningRetrospective,
  recordLearningOutcome
} from "./index.js";

const occurredAt = "2026-06-15T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.learning",
  lifecycleStatus: "active"
});

const actorRef = ref("person.mira", "person");
const decisionRef = ref("decision.food-route", "decision");
const flowRef = ref("flow.food-route", "flow");
const thresholdRef = ref("threshold.nitrate", "threshold");
const outcomeRef = ref("outcome.food-route", "evidence");
const retrospectiveRef = ref("retrospective.food-route", "evidence");

function services() {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory()
  };
}

describe("learning accountability capability", () => {
  it("records outcomes and retrospectives as learning events", () => {
    const ctx = services();
    const outcome = recordLearningOutcome(ctx, {
      eventId: "event.learning.outcome.recorded",
      occurredAt,
      actorRef,
      outcomeRef,
      relatedRefs: [flowRef, decisionRef, thresholdRef],
      authorityRefs: [decisionRef],
      title: "Food route completed",
      outcome: "twenty boxes delivered",
      metric: "boxes",
      value: 20
    });
    const retrospective = completeLearningRetrospective(ctx, {
      eventId: "event.learning.retrospective.completed",
      occurredAt,
      actorRef,
      retrospectiveRef,
      relatedRefs: [outcomeRef, thresholdRef],
      authorityRefs: [decisionRef],
      summary: "Threshold safeguards held during delivery."
    });

    expect(outcome.append.event).toMatchObject({
      type: "learning.outcome.recorded",
      objectRef: outcomeRef,
      sourceCapability: "learning-accountability",
      payload: {
        outcome: "twenty boxes delivered",
        metric: "boxes",
        value: 20
      }
    });
    expect(retrospective.append.event).toMatchObject({
      type: "learning.retrospective.completed",
      objectRef: retrospectiveRef,
      relatedRefs: [outcomeRef, thresholdRef]
    });
  });
});
