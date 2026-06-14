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

export const oidcAuthAdapterDescriptor: AdapterDescriptor & { readonly kind: "auth" } = {
  id: "adapter.provider.oidc.auth",
  kind: "auth",
  name: "OIDC auth adapter",
  provider: "oidc",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "audit"],
  supportedObjectTypes: ["account", "person", "role"],
  supportedEventTypes: ["identity.account.linked", "identity.session.revoked"]
};

export const oidcAuthAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.auth.oidc",
  descriptor: oidcAuthAdapterDescriptor,
  status: "planned",
  packagePath: "packages/adapters/providers/oidc-auth",
  conformanceSuiteKind: "auth",
  productionGates: [
    "adapter.auth.subject-account-separation",
    "adapter.auth.permission-trace-required"
  ]
};

export function oidcAuthAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: oidcAuthAdapterDescriptor.id,
    status: "unavailable",
    checkedAt,
    warnings: ["Provider implementation is a planned track and has no OIDC client bound yet."]
  };
}
