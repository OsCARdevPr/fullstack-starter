import { apiErrorBodySchema } from "@starter/contracts";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { HTTPException } from "hono/http-exception";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, conflict, notFound, payloadTooLarge, validationFailed } from "./app-error";
import { toErrorResponse } from "./to-error-response";

const production = { requestId: "req-1", isDevelopment: false };
const development = { requestId: "req-1", isDevelopment: true };

function postgresError(code: string) {
  return new postgres.PostgresError({ message: `driver message ${code}`, code } as never);
}

describe("toErrorResponse", () => {
  it("maps an AppError to its contract status, code, message and details", () => {
    const result = toErrorResponse(notFound("Project not found.", { id: "p1" }), production);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Project not found.",
        details: { id: "p1" },
        requestId: "req-1",
      },
    });
    expect(apiErrorBodySchema.safeParse(result.body).success).toBe(true);
  });

  it("omits details when an AppError has none", () => {
    const result = toErrorResponse(conflict("Slug already taken."), production);
    expect(result.body.error).not.toHaveProperty("details");
  });

  it.each([
    [400, "BAD_REQUEST", 400],
    [401, "UNAUTHENTICATED", 401],
    [403, "FORBIDDEN", 403],
    [404, "NOT_FOUND", 404],
    [409, "CONFLICT", 409],
    [413, "PAYLOAD_TOO_LARGE", 413],
    [422, "VALIDATION_ERROR", 422],
    [429, "RATE_LIMITED", 429],
    [503, "SERVICE_UNAVAILABLE", 503],
  ] as const)("maps HTTPException %i to %s", (status, code, expectedStatus) => {
    const result = toErrorResponse(new HTTPException(status, { message: "boom" }), production);
    expect(result.status).toBe(expectedStatus);
    expect(result.body.error.code).toBe(code);
    expect(result.body.error.message).toBe("boom");
  });

  it("hides the message of a 5xx HTTPException outside development", () => {
    const error = new HTTPException(500, { message: "database password leaked" });

    expect(toErrorResponse(error, production).body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
    expect(toErrorResponse(error, development).body.error.message).toBe("database password leaked");
  });

  it("maps a ZodError to VALIDATION_ERROR with flattened details", () => {
    const schema = z.object({ name: z.string().min(2) });
    const parsed = schema.safeParse({ name: "a" });
    if (parsed.success) throw new Error("Expected the fixture to fail validation");

    const result = toErrorResponse(parsed.error, production);

    expect(result.status).toBe(422);
    expect(result.body.error.code).toBe("VALIDATION_ERROR");
    expect(result.body.error.details).toEqual(z.flattenError(parsed.error));
  });

  it.each([
    ["23505", "CONFLICT", 409],
    ["23503", "CONFLICT", 409],
    ["22P02", "BAD_REQUEST", 400],
  ] as const)("maps a direct Postgres error %s to %s", (sqlState, code, status) => {
    const result = toErrorResponse(postgresError(sqlState), production);
    expect(result.status).toBe(status);
    expect(result.body.error.code).toBe(code);
    expect(result.body.error.message).not.toContain("driver message");
  });

  it("finds a Postgres error wrapped in the cause of a Drizzle query error", () => {
    const wrapped = new DrizzleQueryError("insert into project", ["x"], postgresError("23505"));

    const result = toErrorResponse(wrapped, production);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("CONFLICT");
    expect(result.body.error.message).not.toContain("insert into");
  });

  it("finds a Postgres error several causes deep", () => {
    const deep = new Error("outer", {
      cause: new Error("middle", { cause: postgresError("23503") }),
    });
    expect(toErrorResponse(deep, production).body.error.code).toBe("CONFLICT");
  });

  it("treats an unmapped Postgres error as an internal error", () => {
    const result = toErrorResponse(postgresError("42P01"), production);
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("does not loop forever on a cyclic cause chain", () => {
    const error = new Error("self-referencing");
    error.cause = error;
    expect(toErrorResponse(error, production).status).toBe(500);
  });

  it("hides unexpected error messages outside development", () => {
    const error = new Error("connection string postgres://user:secret@db");

    expect(toErrorResponse(error, production).body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: "req-1",
    });
    expect(toErrorResponse(error, development).body.error.message).toBe(error.message);
  });

  it("handles thrown values that are not Error instances", () => {
    const result = toErrorResponse("plain string", development);
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("keeps the message of a deliberate AppError even when it is a 5xx", () => {
    const error = new AppError("SERVICE_UNAVAILABLE", "Database is unreachable.");
    expect(toErrorResponse(error, production).body.error.message).toBe("Database is unreachable.");
  });

  it("maps payloadTooLarge to 413 PAYLOAD_TOO_LARGE with the byte limit", () => {
    const result = toErrorResponse(payloadTooLarge(1024), production);

    expect(result.status).toBe(413);
    expect(result.body.error).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      message: "The request body exceeds the 1024-byte limit.",
      details: { maxBytes: 1024 },
    });
  });

  it("keeps validation details produced by validationFailed", () => {
    const details = { fieldErrors: { name: ["Too short"] }, formErrors: [] };
    const result = toErrorResponse(validationFailed(details), production);
    expect(result.status).toBe(422);
    expect(result.body.error.details).toEqual(details);
  });
});
