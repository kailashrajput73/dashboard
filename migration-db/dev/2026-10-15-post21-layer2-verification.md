# Post-row 21 Layer 2 verification

**Date:** 2026-10-15  
**Scope:** Verification and clear API-contract regressions only. No Layer 3 data
copy, row 22, frontend work, or backend code changes were made.

## Result and limits

- The current Mongo router declarations contain 81 operations, matching the
  81 documented operations. The row 21 audit found no inventory drift; the
  Mongo routers, `docs/BACKEND_INVENTORY.md`, and
  `migration-db/BACKEND-FACTS-SUPPLEMENT.md` have no commits after that audit.
- All 26 checked PG method/path combinations below are mounted in the current
  app's OpenAPI schema. Alembic reports `0018_service_requests_schema` as
  head, below the stated revision-ID limit of 32.
- `backend/` unittest discovery completed with **92 tests run, 44 passed, 48
  skipped**. The skipped database integration tests require `TEST_DATABASE_URL`,
  which is not configured. The passed tests include database-independent
  contract/validation tests; this does not certify database-backed behavior.
- Neither `127.0.0.1:8000` (Mongo) nor `127.0.0.1:8001` (PG) has a listening
  service. No live OpenAPI comparison, API write, manual UI exercise, migration
  upgrade, or end-to-end transaction test was performed. The Layer 1 notes
  likewise leave full live/UI verification for the user. Results below
  distinguish mounted/source evidence from actual runtime verification.

## Verification matrix

| Flow | PG status | Mongo reference | Action taken |
|---|---|---|---|
| Admin auth/login and Bearer | Login and protected route are mounted. Auth dependency tests passed; the DB-backed register/login flow was skipped. Live login not run. | RTE-03 and protected route callers in the row 21 audit; Mongo admin routes are generally public. Mongo was not running. | No change. Preserve PG Bearer protection; use a PG login token for protected admin flows. |
| Catalog import/list and passcode wipe | Catalog list, import, master import, and wipe paths are mounted. The catalog API tests requiring PostgreSQL were skipped. | RTE-59–71 and the documented passcode-body gates; Mongo was not running. | No change. Do not test wipe against valuable data; use a disposable local database and valid passcode. |
| Taxonomy | Category route is mounted. The DB-backed taxonomy create/rename/cascade checks were skipped. | RTE-15–27; Mongo was not running. | No change. Live taxonomy behavior remains unverified. |
| Product groups | Routes are mounted. Product-ID and request validation tests passed; DB-backed CRUD/cascade tests were skipped. | RTE-28–32; Mongo was not running. | No change. Preserve soft-delete behavior rather than Mongo hard deletion. |
| Racks | Routes are mounted. Rack request/slot validation tests passed; DB-backed CRUD/assignment tests were skipped. | RTE-33–37; Mongo was not running. | No change. Preserve transactional slot replacement and soft deletion. |
| Purchases (`{lines}`) | Create and import are mounted. Request contract tests passed and confirm `{lines}` works without `partnerId`; DB-backed stock transaction tests were skipped. | RTE-39/40; the row 21 B#2 discrepancy is addressed by Layer 1 Option A. Mongo was not running. | No additional fix. The earlier partner-required failure is not present in the tested request schema. |
| RFQ create/edit/approve | Create, update, and approve paths are mounted. DB-backed API and reward-ledger transaction tests were skipped. | RTE-42–45; Mongo was not running. | No change. Preserve active-partner validation, normalized line reconstruction, and transaction behavior. |
| Dispatch | Create/list paths are mounted. DB-backed success, rollback, and duplicate-source-RFQ tests were skipped. | RTE-47–49; Mongo was not running. | No change. Preserve the transaction and unique dispatch-per-RFQ constraint; do not “Mongo-ify” this behavior. |
| Inventory and transactions | Inventory list and transaction paths are mounted. The DB-backed API test was skipped. | RTE-50/51; Mongo was not running. | No change. Seed stock and transaction fixtures in a disposable PG database before manual verification. |
| Partners, detail/history, and KYC | Partner list/create and KYC paths are mounted. No live partner/KYC request was run; database-dependent partner behavior was not verified. | RTE-07–11; Mongo was not running. | No change. Empty purchase history on greenfield PG is not a route failure; see greenfield note below. |
| Team users | Team list/create paths are mounted. No live team-user request was run; the focused backend suite provides no PG-backed team-user verification in this environment. | RTE-12–14; Mongo was not running. | No change. Team-user CRUD and authenticated access remain a user verification item. |
| Service requests list/update | List and update paths are mounted. Database-independent schema/history/auth contract tests passed; database-backed list/update/history tests were skipped. | RTE-77–81 in the supplement; Mongo was not running. | No change. `POST` remains public for the documented mobile caller; protected reads/updates retain PG auth. |
| Dashboard snapshot | Snapshot path is mounted. The database-backed metrics test was skipped. | RTE-74; Mongo was not running. | No change. Empty or zero metrics need seeded records before comparing values. |
| Money-config GET/PUT | Both methods are mounted. Field-name/default contract tests passed; database-backed GET/PUT round-trip was skipped. | RTE-72/73; Mongo was not running. | No change. Live persistence and per-admin authorization remain unverified. |
| Media proxy | Proxy path is mounted. Focused database-independent proxy tests passed for response/error contracts and URL/redirect validation; no live upstream or browser image flow was run. | RTE-76; Mongo was not running. | No change. `GET /api/` (RTE-75) remains intentionally absent; `/api/health` is not its replacement. |

