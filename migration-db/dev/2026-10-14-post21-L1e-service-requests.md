# Post-row 21 Layer 1E: service requests API parity

## Scope

Implement RTE-77–81 only in `backend/`:

- `POST /api/service-requests`
- `GET /api/service-requests`
- `GET /api/service-requests/{request_id}`
- `PATCH /api/service-requests/{request_id}`
- `GET /api/service-requests/{request_id}/history`

The implementation mirrors the Mongo field names, query parameters, history
event shape, error envelope, and route behavior. Steps 1F–1G and Layer 2 are
out of scope.

## Built

- Added `service_requests` with all COL-19 fields, `created_at`,
  `updated_at`, nullable `deleted_at`, a string UUID primary key, and `history`
  as a non-null JSONB array stored on the same row.
- Added Alembic revision `0018_service_requests_schema`, chained after
  `0017_rack_name_ci_unique`. It creates the Mongo-equivalent status/type/date
  and created-time indexes, a service-type filter index, a soft-delete index,
  and trigram indexes for the substring-search fields.
- Added Pydantic create/update schemas and all five routes. Public create
  remains unauthenticated for mobile callers. List/detail/history require an
  authenticated team account; update requires the `admin` role, consistent
  with the PostgreSQL app's protected admin boundary.
- Create trims required and optional strings, initializes `pending`, and
  creates the initial history event. The list endpoint supports
  `service_type`, `status`, `search`, `created_from`, and `created_to`, sorts
  newest first, and returns the same camel-case record shape. Update trims
  recommendation/admin fields, updates the request and appends its event in
  one PostgreSQL transaction. Detail and history return the Mongo-compatible
  404 envelope when no active record exists.
- Added request-contract and API integration tests, and included the new table
  and indexes in the PostgreSQL schema expectations.

## Tables and files

Table: `service_requests`. History remains embedded JSON in this table; no
second history table or foreign-key relationship is needed.

Backend files:

- `backend/app/main.py`
- `backend/app/models/__init__.py`
- `backend/app/routers/service_requests.py`
- `backend/app/schemas/operational.py`
- `backend/app/services/service_requests_service.py`
- `backend/alembic/versions/0018_service_requests_schema.py`
- `backend/tests/test_service_requests_api.py`
- `backend/tests/test_postgres_schema.py`

New notes:

- `migration-db/dev/2026-10-14-post21-L1e-service-requests.md`
- `migration-db/exec-log/2026-10-14-post21-L1e-service-requests.md`

No files in `web/`, `frontend/`, or `backend_refactor/` were changed.

## Mongo differences and remaining work

- Mongo leaves these routes public. PostgreSQL preserves its existing admin
  authentication boundary for list/detail/history, and restricts updates to
  `admin`; create remains public as required for mobile parity.
- PostgreSQL follows the migration's soft-delete convention and hides
  soft-deleted requests. Mongo queries do not use a soft-delete field.
- `createdAt` and `updatedAt` are serialized from PostgreSQL UTC timestamps
  using ISO format. Search and date filters retain the Mongo fields and
  inclusive comparison behavior; date comparisons use ISO timestamp strings.
- No multi-row TXN entry is needed: create and update each write one
  `service_requests` row, with history JSON updated atomically alongside its
  parent record.
- Generic audit logging remains deferred by the migration tracker.
- Alembic upgrade, database-backed API tests, and the live 8001/web flow were
  not run here. They remain for user verification.

## DB-STANDARDS.md check

1. **Table requirements:** Added a primary key, `created_at`, `updated_at`,
   and nullable `deleted_at`. Normal reads exclude soft-deleted rows.
2. **Relationships:** Not applicable; service requests have no relationship
   to another table. History is embedded JSON.
3. **Indexes:** Added indexes for service type/status/date filtering and
   newest-first sorting, soft-delete filtering, and the substring-search
   fields. PostgreSQL's existing `pg_trgm` extension is established by an
   earlier Alembic revision.
4. **Uniqueness:** The string request ID is unique by primary key. No other
   COL-19 field is unique.
5. **Transactions:** Each write is limited to one table. Create inserts one
   row; update locks and updates that row, including its history JSON, in one
   transaction.
6. **Authentication/authorization:** Public POST create is intentional.
   List/detail/history use `get_current_admin`; update additionally checks
   for the `admin` role.
7. **Input validation:** Pydantic schemas require the Mongo create fields,
   constrain service type/status values, and define optional fields/defaults.
   Service validation preserves the Mongo trimmed non-empty checks and
   `{success, data, error}` business-error envelope.
8. **Audit log:** Generic audit logging is deferred in the migration tracker;
   this step does not add a separate audit mechanism. The service history
   array records the Mongo-compatible lifecycle events.

## How to test

1. In PowerShell, apply the new migration and start the PostgreSQL backend:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Set `web/.env`'s `VITE_BACKEND_URL` to
   `http://127.0.0.1:8001`, sign in, and open Service requests. Confirm the
   list loads and an admin can update a request's status, recommendation, and
   admin note; verify the history event appears.
3. For public/mobile create parity, send a body without an admin token:

   ```powershell
   $body = @{
     serviceType = "plumber"
     customerName = "Test Customer"
     customerPhone = "9876543210"
     description = "Repair a leak"
     address = ""
     pincode = ""
     city = "Pune"
     area = ""
   }
   Invoke-RestMethod -Method Post `
     -Uri "http://127.0.0.1:8001/api/service-requests" `
     -ContentType "application/json" `
     -Body ($body | ConvertTo-Json)
   ```

4. Optional comparison: send the same public POST body to
   `http://127.0.0.1:8000/api/service-requests`, then compare the envelope,
   record fields, initial history shape, and timestamp representation.

## Verification

- Focused contract tests run through the selected Pylance interpreter: 3
  passed.
- Runtime route inspection confirmed all five paths/methods are registered;
  POST create has no admin dependency and the other routes do.
- SQLAlchemy PostgreSQL DDL compilation confirmed the JSONB history column,
  named primary key, and 10 declared indexes (including all 6 trigram
  indexes), in addition to the primary-key index.
  Alembic revision inspection reports `0018_service_requests_schema` as head.
- Pylance diagnostics and Problems checks found no issues in changed Python
  files. Syntax checks passed for the new router, service, and migration.
- The VS Code test runner did not discover the repository's Python unittest
  file. PostgreSQL-backed integration tests, migration execution, and the
  browser flow remain unverified.

Layer 1E is built. Steps 1F–1G and Layer 2 have not been started.
