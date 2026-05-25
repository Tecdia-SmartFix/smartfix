# Frontend image — Vite build, served by nginx. Two stages so the runtime
# image (~25 MB nginx alpine) doesn't carry node_modules.

# ── Build stage ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Site-level nginx config: SPA fallback for client routes, reverse-proxy for
# /auth, /admin, /machines, /shifts, /query, /health, /workstation back to
# the backend service on the docker network.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static SPA assets from the Vite build.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
