#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Pulling new images"
docker compose pull --quiet

echo "[INFO] Stopping old containers"
docker compose down --remove-orphans

echo "[INFO] Removing old images"
docker image prune -f

echo "[INFO] Starting new containers"
docker compose up --build -d --remove-orphans

rm /opt/app/MRSPlayground/.env