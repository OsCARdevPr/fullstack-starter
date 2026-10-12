import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNames, inferSingular, renamePath, renameTokens } from "./naming.mjs";

describe("inferSingular", () => {
  it("turns a trailing ies into y and drops a trailing s", () => {
    assert.equal(inferSingular("categories"), "category");
    assert.equal(inferSingular("invoices"), "invoice");
    assert.equal(inferSingular("purchase-orders"), "purchase-order");
  });

  it("returns null when the name does not end in s", () => {
    assert.equal(inferSingular("staff"), null);
  });
});

describe("createNames", () => {
  it("derives every casing of a single-word name", () => {
    assert.deepEqual(createNames("invoices"), {
      plural: {
        kebab: "invoices",
        camel: "invoices",
        pascal: "Invoices",
        snake: "invoices",
        constant: "INVOICES",
        words: "invoices",
        sentence: "Invoices",
      },
      singular: {
        kebab: "invoice",
        camel: "invoice",
        pascal: "Invoice",
        snake: "invoice",
        constant: "INVOICE",
        words: "invoice",
        sentence: "Invoice",
      },
    });
  });

  it("derives every casing of a multi-word name", () => {
    assert.deepEqual(createNames("purchase-orders").plural, {
      kebab: "purchase-orders",
      camel: "purchaseOrders",
      pascal: "PurchaseOrders",
      snake: "purchase_orders",
      constant: "PURCHASE_ORDERS",
      words: "purchase orders",
      sentence: "Purchase orders",
    });
    assert.equal(createNames("purchase-orders").singular.pascal, "PurchaseOrder");
  });

  it("accepts an explicit singular for irregular plurals", () => {
    const names = createNames("people", "person");
    assert.equal(names.singular.pascal, "Person");
    assert.equal(createNames("addresses", "address").singular.snake, "address");
  });

  it("rejects names that are not plural kebab-case", () => {
    for (const name of ["", "Invoices", "purchase_orders", "purchaseOrders", "-orders", "1tems"]) {
      assert.throws(() => createNames(name), /kebab-case/, name);
    }
  });

  it("asks for --singular when it cannot infer one or it equals the plural", () => {
    assert.throws(() => createNames("staff"), /--singular/);
    assert.throws(() => createNames("series", "series"), /differ/);
    assert.throws(() => createNames("people", "Person"), /kebab-case/);
  });
});

describe("renameTokens", () => {
  const names = createNames("purchase-orders");
  const rename = (source) => renameTokens(source, names);

  it("renames TypeScript identifiers with camel and Pascal case", () => {
    assert.equal(
      rename("export function createProjectsRouter(deps: ProjectsRouterDeps) {"),
      "export function createPurchaseOrdersRouter(deps: PurchaseOrdersRouterDeps) {",
    );
    assert.equal(
      rename("const projectKeys = projectsQueryOptions(project.id, projects[0]);"),
      "const purchaseOrderKeys = purchaseOrdersQueryOptions(purchaseOrder.id, purchaseOrders[0]);",
    );
    assert.equal(
      rename("import type { CreateProject, Project } from"),
      "import type { CreatePurchaseOrder, PurchaseOrder } from",
    );
    assert.equal(
      rename("<ProjectForm project={project} />"),
      "<PurchaseOrderForm purchaseOrder={purchaseOrder} />",
    );
    assert.equal(rename("return project;"), "return purchaseOrder;");
    assert.equal(rename("const projects = useQuery("), "const purchaseOrders = useQuery(");
  });

  it("renames constants with SCREAMING_SNAKE_CASE", () => {
    assert.equal(
      rename("PROJECT_STATUS_LABELS[PROJECTS_MAX]"),
      "PURCHASE_ORDER_STATUS_LABELS[PURCHASE_ORDERS_MAX]",
    );
  });

  it("renames file paths and URLs with kebab-case", () => {
    assert.equal(
      rename('import { ProjectForm } from "./project-form";'),
      'import { PurchaseOrderForm } from "./purchase-order-form";',
    );
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source code under test, not a template.
    const url = "`/api/projects/${project.id}`";
    // biome-ignore lint/suspicious/noTemplateCurlyInString: source code under test, not a template.
    const renamedUrl = "`/api/purchase-orders/${purchaseOrder.id}`";
    assert.equal(rename(url), renamedUrl);
    assert.equal(
      rename('createFileRoute("/_app/projects/")'),
      'createFileRoute("/_app/purchase-orders/")',
    );
    assert.equal(rename('all: ["projects"] as const'), 'all: ["purchase-orders"] as const');
  });

  it("renames SQL table, index and enum names with snake_case", () => {
    assert.equal(
      rename('pgTable(\n  "projects",\n  index("projects_organization_id_idx")'),
      'pgTable(\n  "purchase_orders",\n  index("purchase_orders_organization_id_idx")',
    );
    assert.equal(rename('pgEnum("project_status", x)'), 'pgEnum("purchase_order_status", x)');
  });

  it("uses bracket access on the RPC client only when the path is not an identifier", () => {
    assert.equal(rename('api.projects[":id"].$get()'), 'api["purchase-orders"][":id"].$get()');
    assert.equal(
      renameTokens("api.projects.$get()", createNames("invoices")),
      "api.invoices.$get()",
    );
  });

  it("renames user-facing text and comments with words", () => {
    assert.equal(rename('title="Projects"'), 'title="Purchase orders"');
    assert.equal(
      rename('toast.success("Project created")'),
      'toast.success("Purchase order created")',
    );
    assert.equal(
      rename('{project ? "Edit project" : "New project"}'),
      '{purchaseOrder ? "Edit purchase order" : "New purchase order"}',
    );
    assert.equal(
      rename('description="Create, edit and track your organization\'s projects."'),
      'description="Create, edit and track your organization\'s purchase orders."',
    );
    assert.equal(
      rename('describe("projects page", () => {'),
      'describe("purchase orders page", () => {',
    );
    assert.equal(
      rename("/** One page of projects: rows. Projects CRUD at /api/projects. */"),
      "/** One page of purchase orders: rows. Purchase orders CRUD at /api/purchase-orders. */",
    );
  });

  it("leaves words that merely contain the token alone", () => {
    assert.equal(rename("projector subprojects"), "projector subprojects");
  });

  it("renames each occurrence once, even when the new name contains the old one", () => {
    const projectTasks = createNames("project-tasks");
    assert.equal(
      renameTokens("createProjectsRouter(projects)", projectTasks),
      "createProjectTasksRouter(projectTasks)",
    );
  });
});

describe("renamePath", () => {
  it("renames file and directory names with kebab-case", () => {
    const names = createNames("purchase-orders");
    assert.equal(
      renamePath("apps/web/src/features/projects/components/project-form.tsx", names),
      "apps/web/src/features/purchase-orders/components/purchase-order-form.tsx",
    );
    assert.equal(
      renamePath("apps/api/src/modules/projects/projects.int.test.ts", names),
      "apps/api/src/modules/purchase-orders/purchase-orders.int.test.ts",
    );
  });
});
