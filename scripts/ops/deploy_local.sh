#!/usr/bin/env sh
set -eu

docker compose build
docker compose up -d db redis
docker compose run --rm api sh scripts/ops/migrate.sh
docker compose run --rm api sh scripts/ops/seed.sh
docker compose up -d
docker compose ps
