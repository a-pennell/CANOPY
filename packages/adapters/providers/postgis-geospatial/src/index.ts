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

export const postgisGeospatialAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "geospatial";
} = {
  id: "adapter.provider.postgis.geospatial",
  kind: "geospatial",
  name: "PostGIS geospatial adapter",
  provider: "postgis",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "audit"],
  supportedObjectTypes: ["place", "commons", "living-system", "resource"],
  supportedEventTypes: []
};

export const postgisGeospatialAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.geospatial.postgis",
  descriptor: postgisGeospatialAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/postgis-geospatial",
  conformanceSuiteKind: "geospatial",
  productionGates: [
    "adapter.geospatial.place-scope-query",
    "adapter.geospatial.geometry-round-trip"
  ]
};

export function postgisGeospatialAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgisGeospatialAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no PostGIS client bound yet."]
  };
}
