import type { CanopyId, SourceProject } from "@canopy/contracts-kernel";
import { adapterKinds, type AdapterKind } from "./adapter-kinds.js";

export type AdapterProviderTargetRole =
  | "reference-implementation"
  | "candidate-provider"
  | "legacy-fold-in-source";

export type AdapterProviderTargetStatus =
  | "implemented"
  | "planned"
  | "prototype"
  | "deferred";

export interface AdapterProviderTarget {
  readonly id: CanopyId;
  readonly kind: AdapterKind;
  readonly provider: string;
  readonly role: AdapterProviderTargetRole;
  readonly status: AdapterProviderTargetStatus;
  readonly plannedPackage: string;
  readonly conformanceSuiteKind: AdapterKind;
  readonly requiredBeforeProductionUse: readonly CanopyId[];
  readonly sourceProject?: SourceProject;
}

export type Phase10DeploymentReadinessStatus =
  | "ready"
  | "attention"
  | "blocked";

export type Phase10MigrationEvidenceStatus =
  | "ready"
  | "not-ready"
  | "unknown";

export interface Phase10MigrationReadinessEvidence {
  readonly status: Phase10MigrationEvidenceStatus;
  readonly providerTracks: readonly string[];
  readonly missingTables: readonly string[];
  readonly issueCodes: readonly string[];
}

export interface Phase10ProviderDeploymentRequirement {
  readonly id: CanopyId;
  readonly title: string;
  readonly targetIds: readonly CanopyId[];
  readonly requiredEnvironment: readonly string[];
  readonly requiredMigrationTracks: readonly string[];
}

export interface Phase10ProviderDeploymentGate {
  readonly id: CanopyId;
  readonly title: string;
  readonly status: Phase10DeploymentReadinessStatus;
  readonly targetIds: readonly CanopyId[];
  readonly requiredEnvironment: readonly string[];
  readonly missingEnvironment: readonly string[];
  readonly requiredMigrationTracks: readonly string[];
  readonly missingMigrationTracks: readonly string[];
  readonly nonImplementedTargetIds: readonly CanopyId[];
  readonly missingProductionGateIds: readonly CanopyId[];
  readonly blockerCodes: readonly CanopyId[];
}

export interface Phase10ProviderDeploymentReadinessReport {
  readonly id: CanopyId;
  readonly generatedAt: string;
  readonly status: Phase10DeploymentReadinessStatus;
  readonly summary: {
    readonly providerTargetCount: number;
    readonly candidateProviderTargetCount: number;
    readonly implementedProductionProviderTargetCount: number;
    readonly deploymentGateCount: number;
    readonly blockedDeploymentGateCount: number;
    readonly attentionDeploymentGateCount: number;
    readonly missingEnvironmentCount: number;
  };
  readonly migrationReadiness: Phase10MigrationReadinessEvidence;
  readonly deploymentGates: readonly Phase10ProviderDeploymentGate[];
  readonly releaseBlockers: readonly CanopyId[];
  readonly nextActions: readonly string[];
}

export interface Phase10ProviderDeploymentReadinessInput {
  readonly generatedAt?: string;
  readonly providerTargets?: readonly AdapterProviderTarget[];
  readonly satisfiedProductionGateIds?: readonly CanopyId[];
  readonly availableEnvironment?: readonly string[];
  readonly migrationReadiness?: Phase10MigrationReadinessEvidence;
}

const sharedProductionGates = [
  "adapter.descriptor-provider-neutral",
  "adapter.health-observable",
  "adapter.audit-records-written"
] as const;

export const referenceProviderTargets = adapterKinds.map((kind) =>
  providerTarget({
    id: `adapter-target.reference.in-memory.${kind}`,
    kind,
    provider: "in-memory",
    role: "reference-implementation",
    status: "implemented",
    plannedPackage: "packages/adapters/reference/in-memory",
    conformanceSuiteKind: kind,
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      `adapter.${kind}.reference-fixture-parity`
    ]
  })
) satisfies readonly AdapterProviderTarget[];

