---
name: add-page
description: "Trigger: new page, screen, view, route, settings or reports page, sidebar link. Add a protected page under routes/_app with PageHeader and a nav item."
license: Apache-2.0
metadata:
  author: "OsCARdevPr"
  version: "1.0"
---

## Activation Contract

Load when the user wants a new signed-in screen that is not a CRUD module (dashboard, reports, settings, a detail view). For a new entity with API and table, use `add-module` instead.

## Hard Rules

- Protected pages live under `apps/web/src/routes/_app/`; the `_app` layout already enforces sign-in. Public pages go under `_auth` only when they must work signed out.
- Start every page with `PageHeader` from `@/components/layout`.
- Fetch through TanStack Query with `unwrap(api....)` from `@/lib/api-client`; put query options and mutations in `apps/web/src/features/<feature>/api.ts`, not in the route.
- Reuse `@/components/feedback` (`LoadingState`, `EmptyState`, `ErrorState`) and `@/components/data` before writing new UI.
- Never edit `apps/web/src/routeTree.gen.ts` by hand.

## Decision Gates

| Need | Action |
|---|---|
| Page at `/reports` | `src/routes/_app/reports/index.tsx` with `createFileRoute("/_app/reports/")` |
| Child page at `/reports/$id` | `src/routes/_app/reports/$id.tsx` |
| Filters, tabs or page number | Zod `validateSearch` on the route (see `routes/_app/projects/index.tsx`) |
| Should appear in the sidebar | Add `{ label, to, icon }` to `navItems` in `apps/web/src/config/app.config.ts` (lucide icon) |

## Execution Steps

1. Create the route file; export `Route = createFileRoute(...)({ component })`.
2. Render `<PageHeader title=... description=... actions=... />`, then the content.
3. Add the nav item when the page belongs in the sidebar.
4. `pnpm --filter @starter/web build` to regenerate the route tree (the nav `to` is type-checked against it).
5. Add a test with `renderApp("/path")` and `stubApi({...})` from `src/test/render-app.tsx`.
6. `pnpm verify`.

## Output Contract

Return the route path, the files created or changed, and the `pnpm verify` result.

## References

- `apps/web/src/routes/_app/index.tsx` — minimal page (dashboard).
- `apps/web/src/routes/_app/projects/index.tsx` — page with search params, table and dialog.
- `apps/web/src/features/projects/projects-page.test.tsx` — page test pattern.
