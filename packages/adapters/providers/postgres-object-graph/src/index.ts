import type {
  AdapterDescriptor,
  AdapterHealth
} from "@canopy/contracts-adapters";
import type { CanopyId, IsoDateTime } from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export const postgresObjectGraphAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "object-graph";
} = {
  id: "adapter.provider.postgres.object-graph",
  kind: "object-graph",
  name: "Postgres object graph adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "audit"],
  supportedObjectTypes: [],
  supportedEventTypes: []
};

export const postgresObjectGraphAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.object-graph.postgres",
  descriptor: postgresObjectGraphAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/postgres-object-graph",
  conformanceSuiteKind: "object-graph",
  productionGates: [
    "adapter.object-graph.relationship-direction-preserved",
    "adapter.object-graph.lifecycle-filtering"
  ]
};

export function postgresObjectGraphAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresObjectGraphAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no Postgres client bound yet."]
  };
}
