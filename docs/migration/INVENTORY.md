# Admin app inventory (read-only)

**Date:** 2026-10-01  
**Scope:** Expo React Native admin in `frontend/`, plus how it is built and how it calls the API.  
**Not done:** no migration, no renames, no edits to existing source files.

Line counts are `wc -l` on 2026-10-01. Several admin screens are written as very long lines, so a low line count does not mean a small screen.

`docs/` is listed in the repo `.gitignore`. This file is on disk. Git will not track it until that ignore rule changes.

---

## 1. Screens / pages

Routes come from Expo Router file paths under `frontend/app/`. The admin group is `(admin)`. URLs do not include the group name (example: `frontend/app/(admin)/categories.tsx` opens as `/categories`).

| ID | Screen | Path | Lines | What it does | Opened by | API calls | Size |
|---|---|---|---|---|---|---|---|
| SCR-01 | Bootstrap | `frontend/app/index.tsx` | 37 | Reads saved admin session. Sends user to dashboard or login. | App open, route `/` | none (storage only) | S |
| SCR-02 | Login | `frontend/app/(admin)/login.tsx` | 152 | Contact + passcode sign-in. | `/login`; SCR-01 when no session; sidebar sign-out | `POST /auth/admin/login` | M |
| SCR-03 | Register | `frontend/app/(admin)/register.tsx` | 184 | Create admin, then login. | `/register` (link from login; exact link text not re-read) | `POST /auth/admin/register`, `POST /auth/admin/login` | M |
| SCR-04 | Dashboard | `frontend/app/(admin)/dashboard.tsx` | 521 | Operations snapshot and links into other modules. | `/dashboard`; SCR-01 when session exists | `GET /dashboard/snapshot` | L |
| SCR-05 | Categories | `frontend/app/(admin)/categories.tsx` | 211 | List, search, active filter, create, edit, photo, activate, cascade delete. | Sidebar Categories | `GET /categories`, `POST /categories`, `PUT /categories/{id}`, `POST /categories/{id}/delete-cascade`, `GET /catalog` | M |
| SCR-06 | Product types | `frontend/app/(admin)/product-types.tsx` | 222 | Type list, photo, activate, purge products by type. | Sidebar Product type (hidden when taxonomy setting is off) | `GET /product-types`, `PUT /product-types/{id}`, `POST /catalog/purge-by-field`, `GET /catalog` | M |
| SCR-07 | Subcategories | `frontend/app/(admin)/subcategories.tsx` | 274 | CRUD, CSV import, cascade delete, optional shelf price board. | Sidebar Subcategories | `GET /subcategories`, `POST /subcategories`, `PUT /subcategories/{id}`, `POST /subcategories/import`, `POST /subcategories/{id}/delete-cascade`, `GET /categories`, `GET /catalog` | L |
| SCR-08 | Product classes | `frontend/app/(admin)/product-classes.tsx` | 16 | Thin wrapper around CMP-09 for `productClass`. | Sidebar Product class (hidden when setting is off) | via CMP-09: `GET /catalog`, `POST /catalog/purge-by-field` | S |
| SCR-09 | Brands | `frontend/app/(admin)/brands.tsx` | 170 | CRUD, logo, activate, cascade delete. | Sidebar Brands | `GET /brands`, `POST /brands`, `PUT /brands/{id}`, `POST /brands/{id}/delete-cascade`, `GET /catalog` | M |
| SCR-10 | Products (catalog) | `frontend/app/(admin)/catalog.tsx` | 1295 | Product list, filters, form (code, aliases, Hindi/Gujarati, subcategory, ROL, discount, QR), pricing, CSV export, secured delete. | Sidebar Products | `GET /catalog`, `POST /catalog`, `PUT /catalog/{id}`, `PUT /catalog/{id}/pricing`, `POST /catalog/pricing-bulk`, `DELETE /catalog/{id}`, `POST /catalog/{id}/delete-secured`, `GET /categories`, `POST /categories`, `GET /brands`, `GET /subcategories` | L |
| SCR-11 | Product groups | `frontend/app/(admin)/product-groups.tsx` | 159 | Create/edit groups (2+ products), cascade delete, optional shelf price board. | Sidebar Product groups | `GET /product-groups`, `POST /product-groups`, `PUT /product-groups/{id}`, `POST /product-groups/{id}/delete-cascade`, `GET /catalog` | M |
| SCR-12 | Import hub | `frontend/app/(admin)/csv-import.tsx` | 107 | Links to the four import screens. | Sidebar Spreadsheet imports | none | S |
| SCR-13 | Master import | `frontend/app/(admin)/import-products.tsx` | 17 | Full master sheet import. UI is CMP-08. | `/import-products` from SCR-12 | via CMP-08: `POST /catalog/import/master` | S |
| SCR-14 | Batch master import | `frontend/app/(admin)/import-products-batch.tsx` | 16 | Same master import, smaller batches. UI is CMP-08. | `/import-products-batch` from SCR-12 | `POST /catalog/import/master` | S |
| SCR-15 | Price import | `frontend/app/(admin)/import-prices.tsx` | 14 | Price sheet. UI is CMP-08. | `/import-prices` from SCR-12 | `POST /catalog/import/pricing` | S |
| SCR-16 | Stock import | `frontend/app/(admin)/import-stock.tsx` | 14 | Stock qty sheet. UI is CMP-08. | `/import-stock` from SCR-12 | `POST /catalog/import/stock` | S |
| SCR-17 | Racks | `frontend/app/(admin)/racks.tsx` | 37 | Create rack (rows/columns), assign slot, delete rack. | Sidebar Racks | `GET /racks`, `POST /racks`, `DELETE /racks/{id}`, `PUT /racks/{id}/assign`, `GET /catalog` | M |
| SCR-18 | Purchases | `frontend/app/(admin)/purchases.tsx` | 61 | Purchase entry, bulk CSV, history CSV export. | Sidebar Purchases | `GET /purchases`, `POST /purchases`, `GET /catalog`, `GET /racks` | M |
| SCR-19 | Inventory | `frontend/app/(admin)/inventory.tsx` | 27 | Current stock, low stock, stock in/out, CSV export. | Sidebar Inventory | `GET /inventory`, `GET /inventory/low-stock`, `GET /inventory/transactions` | M |
| SCR-20 | Partners | `frontend/app/(admin)/partners.tsx` | 30 | List, KYC approve/reject, reward balance. | Sidebar Partners | `GET /partners`, `PUT /partners/{id}/kyc`, `GET /partners/{id}/rewards` | M |
| SCR-21 | RFQs | `frontend/app/(admin)/rfqs.tsx` | 700 | List, filter, search, CSV export, manual create, approve/reject, edit lines, dispatch. | Sidebar RFQs | `GET /rfqs`, `POST /rfqs`, `PUT /rfqs/{id}`, `POST /rfqs/{id}/approve`, `GET /rfqs/{id}/history`, `POST /dispatches`, `GET /catalog`, `GET /partners` | L |
| SCR-22 | Dispatch | `frontend/app/(admin)/dispatches.tsx` | 39 | Dispatch list and retail bill (typed product code). | Sidebar Dispatch | `GET /dispatches`, `POST /dispatches`, `GET /catalog`, `GET /rfqs` | M |
| SCR-23 | Money config | `frontend/app/(admin)/money-config.tsx` | 232 | Discount, GST, visibility toggles for the signed-in admin. | Sidebar Money config | `GET /money-config/{adminId}`, `PUT /money-config/{adminId}` | M |
| SCR-24 | Settings | `frontend/app/(admin)/settings.tsx` | 167 | Show/hide Product type and Product class tabs. Wipe entire catalog (passcode). | Sidebar Settings | `POST /catalog/wipe-all` | M |
| SCR-25 | Team | `frontend/app/(admin)/team.tsx` | 31 | Team users and role labels (admin, store manager, staff). | Sidebar Team | `GET /team/users`, `POST /team/users`, `PUT /team/users/{id}` | M |

