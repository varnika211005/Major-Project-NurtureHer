#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

pg_dump "$SYNC_DATABASE_URL" > "$BACKUP_DIR/nurtureher-$TIMESTAMP.sql"
echo "$BACKUP_DIR/nurtureher-$TIMESTAMP.sql"
