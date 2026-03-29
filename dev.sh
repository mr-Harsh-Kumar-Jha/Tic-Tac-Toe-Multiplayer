#!/bin/bash
# dev.sh — single command to build plugin + start all services
# Usage: ./dev.sh

set -e

echo "🧹 Cleaning old containers..."
docker compose down

echo "🔨 Rebuilding Go plugin completely..."
docker compose build --no-cache plugin-builder
docker compose run --rm plugin-builder

echo "🚀 Starting Nakama + PostgreSQL..."
docker compose up