import { spawnSync } from "node:child_process";

const vitest = process.platform === "win32" ? "vitest.cmd" : "vitest";
const checks = [
  ["run", "--config", "packages/database/import-plans/vitest.config.ts"],
  ["run", "--config", "packages/database/migrations/vitest.config.ts"],
  ["run", "--config", "vitest.workspace.ts", "--project", "@canopy/database-runtime"],
  ["run", "--config", "vitest.workspace.ts", "--project", "@canopy/adapters-provider-postgres-event-store"],
  ["run", "--config", "vitest.workspace.ts", "--project", "@canopy/adapters-provider-postgres-persistence"]
];

for (const args of checks) {
  const result = spawnSync(vitest, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
