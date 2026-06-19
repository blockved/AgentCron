import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "../../",
    include: ["tests/api/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
  },
});