Layouts (not screens):

| ID | Path | Lines | Role | Size |
|---|---|---|---|---|
| SCR-26 | `frontend/app/_layout.tsx` | 45 | Root stack, fonts, splash, safe area | S |
| SCR-27 | `frontend/app/(admin)/_layout.tsx` | 19 | Admin stack inside CMP-02 sidebar | S |
| SCR-28 | `frontend/app/+html.tsx` | 50 | Web HTML shell for Expo | S |

---

## 2. Navigation

**NAV-01** Root stack — `frontend/app/_layout.tsx` (S)  
Expo Router `Stack`. Headers hidden. On web, no slide animation. On native, `GestureHandlerRootView` and splash screen. `LogBox.ignoreAllLogs(true)`.

**NAV-02** Admin stack — `frontend/app/(admin)/_layout.tsx` (S)  
Nested `Stack` inside `AdminShell`. No tabs. No drawer. No route params found in these layouts.

**NAV-03** Sidebar — `frontend/src/components/AdminShell.tsx` (M)  
Shown only when `Platform.OS === "web"` and the path is not `/login` or `/register`. On native, the shell is skipped and each screen is full-page with its own back header.

Sidebar sections and targets:

- Overview: `/dashboard`
- Catalog: `/catalog`, `/categories`, `/product-types` (optional), `/subcategories`, `/product-classes` (optional), `/brands`, `/product-groups`, `/csv-import`
- Warehouse: `/racks`, `/purchases`, `/inventory`
- Sales: `/rfqs`, `/partners`, `/dispatches`, `/money-config`
- Admin: `/settings`, `/team`

