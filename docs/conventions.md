# Conventions

Reuse first, contracts first, one pattern per job. These rules keep every project built from the
template consistent, and they let people and agents find code without asking.

## DRY rules

1. **Reuse shared components before writing new ones.** Check `apps/web/src/components/` first:

   | Folder | Components |
   |---|---|
   | `layout` | `PageHeader`, `AppShell`, `AppSidebar`, `Topbar`, `UserMenu`, `OrgSwitcher`, `ThemeToggle`, `AppLogo` |
   | `feedback` | `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `RouteError` |
   | `data` | `DataTable`, `DataPagination`, `SearchInput` |
   | `form` | `useZodForm`, `FormInput`, `FormTextarea`, `FormSelect`, `FormCheckbox`, `FormSwitch`, `FormDatePicker`, `FormCombobox`, `FormField`, `FormError`, `applyServerErrors` |
   | `ui` | The full shadcn/ui catalog (primitives only) |

2. **Contracts before types.** A shape that crosses the network is a Zod schema in
   `packages/contracts`. Use its inferred types (`Project`, `CreateProjectInput`); never redeclare
   them in the API or the web.
3. **One module pattern.** `projects` is the canonical module. New modules come from
   `pnpm gen:module <name>`, never from a hand copy.
4. **One place per concern.** Tokens in `styles/theme.css`, app identity in
   `config/app.config.ts`, environment in `apps/api/src/config/env.ts`, errors through `AppError`.

## Where code goes

| You are adding | Put it in |
|---|---|
| A business entity with API, table and screens | `pnpm gen:module <name>` ([recipe](recipes.md#add-a-module)) |
| A schema, enum or type shared by API and web | `packages/contracts/src/modules/<feature>.ts` |
| A business rule | `apps/api/src/modules/<feature>/service.ts` |
| A database query | `apps/api/src/modules/<feature>/repository.ts` (takes `organizationId` first) |
| A table | `apps/api/src/db/schema/<feature>.ts`, exported from `schema/index.ts` |
| Middleware, error mapping, HTTP helpers | `apps/api/src/core/` |
| Query keys, query options, mutations | `apps/web/src/features/<feature>/api.ts` |
| A component used by one feature | `apps/web/src/features/<feature>/components/` |
| A component used by two or more features | `apps/web/src/components/{layout,feedback,data,form}/`, exported from its `index.ts` |
| A shadcn primitive | `apps/web/src/components/ui/`, through the shadcn CLI only |
| A signed-in page | `apps/web/src/routes/_app/<path>/index.tsx` ([recipe](recipes.md#add-a-page)) |
| Colors, radii, fonts | `apps/web/src/styles/theme.css` |
| App name, logo, sidebar items | `apps/web/src/config/app.config.ts` |

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `project-form.tsx`, `apply-server-errors.ts` |
| Modules and routes | plural kebab-case | `projects`, `purchase-orders` |
| React components | PascalCase | `ProjectForm` |
| Hooks | `use` + action | `useCreateProject` |
| Contract schemas | camelCase + `Schema` | `createProjectSchema`, `listProjectsQuerySchema` |
| Contract types | output type, plus `Input` for form values | `CreateProject`, `CreateProjectInput` |
| API factories | `create<Name>Router` / `Service` / `Repository` | `createProjectsService` |
| Query keys | `<entity>Keys` | `projectKeys.list(params)` |
| Database | camelCase in TypeScript, snake_case in SQL (`casing: "snake_case"`) | `organizationId` -> `organization_id` |
| Error codes | SCREAMING_SNAKE_CASE, defined in contracts | `VALIDATION_ERROR` |
| Tests | next to the file: `*.test.ts(x)`; Postgres tests: `*.int.test.ts` | `projects.int.test.ts` |

## Error handling, end to end

**API: throw, never format.** Expected failures throw an `AppError` from `core/errors`
(`notFound()`, `conflict()`, `forbidden()`, `badRequest()`...). The error handler turns any thrown
value into the envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Project not found.", "requestId": "…" } }
```

| Source | Becomes |
|---|---|
| `validate("json" \| "query" \| "param", schema)` fails | 422 `VALIDATION_ERROR`, `details: { fieldErrors, formErrors }` |
| Postgres unique / foreign key violation | 409 `CONFLICT` (map it in the service for a field-specific message, see `projects/service.ts`) |
| Body over `BODY_LIMIT_BYTES` | 413 `PAYLOAD_TOO_LARGE` |
| Anything unexpected | 500 `INTERNAL_ERROR`; the real message only in development |

**Web: one error type.** `unwrap(api.<route>.$get(...))` returns the success body or throws
`ApiError { code, status, message, details, requestId }`; an unreachable server becomes
`NETWORK_ERROR`. The query client decides the feedback:

| Situation | Feedback | How |
|---|---|---|
| A query fails on first load | Inline `ErrorState` (shows the request id) | Pass `error` to `DataTable`, or render `ErrorState` yourself |
| A background refetch fails while data is shown | Toast | Automatic |
| A mutation fails | Toast | Automatic |
| A form shows 422 / 409 on its fields | Inline field errors, no toast | `meta: { handledErrors: ["VALIDATION_ERROR", "CONFLICT"] }` + `applyServerErrors` |
| The caller handles every error itself | Nothing global, no sign-out redirect | `meta: { silent: true }` |
| The session expired (401) | Cache cleared, redirect to sign-in | Automatic (skipped when `silent`) |
| A route loader or component throws | `RouteError` | Router `defaultErrorComponent` |

Queries retry server and network errors up to twice and never retry 4xx.

**Forms.** Validate with the same contract schema (`useZodForm(createProjectSchema, ...)`). In the
mutation `onError`, map codes the API reports without field details (such as `CONFLICT`) with
`form.setError`, then call `applyServerErrors(form, error)`: field errors land on their fields,
the rest on `<FormError />`. `features/projects/components/project-form.tsx` is the reference.

## Testing

| Rule | Detail |
|---|---|
| `pnpm verify` is the gate | Typecheck + Biome + all unit tests. Database-free and fast; run it before every commit |
| Postgres tests are separate | `pnpm test:integration` runs `*.int.test.ts` against `DATABASE_URL_TEST` (database name must end in `_test`; it is created and erased). Run it after changing SQL, repositories, migrations, auth or the seed |
| Test first | For a behavior change, write the failing test, make it pass, then refactor |
| API unit tests | Router tests with a repository double (`createProjectsRouter({ ...deps, repository })`) and fakes from `apps/api/src/test/fakes.ts` |
| Web tests | Testing Library; pages with `renderApp(path)`, `stubApi({...})` and `buildMe()` from `apps/web/src/test/render-app.tsx` |
| Location | Tests live next to the code they cover |
