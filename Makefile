PYTHON ?= python
COMPOSE ?= docker compose

.PHONY: help install lint test test-unit test-e2e compile openapi migrate seed run docker-up docker-down prod-up prod-down logs worker backup restore clean

help:
	@echo "NurtureHer backend commands:"
	@echo "  make install      Install Python dependencies"
	@echo "  make lint         Run Ruff"
	@echo "  make test         Run all tests"
	@echo "  make compile      Compile Python files"
	@echo "  make openapi      Generate docs/openapi.json"
	@echo "  make migrate      Run Alembic migrations"
	@echo "  make seed         Seed local database"
	@echo "  make run          Run local dev server"
	@echo "  make docker-up    Run development Docker stack"
	@echo "  make prod-up      Run production Docker stack"

install:
	$(PYTHON) -m pip install -r requirements.txt

lint:
	ruff check .

test:
	pytest -q

coverage:
	pytest -q --cov=app --cov-report=term-missing --cov-fail-under=80

test-unit:
	pytest -q tests

test-e2e:
	pytest -q tests/e2e

compile:
	$(PYTHON) -m compileall app scripts tests

openapi:
	$(PYTHON) scripts/ops/generate_openapi.py

migrate:
	alembic upgrade head

seed:
	$(PYTHON) scripts/seed.py

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-up:
	$(COMPOSE) up --build

docker-down:
	$(COMPOSE) down

prod-up:
	$(COMPOSE) -f docker-compose.prod.yml up --build -d

prod-down:
	$(COMPOSE) -f docker-compose.prod.yml down

logs:
	$(COMPOSE) logs -f api worker

worker:
	celery -A app.workers.celery_app.celery_app worker --loglevel=info

backup:
	powershell -ExecutionPolicy Bypass -File scripts/ops/backup_db.ps1

restore:
	@echo "Usage: powershell -ExecutionPolicy Bypass -File scripts/ops/restore_db.ps1 -BackupFile <path>"

clean:
	$(PYTHON) -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]"
