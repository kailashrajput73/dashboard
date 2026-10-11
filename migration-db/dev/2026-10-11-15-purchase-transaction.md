# Row 15 — purchase create transaction

## Planned and built

Implemented TXN-16 in `backend/app/services/purchase_service.py`. Purchase
creation now runs partner validation, purchase and line inserts, catalog
stock/last-purchase updates, and optional rack-slot/catalog location updates
inside one SQLAlchemy `session.begin()` boundary. Any exception inside that
boundary rolls back all of those writes.

The service requires an existing, non-deleted `partner_id`; blank or unknown
partner ids are rejected before writes. Purchase and line records use the
existing row-8 schema. Catalog stock and last purchase values use the row-6
columns. Rack locations use the normalized `rack_slots` table and catalog
rack columns from rows 5 and 6. Because row 5 has a unique index for assigned
products, a product's former slot assignment is cleared before its new slot
is set, in the same transaction.

The successful response remains the Mongo create response shape:
`{success, data: {id, lines, createdAt}, error}`. Each line contains the
request line fields plus `productId` and `productName`. No public route was
mounted; row 20 owns route wiring. Its caller must supply the required
`partner_id` to this internal service without changing the API contract.

Mongo collections represented: COL-13 `purchases` (now `purchases` and
`purchase_lines`), COL-08 `catalog`, and COL-12 rack slots (`rack_slots`).
No rows 12–14 data-copy scripts were run and no Mongo connection or data is
needed. The tests seed their own partner, category prerequisite, catalog
products, and optional rack/slot in a PostgreSQL transaction, then roll back
the fixture. The category is needed because the existing catalog schema has
a required category foreign key.

## Files changed

- `backend/app/services/__init__.py`
- `backend/app/services/purchase_service.py`
- `backend/tests/test_purchase_service.py`
- `migration-db/DB-STATUS.md`
- This development note

An untracked, gitignored personal execution log is at
`migration-db/exec-log/2026-10-11-15-purchase-transaction.md`.

## How to test

Use a disposable PostgreSQL database migrated to Alembic head (`0011`).
Set `TEST_DATABASE_URL` to that database. The test fixture seeds only the
minimum partner/category/catalog data, plus a rack and slot for the rack
assignment case, and rolls everything back. No Mongo copy is required.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "<disposable-postgresql-url>"
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_purchase_service.py' -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="<disposable-postgresql-url>"
.venv/bin/python -m unittest discover -s tests -p 'test_purchase_service.py' -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="<disposable-postgresql-url>"
.venv/bin/python -m unittest discover -s tests -p 'test_purchase_service.py' -v
```

Tests cover a successful purchase, required partner enforcement, and a
PostgreSQL trigger that deliberately fails on a later line's stock update.
The failure test verifies that the earlier stock increment, purchase row,
and purchase lines are all absent after rollback.

## DB-STANDARDS checklist

1. **Primary keys and timestamps — applied using existing tables.** No new
   tables were added. `purchases`, `purchase_lines`, `catalog`, and
   `rack_slots` already have primary keys, `created_at`, `updated_at`, and
   nullable `deleted_at`.
2. **Foreign keys, delete policies, and FK indexes — applied using existing
   schema.** No relationships or constraints changed. The service inserts
   `partner_id`, `purchase_id`, `product_id`, and optional `rack_id` against
   the existing id-based foreign keys and uses the row-5 rack-slot FK.
   Existing indexes remain in place.
3. **Search/filter/sort indexes — applied using existing schema.** This row
   adds no searchable columns; existing purchase, line, catalog, and rack
   indexes remain in place.
4. **Unique constraints — applied using existing schema.** No uniqueness
   rules changed. The existing unique rack-slot product index is respected
   by clearing a product's old slot before assigning the new one.
5. **Multi-table transaction — applied.** The complete create operation,
   including all line rows and stock/rack/catalog updates, is inside one
   `session.begin()`; exceptions propagate and roll back.
6. **Authentication and authorization — not applicable.** This row adds no
   API route. Authentication/authorization are owned by the future route
   row and existing auth dependencies.
7. **Incoming-data validation — applied at the service boundary.** The
   service takes the existing purchase-line fields as a Pydantic model,
   checks partner presence/existence, product codes, positive quantity,
   non-negative prices/discounts, and rack locations before writes.
8. **Audit log — not applicable to this row.** The project tracker defers a
   generic audit log; this change does not add one.

## Left

Row 20 must wire route inputs to this internal service and provide the
required partner id. Row 21 owns side-by-side route verification. Mongo code
remains unchanged.

## Validation result

`compileall` passed. The focused unittest run passed its Pydantic input
validation test; its three PostgreSQL integration tests were skipped because
`TEST_DATABASE_URL` was not set in this environment. No application database
URL was read or used, so the transaction and rollback tests still need to be
run against a disposable PostgreSQL database at Alembic head.
