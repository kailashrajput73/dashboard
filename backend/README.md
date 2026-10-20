# PostgreSQL backend scaffold

This folder is the **only** API implementation in the repo (PostgreSQL).
The legacy Mongo mirror `backend_refactor/` was removed in DB migration row 22.
See `migration-db/ACTIVE-STACK.md`.

## Windows PowerShell

Install PostgreSQL 17 with the Windows package manager:

```powershell
winget install --id PostgreSQL.PostgreSQL.17 --exact --source winget
```

The EnterpriseDB Windows installer is an alternative. Keep the default
PostgreSQL port (`5432`) and remember the `postgres` administrator password
you set during installation.

Open `psql` as the administrator:

```powershell
psql -U postgres -h 127.0.0.1 -p 5432 -d postgres
```

At the `psql` prompt, create a dedicated local application role and database.
Set the role password with `\password` so it is not embedded in SQL history:

```text
CREATE ROLE quotation_app WITH LOGIN;
\password quotation_app
CREATE DATABASE quotation_db_pg OWNER quotation_app;
\q
```

`quotation_db_pg` is intentionally distinct from MongoDB's `quotation_db`.
Copy `.env.example` to `.env`, replace the placeholder with the role password,
then install the Python dependencies and run the connection check from the
repository root. After the venv exists, install the full backend dependency set
so `pymongo` is present before any migration script runs:

```powershell
Copy-Item backend\.env.example backend\.env
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe backend\scripts\test_pg_connection.py
```

Use a URL-safe password in `DATABASE_URL`, or percent-encode any reserved URL
characters. `.env` is ignored by Git; never commit local credentials.

## Linux equivalent (Debian/Ubuntu)

Install PostgreSQL and the Python venv support, then start the system service:

```bash
sudo apt update
sudo apt install postgresql postgresql-client python3-venv
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

Run the same `CREATE ROLE`, `\password`, and `CREATE DATABASE` commands in
`psql`. Copy `backend/.env.example` to `backend/.env`, set the password, then
run from the repository root. After the venv is created, install the backend
requirements explicitly:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/python backend/scripts/test_pg_connection.py
```

On Fedora/RHEL, use the distribution's `dnf` PostgreSQL server/client packages
and its PostgreSQL initialization procedure; the service is also named
`postgresql`.

## Alembic migrations

Alembic runs from this directory and reads `DATABASE_URL` from `backend/.env`
using the same dotenv pattern as `app/db.py`. Keep `.env` local and
untracked. `0001_empty_baseline` is the empty starting revision. Row 2 adds
`users`, `admin_tokens`, `partners`, `partner_tokens`, and `money_config`.

From the repository root, apply the migration and inspect the public tables:

```powershell
Set-Location backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
psql -U quotation_app -h 127.0.0.1 -p 5432 -d quotation_db_pg -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
```

On macOS (zsh) or Linux (bash), use the backend virtual environment's Unix
entry points from the repository root:

```bash
cd backend
.venv/bin/alembic upgrade head
.venv/bin/alembic current
psql -U quotation_app -h 127.0.0.1 -p 5432 -d quotation_db_pg -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
```

Set the local PostgreSQL credentials in `backend/.env` before upgrading. The
current schema revision is `0013_catalog_api_indexes`; it includes
the application tables from earlier migration rows, row-18 auth/taxonomy
constraints, and catalog API filter/search indexes. These `psql` examples use the role and
database created in the local setup above; substitute your own connection
settings if they differ.

## Local API server and CORS

The PostgreSQL app has one credentialed CORS middleware. It always allows
`http://localhost:5173` (the Vite admin dev origin), `http://localhost:3000`,
and `http://localhost:8081`, and merges in additional origins from the
comma-separated `CORS_ORIGINS` setting in `backend/.env`. Do not put `*` in
that setting: credentials require explicit origins. Keep `.env` local and
untracked.

Run the PostgreSQL API on port `8001` from the `backend/` directory, leaving
the Mongo mirror on port `8000`:

```text
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

`GET /api/health` returns `{"status":"ok"}` and can be used to check the
server or browser CORS behavior. `web/vite.config.ts` currently sets only
the Vite port (`5173`) and defines no API proxy; no frontend proxy or API
client was changed in this row. If a later migration task needs Vite to proxy
to PostgreSQL, it can add an explicit `VITE_API_URL` or proxy target then.

Check the health endpoint while the server is running:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/health
```

The row-18 auth, partner/team, taxonomy, and subcategory routes are mounted
under `/api`. After applying migrations through `head`, PostgreSQL-backed API
tests run from this directory with a disposable database in
`TEST_DATABASE_URL`:

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://quotation_app:YOUR_PASSWORD@127.0.0.1:5432/quotation_test"
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The test database must already be migrated to `head`; use the same URL for
`DATABASE_URL` when running Alembic. Tests wrap writes in a rollback-only
transaction and do not require MongoDB. Leave `TEST_DATABASE_URL` unset to
run the database-independent tests only.

## Catalog and pricing API (row 19)

The catalog, pricing, tree, and import routes are mounted under `/api` and
use the admin Bearer token dependency, except the existing passcode-body
operations `POST /catalog/{item_id}/delete-secured`,
`POST /catalog/purge-by-field`, and `POST /catalog/wipe-all`. Catalog list
and tree reads return the existing `{success, data, error}` response envelope.
Import endpoints accept parsed JSON rows (not multipart CSV uploads); parse
the spreadsheet using the existing import templates before posting.

The master import accepts `items` plus the optional `categoryMode` and
`overrideCategory` fields. A minimal row is:

```json
{
  "items": [
    {
      "name": "UPVC Pipe",
      "category": "Pipes",
      "type": "UPVC",
      "productClass": "Sch 40",
      "brand": "Acme",
      "subcategory": "Drainage",
      "productCode": "ACME-UPVC-SCH40-25",
      "mrp": 100,
      "discount": 10,
      "sizeMm": 25
    }
  ]
}
```

The spreadsheet header rows remain the read-only templates in
`web/src/utils/import-templates.ts`: master includes `Category`, `Type`,
`Sub-Category`, `class`, `Brand`, `Product Name`, `Product Code`, and the
price/stock attributes; pricing uses `Product Code`, `MRP (Rs) per nos`,
`discount`, and `Selling Price`; stock uses `Product Code` and `qty`.
Pricing imports skip codes not present in catalog and report them in
`skipped`, rather than creating orphan pricing rows. Catalog create/update,
pricing/history writes, imports, and full-tree reset each run in one
PostgreSQL transaction. Full-tree reset preserves rows with `deleted_at`
and clears occupied rack-slot links.

After upgrading a disposable database and setting `TEST_DATABASE_URL`, run
`test_catalog_api.py` from the `backend/` directory:

### Windows PowerShell

```powershell
$env:DATABASE_URL = $env:TEST_DATABASE_URL
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_catalog_api.py' -v
```

### macOS

```bash
export DATABASE_URL="$TEST_DATABASE_URL"
.venv/bin/alembic upgrade head
.venv/bin/python -m unittest discover -s tests -p 'test_catalog_api.py' -v
```

### Linux

```bash
export DATABASE_URL="$TEST_DATABASE_URL"
.venv/bin/alembic upgrade head
.venv/bin/python -m unittest discover -s tests -p 'test_catalog_api.py' -v
```

To compare the same behavior with Mongo, run the PostgreSQL API on port 8001
and the Mongo mirror on port 8000. Register/log in an admin on each backend
and use each returned token for the same catalog requests. No web proxy or
frontend configuration was changed.
