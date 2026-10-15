# Post-row 21 Layer 1C: product-groups API parity

## Scope

Implement RTE-28–32 only on the PostgreSQL backend:

- `GET /api/product-groups`
- `POST /api/product-groups`
- `PUT /api/product-groups/{group_id}`
- `DELETE /api/product-groups/{group_id}`
- `POST /api/product-groups/{group_id}/delete-cascade`

No catalog-tree or rack routes were added. Steps 1D–1G and Layer 2 remain out
of scope.

## Built

- Added a PostgreSQL router and service using the existing `product_groups`
  and `product_group_items` tables. Product memberships are read and updated
  through the normalized join table, with active catalog products only.
- Create and update accept the Mongo request shape `{ "name": ..., "productIds":
  [...] }`. Names are trimmed; at least two distinct, existing products are
  required; duplicate group names are rejected case-insensitively.
- Responses use `{success, data, error}`. Group data contains `id`, `name`,
  `productIds`, `productCount`, `createdAt`, and `updatedAt`; list order is by
  name. Delete returns `{deleted, id}`. Cascade delete returns
  `{deleted, id, productsRemoved}`.
- Create, update, delete, and cascade writes run in a single PostgreSQL
  transaction. Normal delete soft-deletes the group and membership rows while
  keeping its products. Cascade delete verifies the supplied admin passcode,
  then soft-deletes products matched through group membership or their legacy
  `product_group` name, along with the group and associations.
- Added an Alembic migration replacing the non-unique case-insensitive
  product-group name index with a unique partial index for active groups. The
  migration stops with a clear error if active rows already have
  case-insensitive duplicate names.
- The route requires the PostgreSQL admin Bearer dependency. Reads allow the
  existing `admin`, `store_manager`, and `staff` roles; mutations require the
  `admin` role. Cascade additionally requires the request-body contact number
  and passcode. Mongo routes are public; this follows PostgreSQL's existing
  protected admin API boundary.

## Tables and files

Tables used: `product_groups`, `product_group_items`, `catalog`, and `users`
(for cascade passcode verification). No new tables or relationships were
added.

Backend files:

- `backend/app/main.py`
- `backend/app/models/__init__.py`
- `backend/app/routers/product_groups.py`
- `backend/app/schemas/taxonomy.py`
- `backend/app/services/catalog_service.py`
- `backend/app/services/product_groups_service.py`
- `backend/alembic/versions/0016_pg_group_name_uq.py`
- `backend/tests/test_product_groups_api.py`
- `backend/tests/test_postgres_schema.py`

## Mongo differences and remaining work

- PostgreSQL uses soft deletion rather than Mongo's hard deletes. A normal
  delete leaves catalog products intact; cascade soft-deletes matching
  products. Recreating a group with a previously soft-deleted matching name
  reactivates that group row because the PostgreSQL schema preserves deleted
  rows.
- The existing `product_groups_name_uq` exact-name constraint remains;
  case-insensitive active uniqueness is additionally enforced by the new
  partial index.
- Generic audit logging is deferred in `DB-STATUS.md`; this step does not add
  audit records.
- Live database integration, the 8001 web flow, and optional side-by-side
  Mongo requests remain for user verification.
- No changes were made to `web/`, `frontend/`, or `backend_refactor/`.

## DB-STANDARDS.md check

1. **Tables:** No table was added; the existing tables already have primary
   keys, timestamps, and `deleted_at`.
2. **Relationships:** No relationship changed. Existing product-group and
   catalog ID foreign keys and their indexes remain intact.
3. **Search/filter/sort indexes:** Existing name and join-table indexes remain.
   The case-insensitive group-name index is now unique for active rows; the
   migration checks for conflicting active data before creating it.
4. **Uniqueness:** Active names are checked in the service and protected by
   the unique partial index. The pre-existing exact-name unique constraint
   remains.
5. **Transactions:** Applicable. Create/update membership synchronization,
   normal delete, and cascade delete each run as one transaction.
6. **Authentication/authorization:** All routes require the existing admin
   Bearer dependency. Reads permit the existing authenticated team roles;
   mutations require `admin`. Cascade also verifies the submitted admin
   contact/passcode.
7. **Incoming-data validation:** `ProductGroupIn` defines the required name
   and `productIds` fields. Service validation trims names, deduplicates IDs,
   requires at least two, and verifies every product is active.
8. **Audit log:** No audit-log system is available; the generic audit log is
   explicitly deferred in `DB-STATUS.md`. No silent success or substitute
   logging was added.

## How to test

1. Configure PostgreSQL for `backend/`, then run Alembic to the current head
   and start the API on `127.0.0.1:8001`:

   ```powershell
   Set-Location C:\Users\Dell\Desktop\dashboard\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

2. Point the local web app's `VITE_BACKEND_URL` to
   `http://127.0.0.1:8001`, sign in as an admin, and open Product groups.
3. Confirm the list loads; create a group with at least two existing
   products; edit its name and product selection; then use the page's delete
   flow and confirm the selected products are removed as expected. The
   regular `DELETE /api/product-groups/{group_id}` endpoint is also available
   and preserves products.
4. Optional Mongo comparison: send the same list/create/update/delete-cascade
   requests to port 8000, using valid product IDs and an admin passcode for
   cascade.

## Verification

- OpenAPI generation confirms all five method/path operations are mounted.
- Three database-independent product-group validation tests passed.
- Three PostgreSQL API integration tests were discovered but skipped because
  `TEST_DATABASE_URL` is not configured. Alembic upgrade and the live web
  flow were not run in this session.
- Pylance diagnostics and the workspace Problems check report no issues in
  changed Python files.

Layer 1C is built. Steps 1D–1G and Layer 2 have not been started.
