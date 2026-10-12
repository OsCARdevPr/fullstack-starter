import type { OrganizationRole, OrganizationSummary } from "@starter/contracts";
import type { AuthSessionData } from "../lib/auth";
import type { Logger } from "../lib/logger";

export type AuthUser = AuthSessionData["user"];
export type AuthSession = AuthSessionData["session"];

/** The organization a request acts on, resolved from the session and verified by membership. */
export interface Tenant {
  organizationId: string;
  organization: OrganizationSummary;
  role: OrganizationRole;
}

/**
 * Hono environment shared by every router. `user`, `session` and `tenant` are only set by the
 * middleware that loads them; guards such as `requireAuth` narrow them to non-optional.
 */
export interface AppEnv {
  Variables: {
    requestId: string;
    logger: Logger;
    user?: AuthUser;
    session?: AuthSession;
    tenant?: Tenant;
  };
}
