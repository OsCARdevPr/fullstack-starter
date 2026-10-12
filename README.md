# Fullstack Starter

A template for new web apps: a modular monolith with PostgreSQL, a Hono API, a React SPA built on
shadcn/ui, Zod contracts shared by both sides, cookie-based auth with optional multi-tenancy, and
Docker images for production. Every project starts with the same tested plumbing (auth, errors,
validation, layout, containers), so only the business modules change.

## Stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 18, Drizzle ORM, drizzle-kit migrations |
| API | Hono on Node 24, Better Auth (organization + admin plugins), pino |
| Web | React 19, Vite, TanStack Router + Query, shadcn/ui (Tailwind v4), React Hook Form |
| Contracts | `packages/contracts`: Zod schemas and error codes used by the API and the web |
| Tooling | pnpm workspaces, TypeScript, Biome, Vitest |
| Runtime | Docker: API image, nginx web image, Compose |

## Start a new project

Requirements: Node 24 (`.nvmrc`), pnpm 12 (`npm install --global pnpm@12.11.2`), Docker, GitHub CLI.

1. Create the repository from the template and install dependencies:

   ```bash
   gh repo create my-app --template OsCARdevPr/fullstack-starter --private --clone
   cd my-app
   pnpm install
   ```

2. Give the project its own identity (package name, Compose project names, app name, this title):

   ```bash
   pnpm setup:project my-app --title "My App"
   ```

3. Create `.env`, then replace its `BETTER_AUTH_SECRET` with a generated value:

   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```

4. Start Postgres, apply migrations, seed and run:

   ```bash
   pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev
   ```

5. Open http://localhost:5173 and sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from
   `.env` (the password needs at least 12 characters).

| Service | Address |
|---|---|
| Web app (Vite, proxies `/api`) | http://localhost:5173 |
| API health | http://localhost:3000/api/health |
| Postgres (dev) | `postgres://app:app@localhost:5432/app` |

## Everyday commands

Run them from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | API (`tsx watch`, port 3000) and web (Vite, port 5173) together |
| `pnpm verify` | Typecheck + lint + tests, no database needed. Run before every commit |
| `pnpm test:integration` | API integration tests against Postgres (`DATABASE_URL_TEST`) |
| `pnpm build` | Build every package |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm lint` | Biome lint and format check |
| `pnpm check` | Biome check, writing safe fixes and formatting |
| `pnpm format` | Biome format, writing changes |
| `pnpm test` | Unit tests in every package plus `pnpm test:scripts` |
| `pnpm test:scripts` | Tests of the generator and setup scripts (`node --test`) |
| `pnpm gen:module <name>` | New feature module cloned from `projects` (see [recipes](docs/recipes.md)) |
| `pnpm setup:project <name>` | Rename the per-project identifiers (safe to repeat) |
| `pnpm db:up` / `pnpm db:down` | Start / stop the development Postgres |
| `pnpm db:generate --name <name>` | Generate a migration from the Drizzle schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Default organization, admin user and sample projects (idempotent) |
| `pnpm docker:up` / `pnpm docker:seed` / `pnpm docker:down` | Full stack in containers |

## Run with Docker

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > docker/.env   # once
pnpm docker:up     # builds and starts postgres, migrate, api, web -> http://localhost:8080
pnpm docker:seed   # admin from SEED_ADMIN_* in .env; safe to repeat
pnpm docker:down   # stops the stack and keeps the database volume
```

Every Compose command, `down` included, needs `BETTER_AUTH_SECRET` from the shell or
`docker/.env`. Ports, env precedence and the production checklist are in
[docs/deployment.md](docs/deployment.md).

## Project map

```
apps/
  api/            Hono API: config, core (errors, http, middleware, tenancy), db, modules/<feature>
  web/            React SPA: components (ui, layout, feedback, data, form), features/<feature>, routes
packages/
  contracts/      Zod schemas, error codes and envelopes shared by api and web
docker/           compose.yaml (full stack), compose.dev.yaml (Postgres only)
scripts/          gen-module and setup-project CLIs
.claude/skills/   add-module, add-page, add-component agent skills
docs/             architecture, conventions, recipes, deployment
```

## Docs

| Doc | Read it when |
|---|---|
| [AGENTS.md](AGENTS.md) | You (or an AI agent) are about to change code: rules and the verify loop |
| [docs/architecture.md](docs/architecture.md) | You need the big picture: layout, request flow, tenancy, security |
| [docs/conventions.md](docs/conventions.md) | You are deciding where code goes, how to name it, how errors and tests work |
| [docs/recipes.md](docs/recipes.md) | You are adding a module, page, component, form field or env var, or rebranding |
| [docs/deployment.md](docs/deployment.md) | You are running containers or going to production |