export const candidateProviderTargets = [
  providerTarget({
    id: "adapter-target.auth.oidc",
    kind: "auth",
    provider: "oidc",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/oidc-auth",
    conformanceSuiteKind: "auth",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.auth.subject-account-separation",
      "adapter.auth.permission-trace-required"
    ]
  }),
  providerTarget({
    id: "adapter-target.persistence.postgres",
    kind: "persistence",
    provider: "postgres",
    role: "candidate-provider",
    status: "planned",
    plannedPackage: "packages/adapters/providers/postgres-persistence",
    conformanceSuiteKind: "persistence",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.persistence.object-ref-integrity",
      "adapter.persistence.stewardship-metadata-preserved"
    ]
  }),
  providerTarget({
    id: "adapter-target.event-store.postgres",
    kind: "event-store",
    provider: "postgres",
    role: "candidate-provider",
    status: "planned",
    plannedPackage: "packages/adapters/providers/postgres-event-store",
    conformanceSuiteKind: "event-store",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.event-store.append-only",
      "adapter.event-store.event-order-stable"
    ]
  }),
  providerTarget({
    id: "adapter-target.object-graph.postgres",
    kind: "object-graph",
    provider: "postgres",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/postgres-object-graph",
    conformanceSuiteKind: "object-graph",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.object-graph.relationship-direction-preserved",
      "adapter.object-graph.lifecycle-filtering"
    ]
  }),
  providerTarget({
    id: "adapter-target.document-store.postgres",
    kind: "document-store",
    provider: "postgres",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/postgres-document-store",
    conformanceSuiteKind: "document-store",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.document-store.content-hash-stable",
      "adapter.document-store.redaction-stubs"
    ]
  }),
  providerTarget({
    id: "adapter-target.object-storage.s3-compatible",
    kind: "object-storage",
    provider: "s3-compatible",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/s3-object-storage",
    conformanceSuiteKind: "object-storage",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.object-storage.object-hash-stable",
      "adapter.object-storage.namespace-isolation"
    ]
  }),
  providerTarget({
    id: "adapter-target.geospatial.postgis",
    kind: "geospatial",
    provider: "postgis",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/postgis-geospatial",
    conformanceSuiteKind: "geospatial",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.geospatial.place-scope-query",
      "adapter.geospatial.geometry-round-trip"
    ]
  }),
  providerTarget({
    id: "adapter-target.time-series.timescaledb",
    kind: "time-series",
    provider: "timescaledb",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/timescaledb-time-series",
    conformanceSuiteKind: "time-series",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.time-series.observation-order-stable",
      "adapter.time-series.window-boundaries-inclusive"
    ]
  }),
  providerTarget({
    id: "adapter-target.vector.pgvector",
    kind: "vector",
    provider: "pgvector",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/pgvector-vector",
    conformanceSuiteKind: "vector",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.vector.source-ref-preserved",
      "adapter.vector.stewardship-filtering"
    ]
  }),
  providerTarget({
    id: "adapter-target.federation-transport.activitypub",
    kind: "federation-transport",
    provider: "activitypub",
    role: "candidate-provider",
    status: "prototype",
    plannedPackage: "packages/adapters/providers/activitypub-transport",
    conformanceSuiteKind: "federation-transport",
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.federation-transport.envelope-integrity",
      "adapter.federation-transport.redaction-respected"
    ]
  })
] satisfies readonly AdapterProviderTarget[];

export const legacyProviderTargets = [
  legacyProviderTarget("common-credit"),
  legacyProviderTarget("icos"),
  legacyProviderTarget("sensemaking"),
  legacyProviderTarget("stewardship")
] satisfies readonly AdapterProviderTarget[];

export const adapterProviderTargets = [
  ...referenceProviderTargets,
  ...candidateProviderTargets,
  ...legacyProviderTargets
] satisfies readonly AdapterProviderTarget[];

export const phase10ProviderDeploymentRequirements = [
  providerDeploymentRequirement({
    id: "phase-10.deployment.auth-identity",
    title: "OIDC identity binding",
    targetIds: ["adapter-target.auth.oidc"],
    requiredEnvironment: [
      "CANOPY_AUTH_ISSUER_URL",
      "CANOPY_AUTH_CLIENT_ID"
    ],
    requiredMigrationTracks: []
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.postgres-runtime",
    title: "Postgres canonical runtime",
    targetIds: [
      "adapter-target.persistence.postgres",
      "adapter-target.event-store.postgres",
      "adapter-target.object-graph.postgres",
      "adapter-target.document-store.postgres"
    ],
    requiredEnvironment: ["CANOPY_DATABASE_URL"],
    requiredMigrationTracks: ["postgres"]
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.postgis-geospatial",
    title: "PostGIS geospatial runtime",
    targetIds: ["adapter-target.geospatial.postgis"],
    requiredEnvironment: ["CANOPY_DATABASE_URL"],
    requiredMigrationTracks: ["postgis"]
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.timescaledb-time-series",
    title: "TimescaleDB time-series runtime",
    targetIds: ["adapter-target.time-series.timescaledb"],
    requiredEnvironment: ["CANOPY_DATABASE_URL"],
    requiredMigrationTracks: ["timescaledb"]
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.pgvector-vector",
    title: "pgvector semantic index runtime",
    targetIds: ["adapter-target.vector.pgvector"],
    requiredEnvironment: ["CANOPY_DATABASE_URL"],
    requiredMigrationTracks: ["pgvector"]
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.s3-compatible-storage",
    title: "S3-compatible object storage",
    targetIds: ["adapter-target.object-storage.s3-compatible"],
    requiredEnvironment: [
      "CANOPY_OBJECT_STORAGE_ENDPOINT",
      "CANOPY_OBJECT_STORAGE_BUCKET",
      "CANOPY_OBJECT_STORAGE_REGION"
    ],
    requiredMigrationTracks: ["s3-compatible"]
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.activitypub-transport",
    title: "ActivityPub federation transport",
    targetIds: ["adapter-target.federation-transport.activitypub"],
    requiredEnvironment: [
      "CANOPY_FEDERATION_BASE_URL",
      "CANOPY_FEDERATION_SIGNING_KEY_REF"
    ],
    requiredMigrationTracks: []
  }),
  providerDeploymentRequirement({
    id: "phase-10.deployment.legacy-fold-in-sources",
    title: "Legacy fold-in import roots",
    targetIds: legacyProviderTargets.map((target) => target.id),
    requiredEnvironment: ["CANOPY_LEGACY_IMPORT_ROOT"],
    requiredMigrationTracks: []
  })
] satisfies readonly Phase10ProviderDeploymentRequirement[];

