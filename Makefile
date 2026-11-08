# Common developer tasks. Monorepo layout: backend/ (Django) and frontend/
# (Next.js). Run most targets from the repo root; they cd where they need to.

# Backend virtualenv (create once with: make deps)
VENV = backend/.venv
PY = cd backend && $(VENV)/bin/python
PIP = cd backend && $(VENV)/bin/pip

.PHONY: deps migrate test check server front css check-front

deps:
	cd backend && $(VENV)/bin/pip install -r requirements-dev.txt

migrate:
	cd backend && .venv/bin/python manage.py migrate

server:
	cd backend && .venv/bin/python manage.py runserver

front:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/python -m pytest tests/

check:
	cd backend && .venv/bin/python manage.py check

# Frontend typecheck+lint
check-front:
	cd frontend && npm run typecheck && npm run lint

# Compile Tailwind for the server-side templates (backend/package.json
# provides @tailwindcss/cli):
css:
	cd backend && npm install --no-audit --no-fund && npm run build-css

# Test in the real containers (authoritative):
docker-test:
	docker compose -f backend/docker-compose.yaml exec -T app python -m pytest tests/ -q