**NAV-04** Auth (S)  
`index.tsx` checks `getAdmin()` and replaces to `/(admin)/dashboard` or `/(admin)/login`.  
`AdminShell` sign-out calls `fullSignOut()` then `/(admin)/login`.  
No code was found that blocks a direct URL such as `/categories` when the token is missing. API calls then fail on their own. That is not a route guard.

**NAV-05** Deep link (S)  
`frontend/app.json` scheme: `shivaniadmin`. No other linking config file was found. What that scheme opens: unknown.

**NAV-06** Import hops (S)  
SCR-12 pushes `/(admin)/import-products`, `import-products-batch`, `import-prices`, `import-stock`.

---

## 3. Components

| ID | Name | Path | Lines | Used by | Size |
|---|---|---|---|---|---|
| CMP-01 | UI kit (`Header`, `Input`, `Button`, `Card`, `Chip`, `AppModal`, `ErrorModal`, `EmptyState`) | `frontend/src/components/UI.tsx` | 556 | Almost every screen | L |
| CMP-02 | AdminShell | `frontend/src/components/AdminShell.tsx` | 226 | SCR-27 | M |
| CMP-03 | RemoteImage | `frontend/src/components/RemoteImage.tsx` | 98 | Categories, brands, product types, catalog, CMP-04, CMP-06 | M |
| CMP-04 | CoverImageField | `frontend/src/components/CoverImageField.tsx` | 63 | Categories, brands, product types | S |
| CMP-05 | PasscodeConfirmModal | `frontend/src/components/PasscodeConfirmModal.tsx` | 63 | Categories, brands, subcategories, product types, product groups, catalog, settings, CMP-09 | S |
| CMP-06 | ProductCountButton, ProductPeekList | `frontend/src/components/LinkedProducts.tsx` | 102 | Categories, brands, subcategories, product types, product groups, CMP-09 | M |
| CMP-07 | ProductQr | `frontend/src/components/ProductQr.tsx` | 104 | Catalog | M |
| CMP-08 | CatalogSpreadsheetImport | `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx` | 275 | SCR-13, SCR-14, SCR-15, SCR-16 | L |
| CMP-09 | CatalogFacetPage | `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx` | 180 | SCR-08; product types has its own screen and does not use this file | M |
| CMP-10 | ShelfPriceBoard | `frontend/src/features/shelf-price-board/ShelfPriceBoard.tsx` | 229 | Subcategories and product groups, only if `SHELF_PRICE_BOARD_ENABLED` is true (`frontend/src/features/shelf-price-board/enabled.ts`, 17 lines) | M |

---

## 4. Hooks, context, state

No React context and no reducer store were found.

| ID | What | Path | Lines | Role | Size |
|---|---|---|---|---|---|
| HK-01 | `useIconFonts` | `frontend/src/hooks/use-icon-fonts.ts` | 52 | Loads Ionicons font before first paint. Used by SCR-26. | S |
| ST-01 | Session | `frontend/src/state/session.ts` | 33 | `saveAdmin`, `getAdmin`, `clearAdmin`, `fullSignOut`. Key `session:admin` plus bearer token via the API client. | S |
| ST-02 | Quotation draft | `frontend/src/state/draft.ts` | 145 | Client-side quote math (qty, discount, GST, totals). No screen under `frontend/app/` imports it. | M |

Taxonomy tab flags (show Product type / Product class) live in `frontend/src/features/catalog-taxonomy/settings.ts` (38 lines) and are read by CMP-02 and SCR-24. Storage-backed. Not a React context.

---

## 5. Services / API layer

