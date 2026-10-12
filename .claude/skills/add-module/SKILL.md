---
name: add-module
description: "Trigger: new module, feature, entity, resource, CRUD, table, add invoices/orders. Generate a tenant-scoped module from projects, adapt fields, migrate, verify."
license: Apache-2.0
metadata:
  author: "OsCARdevPr"
  version: "1.0"
---

## Activation Contract

Load when the user wants a new business entity with API endpoints, a database table and screens (for example "add invoices", "we need purchase orders").

## Hard Rules

- Create modules ONLY with `pnpm gen:module <plural-kebab-name>`; never copy `projects` by hand.
- Never edit or delete the `projects` module: it is the generator's source.
- Keep `organizationId` on every tenant-owned table; repository methods take `organizationId` first.
- Contract schemas in `packages/contracts` are the single source of truth: the DB enum, the API validation and the web form all read them.
- Generate migrations with drizzle-kit; never hand-write SQL in `apps/api/src/db/migrations/`.
- Do not report done until `pnpm verify` passes.

## Decision Gates

| Situation | Action |
|---|---|
| Irregular plural (people, addresses) | `--singular person` / `--singular address` |
| Unsure what will be created | Run with `--dry-run` first |
| Generator says "already exists" | Pick another name; do not delete the existing module |
| Entity has no status | Remove the status enum from contract, table, badge, filter and tests together |

## Execution Steps

1. `pnpm gen:module <name> [--singular <word>]` from the repository root.
2. Edit fields in `packages/contracts/src/modules/<name>.ts` (entity, create, update, list query, sort fields; build the update schema from default-free fields).
3. Mirror them in `apps/api/src/db/schema/<name>.ts`, `apps/api/src/modules/<name>/repository.ts` (`to<Entity>` mapping, `SORT_COLUMNS`).
4. Update the web form, columns and route filters in `apps/web/src/features/<name>/` and `apps/web/src/routes/_app/<name>/index.tsx`.
5. Update the tests next to each file (contracts test, API router test, web page test).
6. `pnpm db:generate --name <name>`; read the new SQL file.
7. `pnpm --filter @starter/web build` (regenerates `routeTree.gen.ts`).
8. `pnpm verify`. With Postgres running: `pnpm db:migrate` and `pnpm test:integration`.

## Output Contract

Return the module name, the files changed after generation, the migration file name, and the `pnpm verify` result.

## References

- `scripts/gen-module/cli.mjs` — generator usage and next steps.
- `apps/api/src/modules/projects/` — canonical API module (router, service, repository, tests).
- `apps/web/src/features/projects/` — canonical web feature.
