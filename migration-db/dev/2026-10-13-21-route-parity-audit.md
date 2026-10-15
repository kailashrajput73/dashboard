# Row 21 - full API route parity audit

## Scope and outcome

Audited the Mongo mirror in `backend_refactor/` against the PostgreSQL app in
`backend/`, including route declarations, request models, response serializers,
authentication dependencies, web API callers, and the row 18-20 implementation
notes. This is a source review; it does not implement the missing API routes or
alter either backend.

- Mongo has 81 documented API operations: RTE-01 through RTE-76 in
  `docs/BACKEND_INVENTORY.md`, plus RTE-77 through RTE-81 in
  `migration-db/BACKEND-FACTS-SUPPLEMENT.md`.
- The Mongo router declarations match those 81 documented routes. The Mongo
  index declarations cover the documented 19 collections and 57 indexes.
  No extra collection, collection field, route, or untracked multi-write
  operation was found that requires stopping for an inventory update.
- The PG app has 61 matching RTE operations and one PG-only path,
  `GET /api/health`. Twenty Mongo routes are not registered in PG; see gaps A.
- Live OpenAPI comparison could not run: neither `127.0.0.1:8000` nor
  `127.0.0.1:8001` accepted a connection. Matrix findings below are source
  derived, not runtime-certified.
- Operational Mongo data copy, row 14, was skipped by instruction. Missing
  historical purchases, RFQs, dispatches, and rewards are therefore not
  recorded as parity defects.

The Mongo `ImportItem` model accepts `reorderLevel`; the field is already
documented on COL-08 but omitted from the inventory's VAL-31 request-model
summary. It is not a new collection field, so this did not trigger the
DB-AGENTS drift stop or justify editing the baseline inventory.

## Matrix conventions

- `E` means the standard JSON envelope `{success, data, error}`. On successful
  JSON routes, the listed `data` shape is the compared payload shape.
- `same body` means the route method, path/query, and relevant Pydantic model
  fields align at source level, subject to the explicit differences in section
  B. Routes marked `--` have no JSON body.
- The Mongo router file is shown on every row. PG `N` means there is no
  registered PostgreSQL route for that method/path.
- A `B#` reference points to the known behavior differences below. A dash
  means no route-specific source discrepancy was confirmed, not that the live
  behavior was tested.
- All listed route paths include the actual `/api` prefix.

## Master route matrix

