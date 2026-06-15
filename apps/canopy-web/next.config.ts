import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: [
    "@canopy/app-shell",
    "@canopy/contracts-adapters",
    "@canopy/contracts-database",
    "@canopy/contracts-domain",
    "@canopy/contracts-governance",
    "@canopy/contracts-kernel",
    "@canopy/contracts-ui",
    "@canopy/database-import-plans",
    "@canopy/database-runtime",
    "@canopy/evaluation-vertical-slice",
    "@canopy/projections-authority",
    "@canopy/projections-claim-evidence",
    "@canopy/projections-civic-memory",
    "@canopy/projections-decision-packet",
    "@canopy/projections-federation-export",
    "@canopy/projections-object-page",
    "@canopy/projections-resource-stewardship",
    "@canopy/workflows-federation-reconciliation",
    "@canopy/workflows-import-execution",
    "@canopy/workflows-operations",
    "@canopy/workflows-outbox",
    "@canopy/workflows-projection-rebuild"
  ],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"]
    };

    return config;
  }
};

export default nextConfig;
