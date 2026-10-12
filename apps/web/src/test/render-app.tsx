import type { Me } from "@starter/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createAppRouter } from "@/app/router";
import { ThemeProvider } from "@/app/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/query-client";

/** A signed-in owner of "Acme" in single tenancy mode; override any part. */
export function buildMe(overrides: Partial<Me> = {}): Me {
  return {
    user: {
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerified: true,
      image: null,
      role: "user",
    },
    organization: { id: "org-1", name: "Acme", slug: "acme" },
    role: "owner",
    tenancyMode: "single",
    ...overrides,
  };
}

export type ApiHandler = (request: Request) => Response | Promise<Response>;

/**
 * Fakes the API with a global `fetch` stub. Routes are keyed by `"METHOD /path"` (the query
 * string is ignored); unknown routes answer 404. Returns the mock to inspect the calls.
 *
 * @example stubApi({ "GET /api/me": () => Response.json({ data: buildMe() }) });
 */
export function stubApi(routes: Record<string, ApiHandler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(String(input), "http://localhost"), init);
    const { pathname } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}`];
    return handler ? handler(request) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Renders the whole app (real routes, providers and query client) at `path`. */
export function renderApp(path: string) {
  const queryClient = createQueryClient({ onUnauthenticated: vi.fn() });
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }));
  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { router, queryClient };
}
