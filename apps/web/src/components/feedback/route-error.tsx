import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { ErrorState } from "./error-state";

/** `errorComponent` for routes: the error and a "Try again" that reloads the route. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <ErrorState error={error} onRetry={() => router.invalidate()} />;
}
