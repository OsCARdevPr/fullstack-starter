import { defineConfig } from "tsdown";

export default defineConfig({
  // dist/index.mjs (server), dist/migrate.mjs and dist/seed.mjs (one-off container commands).
  entry: { index: "src/index.ts", migrate: "src/db/migrate.ts", seed: "src/db/seed.ts" },
  format: "esm",
  platform: "node",
  target: "node24",
  outDir: "dist",
  dts: false,
  sourcemap: true,
  // Contracts ship TypeScript source, so they must be compiled into the bundle.
  deps: { alwaysBundle: ["@starter/contracts"] },
  // The runtime migrator reads the SQL files and meta/_journal.json from dist/migrations.
  copy: [{ from: "src/db/migrations", to: "dist" }],
});
