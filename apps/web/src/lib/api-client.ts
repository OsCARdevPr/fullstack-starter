import type { AppType } from "@starter/api";
import { apiErrorBodySchema } from "@starter/contracts";
import { type ClientResponse, hc } from "hono/client";
import type { SuccessStatusCode } from "hono/utils/http-status";
import { ApiError, errorCodeFromStatus } from "./api-error";

/**
 * Typed RPC client generated from the API routes (no codegen). Same origin: Vite proxies `/api`
 * in development and nginx in production, so the session cookie is sent automatically.
 *
 * @example const { data } = await unwrap(api.projects.$get({ query: { page: "1" } }));
 */
const client = hc<AppType>("/", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: "include" }),
});

export const api = client.api;

/** The success body of an RPC call: the JSON for 2xx, `undefined` for 204. */
export type SuccessBody<R> =
  R extends ClientResponse<infer T, infer S, infer _F>
    ? S extends 204
      ? undefined
      : S extends SuccessStatusCode
        ? T
        : never
    : never;

const UNEXPECTED_RESPONSE = "The server returned an unexpected response.";

/**
 * Awaits an RPC call and returns its success body, or throws an ApiError:
 * the contract error envelope when present, `NETWORK_ERROR` when the server was unreachable.
 * Accepts any response format: RPC types a 204 (e.g. DELETE) as "body" and the rest as "json".
 */
export async function unwrap<R extends ClientResponse<unknown, number, string>>(
  request: Promise<R>,
): Promise<SuccessBody<R>> {
  let response: R;
  try {
    response = await request;
  } catch (cause) {
    // Cancelled queries abort their request; that is not a failure to report.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError({
      code: "NETWORK_ERROR",
      status: 0,
      message: "Unable to reach the server. Check your connection and try again.",
      details: cause,
    });
  }

  if (response.status === 204) return undefined as SuccessBody<R>;

  const body: unknown = await response.json().catch(() => undefined);
  const requestId = response.headers.get("x-request-id") ?? undefined;

  if (response.ok) {
    if (body === undefined) {
      throw new ApiError({
        code: "INTERNAL_ERROR",
        status: response.status,
        message: UNEXPECTED_RESPONSE,
        requestId,
      });
    }
    return body as SuccessBody<R>;
  }

  const envelope = apiErrorBodySchema.safeParse(body);
  if (envelope.success) {
    throw new ApiError({ ...envelope.data.error, status: response.status });
  }
  throw new ApiError({
    code: errorCodeFromStatus(response.status),
    status: response.status,
    message: UNEXPECTED_RESPONSE,
    requestId,
  });
}
