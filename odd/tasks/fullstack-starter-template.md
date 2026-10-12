# Feature: fullstack-starter-template

Repository: `Templates-programacion/fullstack-starter/` (standalone git repo, branch `feat/fullstack-starter`).
Engram mirror: topic `odd/fullstack-starter-template/tasks` (project `templates-programacion`).

## Objective

A reusable, containerized monolith starter for every new project: PostgreSQL + Drizzle, Node.js API, React SPA with shadcn/ui presets (sidebar/app shell ready), validated error handling from API to UI, Zod contracts shared by API and web, and secure tenancy-agnostic authentication. Rebranding a project must only require editing theme tokens and an app config file.

## Problem / Why

Every project re-implements the same plumbing (auth, error envelopes, validation, layout, Docker). Inconsistent plumbing causes bugs and visual drift. One validated starter enforces DRY, consistent UI, and a modular monolith from day one.

## Decisions (accepted)

| Area | Decision | Rationale |
|---|---|---|
| Backend framework | **Hono** on Node (`@hono/node-server`) | Native Zod validation, typed RPC client (`hc`) shares API types with the web without codegen, Web-standard APIs, first-class Better Auth integration. Chosen over Express (no end-to-end types, weaker async error story) and NestJS (heavy for a template). |
| UI | **shadcn/ui** (Tailwind v4, code owned in repo) | User choice. Ships a full Sidebar component; theming via CSS variables. HeroUI v3 has no Sidebar/Navbar (verified in official migration docs). |
| Auth | **Better Auth** + Drizzle adapter | Cookie sessions (httpOnly), built-in rate limiting, CSRF/origin checks, `organization` plugin (tenancy) and `admin` plugin (platform roles). |
| Tenancy | `TENANCY_MODE=single\|multi`; single = multi with exactly one default organization | Uniform schema (every tenant-owned table has `organization_id`), switching modes needs no migration. |
| Monorepo | pnpm workspaces: `apps/api`, `apps/web`, `packages/contracts` | Contracts are the single source of truth for schemas and error codes. |
| Web routing/data | TanStack Router (file-based, typed search params with Zod) + TanStack Query | Type safety end to end. |
| Lint/format | Biome | One fast tool. |
| Tests | Vitest (+ Testing Library on web) | Same runner across packages. |
| Runtime | Node 24 LTS in Docker images | Stable LTS line. |
| Topology | Same origin in prod: nginx serves the SPA and proxies `/api` to the API; Vite proxy in dev | First-party `SameSite=Lax` cookies, no CORS surface in prod. |
| AI-first development | `AGENTS.md`/`CLAUDE.md` per app, module generator (`pnpm gen:module <name>`), project skills in `.claude/skills/`, single feedback loop `pnpm verify`, `projects` as the canonical reference module | User-approved scope addition (2026-10-11): agents need explicit rules, one pattern to copy, and a fast self-check loop. Cost: generator templates must evolve with the pattern. |

### UI library reconsidered (user, 2026-10-11)

The user asked to evaluate HeroUI React for faster development. Analysis: speed comes from the template's global components (DataTable, form fields, ConfirmDialog, PageHeader, data-driven sidebar), which neither library provides; HeroUI v3 still has no Sidebar/Navbar and its v3 API differs from v2 (agents often emit v2 code; an official `@heroui/react-mcp` server exists). Mixing both libraries was rejected (two design systems). Decision: keep shadcn/ui; add missing rich inputs (date picker, combobox) as global components when needed.

Second review (user asked for an efficiency analysis for many projects): verified shadcn ships official blocks (`dashboard-01`, `login-01..05`, `signup-01..05`, `sidebar-01..16`) and an official MCP server (`shadcn mcp init`); HeroUI v3 wins only on advanced date/time/number inputs (React Aria) and default polish. User decision: **shadcn + full catalog** — preinstall every shadcn component so projects start with everything available (unused code is not bundled), and add global form fields `FormDatePicker`, `FormCombobox`, `FormCheckbox`, `FormSwitch` (task T5b).

