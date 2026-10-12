# API guide (`@starter/api`)

Hono on Node 24 with Drizzle and Better Auth. The root [AGENTS.md](../../AGENTS.md) rules apply;
these are the API-specific ones. Reference module: `src/modules/projects/`.

## Rules

1. **Router** (`modules/<feature>/index.ts`): `new Hono<AppEnv>()` chained as
   `.use(session(auth)).use(requireAuth).use(tenant(tenancy))`, then one route per call. Keep the
   chain unbroken so `AppType` carries the routes to the web client.
2. **Mount** it in `src/app.ts` with `.route("/api/<feature>", create<Feature>Router(deps))` inside
   the returned chain.
3. **Validate** every input with `validate("json" | "query" | "param", contractSchema)`; read it
   with `c.req.valid(...)`. Respond with `ok(c, data, status?)` or `paginated(c, items, meta)`.
4. **Service** holds business rules and throws `AppError` factories from `core/errors`. Map
   database errors that need a specific message there (see `rethrowDuplicateName`).
5. **Repository** is the only place with Drizzle queries. Every method takes `organizationId`
   first; rows are mapped once with `to<Entity>()`.
6. **Roles**: `requireOrgRole("owner", "admin")` for organization roles, `requirePlatformRole("admin")`
   for platform roles.
7. **Config** comes from `deps.env` (validated in `config/env.ts`), never from `process.env` in
   modules.
8. **Schema changes**: edit `db/schema/*.ts`, then `pnpm db:generate --name <change>`. The Better Auth
   tables in `db/schema/auth.ts` carry hand edits listed in their header; re-apply them after
   `pnpm --filter @starter/api auth:generate`.
9. `/api/auth/*` is Better Auth's own router and answers with its `{ code, message }` shape.

## File map

| Path | Purpose |
|---|---|
| `src/index.ts` | Bootstrap and graceful shutdown |
| `src/app.ts` | `createApp(deps)`: middleware stack and routers; exports `AppType` |
| `src/deps.ts` | `AppDeps`: `env`, `db`, `auth`, `logger`, `tenancy`, `rateLimitStore?` |
| `src/config/env.ts` | Environment schema and defaults |
| `src/core/errors/` | `AppError`, factories, error handler, Postgres mapping |
| `src/core/http/` | `validate`, `ok`, `paginated` |
| `src/core/middleware/` | Security, rate limit, body limit, `session`, `requireAuth`, `tenant`, role guards |
| `src/core/tenancy/` | Membership rules for `single` and `multi` mode |
| `src/db/` | Client, `schema/`, generated `migrations/`, `migrate.ts`, `seed.ts` |
| `src/lib/` | Better Auth instance, pino logger |
| `src/modules/` | `health`, `config`, `auth`, `me`, `projects` |
| `src/test/` | Fakes (`fakes.ts`), in-memory tenancy repository, integration setup |

## Tests

| Kind | Pattern | Run |
|---|---|---|
| Unit (no database) | `*.test.ts`; router tests via `createProjectsRouter({ ...deps, repository })` | `pnpm verify` |
| Integration (Postgres) | `*.int.test.ts`, `DATABASE_URL_TEST` ending in `_test` | `pnpm test:integration` |

Better Auth limits sign-ins (5) and sign-ups (3) per minute per IP; integration tests must stay
under them or create users server-side.