All HTTP goes through `frontend/src/api/client.ts` (136 lines, **SVC-00**, M).  
Base URL: `frontend/src/config/env.ts` (`EXPO_PUBLIC_BACKEND_URL`, default `http://127.0.0.1:8000`). Prefix `/api`. Envelope `{ success, data, error }`. Bearer token from storage key `session:admin:token`.

Functions in `frontend/src/api/endpoints.ts` (609 lines):

| ID | Function | Method | Path | Called from UI |
|---|---|---|---|---|
| SVC-01 | `registerAdmin` | POST | `/auth/admin/register` | SCR-03 |
| SVC-02 | `loginAdmin` | POST | `/auth/admin/login` | SCR-02, SCR-03 |
| SVC-03 | `getDashboardSnapshot` | GET | `/dashboard/snapshot` | SCR-04 |
| SVC-04 | `listCategories` | GET | `/categories` | SCR-05, SCR-07, SCR-10 |
| SVC-05 | `createCategory` | POST | `/categories` | SCR-05, SCR-10 |
| SVC-06 | `updateCategory` | PUT | `/categories/{id}` | SCR-05 |
| SVC-07 | `listBrands` | GET | `/brands` | SCR-09, SCR-10 |
| SVC-08 | `createBrand` | POST | `/brands` | SCR-09 |
| SVC-09 | `updateBrand` | PUT | `/brands/{id}` | SCR-09 |
| SVC-10 | `listProductTypes` | GET | `/product-types` | SCR-06 |
| SVC-11 | `createProductType` | POST | `/product-types` | defined only; no screen import found |
| SVC-12 | `updateProductType` | PUT | `/product-types/{id}` | SCR-06 |
| SVC-13 | `listCatalogTree` | GET | `/catalog/tree` | defined only; no screen import found |
| SVC-14 | `listProductGroups` | GET | `/product-groups` | SCR-11 |
| SVC-15 | `createProductGroup` | POST | `/product-groups` | SCR-11 |
| SVC-16 | `updateProductGroup` | PUT | `/product-groups/{id}` | SCR-11 |
| SVC-17 | `deleteProductGroup` | DELETE | `/product-groups/{id}` | defined only; screens use cascade |
| SVC-18 | `listRacks` | GET | `/racks` | SCR-17, SCR-18 |
| SVC-19 | `createRack` | POST | `/racks` | SCR-17 |
| SVC-20 | `deleteRack` | DELETE | `/racks/{id}` | SCR-17 |
| SVC-21 | `assignRackSlot` | PUT | `/racks/{id}/assign` | SCR-17 |
| SVC-22 | `listRackProducts` | GET | `/racks/{id}/products` | defined only |
| SVC-23 | `listPurchases` | GET | `/purchases` | SCR-18 |
| SVC-24 | `createPurchase` | POST | `/purchases` | SCR-18 |
| SVC-25 | `listRfqs` | GET | `/rfqs` | SCR-21, SCR-22 |
| SVC-26 | `createRfq` | POST | `/rfqs` | SCR-21 |
| SVC-27 | `updateRfq` | PUT | `/rfqs/{id}` | SCR-21 |
| SVC-28 | `approveRfq` | POST | `/rfqs/{id}/approve` | SCR-21 |
| SVC-29 | `rfqHistory` | GET | `/rfqs/{id}/history` | SCR-21 |
| SVC-30 | `listDispatches` | GET | `/dispatches` | SCR-22 |
| SVC-31 | `createDispatch` | POST | `/dispatches` | SCR-21, SCR-22 |
| SVC-32 | `listInventory` | GET | `/inventory` | SCR-19 |
| SVC-33 | `listLowStock` | GET | `/inventory/low-stock` | SCR-19 |
| SVC-34 | `listInventoryTransactions` | GET | `/inventory/transactions` | SCR-19 |
| SVC-35 | `registerPartner` | POST | `/partners/register` | defined only |
| SVC-36 | `listPartners` | GET | `/partners` | SCR-20, SCR-21 |
| SVC-37 | `reviewPartnerKyc` | PUT | `/partners/{id}/kyc` | SCR-20 |
| SVC-38 | `getPartnerRewards` | GET | `/partners/{id}/rewards` | SCR-20 |
| SVC-39 | `listTeamUsers` | GET | `/team/users` | SCR-25 |
| SVC-40 | `createTeamUser` | POST | `/team/users` | SCR-25 |
| SVC-41 | `updateTeamUser` | PUT | `/team/users/{id}` | SCR-25 |
| SVC-42 | `listSubcategories` | GET | `/subcategories` | SCR-07, SCR-10 |
| SVC-43 | `createSubcategory` | POST | `/subcategories` | SCR-07 |
| SVC-44 | `updateSubcategory` | PUT | `/subcategories/{id}` | SCR-07 |
| SVC-45 | `deleteSubcategory` | DELETE | `/subcategories/{id}` | defined only; screens use cascade |
| SVC-46 | `importSubcategories` | POST | `/subcategories/import` | SCR-07 |
| SVC-47 | `listCatalog` | GET | `/catalog` | many screens (see section 1) |
| SVC-48 | `createCatalogItem` | POST | `/catalog` | SCR-10 |
| SVC-49 | `updateCatalogItem` | PUT | `/catalog/{id}` | SCR-10 |
| SVC-50 | `applyCatalogPricingBulk` | POST | `/catalog/pricing-bulk` (falls back to per-item pricing) | SCR-10, CMP-10 |
| SVC-51 | `updateCatalogPricing` | PUT | `/catalog/{id}/pricing` | SCR-10, CMP-10, fallback inside SVC-50 |
| SVC-52 | `deleteCatalogItem` | DELETE | `/catalog/{id}` | SCR-10; also inside SVC-54 |
| SVC-53 | `deleteCatalogItemSecured` | POST | `/catalog/{id}/delete-secured` | SCR-10 |
| SVC-54 | `clearCatalog` | DELETE | `/catalog` then per-item delete | defined only |
| SVC-55 | `wipeCatalogAll` | POST | `/catalog/wipe-all` | SCR-24 |
| SVC-56 | `deleteCategoryCascade` | POST | `/categories/{id}/delete-cascade` | SCR-05 |
| SVC-57 | `deleteBrandCascade` | POST | `/brands/{id}/delete-cascade` | SCR-09 |
| SVC-58 | `deleteSubcategoryCascade` | POST | `/subcategories/{id}/delete-cascade` | SCR-07 |
| SVC-59 | `deleteProductGroupCascade` | POST | `/product-groups/{id}/delete-cascade` | SCR-11 |
| SVC-60 | `purgeCatalogByField` | POST | `/catalog/purge-by-field` | SCR-06, CMP-09 |
| SVC-61 | `importCatalog` | POST | `/catalog/import` | defined only (legacy) |
| SVC-62 | `importCatalogMaster` | POST | `/catalog/import/master` | CMP-08 |
| SVC-63 | `importCatalogPricing` | POST | `/catalog/import/pricing` | CMP-08 |
| SVC-64 | `importCatalogStock` | POST | `/catalog/import/stock` | CMP-08 |
| SVC-65 | `getMoneyConfig` | GET | `/money-config/{adminId}` | SCR-23 |
| SVC-66 | `updateMoneyConfig` | PUT | `/money-config/{adminId}` | SCR-23 |

