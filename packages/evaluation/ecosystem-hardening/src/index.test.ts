import { describe, expect, it } from "vitest";
import {
  adapterProviderTargets,
  buildCanopyEcosystemHardeningReport,
  requiredPhase10VerificationCommands,
  type CanopyVerificationEvidence
} from "./index.js";
import type {
  AdapterProviderTarget,
  AdapterProviderTargetStatus
} from "@canopy/evaluation-adapter-conformance";
import { phase10ProviderDeploymentRequirements } from "@canopy/evaluation-adapter-conformance";
import type {
  CanopyOperationalReadinessCheck,
  CanopyOperationsReport
} from "@canopy/workflows-operations";

const generatedAt = "2026-06-16T12:00:00.000Z";

describe("ecosystem hardening evaluation", () => {
  it("turns current Phase 10 readiness gaps into explicit gates", () => {
    const report = buildCanopyEcosystemHardeningReport({ generatedAt });

    expect(report.phase).toBe("phase-10");
    expect(report.readiness).toBe("blocked");
    expect(report.providers.plannedCandidateTargetIds).toEqual([
      "adapter-target.persistence.postgres",
      "adapter-target.event-store.postgres"
    ]);
    expect(report.providers.pendingLegacySourceTargetIds).toEqual([
      "adapter-target.legacy-project.common-credit",
      "adapter-target.legacy-project.icos",
      "adapter-target.legacy-project.sensemaking",
      "adapter-target.legacy-project.stewardship"
    ]);
    expect(report.migrations.health.status).toBe("pass");
    expect(report.operations.readiness).toBe("not-observed");
    expect(report.deployment.unobservedCommandIds).toEqual(
      requiredPhase10VerificationCommands.map((command) => command.id)
    );
    expect(report.deployment.providerDeployment.status).toBe("blocked");
    expect(report.deployment.providerDeployment.releaseBlockers).toContain(
      "phase-10.deployment.postgres-runtime.provider-target-not-implemented"
    );

    expect(gate(report, "hardening.providers.production-binding")).toMatchObject({
      status: "blocked",
      area: "providers"
    });
    expect(gate(report, "hardening.auditability.adapter-audit-chain")).toMatchObject({
      status: "ready",
      area: "auditability"
    });
  });

  it("reports ready when provider, operations, migration, and verification evidence are complete", () => {
    const report = buildCanopyEcosystemHardeningReport({
      generatedAt,
      providerTargets: implementedTargets(),
      operationsReport: readyOperationsReport(),
      verificationEvidence: passedVerificationEvidence(generatedAt),
      satisfiedProviderProductionGateIds: allProductionGateIds(implementedTargets()),
      availableDeploymentEnvironment: allDeploymentEnvironment()
    });

    expect(report.readiness).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.nextActions).toEqual([]);
    expect(gate(report, "hardening.deployment.verification-evidence").status).toBe(
      "ready"
    );
    expect(gate(report, "hardening.operations.runtime-readiness").status).toBe(
      "ready"
    );
    expect(gate(report, "hardening.deployment.provider-release-readiness").status).toBe(
      "ready"
    );
  });

  it("degrades migration readiness without hiding the specific manifest issue", () => {
    const report = buildCanopyEcosystemHardeningReport({
      generatedAt,
      migrationHealth: {
        status: "warn",
        canonicalHomeCount: 6,
        providerTrackCount: 7,
        appendOnlySubjects: ["events", "outbox", "adapterAudit"],
        issues: [
          {
            code: "missing-canonical-home",
            message: "Missing canonical migration home for projectionState."
          }
        ]
      }
    });

    const migrationGate = gate(report, "hardening.migrations.canonical-runtime-shape");
    expect(migrationGate.status).toBe("attention");
    expect(migrationGate.nextActions).toEqual([
      "Missing canonical migration home for projectionState."
    ]);
  });

  it("treats blocked operations and failed verification as production blockers", () => {
    const report = buildCanopyEcosystemHardeningReport({
      generatedAt,
      providerTargets: implementedTargets(),
      operationsReport: blockedOperationsReport(),
      verificationEvidence: [
        {
          id: "verification.phase10.full-check",
          command: "npm run check",
          status: "failed",
          checkedAt: generatedAt,
          notes: "Boundary check failed."
        }
      ]
    });

    expect(report.readiness).toBe("blocked");
    expect(gate(report, "hardening.operations.runtime-readiness").blockers).toEqual([
      "readiness.outbox-backlog is blocked."
    ]);
    expect(gate(report, "hardening.deployment.verification-evidence").blockers).toEqual([
      "verification.phase10.full-check failed."
    ]);
  });
});

function gate(
  report: ReturnType<typeof buildCanopyEcosystemHardeningReport>,
  id: string
) {
  const found = report.gates.find((item) => item.id === id);
  expect(found).toBeDefined();
  return found!;
}

function implementedTargets(): readonly AdapterProviderTarget[] {
  return adapterProviderTargets.map((target) => ({
    ...target,
    status: "implemented" satisfies AdapterProviderTargetStatus
  }));
}

function allProductionGateIds(
  targets: readonly AdapterProviderTarget[]
): readonly string[] {
  return [
    ...new Set(targets.flatMap((target) => target.requiredBeforeProductionUse))
  ];
}

function allDeploymentEnvironment(): readonly string[] {
  return [
    ...new Set(
      phase10ProviderDeploymentRequirements.flatMap(
        (requirement) => requirement.requiredEnvironment
      )
    )
  ];
}

function passedVerificationEvidence(
  checkedAt: string
): readonly CanopyVerificationEvidence[] {
  return requiredPhase10VerificationCommands.map((command) => ({
    ...command,
    status: "passed",
    checkedAt
  }));
}

function readyOperationsReport(): Pick<
  CanopyOperationsReport,
  "generatedAt" | "readiness" | "readinessChecks" | "findings"
> {
  return {
    generatedAt,
    readiness: "ready",
    readinessChecks: {
      replayFreshness: readinessCheck("readiness.replay-freshness", "ready"),
      projectionLag: readinessCheck("readiness.projection-lag", "ready"),
      outboxBacklog: readinessCheck("readiness.outbox-backlog", "ready"),
      adapterAuditHealth: readinessCheck("readiness.adapter-audit-health", "ready"),
      federationHealth: readinessCheck("readiness.federation-health", "ready")
    },
    findings: []
  };
}

function blockedOperationsReport(): Pick<
  CanopyOperationsReport,
  "generatedAt" | "readiness" | "readinessChecks" | "findings"
> {
  return {
    generatedAt,
    readiness: "blocked",
    readinessChecks: {
      replayFreshness: readinessCheck("readiness.replay-freshness", "ready"),
      projectionLag: readinessCheck("readiness.projection-lag", "attention"),
      outboxBacklog: readinessCheck("readiness.outbox-backlog", "blocked"),
      adapterAuditHealth: readinessCheck("readiness.adapter-audit-health", "ready"),
      federationHealth: readinessCheck("readiness.federation-health", "ready")
    },
    findings: ["Outbox backlog is blocked."]
  };
}

function readinessCheck(
  id: string,
  status: CanopyOperationalReadinessCheck["status"]
): CanopyOperationalReadinessCheck {
  return {
    id,
    status,
    message: `${id} is ${status}.`,
    evidenceIds: []
  };
}
