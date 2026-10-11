# Row 13 — Mongo → Postgres: catalog + pricing

## Planned and built

This row loads the Mongo catalog and pricing data into the PostgreSQL tables created in rows 6–7, then backfills the membership rows that are represented as separate join tables in Postgres.

Source collections:
- `catalog`
- `pricing`
- `pricing_history`
- `product_groups`
- `racks`

Target work:
- `catalog`
- `pricing`
- `pricing_history`
- `product_group_items`
- `rack_slots`

The script resolves taxonomy IDs and rack IDs before insert, copies the catalog rows in FK-safe order, and excludes pricing rows when the `catalog.product_code` target does not exist. The orphan list is counted and sample codes are printed for review rather than silently discarded.

Files touched:
- `backend/scripts/migrate/row13_catalog_pricing.py`
- `backend/tests/test_migration_scripts.py`
- `migration-db/DB-STATUS.md`
- `migration-db/exec-log/2026-10-11-13-migrate-catalog-pricing.md`

## Dry-run and execute

Create or activate the virtual environment, then install the backend dependency set
so `pymongo` is available before you run the migration scripts.

### Windows (PowerShell)

```powershell
Set-Location "c:\Users\Dell\Desktop\dashboard\backend"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/migrate/row13_catalog_pricing.py --dry-run
.\.venv\Scripts\python.exe scripts/migrate/row13_catalog_pricing.py --execute
```

### macOS

```bash
cd backend
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/migrate/row13_catalog_pricing.py --dry-run
.venv/bin/python scripts/migrate/row13_catalog_pricing.py --execute
```

### Linux

```bash
cd backend
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/migrate/row13_catalog_pricing.py --dry-run
.venv/bin/python scripts/migrate/row13_catalog_pricing.py --execute
```

Notes:
- The dry run reports `catalog`, `pricing`, `pricing_history`, `product_group_items`, and `rack_slots` counts.
- The pricing step reports `orphans` and samples of missing `catalog.product_code` values.
- The script intentionally does not insert orphan pricing rows because row 7 created a real FK to `catalog.product_code` and RSK-05 requires reporting orphans instead of silently keeping them.
- `--truncate-target` is accepted but warns and does not run destructive truncation.

## DB-STANDARDS checklist for row 13

1. Every new table: already satisfied by rows 6–7; this row only migrates data into the required schema.
2. Every relationship: applied. `catalog` links via real FK IDs and `pricing`/`pricing_history` point to `catalog.product_code` with `ON DELETE CASCADE`. `product_group_items` and `rack_slots` only insert rows whose parent product exists.
3. Search/filter/sort indexes: already created in rows 4–7; the migration script preserves those lookup paths.
4. Never-repeat values: catalog `product_code` is unique, and product-group membership and rack-slot product owners are inserted only when they do not violate existing uniqueness constraints.
5. Multi-table writes: applicable. This data migration performs a sequence of inserts across the target tables and respects the product/pricing relationships. It is intentionally a migration row, not an API write path.
6. Protected API routes: not applicable. No route changes are introduced in this row.
7. Incoming-data validation: applied at the migration boundary. Blank or whitespace product codes are normalized to `NULL` before they are inserted. Orphans are counted and reported instead of silently dropped.
8. Audit log: not applicable to the data copy; the deferred audit-log design remains out of scope for row 13.

## Row 13 orphan handling

The inventory documents 285 pricing codes that do not exist in the current catalog. This script reports those orphan codes and their sample set before any insert. It will not insert pricing rows whose `product_code` has no `catalog` target, because that would violate the row-7 foreign key contract.

## Status

Set row 13 to `Built` after the dry-run and explicit execute pass is reviewed by the user.
