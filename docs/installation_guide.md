# Installation Guide

## Requirements

- Docker and Docker Compose
- Python 3.11 for local development
- PostgreSQL 16 and Redis 7 when running without Docker

## Docker Installation

```sh
cp .env.example .env
docker compose up --build
```

## Local Python Installation

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

Use `app.production_main:app` when validating production middleware locally.
