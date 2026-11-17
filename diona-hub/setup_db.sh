#!/usr/bin/env bash
set -euo pipefail

# Export DB_PASSWORD before running, or load it from .env in this shell.
if [[ -z "${DB_PASSWORD:-}" ]]; then
    echo "DB_PASSWORD must be set in the environment." >&2
    exit 1
fi
if [[ "$DB_PASSWORD" == *$'\n'* || "$DB_PASSWORD" == *$'\r'* ]]; then
    echo "DB_PASSWORD must not contain newline characters." >&2
    exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
    echo "This script supports Debian, Ubuntu, and Raspberry Pi OS (apt-get)." >&2
    exit 1
fi

if (( EUID == 0 )); then
    apt-get update
    apt-get install -y postgresql
else
    if ! command -v sudo >/dev/null 2>&1; then
        echo "Run as root or install sudo to provision PostgreSQL." >&2
        exit 1
    fi
    sudo apt-get update
    sudo apt-get install -y postgresql
fi

if ! command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL installation completed, but psql is not on PATH." >&2
    exit 1
fi
if (( EUID == 0 )) && ! command -v runuser >/dev/null 2>&1; then
    echo "runuser is required to execute psql as the postgres system user." >&2
    exit 1
fi

run_as_postgres() {
    if (( EUID == 0 )); then
        runuser -u postgres -- "$@"
    else
        sudo -u postgres "$@"
    fi
}

run_as_postgres psql -X -v ON_ERROR_STOP=1 -d postgres <<'SQL'
DO $create_role$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'diona') THEN
        CREATE ROLE diona LOGIN;
    END IF;
END
$create_role$;
SQL

# psql's password prompt avoids putting the plaintext password in SQL or argv.
printf '\\password diona\n%s\n%s\n' "$DB_PASSWORD" "$DB_PASSWORD" |
    run_as_postgres psql -X -v ON_ERROR_STOP=1 -d postgres

run_as_postgres psql -X -v ON_ERROR_STOP=1 -d postgres <<'SQL'
SELECT 'CREATE DATABASE diona_hub OWNER diona'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_database WHERE datname = 'diona_hub')
\gexec

ALTER DATABASE diona_hub OWNER TO diona;
GRANT ALL PRIVILEGES ON DATABASE diona_hub TO diona;
\connect diona_hub
GRANT ALL PRIVILEGES ON SCHEMA public TO diona;
SQL

ENCODED_DB_PASSWORD="$(
    DB_PASSWORD="$DB_PASSWORD" python3 -c \
        'import os; from urllib.parse import quote; print(quote(os.environ["DB_PASSWORD"], safe=""))'
)"
printf 'DATABASE_URL=postgresql://diona:%s@localhost:5432/diona_hub\n' "$ENCODED_DB_PASSWORD"
