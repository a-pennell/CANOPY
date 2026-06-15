import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@canopy/workflows-federation-reconciliation",
    include: ["src/**/*.test.ts"]
  }
});
