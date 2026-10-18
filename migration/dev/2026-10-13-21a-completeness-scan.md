# 21a Completeness Scan (redo)

Date: 2026-10-17
Scope: read-only parity check of the current Expo app in `frontend/` against the React app in `web/`. No app code was changed for this audit.

## Executive verdict

Current result: every active Expo screen that exists in the current `frontend/app` tree has a corresponding web route in `web/`, and every current admin sidebar entry has a matching web link. There are no missing Expo routes in the current source tree.

The only concrete gaps are not missing screens; they are differences in implementation shape and old stale route leftovers:

- The old web-only `/money-config` route was a stale leftover and is not part of the current Expo app flow.
- The current Expo and web APIs are not byte-for-byte identical in a few helper signatures (`listServiceRequests`, `createTeamUser`).
- A few UI features are implemented via shared web components instead of Expo-native callbacks, which is normal framework divergence rather than a missing screen.

This is a completeness check, not a visual parity audit. The shell/layout parity work is tracked separately in the migration notes for 22a/22b.

## 1) Current Expo screens vs current web routes

Source checked:
- `frontend/app` for the current Expo tree
- `web/src/App.tsx` for the current web registrations

The current Expo tree contains 28 files under `frontend/app`:
- 25 actual routable screens including `/`
- 3 framework layout/document shell files (`_layout.tsx`, `+html.tsx`, and the root app entry)

Current web route registrations in `web/src/App.tsx` cover the same admin app structure:

- `/` -> `StartupRedirect`
- `/login` -> `LoginPage`
- `/register` -> `RegisterPage`
- `/dashboard` -> `DashboardPage`
- `/catalog` -> `CatalogPage`
- `/categories` -> `CategoriesPage`
- `/product-types` -> `ProductTypesPage`
- `/subcategories` -> `SubcategoriesPage`
- `/product-classes` -> `ProductClassesPage`
- `/brands` -> `BrandsPage`
- `/product-groups` -> `ProductGroupsPage`
- `/csv-import` -> `SpreadsheetImportsPage`
- `/import-products` -> `CatalogImportPage kind="master"`
- `/import-products-batch` -> `CatalogImportPage kind="master" batch`
- `/import-prices` -> `CatalogImportPage kind="pricing"`
- `/import-stock` -> `CatalogImportPage kind="stock"`
- `/racks` -> `RacksPage`
- `/purchases` -> `PurchasesPage`
- `/inventory` -> `InventoryPage`
- `/rfqs` -> `RfqsPage`
- `/partners` -> `PartnersPage`
- `/dispatches` -> `DispatchesPage`
- `/service-requests` -> `ServiceRequestsPage`
- `/settings` -> `SettingsPage`
- `/team` -> `TeamPage`

Comparison result:
- Present: all current Expo screen routes are represented in web.
- Missing: none in the current source tree.
- Extra stale route: no active Expo equivalent; old `/money-config` route was removed from the current web route tree and was treated as stale, not as a missing Expo feature.

## 2) Current menu / sidebar parity

The current menu shape in the Expo shell and the web shell match the same navigation taxonomy.

Checked files:
- `frontend/src/components/AdminShell.tsx`
- `web/src/components/AdminShell.tsx`

Current default sidebar layout is the same in both apps:
- Overview heading
- Dashboard
- Catalog heading
- Products
- Categories
- Product type
- Subcategories
- Product class
- Brands
- Product groups
- Spreadsheet imports
- Warehouse heading
- Racks
- Purchases
- Inventory
- Sales heading
- RFQs
- Partners
- Service requests
- Dispatch
- Admin heading
- Settings
- Team
- Sign out

Match result:
- Same visible nav items: yes
- Same headings: yes
- Same sign-out behavior: yes
- No missing sidebar route in the current app.

## 3) API/helper parity review

Checked files:
- `frontend/src/api/endpoints.ts`
- `web/src/api/endpoints.ts`

This comparison shows the web app has the same admin API surface for the current app, with a few non-blocking signature differences.

Matches:
- `registerAdmin`
- `loginAdmin`
- `getDashboardSnapshot`
- `listCategories`
- `updateCategory`
- `listBrands`
- `createBrand`
- `updateBrand`
- `listProductTypes`
- `createProductType`
- `updateProductType`
- `listProductGroups`
- `createProductGroup`
- `updateProductGroup`
- `deleteProductGroup`
- `listRacks`
- `createRack`
- `deleteRack`
- `assignRackSlot`
- `listPurchases`
- `createPurchase`
- `listRfqs`
- `createRfq`
- `updateRfq`
- `approveRfq`
- `rfqHistory`
- `listDispatches`
- `createDispatch`
- `listInventory`
- `listLowStock`
- `listInventoryTransactions`
- `registerPartner`
- `listPartners`
- `getPartner`
- `createPartnerAdmin`
- `reviewPartnerKyc`
- `getPartnerRewards`
- `listTeamUsers`
- `updateTeamUser`
- `listSubcategories`
- `createSubcategory`
- `updateSubcategory`
- `deleteSubcategory`
- `importSubcategories`
- `listCatalog`
- `createCatalogItem`
- `updateCatalogItem`
- `applyCatalogPricingBulk`
- `updateCatalogPricing`
- `deleteCatalogItem`
- `wipeCatalogAll`
- `deleteCatalogItemSecured`
- `deleteCategoryCascade`
- `deleteBrandCascade`
- `deleteSubcategoryCascade`
- `deleteProductGroupCascade`
- `purgeCatalogByField`
- `clearCatalog`
- `importCatalog`
- `importCatalogMaster`
- `importCatalogPricing`
- `importCatalogStock`

Relevant differences to note:

1. `listServiceRequests`
   - Expo accepts query filters like `service_type`, `status`, `search`, `created_from`, `created_to`.
   - Web currently exposes a narrower helper shape.
   - This is an API-shape difference, not a missing route or missing screen.

2. `createTeamUser`
   - Expo and web both send the same payload shape in practice, but the web helper type includes `isActive` while the Expo type omits it.
   - This is type-level divergence only; the page payload still aligns with the actual callsite usage.

3. Older stale route / money-config
   - `getMoneyConfig` and `updateMoneyConfig` exist as export helpers, but there is no current Expo screen route for `/money-config`.
   - The web app previously had a stale route registration for `/money-config`; that is not current app parity and is not a missing Expo view.

## 4) What is missing in the current Expo app and what is not

Missing current Expo screen routes in web: none.

Not missing but worth calling out:
- The old web-only `/money-config` route was stale and removed from the current route tree.
- Some Expo-native helper patterns are not mirrored one-to-one in React because React uses different component plumbing, but the user-facing screens are still present.
- A few icons and control implementations differ in framework-native detail, which belongs to visual parity work rather than route completeness.

## 5) Final determination for row 21a

Under the current source tree, the requirement is satisfied:

- Every active Expo screen exists in `web/`.
- Every admin sidebar item exists in `web/`.
- No current route is missing from the web app.

The remaining differences are not missing screens. They are:
- stale legacy route cleanup (`/money-config`),
- API signature differences that do not remove functionality, and
- framework-native implementation variance that is tracked separately in the later layout/parity migration work.

Status: row 21a completeness check is complete for the current app state. The result is "present for all current routes; no missing Expo screens." 
