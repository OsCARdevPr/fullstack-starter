import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node24",
  outDir: "dist",
  dts: false,
  sourcemap: true,
  // Contracts ship TypeScript source, so they must be compiled into the bundle.
  deps: { alwaysBundle: ["@starter/contracts"] },
});
