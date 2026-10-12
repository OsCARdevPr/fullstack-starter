/**
 * Applies the SQL migrations with Drizzle's runtime migrator, so production needs no dev tools.
 * Container: `node dist/migrate.mjs` (the build copies `migrations/` next to it).
 * Development: `pnpm db:migrate` (drizzle-kit) applies the same files and the same journal.
 */
import { join } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client";

// Resolves to src/db/migrations from the source and to dist/migrations from the build.
const migrationsFolder = join(import.meta.dirname, "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to run migrations.");

  const { client, db } = createDatabase(url, { max: 1 });
  try {
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
