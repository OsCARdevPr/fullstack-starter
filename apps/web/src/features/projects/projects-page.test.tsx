import type { OrganizationRole, Project } from "@starter/contracts";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildMe, renderApp, stubApi } from "@/test/render-app";

const projects: Project[] = [
  {
    id: "7d1c8f8e-0000-4000-8000-000000000001",
    organizationId: "org-1",
    name: "Alpha",
    description: "First project",
    status: "active",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  },
  {
    id: "7d1c8f8e-0000-4000-8000-000000000002",
    organizationId: "org-1",
    name: "Beta",
    description: null,
    status: "archived",
    createdAt: "2026-10-03T10:00:00.000Z",
    updatedAt: "2026-10-04T10:00:00.000Z",
  },
];

const listResponse = () =>
  Response.json({ data: projects, meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } });

function stubProjectsApi(role: OrganizationRole = "owner") {
  return stubApi({
    "GET /api/me": () => Response.json({ data: buildMe({ role }) }),
    "GET /api/projects": listResponse,
    "POST /api/projects": () =>
      Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "A project with this name already exists.",
            requestId: "req-1",
          },
        },
        { status: 409 },
      ),
    [`DELETE /api/projects/${projects[0]?.id}`]: () => new Response(null, { status: 204 }),
  });
}

/** URLs of the list requests the page made. */
function listRequests(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.pathname === "/api/projects");
}

describe("projects page", () => {
  it("lists the organization's projects", async () => {
    stubProjectsApi();
    renderApp("/projects");

    expect(await screen.findByRole("heading", { name: "Projects" })).toBeInTheDocument();
    const alphaRow = (await screen.findByText("Alpha")).closest("tr") as HTMLElement;
    expect(within(alphaRow).getByText("Active")).toBeInTheDocument();
    expect(within(alphaRow).getByText("First project")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("keeps the search term in the URL and sends it to the API", async () => {
    const fetchMock = stubProjectsApi();
    const { router } = renderApp("/projects");

    await userEvent.type(await screen.findByRole("searchbox", { name: "Search projects" }), "alp");

    await vi.waitFor(() => expect(router.state.location.search).toEqual({ q: "alp" }));
    await vi.waitFor(() =>
      expect(listRequests(fetchMock).at(-1)?.searchParams.get("q")).toBe("alp"),
    );
  });

  it("shows a duplicate name under the name field", async () => {
    stubProjectsApi();
    renderApp("/projects");

    await userEvent.click(await screen.findByRole("button", { name: "New project" }));
    const dialog = await screen.findByRole("dialog", { name: "New project" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "Alpha");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));

    expect(
      await within(dialog).findByText("A project with this name already exists."),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not offer delete to members", async () => {
    stubProjectsApi("member");
    renderApp("/projects");

    await userEvent.click(await screen.findByRole("button", { name: "Actions for Alpha" }));

    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("lets owners delete a project after confirming", async () => {
    const fetchMock = stubProjectsApi("owner");
    renderApp("/projects");

    await userEvent.click(await screen.findByRole("button", { name: "Actions for Alpha" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete project?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            init?.method === "DELETE" && String(input).endsWith(`/api/projects/${projects[0]?.id}`),
        ),
      ).toBe(true),
    );
    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