## Failure classification and intentional differences

1. **Contract bug:** No new contract bug was confirmed. The purchase `{lines}`
   request failure documented in row 21 B#2 is addressed by Layer 1 Option A;
   its request-shape contract test passes. No other clear path, envelope, or
   request/response-shape break was demonstrated by the available evidence.
2. **Intentional PG differences (do not “Mongo-ify”):**
   - Admin Bearer auth on protected PG routes (audit B#1).
   - Multi-table transactions for purchases, RFQ approval, dispatch, and
     related catalog writes (audit B#4).
   - `deleted_at` soft deletion and active-row visibility (audit B#6).
   - Unique dispatch per source RFQ (audit B#4).
   - RFQs require an active PG partner reference; Mongo only checks that the
     partner ID is non-empty (audit B#5).
   - The optional Mongo root information route RTE-75 is not replaced by
     `/api/health`; Layer 1G deliberately implemented RTE-76 only.
3. **Greenfield / missing test data:** Row 14's operational data copy was
   skipped. Missing historical purchases, partner purchase history, RFQs,
   rewards, or dispatches are not parity failures. The database-backed
   integration tests also need a disposable database configured as
   `TEST_DATABASE_URL`. Use test-created partners, catalog products, stock,
   RFQs, and purchases to exercise flows; do not start a Mongo-to-PG data copy
   as part of this Layer 2 verification.
4. **Runtime unavailable (not classified as an API failure):** Both servers
   were down, and no live comparison was possible. These routes remain
   **unverified at runtime**, not failed.

## Retest steps for the user

1. Configure a disposable local PostgreSQL database for `backend/`, set
   `TEST_DATABASE_URL` to that database, and apply migrations:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m unittest discover -s tests
   ```

   The integration tests use rollback-scoped fixtures. Do not point them at
   production or valuable data.
2. Start Mongo on `127.0.0.1:8000` and PG on `127.0.0.1:8001`. Point the
   local web app to PG, sign in, then exercise the matrix flows. Seed a test
   category/product, partner, stock, and RFQ in the disposable PG database
   where a flow needs existing data. Keep the client payloads the same when
   comparing; supply admin Bearer auth to PG after login.
3. Compare the same methods, paths, bodies, and relevant query values against
   Mongo where data exists. Treat the intentional differences above as
   expected. Exercise catalog wipe only with disposable data and its required
   passcode. Check media proxy both directly and through the web image
   component.
4. Record any newly reproduced contract issue with the exact request and
   response before considering a backend-only fix. Full manual UI coverage is
   not claimed by this note.

## Files and commit guidance

No backend files changed. This verification note and the matching execution
log are documentation only; the user may make an optional docs-only commit.
No `DB-STATUS.md` row was changed or marked Done.
