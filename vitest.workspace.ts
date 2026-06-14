import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/*/vitest.config.ts",
      "packages/contracts/*/vitest.config.ts",
      "packages/kernel/*/vitest.config.ts",
      "packages/capabilities/*/vitest.config.ts",
      "packages/projections/*/vitest.config.ts",
      "packages/adapters/*/*/vitest.config.ts",
      "packages/workflows/*/vitest.config.ts",
      "packages/database/*/vitest.config.ts",
      "packages/evaluation/*/vitest.config.ts"
    ]
  }
});
