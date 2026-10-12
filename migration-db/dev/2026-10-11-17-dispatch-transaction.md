# Row 17 — dispatch creation transaction

## Planned and built

Implemented the TXN-18 Postgres service operation for Mongo COL-15
`dispatches`, normalized to `dispatches` and `dispatch_lines`. It decrements
COL-08 / `catalog.stock`, writes the dispatch and its lines, and, when a
source RFQ is supplied, changes COL-14 / `rfqs.status` to `dispatched` and
appends the matching `dispatched` history event in one transaction.

`create_dispatch(session, ...)` is in
`backend/app/services/dispatch_service.py`. Product lookup uses the catalog
product code, and line inputs require a positive quantity. The service checks
current stock before writing, then decrements with a conditional SQL update
(`stock >= quantity`). If stock changes after validation, it raises a 409
service error with Mongo's `"Stock changed; please retry dispatch"` message.
Known insufficient stock produces the Mongo-style 400 validation envelope.

The source RFQ is locked and must be approved. A previously dispatched RFQ
is rejected before stock changes. In addition, row 11's partial unique
`dispatches_source_rfq_id_uq` index remains the database-level safeguard;
its violation is reported as a 409 service conflict. The service does not add
an HTTP route; row 20 owns HTTP wiring and status-code conversion.

## PostgreSQL seed and tests

The focused tests create and roll back their own minimal PostgreSQL fixtures:
a partner, category, catalog products, and an approved RFQ. No Mongo data is
read or copied. For manual service testing, the equivalent minimal seed is:

```sql
BEGIN;
INSERT INTO partners (id, name) VALUES ('partner-id', 'TXN17 partner');
INSERT INTO categories (id, name) VALUES ('category-id', 'TXN17 category');
INSERT INTO catalog
    (id, name, product_name, category_id, category, unit, standard_rate,
     product_code, stock)
VALUES
    ('product-id', 'TXN17 product', 'TXN17 product', 'category-id',
     'TXN17 category', 'each', 12.5, 'TXN17-001', 10);
INSERT INTO rfqs
    (id, partner_id, status, grand_total, special_discount_percent,
     reward_points, delivery_mode)
VALUES
    ('rfq-id', 'partner-id', 'approved', 0, 0, 0, 'storePickup');
COMMIT;
```

Use a disposable PostgreSQL database, not production data. Ensure
`backend/.env`'s `DATABASE_URL` points to that disposable database before
applying the migrations, and set `TEST_DATABASE_URL` to the same database
for the test run.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_dispatch_service.py" -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/python -m unittest discover -s tests -p "test_dispatch_service.py" -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/python -m unittest discover -s tests -p "test_dispatch_service.py" -v
```

The four database tests cover successful dispatch plus RFQ history, known
insufficient stock, duplicate RFQ source, and a trigger-forced mid-operation
line insert failure that verifies stock, dispatch rows, and RFQ state all roll
back. The input test rejects non-positive quantities.

## Files changed

- `backend/app/services/dispatch_service.py`
- `backend/tests/test_dispatch_service.py`
- `migration-db/DB-STATUS.md`
- This development note

No migration or public API route was added. `backend_refactor/` is unchanged.
Data-copy rows 12–14 are not run or advanced; no Mongo source was used.

## DB-STANDARDS checklist

1. **Primary keys, timestamps, and soft-delete columns — applied via the
   existing schema.** This row adds no table. `dispatches`, `dispatch_lines`,
   `catalog`, and `rfqs` already have primary keys, `created_at`,
   `updated_at`, and `deleted_at`.
2. **Foreign keys, delete policies, and FK indexes — applied via row 11 and
   existing schemas.** The service persists `product_id` and `source_rfq_id`
   as the existing id references. Existing restrictive parent references
   and child cascade policy are unchanged; FK indexes are already present.
3. **Indexes for searched/filtered/sorted columns — applied via existing
   indexes.** Product-code lookup uses the unique catalog product-code
   index; RFQ lookup uses its primary key; source-RFQ dispatch lookup is
   covered by row 11's partial unique index. Stock updates use the catalog
   primary key.
4. **Uniqueness — applied.** Row 11's partial unique constraint on non-null
   `dispatches.source_rfq_id` is preserved and translated to a 409 service
   conflict. Duplicate detection occurs before stock changes as well.
5. **Multi-table transaction — applied.** Stock decrement, dispatch/line
   inserts, RFQ status, and RFQ history all use one `session.begin()`; any
   error rolls the whole operation back.
6. **API authentication and authorization — not applicable.** This row adds
   no API route. HTTP/auth wiring remains outside scope.
7. **Incoming-data validation — applied at the service input boundary.**
   `DispatchLineInput` is Pydantic-validated and requires a non-empty product
   code and positive quantity; product existence and stock are checked before
   writes. No route is added here.
8. **Audit log — not applicable to this row.** No shared audit-log facility
   exists in the migration scope; the existing RFQ domain history is appended
   as Mongo does. The generic audit-log requirement remains deferred.

## Drift check

No inventory drift was found in the requested dispatch scope. The baseline
inventory's 76 routes plus the supplement's five service-request routes match
the 81 Mongo router decorators. The supplement still documents 19 collections
and 57 index definitions; no new collection, field, route, or TXN-18 behavior
was found in the inspected Mongo dispatch code.
