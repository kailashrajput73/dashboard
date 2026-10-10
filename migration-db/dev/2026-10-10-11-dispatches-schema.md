# Row 11 — dispatches schema

## Planned and built

Created PostgreSQL schema for Mongo COL-15 in Alembic revision
`0011_dispatches_schema`, following `0010_reward_ledger_schema`. The schema
contains `dispatches` and normalized `dispatch_lines`; no data migration,
API route, stock update, RFQ status change, or TXN-18 logic was added.

| Mongo field | PostgreSQL field | Notes |
|---|---|---|
| `id` | `dispatches.id` | String primary key. |
| `sourceRfqId` | `source_rfq_id` | Nullable FK to `rfqs.id`, `ON DELETE RESTRICT`. |
| `customerName`, `customerPhone` | `customer_name`, `customer_phone` | Nullable text to preserve Mongo/API optional values. |
| embedded `lines` | `dispatch_lines` | One relational child row per dispatch line. |
| line `productId` | `product_id` | Required FK to `catalog.id`, `ON DELETE RESTRICT`. |
| line `productCode`, `productName` | `product_code`, `product_name` | Required display copies. |
| line `quantity`, `unitPrice` | `quantity`, `unit_price` | Required Float values, matching Mongo numeric values. |
| `createdAt` | `created_at` | Timestamp with timezone and server default. |
| — | timestamps | Both tables include `updated_at` and nullable `deleted_at` as required by DB-STANDARDS. |

`dispatch_lines.dispatch_id` references its parent with `ON DELETE CASCADE`;
line rows are subordinate to the dispatch. The optional source RFQ uses
RESTRICT so RFQ history cannot be physically removed while referenced.

## RSK-10 uniqueness and TXN-18 scope

`dispatches_source_rfq_id_uq` is a PostgreSQL partial unique index on
`source_rfq_id` where it is not null. Thus no two dispatches can reference
the same RFQ, while multiple ad-hoc dispatches with null source IDs remain
valid. This moves RSK-10 protection from the source status check to a
database invariant. The schema does not make inventory changes atomic:
TXN-18's stock decrement, dispatch insert, and RFQ status/history update
remain deferred to row 17. Row 17 must use a single transaction and retain
the unique constraint as a concurrency safeguard.

## Indexes and files

- `dispatches_createdAt` on `created_at DESC` mirrors Mongo's
  `dispatches_createdAt`.
- The partial unique source-RFQ index supports and constrains RFQ lookup.
- `dispatch_lines_dispatch_id` and `dispatch_lines_product_id` index their
  FK columns; `dispatch_lines_product_code` supports product-code lookup.
- ORM models `Dispatch` and `DispatchLine` were added.

Files changed:

- `backend/alembic/versions/0011_dispatches_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The full personal execution record is in the gitignored
`migration-db/exec-log/2026-10-10-11-dispatches-schema.md`.

## Verification — Windows, macOS, and Linux

Use a disposable PostgreSQL database for `TEST_DATABASE_URL`. Alembic loads
`DATABASE_URL` from `backend/.env`; set `TEST_DATABASE_URL` to the disposable
database URL for tests.

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

To list the migrated application tables from PowerShell:

```powershell
.\.venv\Scripts\python.exe -c "from sqlalchemy import create_engine, inspect; from os import environ; print(*inspect(create_engine(environ['TEST_DATABASE_URL'])).get_table_names(), sep='\n')"
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

Expected current revision: `0011_dispatches_schema (head)`. The exact-table
test checks application tables for rows 2–11 and confirms that
`service_requests` (outside this migration scope), future data-migration
scripts, and tables after row 11 are absent. The partial-index test verifies
that duplicate non-null RFQ references fail, multiple null references are
accepted, and dispatch lines cascade when the parent is deleted. Mongo
remains untouched; no TXN-18 behavior was implemented.

## DB-STANDARDS checklist for this row

1. **Primary keys and timestamps — applied.** Both tables have string
   primary keys, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Foreign keys, delete policies, and FK indexes — applied.**
   `dispatches.source_rfq_id` → `rfqs.id` is nullable/RESTRICT;
   `dispatch_lines.dispatch_id` → `dispatches.id` is CASCADE;
   `dispatch_lines.product_id` → `catalog.id` is RESTRICT. All FK columns
   have indexes (the source FK is covered by its unique partial index).
3. **Search/filter/sort indexes — applied.** Dispatch creation time and
   line dispatch/product/product-code lookup paths are indexed.
4. **Never-repeat values — applied.** The partial unique index prevents
   duplicate non-null source RFQ IDs; multiple null ad-hoc values remain
   permitted. Primary keys enforce row identity.
5. **Multi-table transactions — deferred.** No write logic was added.
   TXN-18 is deferred to row 17, where inventory decrement, dispatch
   creation, and optional RFQ state/history update must be atomic.
6. **Protected API routes — not applicable.** No routes were added or
   changed.
7. **Incoming-data validation — not applicable.** No request models or
   API inputs were added.
8. **Audit log — not applicable to schema creation.** Runtime audit log
   behavior remains deferred by the tracker.

## Validation result

`alembic upgrade head` applied revision 0011 and `alembic current` reported
`0011_dispatches_schema (head)`. Compileall passed. All 9 focused
PostgreSQL schema tests passed, including FK/delete policies, the reward
ledger invariant, dispatch uniqueness with null allowance, and child-row
cascade behavior. Full backend unittest discovery passed all 25 tests.
