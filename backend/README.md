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
