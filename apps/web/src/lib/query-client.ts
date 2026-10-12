import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type ApiErrorCode, getErrorMessage, isApiError } from "./api-error";

/** Options every query and mutation can set through `meta`. */
export interface RequestMeta extends Record<string, unknown> {
  /** The caller handles errors itself: no global toast and no sign-in redirect. */
  silent?: boolean;
  /**
   * Error codes the caller shows itself, e.g. a form that puts CONFLICT and VALIDATION_ERROR on
   * its fields. Those get no toast; any other error still does, and UNAUTHENTICATED still signs out.
   */
  handledErrors?: ApiErrorCode[];
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: RequestMeta;
    mutationMeta: RequestMeta;
  }
}

const MAX_RETRIES = 2;

/** Client errors (4xx) will fail again, so only server and network errors are retried. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export interface QueryClientOptions {
  /** Called after the cache is cleared because the session ended (redirect to sign-in). */
  onUnauthenticated: () => void;
}

/**
 * The app's QueryClient. A failed mutation, or a failed background refetch of a query that already
 * shows data, gets a toast with the error message, unless it sets `meta: { silent: true }` or
 * lists the error code in `meta.handledErrors`. A query failing on its first load gets no toast:
 * the page renders it inline with `ErrorState`. An expired session clears the cache and signs out.
 */
export function createQueryClient({ onUnauthenticated }: QueryClientOptions): QueryClient {
  const handleError = (error: unknown, meta: RequestMeta | undefined, showToast: boolean) => {
    if (meta?.silent) return;
    if (isApiError(error) && error.code === "UNAUTHENTICATED") {
      queryClient.clear();
      onUnauthenticated();
      return;
    }
    if (!showToast) return;
    if (isApiError(error) && meta?.handledErrors?.includes(error.code)) return;
    toast.error(getErrorMessage(error));
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleError(error, query.meta, query.state.data !== undefined),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _result, mutation) => handleError(error, mutation.meta, true),
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
    },
  });
  return queryClient;
}
