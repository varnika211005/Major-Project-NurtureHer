#!/usr/bin/env sh
set -eu

exec celery -A app.workers.celery_app.celery_app worker --loglevel="${LOG_LEVEL:-info}"
