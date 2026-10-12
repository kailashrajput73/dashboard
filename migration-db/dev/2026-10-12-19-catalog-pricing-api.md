# Row 19 — PostgreSQL catalog, pricing, and imports API

**Status:** Built; user verification remains.

## Scope and behavior

Mounted the PostgreSQL catalog API under `/api`:

- `GET /catalog`, `GET /catalog/tree`
- `POST /catalog`, `PUT /catalog/{item_id}`
- `PATCH /catalog/{item_id}/pricing`, `POST /catalog/pricing-bulk`
- `DELETE /catalog/{item_id}`, `POST /catalog/{item_id}/delete-secured`
- `POST /catalog/purge-by-field`, `DELETE /catalog`, `POST /catalog/wipe-all`
- `POST /catalog/import`, `/catalog/import/master`,
  `/catalog/import/pricing`, and `/catalog/import/stock`

Authenticated routes use the row-0c admin Bearer dependency. Read routes allow
the existing catalog-reader team roles; writes require the `admin` role.
The three passcode-body routes retain their Mongo request-body passcode check
and do not require a Bearer token. Catalog validation errors return the
`{success, data, error}` envelope.

Create/update operations, current pricing plus history writes, bulk pricing,
all three import flows, GET-side taxonomy repair, and full-tree reset run
atomically in PostgreSQL transactions. Product taxonomy names are resolved
to the existing FK columns. Imports update the existing product-group join
table and its count because the Mongo import paths create/update group
membership; product-group and rack APIs remain out of scope. Full-tree reset
also clears occupied rack slots.

Master/pricing/stock imports receive parsed JSON rows as in the Mongo API;
the API does not accept multipart file uploads. Pricing imports skip unknown
product codes and report the count; they never create catalog rows for orphan
codes (RSK-05). The master import preserves stock and existing pricing for an
already-present product code, and only appends pricing history/current pricing
for newly created products, matching the Mongo path.

Catalog deletion and reset use the existing `deleted_at` columns rather than
physically deleting important rows, following DB-STANDARDS. This is an
intentional storage-level difference from Mongo. The API hides soft-deleted
catalog/taxonomy/pricing/group rows; individual product deletion leaves
current pricing and pricing history present, consistent with the Mongo
single-product delete. The full-tree reset soft-deletes both pricing tables
and clears rack occupancy. Existing unique product codes remain reserved;
imports reactivate a matching soft-deleted product.

Money config was not needed by catalog/pricing routes and remains deferred.
Product-group/rack CRUD and the other row-20 routes were not mounted.
No Mongo data was copied.

## Schema/index changes

Added Alembic revision `0013_catalog_api_indexes` (24 characters, within
Alembic's 32-character limit), following `0012_auth_taxonomy_api`. It enables
`pg_trgm` and adds indexes for the catalog filters/tree/search fields,
category active sorting, group lookups, and soft-delete membership lookups.
The two redundant single-column product-group membership indexes were
replaced by composite indexes including `deleted_at`. No tables or foreign
keys were added; the existing catalog, pricing, taxonomy, group, and rack-slot
schema is reused.

## Files

- `backend/app/schemas/catalog.py`
- `backend/app/services/catalog_service.py`
- `backend/app/routers/catalog.py`
- `backend/app/main.py`
- `backend/app/models/__init__.py`
- `backend/alembic/versions/0013_catalog_api_indexes.py`
- `backend/tests/test_catalog_api.py`
- `backend/README.md`
- `migration-db/DB-STATUS.md` (row 19 only)

## Verification and testing

Offline Alembic SQL generation through `head` succeeded with a non-connecting
placeholder URL. Importing `app.main` and compiling the PostgreSQL GIN index
DDL succeeded. Pylance reported no issues for the changed Python files.
The focused `test_catalog_api.py` run discovered six PostgreSQL integration
tests, but all were skipped because `TEST_DATABASE_URL` is not configured in
this environment. Apply the migration and run these tests against a
disposable PostgreSQL database before user verification.

The tests cover master import and category/brand/type/subcategory/group links,
catalog listing, pricing/current-history writes, pricing and stock imports,
orphan pricing, role restrictions, validation envelopes, and transaction
rollback after an injected mid-import failure.

The master import accepts the parsed JSON shape below. The spreadsheet headers
remain the master/pricing/stock templates in
`web/src/utils/import-templates.ts` (read-only).

```json
{
  "items": [
    {
      "name": "UPVC Pipe",
      "category": "Pipes",
      "type": "UPVC",
      "productClass": "Sch 40",
      "subcategory": "Drainage",
      "brand": "Acme",
      "productCode": "ACME-UPVC-SCH40-25",
      "mrp": 100,
      "discount": 10,
      "sizeMm": 25
    }
  ]
}
```

Apply migrations and run the focused tests from `backend/` using the
disposable URL in `TEST_DATABASE_URL`:

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

To compare with Mongo, run the Mongo mirror on port 8000 and the PostgreSQL
API on port 8001. Register/login an admin separately on each backend and use
each server's returned token for the same admin-protected requests. No web or
frontend proxy was changed.

## DB-STANDARDS checklist

1. **Primary key, timestamps, and soft delete — applied through existing
   tables.** No table was added. Catalog, pricing/history, taxonomy, group,
   and rack-slot rows already have primary keys/timestamps/deleted_at. Delete
   and wipe flows use deleted_at; no hard delete was introduced.
2. **Foreign keys, delete behavior, and FK indexes — applied through existing
   relationships.** Catalog taxonomy fields use the existing id-based
   category, brand, type, and subcategory FKs; product-group membership uses
   `product_group_items`; pricing references `catalog.product_code`; rack
   occupancy uses `rack_slots.product_id`. Existing FK delete actions remain
   unchanged. Composite group-membership indexes now include `deleted_at`.
3. **Indexes on searchable/filterable/sortable columns — applied.** Reused
   existing catalog indexes for category/name, type, brand, group, subcategory,
   class, size, stock, and product code; revision 0013 adds trigram indexes
   for substring search (including aliases), case-insensitive filter indexes,
   tree/active indexes, and group/deleted lookup indexes.
4. **Database uniqueness — applied through existing constraints.** Existing
   unique constraints/indexes protect catalog product codes, pricing product
   codes, taxonomy names, and product-group names; services translate known
   duplicate constraints into a 409 envelope.
5. **Multi-table writes — applied.** Catalog/taxonomy creation, product-group
   membership changes, catalog/pricing/history writes, imports, tree repair,
   and full-tree reset each run in one SQLAlchemy transaction. A rollback test
   injects a failure after product/taxonomy writes.
6. **Authentication and authorization — applied.** Admin Bearer auth is
   applied to the documented admin/team routes. Catalog readers retain
   catalog-read access; mutations require the `admin` role. The three
   VAL-52 passcode-body routes preserve their body passcode check.
7. **Request validation — applied.** Pydantic schemas validate all catalog,
   pricing, and import payloads, sizes, category mode, and field names.
   Catalog-path validation failures are returned in the standard envelope.
8. **Audit log — deferred by project rule.** `migration-db/DB-STATUS.md`
   explicitly defers the generic audit-log system until after the migration;
   this row adds no audit table or out-of-scope audit framework.
