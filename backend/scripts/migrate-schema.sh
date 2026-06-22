#!/usr/bin/env bash
# Optional: snapshot the current Supabase Postgres schema for reference.
# This is NOT how the RDS schema is created — schema.sql is the source of
# truth. Use this only to diff against Supabase if you need to verify nothing
# was missed during the port.
#
# Requires: pg_dump 15+, and the Supabase direct DB connection string.
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Project Settings → Database → Connection string → URI)}"
OUT="${1:-./supabase-schema-snapshot.sql}"
pg_dump --schema-only --no-owner --no-acl \
  --schema=public \
  --exclude-table='storage.*' \
  "$SUPABASE_DB_URL" > "$OUT"
echo "[snapshot] wrote $OUT"
