import { CANOPY_ADAPTER_KINDS } from "@canopy/contracts-adapters";
import type { CanopyAdapterKind } from "@canopy/contracts-adapters";
import type { CanopyCapability } from "@canopy/contracts-kernel";

export type AdapterKind = CanopyAdapterKind;

export const adapterKinds = CANOPY_ADAPTER_KINDS;

export type AdapterCapabilityGroup =
  | CanopyCapability
  | "document-memory"
  | "object-memory"
  | "geospatial-indexing"
  | "time-series-indexing"
  | "vector-indexing"
  | "legacy-project-folding";

export const adapterCapabilityGroupsByKind = {
  auth: ["identity-authority", "data-stewardship"],
  persistence: ["civic-memory", "data-stewardship"],
  "event-store": ["civic-memory", "federation"],
  "object-graph": ["civic-memory", "governance"],
  "document-store": ["document-memory", "data-stewardship"],
  "object-storage": ["object-memory", "data-stewardship"],
  geospatial: ["geospatial-indexing", "ecological-modeling"],
  "time-series": ["time-series-indexing", "ecological-modeling"],
  vector: ["vector-indexing", "claims-evidence"],
  "federation-transport": ["federation", "data-stewardship"],
  "legacy-project": ["legacy-project-folding", "federation"]
} as const satisfies Readonly<Record<AdapterKind, readonly AdapterCapabilityGroup[]>>;
