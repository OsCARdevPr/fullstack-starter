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

## Tasks

Planning heuristic: about 400 authored changed lines per task (advisory, not a gate).

- [x] **T1 Monorepo foundation + contracts** — pnpm workspace, root scripts (including `verify` = typecheck + lint + test), `tsconfig.base.json`, Biome, `.editorconfig`, `packages/contracts` (errors, http envelopes, common, `projects` module schemas) with tests. Route: delegated writer (2+ non-trivial files). Note: first run was interrupted by a session end after root config; resumed.
  - [ ] **T1a `.env.example`** — blocked: writing `.env*` files is denied by the user's permission settings. Content is drafted; pending user decision.
- [x] **T2 API core** — env, db client, auth schema, Better Auth, middleware stack, error system, `health` and `me` modules, tests for error handling and validation. Route: delegated writer.
- [ ] **T3 API example module** — `projects` tenant-scoped CRUD (routes/service/repository), migrations, seed (admin + default org), integration tests against Postgres. Route: delegated writer.
- [ ] **T4 Web foundation** — Vite + React 19 + Tailwind v4 + shadcn/ui init, `theme.css` tokens + dark mode, providers, api client + `ApiError`, auth client, router with guards, sign-in/sign-up pages, tests. Route: delegated writer.
- [ ] **T5 Web app shell + global components + projects feature** — AppShell/AppSidebar from `app.config.ts`, Topbar, UserMenu, OrgSwitcher, feedback/data/form components, projects list/create/edit/delete. Route: delegated writer.
- [ ] **T6 Containers** — multi-stage Dockerfiles (api, web/nginx), compose files, healthchecks, non-root users, migrate service. Route: delegated writer.
- [ ] **T7 Docs** — README quick start, architecture, conventions (DRY rules, adding a module), rebranding guide. Route: delegated writer.
- [ ] **T8 AI-first layer** — root + per-app `AGENTS.md` (with `CLAUDE.md` pointing to it), module generator `pnpm gen:module <name>` (contracts + api module + web feature + tests from the `projects` pattern) with a test that generates into a temp dir and typechecks, `.claude/skills/` (`add-module`, `add-page`, `add-component`) that drive the generator and `pnpm verify`. Route: delegated writer.

## Acceptance criteria

- `pnpm install && pnpm typecheck && pnpm lint && pnpm test` pass at the root.
- `docker compose -f docker/compose.yaml up --build` starts postgres, runs migrations, serves the web app with sign-in and the projects CRUD.
- Changing only `apps/web/src/styles/theme.css` and `apps/web/src/config/app.config.ts` rebrands the app.
- Adding a module follows a documented recipe touching contracts, api module, and web feature only.
- `pnpm gen:module invoices && pnpm verify` passes on a clean checkout, and the generated module mirrors `projects`.
- An agent opening the repo finds the rules, the canonical pattern, and the verify command from `AGENTS.md` alone.

## Delivery

- Strategy: `exception-ok` for now — new template repo with no remote and no PR planned; work-unit commits per task on `feat/fullstack-starter`. Revisit slicing if the user publishes it.
- Forecast: well above 400 authored lines in total (multi-package template).

## Progress / evidence

| Task | Route | Commit | Checks | Review tier / outcome |
|---|---|---|---|---|
| T1 | delegated | 87dbfee | RED: 4/4 test files failed (missing modules). GREEN: `pnpm verify` exit 0 — tsc clean, biome 14 files clean, 59/59 tests. Parent spot check: `pnpm verify` 59/59. | medium, `slice_budget_reached`; consent granted (lineage review-69d3bb21b269fbb3, lens review-reliability). Capture failed in preflight: the host `claude` CLI is not logged in (environment). Slot re-offered by STATUS; pending user decision. |
| T2 | delegated | (this commit) | RED: 14/14 api test files + contracts `me.test.ts` failed (missing modules). GREEN: `pnpm verify` exit 0 — biome 76 files, contracts 65/65, api 105/105. Build: `dist/index.mjs` 34 kB, contracts inlined. Smoke (prod mode): `/api/health` 200, unknown route 404 envelope + matching `x-request-id`, `/ready` 503 without DB, SIGTERM clean exit. Parent spot check: `pnpm verify` 65/65 + 105/105. | deferred until the T1 review closes (boundary must advance first) |

### Notes for later tasks (from T1)

- Versions: pnpm 12.11.2, Biome ^2.5.15 (`"preset": "recommended"`), TypeScript ^7 (native compiler, no classic programmatic API; add TS 5/6 only if a tool needs it), Vitest ^5, Zod ^4.6.5.
- pnpm 12 enforces a minimum release age; brand-new releases get skipped. Do not add `minimumReleaseAgeExclude` entries.
- Since TS 6, `types` defaults to `[]`: the API must declare `"types": ["node"]`.
- Contracts export TS source (no extensions in relative imports): consumers must compile it (Vite, bundler, tsx), not plain Node type stripping.
- `totalPages = 0` when `total = 0`; `ERROR_STATUS` keeps literal status types for `c.json(body, status)`.
- `updateProjectSchema` is built from default-free fields (Zod 4 `.partial()` still applies defaults).
- T2: reject the dev placeholder `BETTER_AUTH_SECRET` in production. T4: Vite `envDir` = repo root.

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

T1 review retry (user logging in the `claude` CLI), T1a decision, then T3.
