# Row 0c — shared PostgreSQL API authentication dependencies

**Status:** Built; user testing remains.

## What was built

- Added `backend/app/deps/auth.py` with shared admin/team and partner Bearer-token dependencies. Both use the synchronous SQLAlchemy `Session` dependency intended for reuse by later routes.
- Admin lookup joins `admin_tokens` to `users`, rejects missing/unknown tokens, inactive users, and roles outside `admin`, `store_manager`, and `staff`.
- Partner lookup matches RTE-06: `partner_tokens` resolves to `partners`; invalid tokens return 401 and a token without a partner row returns 404. It does not add an `appActive`/KYC gate that the Mongo mirror does not have.
- Authentication failures are rendered by `backend/app/main.py` as `{ "success": false, "data": null, "error": "..." }`. No API routes are mounted yet; route dependencies are wired when routes are copied in rows 18–20.
- Added unit tests with a tiny fake SQLAlchemy session/result. They make no PostgreSQL or MongoDB connection and require no row 2 tables.
- Added FastAPI to `backend/requirements.txt`.

The expected header is exactly `Authorization: Bearer <opaque-token>`. This matches the admin API clients in `web/` and `frontend/`; RTE-06 already reads a Bearer token for partner authentication. Header scheme matching is case-insensitive. Tokens remain opaque strings, matching current Mongo-issued tokens; this does not introduce JWTs, expiry rules, or token refresh.

The SQL expects row 2's PostgreSQL names `admin_tokens.admin_id`, `partner_tokens.partner_id`, and `users.is_active`, with `users.id` and `partners.id` as the referenced ids. Confirm those names against row 2's final model/migration before route wiring. No application schema exists yet, so no live token lookup was attempted.

## Route classification for rows 18–20

These are wiring targets, not mounted routes in this row. The admin list is the existing admin/team surface to protect when copied; it covers the listed methods on `/partners` (including `/partners/{partner_id}/rewards`), `/team/users`, `/categories`, `/brands`, `/product-types`, `/catalog/tree`, `/product-groups`, `/racks`, `/purchases`, `/rfqs`, `/dispatches`, `/inventory`, `/subcategories`, `/catalog` and its imports, `/money-config/{admin_id}`, `/dashboard/snapshot`, and service-request management. Public and partner routes stay distinct, and the seven VAL-52 operations continue to use their request-body passcode rather than being converted to Bearer authentication.

| Policy | Inventory routes |
|---|---|
| **Admin/team dependency** | RTE-08–18, RTE-20–22, RTE-24–31, RTE-33–55, RTE-57–63, RTE-66, RTE-68–74, RTE-78–81 |
| **Partner dependency** | RTE-06 `GET /api/auth/partner/me` (the existing partner-token flow) |
| **Public** | RTE-01–05, RTE-07, RTE-75 `GET /api/`, RTE-76 `GET /api/media/proxy`, RTE-77 `POST /api/service-requests` |
| **Passcode in request body; no Bearer dependency** | RTE-19, RTE-23, RTE-32, RTE-56, RTE-64, RTE-65, RTE-67 (VAL-52) |

RTE-66 `DELETE /api/catalog` is in the admin/team group: RSK-02 explicitly records that it has no passcode check. The admin dependency returns the authenticated user's id and role; endpoint-specific permission or resource-ownership rules must be applied as each handler is wired. No new permission matrix is invented here.

## Drift check and Mongo difference

The backend inventory describes 76 routes and the authoritative supplement adds RTE-77–RTE-81; the inspected current router set matches those documented route groups. The supplement also accounts for the post-baseline service-request collection and index count. No additional route, collection, field, or multi-step-write drift was found that blocks 0c. `docs/BACKEND_INVENTORY.md` and `migration-db/BACKEND-FACTS-SUPPLEMENT.md` were not changed.

The Mongo mirror writes admin tokens but does not read them for admin routes (RSK-02). This row adds that check only in the new `backend/` package. The partner lookup keeps RTE-06's 401/404 distinction. `backend_refactor/` and its Mongo behavior remain unchanged. Nothing from the 81 routes is copied or mounted in this row.

## Files

- `backend/requirements.txt`
- `backend/app/__init__.py`
- `backend/app/db.py`
- `backend/app/errors.py`
- `backend/app/deps/__init__.py`
- `backend/app/deps/auth.py`
- `backend/app/main.py`
- `backend/tests/test_auth_dependencies.py`
- `migration-db/dev/2026-10-09-0c-auth-dependency.md`
- `migration-db/exec-log/2026-10-09-0c-auth-dependency.md` (personal, Git-ignored)
- `migration-db/DB-STATUS.md`

No tables, migrations, CORS configuration, full API routers, client changes, or Mongo changes were made. `DB-STANDARDS.md` itself was not edited; its item-by-item 0c assessment is below.

## Test on Windows PowerShell

From the repository root, install the updated backend requirements if needed, then run the fake-session tests:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: 10 tests pass. These verify missing/invalid/inactive admin authentication, supported admin roles, partner token resolution and RTE-06 error statuses, and the JSON envelope. They do not require PostgreSQL application tables and do not read MongoDB. To restore the repository-root working directory after testing, run `Set-Location ..`.

## Linux equivalent

From the repository root:

```bash
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd backend
.venv/bin/python -m unittest discover -s tests -v
```

Expected: the same 10 passing tests. No PostgreSQL service or MongoDB service is needed for this test suite.

## DB-STANDARDS checklist

1. **Primary key, timestamps, and soft-delete column for each new table — not applicable.** No table or persistent record was added.
2. **Foreign keys, delete behavior, and FK indexes — applied to the planned auth lookups; schema creation is not applicable.** The auth queries join token `*_id` values to `users.id` / `partners.id`. Row 2 must define the real foreign keys and indexes; this dependency does not create or replace them.
3. **Indexes for searched/filtered/sorted columns — applied as a row 2 schema requirement; schema creation is not applicable.** Token lookups filter by `admin_tokens.token` / `partner_tokens.token`; row 2 must index those token columns.
4. **Unique constraints for non-repeating values — applied as a row 2 schema requirement; schema creation is not applicable.** Token columns must remain unique; this row does not create their constraints.
5. **One transaction for actions writing multiple tables — not applicable.** The auth dependencies are read-only. No login, token issuance, or other writes were added.
6. **Authentication and role authorization for non-public routes — applied.** Shared dependencies validate Bearer tokens, user existence/activity, and permitted team roles. The role is returned for the route-level action/resource check when handlers are wired; the exact permission matrix remains unknown from the existing API and is not redesigned here.
7. **Pydantic validation for incoming data — not applicable.** No request body or data-writing API route was added. The dependency validates the Authorization scheme and resolved principal.
8. **Audit log for important writes — not applicable.** This row performs read-only authentication and does not add an audit-log system or mutate application data.

## Remaining

Row 0c is **Built**, not Done. Validate the SQL identifiers against row 2 when that schema is built, then wire the dependencies and the route classification above when the relevant routes are copied in rows 18–20. Row 0d and row 1 remain untouched.
