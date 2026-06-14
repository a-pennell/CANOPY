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

export const s3ObjectStorageAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "object-storage";
} = {
  id: "adapter.provider.s3-compatible.object-storage",
  kind: "object-storage",
  name: "S3-compatible object storage adapter",
  provider: "s3-compatible",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "export", "redaction", "audit"],
  supportedObjectTypes: ["source", "evidence"],
  supportedEventTypes: []
};

export const s3ObjectStorageAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.object-storage.s3-compatible",
  descriptor: s3ObjectStorageAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/s3-object-storage",
  conformanceSuiteKind: "object-storage",
  productionGates: [
    "adapter.object-storage.object-hash-stable",
    "adapter.object-storage.namespace-isolation"
  ]
};

export function s3ObjectStorageAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: s3ObjectStorageAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no S3 client bound yet."]
  };
}
