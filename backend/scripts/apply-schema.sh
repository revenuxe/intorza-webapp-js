#!/usr/bin/env bash
# Apply the canonical schema to AWS RDS.
#
# Usage:
#   DATABASE_URL='postgres://user:pass@host:5432/db?sslmode=require' \
#   bash scripts/apply-schema.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")"/.. && pwd)"
: "${DATABASE_URL:?Set DATABASE_URL to your RDS connection string}"
echo "[apply-schema] target: $(echo "$DATABASE_URL" | sed 's/:[^@]*@/:****@/')"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$HERE/schema.sql"
echo "[apply-schema] done"
