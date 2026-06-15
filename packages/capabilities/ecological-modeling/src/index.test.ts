import { describe, expect, it } from "vitest";
import type { ObjectRef } from "@canopy/contracts-kernel";
import { createInMemoryCivicMemory } from "@canopy/kernel-civic-memory";
import { createObjectRegistry } from "@canopy/kernel-object-registry";
import {
  createModelScenario,
  createThreshold,
  recordThresholdBreach
} from "./index.js";

const occurredAt = "2026-06-15T12:00:00.000Z";

const ref = (id: string, type: ObjectRef["type"]): ObjectRef => ({
  id,
  type,
  namespace: "canopy.test.ecology",
  lifecycleStatus: "active"
});

const actorRef = ref("person.mira", "person");
const mandateRef = ref("mandate.watershed", "mandate");
const guardianRef = ref("guardian-review.mill-creek", "guardian-review");
const livingSystemRef = ref("living-system.mill-creek", "living-system");
const indicatorRef = ref("indicator.nitrate", "indicator");
const thresholdRef = ref("threshold.nitrate", "threshold");
const scenarioRef = ref("model.low-runoff-route", "model");
const proposalRef = ref("proposal.food-route", "proposal");

function services() {
  return {
    registry: createObjectRegistry(),
    memory: createInMemoryCivicMemory()
  };
}

describe("ecological modeling capability", () => {
  it("creates threshold and breach events with ecological refs", () => {
    const ctx = services();

    createThreshold(ctx, {
      eventId: "event.threshold.created",
      occurredAt,
      actorRef,
      thresholdRef,
      indicatorRef,
      livingSystemRef,
      guardianRefs: [guardianRef],
      authorityRefs: [mandateRef],
      title: "Nitrate threshold",
      threshold: 10,
      unit: "mg/L",
      guardianReviewRequired: true
    });
    const breach = recordThresholdBreach(ctx, {
      eventId: "event.threshold.breached",
      occurredAt,
      actorRef,
      thresholdRef,
      indicatorRef,
      relatedRefs: [livingSystemRef, proposalRef],
      authorityRefs: [mandateRef, guardianRef],
      observedValue: 14.2,
      unit: "mg/L",
      requiresGuardianReview: true
    });

    expect(breach.append.event).toMatchObject({
      type: "ecology.threshold.breached",
      objectRef: thresholdRef,
      sourceCapability: "ecological-modeling",
      dataState: "sensor_derived",
      payload: {
        observedValue: 14.2,
        severity: "breach",
        requiresGuardianReview: true
      }
    });
    expect(breach.relatedRefs.map((related) => related.id)).toEqual([
      indicatorRef.id,
      livingSystemRef.id,
      proposalRef.id
    ]);
  });

  it("creates model scenarios as model-derived events", () => {
    const ctx = services();
    const result = createModelScenario(ctx, {
      eventId: "event.model.scenario.created",
      occurredAt,
      actorRef,
      scenarioRef,
      relatedRefs: [thresholdRef, proposalRef],
      authorityRefs: [mandateRef, guardianRef],
      title: "Low runoff route",
      summary: "Use existing cold-chain capacity.",
      assumptions: ["no additional irrigation"],
      guardianReviewRequired: true
    });

    expect(result.append.event).toMatchObject({
      type: "model.scenario.created",
      objectRef: scenarioRef,
      dataState: "model_derived",
      payload: {
        title: "Low runoff route",
        guardianReviewRequired: true,
        assumptions: ["no additional irrigation"]
      }
    });
  });
});
