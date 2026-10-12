import {
  type ApiErrorBody,
  ERROR_STATUS,
  type ErrorCode,
  type ErrorStatus,
} from "@starter/contracts";
import { HTTPException } from "hono/http-exception";
import { ZodError, z } from "zod";
import { AppError, DEFAULT_ERROR_MESSAGES } from "./app-error";
import { findPostgresError } from "./postgres";

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

export interface ErrorResponse {
  status: ErrorStatus;
  body: ApiErrorBody;
}

export interface ErrorResponseOptions {
  requestId: string;
  /** Only development exposes the message of unexpected errors. */
  isDevelopment: boolean;
}

interface Classified {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

function codeForStatus(status: number): ErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
}

function classify(error: unknown, isDevelopment: boolean): Classified {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }

  if (error instanceof HTTPException) {
    const code = codeForStatus(error.status);
    const exposeMessage = error.message && (code !== "INTERNAL_ERROR" || isDevelopment);
    return { code, message: exposeMessage ? error.message : DEFAULT_ERROR_MESSAGES[code] };
  }

  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: DEFAULT_ERROR_MESSAGES.VALIDATION_ERROR,
      details: z.flattenError(error),
    };
  }

  const postgres = findPostgresError(error);
  if (postgres) return postgres;

  const exposeMessage = isDevelopment && error instanceof Error && error.message;
  return {
    code: "INTERNAL_ERROR",
    message: exposeMessage ? error.message : DEFAULT_ERROR_MESSAGES.INTERNAL_ERROR,
  };
}

/** Pure mapping from any thrown value to the contract error envelope and its HTTP status. */
export function toErrorResponse(error: unknown, options: ErrorResponseOptions): ErrorResponse {
  const { code, message, details } = classify(error, options.isDevelopment);
  return {
    status: ERROR_STATUS[code],
    body: {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
        requestId: options.requestId,
      },
    },
  };
}
