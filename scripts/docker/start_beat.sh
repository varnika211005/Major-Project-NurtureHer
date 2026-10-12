#!/usr/bin/env sh
set -eu

exec celery -A app.workers.celery_app.celery_app beat --loglevel="${LOG_LEVEL:-info}"
