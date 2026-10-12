import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appConfig } from "@/config/app.config";
import { authClient } from "@/lib/auth-client";
import { buildMe, renderApp, stubApi } from "@/test/render-app";

vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: {
    signOut: vi.fn(),
    organization: { list: vi.fn(), setActive: vi.fn(), create: vi.fn() },
  },
}));

const organizations = [
  { id: "org-1", name: "Acme", slug: "acme", createdAt: new Date(), logo: null, metadata: null },
  {
    id: "org-2",
    name: "Globex",
    slug: "globex",
    createdAt: new Date(),
    logo: null,
    metadata: null,
  },
];

function stubSignedIn(me = buildMe()) {
  return stubApi({
    "GET /api/me": () => Response.json({ data: me }),
    "GET /api/projects": () =>
      Response.json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
  });
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.mocked(authClient.organization.list).mockResolvedValue({
      data: organizations,
      error: null,
    } as never);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({
      data: {},
      error: null,
    } as never);
  });

  it("shows the configured navigation with the current page marked", async () => {
    stubSignedIn();
    renderApp("/projects");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    for (const item of appConfig.navItems) {
      expect(within(nav).getByRole("link", { name: item.label })).toHaveAttribute("href", item.to);
    }
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  it("shows the organization name without a switcher in single mode", async () => {
    stubSignedIn(buildMe({ tenancyMode: "single" }));
    renderApp("/projects");

    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acme/ })).not.toBeInTheDocument();
    expect(authClient.organization.list).not.toHaveBeenCalled();
  });

  it("switches the active organization in multi mode", async () => {
    stubSignedIn(buildMe({ tenancyMode: "multi" }));
    renderApp("/");

    await userEvent.click(await screen.findByRole("button", { name: /Acme/ }));
    expect(await screen.findByRole("menuitem", { name: "Create organization" })).toBeVisible();
    await userEvent.click(screen.getByRole("menuitem", { name: "Globex" }));

    await vi.waitFor(() =>
      expect(authClient.organization.setActive).toHaveBeenCalledWith({ organizationId: "org-2" }),
    );
  });

  it("shows a retry inside the menu when the organizations fail to load", async () => {
    vi.mocked(authClient.organization.list).mockResolvedValueOnce({
      data: null,
      error: { status: 403, message: "Forbidden." },
    } as never);
    stubSignedIn(buildMe({ tenancyMode: "multi" }));
    renderApp("/");

    await userEvent.click(await screen.findByRole("button", { name: /Acme/ }));
    expect(await screen.findByText("Couldn't load organizations.")).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "Globex" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "Retry" }));

    expect(await screen.findByRole("menuitem", { name: "Globex" })).toBeVisible();
    expect(screen.queryByText("Couldn't load organizations.")).not.toBeInTheDocument();
  });

  it("asks multi-mode users without an organization to create one", async () => {
    stubSignedIn(buildMe({ tenancyMode: "multi", organization: null, role: null }));
    renderApp("/");

    expect(
      await screen.findByRole("heading", { name: "Create your first organization" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Welcome/ })).not.toBeInTheDocument();
  });
});
