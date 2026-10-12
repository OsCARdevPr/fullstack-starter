# syntax=docker/dockerfile:1
# Web image: the SPA built with Vite, served by unprivileged nginx on port 8080 (proxies /api).
# Build from the repository root: docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS build
# Node images may not ship corepack, so install the pnpm version pinned in package.json.
RUN npm install --global pnpm@12.11.2
WORKDIR /repo
# Download packages from the lockfile alone: this layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @starter/web...
# VITE_* values are compiled into the static bundle, so they are build arguments, not runtime env.
ARG VITE_APP_NAME
RUN pnpm --filter @starter/web build

FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
