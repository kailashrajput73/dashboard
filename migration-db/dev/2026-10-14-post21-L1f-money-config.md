# Post-row 21 Layer 1F: money-config API parity

## Scope

Implement RTE-72 and RTE-73 only on the PostgreSQL backend:

- `GET /api/money-config/{admin_id}`
- `PUT /api/money-config/{admin_id}`

Both routes return the existing `{success, data, error}` envelope and Mongo
money-config JSON field names. Step 1G and Layer 2 remain out of scope.

## Built

- Added a PostgreSQL router and service using the existing `money_config`
  table. No new table or Alembic migration was needed.
- GET creates defaults when the admin has no config row:
  `discountPercent=0`, `gstPercent=18`,
  `specialDiscountPercent=0`, `showDiscount=true`, `showGst=true`, and
  `showSpecialDiscount=false`.
- PUT accepts the Mongo `MoneyConfigIn` fields and defaults:
  `discountPercent=0`, `gstPercent=0`,
  `specialDiscountPercent=0`, `showDiscount=true`, `showGst=true`, and
  `showSpecialDiscount=false`. It upserts all six values by `admin_id`.
- Both successful responses contain `id`, `adminId`, the three percentage
  fields, and the three display flags. PostgreSQL timestamps are not included
  in the response, matching the Mongo payload shape.
- The PostgreSQL endpoints require an admin Bearer token and only allow the
  authenticated admin to access their own `admin_id`. Mongo's corresponding
  routes are public; the PG auth boundary follows the existing protected
  route convention.
- GET restores an existing soft-deleted config row, and PUT clears
  `deleted_at` on the updated or inserted row.
- Added a Pydantic request schema, route registration, money-config
  validation-envelope handling, contract tests, and PostgreSQL-backed API
  tests. No changes were made to `web/`, `frontend/`, or
  `backend_refactor/`.

## Files

- `backend/app/main.py`
- `backend/app/routers/money_config.py`
- `backend/app/schemas/operational.py`
- `backend/app/services/money_config_service.py`
- `backend/tests/test_money_config_api.py`

## DB-STANDARDS.md check

1. **Table requirements:** No table was added. The existing `money_config`
   table already has a primary key, `created_at`, `updated_at`, and nullable
   `deleted_at`.
2. **Relationships:** The existing `admin_id` references `users.id` with a
   real foreign key. Its delete behavior and relationship index were not
   changed.
3. **Search/filter/sort indexes:** No new searchable columns were added. The
   existing `admin_id` index supports the lookup and upsert conflict target.
4. **Uniqueness:** The existing unique constraint on `admin_id` ensures one
   config row per admin at the database level.
5. **Transactions:** GET default provisioning and PUT upsert each run in one
   transaction. Each operation writes at most one `money_config` row.
6. **Authentication/authorization:** Both routes require
   `get_current_admin`; each additionally requires role `admin` and a
   matching authenticated user ID and path `admin_id`.
7. **Incoming-data validation:** PUT uses `MoneyConfigRequest` to define all
   six fields, types, and Mongo-compatible defaults before database writes.
8. **Audit log:** The generic audit log is explicitly deferred in the
   migration tracker. This change does not add a substitute audit mechanism;
   this remains a known standards gap.

## How to test

1. In PowerShell, upgrade the PostgreSQL schema and start the API:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Log in against the PostgreSQL backend and take `adminId` and `token` from
   the login response. In another PowerShell window, issue GET and PUT with that admin
   Bearer token:

   ```powershell
   $adminId = "<adminId from login>"
   $token = "<token from login>"
   $headers = @{ Authorization = "Bearer $token" }
   $uri = "http://127.0.0.1:8001/api/money-config/$adminId"

   Invoke-RestMethod -Method Get -Uri $uri -Headers $headers

   $body = @{
     discountPercent = 5
     gstPercent = 12
     specialDiscountPercent = 2
     showDiscount = $true
     showGst = $true
     showSpecialDiscount = $false
   } | ConvertTo-Json
   Invoke-RestMethod -Method Put -Uri $uri -Headers $headers `
     -ContentType "application/json" -Body $body
   Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
   ```

   The GET should return the config payload, PUT should return the saved
   values, and the final GET should show the same values. A different
   `admin_id` should be rejected with the standard error envelope.
3. Optional source comparison: send the same GET and PUT to
   `http://127.0.0.1:8000/api/money-config/{admin_id}` and compare the
   success envelope and `data` fields.

## Verification and remaining work

Four database-independent contract tests passed, covering app route
registration, route authentication dependencies, PUT defaults, and response
field names. SQLAlchemy
compiled the PostgreSQL upsert with `ON CONFLICT (admin_id) DO UPDATE` and
`RETURNING`. Pylance found no diagnostics in the new router, service, schema,
or test; it reported one unrelated unused-parameter warning in `main.py`.
Python syntax checks passed for the new service and test file.

No Alembic upgrade, PostgreSQL-backed API test, live 8001 request, or Mongo
comparison was run in this session. Those remain for user verification.
Layer 1F is built; step 1G and Layer 2 have not been started.
