import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@agentcron/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    root: "../../",
    include: ["tests/api/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
  },
});
