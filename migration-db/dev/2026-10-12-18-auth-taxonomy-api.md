# Row 18 — PostgreSQL auth and taxonomy API

**Status:** Built; user verification remains.

## Alembic revision length blocker follow-up

The first row-18 Alembic revision id exceeded PostgreSQL's default
`alembic_version.version_num` width of 32 characters. Revision identifiers
must stay at most 32 characters. The migration file is now
`backend/alembic/versions/0012_auth_taxonomy_api.py` and its revision id is
`0012_auth_taxonomy_api` (22 characters); `down_revision` remains
`0011_dispatches_schema`. The version column was not widened.

The PostgreSQL upgrade from `0011_dispatches_schema` to
`0012_auth_taxonomy_api` and `alembic current` both succeeded. The API test run
also caught an immediate foreign-key insert-order issue in admin registration;
the service now flushes the admin row before inserting its money configuration.
All four row-18 PostgreSQL API tests pass after this correction.

## Scope and behavior

Mounted the following PostgreSQL-backed routes under `/api` in
`backend/app/main.py`:

- Auth: requester registration; admin register/login; partner app
  register/login/me.
- Partners/team: partner self-registration, admin partner onboarding/list/detail
  and KYC review, and admin team-user list/create/update.
- Taxonomy: categories, brands, and product types, including the existing
  rename and passcode-confirmed cascade behavior.
- Subcategories: list/create/update/delete, import, and passcode-confirmed
  cascade.
- Existing `/api/health` remains mounted. No catalog tree, catalog, purchasing,
  RFQ, dispatch, dashboard, or row-19/20 routes were added.

Successful and service-level error responses use the `{success, data, error}`
envelope. Public registration/login routes remain public; protected partner
and team/taxonomy routes use the row-0c Bearer dependencies. Cascade endpoints
continue to verify the request-body passcode.

Admin registration inserts the admin and default money configuration in one
transaction; the money-config GET route is not needed for this greenfield flow
and remains deferred. Partner login inserts its token and updates login
metadata in one transaction. Direct partner onboarding sets initial KYC state
and history in the insert. Category/brand/product-type renames and cascades,
product-type list synchronization, and subcategory import/cascade run inside
single transactions. The unique source data constraints are enforced in
PostgreSQL: row 18 adds case-insensitive indexes for non-soft-deleted taxonomy
rows and a partial unique index on non-null contact numbers for non-soft-deleted
user rows.

No migration data was copied from MongoDB. Existing PostgreSQL tables were
reused; migration `0012_auth_taxonomy_api` changes indexes only. Alembic
revision identifiers must remain at most 32 characters to fit the default
`alembic_version.version_num` column; keep future revision identifiers within
that limit.
Partner responses omit passcode hashes, matching the Mongo `public_partner`
helper.

## Files

- Added routers, schemas, shared service helpers, and services under
  `backend/app/routers/`, `backend/app/schemas/`, and `backend/app/services/`.
- Added `backend/alembic/versions/0012_auth_taxonomy_api.py`.
- Added `backend/tests/test_auth_taxonomy_api.py`.
- Updated `backend/app/main.py`, `backend/app/deps/auth.py`,
  `backend/app/models/__init__.py`, `backend/requirements.txt`, and
  `backend/README.md`.
- Updated only row 18 in `migration-db/DB-STATUS.md`.

## Test instructions

Apply Alembic migrations through `head` to a disposable PostgreSQL database.
Set `TEST_DATABASE_URL` to that database and run the backend tests.

### Windows PowerShell

From the repository root, install the backend requirements if needed, apply
migrations to the disposable test database, then run the tests:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
$env:DATABASE_URL = $env:TEST_DATABASE_URL
Set-Location backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Run the PostgreSQL API in another PowerShell window from `backend/`, leaving
the Mongo mirror on port 8000:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
Invoke-RestMethod http://127.0.0.1:8001/api/health
```

### macOS and Linux

From the repository root, use the Unix virtual-environment entry points:

```bash
backend/.venv/bin/python -m pip install -r backend/requirements.txt
export DATABASE_URL="$TEST_DATABASE_URL"
cd backend
.venv/bin/alembic upgrade head
.venv/bin/python -m unittest discover -s tests -v
```

Run the PostgreSQL API in another terminal from `backend/`:

```bash
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
curl http://127.0.0.1:8001/api/health
```

For a greenfield auth smoke test, `POST /api/auth/admin/register` with
`companyName`, `gstin`, `contactNumber`, and `passcode`; then
`POST /api/auth/admin/login` with the contact number and passcode. Use the
returned token as `Authorization: Bearer <token>` to call `GET /api/categories`.
The API test suite exercises this flow, partner registration/login/me,
protected category listing, taxonomy rename/sync, passcode cascade behavior,
and rollback of failed admin registration.

To compare with Mongo, start the existing mirror on port 8000 and issue the
same request sequence against `http://127.0.0.1:8000/api` and
`http://127.0.0.1:8001/api`. Use a fresh test identity per server; generated
ids/tokens and timestamps are expected to differ. No frontend proxy change was
made.

The focused API tests require `TEST_DATABASE_URL` and a database migrated to
head. During this build `TEST_DATABASE_URL` was not configured, so those
PostgreSQL integration tests were skipped; see the execution log for the exact
commands and results.

## DB-STANDARDS checklist

1. **Primary key, timestamps, and soft delete — not applicable.** Row 18 adds
   no tables or persistent schema objects; it adds indexes only.
2. **Foreign keys, delete behavior, and FK indexes — applied to existing
   schema.** Services use id-based relationships already defined in the
   PostgreSQL models (including subcategory/category and catalog taxonomy
   links). Cascade operations soft-delete related rows inside one transaction;
   the row adds no FK.
3. **Indexes for searched/filtered/sorted columns — applied.** Existing schema
   indexes cover route filter/sort and FK columns. Migration 0012 adds the
   contact-number unique index and case-insensitive indexes used by taxonomy
   lookups and uniqueness checks.
4. **Database-level uniqueness — applied.** Migration 0012 adds case-insensitive
   uniqueness for non-soft-deleted categories, subcategories per category,
   brands, and product types, plus non-soft-deleted non-null user
   contact-number uniqueness. Existing partner-phone and token unique indexes
   remain in force.
5. **Transactions for multi-write actions — applied.** TXN-01, TXN-02, TXN-03,
   TXN-04, TXN-05, TXN-06, TXN-07, TXN-08, TXN-09, TXN-10, and TXN-19 are
   handled transactionally. TXN-03 is represented as one atomic partner insert
   with its approved state/history. TXN-09 synchronization performed by the
   product-type list is transactional. Subcategory import validates before
   inserting, in the same transaction.
6. **Authentication and authorization — applied.** Admin-protected partner
   management, team, taxonomy, and subcategory routes use the admin dependency;
   partner `/auth/partner/me` uses the partner-token dependency. Public auth
   routes remain public. Category, brand, and subcategory cascade routes retain
   body passcode checks per the existing route classification.
7. **Pydantic validation — applied.** Request bodies for row-18 routes use
   schemas under `backend/app/schemas/`; FastAPI validates them before service
   writes.
8. **Audit log — not applicable to this row's implementation.** The project
   explicitly defers a generic audit log; KYC history remains the existing
   domain history field and no generic audit schema was added.

## Remaining

Row 18 is **Built**, not Done. Run the PostgreSQL integration tests using a
disposable database and compare the listed routes with the Mongo mirror before
marking it Done. No later migration row was started.
