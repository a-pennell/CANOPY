import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@canopy/database-import-plans",
    environment: "node",
    include: ["packages/database/import-plans/src/**/*.test.ts"],
  },
});