Backend that serves these routes: `backend/server.py`. A second layout exists at `backend_refactor/` (split routers). Which process the VPS runs: unknown from this scan (see section 11).

---

## 6. Utils, constants, helpers, validation, config

| ID | Path | Lines | Role | Size |
|---|---|---|---|---|
| UTL-01 | `frontend/src/config/env.ts` | 46 | API base URL, mixed-content warning | S |
| UTL-02 | `frontend/src/theme.ts` | 80 | Colors, spacing, radii, fonts, `isWeb`, `pointer` | S |
| UTL-03 | `frontend/src/utils/money.ts` | 4 | `formatMoney` | S |
| UTL-04 | `frontend/src/utils/pricing.ts` | 12 | MRP/discount/selling math | S |
| UTL-05 | `frontend/src/utils/size.ts` | 31 | Size cell parsing | S |
| UTL-06 | `frontend/src/utils/csv.ts` | 584 | CSV parse and master/price/stock row mapping (HSN, GST, ROL, class) | L |
| UTL-07 | `frontend/src/utils/spreadsheet.ts` | 186 | `.xlsx` unzip/parse; rejects old `.xls` | M |
| UTL-08 | `frontend/src/utils/import-templates.ts` | 97 | Empty CSV templates and download | M |
| UTL-09 | `frontend/src/utils/pick-image.ts` | 36 | Image pick: web file input vs native document picker | S |
| UTL-10 | `frontend/src/utils/read-asset-bytes.ts` | 35 | Read picked file bytes (web vs native) | S |
| UTL-11 | `frontend/src/utils/storage/storage-base.ts` | 50 | Shared get/set helpers | S |
| UTL-12 | `frontend/src/utils/storage/index.ts` | 107 | Native storage: AsyncStorage + expo-secure-store | M |
| UTL-13 | `frontend/src/utils/storage/index.web.ts` | 73 | Web storage: AsyncStorage only (comment says IndexedDB shim; no Keychain) | M |
| UTL-14 | `frontend/src/types/qrcode.d.ts` | 13 | Types for the `qrcode` package | S |
| UTL-15 | `frontend/src/features/catalog-taxonomy/settings.ts` | 38 | Persist which taxonomy tabs show | S |
| UTL-16 | `frontend/src/features/shelf-price-board/enabled.ts` | 17 | Feature flag, currently `true` | S |
| UTL-17 | `frontend/src/features/shelf-price-board/index.ts` | 3 | Re-exports CMP-10 and the flag | S |