export const adapterProviderTargetsByKind: Readonly<
  Record<AdapterKind, readonly AdapterProviderTarget[]>
> = {
  auth: targetsForKind("auth"),
  persistence: targetsForKind("persistence"),
  "event-store": targetsForKind("event-store"),
  "object-graph": targetsForKind("object-graph"),
  "document-store": targetsForKind("document-store"),
  "object-storage": targetsForKind("object-storage"),
  geospatial: targetsForKind("geospatial"),
  "time-series": targetsForKind("time-series"),
  vector: targetsForKind("vector"),
  "federation-transport": targetsForKind("federation-transport"),
  "legacy-project": targetsForKind("legacy-project")
};

export function getAdapterProviderTargets(
  kind: AdapterKind
): readonly AdapterProviderTarget[] {
  return adapterProviderTargetsByKind[kind];
}

export function createPhase10ProviderDeploymentReadinessReport(
  input: Phase10ProviderDeploymentReadinessInput = {}
): Phase10ProviderDeploymentReadinessReport {
  const providerTargets = input.providerTargets ?? adapterProviderTargets;
  const targetMap = new Map(providerTargets.map((target) => [target.id, target]));
  const satisfiedProductionGateIds = new Set(input.satisfiedProductionGateIds ?? []);
  const availableEnvironment = new Set(input.availableEnvironment ?? []);
  const migrationReadiness = input.migrationReadiness ?? {
    status: "unknown",
    providerTracks: [],
    missingTables: [],
    issueCodes: []
  };
  const migrationTracks = new Set(migrationReadiness.providerTracks);
  const deploymentGates: readonly Phase10ProviderDeploymentGate[] =
    phase10ProviderDeploymentRequirements.map((requirement) => {
      const targets = requirement.targetIds
        .map((targetId) => targetMap.get(targetId))
        .filter((target): target is AdapterProviderTarget => target !== undefined);
      const missingTargetIds = requirement.targetIds.filter(
        (targetId) => !targetMap.has(targetId)
      );
      const nonImplementedTargetIds = targets
        .filter((target) => target.status !== "implemented")
        .map((target) => target.id);
      const missingEnvironment = requirement.requiredEnvironment.filter(
        (envVar) => !availableEnvironment.has(envVar)
      );
      const missingMigrationTracks = requirement.requiredMigrationTracks.filter(
        (track) => !migrationTracks.has(track)
      );
      const missingProductionGateIds = uniqueCanopyIds(
        targets.flatMap((target) =>
          target.requiredBeforeProductionUse.filter(
            (gateId) => !satisfiedProductionGateIds.has(gateId)
          )
        )
      );
      const blockerCodes = deploymentBlockerCodes({
        missingTargetIds,
        nonImplementedTargetIds,
        missingEnvironment,
        missingMigrationTracks,
        missingProductionGateIds,
        migrationReadiness,
        requiresMigration: requirement.requiredMigrationTracks.length > 0
      });

      return {
        id: requirement.id,
        title: requirement.title,
        status: blockerCodes.length === 0 ? "ready" : "blocked",
        targetIds: requirement.targetIds,
        requiredEnvironment: requirement.requiredEnvironment,
        missingEnvironment,
        requiredMigrationTracks: requirement.requiredMigrationTracks,
        missingMigrationTracks,
        nonImplementedTargetIds: [
          ...missingTargetIds,
          ...nonImplementedTargetIds
        ],
        missingProductionGateIds,
        blockerCodes
      };
    });
  const blockedDeploymentGateCount = deploymentGates.filter(
    (gate) => gate.status === "blocked"
  ).length;
  const attentionDeploymentGateCount = deploymentGates.filter(
    (gate) => gate.status === "attention"
  ).length;
  const missingEnvironmentCount = deploymentGates.reduce(
    (count, gate) => count + gate.missingEnvironment.length,
    0
  );
  const releaseBlockers = uniqueCanopyIds(
    deploymentGates.flatMap((gate) =>
      gate.blockerCodes.map((code) => `${gate.id}.${code}`)
    )
  );

  return {
    id: "phase-10.provider-deployment-readiness",
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    status: blockedDeploymentGateCount > 0 ? "blocked" : "ready",
    summary: {
      providerTargetCount: providerTargets.length,
      candidateProviderTargetCount: providerTargets.filter(
        (target) => target.role === "candidate-provider"
      ).length,
      implementedProductionProviderTargetCount: providerTargets.filter(
        (target) =>
          (target.role === "candidate-provider" ||
            target.role === "legacy-fold-in-source") &&
          target.status === "implemented"
      ).length,
      deploymentGateCount: deploymentGates.length,
      blockedDeploymentGateCount,
      attentionDeploymentGateCount,
      missingEnvironmentCount
    },
    migrationReadiness,
    deploymentGates,
    releaseBlockers,
    nextActions: nextDeploymentReadinessActions(deploymentGates)
  };
}

