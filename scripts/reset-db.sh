#!/usr/bin/env bash
# Remove all LifeOS data while keeping schema/migrations intact, then restart backend to seed.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing backend/.env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-lifeos}"
DB_NAME="${DATABASE_NAME:-lifeos}"
export PGPASSWORD="${DATABASE_PASSWORD:-lifeos_secret}"

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename <> 'migrations'")
if [[ "${TABLE_COUNT:-0}" -eq 0 ]]; then
  echo "📦 No tables found — syncing schema from entities..."
  npx typeorm-ts-node-commonjs schema:sync -d ./typeorm.config.ts
fi

echo "⚠️  Truncating ALL rows in database \"${DB_NAME}\" on ${DB_HOST}:${DB_PORT}..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'migrations'
  ) LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $$;
SQL

echo "✅ All application data removed."
echo "   Restart ./scripts/dev.sh (or backend npm run start:dev) with SEED_ON_START=true to create your account."
