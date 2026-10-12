import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../../core/context";
import { serviceUnavailable } from "../../core/errors";
import { ok } from "../../core/http";
import type { AppDeps } from "../../deps";

export function createHealthRouter({ db }: Pick<AppDeps, "db">) {
  return (
    new Hono<AppEnv>()
      // Liveness: the process answers. Never touches dependencies.
      .get("/", (c) => ok(c, { status: "ok" as const }))
      // Readiness: the database answers.
      .get("/ready", async (c) => {
        try {
          await db.execute(sql`select 1`);
        } catch (error) {
          throw serviceUnavailable("The database is not reachable.", error);
        }
        return ok(c, { status: "ready" as const });
      })
  );
}
