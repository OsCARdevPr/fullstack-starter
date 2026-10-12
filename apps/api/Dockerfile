# syntax=docker/dockerfile:1
# API image. Build from the repository root: docker build -f apps/api/Dockerfile .
# Runs the server by default; the same image runs `node dist/migrate.mjs` and `node dist/seed.mjs`.

FROM node:24-alpine AS build
# Node images may not ship corepack, so install the pnpm version pinned in package.json.
RUN npm install --global pnpm@12.11.2
WORKDIR /repo
# Download packages from the lockfile alone: this layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @starter/api...
# dist/ (bundle + migrations) and production dependencies only, in /prod/api.
RUN pnpm --filter @starter/api build \
  && pnpm --filter @starter/api deploy --prod /prod/api

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
# Files stay owned by root: the app user can read its code but not change it.
COPY --from=build /prod/api ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/index.mjs"]
