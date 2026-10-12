import { describe, expect, it } from "vitest";
import { toApiError } from "./auth-client";

describe("toApiError", () => {
  it.each([
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "VALIDATION_ERROR"],
    [400, "BAD_REQUEST"],
    [429, "RATE_LIMITED"],
    [500, "INTERNAL_ERROR"],
    [503, "SERVICE_UNAVAILABLE"],
  ] as const)("maps status %i to %s", (status, code) => {
    expect(toApiError({ status, statusText: "", message: "Failed." }).code).toBe(code);
  });

  it("keeps the Better Auth message, status and code", () => {
    const error = toApiError({
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
      status: 401,
      statusText: "UNAUTHORIZED",
    });

    expect(error).toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
      message: "Invalid email or password",
      details: { authCode: "INVALID_EMAIL_OR_PASSWORD" },
    });
  });

  it("treats a missing status as a network failure", () => {
    expect(toApiError({ status: 0, statusText: "" }).code).toBe("NETWORK_ERROR");
  });

  it("falls back to a generic message", () => {
    expect(toApiError({ status: 500, statusText: "" }).message).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
