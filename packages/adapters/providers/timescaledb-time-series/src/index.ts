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

export const timescaleTimeSeriesAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "time-series";
} = {
  id: "adapter.provider.timescaledb.time-series",
  kind: "time-series",
  name: "TimescaleDB time-series adapter",
  provider: "timescaledb",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["append", "read", "search", "replay", "audit"],
  supportedObjectTypes: ["indicator", "threshold", "model", "flow"],
  supportedEventTypes: []
};

export const timescaleTimeSeriesAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.time-series.timescaledb",
  descriptor: timescaleTimeSeriesAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/timescaledb-time-series",
  conformanceSuiteKind: "time-series",
  productionGates: [
    "adapter.time-series.observation-order-stable",
    "adapter.time-series.window-boundaries-inclusive"
  ]
};

export function timescaleTimeSeriesAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: timescaleTimeSeriesAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no TimescaleDB client bound yet."]
  };
}
