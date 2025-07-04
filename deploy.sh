#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Pulling new images"
sudo docker compose pull --quiet

echo "[INFO] Stopping old containers"
sudo docker compose down --remove-orphans

echo "[INFO] Removing old images"
sudo docker image prune -f

echo "[INFO] Starting new containers"
sudo docker compose up --build -d --remove-orphans

sudo rm /opt/app/MRSPlayground/.env