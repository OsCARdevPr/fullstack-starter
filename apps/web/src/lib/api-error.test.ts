import { describe, expect, it } from "vitest";
import { ApiError, getErrorMessage, getFieldErrors, isApiError } from "./api-error";

const validationError = new ApiError({
  code: "VALIDATION_ERROR",
  status: 422,
  message: "Invalid input.",
  details: { fieldErrors: { name: ["Too short"] }, formErrors: ["Check the form."] },
  requestId: "req-1",
});

describe("ApiError", () => {
  it("is recognized by isApiError", () => {
    expect(isApiError(validationError)).toBe(true);
    expect(isApiError(new Error("boom"))).toBe(false);
  });
});

describe("getFieldErrors", () => {
  it("returns the field errors of a validation error", () => {
    expect(getFieldErrors(validationError)).toEqual({ name: ["Too short"] });
  });

  it("returns an empty object for other errors", () => {
    const conflict = new ApiError({ code: "CONFLICT", status: 409, message: "Taken." });

    expect(getFieldErrors(conflict)).toEqual({});
    expect(getFieldErrors(new Error("boom"))).toEqual({});
  });

  it("ignores validation details that do not match the contract", () => {
    const malformed = new ApiError({
      code: "VALIDATION_ERROR",
      status: 422,
      message: "Invalid input.",
      details: "nope",
    });

    expect(getFieldErrors(malformed)).toEqual({});
  });
});

describe("getErrorMessage", () => {
  it("uses the API message", () => {
    expect(getErrorMessage(validationError)).toBe("Invalid input.");
  });

  it("hides unexpected errors behind a generic message", () => {
    expect(getErrorMessage(new Error("Cannot read properties of undefined"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
