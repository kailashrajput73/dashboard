# Row 1 — Alembic empty baseline

**Status:** Built; implementation and local PostgreSQL checks passed; user
acceptance remains.

## Plan and result

Wire Alembic into the new `backend/` PostgreSQL application and establish its
initial migration revision without creating any business schema. Alembic is
configured to load `DATABASE_URL` from `backend/.env` with `python-dotenv`, as
`backend/app/db.py` does. The baseline revision's `upgrade()` and
`downgrade()` are no-ops. Running the revision creates only Alembic's own
`alembic_version` table; no application tables or data are introduced.

There is no `Base` or model metadata yet. `target_metadata = None` is
intentional because this is a manually authored empty baseline. Add SQLAlchemy
metadata when application models begin in later rows; do not add row 2
application tables as part of this baseline.

The drift check found the current Mongo-backed code references 19 distinct
collections and has 81 API route decorators. These agree with collections
COL-01–COL-19 in the inventory plus supplement, and routes RTE-01–RTE-76
plus service-request routes RTE-77–RTE-81. No additional drift was found that
requires changing the facts supplement. The inventory remained read-only.

## MongoDB difference and row 2 dependencies

MongoDB collections and routes in `backend_refactor/` are unchanged and
continue to serve production. This row creates only PostgreSQL migration
bookkeeping and does not copy data, wire routes, or change the live Mongo
path. No TXN-* entry is implemented in this row.

When row 2 defines the auth tables, keep the SQL identifiers expected by the
row 0c auth dependency: `admin_tokens.admin_id`,
`partner_tokens.partner_id`, and `users.is_active`, as well as referenced
`users.id` and `partners.id`. The token lookup fields are `token`. There are
no auth tables or other application tables in this row.

## Files changed

- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/script.py.mako`
- `backend/alembic/versions/0001_empty_baseline.py`
- `backend/README.md`
- `migration-db/DB-STATUS.md`
- `migration-db/dev/2026-10-09-01-alembic-baseline.md`
- `migration-db/exec-log/2026-10-09-01-alembic-baseline.md` (personal,
  Git-ignored)

No model files, business tables, Mongo code, frontend, or files under `docs/`
were changed.

## Verification completed

Against the local PostgreSQL database configured by `backend/.env`:

- `alembic upgrade head` succeeded.
- `alembic current` reported `0001_empty_baseline (head)`.
- `alembic history` showed only `0001_empty_baseline`.
- A read-only `pg_catalog.pg_tables` query returned only
  `public.alembic_version`; that table's recorded revision was
  `0001_empty_baseline`.
- All 16 existing backend auth/CORS unit tests passed.
- `git diff --check` passed.

## Verify on PostgreSQL

Use the local database from row 0b (`quotation_db_pg`) or another local
PostgreSQL database configured in `backend/.env`. Keep the password private
and do not overwrite an existing `.env`. The examples below install the
existing requirements in the backend virtual environment. If dependencies are
already installed, the pip command may be skipped. These are reproducible
commands for the user to check the same result in their environment.

### Windows — PowerShell

From the repository root:

```powershell
if (-not (Test-Path backend\.venv)) { py -m venv backend\.venv }
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
```

Set the actual local `DATABASE_URL` in `backend\.env` if it is not already
configured. Activate the venv, install requirements, and run the checks from
`backend\`:

```powershell
backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Set-Location backend
alembic upgrade head
alembic current
alembic history
psql -h 127.0.0.1 -p 5432 -U quotation_app -d quotation_db_pg -c "SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;"
```

Expected: upgrade succeeds and reports the empty baseline revision;
`current` prints `0001_empty_baseline (head)`; `history` contains that single
revision; and the query returns only `public | alembic_version`. If the
PowerShell activation policy blocks activation, invoke
`backend\.venv\Scripts\alembic.exe` from `backend\` instead of activating.

### macOS — zsh or bash

From the repository root:

```bash
test -d backend/.venv || python3 -m venv backend/.venv
test -f backend/.env || cp backend/.env.example backend/.env
```

Set the actual local `DATABASE_URL` in `backend/.env` if it is not already
configured. Then:

```bash
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
alembic upgrade head
alembic current
alembic history
psql -h 127.0.0.1 -p 5432 -U quotation_app -d quotation_db_pg -c "SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;"
```

Expected: successful upgrade, `0001_empty_baseline (head)` from `current`,
one baseline entry in `history`, and the table query returns only
`public | alembic_version`.

### Linux — bash

From the repository root:

```bash
test -d backend/.venv || python3 -m venv backend/.venv
test -f backend/.env || cp backend/.env.example backend/.env
```

Set the actual local `DATABASE_URL` in `backend/.env` if it is not already
configured. Then:

```bash
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
alembic upgrade head
alembic current
alembic history
psql -h 127.0.0.1 -p 5432 -U quotation_app -d quotation_db_pg -c "SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;"
```

Expected: successful upgrade, `0001_empty_baseline (head)` from `current`,
one baseline entry in `history`, and the table query returns only
`public | alembic_version`.

All three checks must use the same database. Do not point the command at the
production Mongo-backed API. If the database already contains unrelated
application tables, the final query will list them; do not remove them as part
of this row.

## DB-STANDARDS checklist

1. **Primary key, timestamps, and soft delete for each new table — N/A.** No
   application table is created. Alembic's internal version table is
   infrastructure bookkeeping, not an application record.
2. **Real foreign keys, delete behavior, and FK indexes — N/A.** No
   application relationships or foreign keys are introduced; defer to the
   rows that define related application tables.
3. **Indexes on columns used for search/filter/sort — N/A.** No application
   columns exist in this baseline.
4. **Unique constraints on values that must not repeat — N/A.** No
   application data columns or constraints are introduced.
5. **Transactions for multi-table writes — N/A.** The baseline has no
   multi-table application write; Alembic manages its migration transaction
   for the single revision and version bookkeeping.
6. **Authentication and authorization on non-public API routes — deferred to
   rows 18–20.** No API route is added or changed by this migration scaffold.
7. **Pydantic validation for incoming API data — deferred to rows 18–20.**
   No API input or route is added by this row.
8. **Audit log for important creates, updates, and deletes — deferred to
   later application-write rows / separately deferred audit-log work.** No
   application records are written, and the migration ledger is not an
   application audit log.

## Remaining

Row 1 is **Built**, not Done. Review/repeat the checks in your environment;
then mark the row Done after acceptance. Row 2 and all later rows remain
untouched.
