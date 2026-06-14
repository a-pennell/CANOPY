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

export const pgvectorVectorAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "vector";
} = {
  id: "adapter.provider.pgvector.vector",
  kind: "vector",
  name: "pgvector vector adapter",
  provider: "pgvector",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "redaction", "audit"],
  supportedObjectTypes: ["claim", "evidence", "source", "model"],
  supportedEventTypes: []
};

export const pgvectorVectorAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.vector.pgvector",
  descriptor: pgvectorVectorAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/pgvector-vector",
  conformanceSuiteKind: "vector",
  productionGates: [
    "adapter.vector.source-ref-preserved",
    "adapter.vector.stewardship-filtering"
  ]
};

export function pgvectorVectorAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: pgvectorVectorAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no pgvector client bound yet."]
  };
}
