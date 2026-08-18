import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/per-file-setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    env: {
      DATABASE_URL: "file:/home/z/my-project/db/test.db",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
