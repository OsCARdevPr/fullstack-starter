import type { PublicConfig } from "@starter/contracts";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildMe, renderApp, stubApi as stubRoutes } from "@/test/render-app";

const signedOut = () =>
  Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Authentication required.", requestId: "r1" } },
    { status: 401 },
  );

const signedIn = () => Response.json({ data: buildMe() });

/** Fakes the API: `/api/me` answers with `me`, `/api/config` with `config`. */
function stubApi({ me, config }: { me: () => Response; config: PublicConfig }) {
  stubRoutes({
    "GET /api/me": me,
    "GET /api/config": () => Response.json({ data: config }),
  });
}

describe("auth routes", () => {
  it("redirects signed-out visitors to sign-in and remembers where they were going", async () => {
    stubApi({ me: signedOut, config: { tenancyMode: "single", allowSignup: true } });

    const { router } = renderApp("/");

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

    const { router } = renderApp("/sign-up");

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
