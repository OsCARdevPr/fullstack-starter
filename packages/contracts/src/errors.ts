import { z } from "zod";

/** Machine-readable error codes shared by the API and the web client. */
export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorCodeSchema = z.enum(ErrorCode);

/** HTTP status for each error code. `satisfies` keeps literal types and enforces completeness. */
export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<ErrorCode, number>;

export type ErrorStatus = (typeof ERROR_STATUS)[ErrorCode];

export function isErrorCode(value: unknown): value is ErrorCode {
  return errorCodeSchema.safeParse(value).success;
}

/** `details` of a VALIDATION_ERROR. Matches the output of Zod 4 `z.flattenError`. */
export const validationErrorDetailsSchema = z.object({
  fieldErrors: z.record(z.string(), z.array(z.string())),
  formErrors: z.array(z.string()),
});

export type ValidationErrorDetails = z.infer<typeof validationErrorDetailsSchema>;

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string(),
});

export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;

/** Body of every non-2xx API response. */
export const apiErrorBodySchema = z.object({
  error: apiErrorSchema,
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
