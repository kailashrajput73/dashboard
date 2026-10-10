# Row 7 — pricing schema

## Planned and built

Create PostgreSQL tables for Mongo COL-17 and COL-18 without copying Mongo
documents or adding API routes. Alembic revision `0007_pricing_schema`
follows `0006_catalog_schema`.

| Mongo collection | PostgreSQL table | Mapping and behavior |
|---|---|---|
| `pricing` | `pricing` | One current row per non-null `product_code`. `productCode` → `product_code`; `mrp`, `sellingPrice`, `purchasePrice`, `discount` map to their snake_case fields; `updatedAt` → `updated_at`. A generated string UUID `id`, `created_at`, `updated_at`, and nullable `deleted_at` are present to meet DB-STANDARDS. `product_code` is unique and references `catalog.product_code` with `ON DELETE CASCADE`. |
| `pricing_history` | `pricing_history` | One append-only-by-convention row per pricing upsert, with the same four price fields and product-code relation. The source `updatedAt` maps to `updated_at`; when row 13 copies history, use that source timestamp for both `created_at` and `updated_at` because Mongo provides no separate creation timestamp. The new table has a generated string UUID `id` and nullable `deleted_at`. `product_code` references `catalog.product_code` with `ON DELETE CASCADE`; `(product_code, updated_at DESC)` supports lookup of a product's latest history. |

The `catalog.product_code` target is a nullable, non-partial unique constraint
from row 6, so it can serve as the FK target. PostgreSQL permits multiple
`NULL` values in this unique constraint. Whether Mongo contains empty-string
product codes is unknown; row 13 should normalize absent or blank product
codes to `NULL` before inserting catalog rows.

## Orphan pricing codes and delete behavior

- The inventory records 333 distinct pricing codes, 48 catalog product codes,
  and 285 pricing codes absent from the current catalog. The strict FK means
  those unmatched pricing rows and associated unmatched history rows cannot
  be inserted. Row 13 must copy catalog first, insert only matching pricing
  and history rows, and report skipped rows and unmatched codes explicitly;
  it must not silently discard them. The number of orphan history rows is
  not established by the inventory and remains unknown.
- Both pricing tables use `ON DELETE CASCADE` from `catalog.product_code`, as
  required by the tracker. This matches the full-tree wipe's intent to remove
  catalog and pricing data together. Mongo's single-product delete currently
  leaves COL-17 and COL-18 behind, so physical catalog deletion in PostgreSQL
  will differ by cascading those rows. Soft-deleting a catalog row does not
  trigger FK cascades. Future route work must preserve or deliberately
  reconcile this documented difference.
- Mongo upsert writes one history row and then upserts current pricing. This
  row only creates schema; the future write path must make those multi-table
  writes one transaction (TXN-21 behavior).
- `pricing_history` is append-only by application convention, not enforced
  by a trigger. Its timestamps and nullable `deleted_at` remain present to
  satisfy the permanent table standard.

## Files touched

- `backend/alembic/versions/0007_pricing_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The full personal execution record is in
`migration-db/exec-log/2026-10-10-07-pricing-schema.md`; the execution-log
directory is gitignored.

## Verification — Windows, macOS, and Linux

Use a disposable PostgreSQL database for `TEST_DATABASE_URL`. Alembic reads
the configured `DATABASE_URL` from `backend/.env`; the schema test upgrades
the test database and verifies that it contains exactly the expected tables
through row 7.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

Expected current revision: `0007_pricing_schema (head)`. Expected application
tables are the row-2–7 tables plus `alembic_version`; no row-8+ tables should
exist. This is schema-only work: Mongo remains untouched, no data is copied,
and no API behavior changes in this row.

## DB-STANDARDS checklist for this row

1. **Every new table — applied.** `pricing` and `pricing_history` each have
   a primary key, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Every relationship — applied.** Both `product_code` fields have real
   FKs to the unique `catalog.product_code`, with `ON DELETE CASCADE`.
   The pricing unique index and the history composite index beginning with
   `product_code` index the FK columns.
3. **Search/filter/sort indexes — applied.** `pricing.product_code` is
   unique/indexed; `pricing_history` has the `(product_code, updated_at
   DESC)` index used for latest-history lookup.
4. **Never-repeat values — applied.** `pricing.product_code` has a
   database-level unique constraint. `pricing_history.product_code` repeats
   by design because it stores multiple events per product.
5. **Multi-table writes — not applicable to this schema-only row.** No
   application write path was added. The future pricing upsert must write
   history and current pricing in one transaction (TXN-21).
6. **Protected API routes — not applicable.** No routes were added or
   changed.
7. **Incoming-data validation — not applicable.** No request models or
   payload processing were added.
8. **Audit log — not applicable to schema creation;** runtime write-audit
   behavior remains deferred by the migration tracker.

## Validation result

`alembic upgrade head` completed and `alembic current` reported
`0007_pricing_schema (head)`. All five focused PostgreSQL schema tests passed,
including exact table set, FK/delete-policy, unique/index, and product-code
cascade assertions. The full backend unittest suite passed: 21 tests.
