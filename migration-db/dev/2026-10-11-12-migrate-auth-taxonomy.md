# Row 12 — Mongo → Postgres: auth + taxonomy

## Planned and built

This row copies the auth and taxonomy Mongo collections into the PostgreSQL tables created in rows 2–4.

Source collections:
- `users`
- `admin_tokens`
- `partners`
- `partner_tokens`
- `money_config`
- `categories`
- `subcategories`
- `brands`
- `product_types`

Target tables:
- `users`
- `admin_tokens`
- `partners`
- `partner_tokens`
- `money_config`
- `categories`
- `subcategories`
- `brands`
- `product_types`

The migration script preserves string IDs, converts camelCase names to snake_case, maps ISO date strings into PostgreSQL `timestamptz`, and applies insert ordering so parent rows are loaded before child rows. It skips rows whose foreign-key parent is missing and logs the skip reason instead of creating broken references.

Files touched:
- `backend/scripts/migrate/row12_auth_taxonomy.py`
- `backend/tests/test_migration_scripts.py`
- `migration-db/DB-STATUS.md`
- `migration-db/exec-log/2026-10-11-12-migrate-auth-taxonomy.md`

## Dry-run and execute

Create or activate the virtual environment, then install the backend dependency set
so `pymongo` is available before you run the migration scripts.

### Windows (PowerShell)

```powershell
Set-Location "c:\Users\Dell\Desktop\dashboard\backend"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/migrate/row12_auth_taxonomy.py --dry-run
.\.venv\Scripts\python.exe scripts/migrate/row12_auth_taxonomy.py --execute
```

### macOS

```bash
cd backend
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/migrate/row12_auth_taxonomy.py --dry-run
.venv/bin/python scripts/migrate/row12_auth_taxonomy.py --execute
```

### Linux

```bash
cd backend
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/migrate/row12_auth_taxonomy.py --dry-run
.venv/bin/python scripts/migrate/row12_auth_taxonomy.py --execute
```

Optional: set `TEST_DATABASE_URL` (not `TESTABASE_URL`) before running schema-related unit tests.

Notes:
- `--dry-run` is read-only and prints per-table `mongo_count`, `inserted`, and `skipped` counts.
- `--execute` is explicit and writes only the row-12 tables.
- `--truncate-target` is accepted but intentionally warns and does not run destructive table truncation. This migration is append-only by design.

## DB-STANDARDS checklist for row 12

1. Every new table: applicable to the schema, already satisfied by rows 2–4; the data copy does not create any new table shape.
2. Every relationship: applied. FK columns are real id references, and parent-child insertion order is enforced.
3. Search/filter/sort indexes: already created in the schema rows; the migration script does not change them.
4. Never-repeat values: the target tables keep their unique constraints, and the migration script skips duplicates that would violate them.
5. Multi-table writes: applicable to this row as a migration procedure. The script does one insert per row and keeps FK ordering strict. The user is expected to validate the result side-by-side before moving to a later row.
6. Protected API routes: not applicable. No API routes or route security changes are introduced here.
7. Incoming-data validation: applicable only at the migration boundary. The script normalizes field names and date values before insert, and it does not silently accept missing parent IDs.
8. Audit log: not applicable to this migration-only row; the project’s deferred audit-log work remains outside the scope of rows 12–13.

## Validation approach

The script reports the per-table counts and flags missing FK targets before each insert. This keeps row 12 auditable and prevents orphaned record creation in `admin_tokens`, `money_config`, `partner_tokens`, and `subcategories`.

## Status

Set row 12 to `Built` after the dry-run and explicit execute pass is reviewed by the user.
