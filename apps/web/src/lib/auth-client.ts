import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ApiError, errorCodeFromStatus, GENERIC_ERROR_MESSAGE } from "./api-error";

/**
 * Better Auth client (sign-in, sign-up, sign-out, organizations, admin). Same origin as the app.
 * Calls return `{ data, error }`; turn `error` into an ApiError with `toApiError`.
 */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [organizationClient(), adminClient()],
});

/** The error object Better Auth client calls return. */
export interface AuthClientError {
  code?: string | undefined;
  message?: string | undefined;
  status: number;
  statusText?: string | undefined;
}

/**
 * Maps a Better Auth error (`{ code, message, status }`) to the app's ApiError so auth failures
 * are handled like any API failure. Better Auth's own code is kept in `details.authCode`.
 */
export function toApiError(error: AuthClientError): ApiError {
  const status = error.status || 0;
  return new ApiError({
    code: errorCodeFromStatus(status),
    status,
    message: error.message || GENERIC_ERROR_MESSAGE,
    details: error.code ? { authCode: error.code } : undefined,
  });
}
