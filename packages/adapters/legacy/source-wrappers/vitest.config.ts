import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@canopy/adapters-legacy-source-wrappers",
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
