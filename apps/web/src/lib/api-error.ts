import {
  ERROR_STATUS,
  type ErrorCode,
  type ValidationErrorDetails,
  validationErrorDetailsSchema,
} from "@starter/contracts";

/** Contract error codes plus the client-only `NETWORK_ERROR` (the request never got an answer). */
export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

export interface ApiErrorInit {
  code: ApiErrorCode;
  /** HTTP status; 0 when there was no response. */
  status: number;
  message: string;
  details?: unknown;
  requestId?: string;
}

/** The single error type the web app handles. Every failed API or auth call becomes one. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor({ code, status, message, details, requestId }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** User-facing message: the API message for an ApiError, a generic one for anything else. */
export function getErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : GENERIC_ERROR_MESSAGE;
}

/** `details` of a VALIDATION_ERROR, or undefined for any other error. */
export function getValidationDetails(error: unknown): ValidationErrorDetails | undefined {
  if (!isApiError(error) || error.code !== "VALIDATION_ERROR") return undefined;
  const parsed = validationErrorDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data : undefined;
}

/** Field errors of a VALIDATION_ERROR (`{ name: ["Too short"] }`), or `{}`. */
export function getFieldErrors(error: unknown): Record<string, string[]> {
  return getValidationDetails(error)?.fieldErrors ?? {};
}

const CODE_BY_STATUS = new Map<number, ErrorCode>(
  Object.entries(ERROR_STATUS).map(([code, status]) => [status, code as ErrorCode]),
);

/** Best-effort code for a response that did not carry the error envelope (proxy pages, etc.). */
export function errorCodeFromStatus(status: number): ApiErrorCode {
  if (status === 0) return "NETWORK_ERROR";
  const known = CODE_BY_STATUS.get(status);
  if (known) return known;
  if (status === 502 || status === 504) return "SERVICE_UNAVAILABLE";
  return status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
}
