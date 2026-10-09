# PostgreSQL backend scaffold

This folder is the clean home for the PostgreSQL-backed API. Row 0b only
proves that this machine can connect to PostgreSQL; it creates no application
tables and does not initialize Alembic. The MongoDB API under
`backend_refactor/` remains unchanged and continues to run independently.

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
repository root:

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
run from the repository root:

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
current revision should be `0002_core_auth_schema (head)`. The only public
base tables at this row are `admin_tokens`, `alembic_version`, `money_config`,
`partner_tokens`, `partners`, and `users`; taxonomy and later-row application
tables should not exist yet. These `psql` examples use the role and database
created in the local setup above; substitute your own connection settings if
they differ.

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
