# syntax=docker/dockerfile:1
# Frontend image (Next.js public UI). Build from this directory:
#   docker build --target web-runtime -t vennelink_web frontend/
# The backend lives in ../backend with its own Dockerfile. The proxy rewrite
# target is baked at build time; DJANGO_BACKEND_URL is also read at runtime
# by server components — keep both pointing at the same Django host.
FROM node:22-slim AS web

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

ARG DJANGO_BACKEND_URL=http://app:8000
ENV DJANGO_BACKEND_URL=$DJANGO_BACKEND_URL

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# output: "standalone" (next.config.ts) emits .next/standalone: server.js
# plus only the node_modules Next traced as actually used at runtime.
RUN npm run build

# ---- slim standalone runtime --------------------------------------------
FROM node:22-slim AS web-runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app
COPY --from=web /app/.next/standalone ./
COPY --from=web /app/.next/static ./.next/static
COPY --from=web /app/public ./public

EXPOSE 3000
# next.config.ts rewrites anything the React app doesn't handle to Django,
# so this one port serves the whole same-origin site (sessions, CSRF).
CMD ["node", "server.js"]
