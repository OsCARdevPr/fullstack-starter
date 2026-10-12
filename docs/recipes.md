# Recipes

Step-by-step changes for the most common tasks. Each recipe ends with `pnpm verify`.

| Recipe | Use it for |
|---|---|
| [Add a module](#add-a-module) | A new business entity with API, table and screens |
| [Add a page](#add-a-page) | A signed-in screen that is not a CRUD module |
| [Add a component](#add-a-component) | Shared or feature UI, shadcn primitives and blocks |
| [Add a form field](#add-a-form-field) | A new field on an existing entity |
| [Rebrand](#rebrand) | Colors, fonts, name, logo |
| [Add an env var](#add-an-env-var) | A new setting for the API or the web |

## Add a module

```bash
pnpm gen:module invoices --dry-run               # preview: files created and registered
pnpm gen:module invoices                         # plural kebab-case name
pnpm gen:module people --singular person         # when the singular cannot be inferred
```

The generator copies the canonical `projects` module (16 files: contracts, table, API module,
web feature, route, and their tests) and registers it in `packages/contracts/src/index.ts`,
`apps/api/src/db/schema/index.ts`, `apps/api/src/app.ts` and `apps/web/src/config/app.config.ts`.

Then adapt the copy:

1. **Fields** in `packages/contracts/src/modules/<name>.ts`: entity, create, update, list query and
   sort fields. Build the update schema from default-free fields (`.partial()` keeps defaults).
2. **Table** in `apps/api/src/db/schema/<name>.ts`; **repository** mapping (`to<Entity>`,
   `SORT_COLUMNS`, the insert values) in `apps/api/src/modules/<name>/repository.ts`.
3. **Web**: form, columns, status badge and route filters in `apps/web/src/features/<name>/` and
   `apps/web/src/routes/_app/<name>/index.tsx`. Change the sidebar icon (`Folder`) in
   `app.config.ts`.
4. **Tests** next to each file: contracts test, API router test, integration test, web page test.
5. Generate the migration, rebuild the route tree and verify:

   ```bash
   pnpm db:generate --name invoices        # then read the new SQL file
   pnpm --filter @starter/web build        # regenerates src/routeTree.gen.ts
   pnpm verify
   pnpm db:migrate && pnpm test:integration   # with Postgres running
   ```

| Limitation | What to do |
|---|---|
| `projects` is the generator's source | Keep it in the repo and do not change it for one project's needs |
| The singular is naive (`ies` -> `y`, else drop `s`) | Pass `--singular <word>` |
| The name already exists | The generator stops; pick another name |
| The entity has no status | Remove the status enum from contract, table, badge, filter and tests together |
| There is no undo command | Run it on a clean git tree and discard the changes with git |
| Multi-word names | Table is snake_case (`purchase_orders`); the RPC path is `api["purchase-orders"]` |

## Add a page

1. Create `apps/web/src/routes/_app/reports/index.tsx` (child pages: `_app/reports/$id.tsx`):

   ```tsx
   import { createFileRoute } from "@tanstack/react-router";
   import { PageHeader } from "@/components/layout";

   export const Route = createFileRoute("/_app/reports/")({ component: ReportsPage });

   function ReportsPage() {
     return <PageHeader title="Reports" description="Monthly figures." />;
   }
   ```

2. Fetch with TanStack Query and `unwrap(api....)`; keep query options and mutations in
   `apps/web/src/features/<feature>/api.ts`. Filters, tabs or page numbers go in a Zod
   `validateSearch` (see `routes/_app/projects/index.tsx`).
3. Sidebar entry: add `{ label, to, icon }` to `navItems` in `apps/web/src/config/app.config.ts`.
4. `pnpm --filter @starter/web build` (the nav `to` is type-checked against the regenerated route
   tree; never edit `routeTree.gen.ts` by hand).
5. Test it with `renderApp("/reports")` and `stubApi({...})`, then `pnpm verify`.

Public pages (signed out) go under `routes/_auth/`.

## Add a component

| The component is | Put it in |
|---|---|
| A generic primitive missing from `components/ui` | The shadcn CLI (below) |
| Used by two or more features | `components/{layout,feedback,data,form}/`, exported from that folder's `index.ts` |
| Used by one feature | `features/<feature>/components/` |

Files are kebab-case with a PascalCase export and typed props. Use theme tokens
(`bg-primary`, `text-muted-foreground`), never hard-coded colors. Add a Testing Library test when it
has behavior.

shadcn components (the full catalog is already installed in `apps/web/src/components/ui/`):

```bash
pnpm --dir apps/web exec shadcn add <name> --diff   # preview the change; writes nothing
pnpm --dir apps/web exec shadcn add <name>          # write it
```

- Never pass `--overwrite`: it replaces customized files (it reverts `ui/sonner.tsx` to
  `next-themes`).
- New CSS variables from `shadcn add` land in `styles/globals.css`: move them to `styles/theme.css`.
- Blocks (`dashboard-01`, `login-03`, `sidebar-07`...) overwrite `ui/*` and clash with the app's own
  `AppSidebar` and `DataTable`. Inspect them with `--dry-run` or `--view` and copy only the parts
  you need into a feature folder.
- The shadcn MCP server (`.mcp.json`) lets an agent search and view registry items.

## Add a form field

Example: a `client` text field on projects.

1. **Contract** (`packages/contracts/src/modules/projects.ts`): add it to `projectSchema`,
   `createProjectSchema` and the default-free object inside `updateProjectSchema`.
2. **Table** (`apps/api/src/db/schema/projects.ts`): add the column, then
   `pnpm db:generate --name projects-client` and read the SQL.
3. **Repository**: map the column in `toProject()` and add it to the `create` values (`update`
   passes the validated input through).
4. **Form** (`features/projects/components/project-form.tsx`): add a default value and the field.

   ```tsx
   <FormInput control={form.control} name="client" label="Client" />
   ```

   Other wrappers: `FormTextarea`, `FormSelect`, `FormCheckbox`, `FormSwitch` (booleans),
   `FormDatePicker` (`Date | undefined`), `FormCombobox` (searchable `{ value, label }` options).

5. **List** (optional): a column in `projects-columns.tsx`.
6. **Tests**: the contracts test, the API router test and the page test; then `pnpm verify`, and
   `pnpm db:migrate && pnpm test:integration` with Postgres running.

## Rebrand

| Change | Where |
|---|---|
| Colors, radius | `apps/web/src/styles/theme.css`: light values in `:root`, dark in `.dark` (palettes from https://ui.shadcn.com/themes) |
| Font | `pnpm --filter @starter/web add @fontsource-variable/<font>`, then the `@import` and family names at the top of `theme.css` |
| App name | `pnpm setup:project <name> --title "<App>"` (default name), or `VITE_APP_NAME` in `.env` |
| Logo | `logo.icon` (any lucide icon) and `logo.text` in `apps/web/src/config/app.config.ts`; for an image, edit `components/layout/app-logo.tsx` |
| Sidebar | `navItems` in `app.config.ts` |

The anti-flash theme script in `apps/web/index.html` is allowed by a CSP hash in
`apps/web/nginx.conf`. After editing that script, print the new hash from the repository root and
replace the `sha256-...` value in `nginx.conf`:

```bash
node -e 'const s=require("fs").readFileSync("apps/web/index.html","utf8").match(/<script>([\s\S]*?)<\/script>/)[1];console.log("sha256-"+require("crypto").createHash("sha256").update(s).digest("base64"))'
```

## Add an env var

**API setting**

1. Add it to `envSchema` in `apps/api/src/config/env.ts`, with a safe default when one exists. Read
   it from `deps.env`, never from `process.env`.
2. Required with no default: add a value to `testEnvSource` in `apps/api/src/test/fakes.ts`. Cover
   parsing rules in `config/env.test.ts`.
3. Document it in `.env.example` with a development value.
4. Docker: the repository `.env` already reaches the containers through `env_file`. Add it to
   `x-api.environment` in `docker/compose.yaml` only when the container needs a fixed value, or a
   value from the shell or `docker/.env` (`${NAME:?message}` for required secrets).

**Web setting** (compiled into the bundle, so never a secret)

1. Name it `VITE_*`; declare it in `apps/web/src/env.d.ts` and document it in `.env.example`.
2. Docker images build without `.env`: add an `ARG` in `apps/web/Dockerfile` and a `build.args`
   entry for the `web` service in `docker/compose.yaml` (see `VITE_APP_NAME`).
