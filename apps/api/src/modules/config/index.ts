import type { PublicConfig } from "@starter/contracts";
import { Hono } from "hono";
import type { AppEnv } from "../../core/context";
import { ok } from "../../core/http";
import type { AppDeps } from "../../deps";

/** Public, session-free settings the web app reads at startup (single source of truth). */
export function createConfigRouter({ env }: Pick<AppDeps, "env">) {
  return new Hono<AppEnv>().get("/", (c) => {
    const config: PublicConfig = {
      tenancyMode: env.TENANCY_MODE,
      allowSignup: env.AUTH_ALLOW_SIGNUP,
    };
    return ok(c, config);
  });
}
