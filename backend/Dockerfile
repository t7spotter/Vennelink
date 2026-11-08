# syntax=docker/dockerfile:1
# Backend image (Django API + admin + redirects) and its Tailwind CSS step.
# Build from this directory:  docker build -t vennelink_back backend/
# The frontend lives in ../frontend with its own Dockerfile.

# ---- Stage 1: Tailwind CSS for the server-side templates ---------------
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

# ---- Stage 2: Python runtime -------------------------------------------
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