| ID | Mongo (Y/N + file) | Postgres (Y/N + file) | Method | Path | Auth model (Mongo / PG) | Request body / query parity | Response envelope + data shape parity | Known behavioral diff | Web screen(s) calling it |
|---|---|---|---|---|---|---|---|---|---|
| RTE-01 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | POST | `/api/auth/requester/register` | public / public | same: `name, phone, address` | E / user object | -- | None (requester/mobile flow) |
| RTE-02 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | POST | `/api/auth/admin/register` | public / public | same: `companyName, gstin, contactNumber, passcode` | E / admin registration object | PG wraps user + seeded money config in one transaction; Mongo writes separately | `web/src/pages/RegisterPage.tsx` |
| RTE-03 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | POST | `/api/auth/admin/login` | public / public | same: `contactNumber, passcode` | E / session object (`token, adminId, role, companyName, contactNumber, gstin`) | Admin token is checked by PG protected routes; Mongo admin token is not used for route auth (B#1) | `web/src/pages/LoginPage.tsx`, `web/src/pages/RegisterPage.tsx` |
| RTE-04 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | POST | `/api/auth/partner/register` | public / public | same: partner fields + `passcode` (min length 4) | E / public partner object | -- | None (partner mobile flow) |
| RTE-05 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | POST | `/api/auth/partner/login` | public / public | same: `phone, passcode` | E / token + public partner object | -- | None (partner mobile flow) |
| RTE-06 | Y `backend_refactor/routers/auth.py` | Y `backend/app/routers/auth.py` | GET | `/api/auth/partner/me` | Bearer partner / Bearer partner | no body; `Authorization` header | E / public partner object with reward balance | PG resolves token through dependency; Mongo resolves it in service; both require partner token (B#1) | None (partner mobile flow) |
| RTE-07 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | POST | `/api/partners/register` | public / public | same: `PartnerIn` | E / public partner object | -- | No current web call |
| RTE-08 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | POST | `/api/partners` | public / Bearer admin | same: `PartnerIn` | E / approved partner object | PG direct creation/approval is atomic; Mongo performs registration then a separate approval write (B#1, B#2) | `web/src/pages/PartnersPage.tsx` |
| RTE-09 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | GET | `/api/partners` | public / Bearer admin | query: `search, kyc_status, sales_manager` | E / array of partners with reward/RFQ/sales metrics | PG uses active (not soft-deleted) rows (B#4) | `web/src/pages/PartnersPage.tsx`, `web/src/pages/DispatchesPage.tsx`, `web/src/pages/RfqsPage.tsx` |
| RTE-10 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | GET | `/api/partners/{partner_id}` | public / Bearer admin | path id | E / partner object with metrics and `purchaseHistory` | Mongo purchase inserts do not set `partnerId`, so their own detail lookup cannot find those purchases; PG stores the partner link when supplied (B#3) | `web/src/pages/PartnersPage.tsx` |
| RTE-11 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | PUT | `/api/partners/{partner_id}/kyc` | public / Bearer admin | same: `approved, locationVerified?, rejectionReason?` | E / public partner object | -- | `web/src/pages/PartnersPage.tsx` |
| RTE-12 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | GET | `/api/team/users` | public / Bearer admin | -- | E / array of team users | PG omits soft-deleted users (B#4) | `web/src/pages/TeamPage.tsx` |
| RTE-13 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | POST | `/api/team/users` | public / Bearer admin | same: `name, contactNumber, role?, passcode, permissions?` | E / team user object | PG uniqueness is database-enforced; Mongo checks before insert | `web/src/pages/TeamPage.tsx` |
| RTE-14 | Y `backend_refactor/routers/partners_team.py` | Y `backend/app/routers/partners_team.py` | PUT | `/api/team/users/{user_id}` | public / Bearer admin | same: `name, contactNumber, role, isActive, permissions?` | E / team user object | PG uniqueness is database-enforced; Mongo checks before update | `web/src/pages/TeamPage.tsx` |
| RTE-15 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | GET | `/api/categories` | public / Bearer admin | query: `active_only` (default false) | E / array of categories with product counts | PG excludes soft-deleted records (B#4) | `web/src/pages/CategoriesPage.tsx`, `web/src/pages/SubcategoriesPage.tsx`, `web/src/pages/CatalogPage.tsx` |
| RTE-16 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | POST | `/api/categories` | public / Bearer admin | same: `name, imageUrl?` | E / category object | -- | `web/src/pages/CategoriesPage.tsx`, `web/src/features/catalog/CatalogProductEditor.tsx` |
| RTE-17 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | PUT | `/api/categories/{category_id}` | public / Bearer admin | same: `name, isActive, imageUrl?` | E / category object | PG performs the rename propagation in one transaction; Mongo can leave name copies partially updated (B#2) | `web/src/pages/CategoriesPage.tsx` |
| RTE-18 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | DELETE | `/api/categories/{category_id}` | public / Bearer admin | -- | E / deleted id/name object | PG soft-deletes; Mongo hard-deletes. Mongo removes child subcategories but leaves catalog products (B#2, B#4) | No direct web call found |
| RTE-19 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | POST | `/api/categories/{category_id}/delete-cascade` | passcode-body / passcode-body | same: `contactNumber, passcode` | E / deleted id + productsRemoved | PG transaction/soft-delete vs Mongo multi-write hard-delete (B#2, B#4) | No direct web call found |
| RTE-20 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | GET | `/api/brands` | public / Bearer admin | -- | E / array of brands with product counts | PG excludes soft-deleted records (B#4) | `web/src/pages/BrandsPage.tsx`, `web/src/pages/CatalogPage.tsx` |
| RTE-21 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | POST | `/api/brands` | public / Bearer admin | same: `name, logoUrl?` | E / brand object | -- | `web/src/pages/BrandsPage.tsx` |
| RTE-22 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | PUT | `/api/brands/{brand_id}` | public / Bearer admin | same: `name, isActive, logoUrl?` | E / brand object | PG wraps name propagation in a transaction; Mongo does separate writes (B#2) | `web/src/pages/BrandsPage.tsx` |
| RTE-23 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | POST | `/api/brands/{brand_id}/delete-cascade` | passcode-body / passcode-body | same: `contactNumber, passcode` | E / deleted id + productsRemoved | PG soft-deletes in a transaction; Mongo hard-deletes in separate writes (B#2, B#4) | No direct web call found |
| RTE-24 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | GET | `/api/product-types` | public / Bearer admin | query: `active_only` (default false) | E / array of types with product counts | Both GETs sync inferred types into stored taxonomy; PG does the sync transactionally while Mongo may partially sync (B#2) | `web/src/pages/ProductTypesPage.tsx` |
| RTE-25 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | POST | `/api/product-types` | public / Bearer admin | same: `name, imageUrl?` | E / product-type object | -- | `web/src/pages/ProductTypesPage.tsx` |
| RTE-26 | Y `backend_refactor/routers/taxonomy.py` | Y `backend/app/routers/taxonomy.py` | PUT | `/api/product-types/{type_id}` | public / Bearer admin | same: `name, isActive, imageUrl?` | E / product-type object | PG transactionally propagates renamed type to catalog; Mongo writes separately (B#2) | `web/src/pages/ProductTypesPage.tsx` |
| RTE-27 | Y `backend_refactor/routers/product_groups_racks.py` | Y `backend/app/routers/catalog.py` | GET | `/api/catalog/tree` | public / Bearer admin | query: `active_only` (default true) | E / object `{categories: [...]}` | Both sync inferred types; PG transactionally vs Mongo partial loop (B#2) | No current caller found; wrapper exists in `web/src/api/endpoints.ts` |
| RTE-28 | Y `backend_refactor/routers/product_groups_racks.py` | N | GET | `/api/product-groups` | public / -- | -- | E / array of product groups; PG unavailable | Missing on PG (A#1) | `web/src/pages/ProductGroupsPage.tsx` |
| RTE-29 | Y `backend_refactor/routers/product_groups_racks.py` | N | POST | `/api/product-groups` | public / -- | `name, productIds` | E / product-group object | Missing on PG (A#1) | `web/src/pages/ProductGroupsPage.tsx` |
| RTE-30 | Y `backend_refactor/routers/product_groups_racks.py` | N | PUT | `/api/product-groups/{group_id}` | public / -- | `name, productIds` | E / product-group object | Missing on PG (A#1) | `web/src/pages/ProductGroupsPage.tsx` |
| RTE-31 | Y `backend_refactor/routers/product_groups_racks.py` | N | DELETE | `/api/product-groups/{group_id}` | public / -- | -- | E / `{deleted, id}` | Missing on PG (A#1) | No direct web call found |
| RTE-32 | Y `backend_refactor/routers/product_groups_racks.py` | N | POST | `/api/product-groups/{group_id}/delete-cascade` | passcode-body / -- | `contactNumber, passcode` | E / deleted id + productsRemoved | Missing on PG (A#1) | `web/src/pages/ProductGroupsPage.tsx` |
| RTE-33 | Y `backend_refactor/routers/product_groups_racks.py` | N | GET | `/api/racks` | public / -- | -- | E / array of racks with slots | Missing on PG (A#2) | `web/src/pages/RacksPage.tsx`, `web/src/pages/PurchasesPage.tsx` |
| RTE-34 | Y `backend_refactor/routers/product_groups_racks.py` | N | POST | `/api/racks` | public / -- | `name, rows, columns` | E / rack object with slots | Missing on PG (A#2) | `web/src/pages/RacksPage.tsx` |
| RTE-35 | Y `backend_refactor/routers/product_groups_racks.py` | N | DELETE | `/api/racks/{rack_id}` | public / -- | -- | E / `{deleted, id}` | Missing on PG (A#2) | `web/src/pages/RacksPage.tsx` |
| RTE-36 | Y `backend_refactor/routers/product_groups_racks.py` | N | PUT | `/api/racks/{rack_id}/assign` | public / -- | `productId, slotCode` | E / `{rackId, slotCode}` | Missing on PG (A#2) | `web/src/pages/RacksPage.tsx` |
| RTE-37 | Y `backend_refactor/routers/product_groups_racks.py` | N | GET | `/api/racks/{rack_id}/products` | public / -- | -- | E / catalog-item array | Missing on PG (A#2) | No current caller found |
| RTE-38 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | GET | `/api/purchases` | public / Bearer admin | -- | E / array of purchases with embedded line arrays | PG reconstructs child rows into the Mongo embedded response shape (B#3, B#4) | `web/src/pages/PurchasesPage.tsx` |
| RTE-39 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | POST | `/api/purchases` | public / Bearer admin | Mongo `lines`; PG accepts optional `partnerId` but service requires it | E / purchase object with embedded lines | Current web sends `{lines}` only; PG rejects it with 400 "Partner id is required", while Mongo accepts it (B#3) | `web/src/pages/PurchasesPage.tsx` |
| RTE-40 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | POST | `/api/purchases/import` | public / Bearer admin | same as RTE-39 | E / purchase object with embedded lines | Same required-partner mismatch and current web failure as RTE-39 (B#3) | No distinct page call found |
| RTE-41 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | GET | `/api/rfqs` | public / Bearer admin | query: `partner_id, status, search` | E / array of RFQs with lines/history | PG search uses SQL matching over normalized lines; Mongo uses embedded-array regex; unverified edge-case equivalence | `web/src/pages/RfqsPage.tsx`, `web/src/pages/DispatchesPage.tsx` |
| RTE-42 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | POST | `/api/rfqs` | public / Bearer admin | same: `partnerId, lines, deliveryMode?, scheduledAt?` | E / RFQ object with embedded lines/history | PG requires an existing partner; Mongo only requires non-empty partnerId. PG writes normalized parent/lines transactionally (B#2) | `web/src/pages/RfqsPage.tsx` |
| RTE-43 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | PUT | `/api/rfqs/{rfq_id}` | public / Bearer admin | same as RTE-42 | E / RFQ object with embedded lines/history | PG requires an existing partner, replaces line rows transactionally and soft-deletes old rows; Mongo replaces embedded lines in one RFQ update (B#2, B#4) | `web/src/pages/RfqsPage.tsx` |
| RTE-44 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | POST | `/api/rfqs/{rfq_id}/approve` | public / Bearer admin | same: `approved, specialDiscountPercent?, deliveryMode?, scheduledAt?`; web also sends `rewardPoints` which both models ignore | E / RFQ object | PG status + reward ledger are atomic; Mongo writes separately (B#2) | `web/src/pages/RfqsPage.tsx` |
| RTE-45 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | GET | `/api/partners/{partner_id}/rewards` | public / Bearer admin | path id | E / wallet `{balance, entries[]}` | PG uses active ledger rows; Mongo reads all stored rows (B#4) | `web/src/pages/PartnersPage.tsx` |
| RTE-46 | Y `backend_refactor/routers/purchases_rfq.py` | Y `backend/app/routers/purchases_rfq.py` | GET | `/api/rfqs/{rfq_id}/history` | public / Bearer admin | path id | E / history array | PG reads active RFQ; Mongo reads by id | `web/src/pages/RfqsPage.tsx` |
| RTE-47 | Y `backend_refactor/routers/dispatch_inventory.py` | Y `backend/app/routers/dispatch_inventory.py` | GET | `/api/dispatches` | public / Bearer admin | -- | E / array of dispatches with embedded lines | PG reconstructs line rows; excludes soft-deleted records (B#4) | `web/src/pages/DispatchesPage.tsx` |
| RTE-48 | Y `backend_refactor/routers/dispatch_inventory.py` | Y `backend/app/routers/dispatch_inventory.py` | POST | `/api/dispatches` | public / Bearer admin | same: `lines, sourceRfqId?, customerName?, customerPhone?` | E / dispatch object with embedded lines | PG is atomic and prevents duplicate source RFQ dispatch; Mongo may leave stock decremented after later failure (B#2) | `web/src/pages/DispatchesPage.tsx`, `web/src/pages/RfqsPage.tsx` |
| RTE-49 | Y `backend_refactor/routers/dispatch_inventory.py` | Y `backend/app/routers/dispatch_inventory.py` | GET | `/api/inventory` | public / Bearer admin | -- | E / inventory-row array | PG excludes soft-deleted catalog rows (B#4) | `web/src/pages/InventoryPage.tsx` |
| RTE-50 | Y `backend_refactor/routers/dispatch_inventory.py` | Y `backend/app/routers/dispatch_inventory.py` | GET | `/api/inventory/low-stock` | public / Bearer admin | -- | E / filtered inventory-row array | PG filters its active-row inventory view (B#4) | `web/src/pages/InventoryPage.tsx` |
| RTE-51 | Y `backend_refactor/routers/dispatch_inventory.py` | Y `backend/app/routers/dispatch_inventory.py` | GET | `/api/inventory/transactions` | public / Bearer admin | -- | E / transaction array (`in`/`out`) | PG reconstructs from normalized purchase/dispatch lines and excludes soft-deleted rows (B#4) | `web/src/pages/InventoryPage.tsx` |
| RTE-52 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | GET | `/api/subcategories` | public / Bearer admin | query: `category_id?` | E / subcategory array with product counts | PG joins only active categories/subcategories (B#4) | `web/src/pages/SubcategoriesPage.tsx`, `web/src/pages/CatalogPage.tsx` |
| RTE-53 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | POST | `/api/subcategories` | public / Bearer admin | same: `name, categoryId` | E / subcategory object | PG enforces normalized FK and case-insensitive uniqueness; Mongo validates in service | `web/src/pages/SubcategoriesPage.tsx` |
| RTE-54 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | PUT | `/api/subcategories/{subcategory_id}` | public / Bearer admin | same: `name, categoryId` | E / subcategory object | PG updates normalized row; Mongo writes copied category name on the document | `web/src/pages/SubcategoriesPage.tsx` |
| RTE-55 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | DELETE | `/api/subcategories/{subcategory_id}` | public / Bearer admin | -- | E / `{deleted, id}` | PG soft-deletes; Mongo hard-deletes (B#4) | No direct web call found |
| RTE-56 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | POST | `/api/subcategories/{subcategory_id}/delete-cascade` | passcode-body / passcode-body | same: `contactNumber, passcode` | E / deleted id + productsRemoved | PG transactional soft-delete vs Mongo multi-write hard-delete (B#2, B#4) | `web/src/pages/SubcategoriesPage.tsx` |
| RTE-57 | Y `backend_refactor/routers/subcategories.py` | Y `backend/app/routers/subcategories.py` | POST | `/api/subcategories/import` | public / Bearer admin | same: `items[{name, categoryId?, category?}]` | E / `{inserted, skipped}` | PG import persistence is transactional; Mongo does one bulk insert after validation | `web/src/pages/SubcategoriesPage.tsx` |
| RTE-58 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | GET | `/api/catalog` | public / Bearer admin | same query: `category, search, group_id, type, brand, product_group, subcategory, product_class, size_mm` | E / catalog-item array enriched with price data | Both GET implementations can persist inferred type/class data; PG does so in a transaction (B#2) | `web/src/pages/CatalogPage.tsx`, `web/src/pages/BrandsPage.tsx`, `web/src/pages/CategoriesPage.tsx`, `web/src/pages/ProductTypesPage.tsx`, `web/src/pages/SubcategoriesPage.tsx`, `web/src/pages/PurchasesPage.tsx`, `web/src/pages/RfqsPage.tsx`, `web/src/pages/DispatchesPage.tsx`, `web/src/pages/InventoryPage.tsx` |
| RTE-59 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog` | public / Bearer admin | same: `CatalogItemIn` | E / catalog-item object | PG wraps multi-table side effects in transaction; Mongo uses separate writes (B#2) | `web/src/pages/CatalogPage.tsx`, `web/src/features/catalog/CatalogProductEditor.tsx` |
| RTE-60 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | PUT | `/api/catalog/{item_id}` | public / Bearer admin | same: `CatalogItemIn` | E / catalog-item object | PG transactionally updates normalized references/pricing; Mongo performs multiple writes (B#2) | `web/src/pages/CatalogPage.tsx`, `web/src/features/catalog/CatalogProductEditor.tsx` |
| RTE-61 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | PATCH | `/api/catalog/{item_id}/pricing` | public / Bearer admin | same: optional pricing fields | E / catalog-item object | PG transactionally updates catalog and pricing history/current price; Mongo writes separately (B#2) | `web/src/features/catalog/CatalogPricingRow.tsx`, `web/src/features/shelf-price-board/ShelfPriceBoard.tsx` |
| RTE-62 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/pricing-bulk` | public / Bearer admin | same: `itemIds, mrp?, discount?, stock?` | E / `{updated, skipped}` | PG uses a transaction; web falls back to per-item pricing calls for non-auth errors | `web/src/pages/CatalogPage.tsx` (bulk pricing controls) |
| RTE-63 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | DELETE | `/api/catalog/{item_id}` | public / Bearer admin | -- | E / `{deleted, id}` | PG soft-deletes; Mongo hard-deletes and keeps associated pricing/history (B#4) | No direct web call found |
| RTE-64 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/{item_id}/delete-secured` | passcode-body / passcode-body | same: `contactNumber, passcode` | E / `{deleted, id}` | PG passcode route has no Bearer dependency; Mongo passcode gate accepts any active team role (B#1) | No direct web call found |
| RTE-65 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/purge-by-field` | passcode-body / passcode-body | same: passcode + `field, value` | E / `{productsRemoved, field, value}` | PG passcode route has no Bearer dependency; deletes are soft on PG (B#1, B#4) | No direct web call found |
| RTE-66 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | DELETE | `/api/catalog` | public / Bearer admin | -- | E / `{deleted}` count | PG requires Bearer admin; Mongo route has no passcode/auth gate. PG soft-deletes and its reset scope/response must be compared with Mongo TXN-25 before cutover (B#1, B#4) | `web/src/api/endpoints.ts` wrapper; no current screen call found |
| RTE-67 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/wipe-all` | passcode-body / passcode-body | same: `contactNumber, passcode` | E / per-table wipe-count object | PG uses the passcode gate and soft-delete semantics; Mongo passcode-gates then hard-deletes/reset slots (B#4) | `web/src/pages/SettingsPage.tsx` |
| RTE-68 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/import` | public / Bearer admin | same: `items, categoryMode, overrideCategory?, replaceExisting?`; Mongo item model also accepts `reorderLevel` | E / `{inserted, updated?, skipped, categoryMode}` | PG import uses relational rows/transactions; Mongo import is a multi-write loop; no web caller found for this older route (B#2) | No current web call found |
| RTE-69 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/import/master` | public / Bearer admin | same: master items + category mode/override | E / import-count object | PG relational import behavior and transaction boundaries differ from Mongo TXN-27; row 19 tests cover PG import (B#2) | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` |
| RTE-70 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/import/pricing` | public / Bearer admin | same: `items[{productCode, mrp?, discount?, sellingPrice?}]` | E / `{updated, skipped, warnings?}` | PG transaction behavior differs from Mongo per-row partial progress (B#2) | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` |
| RTE-71 | Y `backend_refactor/routers/catalog.py` | Y `backend/app/routers/catalog.py` | POST | `/api/catalog/import/stock` | public / Bearer admin | same: `items[{productCode, stock}]` | E / `{updated, skipped}` | PG write transaction/batch semantics differ from Mongo per-row updates (B#2) | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` |
| RTE-72 | Y `backend_refactor/routers/config_dashboard.py` | N | GET | `/api/money-config/{admin_id}` | public / -- | path id | E / money-config object (creates defaults if absent) | Missing PG API (A#3); PG `money_config` table is present and used by admin register | No current web screen call found; wrapper exists |
| RTE-73 | Y `backend_refactor/routers/config_dashboard.py` | N | PUT | `/api/money-config/{admin_id}` | public / -- | `MoneyConfigIn` | E / money-config object | Missing PG API (A#3); PG `money_config` table is present | No current web screen call found; wrapper exists |
| RTE-74 | Y `backend_refactor/routers/config_dashboard.py` | N | GET | `/api/dashboard/snapshot` | public / -- | -- | E / dashboard snapshot object | Missing PG route; Dashboard page request gets 404 (A#4) | `web/src/pages/DashboardPage.tsx` |
| RTE-75 | Y `backend_refactor/routers/system.py` | N | GET | `/api/` | public / -- | -- | E / `{service, ok}` | Missing PG route; PG-only `GET /api/health` is not path or response compatible (A#5) | No web caller found |
| RTE-76 | Y `backend_refactor/routers/system.py` | N | GET | `/api/media/proxy` | public / -- | query: `url` | Success is image bytes/content-type; errors use E | Missing PG route. `RemoteImage` tries this only after direct and CDN image fallback fail (A#5) | `web/src/components/RemoteImage.tsx` and image-using screens |
| RTE-77 | Y `backend_refactor/routers/service_requests.py` | N | POST | `/api/service-requests` | public / -- | same Mongo model: required service/customer/description fields; address fields optional | E / created service-request object with initial history | No PG route or `service_requests` table (A#6) | No web create call (mobile/public flow) |
| RTE-78 | Y `backend_refactor/routers/service_requests.py` | N | GET | `/api/service-requests` | public / -- | query: `service_type, status, search, created_from, created_to` | E / service-request array | No PG route or table (A#6) | `web/src/pages/ServiceRequestsPage.tsx` |
| RTE-79 | Y `backend_refactor/routers/service_requests.py` | N | GET | `/api/service-requests/{request_id}` | public / -- | path id | E / service-request object | No PG route or table (A#6) | No current web call found |
| RTE-80 | Y `backend_refactor/routers/service_requests.py` | N | PATCH | `/api/service-requests/{request_id}` | public / -- | optional `status, recommendedName, recommendedPhone, adminNote, actor, note` | E / updated request object with appended history | No PG route or table (A#6) | `web/src/pages/ServiceRequestsPage.tsx` |
| RTE-81 | Y `backend_refactor/routers/service_requests.py` | N | GET | `/api/service-requests/{request_id}/history` | public / -- | path id | E / history array | No PG route or table (A#6) | No current web call found |

### PG-only route

`GET /api/health` is registered in `backend/app/main.py`, public, and returns
raw `{"status":"ok"}` rather than the Mongo `/api/` envelope. It has no RTE
counterpart; it must not be treated as a replacement for RTE-75.

## Gap groups

### A. Route missing on PG

- RTE-28–32: all product-group endpoints.
- RTE-33–37: all rack endpoints.
- RTE-72–73: money-config GET/PUT.
- RTE-74: dashboard snapshot.
- RTE-75: Mongo root information endpoint.
- RTE-76: media proxy.
- RTE-77–81: all service-request endpoints.

This is 20 absent method/path pairs. Exact Mongo route behavior to copy is in
the route matrix and the corresponding source files:
`backend_refactor/routers/product_groups_racks.py`,
`config_dashboard.py`, `system.py`, `service_requests.py`, with behavior in
the same-named `backend_refactor/services/` modules. This row only records the
parity backlog; it does not implement any of it.

### B. Route exists but behavior differs

1. **Authentication policy:** Mongo routes are public except RTE-06 (partner
   Bearer) and passcode-body gates RTE-19, 23, 32, 56, 64, 65, 67. PG requires
   an admin Bearer token on most existing operational/admin routes; RTE-06
   requires partner Bearer and the cascade/secured routes retain body
   passcodes. The web client attaches the saved admin token by default. This
   is an intentional hardening from open Mongo admin routes, but cutover
   clients must log in first. The PG dependency accepts `admin`,
   `store_manager`, and `staff`; only catalog write helpers additionally
   require role `admin`, so per-action role authorization is not uniform.
2. **Purchase create/import (RTE-39/40):** Mongo's body is `{lines: [...]}`.
   The current web helper sends that shape. PG's schema adds optional
   `partnerId`, then its service rejects a missing/blank partner id with HTTP
   400. A body matching the current web request therefore succeeds on Mongo
   but fails on PG. If supplied, PG persists a real purchase-partner link;
   Mongo's purchase writer does not persist `partnerId`. This is the top
   cutover blocker.
3. **Partner purchase history (RTE-10):** the Mongo read filters purchases by
   `partnerId`, but its RTE-39 writer omits that field. PG can return linked
   purchases only when its required partner id was supplied. Because row 14
   data copy was skipped, absence of old purchase history is not a migration
   defect.
4. **Atomicity/normalization:** PG uses SQL transactions for multi-table
   operations covered by TXN-01, TXN-04–10, TXN-16–18, and the catalog
   import/update paths. Mongo's equivalent writes are separate operations
   (notably RTE-08, RTE-17/22/26, RTE-39/40, RTE-44, RTE-48, RTE-56,
   RTE-58–62, and RTE-68–71). In particular, PG dispatch is all-or-nothing
   and enforces the unique `source_rfq_id`; Mongo can partially decrement
   stock. This is expected transaction hardening, but failure outcomes are
   intentionally not identical.
5. **RFQ partner validation (RTE-42/43):** PG requires `partnerId` to refer
   to an active partner; Mongo validates only that it is non-empty. PG stores
   RFQ lines in child rows and rebuilds the embedded response shape.
6. **Soft deletion:** PG filters or soft-deletes records using `deleted_at`;
   Mongo operations hard-delete. Normal active response shapes are intended
   to match, but deleted-record visibility and restored/legacy records do not
   have identical semantics.
7. **Validation error envelopes:** both return `{success,data,error}` for
   business validation. Mongo's FastAPI/Pydantic 422 body uses FastAPI's
   default `detail` shape. PG wraps validation errors on `/api/catalog*` and
   the row-20 operational paths in a generic envelope, but leaves other
   Pydantic failures at the default shape. Invalid-body error envelopes are
   therefore not consistently identical.
8. **No live result comparison:** source serializers reconstruct the main
   normalized purchase/RFQ/dispatch line arrays. Runtime JSON equivalence,
   query edge cases, and timestamp precision still need the test plan below.

### C. Schema-only on PG (tables exist, API absent)

- `product_groups`, `product_group_items`, `racks`, and `rack_slots` exist in
  `backend/app/models/__init__.py`, but none of RTE-28–37 is mounted.
- `money_config` exists and is written while registering an admin, but
  RTE-72–73 are absent.
- `service_requests` is not schema-only: there is neither a PG table/model nor
  any PG route. It is an entirely missing module in PG.

### D. Deferred by tracker / explicitly not a gap

- Row 14's operational Mongo-to-PG data copy was skipped. Historical
  purchases/RFQs/rewards/dispatches missing from local greenfield PG are
  expected; do not treat record-count differences as route gaps.
- The generic audit log and reward redemption are deferred in
  `migration-db/DB-STATUS.md`; do not turn them into new row-21 requirements.
- Rows 12–13 copy scripts not having been run is accepted for the greenfield
  database. No data copy was run in this audit.

## Prioritized cutover backlog

### P0 - blocks admin web flows available today

1. **RTE-39/40 `/api/purchases` and `/api/purchases/import`:** resolve the
   required `partnerId` versus existing `{lines}` web request contract. The
   current `PurchasesPage` create and bulk-import paths cannot create a PG
   purchase as written.
2. **RTE-74 `/api/dashboard/snapshot`:** implement the Mongo snapshot payload;
   `DashboardPage` currently calls this and receives 404.
3. **RTE-28–32 `/api/product-groups*`:** implement group list/create/update/
   delete/cascade behavior from the Mongo service; `ProductGroupsPage` uses
   these routes.
4. **RTE-33–37 `/api/racks*`:** implement list/create/delete/assign/products
   behavior from the Mongo service. `RacksPage` and `PurchasesPage` need at
   least RTE-33/34/35/36; retain RTE-37 parity even though no current web
   caller was found.
5. **RTE-78/80 `/api/service-requests*`:** implement list/update/history
   behavior or the Service Requests admin page fails. Add the whole RTE-77–81
   module together to keep the public create path and history contract
   consistent; there is currently no PG table.

### P1 - mobile/partner and secondary admin experience

1. **RTE-77 `/api/service-requests`:** public/mobile create is missing, along
   with its collection/table.
2. **RTE-04–06 and RTE-07–14 auth boundary:** verify partner mobile login/me
   and the new admin Bearer requirements against deployed clients. PG admin
   APIs reject calls without a registered admin token although Mongo admin
   routes are open.
3. **RTE-42/43:** verify partner existence assumptions for RFQ create/edit;
   clients that submit arbitrary partner ids will now be rejected.
4. **RTE-76 `/api/media/proxy`:** restore the image proxy contract; web has a
   CDN fallback first and proxy fallback next, so affected images show the
   placeholder if both fail.
5. **RTE-10:** confirm the intended partner purchase-history display after
   purchase requests include the required PG partner id.

### P2 - unused or non-core API parity

1. **RTE-72/73 money config:** add GET/PUT parity; the table exists, but no
   current web screen calls the wrappers.
2. **RTE-75 `/api/`:** restore the root envelope if an operational caller
   relies on it; no web caller found. PG `/api/health` is not equivalent.
3. **RTE-79/81:** add individual service-request/history reads with the
   service-request module; no current web caller found.
4. **RTE-31/37, 63–66, 68:** retain API coverage for routes without an
   identified current screen caller, and separately verify their passcode,
   delete, and import semantics before production cutover.

No backlog item was implemented in row 21.

## Side-by-side test plan (Windows PowerShell)

Run only against disposable Mongo and PostgreSQL databases with matching
admin, partner, and catalog fixtures. The commands below are manual
verification steps, not executed during this audit. Do not use live customer
data: imports, purchases, RFQs, approvals, dispatches, and stock updates
write records. Mongo does not check the admin Bearer for most routes; send the
PG token on protected PG calls.

```powershell
$Mongo = "http://127.0.0.1:8000"
$Pg = "http://127.0.0.1:8001"
$AdminBody = @{ contactNumber = $env:PARITY_ADMIN_PHONE; passcode = $env:PARITY_ADMIN_PASSCODE }
$LoginJson = $AdminBody | ConvertTo-Json
$MongoLogin = Invoke-RestMethod -Method Post -Uri "$Mongo/api/auth/admin/login" -ContentType "application/json" -Body $LoginJson
$PgLogin = Invoke-RestMethod -Method Post -Uri "$Pg/api/auth/admin/login" -ContentType "application/json" -Body $LoginJson
$PgHeaders = @{ Authorization = "Bearer $($PgLogin.data.token)" }
$PartnerId = $env:PARITY_PARTNER_ID
$ProductCode = $env:PARITY_PRODUCT_CODE
```

For each paired step, call the same path/method/body against Mongo and PG,
adding `$PgHeaders` only to the PG call. Compare status, envelope keys, and
`data` key/type shape; ignore generated ids/timestamps where expected.

| # | Method/path | Example / expected comparison |
|---|---|---|
| 1 | POST `/api/auth/admin/login` | The command above: same body; compare successful session fields. The token values differ. |
| 2 | GET `/api/categories` | `Invoke-RestMethod "$Mongo/api/categories"` and `Invoke-RestMethod "$Pg/api/categories" -Headers $PgHeaders`; compare envelope and array/category fields. |
| 3 | POST `/api/catalog/import/master` | In both, use a disposable unique test code: `@{items=@(@{name="Parity item";unit="pcs";category="Parity";productCode=$ProductCode;mrp=10;sellingPrice=10;reorderLevel=1})}`. Compare import counts and then remove test data using the test DB reset. |
| 4 | POST `/api/catalog/import/stock` | Same fixture body: `@{items=@(@{productCode=$ProductCode;stock=20})}`. Compare `updated/skipped`; confirms stock fixture for following checks. |
| 5 | POST `/api/purchases` - current web body | `@{lines=@(@{productCode=$ProductCode;quantity=1;listPrice=10;purchaseDiscount=0})}`. Expected mismatch: Mongo accepts; PG returns 400 because no partner id. Use disposable DB because Mongo writes a purchase and increases stock. |
| 6 | POST `/api/purchases` - with partner | Same as #5 plus `partnerId=$PartnerId`. Compare successful embedded line response and stock. Mongo accepts but does not persist the partner link; PG does. |
| 7 | GET `/api/purchases` | Compare arrays and nested lines after #6; PG data should be from the test run only. |
| 8 | POST `/api/rfqs` | `@{partnerId=$PartnerId;lines=@(@{productCode=$ProductCode;quantity=2});deliveryMode="storePickup"}`. Both should return an RFQ with embedded line fields when partner/product exist. |
| 9 | POST `/api/rfqs/{rfq_id}/approve` | Substitute the created id; body `@{approved=$true;specialDiscountPercent=0;rewardPoints=0}`. Compare RFQ fields/history and earned reward effects. |
| 10 | GET `/api/rfqs?partner_id=...` | Use the fixture id; compare filtered array and embedded line/history shapes. |
| 11 | POST `/api/dispatches` | Against the approved RFQ, use `@{sourceRfqId=$RfqId;lines=@(@{productCode=$ProductCode;quantity=1})}`. Compare successful dispatch shape; then in separate disposable reset runs induce a failure to confirm PG rolls back while Mongo's source behavior may leave partial stock changes. |
| 12 | GET `/api/inventory/transactions` | Compare `type, referenceId, productCode, productName, quantity, at` entries after purchase/dispatch; historical omissions from skipped row 14 are expected. |
| 13 | GET `/api/dashboard/snapshot` | Mongo should return the documented snapshot; PG currently returns 404. This is read-only on Mongo. |
| 14 | GET `/api/product-groups` and `/api/racks` | Mongo returns arrays; PG currently returns 404 for both. Use one call per path. |
| 15 | GET `/api/service-requests` | Mongo returns an array; PG currently returns 404. Also compare `/api/money-config/{admin_id}` (PG 404) and `/api/media/proxy?url=...` only with a known public image URL. |

An HTTP exception from `Invoke-RestMethod` is expected for known missing routes
or the purchase mismatch. Record status and body for those cases; do not
interpret the difference as a transport failure.

## DB-STANDARDS checklist

1. **New table PK/timestamps/deleted_at: not applicable.** Row 21 adds no
   table or model; it only records route parity and gaps.
2. **Relationships/FKs/delete policy/indexes: not applicable to new work.**
   No relationship or database constraint was changed. The audit records that
   PG has group/rack tables without route implementations and that soft-delete
   filtering differs from Mongo hard-delete behavior.
3. **Indexes on searchable/sortable columns: not applicable to new work.**
   No query/index code was added. Existing routes were checked at source level.
4. **Unique constraints: not applicable to new work.** No uniqueness rule
   changed. Existing PG uniqueness/transaction differences are identified in
   section B.
5. **Multi-table writes must be transactional: checked.** PG row-18 through
   row-20 services use SQL transactions for the inventoried critical writes;
   Mongo mirror remains unchanged. The expected all-or-nothing differences
   for TXN-16/17/18 are documented under B#4.
6. **Authentication and action authorization: applies and is reported.** PG
   requires Bearer auth for most mapped admin routes, retains the partner
   Bearer route and passcode-body gates, and does not apply a role-specific
   permission check uniformly. The Mongo routes remain open as documented;
   no auth changes were made.
7. **Incoming request validation: checked.** Existing Pydantic models were
   compared for mapped routes. RTE-39/40's partner requirement and the
   validation-error envelope differences are documented. No schemas changed.
8. **Audit log: deferred by tracker.** No generic audit log was added;
   history fields/events stay as currently implemented and the DB tracker
   explicitly defers generic audit logging.

## Verification and remaining

- Source inspection found the Mongo route count and PG missing-route set above.
- Live `openapi.json` checks against ports 8000 and 8001 were attempted with
  read-only GETs; both endpoints refused connections, so no live requests or
  database writes were performed.
- No automated tests were run; this row changes documentation/tracker only.
  Run the PowerShell plan against disposable matching datasets, especially the
  unmodified web purchase body, missing dashboard/group/rack/service-request
  routes, and protected PG calls.
- Row 21 is **Built**, not Done. Do not implement any P0 route in this audit.
