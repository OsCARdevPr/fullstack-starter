import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { CANONICAL_SOURCES, generateModule, REGISTRATION_FILES } from "./generate.mjs";

const repoRoot = join(import.meta.dirname, "..", "..");

// Registration files as the template ships them, trimmed. Fixtures instead of copies keep this
// test passing after a project has generated its own modules into the real files.
const REGISTRATION_FIXTURES = {
  "packages/contracts/src/index.ts":
    'export * from "./common";\nexport * from "./modules/projects";\n',
  "apps/api/src/db/schema/index.ts": 'export * from "./auth";\nexport * from "./projects";\n',
  "apps/api/src/app.ts": `import { Hono } from "hono";
import {
  apiCors,
  limitBody,
} from "./core/middleware";
import { createProjectsRouter } from "./modules/projects";

export type { AppDeps } from "./deps";

export function createApp(deps: AppDeps) {
  return new Hono()
    .route("/api/me", createMeRouter(deps))
    .route("/api/projects", createProjectsRouter(deps));
}
`,
  "apps/web/src/config/app.config.ts": `import { Boxes, FolderKanban, type LucideIcon } from "lucide-react";

export interface AppConfig {
  navItems: NavItem[];
}

export const appConfig: AppConfig = {
  navItems: [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Projects", to: "/projects", icon: FolderKanban },
  ],
};
`,
};

/** A throwaway repository: the real canonical module plus the registration fixtures. */
function createSandbox() {
  const root = mkdtempSync(join(tmpdir(), "gen-module-"));
  for (const path of CANONICAL_SOURCES) {
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  for (const [path, content] of Object.entries(REGISTRATION_FIXTURES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const read = (root, path) => readFileSync(join(root, path), "utf8");

describe("generateModule", () => {
  let root;
  let result;

  before(() => {
    root = createSandbox();
    result = generateModule({ root, name: "purchase-orders" });
  });

  after(() => rmSync(root, { recursive: true, force: true }));

  it("clones every canonical file under the new module's paths", () => {
    for (const path of [
      "packages/contracts/src/modules/purchase-orders.ts",
      "packages/contracts/src/modules/purchase-orders.test.ts",
      "apps/api/src/db/schema/purchase-orders.ts",
      "apps/api/src/modules/purchase-orders/index.ts",
      "apps/api/src/modules/purchase-orders/repository.ts",
      "apps/api/src/modules/purchase-orders/service.ts",
      "apps/api/src/modules/purchase-orders/purchase-orders.test.ts",
      "apps/api/src/modules/purchase-orders/purchase-orders.int.test.ts",
      "apps/web/src/features/purchase-orders/api.ts",
      "apps/web/src/features/purchase-orders/components/purchase-order-form.tsx",
      "apps/web/src/features/purchase-orders/components/purchase-orders-columns.tsx",
      "apps/web/src/features/purchase-orders/purchase-orders-page.test.tsx",
      "apps/web/src/routes/_app/purchase-orders/index.tsx",
    ]) {
      assert.ok(result.created.includes(path), `missing ${path}`);
      assert.ok(existsSync(join(root, path)), `not written: ${path}`);
    }
  });

  it("leaves no trace of the canonical name in the generated files", () => {
    for (const path of result.created) {
      assert.doesNotMatch(read(root, path), /project/i, path);
    }
  });

  it("renames each token for the context it appears in", () => {
    const schema = read(root, "apps/api/src/db/schema/purchase-orders.ts");
    assert.match(schema, /export const purchaseOrders = pgTable\(\s+"purchase_orders",/);
    assert.match(schema, /pgEnum\("purchase_order_status", purchaseOrderStatusSchema\.enum\)/);
    assert.match(schema, /"purchase_orders_organization_id_name_uidx"/);

    assert.match(
      read(root, "apps/api/src/modules/purchase-orders/index.ts"),
      /export function createPurchaseOrdersRouter\(/,
    );
    assert.match(
      read(root, "apps/api/src/modules/purchase-orders/service.ts"),
      /PURCHASE_ORDER_NOT_FOUND = "Purchase order not found\."/,
    );

    const api = read(root, "apps/web/src/features/purchase-orders/api.ts");
    assert.match(api, /all: \["purchase-orders"\] as const/);
    assert.match(api, /api\["purchase-orders"\]\.\$get\(/);
    assert.match(api, /toast\.success\("Purchase order created"\)/);

    const route = read(root, "apps/web/src/routes/_app/purchase-orders/index.tsx");
    assert.match(route, /createFileRoute\("\/_app\/purchase-orders\/"\)/);
    assert.match(route, /title="Purchase orders"/);
    assert.match(
      route,
      /from "@\/features\/purchase-orders\/components\/purchase-order-form-dialog"/,
    );
  });

  it("registers the module in the contracts, the schema, the API and the sidebar", () => {
    assert.deepEqual([...result.updated].sort(), [...REGISTRATION_FILES].sort());
    assert.match(
      read(root, "packages/contracts/src/index.ts"),
      /export \* from "\.\/modules\/purchase-orders";/,
    );
    assert.match(
      read(root, "apps/api/src/db/schema/index.ts"),
      /export \* from "\.\/purchase-orders";/,
    );

    const app = read(root, "apps/api/src/app.ts");
    assert.match(
      app,
      /import \{ createPurchaseOrdersRouter \} from "\.\/modules\/purchase-orders";/,
    );
    assert.match(
      app,
      /\.route\("\/api\/projects", createProjectsRouter\(deps\)\)\s+\.route\("\/api\/purchase-orders", createPurchaseOrdersRouter\(deps\)\);/,
    );

    const config = read(root, "apps/web/src/config/app.config.ts");
    assert.match(config, /import \{[^}]*\bFolder\b[^}]*\} from "lucide-react";/);
    assert.match(
      config,
      /\{ label: "Projects", to: "\/projects", icon: FolderKanban \},\s+\{ label: "Purchase orders", to: "\/purchase-orders", icon: Folder \},\s+\],/,
    );
  });

  it("refuses to overwrite an existing module and changes nothing", () => {
    const before = read(root, "apps/api/src/app.ts");
    assert.throws(() => generateModule({ root, name: "purchase-orders" }), /already exists/);
    assert.equal(read(root, "apps/api/src/app.ts"), before);
  });

  it("writes nothing on a dry run", () => {
    const plan = generateModule({ root, name: "invoices", dryRun: true });
    assert.ok(plan.created.includes("apps/api/src/modules/invoices/index.ts"));
    assert.equal(existsSync(join(root, "apps/api/src/modules/invoices")), false);
    assert.doesNotMatch(read(root, "apps/api/src/app.ts"), /invoices/);
  });

  it("does not import the default icon twice", () => {
    generateModule({ root, name: "invoices" });
    const config = read(root, "apps/web/src/config/app.config.ts");
    assert.equal(config.match(/\bFolder\b(?=[,\s}])/g)?.length, 3);
  });
});
