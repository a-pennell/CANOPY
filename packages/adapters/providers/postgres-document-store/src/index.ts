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

export const postgresDocumentStoreAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "document-store";
} = {
  id: "adapter.provider.postgres.document-store",
  kind: "document-store",
  name: "Postgres document store adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "export", "redaction", "audit"],
  supportedObjectTypes: ["source", "evidence", "decision-packet"],
  supportedEventTypes: []
};

export const postgresDocumentStoreAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.document-store.postgres",
  descriptor: postgresDocumentStoreAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/postgres-document-store",
  conformanceSuiteKind: "document-store",
  productionGates: [
    "adapter.document-store.content-hash-stable",
    "adapter.document-store.redaction-stubs"
  ]
};

export function postgresDocumentStoreAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresDocumentStoreAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no Postgres client bound yet."]
  };
}
