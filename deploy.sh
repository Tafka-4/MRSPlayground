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

echo "[INFO] Cleaning up .env file"
rm -f ~/MRSPlayground/.env