import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Reads DATABASE_URL_TEST from the repository-level .env when it exists; inline values win.
const rootEnvFile = "../../.env";
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

export default defineConfig({
  test: {
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["src/test/integration/global-setup.ts"],
    // Every file truncates the same database, so files run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
