import type { PublicConfig } from "@starter/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createAppRouter } from "@/app/router";
import { ThemeProvider } from "@/app/theme-provider";
import { createQueryClient } from "@/lib/query-client";

const signedOut = Response.json(
  { error: { code: "UNAUTHENTICATED", message: "Authentication required.", requestId: "r1" } },
  { status: 401 },
);

const signedIn = Response.json({
  data: {
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
  },
});

/** Fakes the API: `/api/me` answers with `me`, `/api/config` with `config`. */
function stubApi({ me, config }: { me: Response; config: PublicConfig }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/me")) return me.clone();
      if (url.endsWith("/api/config")) return Response.json({ data: config });
      return new Response(null, { status: 404 });
    }),
  );
}

function renderApp(path: string) {
  const queryClient = createQueryClient({ onUnauthenticated: vi.fn() });
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }));
  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return router;
}

describe("auth routes", () => {
  it("redirects signed-out visitors to sign-in and remembers where they were going", async () => {
    stubApi({ me: signedOut, config: { tenancyMode: "single", allowSignup: true } });

    const router = renderApp("/");

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(router.state.location.search).toEqual({ redirect: "/" });
  });

  it("links to sign-up when sign-up is allowed", async () => {
    stubApi({ me: signedOut, config: { tenancyMode: "single", allowSignup: true } });

    renderApp("/sign-in");

    expect(await screen.findByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("hides sign-up when the server does not allow it", async () => {
    stubApi({ me: signedOut, config: { tenancyMode: "single", allowSignup: false } });

    renderApp("/sign-in");

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign up" })).not.toBeInTheDocument();
  });

  it("sends /sign-up back to sign-in when sign-up is not allowed", async () => {
    stubApi({ me: signedOut, config: { tenancyMode: "single", allowSignup: false } });

    const router = renderApp("/sign-up");

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("sends signed-in users from sign-in to the app", async () => {
    stubApi({ me: signedIn, config: { tenancyMode: "single", allowSignup: false } });

    renderApp("/sign-in");

    expect(
      await screen.findByRole("heading", { name: "Welcome, Ada Lovelace" }),
    ).toBeInTheDocument();
  });
});
