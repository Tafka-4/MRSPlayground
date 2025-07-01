#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Pulling new images"
sudo docker compose pull --quiet

echo "[INFO] Recreating containers"
sudo docker compose up -d --remove-orphans

echo "[INFO] Removing dangling images"
sudo docker image prune -f