### Simplicity directive (user, 2026-10-11)

"Finish it until it is a robust template, including the frontend — keep it simple; it will be reused across many projects." Consequences for the remaining tasks:
- Prefer fewer dependencies and plain code over clever abstractions; every file must be easy to copy.
- `DataTable` is a small column-config component over shadcn `Table` + `Pagination` (no TanStack Table).
- The module generator copies the canonical `projects` module and renames tokens (no separate template files, so it cannot drift from the pattern).
- `pnpm verify` stays database-free (fast agent loop); Postgres integration tests run with `pnpm test:integration`.
- The `odd/` folder is removed from the template at closure (the feature document is archived outside the repo) so generated projects start clean.
- Native reviews: the in-process reviewer needs the host `claude` CLI logged in; until then reviews stay pending and are resolved once at the end with the user.

## Architecture

```
fullstack-starter/
├── apps/
│   ├── api/src/
│   │   ├── index.ts            bootstrap + graceful shutdown
│   │   ├── app.ts              createApp(): middleware + module routers, exports AppType
│   │   ├── config/env.ts       Zod-validated env, fail fast
│   │   ├── db/                 client.ts, schema/ (auth.ts, organization-owned tables), migrations/, seed.ts
│   │   ├── lib/auth.ts         Better Auth instance
│   │   ├── core/
│   │   │   ├── errors/         AppError + factories, onError/notFound handlers, Zod + Postgres error mappers
│   │   │   ├── http/           validate() wrapper (zValidator hook -> AppError), ok()/paginated() helpers
│   │   │   ├── middleware/     request-id, logger (pino, redaction), secure headers, cors, body limit, rate limit, session, requireAuth, requireRole, tenant
│   │   │   └── context.ts      Hono Env (Variables: requestId, logger, user, session, tenant)
│   │   └── modules/<feature>/  index.ts (router), routes.ts, service.ts, repository.ts
│   └── web/src/
│       ├── app/                providers, router, query client
│       ├── config/app.config.ts   app name, logo, nav items (sidebar is data-driven)
│       ├── styles/theme.css    THE single place to rebrand (CSS variables, light + dark)
│       ├── lib/                api-client (hc + envelope parsing -> ApiError), auth-client, utils
│       ├── components/ui/      shadcn generated primitives (no business logic)
│       ├── components/layout/  AppShell, AppSidebar, Topbar, UserMenu, OrgSwitcher, ThemeToggle
│       ├── components/feedback/ ErrorState, EmptyState, LoadingState, ConfirmDialog, RouteErrorBoundary
│       ├── components/data/    DataTable, Pagination
│       ├── components/form/    RHF + Zod field wrappers, applyServerErrors()
│       ├── features/<feature>/ api (query keys + hooks), components, pages
│       └── routes/             file-based routes: public (_auth) and protected (_app with beforeLoad guard)
├── packages/contracts/src/     errors (codes, envelope), http (success/paginated), common, modules/<feature>
├── docker/                     compose.yaml (postgres, migrate, api, web), compose.dev.yaml (postgres only)
├── docs/                       architecture, conventions, rebranding, adding a module
├── scripts/gen-module/         module generator templates + CLI (pnpm gen:module <name>)
├── .claude/skills/             add-module, add-page, add-component
└── AGENTS.md (+ CLAUDE.md)     agent rules; each app also has its own AGENTS.md
```

### Contracts

- Success: `{ "data": T }`; paginated: `{ "data": T[], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- Error: `{ "error": { "code": ErrorCode, "message": string, "details"?: unknown, "requestId": string } }`.
- `ErrorCode` -> status map lives in contracts: `BAD_REQUEST 400`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`, `CONFLICT 409`, `VALIDATION_ERROR 422`, `RATE_LIMITED 429`, `INTERNAL_ERROR 500`, `SERVICE_UNAVAILABLE 503`. Web adds client-only `NETWORK_ERROR`.
- `VALIDATION_ERROR.details` = `{ fieldErrors: Record<string, string[]>, formErrors: string[] }` so forms map it 1:1.
- Internal errors never leak messages or stacks outside development.

