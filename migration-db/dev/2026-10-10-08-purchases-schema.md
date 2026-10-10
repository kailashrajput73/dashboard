# Row 8 — purchases schema

## Planned and built

Created PostgreSQL schema for Mongo COL-13 only. Alembic revision
`0008_purchases_schema` follows `0007_pricing_schema`; no Mongo documents are
copied and no API routes or multi-table write behavior are added.

| Mongo field | PostgreSQL field | Notes |
|---|---|---|
| `id` | `purchases.id` | String primary key, consistent with earlier schema rows. |
| `createdAt` | `purchases.created_at` | Timestamp with server default; indexed newest first. |
| missing `partnerId` | `purchases.partner_id` | Required FK to `partners.id`, `ON DELETE RESTRICT`; closes RSK-07 for new PostgreSQL records. |
| embedded `lines` | `purchase_lines` | One relational child row per purchase line. |
| line `productId` | `product_id` | Required FK to `catalog.id`, `ON DELETE RESTRICT`. |
| line `productCode`, `productName` | `product_code`, `product_name` | Required display copies. |
| line `quantity`, `listPrice`, `purchaseDiscount` | `quantity`, `list_price`, `purchase_discount` | Float columns, matching the source's numeric values; discount defaults to zero. |
| line `rackId`, `rackSlot` | `rack_id`, `rack_slot` | Nullable rack FK (`ON DELETE RESTRICT`) and nullable slot string. |
| — | timestamps | Each table has `created_at`, `updated_at`, and nullable `deleted_at`. |

`purchase_lines.purchase_id` references `purchases.id` with `ON DELETE
CASCADE`: line rows are subordinate to their purchase. `partner_id` is
`NOT NULL`; future PostgreSQL purchase writes must resolve the real partner
id before inserting. The existing Mongo purchase insert does not write this
field, so it must not be inferred from a name or other copied value.

### Row 14 legacy-data strategy for RSK-07

During row 14, skip and explicitly report every legacy Mongo purchase whose
`partnerId` is missing or cannot resolve to an existing PostgreSQL partner.
Do not invent a partner, use a sentinel, or infer ownership. The migration
report must list the skipped purchase ids/count so the data loss is visible
and can be resolved deliberately. Purchases with a valid `partnerId` can be
imported into the required FK.

## Indexes and files

- `purchases_createdAt` on `purchases.created_at DESC`.
- `purchases_partner_created` on `purchases.partner_id, created_at DESC`;
  this also indexes the partner FK.
- `purchase_lines_purchase_id`, `purchase_lines_product_id`, and
  `purchase_lines_product_code`; the first two index their FK columns.
- Added ORM models `Purchase` and `PurchaseLine`.

Files changed:

- `backend/alembic/versions/0008_purchases_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The execution record is in the gitignored
`migration-db/exec-log/2026-10-10-08-purchases-schema.md`.

## Verification — Windows, macOS, and Linux

Use a disposable PostgreSQL database for `TEST_DATABASE_URL`. `alembic`
loads `DATABASE_URL` from `backend/.env`; for tests, set
`TEST_DATABASE_URL` to the disposable database URL.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "******HOST:5432/DISPOSABLE_DB"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="******HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="******HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

Expected revision is `0008_purchases_schema (head)`. The schema contains
the row-2–8 tables plus `alembic_version`; neither `rfqs` nor any row-9+
table should exist yet. Mongo remains untouched; no API or TXN-16 changes
were made.

## DB-STANDARDS checklist for this row

1. **Primary keys and timestamps — applied.** Both tables have string
   primary keys, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Foreign keys, delete policies, and FK indexes — applied.**
   `purchases.partner_id` → `partners.id` is `NOT NULL`/`RESTRICT`;
   `purchase_lines.purchase_id` → `purchases.id` is `CASCADE`;
   `purchase_lines.product_id` → `catalog.id` and nullable `rack_id` →
   `racks.id` are `RESTRICT`. Each FK has an index.
3. **Search/filter/sort indexes — applied.** Purchase creation time,
   partner/time, and line purchase/product/product-code lookup indexes are
   defined.
4. **Never-repeat constraints — not applicable beyond primary keys.**
   The inventory defines no additional unique values for these tables.
5. **Multi-table transactions — no write path added.** TXN-16 is deferred
   to row 15; stock and purchase writes must be one transaction there.
6. **Protected API routes — not applicable.** No routes were added or
   changed.
7. **Incoming-data validation — not applicable.** No request models or API
   inputs were added.
8. **Audit log — not applicable to schema creation.** Runtime audit logging
   remains deferred by the tracker.

## Validation result

`alembic upgrade head` completed and `alembic current` reported
`0008_purchases_schema (head)`. The focused PostgreSQL schema suite passed:
5 tests, including exact table set, FK/delete-policy/index checks, and
required/nullable column checks. `python -m compileall -q app tests
alembic/versions` also passed. Full backend unittest discovery is deferred
until row 9 is built so the final verification covers the requested head.