Validation found in screens is local (empty contact, empty name, passcode length on team). No shared validation library.

---

## 7. Assets

| ID | Path | Role | Size |
|---|---|---|---|
| AST-01 | `frontend/assets/images/icon.png` | App icon | S |
| AST-02 | `frontend/assets/images/adaptive-icon.png` | Android adaptive icon | S |
| AST-03 | `frontend/assets/images/splash-image.png` | Splash | S |
| AST-04 | `frontend/assets/images/favicon.png` | Web favicon | S |
| AST-05 | `frontend/assets/images/favicon-48.png` | Extra favicon | S |

No `.ttf` / `.otf` font files found. Icons are Ionicons from `@expo/vector-icons` (HK-01 loads the font).  
No translation files found. Hindi and Gujarati are two fields on the product form (`multilingualNames`), not an i18n catalog.  
Product, category, brand, and type photos are URLs or data URLs from the API, not files in `assets/`.

---

## 8. React Native code that a web app must replace

No uses found of `Alert`, `Dimensions`, `Animated` / Reanimated, camera, barcode scanner, or permission APIs.

`Linking.openURL` is used to download CSV (`data:text/csv...`) in catalog, RFQs, inventory, purchases, subcategories, and UTL-08. On a normal website that becomes a file download (`<a download>` or a blob). Size S per call site, spread across those files.

| ID | File | What it uses | Web replacement | Size |
|---|---|---|---|---|
| RN-01 | Every screen in section 1 except SCR-08 and the three import wrappers | `View`, `Text`, `StyleSheet` | HTML + CSS | L (whole UI) |
| RN-02 | List screens (categories, brands, catalog, RFQs, and the other `FlatList` files in the import scan) | `FlatList` | A list or table element | M each |
| RN-03 | Login, register, dashboard, catalog, RFQs, money config, import hub, CMP-08 | `ScrollView` | Page scroll | S |
| RN-04 | Login, register | `KeyboardAvoidingView`, `Platform.OS === "ios"` | Not needed on web | S |
| RN-05 | SCR-26 | `StatusBar`, splash, `GestureHandlerRootView` vs `View` | Drop for a website | S |
| RN-06 | CMP-01 | `Modal`, `TextInput`, `Pressable`, `ActivityIndicator` | `<dialog>` or a div, `<input>`, `<button>` | L |
| RN-07 | SCR-23 | `Switch` | Checkbox or switch element | S |
| RN-08 | Catalog | `RefreshControl`, `TextInput` | Reload button; `<input>` | S |
| RN-09 | CMP-03, CMP-07 | `Image` | `<img>` | S |
| RN-10 | UTL-12 / UTL-13 | AsyncStorage; native also expo-secure-store | `localStorage` or `sessionStorage` | M |
| RN-11 | UTL-09, UTL-10, CMP-08, catalog, purchases, subcategories | `expo-document-picker`, `expo-file-system` | `<input type="file">` and `File.arrayBuffer()` | M |
| RN-12 | CMP-07 | `qrcode` package plus `expo-file-system` to save PNG | Same `qrcode` library, browser download | S |
| RN-13 | HK-01 and every Ionicons import | `@expo/vector-icons` | An icon set that does not need Expo font loading (for example lucide or inline SVG) | M |
| RN-14 | Safe area on screens | `react-native-safe-area-context` | Not needed in a normal browser layout | S |
| RN-15 | UTL-02 | `Platform.OS === "web"` for cursor | Ordinary CSS `cursor: pointer` | S |

---

## 9. Dependencies (`frontend/package.json`)

