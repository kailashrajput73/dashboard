# Post-row 21 Layer 1A: purchase API parity

## Scope

Implement only RTE-39 and RTE-40 on PostgreSQL:

- `POST /api/purchases`
- `POST /api/purchases/import`

The selected contract is Option A: accept `{ "lines": [...] }`, with no
`partnerId` requirement, matching Mongo's `PurchaseIn` and purchase writer.
No work from steps 1B–1G or Layer 2 is included.

## Built

- `PurchaseRequest` now contains only `lines`; extra `partnerId` input is not
  part of the purchase contract.
- Purchase creation stores a `NULL` `partner_id`; a new Alembic revision makes
  that column nullable while preserving its FK to `partners.id`, `RESTRICT`
  delete behavior, and existing partner index.
- Both endpoints use the existing purchase service. Import delegates to
  creation; product/rack/line validation, transactional stock updates, and
  `{success, data, error}` responses remain in place.
- Added service, route, and schema expectations for purchases without a
  partner.
- Mongo `purchases` maps to PostgreSQL `purchases` plus `purchase_lines`;
  purchase stock and optional rack placement continue to update `catalog`
  and `rack_slots` in the same transaction. This retains PostgreSQL's
  implementation of inventory `TXN-16`.

## Files

- `backend/app/schemas/operational.py`
- `backend/app/routers/purchases_rfq.py`
- `backend/app/services/purchase_service.py`
- `backend/app/models/__init__.py`
- `backend/alembic/versions/0015_optional_purchase_partner.py`
- `backend/tests/test_purchase_service.py`
- `backend/tests/test_operational_api.py`
- `backend/tests/test_postgres_schema.py`

## DB-STANDARDS.md check

1. **Tables:** No new table; not applicable.
2. **Relationships:** The purchase-to-partner FK remains a real ID FK with
   `ON DELETE RESTRICT`; it is now nullable to match Mongo-created purchases.
   The existing partner index remains.
3. **Search/filter/sort indexes:** No new searchable columns; the existing
   purchase partner index remains.
4. **Uniqueness:** No new uniqueness requirements.
5. **Transactions:** Applicable. The existing transaction still wraps the
   purchase, line, stock, and rack writes as one operation.
6. **Authentication/authorization:** The existing authenticated-admin
   dependency remains on both routes; no access policy was changed.
7. **Input validation:** The Pydantic request continues to require `lines`;
   line fields and service-level product/rack checks remain validated.
8. **Audit log:** No audit-log mechanism was added. The DB tracker explicitly
   defers the generic audit log; that remains a known standards gap and was
   not represented as satisfied by this step.

## How to test

1. With PostgreSQL configured for the backend, in a terminal:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Point the local Vite app at `http://127.0.0.1:8001`, sign in, and on
   `PurchasesPage` create a purchase and run bulk import. Both should succeed
   without supplying a partner ID. Confirm the resulting lines and stock
   changes in the app/database.
3. Optional Mongo comparison: run the same purchase request body
   (`{"lines":[...]}` using a valid product code) against
   `http://127.0.0.1:8000/api/purchases` and
   `http://127.0.0.1:8000/api/purchases/import`.

## Verification and remaining work

Focused unittest discovery completed successfully for the selected files;
the two request-contract tests passed. PostgreSQL-backed service, API, and
schema tests were skipped because `TEST_DATABASE_URL` was not set. Alembic
offline SQL generation confirmed `ALTER TABLE purchases ALTER COLUMN
partner_id DROP NOT NULL`, and `0015_optional_purchase_partner` is the
Alembic head. The live PG/web flow and optional Mongo comparison remain for
user verification.

Steps 1B–1G and Layer 2 have not been started.
