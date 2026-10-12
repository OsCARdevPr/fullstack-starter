# Deployment

`docker/compose.yaml` runs the whole app: PostgreSQL, a one-shot migration, the API and nginx
serving the SPA. Only the web port is published, and nginx proxies `/api` to the API, so the
browser sees one origin.

## Quick path

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > docker/.env   # once; git-ignored
pnpm docker:up     # build images, start the stack -> http://localhost:8080
pnpm docker:seed   # default organization + admin from SEED_ADMIN_* in .env (idempotent)
pnpm docker:down   # stop; data stays in the postgres-data volume
```

`docker compose -f docker/compose.yaml down -v` also deletes the database volume. Every Compose
command needs `BETTER_AUTH_SECRET`, so keep it in `docker/.env` (or export it in the shell).

## Images

Both images build from the repository root (`docker build -f apps/api/Dockerfile .`).

| Image | Base | Contents |
|---|---|---|
| API (`apps/api/Dockerfile`) | `node:24-alpine`, user `node` | Bundled `dist/index.mjs` (server), `dist/migrate.mjs`, `dist/seed.mjs`, production dependencies; healthcheck `GET /api/health` |
| Web (`apps/web/Dockerfile`) | `nginxinc/nginx-unprivileged`, port 8080 | Vite build plus `apps/web/nginx.conf` (SPA fallback, `/api` proxy, CSP, gzip, immutable assets); `VITE_APP_NAME` build argument |

## Services

| Service | Runs | Starts after |
|---|---|---|
| `postgres` | `postgres:18-alpine`, volume `postgres-data` | — |
| `migrate` | `node dist/migrate.mjs`, then exits | `postgres` healthy |
| `api` | `node dist/index.mjs` on 3000 (not published) | `migrate` completed |
| `web` | nginx on 8080, published as `${WEB_PORT:-8080}` | `api` healthy |
| `seed` | `node dist/seed.mjs`; profile `seed`, run by `pnpm docker:seed` | `migrate` completed |

A new version deploys with `pnpm docker:up`: images rebuild and `migrate` applies pending
migrations before the API starts.

## Ports

| Where | Service | Port |
|---|---|---|
| Development | Web (Vite) | 5173 |
| Development | API | 3000 |
| Development | Postgres (`docker/compose.dev.yaml`) | `127.0.0.1:${POSTGRES_PORT:-5432}` |
| Docker | Web (nginx), the only published port | `${WEB_PORT:-8080}` |

## Environment precedence

The API reads its settings from three layers; the higher one wins:

1. **API defaults** in `apps/api/src/config/env.ts`.
2. **Repository `.env`** through `env_file` (optional): app settings such as `TENANCY_MODE`,
   `AUTH_ALLOW_SIGNUP`, `SEED_ADMIN_*`, `LOG_LEVEL`, `DEFAULT_ORG_*`, `RATE_LIMIT_*`.
3. **Compose `environment`**: what this topology needs, `NODE_ENV=production`, `PORT`,
   `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN`, `TRUST_PROXY`. The
   development URLs and secret in `.env` never reach the containers.

`${...}` values in the compose file (`BETTER_AUTH_SECRET`, `WEB_PORT`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`, `VITE_APP_NAME`) come from the shell or `docker/.env`, not from
the repository `.env`. Images never contain `.env` files (`.dockerignore`).

## Required values

| Value | Set it in | Rule |
|---|---|---|
| `BETTER_AUTH_SECRET` | Shell or `docker/.env` | 32+ characters; the `dev-only-` placeholder is rejected in production |
| `POSTGRES_PASSWORD` | Shell or `docker/.env` | Defaults to `app`; Postgres applies it only when the volume is first created |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Repository `.env` | Only for `pnpm docker:seed`; password 12 to 128 characters |

## Seeding

`pnpm docker:seed` creates the default organization, the platform admin (owner of that
organization) and three sample projects when the organization has none. Running it again changes
nothing.

## Body limit

nginx `client_max_body_size 1m` (`apps/web/nginx.conf`) matches the API default
`BODY_LIMIT_BYTES=1048576`. Both answer 413 with the `PAYLOAD_TOO_LARGE` JSON envelope. Change
both together.

## Reverse proxy and client IP

Compose sets `TRUST_PROXY=true`: the API trusts exactly one hop, nginx, and reads the client IP
from the rightmost `X-Forwarded-For` entry. When another proxy (TLS terminator, load balancer)
sits in front of the web container, configure nginx's real IP module (`set_real_ip_from`,
`real_ip_header`) so `$remote_addr` is the client; otherwise every client shares the proxy's rate
limit.

## Production checklist

- [ ] `BETTER_AUTH_SECRET` generated with `openssl rand -base64 32` and kept out of git.
- [ ] `POSTGRES_PASSWORD` changed before the first start.
- [ ] `BETTER_AUTH_URL` and `WEB_ORIGIN` in `docker/compose.yaml` set to the public HTTPS origin
      (they default to `http://localhost:${WEB_PORT}`).
- [ ] HTTPS in front of the web container: production cookies are `Secure` (`__Secure-` prefix).
- [ ] Real client IP forwarded to nginx when another proxy is in front.
- [ ] Repository `.env` values that reach the containers reviewed: `AUTH_ALLOW_SIGNUP` (`false`
      for invite-only apps), `TENANCY_MODE`, `LOG_LEVEL`.
- [ ] `BODY_LIMIT_BYTES` and `client_max_body_size` agree.
- [ ] CSP hash in `nginx.conf` matches the inline script in `apps/web/index.html`
      ([recipe](recipes.md#rebrand)).
- [ ] One API container, or a shared `rateLimitStore` in `AppDeps` (the default store is in
      memory per process; Better Auth's limits already live in the database).
- [ ] Backups of the `postgres-data` volume.
- [ ] `pnpm verify` and `pnpm test:integration` pass on the release commit.