| ID | Package | Verdict | Size |
|---|---|---|---|
| DEP-01 | `react`, `react-dom` | Works on web as-is | S |
| DEP-02 | `expo`, `expo-router`, `@expo/metro-runtime` | Needs replacement: Vite (or another web bundler) + React Router | L |
| DEP-03 | `react-native`, `react-native-web` | Remove after screens are rewritten. `react-native-web` is what runs the site today | L |
| DEP-04 | `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`, `react-native-safe-area-context` | Remove for the website. No Reanimated calls found in app code; gesture-handler is only the root wrapper | M |
| DEP-05 | `@expo/vector-icons` | Needs replacement (see RN-13) | M |
| DEP-06 | `expo-document-picker`, `expo-file-system`, `expo-image`, `expo-secure-store` | Needs replacement: browser file input, `<img>`, `localStorage`. `expo-image` import in `src/` was not found | M |
| DEP-07 | `expo-splash-screen`, `expo-status-bar`, `expo-font`, `expo-constants`, `expo-linking`, `expo-system-ui`, `expo-symbols`, `expo-haptics`, `expo-blur`, `expo-linear-gradient`, `expo-web-browser` | Remove for the website. Direct imports in `src/` or `app/` were not found except splash-screen in SCR-26 | M |
| DEP-08 | `@react-native-async-storage/async-storage` | Needs replacement: `localStorage` (RN-10) | S |
| DEP-09 | `@react-native-community/cli` | Remove. Pinned to `latest` | S |
| DEP-10 | `react-native-dotenv` | Needs replacement: Vite `import.meta.env` | S |
| DEP-11 | `react-native-webview` | Remove. No usage found in `app/` or `src/` | S |
| DEP-12 | `qrcode` | Works on web as-is | S |
| DEP-13 | `date-fns`, `dayjs` | Works on web as-is. Whether screens import them: unknown (not part of the RN import scan) | S |
| DEP-14 | `eslint`, `eslint-config-expo`, `typescript`, `@types/react`, `expo-doctor` | ESLint config needs a non-Expo config. TypeScript stays | S |

---

## 10. Platform-specific files and `Platform.OS`

| ID | Where | What | Size |
|---|---|---|---|
| PLT-01 | `frontend/src/utils/storage/index.web.ts` | Only `.web` file found. Metro loads it on web. Native uses `index.ts` | S |
| PLT-02 | No `.native.js` / `.ios.` / `.android.` source files found under `frontend/` (excluding `node_modules`) | — | S |
| PLT-03 | `frontend/app/_layout.tsx` | Web skips splash prevent and gesture root; animation `none` | S |
| PLT-04 | `frontend/app/(admin)/_layout.tsx` | Web animation `none` | S |
| PLT-05 | `frontend/src/theme.ts` | `isWeb` | S |
| PLT-06 | `frontend/src/components/AdminShell.tsx` | Sidebar only when `isWeb` | M |
| PLT-07 | `frontend/src/utils/pick-image.ts`, `read-asset-bytes.ts` | Web file input vs native picker | S |
| PLT-08 | `frontend/src/components/RemoteImage.tsx`, `ProductQr.tsx`, `UI.tsx`, `catalog.tsx` | Web-only image or CSS outline tweaks | S |
| PLT-09 | `frontend/src/utils/import-templates.ts` | Web uses a temporary `<a download>`; other platforms use `Linking` | S |
| PLT-10 | Login and register | iOS keyboard avoiding only | S |

---

## 11. Build, deploy, env

| ID | Item | Fact | Size |
|---|---|---|---|
| BLD-01 | Run locally | `frontend/package.json`: `npx expo start`, `expo start --web`. API: `uvicorn` from `backend/` (see `README.md` and `DASHBOARD.md`) | M |
| BLD-02 | Bundler | `frontend/metro.config.js`. `maxWorkers = 2`. Web output in `app.json`: Metro, `output: "single"` | M |
| BLD-03 | Expo config | `frontend/app.json`. Name Shivani Admin. Scheme `shivaniadmin`. New architecture enabled. iOS bundle `com.shivaniconstructions.admin`. Android package the same | S |
| BLD-04 | Env | `EXPO_PUBLIC_BACKEND_URL` in `frontend/src/config/env.ts`. Default `http://127.0.0.1:8000`. `.env` files are gitignored | S |
| BLD-05 | Hosting file | `frontend/vercel.json` rewrites every path to `/` (SPA). Whether production is Vercel or a VPS: the code comments in `env.ts` mention both. Live API string in root `README.md`: `https://python-api-6aft.onrender.com`. Current VPS process: unknown | M |
| BLD-06 | Docker / nginx | No Dockerfile and no nginx file found in the repo | S |
| BLD-07 | Guards | `frontend/scripts/cmd-guard.js` runs on `preinstall`. `install-guard.sh`, `reset-project.js`, `sync-shims.sh` also exist. What the guard blocks: unknown (not opened) | S |
| BLD-08 | Package manager | `package.json` says Yarn 1.22.22. A `package-lock.json` is also present | S |

