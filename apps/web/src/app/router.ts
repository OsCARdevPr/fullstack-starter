import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { RouteError } from "@/components/feedback";
import { routeTree } from "@/routeTree.gen";

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
}

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient } satisfies RouterContext,
    defaultPreload: "intent",
    // TanStack Query owns caching, so loaders always run and read from the query cache.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // A page that fails to load shows its error inside the app shell, with "Try again".
    defaultErrorComponent: RouteError,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
