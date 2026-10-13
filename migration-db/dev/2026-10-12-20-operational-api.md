# Row 20 — operational API

## Planned

Implement the PostgreSQL-backed counterparts for RTE-38–51: purchases,
RFQs and reward reads, dispatches, and inventory. Keep the Mongo implementation
in `backend_refactor/` unchanged and preserve the `/api` paths, methods,
payload fields, result fields, and `{success, data, error}` envelope. Reuse
the existing row-15, row-16, and row-17 transaction services for purchase
creation, RFQ approval, and dispatch creation.

## Built

- Added the purchases/RFQ and dispatch/inventory routers and mounted them on
  the FastAPI app. All operational routes use the existing shared admin
  authentication dependency.
- Added typed request schemas, service-side RFQ CRUD and read operations,
  purchase/dispatch list reads, reward ledger reads, inventory views, and the
  combined purchases/dispatches transaction feed.
- `POST /purchases` and `/purchases/import` share the row-15 transaction
  service. They require `partnerId`; a missing or unknown partner is rejected.
- `POST /rfqs/{rfq_id}/approve` calls the existing row-16 transaction service.
  RFQ create/update write the RFQ and its line rows in one transaction. Updates
  soft-delete replaced lines and append the same history event shape as the
  Mongo service; approval reads only active RFQ lines.
- `POST /dispatches` calls the existing row-17 transaction service. The
  database uniqueness constraint still rejects a second dispatch for one RFQ.
- Validation failures from the row-20 API return the standard envelope.
- Added Alembic revision `0014_operational_api_indexes` for substring search,
  ordered line reads, and soft-delete filters. No tables or data-copy work
  were added.
- Added TestClient coverage for transactional purchase/import stock changes,
  required partner validation, RFQ CRUD/search/history and reward ledger
  reads, duplicate dispatch rejection, and inventory endpoints.

## Mongo → PostgreSQL mapping

| Mongo collection(s) | PostgreSQL table(s) |
|---|---|
| `purchases` embedded line documents | `purchases`, `purchase_lines` |
| `rfqs` embedded line documents/history | `rfqs`, `rfq_lines`; `history` remains JSONB |
| `reward_ledger` | `reward_ledger` |
| `dispatches` embedded line documents | `dispatches`, `dispatch_lines` |
| `catalog` inventory data | existing `catalog` table |

Transaction coverage: TXN-16, TXN-17, and TXN-18 are invoked through their
existing services. RFQ create/update also use a database transaction because
their normalized representation spans the RFQ and RFQ-line tables.

## DB-STANDARDS checklist

1. **New table primary keys/timestamps/soft deletes — not applicable.** This
   row adds no tables. Existing purchase, RFQ, reward, dispatch, line, and
   catalog tables already have primary keys and timestamp/soft-delete fields.
2. **Relationships — handled by existing schema.** No FK was added or changed.
   The existing purchase, RFQ, reward, dispatch, and line relationships use
   actual ids and their row-8 through row-11 FK delete policies. Existing FK
   indexes remain in place.
3. **Search/filter/sort indexes — handled.** Existing indexes cover partner,
   status, creation time, product code, relationship reads, inventory sort,
   and stock/reorder filters. The new revision adds trigram indexes for the
   RFQ substring search, ordered RFQ/purchase/dispatch line indexes, and
   `deleted_at` indexes for soft-delete-filtered operational reads.
4. **Unique constraints — handled by existing schema.** No new uniqueness
   rule was needed. The existing unique product code, one-live-earned-ledger
   per RFQ, and unique dispatch source RFQ constraints are retained.
5. **Multi-table writes — handled.** Purchase stock and purchase writes reuse
   TXN-16; RFQ status and reward-ledger writes reuse TXN-17; dispatch stock,
   dispatch, and RFQ writes reuse TXN-18. RFQ create/update group parent and
   line writes in a single transaction.
6. **Authentication/authorization — handled using the existing admin
   dependency.** Every row-20 route requires an authenticated admin principal
   through the shared token-checking dependency.
7. **Incoming data validation — handled.** New Pydantic request schemas
   validate each body. Purchase, RFQ, and dispatch domain checks preserve the
   mirror-equivalent validation envelopes/statuses; malformed API inputs use
   the standard validation envelope.
8. **Audit logging — partially handled; generic audit logging remains
   deferred.** RFQ create/update/approval/dispatch continue to append history
   events; purchase and dispatch operations persist their business records.
   Actor-attributed generic audit records are not introduced because the
   migration tracker explicitly defers the generic audit log.

## Validation and test instructions

`TEST_DATABASE_URL` was not configured during this build. The new PostgreSQL
TestClient cases and existing migration/transaction integration tests were
therefore skipped; run them only against a disposable PostgreSQL database
after applying Alembic head.

Use a fresh, empty disposable PostgreSQL database for the migration test. It
upgrades that database to head; then run the TestClient tests against the same
database. If you already have a disposable database at head, skip the schema
migration test and run `alembic upgrade head` before the TestClient tests.
Set both `DATABASE_URL` and `TEST_DATABASE_URL` to the disposable test database.

**Windows PowerShell**

```powershell
cd backend
$env:DATABASE_URL = "postgresql+psycopg://<user>:<password>@127.0.0.1:5432/<disposable_db>"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_operational_api.py' -v
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

**macOS**

```bash
cd backend
export DATABASE_URL="postgresql+psycopg://<user>:<password>@127.0.0.1:5432/<disposable_db>"
export TEST_DATABASE_URL="$DATABASE_URL"
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -p 'test_operational_api.py' -v
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

**Linux**

```bash
cd backend
export DATABASE_URL="postgresql+psycopg://<user>:<password>@127.0.0.1:5432/<disposable_db>"
export TEST_DATABASE_URL="$DATABASE_URL"
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -p 'test_operational_api.py' -v
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Compare the resulting routes against the Mongo server using matching test
partner, catalog, RFQ, and stock records. The PostgreSQL server listens on
port **8001** for all three operating systems.

## Left

- Apply revision `0014_operational_api_indexes` to the disposable PostgreSQL
  test database, then run the TestClient and migration tests above.
- Perform the requested side-by-side route checks before marking this row
  Done. No later migration row is included here.
