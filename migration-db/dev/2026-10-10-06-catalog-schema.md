# Row 6 — catalog schema

## Planned and built

Create the PostgreSQL `catalog` schema for Mongo COL-08 without copying any
Mongo data or adding API routes. Alembic revision `0006_catalog_schema`
follows `0005_racks_schema`.

The schema keeps the Mongo string `id` as the primary key, uses snake_case
column names, and represents taxonomy/rack links using real foreign keys.
Display strings are retained only where they are useful for parity; no
`product_group_ids` array is stored on `catalog`.

## Mongo-to-PostgreSQL column map

| Mongo COL-08 field | PostgreSQL `catalog` field | Notes |
|---|---|---|
| `id` | `id` | String UUID primary key; PostgreSQL generates a string UUID when omitted. |
| `name` | `name` | Required product name. |
| `productName` | `product_name` | Required display/product name; current create/import paths fall back to `name`. |
| `category` | `category`, `category_id` | `category` is a required display copy; `category_id` is the required FK to `categories.id`. The source create model requires category and import paths resolve a category name. |
| `unit` | `unit` | Required unit text. |
| `standardRate` | `standard_rate` | Required float rate. |
| `mrp` | `mrp` | Nullable float. |
| `sellingPrice` | `selling_price` | Nullable float. |
| `purchasePrice` | `purchase_price` | Nullable float. |
| `discount` | `discount` | Nullable float. |
| `stock` | `stock` | Float; defaults to zero as in the create path. |
| `brandId`, `brand` | `brand_id`, `brand` | Nullable FK to `brands.id` plus optional display copy. |
| `productCode` | `product_code` | Nullable text and a database `UNIQUE` constraint. Multiple `NULL` values are allowed. This non-partial unique key is also required so row 7 can reference it with a real FK. Whether source documents contain empty-string codes is unknown; row 13 must normalize missing/blank codes to `NULL` before loading. |
| `qrCode` | `qr_code` | Nullable display/scan code; Mongo currently copies `productCode`. |
| `type` | `type_name`, `product_type_id` | Optional legacy display name plus nullable FK to `product_types.id`; row 13 resolves the name to an id. |
| `productClass` | `product_class` | Nullable classification text. |
| `productGroup` | `product_group` | Optional display-only name. |
| `productGroupIds` | — | Not duplicated on `catalog`; `product_group_items` is the only membership relation. |
| `subcategoryId`, `subcategory` | `subcategory_id`, `subcategory` | Nullable FK to `subcategories.id` plus optional display copy. |
| `size`, `sizeMm`, `sizeCm`, `sizeInch`, `length` | `size`, `size_mm`, `size_cm`, `size_inch`, `length` | Nullable product size fields. |
| `aliases` | `aliases` | Non-null JSONB array; defaults to `[]`. |
| `multilingualNames` | `multilingual_names` | Non-null JSONB object; defaults to `{}`. |
| `displaySequence` | `display_sequence` | Integer; defaults to zero. |
| `reorderLevel` | `reorder_level` | Float; defaults to zero. |
| `regularDiscount` | `regular_discount` | Float; defaults to zero. |
| `imageUrl`, `imageName` | `image_url`, `image_name` | Nullable text fields. |
| `stdPkg`, `mrpPkg` | `std_pkg`, `mrp_pkg` | Nullable floats; includes master-import fields. |
| `hsnCode`, `gstRate` | `hsn_code`, `gst_rate` | Nullable text/float; includes master-import fields. |
| `lastPurchasePrice`, `lastPurchaseDiscount` | `last_purchase_price`, `last_purchase_discount` | Nullable floats written by purchase flows. |
| `rackId`, `rackName`, `rackSlot` | `rack_id`, `rack_name`, `rack_slot` | Nullable rack FK to `racks.id`, optional display copy, and optional slot code. `rack_slot` remains a string; occupancy is represented in `rack_slots`. |
| `isActive` | `is_active` | Boolean; defaults to true. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | `timestamptz`, defaulting to `now()`. |
| — | `deleted_at` | Nullable timestamp required by DB-STANDARDS. |

## Relationships, delete decisions, and indexes

- `catalog.category_id` → `categories.id` (`NOT NULL`, `ON DELETE RESTRICT`).
- `catalog.subcategory_id` → `subcategories.id` (`NULL`, `ON DELETE RESTRICT`).
- `catalog.brand_id` → `brands.id` (`NULL`, `ON DELETE RESTRICT`).
- `catalog.product_type_id` → `product_types.id` (`NULL`, `ON DELETE RESTRICT`).
- `catalog.rack_id` → `racks.id` (`NULL`, `ON DELETE RESTRICT`).
- `product_group_items.product_id` → `catalog.id` (`ON DELETE CASCADE`): membership rows are subordinate to a product.
- `rack_slots.product_id` → `catalog.id` (`NULL`, `ON DELETE SET NULL`): removing a product leaves the rack slot available.
- Each FK column is indexed; the group and rack-slot product-id indexes were created in rows 4–5 and now support the added catalog FKs.
- The catalog also indexes category/name ordering, brand, rack/name, type name, product group display name, subcategory, product class, size, name, and stock/reorder paths found in `ensure_indexes`. `product_code` is unique and therefore indexed for lookup.
- The sparse Mongo product-code index cannot be copied as a partial PostgreSQL index because PostgreSQL FKs cannot target a partial unique index. A normal nullable `UNIQUE(product_code)` allows multiple `NULL`s and is a valid row-7 FK target. Row 13 should normalize absent or blank codes to `NULL`.

## Files touched

- `backend/alembic/versions/0006_catalog_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The full personal execution record is in
`migration-db/exec-log/2026-10-10-06-catalog-schema.md`; the execution-log
directory is gitignored.

## Verification — Windows, macOS, and Linux

Use a disposable PostgreSQL database for `TEST_DATABASE_URL`. Alembic reads
the configured `DATABASE_URL` from `backend/.env`; the schema test upgrades
the test database and verifies that it contains exactly the expected tables
through row 6.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
```

Expected current revision: `0006_catalog_schema (head)`. Expected application
tables are the row-2–6 tables plus `alembic_version`; no row-7+ tables should
exist at this row. This is schema-only work: the Mongo API remains untouched,
and no data copy or side-by-side API change occurs in this row.

## DB-STANDARDS checklist for this row

1. **Every new table — applied.** `catalog` has a primary key,
   `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Every relationship — applied.** Taxonomy and rack links are real id
   FKs with explicit `RESTRICT` policies and indexes. Product-group membership
   cascades when its catalog product is deleted; a rack slot is retained and
   its product reference is set to `NULL`.
3. **Search/filter/sort indexes — applied.** FK columns and the catalog
   search, filter, and sort paths documented above are indexed.
4. **Never-repeat values — applied.** `id` is the primary key and
   `product_code` has a database-level unique constraint.
5. **Multi-table writes — not applicable to this schema-only row.** No
   application writes or routes were added.
6. **Protected API routes — not applicable.** No routes were added or
   changed.
7. **Incoming-data validation — not applicable.** No request models or
   payload processing were added.
8. **Audit log — not applicable to schema creation;** runtime write-audit
   behavior remains deferred by the migration tracker.

## Validation result

The row-6 migration upgraded the local database to
`0006_catalog_schema (head)`. The focused PostgreSQL schema tests passed,
including exact table-set, FK/delete-policy, uniqueness/index, and catalog
membership/rack-slot behavior assertions.
