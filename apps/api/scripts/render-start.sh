#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

is_db_supabase_host() {
  [[ "${1:-}" == *"@db."*".supabase.co"* ]]
}

is_pooler_host() {
  [[ "${1:-}" == *"pooler.supabase.com"* ]]
}

session_pooler_from_database_url() {
  local url="${1%%\?*}"
  url="${url//:6543/:5432}"
  printf '%s' "$url"
}

postgres_url_user() {
  local url="${1:-}"
  if [[ "$url" =~ postgres(ql)?://([^:@/]+) ]]; then
    printf '%s' "${BASH_REMATCH[2]}"
  fi
}

validate_pooler_database_url() {
  local url="${1:-}"
  if ! is_pooler_host "$url"; then
    return 0
  fi
  local user
  user="$(postgres_url_user "$url")"
  if [[ "$user" == "postgres" ]]; then
    echo "ERROR: DATABASE_URL uses pooler host but username is \"postgres\" (direct-connection format)."
    echo "Supabase pooler requires: postgres.YOUR_PROJECT_REF (e.g. postgres.fuefkgitvfkvmkyttxzc)."
    echo "Copy the full URI from Supabase → Settings → Database → Transaction pooler (URI)."
    echo "URL-encode special characters in the password (@ # % etc.)."
    exit 1
  fi
}

validate_pooler_database_url "${DATABASE_URL:-}"

if is_db_supabase_host "${DATABASE_URL:-}"; then
  echo "ERROR: DATABASE_URL uses db.*.supabase.co — Render cannot reach it."
  echo "In Supabase: Settings → Database → use Transaction pooler (port 6543) for DATABASE_URL."
  echo "See docs/LIVE_API_SETUP.md"
  exit 1
fi

if is_db_supabase_host "${DIRECT_URL:-}"; then
  if is_pooler_host "${DATABASE_URL:-}"; then
    export DIRECT_URL="$(session_pooler_from_database_url "$DATABASE_URL")"
    echo "Using session pooler DIRECT_URL derived from DATABASE_URL (db.* host is not reachable on Render)."
  else
    echo "ERROR: DIRECT_URL uses db.*.supabase.co and DATABASE_URL is not a Supabase pooler URL."
    echo "Set DIRECT_URL to Session pooler port 5432 (aws-0-*.pooler.supabase.com), not db.*.supabase.co."
    echo "See docs/LIVE_API_SETUP.md"
    exit 1
  fi
fi

if [[ -z "${DIRECT_URL:-}" ]] && is_pooler_host "${DATABASE_URL:-}"; then
  export DIRECT_URL="$(session_pooler_from_database_url "$DATABASE_URL")"
  echo "DIRECT_URL set from DATABASE_URL (session pooler, port 5432)."
fi

npx prisma migrate deploy --schema=prisma/schema.prisma
exec node dist/server.js