function legacyProviderTarget(sourceProject: SourceProject): AdapterProviderTarget {
  return providerTarget({
    id: `adapter-target.legacy-project.${sourceProject}`,
    kind: "legacy-project",
    provider: sourceProject,
    role: "legacy-fold-in-source",
    status: "planned",
    plannedPackage: `packages/adapters/legacy/${sourceProject}`,
    conformanceSuiteKind: "legacy-project",
    sourceProject,
    requiredBeforeProductionUse: [
      ...sharedProductionGates,
      "adapter.legacy-project.source-pointer-required",
      "adapter.legacy-project.canonical-mapping-reviewed"
    ]
  });
}

function providerTarget(target: AdapterProviderTarget): AdapterProviderTarget {
  return target;
}

function providerDeploymentRequirement(
  requirement: Phase10ProviderDeploymentRequirement
): Phase10ProviderDeploymentRequirement {
  return requirement;
}

function targetsForKind(kind: AdapterKind): readonly AdapterProviderTarget[] {
  return adapterProviderTargets.filter((target) => target.kind === kind);
}

function deploymentBlockerCodes(input: {
  readonly missingTargetIds: readonly CanopyId[];
  readonly nonImplementedTargetIds: readonly CanopyId[];
  readonly missingEnvironment: readonly string[];
  readonly missingMigrationTracks: readonly string[];
  readonly missingProductionGateIds: readonly CanopyId[];
  readonly migrationReadiness: Phase10MigrationReadinessEvidence;
  readonly requiresMigration: boolean;
}): readonly CanopyId[] {
  const blockerCodes: CanopyId[] = [];

  if (input.missingTargetIds.length > 0) {
    blockerCodes.push("provider-target-missing");
  }

  if (input.nonImplementedTargetIds.length > 0) {
    blockerCodes.push("provider-target-not-implemented");
  }

  if (input.missingProductionGateIds.length > 0) {
    blockerCodes.push("production-gate-evidence-missing");
  }

  if (input.missingEnvironment.length > 0) {
    blockerCodes.push("deployment-environment-missing");
  }

  if (input.missingMigrationTracks.length > 0) {
    blockerCodes.push("migration-track-missing");
  }

  if (
    input.requiresMigration &&
    (input.migrationReadiness.status !== "ready" ||
      input.migrationReadiness.missingTables.length > 0 ||
      input.migrationReadiness.issueCodes.length > 0)
  ) {
    blockerCodes.push("migration-readiness-not-ready");
  }

  return blockerCodes;
}

function nextDeploymentReadinessActions(
  deploymentGates: readonly Phase10ProviderDeploymentGate[]
): readonly string[] {
  const actions = new Set<string>();

  for (const gate of deploymentGates) {
    if (gate.nonImplementedTargetIds.length > 0) {
      actions.add(
        "Promote provider targets from planned/prototype to implemented only after executable provider packages pass conformance."
      );
    }

    if (gate.missingProductionGateIds.length > 0) {
      actions.add(
        "Attach machine-readable evidence for every requiredBeforeProductionUse gate before release."
      );
    }

    if (gate.missingEnvironment.length > 0) {
      actions.add(
        "Declare deployment environment bindings for auth, storage, database, federation, and fold-in imports."
      );
    }

    if (gate.missingMigrationTracks.length > 0) {
      actions.add(
        "Publish migration readiness evidence for every provider track used by deployment gates."
      );
    }
  }

  return [...actions];
}

function uniqueCanopyIds(ids: readonly CanopyId[]): readonly CanopyId[] {
  return [...new Set(ids)];
}
