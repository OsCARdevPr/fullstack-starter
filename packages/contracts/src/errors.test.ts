import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  apiErrorBodySchema,
  ERROR_STATUS,
  ErrorCode,
  errorCodeSchema,
  isErrorCode,
  validationErrorDetailsSchema,
} from "./errors";

const ALL_CODES = Object.values(ErrorCode);

describe("ErrorCode", () => {
  it("exposes every documented code with matching key and value", () => {
    expect(ALL_CODES).toEqual([
      "BAD_REQUEST",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "VALIDATION_ERROR",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
      "SERVICE_UNAVAILABLE",
    ]);
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(key).toBe(value);
    }
  });

  it("errorCodeSchema accepts every code and rejects unknown values", () => {
    for (const code of ALL_CODES) {
      expect(errorCodeSchema.parse(code)).toBe(code);
    }
    expect(errorCodeSchema.safeParse("NETWORK_ERROR").success).toBe(false);
  });
});

describe("ERROR_STATUS", () => {
  it("maps every code to an HTTP status", () => {
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ALL_CODES].sort());
  });

  it("uses the documented statuses", () => {
    expect(ERROR_STATUS).toEqual({
      BAD_REQUEST: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      VALIDATION_ERROR: 422,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    });
  });
});

describe("isErrorCode", () => {
  it("narrows known codes", () => {
    expect(isErrorCode("NOT_FOUND")).toBe(true);
  });

  it.each([["not_found"], ["NETWORK_ERROR"], [""], [404], [null], [undefined], [{}]])(
    "rejects %j",
    (value) => {
      expect(isErrorCode(value)).toBe(false);
    },
  );
});

describe("validationErrorDetailsSchema", () => {
  it("accepts the output of z.flattenError", () => {
    const schema = z.object({ name: z.string().min(2), email: z.email() });
    const result = schema.safeParse({ name: "a", email: "nope" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const details = validationErrorDetailsSchema.parse(z.flattenError(result.error));
    expect(Object.keys(details.fieldErrors).sort()).toEqual(["email", "name"]);
    expect(details.formErrors).toEqual([]);
  });

  it("rejects non-array field errors", () => {
    const result = validationErrorDetailsSchema.safeParse({
      fieldErrors: { name: "required" },
      formErrors: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("apiErrorBodySchema", () => {
  it("parses a complete error body", () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request.",
        details: { fieldErrors: { name: ["Too short"] }, formErrors: [] },
        requestId: "req_123",
      },
    };
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
  });

  it("treats details as optional", () => {
    const body = { error: { code: "NOT_FOUND", message: "Not found.", requestId: "req_1" } };
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
  });

  it("rejects unknown codes and missing request ids", () => {
    expect(
      apiErrorBodySchema.safeParse({
        error: { code: "TEAPOT", message: "x", requestId: "req_1" },
      }).success,
    ).toBe(false);
    expect(
      apiErrorBodySchema.safeParse({ error: { code: "NOT_FOUND", message: "x" } }).success,
    ).toBe(false);
  });
});
