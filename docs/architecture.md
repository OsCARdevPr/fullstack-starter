# Architecture

One deployable app (a modular monolith): a Hono API and a React SPA served from the same origin,
one PostgreSQL database, and a `contracts` package that both sides import. Features live in
self-contained modules; shared plumbing lives in `core` (API) and `components` (web).

## Layout

```
apps/api/src/
  index.ts            bootstrap: env, logger, db, tenancy, auth, server, graceful shutdown
  app.ts              createApp(): middleware stack + module routers; exports AppType for the web
  config/env.ts       Zod-validated environment; the process exits listing every invalid variable
  core/errors/        AppError + factories, error handler, Zod and Postgres error mapping
  core/http/          validate() (Zod -> VALIDATION_ERROR), ok() and paginated() responses
  core/middleware/    security headers, CORS, rate limit, body limit, session, requireAuth,
                      requireOrgRole, requirePlatformRole, tenant
  core/tenancy/       organization membership rules for single and multi mode
  db/                 client, schema/, migrations/ (generated), migrate.ts, seed.ts
  lib/                Better Auth instance, pino logger
  modules/<feature>/  index.ts (router), service.ts, repository.ts, tests
apps/web/src/
  app/                providers, router, theme provider
  config/app.config.ts   app name, logo, sidebar navigation
  styles/theme.css    every color, radius and font token (light and dark)
  lib/                api-client (typed RPC + ApiError), query-client, auth-client, format
  components/ui/      shadcn primitives (generated, no business logic)
  components/{layout,feedback,data,form}/   shared app components
  features/<feature>/ api.ts (queries, mutations), components/, tests
  routes/             file-based routes: _auth (public), _app (signed in)
packages/contracts/src/
  errors.ts, http.ts, common.ts, modules/<feature>.ts
```

## Request flow

```
Browser
  │  same origin: Vite dev server :5173 (dev) or nginx :8080 (Docker)
  │  /api/* is proxied to the API; every other path serves the SPA
  ▼
Hono app (apps/api/src/app.ts)
  requestId → requestLogger → securityHeaders → CORS → rateLimit → bodyLimit
  ▼
Module router (modules/<feature>/index.ts)
  session → requireAuth → tenant → validate(schema) → handler
  ▼
Service (business rules; throws AppError)
  ▼
Repository (Drizzle; organizationId on every query)
  ▼
PostgreSQL
```

Anything thrown on the way becomes the error envelope in one place (`core/errors`), with the
request id from the `X-Request-Id` header.

## Contracts are the single source of truth

`packages/contracts` holds every shape that crosses the network. The API validates with it, the
web forms validate with it, and the database enums are built from it.

| Contract | Example | Used by |
|---|---|---|
| Entity and input schemas | `projectSchema`, `createProjectSchema`, `updateProjectSchema` | API `validate()`, web `useZodForm()` |
| List query | `listProjectsQuerySchema` (page, pageSize, q, status, sort, order) | API query validation, web search params |
| Enums | `projectStatusSchema` | Drizzle `pgEnum`, status badge, filters |
| Envelopes | `{ data }`, `{ data, meta: { page, pageSize, total, totalPages } }` | `ok()`, `paginated()`, web `unwrap()` |
| Errors | `ErrorCode`, `ERROR_STATUS`, `{ error: { code, message, details?, requestId } }` | API error handler, web `ApiError` |

Route types travel without codegen: the web imports `type AppType` from `@starter/api` and builds
a typed client with Hono's `hc<AppType>()`.

## Tenancy

Every tenant-owned table has an `organization_id` foreign key, and every repository method takes
the organization id as its first argument. The `tenant` middleware resolves the session's active
organization, checks membership and sets `c.get("tenant")`. A row from another organization is
reported as `NOT_FOUND`, so its existence does not leak.

| | `TENANCY_MODE=single` (default) | `TENANCY_MODE=multi` |
|---|---|---|
| Organizations | One default organization (`DEFAULT_ORG_NAME`, `DEFAULT_ORG_SLUG`) | Users create their own |
| New users | Join the default organization (the first member is its owner) | Start with no organization and get a "create your first organization" screen |
| Sidebar | Organization name only | Organization switcher with a create dialog |

The schema is identical in both modes, so switching modes needs no migration.

## Auth and security baseline

| Concern | Implementation |
|---|---|
| Sessions | Better Auth at `/api/auth/*`, email and password (12+ characters), httpOnly `SameSite=Lax` cookies, `Secure` in production |
| Sign-up | Off unless `AUTH_ALLOW_SIGNUP=true`; the seed creates the platform admin |
| Roles | Organization roles `owner`, `admin`, `member` (`requireOrgRole`); platform roles `admin`, `user` (`requirePlatformRole`) |
| Secret | `BETTER_AUTH_SECRET` of 32+ characters; the `dev-only-` placeholder is rejected in production |
| Origins | Better Auth `trustedOrigins` and the API CORS policy both use `WEB_ORIGIN` |
| Abuse limits | General API rate limit (`RATE_LIMIT_*`), DB-backed auth limits (5 sign-ins, 3 sign-ups per minute per IP), body limit (`BODY_LIMIT_BYTES`, 413) |
| Headers | Hono secure headers on the API; CSP, `X-Frame-Options`, `nosniff` from nginx |
| Logs | pino with request ids; cookies and authorization headers are redacted |
| Errors | Unexpected errors return a generic `INTERNAL_ERROR` message outside development |
| Client IP | Socket address; with `TRUST_PROXY=true`, the rightmost `X-Forwarded-For` entry (one trusted hop) |

## Web app shell

The `_app` route checks the session in `beforeLoad` and redirects to `/sign-in` when there is none.
`AppShell` renders `AppSidebar` (navigation from `appConfig.navItems`, organization switcher, user
menu) and `Topbar`. Rebranding touches only `styles/theme.css` and `config/app.config.ts`
(see [recipes](recipes.md#rebrand)).
