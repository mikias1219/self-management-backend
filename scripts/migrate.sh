#!/usr/bin/env bash
#
# LifeOS Database Migration Runner
# Usage:
#   ./scripts/migrate.sh up          # Run pending migrations
#   ./scripts/migrate.sh create "Add user table"
#
set -euo pipefail

cd "$(dirname "$0")/../backend"

case "${1:-up}" in
  up)
    echo "🚀 Running TypeORM migrations..."
    npx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts
    ;;
  create)
    if [ -z "${2:-}" ]; then
      echo "Usage: ./scripts/migrate.sh create \"Migration name\""
      exit 1
    fi
    echo "📝 Creating new migration: $2"
    npx typeorm-ts-node-commonjs migration:create src/database/migrations/"$2"
    ;;
  *)
    echo "Unknown command: $1"
    echo "Available: up | create <name>"
    exit 1
    ;;
esac
