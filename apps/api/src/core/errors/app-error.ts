import type { ErrorCode, ValidationErrorDetails } from "@starter/contracts";

/** Client-safe default message for each error code. */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: "The request is invalid.",
  UNAUTHENTICATED: "Authentication is required.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "The request conflicts with the current state of the resource.",
  PAYLOAD_TOO_LARGE: "The request body is too large.",
  VALIDATION_ERROR: "The request contains invalid fields.",
  RATE_LIMITED: "Too many requests. Try again later.",
  INTERNAL_ERROR: "An unexpected error occurred.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable.",
};

/** An expected failure whose code, message and details are safe to send to the client. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string = DEFAULT_ERROR_MESSAGES[code],
    options: { details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function badRequest(message?: string, details?: unknown) {
  return new AppError("BAD_REQUEST", message, { details });
}

export function unauthenticated(message?: string) {
  return new AppError("UNAUTHENTICATED", message);
}

export function forbidden(message?: string) {
  return new AppError("FORBIDDEN", message);
}

export function notFound(message?: string, details?: unknown) {
  return new AppError("NOT_FOUND", message, { details });
}

export function conflict(message?: string, details?: unknown) {
  return new AppError("CONFLICT", message, { details });
}

/** The body is larger than the API accepts (nginx answers the same code in production). */
export function payloadTooLarge(maxBytes: number) {
  return new AppError("PAYLOAD_TOO_LARGE", `The request body exceeds the ${maxBytes}-byte limit.`, {
    details: { maxBytes },
  });
}

export function validationFailed(details: ValidationErrorDetails, message?: string) {
  return new AppError("VALIDATION_ERROR", message, { details });
}

export function rateLimited(retryAfterSeconds: number) {
  return new AppError("RATE_LIMITED", undefined, { details: { retryAfterSeconds } });
}

export function serviceUnavailable(message?: string, cause?: unknown) {
  return new AppError("SERVICE_UNAVAILABLE", message, { cause });
}
