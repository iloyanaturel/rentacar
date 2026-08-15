#!/usr/bin/env bash
# Apply RentaFlow migrations to a local Postgres and run STEP 2 tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${RENTAFLOW_TEST_DB:-rentaflow_test}"
PGUSER="${PGUSER:-postgres}"
export PGUSER

echo "==> Preparing database: ${DB_NAME}"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};"

# Non-superuser for realistic RLS
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" <<'SQL'
DO $$ BEGIN
  CREATE ROLE rentaflow_app LOGIN PASSWORD 'rentaflow' NOSUPERUSER NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT ALL ON DATABASE rentaflow_test TO rentaflow_app;
SQL

run_sql() {
  local file="$1"
  echo "--> Applying $(basename "$file")"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "$file"
}

run_sql "${ROOT}/supabase/tests/00_supabase_stubs.sql"

for f in "${ROOT}/supabase/migrations/"*.sql; do
  run_sql "$f"
done

# Grants for app role
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" <<'SQL'
GRANT USAGE ON SCHEMA public, auth, storage TO rentaflow_app;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO rentaflow_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO rentaflow_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rentaflow_app;
GRANT authenticated TO rentaflow_app;
ALTER ROLE rentaflow_app SET role = authenticated;
SQL

echo "==> Running core tests"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/01_core_tests.sql"

echo "==> Running vehicle tests"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/02_vehicle_tests.sql"

echo "==> Running customer + rental tests"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/03_customers_rentals_tests.sql"

echo "==> Running operations tests (STEP 6)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/04_operations_tests.sql"

echo "==> Running calendar / ops tests (STEP 7)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/05_calendar_ops_tests.sql"

echo "==> Running reporting tests (STEP 8)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "${ROOT}/supabase/tests/06_reporting_tests.sql"

echo "==> OK"
