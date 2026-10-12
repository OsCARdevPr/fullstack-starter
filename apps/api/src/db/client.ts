import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export interface DatabaseOptions {
  /** Maximum pool size. */
  max?: number;
}

/** Creates the postgres.js client and the Drizzle instance. postgres.js connects lazily. */
export function createDatabase(url: string, options: DatabaseOptions = {}) {
  const client = postgres(url, { max: options.max ?? 10, onnotice: () => {} });
  const db = drizzle({ client, schema, casing: "snake_case" });
  return { client, db };
}

export type Database = ReturnType<typeof createDatabase>["db"];
export type DatabaseClient = ReturnType<typeof createDatabase>["client"];
