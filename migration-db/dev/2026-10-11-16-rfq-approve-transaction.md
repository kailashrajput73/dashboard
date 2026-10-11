# Row 16 — RFQ approval transaction

## Planned and built

Implemented TXN-17 in `backend/app/services/rfq_service.py`. RFQ approval
locks and reads the RFQ, calculates the discounted total and reward points
from its normalized lines, updates the RFQ fields and history, and conditionally
inserts one `earned` reward-ledger row inside one SQLAlchemy transaction.
If any write fails, the RFQ update and ledger insert roll back together.

Approval serializes repeated calls by locking the RFQ row. It checks for an
existing non-deleted `earned` ledger entry before inserting, matching Mongo's
no-second-earned behavior and the row-10 partial unique index. Rejection
updates the RFQ without writing to the ledger. Missing RFQs and RFQs already
dispatched or cancelled raise errors carrying the corresponding 404/409 status
and the Mongo `{success, data, error}` failure envelope.

The success response uses the Mongo envelope and RFQ field names. There is no
HTTP route in this row; row 20 owns route wiring. No Mongo data copy or Mongo
connection is required. The tests create a partner, the required catalog
prerequisites, one RFQ and one line directly in PostgreSQL, then roll back the
outer fixture transaction.

## Files changed

- `backend/app/services/rfq_service.py`
- `backend/tests/test_rfq_service.py`
- `migration-db/DB-STATUS.md`
- This development note

The full personal execution record is in the gitignored
`migration-db/exec-log/2026-10-11-16-rfq-approve-transaction.md`.

## How to test

Use a disposable PostgreSQL database migrated to Alembic head (`0011`), and
set `TEST_DATABASE_URL` to that database. Each test fixture rolls back its
seeded partner, category, catalog product, RFQ, RFQ line, and temporary
failure trigger/function. No Mongo copy is needed.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "<disposable-postgresql-url>"
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_rfq_service.py' -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="<disposable-postgresql-url>"
.venv/bin/python -m unittest discover -s tests -p 'test_rfq_service.py' -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="<disposable-postgresql-url>"
.venv/bin/python -m unittest discover -s tests -p 'test_rfq_service.py' -v
```

Tests cover successful approval and earned-row insertion, repeat approval
without an earned-row duplicate, rejection without a ledger write, and rollback
of RFQ state when the ledger insert fails.

## DB-STANDARDS checklist

1. **Primary key, timestamps, and soft deletion — applied using existing
   tables.** No table was added. `rfqs`, `rfq_lines`, and `reward_ledger`
   already have primary keys, `created_at`, `updated_at`, and nullable
   `deleted_at`; this service updates the RFQ's `updated_at`.
2. **Foreign keys, delete policies, and FK indexes — applied using existing
   schema.** No relationship was changed. The ledger insert uses real
   `requester_id` and `quotation_id` references. The partner/RFQ FKs use
   RESTRICT, and existing composite indexes begin with each FK; RFQ line
   references remain unchanged.
3. **Search/filter/sort indexes — applied using existing schema.** No new
   searchable field was added. Existing RFQ, RFQ-line, and ledger indexes
   cover the lookups used by approval.
4. **Unique constraints — applied using existing schema.** The service checks
   for an existing live earned row and the row-10 partial unique index enforces
   at most one live `earned` row per RFQ.
5. **Multi-table transaction — applied.** RFQ status/totals/history changes
   and the conditional ledger insert are inside `session.begin()`. A failed
   ledger write propagates and rolls back the RFQ update.
6. **Authentication and authorization — not applicable.** This row adds no
   route. The future API route row owns access checks.
7. **Incoming-data validation — applied at the service boundary.** The
   Pydantic input model requires `approved`, defaults discount to zero, and
   restricts a supplied delivery mode to the same values as the Mongo model.
   The existing Mongo behavior clamps negative discounts to zero.
8. **Audit log — not applicable.** The migration tracker defers the generic
   audit log; this row does not add one.

## Left

Row 20 must wire the API route and translate service errors to matching HTTP
responses. Row 21 owns side-by-side route verification. Mongo remains
unchanged.

## Validation result

Both new files passed Python syntax validation and `compileall`. The focused
unittest discovery found all four PostgreSQL integration tests; they were
skipped because `TEST_DATABASE_URL` was unset. No database URL was read or
used, so successful approval, duplicate prevention, rejection, and rollback
still need to be exercised against a disposable PostgreSQL database at
Alembic head.
