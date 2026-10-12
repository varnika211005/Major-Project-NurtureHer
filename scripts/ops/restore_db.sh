#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/ops/restore_db.sh <backup.sql>" >&2
  exit 2
fi

psql "$SYNC_DATABASE_URL" < "$1"