### Auth and tenancy

- Better Auth mounted at `/api/auth/*`; email + password; `AUTH_ALLOW_SIGNUP` flag (admin apps are invite-only); seed creates the platform admin from env.
- Plugins: `organization` (member roles owner/admin/member) and `admin` (platform role admin/user).
- `TENANCY_MODE=single`: seed creates the default organization; database hooks add every new user to it and set it as the session's active organization; the UI hides the org switcher.
- Every tenant-owned table has `organization_id` (FK, indexed). Repositories take the tenant id as a required argument; no unscoped query helpers.
- Security baseline: `BETTER_AUTH_SECRET` >= 32 chars validated, httpOnly + `SameSite=Lax` + `Secure` in production cookies, trusted origins, auth rate limiting (database storage), general API rate limiter, body size limit, secure headers, pino redaction of cookies/authorization, request id propagation.

### Web error flow

- `apiClient` parses the envelope into `ApiError { code, status, message, details, requestId }`; network failures become `NETWORK_ERROR`.
- Query/Mutation cache `onError` -> global toast unless `meta.silent`; `UNAUTHENTICATED` -> session reset + redirect to sign-in.
- Forms use the same contract schemas via `zodResolver`; `applyServerErrors(form, error)` maps server field errors.
- Route `errorComponent` -> `ErrorState`; root error boundary as last resort.
- Mutations may declare `meta.handledErrors: ErrorCode[]` for errors the caller renders itself (e.g. `VALIDATION_ERROR`, `CONFLICT` on forms): no toast for those; 401 still signs out.

## Tasks

Planning heuristic: about 400 authored changed lines per task (advisory, not a gate).

- [x] **T1 Monorepo foundation + contracts** — pnpm workspace, root scripts (including `verify` = typecheck + lint + test), `tsconfig.base.json`, Biome, `.editorconfig`, `packages/contracts` (errors, http envelopes, common, `projects` module schemas) with tests. Route: delegated writer (2+ non-trivial files). Note: first run was interrupted by a session end after root config; resumed.
  - [ ] **T1a `.env.example`** — blocked: writing `.env*` files is denied by the user's permission settings. Content is drafted; pending user decision.
- [x] **T2 API core** — env, db client, auth schema, Better Auth, middleware stack, error system, `health` and `me` modules, tests for error handling and validation. Route: delegated writer.
- [x] **T3 API example module** — `projects` tenant-scoped CRUD (routes/service/repository), migrations, seed (admin + default org), integration tests against Postgres. Route: delegated writer.
- [x] **T4 Web foundation** — Vite + React 19 + Tailwind v4 + shadcn/ui init, `theme.css` tokens + dark mode, providers, api client + `ApiError`, auth client, router with guards, sign-in/sign-up pages, tests. Route: delegated writer.
- [x] **T5 Web app shell + global components + projects feature** — AppShell/AppSidebar from `app.config.ts`, Topbar, UserMenu, OrgSwitcher, feedback/data/form components, projects list/create/edit/delete. Route: delegated writer.
- [x] **T5b Full shadcn catalog + global form fields** — install all shadcn components (keep `theme.css` as the only token file), add `FormDatePicker`, `FormCombobox`, `FormCheckbox`, `FormSwitch` to `components/form` with tests, document the shadcn MCP and blocks for agents; T6 follow-ups: inline error item in `OrgSwitcher` when its list fails on first load, nginx 413 returns the JSON error envelope. Route: delegated writer (after T6; single writer).
- [x] **T6 Containers** — multi-stage Dockerfiles (api, web/nginx), compose files, healthchecks, non-root users, migrate service. Route: delegated writer.
- [ ] **T7 Docs + agent guides** (runs after T8) — README quick start, `docs/` (architecture, conventions/DRY rules, adding a module, rebranding, error flow, deployment), root + per-app `AGENTS.md` with `CLAUDE.md` pointers (rules, canonical pattern, `pnpm verify`, shadcn MCP and blocks usage). Route: delegated writer.
- [x] **T8 AI-first tooling** (runs before T7) — module generator `pnpm gen:module <name>` (contracts + api module + web feature + tests from the `projects` pattern) with a test that generates into a temp dir and typechecks, `.claude/skills/` (`add-module`, `add-page`, `add-component`) that drive the generator and `pnpm verify`; plus `pnpm setup:project <name>` that renames the per-project identifiers (root package name, compose project names in `docker/compose*.yaml`, default app name) so two projects on one machine never collide; root `.mcp.json` for the shadcn MCP; `PAYLOAD_TOO_LARGE` (413) error code in contracts + API body-limit mapping so API and nginx agree. Route: delegated writer.

