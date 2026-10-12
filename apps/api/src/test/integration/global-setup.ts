import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { testDatabaseUrl } from "./context";

const migrationsFolder = fileURLToPath(new URL("../../db/migrations", import.meta.url));

/** Creates the test database on first use, using the server's maintenance database. */
async function createDatabaseIfMissing(url: string) {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  target.pathname = "/postgres";
  const admin = postgres(target.toString(), { max: 1, onnotice: () => {} });
  try {
    const [existing] = await admin`select 1 from pg_database where datname = ${name}`;
    if (!existing) await admin.unsafe(`create database "${name.replaceAll('"', '""')}"`);
  } finally {
    await admin.end();
  }
}

/** Runs once per integration run: a clean schema built from the committed migrations. */
export default async function setup() {
  const url = testDatabaseUrl();
  await createDatabaseIfMissing(url);

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(
      "drop schema if exists drizzle cascade; drop schema if exists public cascade; create schema public;",
    );
    await migrate(drizzle({ client }), { migrationsFolder });
  } finally {
    await client.end();
  }
}
