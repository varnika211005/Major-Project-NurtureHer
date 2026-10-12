#!/usr/bin/env sh
set -eu

alembic upgrade head
REQUIRE_PRODUCTION_SECRETS=true python scripts/ops/check_production_config.py

if [ "${RUN_SEED_ON_STARTUP:-false}" = "true" ]; then
  python scripts/seed.py
fi

exec gunicorn app.production_main:app -c gunicorn_conf.py