## Acceptance criteria

- `pnpm install && pnpm typecheck && pnpm lint && pnpm test` pass at the root.
- `docker compose -f docker/compose.yaml up --build` starts postgres, runs migrations, serves the web app with sign-in and the projects CRUD.
- Changing only `apps/web/src/styles/theme.css` and `apps/web/src/config/app.config.ts` rebrands the app.
- Adding a module follows a documented recipe touching contracts, api module, and web feature only.
- `pnpm gen:module invoices && pnpm verify` passes on a clean checkout, and the generated module mirrors `projects`.
- An agent opening the repo finds the rules, the canonical pattern, and the verify command from `AGENTS.md` alone.

## Delivery

- Strategy: `exception-ok` — template repo, no PR flow; work-unit commits per task on `feat/fullstack-starter`.
- Published 2026-10-11 at user request: https://github.com/OsCARdevPr/fullstack-starter (private, marked as GitHub template, default branch `main`). `main` was fast-forwarded to `b919cec` (T1 + T2). Updating `main` after later tasks is a user decision per push.
- The user's global `~/.claude/CLAUDE.md` now asks before every new project whether to start from this template.
- Forecast: well above 400 authored lines in total (multi-package template).

## Progress / evidence

| Task | Route | Commit | Checks | Review tier / outcome |
|---|---|---|---|---|
| T1 | delegated | 87dbfee | RED: 4/4 test files failed (missing modules). GREEN: `pnpm verify` exit 0 — tsc clean, biome 14 files clean, 59/59 tests. Parent spot check: `pnpm verify` 59/59. | medium, `slice_budget_reached`; consent granted (lineage review-69d3bb21b269fbb3, lens review-reliability). Capture failed in preflight: the host `claude` CLI is not logged in (environment). Slot re-offered by STATUS; pending user decision. |
| T2 | delegated | b919cec | RED: 14/14 api test files + contracts `me.test.ts` failed (missing modules). GREEN: `pnpm verify` exit 0 — biome 76 files, contracts 65/65, api 105/105. Build: `dist/index.mjs` 34 kB, contracts inlined. Smoke (prod mode): `/api/health` 200, unknown route 404 envelope + matching `x-request-id`, `/ready` 503 without DB, SIGTERM clean exit. Parent spot check: `pnpm verify` 65/65 + 105/105. | pending (reviewer unavailable: host `claude` CLI logged out) |
| T3 | delegated | d537d45 | RED: projects unit tests (missing module), RPC test (404 + TS2339), seed test (missing module). GREEN: `pnpm verify` — biome 88 files, contracts 65/65, api 122/122 (DB-free). `pnpm test:integration` 11/11 twice against throwaway Postgres 18; mutation check (removed org filter + LIKE escaping) made 2 integration tests fail, then restored. Seed run twice: idempotent. Build 44.89 kB. Parent spot check: `pnpm verify` 65/65 + 122/122. | pending (reviewer unavailable: host `claude` CLI logged out) |
| T4 | delegated | b40097b | RED: contracts config (missing module), API 3 tests + TS2339, web lib 4 files (missing modules). GREEN: `pnpm verify` — biome 142 files, contracts 69/69, api 126/126, web 54/54. Route/sign-in UI tests written after code (exception); mutation check broke 3 guards -> 3 failures, restored. Web build OK. Smoke via Vite proxy: `/api/config` 200, `/api/me` 401 envelope, seed admin sign-in sets httpOnly SameSite=Lax cookie, `/api/me` 200 owner. Parent spot check: `pnpm verify` 69/69 + 126/126 + 54/54. | pending (reviewer unavailable) |
| T5 | delegated | af7d04b | RED: data-table/pagination/confirm-dialog (missing modules) + 9 behavior tests (shell nav, org switching, 5 projects-page, handledErrors). GREEN: `pnpm verify` — biome 182 files, contracts 69/69, api 126/126, web 84/84. Mutation check: delete visibility, 409 field mapping, search value -> each failed, restored. Browser smoke single + multi mode (CRUD, 409 under Name, filters in URL, dark mode, mobile sheet, org switch isolation). Parent spot check: `pnpm verify` 69/69 + 126/126 + 84/84. | pending (reviewer unavailable) |
| T6 | delegated | 5227903 | Polish RED/GREEN: 409 message (2 failing -> 18/18), first-load toast (1 failing -> 9/9). `pnpm verify` — biome 183, contracts 69/69, api 128/128, web 85/85. `pnpm test:integration` 11/11. Build: index/migrate/seed entries + dist/migrations. Compose smoke (`-p starter-t6`): migrate exit 0, api/web healthy, non-root (uid 1000 / 101), CSP header, gzip + immutable assets, envelopes via nginx, `__Secure-` cookie, seed idempotent, no CSP violations in browser. Images: api 363 MB, web 91.9 MB. Cleaned up. Parent spot check: `pnpm verify` 69/69 + 128/128 + 85/85, no leftover containers. | pending (reviewer unavailable) |
| T5b | delegated | 8f2b80d | RED: 4 form test files (missing modules) + org-switcher error test. GREEN: 12/12; `pnpm verify` — biome 191, contracts 69/69, api 128/128, web 90/90 (3 consecutive runs). Mutation checks on checkbox value, disabledDates, retry refetch, combobox filter. Catalog: 37 new components (62 registry items), 6 rewritten files restored. Bundle: main JS 79.09 -> 81.48 kB gzip (chunk merge only; no unused component code shipped); CSS 14.16 -> 27.02 kB gzip (Tailwind scans all sources — accepted tradeoff). nginx -t OK; 2 MB POST -> 413 JSON envelope. Parent spot check: `pnpm verify` 69/69 + 128/128 + 90/90; no `next-themes`. | pending (reviewer unavailable) |
| T8 | delegated (+ parent applied the writer's prepared 413 patch: `app.test.ts` was missing from the derived edit surface — parent derivation error) | (this commit) | RED: scripts 3 files (missing modules), contracts 2, API errors 2, middleware 413 (got 400). GREEN: scripts 33/33, contracts 69/69, api 131/131, web 90/90. Real proof: generated `purchase-orders` (16 files + 4 registrations), web build OK, `pnpm verify` OK (contracts 85, api 147, web 95, scripts 33), `db:generate` SQL correct; reverted to canonical state. `setup:project` on a throwaway copy: idempotent. shadcn MCP answers `initialize` with 7 tools. Parent spot check: `pnpm verify` 69 + 131 + 90, `pnpm test:scripts` 33/33, `gen:module invoices --dry-run` OK. | pending (reviewer unavailable) |

### Notes for later tasks (from T1)

- Versions: pnpm 12.11.2, Biome ^2.5.15 (`"preset": "recommended"`), TypeScript ^7 (native compiler, no classic programmatic API; add TS 5/6 only if a tool needs it), Vitest ^5, Zod ^4.6.5.
- pnpm 12 enforces a minimum release age; brand-new releases get skipped. Do not add `minimumReleaseAgeExclude` entries.
- Since TS 6, `types` defaults to `[]`: the API must declare `"types": ["node"]`.
- Contracts export TS source (no extensions in relative imports): consumers must compile it (Vite, bundler, tsx), not plain Node type stripping.
- `totalPages = 0` when `total = 0`; `ERROR_STATUS` keeps literal status types for `c.json(body, status)`.
- `updateProjectSchema` is built from default-free fields (Zod 4 `.partial()` still applies defaults).
- T2: reject the dev placeholder `BETTER_AUTH_SECRET` in production. T4: Vite `envDir` = repo root.

### Notes for later tasks (from T8)

- `pnpm gen:module <name> [--singular <word>] [--dry-run]`: clones `projects` (16 files) and registers it in contracts index, schema index, `app.ts` route chain, `app.config.ts` navItems (icon `Folder`). Then: adapt fields, `pnpm db:generate --name <name>`, `pnpm --filter @starter/web build`, `pnpm verify`. Multi-word: DB snake_case, RPC `api["purchase-orders"]`. Naive singular (use `--singular`). `projects` must stay in the repo (generator source). No undo command.
- `pnpm setup:project <name> [--title "<App>"]`: renames root package name, compose names (`<name>`, `<name>-dev`), default app name, README title; idempotent.
- Skills: `.claude/skills/{add-module,add-page,add-component}/SKILL.md`. `.mcp.json` registers the shadcn MCP via `pnpm --dir apps/web exec shadcn mcp` (pinned local CLI).
- `PAYLOAD_TOO_LARGE` (413) in contracts; API body limit and nginx agree.
- Scripts are plain `.mjs` + `node:test` (`pnpm test:scripts`, included in `pnpm test`); the CLI runs `biome check --write` on written files.

### Notes for later tasks (from T5b)

- Form fields: `FormCheckbox`, `FormSwitch` (boolean, horizontal via `FormField orientation`), `FormDatePicker` (`Date | undefined`, `placeholder?`, `disabledDates?` react-day-picker matcher), `FormCombobox` (`options: { value, label }[]`, `placeholder?`, `searchPlaceholder?`, `emptyText?`, label-only search).
- Full catalog installed; new deps: cmdk, date-fns, embla-carousel-react, input-otp, react-day-picker 10, react-resizable-panels, recharts 3.8.0 (pinned by registry), vaul, `@base-ui/react` (ui/combobox only), `@shadcn/react`. `next-themes` removed (unused).
- Add/update components with `pnpm --dir apps/web exec shadcn add <name> --diff`; never `--overwrite` (reverts sonner to next-themes). Blocks (`dashboard-01`, etc.) overwrite `ui/*` and clash with our `app-sidebar`/`data-table`: use `--dry-run`/`--view` and copy parts into a feature folder.
- shadcn MCP: `pnpm --dir apps/web exec shadcn mcp` works from the root; `shadcn mcp init --client claude` writes the client config (T8 adds root `.mcp.json`).
- Test setup stubs `ResizeObserver` and `scrollIntoView` (jsdom).
- Open: API body-limit returns 400 while nginx returns 413 -> `PAYLOAD_TOO_LARGE` in T8.

### Notes for later tasks (from T6)

- Local dev: `pnpm db:up` -> `pnpm db:migrate` -> `pnpm db:seed` -> `pnpm dev` (web 5173, api 3000); `pnpm db:down`.
- Docker: `BETTER_AUTH_SECRET=$(openssl rand -base64 32) pnpm docker:up` -> http://localhost:${WEB_PORT:-8080}; `pnpm docker:seed` (needs `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`); `pnpm docker:down`. Only the web port is published.
- Env precedence in compose: API defaults < repo `.env` via `env_file` (app settings) < compose `environment` (NODE_ENV, PORT, DATABASE_URL, BETTER_AUTH_URL, WEB_ORIGIN, TRUST_PROXY, secret). `${...}` interpolation reads the shell or `docker/.env` (next to the compose file), not the repo `.env`.
- CSP hash for the inline theme script lives in `apps/web/nginx.conf` with a `node -e` recompute one-liner; `style-src 'unsafe-inline'` is required (Radix scroll lock, Sonner).
- nginx `client_max_body_size 1m` must match `BODY_LIMIT_BYTES`.
- Per-project rename needed: compose `name: fullstack-starter` / `fullstack-starter-dev` (handled by `pnpm setup:project` in T8).
- Follow-ups: org switcher first-load error (T5b), nginx 413 JSON envelope (T5b), api image carries ~70 MB of better-auth optional peers (drizzle-kit, react-dom) from `pnpm deploy` — optimization left open.

### Notes for later tasks (from T5)

- Global components: `PageHeader`, `AppShell`, `AppSidebar` (from `appConfig.navItems`), `Topbar`, `UserMenu`, `OrgSwitcher` (static in single mode), `ThemeToggle`; `LoadingState`, `EmptyState`, `ErrorState` (shows requestId), `ConfirmDialog` (async, stays open on reject), `RouteError` (router default error component); `DataTable<T>`, `DataPagination`, `SearchInput`; helpers `formatDate`, `getInitials`; test helpers `buildMe`, `stubApi`, `renderApp(path)` in `src/test/render-app.tsx`.
- Generator (web): clone `apps/web/src/features/projects/**` and `apps/web/src/routes/_app/projects/index.tsx`; register one `navItems` entry (+ lucide import) in `apps/web/src/config/app.config.ts`. Run `vite build` (regenerates `routeTree.gen.ts`) before `tsc`. Status-specific bits: `ProjectStatusBadge`, status `Select`.
- Multi mode: `features/organizations` (create first org screen, switcher create dialog); slugs = kebab name + 6-char suffix.
- Follow-ups taken into T6: specific 409 message for duplicate project names; toast query errors only when cached data exists (avoid double feedback with inline `ErrorState`).

### Notes for later tasks (from T4)

- `GET /api/config` (public) -> `{ tenancyMode, allowSignup }`; contracts `publicConfigSchema`.
- shadcn preset `vega` (Radix base, neutral, Inter). Installed: button, input, label, textarea, select, card, badge, separator, skeleton, avatar, dropdown-menu, dialog, alert-dialog, sheet, tooltip, table, pagination, breadcrumb, sidebar, sonner, field, alert, empty, spinner. `ui/sonner.tsx` imports `useTheme` from `@/app/theme-provider` (re-apply if re-added). New tokens from `shadcn add` land in `globals.css`: move them to `theme.css`.
- In-repo theme provider (next-themes logs a React 19.3 script warning) + inline anti-flash script in `index.html`: T6 nginx CSP must allow it (hash or `'unsafe-inline'`).
- `@/*` alias only in `tsconfig.json` (Vite 8 `resolve.tsconfigPaths`). `envDir` = repo root. Biome needs `css.parser.tailwindDirectives: true`.
- Forms: `useZodForm(schema, { defaultValues })`, `FormInput|FormTextarea|FormSelect`, `FormError` (root.server), `applyServerErrors(form, error)`; 409 CONFLICT mapped manually.
- Data: `unwrap(api.projects.$get({ query }))`; toast on error unless `meta: { silent: true }`; staleTime 30 s; no retry on 4xx. Auth hooks in `@/features/auth/api` (`meQueryOptions`, `publicConfigQueryOptions`, `useMe`, `usePublicConfig`, `useSignIn`, `useSignUp`, `useSignOut`).
- Routes: `_auth` (public, redirects signed-in users), `_app` (protected; `beforeLoad` ensures `me`, `safeRedirectPath`). AppShell replaces the placeholder `AppLayout` in `src/routes/_app.tsx`; root error/not-found states are inline in `__root.tsx` (extract to `components/feedback`).
- `appConfig: { name, logo: { icon, text }, navItems: { label, to, icon }[] }`; `to` is type-checked against real routes.
- pnpm printed "Agent skills awaiting approval: @tanstack/router-plugin" — not approved (user decision).

### Notes for later tasks (from T3)

- Postgres image `postgres:18-alpine`; volume mounts `/var/lib/postgresql` (18+ layout); dev port bound to 127.0.0.1. `docker/compose.dev.yaml` = Postgres only.
- `/api/projects`: `GET /` (page, pageSize, q, status, sort, order -> `{ data, meta }`, default `createdAt desc`), `GET /:id`, `POST /` 201, `PATCH /:id`, `DELETE /:id` 204 (owner/admin only; member 403). Cross-tenant -> 404; non-uuid id -> 422 `fieldErrors.id`; duplicate name -> 409 CONFLICT (no field errors: the web maps it to the name field itself).
- RPC: `client.api.projects.$get({ query: { page: String(page) } })` (coerced query fields are strings on the client); `client.api.projects[":id"].$get/$patch/$delete({ param: { id } })`.
- Integration tests: `*.int.test.ts`, `DATABASE_URL_TEST` (db name must end in `_test`, auto-created), server-side Better Auth calls bypass the HTTP rate limit.
- Containers: migrations run via drizzle-kit and seed via tsx (dev deps); tsdown bundles only `src/index.ts`, so the migrate service needs dev deps or extra bundle entries.
- Generator tokens: `projects`, `Projects`, `project`, `Project`, `PROJECT` (replace plurals first). Clone: `apps/api/src/modules/projects/*`, `apps/api/src/db/schema/projects.ts`, `packages/contracts/src/modules/projects.ts` (+ test). Register: `apps/api/src/db/schema/index.ts` export, `packages/contracts/src/index.ts` export, `apps/api/src/app.ts` import + `.route("/api/<names>", create<Names>Router(deps))`. Then `pnpm db:generate --name <names>`.
- Follow-up: `vitest*.config.ts` files are linted but not typechecked (outside the api `tsconfig.json` include).

### Notes for later tasks (from T2)

- Module pattern: `new Hono<AppEnv>().use(session(auth)).use(requireAuth).use(tenant(tenancy))`, chained `.use` for type narrowing; `validate("json"|"query", schema)`, `ok()`, `paginated()`; mount with `.route()` in `app.ts`. `AppDeps = { env, db, auth, logger, tenancy, rateLimitStore? }`.
- `/api/me` uses `optionalTenant`: a multi-mode user without an organization gets `organization: null, role: null` (so the web can show "create your first organization").
- `AUTH_ALLOW_SIGNUP` defaults to `false` (secure by default); the dev `.env.example` sets it to `true`.
- Body-limit violations map to 400 `BAD_REQUEST` (no 413 code in contracts yet; `PAYLOAD_TOO_LARGE` is a possible follow-up).
- Better Auth runs `user.create.after` after session creation on sign-up; the session hook also ensures default-org membership. Depends on the Drizzle adapter running with `transaction: false` (commented in code).
- Generated auth schema has hand edits (timestamptz, created_at defaults, unique `member(organization_id, user_id)`), listed in its header; re-apply after `pnpm auth:generate`. Better Auth CLI is now the `auth` package.
- Better Auth rate limit is DB-backed: 5 sign-ins / 3 sign-ups per minute per IP — integration tests must account for it.
- `TRUST_PROXY=true` trusts exactly one hop; the auth router overwrites `X-Forwarded-For` before Better Auth.
- pnpm 12 requires `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml`.
- Web: `import type { AppType } from "@starter/api"` + `hc<AppType>()`; `/api/auth/*` returns Better Auth's `{ code, message }` shape (map separately to `ApiError`); cookies `better-auth.session_token` (dev) / `__Secure-better-auth.session_token` (prod), httpOnly, `SameSite=Lax`.

## Next step

T7 docs + agent guides, then closure (archive `odd/`, final verification, user decisions on reviews, `.env.example`, updating `main`).
Afterwards: new project agente-grupo-mkt v2 from this template (requirements and confirmed decisions captured in the session scratchpad `v2-requirements.md`).
