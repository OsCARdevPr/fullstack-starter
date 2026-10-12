import type { ClientResponse } from "hono/client";
import { describe, expect, it } from "vitest";
import { unwrap } from "./api-client";
import { ApiError } from "./api-error";

function respond<T>(body: T, init?: ResponseInit) {
  return Promise.resolve(Response.json(body, init) as unknown as ClientResponse<T, 200, "json">);
}

function respondRaw(body: string | null, init: ResponseInit) {
  return Promise.resolve(
    new Response(body, init) as unknown as ClientResponse<unknown, 200, "json">,
  );
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("Expected the promise to reject");
}

describe("unwrap", () => {
  it("returns the parsed success body", async () => {
    await expect(unwrap(respond({ data: { id: "1" } }))).resolves.toEqual({ data: { id: "1" } });
  });

  it("returns undefined for 204 No Content", async () => {
    await expect(unwrap(respondRaw(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it("throws an ApiError built from the error envelope", async () => {
    const envelope = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input.",
        details: { fieldErrors: { name: ["Too short"] }, formErrors: [] },
        requestId: "req-123",
      },
    };

    const error = await captureError(unwrap(respond(envelope, { status: 422 })));

    expect(error).toMatchObject({
      code: "VALIDATION_ERROR",
      status: 422,
      message: "Invalid input.",
      details: envelope.error.details,
      requestId: "req-123",
    });
  });

  it("derives the code from the status when the error body is not JSON", async () => {
    const error = await captureError(
      unwrap(
        respondRaw("<html>Bad gateway</html>", {
          status: 502,
          headers: { "x-request-id": "req-502" },
        }),
      ),
    );

    expect(error).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      status: 502,
      requestId: "req-502",
    });
  });

  it("rejects a success response whose body is not valid JSON", async () => {
    const error = await captureError(unwrap(respondRaw("not json", { status: 200 })));

    expect(error).toMatchObject({ code: "INTERNAL_ERROR", status: 200 });
  });

  it("maps a failed request to NETWORK_ERROR", async () => {
    const error = await captureError(unwrap(Promise.reject(new TypeError("Failed to fetch"))));

    expect(error).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
  });

  it("lets aborted requests through untouched", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");

    await expect(unwrap(Promise.reject(abort))).rejects.toBe(abort);
  });
});