---

## 12. Tests

| ID | Path | Lines | What | Size |
|---|---|---|---|---|
| TST-01 | `backend/tests/test_quotation_api.py` | 557 | API tests (pytest). Not a UI test | M |
| TST-02 | `test_reports/iteration_1.json` | unknown | Old written test report for an earlier quotation flow | S |
| TST-03 | Frontend | none found (`*.test.ts`, `*.spec.tsx` search returned no files) | — | S |

---

## 13. Unclear, dead, duplicated, risky

| ID | Item | Fact | Size |
|---|---|---|---|
| RSK-01 | No route guard | Direct admin URLs are not redirected when logged out (NAV-04) | M |
| RSK-02 | `LogBox.ignoreAllLogs(true)` | Hides all RN warnings | S |
| RSK-03 | Catalog download | Screen builds a short CSV. It is not the master sheet columns in `frontend/src/utils/import-templates.ts` | M |
| RSK-04 | Unused client functions | SVC-11, SVC-13, SVC-17, SVC-22, SVC-35, SVC-45, SVC-54, SVC-61 have no screen import | M |
| RSK-05 | ST-02 draft | Not imported by any file under `frontend/app/` | M |
| RSK-06 | Two backends | `backend/server.py` and `backend_refactor/`. `.gitignore` ignores `backend_refactor/` but those files are still tracked from an earlier commit | L |
| RSK-07 | Dense screens | Inventory, partners, team, racks, dispatches, purchases are few lines because each return is one long line. Hard to review | M |
| RSK-08 | `@react-native-community/cli` version `latest` | Version is not pinned | S |
| RSK-09 | Wipe catalog | SCR-24 can delete the catalog. Passcode modal is the only gate found | L |
| RSK-10 | CSV export via `Linking.openURL(data:...)` | Works inside Expo web. Easy to break in a normal browser if copied as-is | S |
| RSK-11 | Notes not in git | `.gitignore` ignores `demo-notes/` and `docs/`. Older demo notes are tracked because they were committed before the ignore. Newer notes on this disk may be missing on the other PC | M |
| RSK-12 | Partner app | Not in this frontend. Out of this inventory | — |

---

## Suggested phase order

Proposal only. Each row is one later phase. Do not start from this file.

1. **Shell and login** — DEP-02, RN-05, RN-10, SCR-01, SCR-02, ST-01, SVC-00, SVC-02. Everything else needs a signed-in shell.
2. **UI kit** — CMP-01, CMP-05. List screens all use them.
3. **Categories** — SCR-05, CMP-03, CMP-04. Products and subcategories need categories.
4. **Subcategories** — SCR-07. Product form subcategory picker needs this data.
5. **Brands** — SCR-09.
6. **Product types and product classes** — SCR-06, SCR-08, CMP-09, UTL-15. Settings tab flags can wait until SCR-24, but the screens can ship with both tabs visible.
7. **Products** — SCR-10, CMP-07, UTL-03, UTL-04. Largest screen. Do it after category, subcategory, and brand.
8. **Product groups** — SCR-11, CMP-10.
9. **Spreadsheet import** — SCR-12 through SCR-16, CMP-08, UTL-06, UTL-07, UTL-08, RN-11. Depends on the same catalog APIs as step 7. Do not change column rules while moving the screen.
10. **Racks, purchases, inventory** — SCR-17, SCR-18, SCR-19. Purchases need racks and catalog lookup.
11. **Partners, RFQs, dispatch** — SCR-20, SCR-21, SCR-22. RFQ is the large one and calls dispatch.
12. **Money config, settings, team, dashboard** — SCR-23, SCR-24, SCR-25, SCR-04. Dashboard only reads data the other screens already write.
13. **Register** — SCR-03. Optional; login is enough to operate.
14. **Remove Expo** — DEP-03 through DEP-11, only after the screens above are checked in the browser.

Leave the FastAPI app as it is through all of these steps.
