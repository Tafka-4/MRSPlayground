#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Pulling new images"
docker compose pull --quiet

echo "[INFO] Recreating containers"
docker compose up -d --remove-orphans

echo "[INFO] Removing dangling images"
docker image prune -f