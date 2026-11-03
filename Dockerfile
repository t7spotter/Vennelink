# syntax=docker/dockerfile:1
# Multi-stage build: stage 1 compiles the Tailwind CSS for the Django-side
# templates with Node, stage 2 builds the React frontend (also Node), and
# stage 3 is the slim Python runtime. Users without Node only need Docker to
# rebuild — the compiled CSS is committed so plain local dev never needs it.

# ---- Stage 1: Tailwind CSS for the legacy/fallback pages ---------------
FROM node:22-slim AS css

WORKDIR /app
COPY package.json package-lock.json* ./
# Tailwind v4 CLI; runs offline once node_modules is built from package.json.
RUN npm install --no-audit --no-fund
COPY static/ ./static/
COPY templates/ ./templates/
COPY accounts ./accounts
COPY analytics ./analytics
COPY links ./links
RUN npx @tailwindcss/cli -i static/css/src/input.css -o static/css/app.css --minify

# ---- Stage 2: React/Next.js frontend -----------------------------------
FROM node:22-slim AS web

ENV NODE_ENV=production
# The stage root mirrors the repo layout so Next's project root (detected
# via src/) matches local dev, where the build runs inside frontend/.
WORKDIR /app/frontend
# next.config.ts's fallback rewrite to Django is serialized into the
# production build, so the backend target is baked at build time (unlike
# server-side fetches, which read DJANGO_BACKEND_URL at runtime). Baked
# default targets the compose Django service; override with
# --build-arg DJANGO_BACKEND_URL=http://...:8000 for other layouts.
ARG DJANGO_BACKEND_URL=http://app:8000
ENV DJANGO_BACKEND_URL=$DJANGO_BACKEND_URL
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

EXPOSE 3000
# next.config.ts rewrites anything the React app doesn't handle to Django,
# so this one port serves the whole same-origin site (sessions, CSRF).
CMD ["npx", "next", "start"]

# ---- Stage 2: python runtime ------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Copy the Tailwind output from stage 1 (overwrites any stale committed css).
COPY --from=css /app/static/css/app.css static/css/app.css

EXPOSE 8000

# The start script migrates, collects static files, then serves. Keep it in
# one place so `docker compose up` is all an operator needs after setup.
CMD ["sh", "-c", "\
python manage.py migrate --noinput && \
python manage.py collectstatic --noinput && \
mkdir -p api-docs/vennelink && \
python manage.py spectacular --file api-docs/vennelink/openapi.yaml && \
gunicorn --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-2} --chdir /app config.wsgi:application"]
