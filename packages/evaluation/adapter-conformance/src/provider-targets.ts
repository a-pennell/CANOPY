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
    status: "planned",
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
    status: "planned",
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
    status: "planned",
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
    status: "planned",
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
    status: "planned",
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
    status: "planned",
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

function targetsForKind(kind: AdapterKind): readonly AdapterProviderTarget[] {
  return adapterProviderTargets.filter((target) => target.kind === kind);
}
