# Post-row 21 Layer 1B: dashboard snapshot

## Scope

Implement only RTE-74, `GET /api/dashboard/snapshot`, in the PostgreSQL
backend. Keep the route path, method, `{success, data, error}` envelope, and
snapshot payload fields consumed by `DashboardPage` and
`getDashboardSnapshot()`. Steps 1C–1G and Layer 2 are out of scope.

## Built

- Added a PostgreSQL dashboard router and snapshot service using existing
  `catalog`, `categories`, `rfqs`, `rfq_lines`, `partners`, `dispatches`, and
  `dispatch_lines` tables.
- The response includes `catalogCount`, `categoryCount`, `totalStockUnits`,
  `lowStockCount`, `rfqCounts`, `pendingRfqs`, `partnersTotal`,
  `partnersKycApproved`, `dispatchValue7d`, `dispatchCount7d`,
  `salesWindowDays`, `topMovingProducts`, and `slowMovingProducts`.
- RFQ status counts include the standard pending/approved/rejected/dispatched
  keys and preserve other statuses; pending RFQs are newest-first, capped at
  five, with a normalized line count.
- Dispatch sales and product movement use the 7-day and 30-day windows,
  respectively. The API is registered in the main FastAPI app and uses its
  authenticated-admin dependency.
- No schema or migration change was needed. The route reads PostgreSQL data;
  no write transaction applies.

## Files

- `backend/app/main.py`
- `backend/app/routers/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `backend/tests/test_dashboard_api.py`
- `backend/tests/test_operational_api.py`

## Mongo parity notes

The successful JSON envelope and snapshot data shape match the Mongo service
and web type. PostgreSQL stores RFQ/dispatch lines in child tables, so line
counts and dispatch metrics are computed from those rows. Unlike Mongo's
collections, PostgreSQL uses soft-delete columns; this snapshot excludes
soft-deleted records, consistent with the existing PG read behavior. The PG
route uses the existing `get_current_admin` dependency, which admits the
`admin`, `store_manager`, and `staff` roles; the Mongo route is public. No
request body is involved.

## DB-STANDARDS.md check

1. **Tables:** Not applicable; no table was added.
2. **Relationships:** Not applicable; no relationship was added. Existing
   normalized links are queried through their existing foreign keys.
3. **Search/filter/sort indexes:** No schema or index changes were needed.
   The query uses the existing created-time, status, and child-FK indexes.
4. **Uniqueness:** Not applicable; no uniqueness rule changed.
5. **Transactions:** Not applicable; this endpoint is read-only.
6. **Authentication/authorization:** The dashboard is admin-facing. The route
   uses the existing `get_current_admin` dependency, matching the PostgreSQL
   app's protected-route pattern. That dependency admits the existing
   `admin`, `store_manager`, and `staff` roles; no dashboard-specific role
   restriction was introduced.
7. **Incoming-data validation:** Not applicable; the route accepts no body or
   query parameters.
8. **Audit log:** Not applicable; no create/update/delete occurs. No audit
   log was added.

## How to test

1. In PowerShell:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Set the local web app's `VITE_BACKEND_URL` to
   `http://127.0.0.1:8001`, sign in, and open Dashboard. The snapshot should
   load without a 404. Confirm the metrics render, including empty-state
   panels if the database has no recent operational data.
3. Optional source comparison: request the same GET from Mongo on port 8000
   and compare the envelope and snapshot fields.

## Verification and remaining work

The route contract and service payload tests passed, and generated SQLAlchemy
statements compiled against the PostgreSQL dialect. Pylance reported no
problems in the changed Python files. PostgreSQL-backed API assertions were
skipped because `TEST_DATABASE_URL` is not configured; the live web flow is
left for user verification.

Step 1A remains unchanged. Steps 1C–1G and Layer 2 have not been started.
