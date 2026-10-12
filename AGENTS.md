# Agent guide

Rules for AI agents and people changing this repository: a modular monolith with a Hono API
(`apps/api`), a React SPA (`apps/web`) and shared Zod contracts (`packages/contracts`). Copy the
canonical pattern, reuse what exists, and finish only when `pnpm verify` passes.

## Start here

1. Read these rules, then the guide of the app you touch: [apps/api/AGENTS.md](apps/api/AGENTS.md)
   or [apps/web/AGENTS.md](apps/web/AGENTS.md).
2. Load the matching skill (below) when the task is a module, a page or a component.
3. Find the closest existing example and copy its shape; `projects` is the reference.

## Golden rules

1. **Reuse shared components first.** `apps/web/src/components/{layout,feedback,data,form}` and the
   full shadcn catalog in `components/ui` cover most UI. Create a component only when none fits.
2. **Contracts first.** Every shape that crosses the network is a Zod schema in
   `packages/contracts`. Infer types from it; never redeclare them in an app.
3. **Tenant-scoped data.** Every tenant-owned table has `organization_id`; every repository method
   takes `organizationId` as its first argument. No unscoped query helpers. Another organization's
   rows are `NOT_FOUND`.
4. **No secrets in code.** Settings come from `apps/api/src/config/env.ts` (`deps.env`). Never copy
   `.env` values into code, tests or docs; document new variables in `.env.example`.
5. **`components/ui` is shadcn-owned.** No business logic or API calls there. Add or update it with
   the shadcn CLI only, never with `--overwrite`.
6. **One error path.** The API throws `AppError` factories (`notFound()`, `conflict()`...); the web
   handles `ApiError`. Never build error JSON by hand.
7. **Generated files stay generated.** Never hand-edit `apps/web/src/routeTree.gen.ts` or the SQL in
   `apps/api/src/db/migrations/` (use `pnpm db:generate`).
8. **English artifacts.** Code, comments, UI copy, tests and docs are in English.
9. **Conventional Commits.** `feat(api): …`, `fix(web): …`, `docs: …`, `chore: …`.

## Canonical module: `projects`

| Layer | Files |
|---|---|
| Contract | `packages/contracts/src/modules/projects.ts` (+ test) |
| Table | `apps/api/src/db/schema/projects.ts` |
| API | `apps/api/src/modules/projects/` — `index.ts` (router), `service.ts`, `repository.ts`, unit and integration tests |
| Web | `apps/web/src/features/projects/` (`api.ts`, `components/`, page test), `apps/web/src/routes/_app/projects/index.tsx` |

New modules come from the generator, never from a hand copy, and `projects` must stay unchanged
because it is the generator's source:

```bash
pnpm gen:module <plural-kebab-name> [--singular <word>] [--dry-run]
# adapt fields: contract -> table -> repository -> form, columns, filters -> tests
pnpm db:generate --name <name>
pnpm --filter @starter/web build
pnpm verify
```

Full recipe and limitations: [docs/recipes.md](docs/recipes.md#add-a-module).

## Verify loop

| When | Run |
|---|---|
| After every change, before reporting done | `pnpm verify` (typecheck + Biome + unit tests; no database) |
| After adding or renaming a route or nav item | `pnpm --filter @starter/web build`, then `pnpm verify` |
| After changing SQL, a repository, a migration, auth or the seed | `pnpm db:up`, `pnpm db:migrate`, `pnpm test:integration` (`DATABASE_URL_TEST` must end in `_test`) |
| Lint or format failures | `pnpm check` (writes safe fixes), then `pnpm verify` |

Behavior changes are test-first: write the failing test, make it pass, refactor.

## Skills

Project skills live in `.claude/skills/<name>/SKILL.md`. Agents without skill support can read
the files directly.

| Skill | Use it when |
|---|---|
| `add-module` | New module, feature, entity, resource, CRUD or table ("add invoices") |
| `add-page` | New page, screen, view, route, settings or reports page, sidebar link |
| `add-component` | New component, UI element, widget, shadcn component or block, reusable UI |

## shadcn MCP

`.mcp.json` registers the shadcn MCP server (`pnpm --dir apps/web exec shadcn mcp`, the pinned
local CLI). Use it to search and view registry components before adding one. Your client may ask
you to approve the project server on first use.

Blocks (`dashboard-01`, `login-03`, `sidebar-07`...) overwrite `components/ui/*` and clash with the
app's `AppSidebar` and `DataTable`. Inspect them with `--dry-run` or `--view` and copy only the
parts you need into a feature folder.

## Docs

| Doc | Content |
|---|---|
| [README.md](README.md) | Quick start and every root command |
| [docs/architecture.md](docs/architecture.md) | Layout, request flow, contracts, tenancy, security baseline |
| [docs/conventions.md](docs/conventions.md) | DRY rules, where code goes, naming, error handling, testing |
| [docs/recipes.md](docs/recipes.md) | Add a module, page, component, form field or env var; rebrand |
| [docs/deployment.md](docs/deployment.md) | Docker, env precedence, secrets, production checklist |
