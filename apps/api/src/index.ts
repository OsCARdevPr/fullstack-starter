import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { EnvValidationError, loadEnv } from "./config/env";
import { createTenancyRepository, createTenancyService } from "./core/tenancy";
import { createDatabase } from "./db/client";
import { createAuth } from "./lib/auth";
import { createLogger } from "./lib/logger";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function readEnv() {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnv();
const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === "development" });
const database = createDatabase(env.DATABASE_URL);
const tenancy = createTenancyService({
  repository: createTenancyRepository(database.db),
  mode: env.TENANCY_MODE,
  defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
});
const auth = createAuth({ env, db: database.db, tenancy, logger });
const app = createApp({ env, db: database.db, auth, logger, tenancy });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port, env: env.NODE_ENV, tenancy: env.TENANCY_MODE }, "API listening");
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out; exiting");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await database.client.end({ timeout: 5 });
    logger.info("shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "shutdown failed");
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
