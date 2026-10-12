# Web guide (`@starter/web`)

React 19 SPA with Vite, TanStack Router and Query, shadcn/ui and React Hook Form. The root
[AGENTS.md](../../AGENTS.md) rules apply; these are the web-specific ones. Reference feature:
`src/features/projects/` with `src/routes/_app/projects/index.tsx`.

## Rules

1. **Data**: call the API only through `unwrap(api.<route>.$get(...))` from `@/lib/api-client`
   inside TanStack Query. Query keys, query options and mutations live in
   `src/features/<feature>/api.ts`, never in routes or components.
2. **Errors**: the query client toasts mutation errors and signs out on `UNAUTHENTICATED`. A form
   that shows errors on its fields sets `meta: { handledErrors: ["VALIDATION_ERROR", "CONFLICT"] }`;
   a caller that handles everything sets `meta: { silent: true }`. Details:
   [docs/conventions.md](../../docs/conventions.md#error-handling-end-to-end).
3. **Forms**: `useZodForm(contractSchema, { defaultValues })` with the `Form*` fields from
   `@/components/form`, `<FormError />` for form-level errors and `applyServerErrors(form, error)`
   in `onError`.
4. **Pages**: signed-in pages under `src/routes/_app/`, public ones under `src/routes/_auth/`.
   Start with `PageHeader`; put filters and page numbers in a Zod `validateSearch`. Run
   `pnpm --filter @starter/web build` after adding a route to regenerate `routeTree.gen.ts`.
5. **Navigation** is data: add `{ label, to, icon }` to `navItems` in `src/config/app.config.ts`.
6. **Styling**: Tailwind classes with theme tokens only (`bg-primary`, `text-muted-foreground`).
   All tokens live in `src/styles/theme.css`; no hard-coded colors.
7. **Components**: reuse `@/components/{layout,feedback,data,form}` first. `components/ui` holds
   shadcn primitives without business logic (Biome does not lint it).
8. **Imports** use the `@/` alias for `src/`.

## File map

| Path | Purpose |
|---|---|
| `src/main.tsx`, `src/app/` | Entry, providers, router, theme provider |
| `src/config/app.config.ts` | App name, logo, sidebar navigation |
| `src/styles/theme.css` | Color, radius and font tokens (light and dark); `globals.css` wires Tailwind |
| `src/lib/` | `api-client` (`api`, `unwrap`), `api-error` (`ApiError`), `query-client`, `auth-client`, `format` |
| `src/components/ui/` | shadcn catalog |
| `src/components/layout/` | `AppShell`, `AppSidebar`, `Topbar`, `PageHeader`, `UserMenu`, `OrgSwitcher`, `ThemeToggle` |
| `src/components/feedback/` | `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `RouteError` |
| `src/components/data/` | `DataTable`, `DataPagination`, `SearchInput` |
| `src/components/form/` | `useZodForm`, `Form*` fields, `FormError`, `applyServerErrors` |
| `src/features/` | `auth`, `organizations`, `projects`: `api.ts`, `components/`, tests |
| `src/routes/` | `__root.tsx`, `_auth` (sign-in, sign-up), `_app` (session guard, pages) |
| `src/test/` | `setup.ts` (jsdom stubs), `render-app.tsx` (`renderApp`, `stubApi`, `buildMe`) |

## Tests

Testing Library with Vitest (jsdom). Render pages with `renderApp("/path")`, answer API calls with
`stubApi({...})` and build the signed-in user with `buildMe()`. Reference:
`src/features/projects/projects-page.test.tsx`. Run `pnpm verify`.
