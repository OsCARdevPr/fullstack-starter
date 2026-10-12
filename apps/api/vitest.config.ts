import { configDefaults, defineConfig } from "vitest/config";

// Unit tests only, so `pnpm test` and `pnpm verify` never need a database.
// Postgres-backed `*.int.test.ts` files run with `pnpm test:integration`.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/*.int.test.ts"],
  },
});
