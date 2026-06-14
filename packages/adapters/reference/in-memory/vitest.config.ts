import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@canopy/adapters-reference-in-memory",
    environment: "node"
  }
});
