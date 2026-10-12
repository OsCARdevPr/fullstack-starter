import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { payloadTooLarge } from "../errors";

/** Hono's secure header defaults plus a CSP that suits a JSON-only API. */
export function securityHeaders() {
  return secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  });
}

/** Cross-origin access for the web app only, with cookies. Same-origin deployments never need it. */
export function apiCors(webOrigin: string) {
  return cors({
    origin: (origin) => (origin === webOrigin ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id", "Retry-After"],
    maxAge: 600,
  });
}

/** Rejects oversized bodies with 413 PAYLOAD_TOO_LARGE, the same answer nginx gives. */
export function limitBody(maxBytes: number) {
  return bodyLimit({
    maxSize: maxBytes,
    onError: () => {
      throw payloadTooLarge(maxBytes);
    },
  });
}
