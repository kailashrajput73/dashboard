# 21a Completeness Scan

Date: 2026-10-13
Scope: read-only source comparison of current Expo (`frontend/`) and React (`web/`). App code is unchanged. Inventory used: `docs/migration/INVENTORY.md`; `migration/INVENTORY.md` is absent, while `migration/INVENTORYmd` is a duplicate-name file and was not used as the authoritative source. Prior parity-gap audit reviewed: `migration/dev/2026-10-07-sync-audit.md`. A separate note called “detail check” could not be identified among `migration/dev/*.md`; NOT CHECKED as a separate artifact. Earlier findings were treated as leads and rechecked against current source.

## Section Checklist

Sections done: A, B, C, D, E, F, G, H, I, J, K
Pending: none

## Counts

Counts are section-level item verdicts; items are assigned once to one section. `NOT CHECKED` means no conclusion is claimed.

| Section | PRESENT | MISSING | DIFFERENT | SKIPPED BY DESIGN | NOT CHECKED |
|---|---:|---:|---:|---:|---:|
| A. Screens and routes | 28 | 1 | 0 | 0 | 0 |
| B. Menu | 24 | 0 | 0 | 0 | 0 |
| C. Handlers and controls | 7 | 0 | 18 | 0 | 0 |
| D. API | 70 | 0 | 2 | 3 | 0 |
| E. Shared parts | 57 | 0 | 0 | 14 | 0 |
| F. Storage/env/constants | 11 | 0 | 1 | 7 | 0 |
| G. CSV and files | 20 | 0 | 1 | 0 | 0 |
| H. RN-only APIs | 5 | 0 | 0 | 4 | 0 |
| I. Assets | 35 | 0 | 18 | 3 | 1 |
| J. Build/deploy | 2 | 0 | 1 | 0 | 1 |
| K. Web-only additions | 2 | 0 | 5 | 0 | 0 |

Severity counts: BLOCKER 1, BEHAVIOUR 6, COSMETIC 1, DOC-ONLY 1.

## A. Screens and routes

Command: `python3 - <<'PY'` (recursive file enumerator and Expo Router filename-to-route derivation). Raw count printed: `RAW_COUNT files_under_frontend_app=28`.

```python
from pathlib import Path
root=Path('frontend/app')
files=sorted(p for p in root.rglob('*') if p.is_file())
print(f'RAW_COUNT files_under_frontend_app={len(files)}')
for p in files:
	rel=p.relative_to(root).as_posix()
	stem=rel.rsplit('.',1)[0] if '.' in rel else rel
	route='/' + stem
	if route.endswith('/index'): route=route[:-6] or '/'
	route=route.replace('/(admin)','')
	if route == '/+html': route='HTML document shell (not route)'
	if route.endswith('/_layout'): route='layout (not route)'
	print(f'{rel}\t{route}')
PY
```

Web-route command: `python3 - <<'PY'` counted `<Route path` declarations in `web/src/App.tsx` and printed each path/component/line. Raw count printed: `RAW_COUNT web_route_declarations=26`.

| Expo file:line | Expo route | Web file:line | Web route | Verdict | Note |
|---|---|---|---|---|---|
| `frontend/app/index.tsx:10` | `/` | `web/src/App.tsx:31`; `web/src/components/StartupRedirect.tsx:5` | `/` | PRESENT | Both read session then redirect to dashboard or login. |
| `frontend/app/(admin)/login.tsx:1` | `/login` | `web/src/App.tsx:32`; `web/src/pages/LoginPage.tsx:1` | `/login` | PRESENT | Route element is `LoginPage`. |
| `frontend/app/(admin)/register.tsx:1` | `/register` | `web/src/App.tsx:33`; `web/src/pages/RegisterPage.tsx:1` | `/register` | PRESENT | Route element is `RegisterPage`. |
| `frontend/app/(admin)/dashboard.tsx:1` | `/dashboard` | `web/src/App.tsx:35`; `web/src/pages/DashboardPage.tsx:1` | `/dashboard` | PRESENT | Route element is `DashboardPage`. |
| `frontend/app/(admin)/catalog.tsx:1` | `/catalog` | `web/src/App.tsx:36`; `web/src/pages/CatalogPage.tsx:1` | `/catalog` | PRESENT | Route element is `CatalogPage`. |
| `frontend/app/(admin)/categories.tsx:1` | `/categories` | `web/src/App.tsx:37`; `web/src/pages/CategoriesPage.tsx:1` | `/categories` | PRESENT | Route element is `CategoriesPage`. |
| `frontend/app/(admin)/product-types.tsx:1` | `/product-types` | `web/src/App.tsx:38`; `web/src/pages/ProductTypesPage.tsx:1` | `/product-types` | PRESENT | Route element is `ProductTypesPage`. |
| `frontend/app/(admin)/subcategories.tsx:1` | `/subcategories` | `web/src/App.tsx:39`; `web/src/pages/SubcategoriesPage.tsx:1` | `/subcategories` | PRESENT | Route element is `SubcategoriesPage`. |
| `frontend/app/(admin)/product-classes.tsx:1` | `/product-classes` | `web/src/App.tsx:40`; `web/src/pages/ProductClassesPage.tsx:1` | `/product-classes` | PRESENT | Route element is `ProductClassesPage`. |
| `frontend/app/(admin)/brands.tsx:1` | `/brands` | `web/src/App.tsx:41`; `web/src/pages/BrandsPage.tsx:1` | `/brands` | PRESENT | Route element is `BrandsPage`. |
| `frontend/app/(admin)/product-groups.tsx:1` | `/product-groups` | `web/src/App.tsx:42`; `web/src/pages/ProductGroupsPage.tsx:1` | `/product-groups` | PRESENT | Route element is `ProductGroupsPage`. |
| `frontend/app/(admin)/csv-import.tsx:1` | `/csv-import` | `web/src/App.tsx:43`; `web/src/pages/SpreadsheetImportsPage.tsx:1` | `/csv-import` | PRESENT | Import hub. |
| `frontend/app/(admin)/import-products.tsx:1` | `/import-products` | `web/src/App.tsx:44`; `web/src/pages/CatalogImportPage.tsx:1` | `/import-products` | PRESENT | Master import. |
| `frontend/app/(admin)/import-products-batch.tsx:1` | `/import-products-batch` | `web/src/App.tsx:45`; `web/src/pages/CatalogImportPage.tsx:1` | `/import-products-batch` | PRESENT | Master import with `batch`. |
| `frontend/app/(admin)/import-prices.tsx:1` | `/import-prices` | `web/src/App.tsx:46`; `web/src/pages/CatalogImportPage.tsx:1` | `/import-prices` | PRESENT | Pricing import. |
| `frontend/app/(admin)/import-stock.tsx:1` | `/import-stock` | `web/src/App.tsx:47`; `web/src/pages/CatalogImportPage.tsx:1` | `/import-stock` | PRESENT | Stock import. |
| `frontend/app/(admin)/racks.tsx:1` | `/racks` | `web/src/App.tsx:48`; `web/src/pages/RacksPage.tsx:1` | `/racks` | PRESENT | Route element is `RacksPage`. |
| `frontend/app/(admin)/purchases.tsx:1` | `/purchases` | `web/src/App.tsx:49`; `web/src/pages/PurchasesPage.tsx:1` | `/purchases` | PRESENT | Route element is `PurchasesPage`. |
| `frontend/app/(admin)/inventory.tsx:1` | `/inventory` | `web/src/App.tsx:50`; `web/src/pages/InventoryPage.tsx:1` | `/inventory` | PRESENT | Route element is `InventoryPage`. |
| `frontend/app/(admin)/rfqs.tsx:1` | `/rfqs` | `web/src/App.tsx:51`; `web/src/pages/RfqsPage.tsx:1` | `/rfqs` | PRESENT | Route element is `RfqsPage`. |
| `frontend/app/(admin)/partners.tsx:1` | `/partners` | `web/src/App.tsx:52`; `web/src/pages/PartnersPage.tsx:1` | `/partners` | PRESENT | Route element is `PartnersPage`. |
| `frontend/app/(admin)/dispatches.tsx:1` | `/dispatches` | `web/src/App.tsx:53`; `web/src/pages/DispatchesPage.tsx:1` | `/dispatches` | PRESENT | Route element is `DispatchesPage`. |
| `frontend/app/(admin)/service-requests.tsx:1` | `/service-requests` | `web/src/App.tsx:54`; `web/src/pages/ServiceRequestsPage.tsx:1` | `/service-requests` | PRESENT | Route element is `ServiceRequestsPage`. |
| `frontend/app/(admin)/settings.tsx:1` | `/settings` | `web/src/App.tsx:56`; `web/src/pages/SettingsPage.tsx:1` | `/settings` | PRESENT | Route element is `SettingsPage`. |
| `frontend/app/(admin)/team.tsx:1` | `/team` | `web/src/App.tsx:57`; `web/src/pages/TeamPage.tsx:1` | `/team` | PRESENT | Route element is `TeamPage`. |
| `frontend/app/_layout.tsx:20` | root stack layout | `web/src/App.tsx:28`; `web/src/main.tsx:1` | BrowserRouter/application root | PRESENT | Framework-specific stack/root composition. Platform-only behavior is checked separately in Section H. |
| `frontend/app/(admin)/_layout.tsx:7` | admin stack layout | `web/src/App.tsx:34` | admin route layout | PRESENT | Both place `AdminShell` around admin routes. |
| `frontend/app/+html.tsx:5` | Expo web document shell | `web/index.html:1` | Vite document shell | PRESENT | Separate framework-specific HTML documents. |
| no equivalent | no current Expo `/money-config` file | `web/src/App.tsx:55` | `/money-config` | MISSING | Web-only route to `EmptyPage`; Expo removed Money config from current navigation and has no route file. |

All 28 files under `frontend/app` are listed once: 25 routable entries (including `/`) and 3 layout/document files. The 26th web route declaration is the extra `/money-config` route; no Expo screen route is absent from web. This is source registration only and does not establish deployed deep-link reload behavior (Section J).

## B. Menu / sidebar
Command: `python3 - <<'PY'` counts source lines with a literal `href`+`label` pair, five literal section titles, and the rendered sign-out label in both `AdminShell.tsx` files. Raw counts printed: `frontend ... nav_items=18 headings=5 sign_out=1 compared_total=24`; `web ... nav_items=18 headings=5 sign_out=1 compared_total=24`.

The link order below is the default with both taxonomy flags true. Product type and Product class disappear when their respective saved flag is false; every other item is shown only when the admin shell is shown. Expo shell visibility: web platform and path not `/login` or `/register` (`frontend/src/components/AdminShell.tsx:76-78`, `102-103`). Web: the route parent is the AdminShell for admin routes; login/register are outside it (`web/src/App.tsx:32-34`).

| Expo label | Order | URL | Expo visibility | Web label | Order | URL | Web visibility | Match |
|---|---:|---|---|---|---:|---|---|---|
| Overview (heading) | 1 | no URL | Expo sidebar shown | Overview (heading) | 1 | no URL | Admin routes | MATCH |
| Dashboard | 1 | `/dashboard` | sidebar shown | Dashboard | 1 | `/dashboard` | Admin routes | MATCH |
| Catalog (heading) | 2 | no URL | Expo sidebar shown | Catalog (heading) | 2 | no URL | Admin routes | MATCH |
| Products | 2 | `/catalog` | sidebar shown | Products | 2 | `/catalog` | Admin routes | MATCH |
| Categories | 3 | `/categories` | sidebar shown | Categories | 3 | `/categories` | Admin routes | MATCH |
| Product type | 4 | `/product-types` | `showProductType` true | Product type | 4 | `/product-types` | `showProductType` true | MATCH |
| Subcategories | 5 | `/subcategories` | sidebar shown | Subcategories | 5 | `/subcategories` | Admin routes | MATCH |
| Product class | 6 | `/product-classes` | `showProductClass` true | Product class | 6 | `/product-classes` | `showProductClass` true | MATCH |
| Brands | 7 | `/brands` | sidebar shown | Brands | 7 | `/brands` | Admin routes | MATCH |
| Product groups | 8 | `/product-groups` | sidebar shown | Product groups | 8 | `/product-groups` | Admin routes | MATCH |
| Spreadsheet imports | 9 | `/csv-import` | sidebar shown | Spreadsheet imports | 9 | `/csv-import` | Admin routes | MATCH |
| Warehouse (heading) | 3 | no URL | Expo sidebar shown | Warehouse (heading) | 3 | no URL | Admin routes | MATCH |
| Racks | 10 | `/racks` | sidebar shown | Racks | 10 | `/racks` | Admin routes | MATCH |
| Purchases | 11 | `/purchases` | sidebar shown | Purchases | 11 | `/purchases` | Admin routes | MATCH |
| Inventory | 12 | `/inventory` | sidebar shown | Inventory | 12 | `/inventory` | Admin routes | MATCH |
| Sales (heading) | 4 | no URL | Expo sidebar shown | Sales (heading) | 4 | no URL | Admin routes | MATCH |
| RFQs | 13 | `/rfqs` | sidebar shown | RFQs | 13 | `/rfqs` | Admin routes | MATCH |
| Partners | 14 | `/partners` | sidebar shown | Partners | 14 | `/partners` | Admin routes | MATCH |
| Service requests | 15 | `/service-requests` | sidebar shown | Service requests | 15 | `/service-requests` | Admin routes | MATCH |
| Dispatch | 16 | `/dispatches` | sidebar shown | Dispatch | 16 | `/dispatches` | Admin routes | MATCH |
| Admin (heading) | 5 | no URL | Expo sidebar shown | Admin (heading) | 5 | no URL | Admin routes | MATCH |
| Settings | 17 | `/settings` | sidebar shown | Settings | 17 | `/settings` | Admin routes | MATCH |
| Team | 18 | `/team` | sidebar shown | Team | 18 | `/team` | Admin routes | MATCH |
| Sign out | bottom action | no URL | sidebar shown; clears session, replace to login | Sign out | bottom action | no URL | Admin routes; clears session, replace to login | MATCH |

Source anchors: Expo `buildNav`/`catalogNav` at `frontend/src/components/AdminShell.tsx:19-72`, hide-on-auth/native condition at `:102-103`, sign-out at `:97-100` and label at `:160-161`. Web `buildNav`/`catalogNav` at `web/src/components/AdminShell.tsx:21-74`, sign-out at `:91-94` and label at `:141-147`. All 18 visible-by-default links, all 5 headings, and sign-out match. `/money-config` is not a sidebar item in either file; its stale router registration is counted once in Section A.
## C. Handlers and controls
Command: `python3 - <<'PY'` recursively selected every `.tsx` route file under `frontend/app` except `_layout.tsx` and `+html.tsx`, mapped route elements through `web/src/App.tsx` imports, then counted requested JSX callback props and literal control tags. Handler regexes: Expo `onPress|onLongPress|onChangeText|onSubmitEditing|onValueChange|onRefresh|onRequestClose` followed by `=`; web `onClick|onChange|onSubmit|onKeyDown` followed by `=`. Control regexes: Expo `<Pressable|TextInput|Switch|Modal`; web `<button|input|select|dialog`. Raw count printed: `RAW_COUNT expo_screen_files=25 equal_count_rows=7 different_count_rows=18`.

Counts below are syntactic occurrences in each route file and its directly registered web page file. Imported child/shared components and hooks are not counted here. Thin route wrappers therefore show zero at this layer. Equality means only equal raw counts, not semantic equivalence. Every mismatch is explained in its row.

| Screen | Expo handlers | Web handlers | Expo controls | Web controls | Explanation of every count difference |
|---|---:|---:|---:|---:|---|
| `frontend/app/(admin)/brands.tsx:1` / `web/src/pages/BrandsPage.tsx:1` | 12 | 6 | 0 | 8 | Expo has 6 more native callback props; Expo controls are shared UI abstractions, web has 8 literal HTML tags. |
| `frontend/app/(admin)/catalog.tsx:1` / `web/src/pages/CatalogPage.tsx:1` | 59 | 5 | 10 | 10 | Expo has 54 more native callback props; web delegates callback plumbing through shared components. Control counts equal. |
| `frontend/app/(admin)/categories.tsx:1` / `web/src/pages/CategoriesPage.tsx:1` | 12 | 6 | 0 | 8 | Expo has 6 more native callback props; Expo uses shared controls, web has 8 literal HTML tags. |
| `frontend/app/(admin)/csv-import.tsx:1` / `web/src/pages/SpreadsheetImportsPage.tsx:1` | 1 | 1 | 1 | 1 | No count difference. |
| `frontend/app/(admin)/dashboard.tsx:1` / `web/src/pages/DashboardPage.tsx:1` | 28 | 19 | 4 | 3 | Expo has 9 more callback props and 1 more control tag; component composition differs. |
| `frontend/app/(admin)/dispatches.tsx:1` / `web/src/pages/DispatchesPage.tsx:1` | 20 | 5 | 0 | 19 | Expo has 15 more callback props; Expo controls are abstracted, web has 19 literal HTML tags. |
| `frontend/app/(admin)/import-prices.tsx:1` / `web/src/pages/CatalogImportPage.tsx:1` | 0 | 0 | 0 | 0 | No count difference in thin route/page registration; importer UI is delegated. |
| `frontend/app/(admin)/import-products-batch.tsx:1` / `web/src/pages/CatalogImportPage.tsx:1` | 0 | 0 | 0 | 0 | No count difference in thin route/page registration; importer UI is delegated. |
| `frontend/app/(admin)/import-products.tsx:1` / `web/src/pages/CatalogImportPage.tsx:1` | 0 | 0 | 0 | 0 | No count difference in thin route/page registration; importer UI is delegated. |
| `frontend/app/(admin)/import-stock.tsx:1` / `web/src/pages/CatalogImportPage.tsx:1` | 0 | 0 | 0 | 0 | No count difference in thin route/page registration; importer UI is delegated. |
| `frontend/app/(admin)/inventory.tsx:1` / `web/src/pages/InventoryPage.tsx:1` | 7 | 1 | 0 | 4 | Expo has 6 more callback props; web has 4 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/login.tsx:1` / `web/src/pages/LoginPage.tsx:1` | 6 | 1 | 1 | 3 | Expo has 5 more callback props; web has 2 more literal HTML tags. |
| `frontend/app/(admin)/partners.tsx:1` / `web/src/pages/PartnersPage.tsx:1` | 22 | 5 | 1 | 19 | Expo has 17 more callback props; web has 18 more literal tags, reflecting different callback distribution and component abstraction. |
| `frontend/app/(admin)/product-classes.tsx:1` / `web/src/pages/ProductClassesPage.tsx:1` | 0 | 0 | 0 | 0 | No count difference in thin route/page registration; facet UI is delegated. |
| `frontend/app/(admin)/product-groups.tsx:1` / `web/src/pages/ProductGroupsPage.tsx:1` | 10 | 4 | 0 | 9 | Expo has 6 more callback props; web has 9 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/product-types.tsx:1` / `web/src/pages/ProductTypesPage.tsx:1` | 10 | 5 | 0 | 6 | Expo has 5 more callback props; web has 6 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/purchases.tsx:1` / `web/src/pages/PurchasesPage.tsx:1` | 18 | 6 | 0 | 16 | Expo has 12 more callback props; web has 16 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/racks.tsx:1` / `web/src/pages/RacksPage.tsx:1` | 10 | 4 | 0 | 10 | Expo has 6 more callback props; web has 10 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/register.tsx:1` / `web/src/pages/RegisterPage.tsx:1` | 6 | 1 | 1 | 5 | Expo has 5 more callback props; web has 4 more literal HTML tags. |
| `frontend/app/(admin)/rfqs.tsx:1` / `web/src/pages/RfqsPage.tsx:1` | 28 | 8 | 0 | 25 | Expo has 20 more callback props; web has 25 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/service-requests.tsx:1` / `web/src/pages/ServiceRequestsPage.tsx:1` | 9 | 1 | 4 | 6 | Expo has 8 more callback props; web has 2 more counted control tags. |
| `frontend/app/(admin)/settings.tsx:1` / `web/src/pages/SettingsPage.tsx:1` | 4 | 3 | 1 | 2 | Expo has 1 more callback prop; web has 1 more control tag. |
| `frontend/app/(admin)/subcategories.tsx:1` / `web/src/pages/SubcategoriesPage.tsx:1` | 14 | 9 | 0 | 13 | Expo has 5 more callback props; web has 13 literal HTML tags versus Expo shared controls. |
| `frontend/app/(admin)/team.tsx:1` / `web/src/pages/TeamPage.tsx:1` | 11 | 3 | 1 | 9 | Expo has 8 more callback props; web has 8 more literal HTML tags. |
| `frontend/app/index.tsx:1` / `web/src/components/StartupRedirect.tsx:1` | 0 | 0 | 0 | 0 | No count difference; both redirect in effects, outside the counted tokens. |

These count deltas are not independently classified as behavior defects. This lexical check does not count controls/handlers inside imported components or hooks, nor callbacks passed positionally; those are NOT CHECKED by this method.


## D. API
Command: `python3 - <<'PY'` counted exported `function` declarations and compared names, then scanned all TSX files in `frontend/` and `web/src` for calls; a second parser extracted each helper's method, path, request fields, cache setting and fallback branch. Raw counts printed: `frontend/src/api/endpoints.ts_exported_functions=73`; `web/src/api/endpoints.ts_exported_functions=70`; `shared=70 expo_only=3 web_only=0`; each client exports `writeAdminToken, apiRequest` (2 each).

The endpoint export definitions below are file:line anchors. Caller suffixes use `frontend/app/` for Expo screens and `web/src/` for web screens/features; `no screen call` means the exported helper is not called from a TSX UI file. For shared methods, request fields are stated once with `same` when both signatures match, or `Expo / web` when they do not. Default cache means no explicit fetch cache option. `ApiError` is generated by the shared API client for network, HTTP, and unsuccessful-envelope failures; catalog pricing and clear fallbacks retry only non-401/403 API errors (Expo client `frontend/src/api/client.ts:74-136`; web `web/src/api/client.ts:78-140`).

| Function | Expo definition | Web definition | Method / path | Request fields | Cache | Error handling | Expo screens calling | Web screens calling |
|---|---|---|---|---|---|---|---|
| `registerAdmin` | `frontend/src/api/endpoints.ts:253` | `web/src/api/endpoints.ts:231` | POST `/auth/admin/register` | same: companyName,gstin,contactNumber,passcode | default | shared ApiError | `register.tsx:45` | `RegisterPage.tsx:34` |
| `loginAdmin` | `frontend/src/api/endpoints.ts:267` | `web/src/api/endpoints.ts:245` | POST `/auth/admin/login` | same: contactNumber,passcode | default | shared ApiError | `register.tsx:51`, `login.tsx:40` | `RegisterPage.tsx:40`, `LoginPage.tsx:30` |
| `getDashboardSnapshot` | `frontend/src/api/endpoints.ts:277` | `web/src/api/endpoints.ts:255` | GET `/dashboard/snapshot` | none | default | shared ApiError | `dashboard.tsx:33` | `DashboardPage.tsx:45` |
| `listCategories` | `frontend/src/api/endpoints.ts:282` | `web/src/api/endpoints.ts:260` | GET `/categories` | none | default | shared ApiError | `subcategories.tsx:39`, `categories.tsx:34`, `catalog.tsx:144,330` | `SubcategoriesPage.tsx:57`, `CategoriesPage.tsx:48`, `CatalogPage.tsx:56`, `CatalogProductEditor.tsx:124` |
| `createCategory` | `frontend/src/api/endpoints.ts:287` | `web/src/api/endpoints.ts:265` | POST `/categories` | same: name,imageUrl | default | shared ApiError | `categories.tsx:79`, `catalog.tsx:325` | `CategoriesPage.tsx:135`, `CatalogProductEditor.tsx:119` |
| `updateCategory` | `frontend/src/api/endpoints.ts:294` | `web/src/api/endpoints.ts:272` | PUT `/categories/{id}` | same: id,name,isActive,imageUrl | default | shared ApiError | `categories.tsx:78,91` | `CategoriesPage.tsx:129,148` |
| `listBrands` | `frontend/src/api/endpoints.ts:301` | `web/src/api/endpoints.ts:279` | GET `/brands` | none | default | shared ApiError | `catalog.tsx:144`, `brands.tsx:33` | `CatalogPage.tsx:56`, `BrandsPage.tsx:48` |
| `createBrand` | `frontend/src/api/endpoints.ts:302` | `web/src/api/endpoints.ts:280` | POST `/brands` | same: name,logoUrl | default | shared ApiError | `brands.tsx:58` | `BrandsPage.tsx:137` |
| `updateBrand` | `frontend/src/api/endpoints.ts:303` | `web/src/api/endpoints.ts:281` | PUT `/brands/{id}` | same: id,name,isActive,logoUrl | default | shared ApiError | `brands.tsx:57,66` | `BrandsPage.tsx:131,152` |
| `listProductTypes` | `frontend/src/api/endpoints.ts:305` | `web/src/api/endpoints.ts:283` | GET `/product-types` | none | default | shared ApiError | `product-types.tsx:58` | `ProductTypesPage.tsx:63` |
| `createProductType` | `frontend/src/api/endpoints.ts:306` | `web/src/api/endpoints.ts:284` | POST `/product-types` | same: name,imageUrl | default | shared ApiError | no screen call | no screen call |
| `updateProductType` | `frontend/src/api/endpoints.ts:309` | `web/src/api/endpoints.ts:287` | PUT `/product-types/{id}` | same: id,name,isActive,imageUrl | default | shared ApiError | `product-types.tsx:100,112` | `ProductTypesPage.tsx:187,205` |
| `listCatalogTree` | `frontend/src/api/endpoints.ts:312` | `web/src/api/endpoints.ts:290` | GET `/catalog/tree` | none | default | shared ApiError | no screen call | no screen call |
| `listProductGroups` | `frontend/src/api/endpoints.ts:316` | `web/src/api/endpoints.ts:294` | GET `/product-groups` | none | default | shared ApiError | `product-groups.tsx:32` | `ProductGroupsPage.tsx:51,67` |
| `createProductGroup` | `frontend/src/api/endpoints.ts:317` | `web/src/api/endpoints.ts:295` | POST `/product-groups` | same: name,productIds | default | shared ApiError | `product-groups.tsx:54` | `ProductGroupsPage.tsx:143` |
| `updateProductGroup` | `frontend/src/api/endpoints.ts:318` | `web/src/api/endpoints.ts:296` | PUT `/product-groups/{id}` | same: id,name,productIds | default | shared ApiError | `product-groups.tsx:54` | `ProductGroupsPage.tsx:138` |
| `deleteProductGroup` | `frontend/src/api/endpoints.ts:319` | `web/src/api/endpoints.ts:297` | DELETE `/product-groups/{id}` | id | default | shared ApiError | no screen call | no screen call |
| `listRacks` | `frontend/src/api/endpoints.ts:320` | `web/src/api/endpoints.ts:298` | GET `/racks` | none | default | shared ApiError | `purchases.tsx:101`, `racks.tsx:25` | `RacksPage.tsx:35,49`, `PurchasesPage.tsx:116` |
| `createRack` | `frontend/src/api/endpoints.ts:321` | `web/src/api/endpoints.ts:299` | POST `/racks` | same: name,rows,columns | default | shared ApiError | `racks.tsx:28` | `RacksPage.tsx:85` |
| `deleteRack` | `frontend/src/api/endpoints.ts:322` | `web/src/api/endpoints.ts:300` | DELETE `/racks/{id}` | id | default | shared ApiError | `racks.tsx:30` | `RacksPage.tsx:121` |
| `assignRackSlot` | `frontend/src/api/endpoints.ts:323` | `web/src/api/endpoints.ts:301` | PUT `/racks/{rackId}/assign` | same: rackId,productId,slotCode | default | shared ApiError | `racks.tsx:29` | `RacksPage.tsx:106` |
| `listRackProducts` | `frontend/src/api/endpoints.ts:324` | `web/src/api/endpoints.ts:302` | GET `/racks/{id}/products` | id | default | shared ApiError | no screen call | no screen call |
| `listPurchases` | `frontend/src/api/endpoints.ts:325` | `web/src/api/endpoints.ts:303` | GET `/purchases` | none | default | shared ApiError | `purchases.tsx:102` | `PurchasesPage.tsx:117` |
| `createPurchase` | `frontend/src/api/endpoints.ts:326` | `web/src/api/endpoints.ts:304` | POST `/purchases` | same: lines | default | shared ApiError | `purchases.tsx:174,265` | `PurchasesPage.tsx:207,299` |
| `listRfqs` | `frontend/src/api/endpoints.ts:327` | `web/src/api/endpoints.ts:305` | GET `/rfqs` | same: partner_id,status,search | default | shared ApiError | `rfqs.tsx:210`, `dispatches.tsx:146` | `RfqsPage.tsx:162`, `DispatchesPage.tsx:95` |
| `createRfq` | `frontend/src/api/endpoints.ts:328` | `web/src/api/endpoints.ts:306` | POST `/rfqs` | same: partnerId,lines,deliveryMode,scheduledAt? | default | shared ApiError | `rfqs.tsx:360` | `RfqsPage.tsx:299` |
| `updateRfq` | `frontend/src/api/endpoints.ts:329` | `web/src/api/endpoints.ts:307` | PUT `/rfqs/{id}` | same: id,partnerId,lines,deliveryMode,scheduledAt? | default | shared ApiError | `rfqs.tsx:442` | `RfqsPage.tsx:354` |
| `approveRfq` | `frontend/src/api/endpoints.ts:330` | `web/src/api/endpoints.ts:308` | POST `/rfqs/{id}/approve` | same: id,approved,specialDiscountPercent,rewardPoints,deliveryMode?,scheduledAt? | default | shared ApiError | `rfqs.tsx:464` | `RfqsPage.tsx:370` |
| `rfqHistory` | `frontend/src/api/endpoints.ts:331` | `web/src/api/endpoints.ts:309` | GET `/rfqs/{id}/history` | id | default | shared ApiError | `rfqs.tsx:384,450` | `RfqsPage.tsx:320` |
| `listDispatches` | `frontend/src/api/endpoints.ts:332` | `web/src/api/endpoints.ts:310` | GET `/dispatches` | none | default | shared ApiError | `dispatches.tsx:143` | `DispatchesPage.tsx:95` |
| `createDispatch` | `frontend/src/api/endpoints.ts:333` | `web/src/api/endpoints.ts:311` | POST `/dispatches` | same: lines,sourceRfqId?,customerName?,customerPhone? | default | shared ApiError | `rfqs.tsx:488`, `dispatches.tsx:237,262` | `RfqsPage.tsx:394`, `DispatchesPage.tsx:189,211` |
| `listServiceRequests` | `frontend/src/api/endpoints.ts:334` | `web/src/api/endpoints.ts:312` | GET `/service-requests` | DIFFERENT: Expo accepts `service_type,status,search,created_from,created_to` query; web takes no args | default | shared ApiError | `service-requests.tsx:45` | `ServiceRequestsPage.tsx:60,67` |
| `createServiceRequest` | `frontend/src/api/endpoints.ts:337` | no equivalent | POST `/service-requests` | serviceType,customerName,customerPhone,description,address?,pincode?,city?,area? | default; auth=false | shared ApiError | no screen call (public helper) | no equivalent |
| `getServiceRequest` | `frontend/src/api/endpoints.ts:347` | no equivalent | GET `/service-requests/{id}` | id | default | shared ApiError | no screen call (public helper) | no equivalent |
| `updateServiceRequest` | `frontend/src/api/endpoints.ts:348` | `web/src/api/endpoints.ts:313` | PATCH `/service-requests/{id}` | same: id,status?,recommendedName?,recommendedPhone?,adminNote?,actor?,note?; web uses `ServiceRequest["status"]` alias | default | shared ApiError | `service-requests.tsx:110` | `ServiceRequestsPage.tsx:112` |
| `serviceRequestHistory` | `frontend/src/api/endpoints.ts:356` | no equivalent | GET `/service-requests/{id}/history` | id | default | shared ApiError | no screen call (public helper) | no equivalent |
| `listInventory` | `frontend/src/api/endpoints.ts:357` | `web/src/api/endpoints.ts:321` | GET `/inventory` | none | default | shared ApiError | `inventory.tsx:77` | `InventoryPage.tsx:75` |
| `listLowStock` | `frontend/src/api/endpoints.ts:358` | `web/src/api/endpoints.ts:322` | GET `/inventory/low-stock` | none | default | shared ApiError | `inventory.tsx:77` | `InventoryPage.tsx:76` |
| `listInventoryTransactions` | `frontend/src/api/endpoints.ts:359` | `web/src/api/endpoints.ts:323` | GET `/inventory/transactions` | none | default | shared ApiError | `inventory.tsx:77` | `InventoryPage.tsx:77` |
| `registerPartner` | `frontend/src/api/endpoints.ts:360` | `web/src/api/endpoints.ts:324` | POST `/partners/register` | same: Partner fields except id,kycStatus,locationVerified,rewardBalance,rfqCount | default | shared ApiError | no screen call | no screen call |
| `listPartners` | `frontend/src/api/endpoints.ts:361` | `web/src/api/endpoints.ts:325` | GET `/partners` | same: search,kyc_status,sales_manager | default | shared ApiError | `rfqs.tsx:212`, `dispatches.tsx:145`, `partners.tsx:110,123` | `PartnersPage.tsx:116,134`, `RfqsPage.tsx:162`, `DispatchesPage.tsx:95` |
| `getPartner` | `frontend/src/api/endpoints.ts:362` | `web/src/api/endpoints.ts:326` | GET `/partners/{id}` | id | default | shared ApiError | `partners.tsx:154,167` | `PartnersPage.tsx:179,192` |
| `createPartnerAdmin` | `frontend/src/api/endpoints.ts:363` | `web/src/api/endpoints.ts:327` | POST `/partners` | same: PartnerAdminCreate alias | default | shared ApiError | `partners.tsx:224` | `PartnersPage.tsx:249` |
| `reviewPartnerKyc` | `frontend/src/api/endpoints.ts:364` | `web/src/api/endpoints.ts:328` | PUT `/partners/{id}/kyc` | same: id,approved,locationVerified,rejectionReason? | default | shared ApiError | `partners.tsx:186` | `PartnersPage.tsx:211` |
| `getPartnerRewards` | `frontend/src/api/endpoints.ts:365` | `web/src/api/endpoints.ts:329` | GET `/partners/{id}/rewards` | id | default | shared ApiError | `partners.tsx:155,170` | `PartnersPage.tsx:180,195` |
| `listTeamUsers` | `frontend/src/api/endpoints.ts:366` | `web/src/api/endpoints.ts:330` | GET `/team/users` | none | `no-store` | shared ApiError | `team.tsx:41` | `TeamPage.tsx:51,60` |
| `createTeamUser` | `frontend/src/api/endpoints.ts:367` | `web/src/api/endpoints.ts:331` | POST `/team/users` | DIFFERENT signature: Expo `name,contactNumber,role,passcode,permissions?`; web also types optional `isActive` (screen sends it on both) | default | shared ApiError | `team.tsx:119` | `TeamPage.tsx:118` |
| `updateTeamUser` | `frontend/src/api/endpoints.ts:368` | `web/src/api/endpoints.ts:332` | PUT `/team/users/{id}` | same: id,name,contactNumber,role,isActive,permissions? | default | shared ApiError | `team.tsx:116,135` | `TeamPage.tsx:115,132` |
| `listSubcategories` | `frontend/src/api/endpoints.ts:370` | `web/src/api/endpoints.ts:334` | GET `/subcategories` | same: categoryId? maps to `category_id` query | default | shared ApiError | `subcategories.tsx:39`, `catalog.tsx:144` | `SubcategoriesPage.tsx:58`, `CatalogPage.tsx:56` |
| `createSubcategory` | `frontend/src/api/endpoints.ts:374` | `web/src/api/endpoints.ts:338` | POST `/subcategories` | same: name,categoryId | default | shared ApiError | `subcategories.tsx:101` | `SubcategoriesPage.tsx:171` |
| `updateSubcategory` | `frontend/src/api/endpoints.ts:378` | `web/src/api/endpoints.ts:342` | PUT `/subcategories/{id}` | same: id,name,categoryId | default | shared ApiError | `subcategories.tsx:100` | `SubcategoriesPage.tsx:166` |
| `deleteSubcategory` | `frontend/src/api/endpoints.ts:382` | `web/src/api/endpoints.ts:346` | DELETE `/subcategories/{id}` | id | default | shared ApiError | no screen call | no screen call |
| `importSubcategories` | `frontend/src/api/endpoints.ts:386` | `web/src/api/endpoints.ts:350` | POST `/subcategories/import` | same: items of name,categoryId?,category? | default | shared ApiError | `subcategories.tsx:145` | `SubcategoriesPage.tsx:238` |
| `listCatalog` | `frontend/src/api/endpoints.ts:393` | `web/src/api/endpoints.ts:357` | GET `/catalog` | same: category,search,groupId,filters(type,brand,productGroup,subcategory,productClass,sizeMm) | default | shared ApiError | `purchases.tsx:100`, `product-groups.tsx:32`, `subcategories.tsx:39`, `rfqs.tsx:211`, `dispatches.tsx:144`, `categories.tsx:34`, `catalog.tsx:144`, `brands.tsx:33`, `product-types.tsx:55`, `racks.tsx:25`; taxonomy feature `CatalogFacetPage.tsx:54` | `ProductGroupsPage.tsx:52,67`, `RfqsPage.tsx:162`, `RacksPage.tsx:36,49`, `SubcategoriesPage.tsx:59`, `CatalogPage.tsx:56`, `ProductTypesPage.tsx:59`, `BrandsPage.tsx:48`, `CategoriesPage.tsx:48`, `DispatchesPage.tsx:95`, `PurchasesPage.tsx:115`, `CatalogFacetPage.tsx:39,49` |
| `createCatalogItem` | `frontend/src/api/endpoints.ts:417` | `web/src/api/endpoints.ts:381` | POST `/catalog` | same fields: name,category,unit,standardRate,brandId,subcategory?,subcategoryId?,aliases?,multilingualNames?,displaySequence?,reorderLevel?,regularDiscount?,productGroupIds?,imageUrl?,imageName?,productCode?,productName?,type?,productGroup?,size?,sizeMm?,sizeInch?,length?,brand?,hsnCode?,gstRate?,stdPkg?,mrpPkg?,mrp?,sellingPrice?,purchasePrice?,discount?,stock?,isActive? | default | shared ApiError | `catalog.tsx:276` | `CatalogPage.tsx:195` |
| `updateCatalogItem` | `frontend/src/api/endpoints.ts:457` | `web/src/api/endpoints.ts:421` | PUT `/catalog/{id}` | same catalog fields as create plus id | default | shared ApiError | `catalog.tsx:275` | `CatalogPage.tsx:194` |
| `applyCatalogPricingBulk` | `frontend/src/api/endpoints.ts:496` | `web/src/api/endpoints.ts:460` | POST `/catalog/pricing-bulk`; fallback to per-item patch | items,mrp?,discount?,stock? | default | retries non-401/403 via `updateCatalogPricing`; per-item failures counted skipped | `catalog.tsx:354`, `frontend/src/features/shelf-price-board/ShelfPriceBoard.tsx:135` | `CatalogPage.tsx:233`, `ShelfPriceBoard.tsx:135` |
| `updateCatalogPricing` | `frontend/src/api/endpoints.ts:529` | `web/src/api/endpoints.ts:493` | PATCH `/catalog/{item.id}/pricing`; fallback PUT `/catalog/{id}` | item,mrp?,sellingPrice?,discount?,stock? | default | retries non-401/403 using full `updateCatalogItem` body | `catalog.tsx:1078`, `ShelfPriceBoard.tsx:77` | `ShelfPriceBoard.tsx:104`, `CatalogPricingRow.tsx:67` |
| `deleteCatalogItem` | `frontend/src/api/endpoints.ts:560` | `web/src/api/endpoints.ts:524` | DELETE `/catalog/{id}` | id | default | shared ApiError | no screen call | no screen call |
| `wipeCatalogAll` | `frontend/src/api/endpoints.ts:567` | `web/src/api/endpoints.ts:531` | POST `/catalog/wipe-all` | same: contactNumber,passcode | default | shared ApiError | `settings.tsx:38` | `SettingsPage.tsx:37` |
| `deleteCatalogItemSecured` | `frontend/src/api/endpoints.ts:580` | `web/src/api/endpoints.ts:544` | POST `/catalog/{id}/delete-secured` | same: id,contactNumber,passcode | default | shared ApiError | `catalog.tsx:377` | `CatalogPage.tsx:209` |
| `deleteCategoryCascade` | `frontend/src/api/endpoints.ts:584` | `web/src/api/endpoints.ts:548` | POST `/categories/{id}/delete-cascade` | same: id,contactNumber,passcode | default | shared ApiError | `categories.tsx:102` | `CategoriesPage.tsx:169` |
| `deleteBrandCascade` | `frontend/src/api/endpoints.ts:591` | `web/src/api/endpoints.ts:555` | POST `/brands/{id}/delete-cascade` | same: id,contactNumber,passcode | default | shared ApiError | `brands.tsx:74` | `BrandsPage.tsx:173` |
| `deleteSubcategoryCascade` | `frontend/src/api/endpoints.ts:598` | `web/src/api/endpoints.ts:562` | POST `/subcategories/{id}/delete-cascade` | same: id,contactNumber,passcode | default | shared ApiError | `subcategories.tsx:113` | `SubcategoriesPage.tsx:191` |
| `deleteProductGroupCascade` | `frontend/src/api/endpoints.ts:605` | `web/src/api/endpoints.ts:569` | POST `/product-groups/{id}/delete-cascade` | same: id,contactNumber,passcode | default | shared ApiError | `product-groups.tsx:62` | `ProductGroupsPage.tsx:165` |
| `purgeCatalogByField` | `frontend/src/api/endpoints.ts:612` | `web/src/api/endpoints.ts:576` | POST `/catalog/purge-by-field` | same: contactNumber,passcode,field,value | default | shared ApiError | `product-types.tsx:123`, `CatalogFacetPage.tsx:83` | `ProductTypesPage.tsx:226`, `CatalogFacetPage.tsx:100` |
| `clearCatalog` | `frontend/src/api/endpoints.ts:625` | `web/src/api/endpoints.ts:589` | DELETE `/catalog`; fallback list + per-item DELETE | none | default | retries non-401/403 then deletes listed items | no screen call | no screen call |
| `importCatalog` | `frontend/src/api/endpoints.ts:641` | `web/src/api/endpoints.ts:605` | POST `/catalog/import` | same: items,categoryMode,overrideCategory,replaceExisting? | default | shared ApiError | no screen call | no screen call |
| `importCatalogMaster` | `frontend/src/api/endpoints.ts:678` | `web/src/api/endpoints.ts:642` | POST `/catalog/import/master` | same: items,categoryMode?,overrideCategory? | default | shared ApiError | `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:112,148` | `CatalogSpreadsheetImport.tsx:104` |
| `importCatalogPricing` | `frontend/src/api/endpoints.ts:693` | `web/src/api/endpoints.ts:657` | POST `/catalog/import/pricing` | same: items(productCode,mrp?,discount?,sellingPrice?) | default | shared ApiError | `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:121` | `CatalogSpreadsheetImport.tsx:114` |
| `importCatalogStock` | `frontend/src/api/endpoints.ts:702` | `web/src/api/endpoints.ts:666` | POST `/catalog/import/stock` | same: items(productCode,stock) | default | shared ApiError | `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:125` | `CatalogSpreadsheetImport.tsx:120` |
| `getMoneyConfig` | `frontend/src/api/endpoints.ts:712` | `web/src/api/endpoints.ts:676` | GET `/money-config/{adminId}` | adminId | default | shared ApiError | no screen call | no screen call |
| `updateMoneyConfig` | `frontend/src/api/endpoints.ts:717` | `web/src/api/endpoints.ts:681` | PUT `/money-config/{adminId}` | adminId plus `Omit<MoneyConfig,"id"|"adminId">` body | default | shared ApiError | no screen call | no screen call |
| `writeAdminToken` | `frontend/src/api/client.ts:44` | `web/src/api/client.ts:48` | local storage write/remove | token or null | N/A | storage errors propagate | session helpers (Section E) | session helpers (Section E) |
| `apiRequest` | `frontend/src/api/client.ts:74` | `web/src/api/client.ts:78` | dynamic HTTP method/path | path,method?,body?,query?,cache?,auth? | caller option; forwarded to fetch | network/HTTP/envelope failures throw `ApiError`; both parse JSON or raw text and attach bearer token by default | endpoint functions (all screens listed above) | endpoint functions (all screens listed above) |

Request helper comparison: 70 endpoint names are shared and paths/methods match. The three Expo-only public helpers occur once each in this table and have no current Expo screen caller; SKIPPED BY DESIGN for the web admin screen. `listServiceRequests` differs because Expo exposes query filters while web does not; both UI callers pass no arguments. `createTeamUser` differs in the accepted type only: web allows optional `isActive`, Expo type omits it, but both screen callsites construct and send `isActive`. `createCatalogItem`/`updateCatalogItem` field sets are equal; declaration property order differs only. Auth and error copy in the transport wrapper differ for framework env-variable names; behavior is otherwise shared (see F/J).


## E. Shared parts, hooks, state and utils
Command: `python3 - <<'PY'` recursively scanned `frontend/src/{components,hooks,state,utils,features}` for named exported function-like declarations and storage exports, then searched `web/src` for exported counterparts. Raw counts: `RAW_COUNT expo_shared_source_files=27`; `RAW_COUNT expo_named_export_declarations=90 unique_export_names=88`; selected shared component/hook/store/session/util function-like declarations=64; storage platform exports=4; quotation-draft model types=3.

Scope is exported components, hooks, session/store functions and utility functions; adjacent type-only API declarations and constants are listed in Sections F/G where applicable. `state/draft.ts` is an exported client store not imported by any Expo screen (inventory `docs/migration/INVENTORY.md` §4), so its exports are marked SKIPPED BY DESIGN rather than missing user functionality. Expo utility exports specifically handling native image/document file objects have browser substitutes in Sections G/H.

| Expo file:line | Export name | Web present in (file:line) | Verdict / note |
|---|---|---|---|
| `frontend/src/components/AdminShell.tsx:85` | `AdminShell` | `web/src/components/AdminShell.tsx:77` | PRESENT |
| `frontend/src/components/CoverImageField.tsx:9` | `CoverImageField` | `web/src/components/CoverImageField.tsx:6` | PRESENT |
| `frontend/src/components/LinkedProducts.tsx:11` | `ProductPeekList` | `web/src/components/LinkedProducts.tsx:48` (`List`) | PRESENT; renamed export |
| `frontend/src/components/LinkedProducts.tsx:39` | `ProductCountButton` | `web/src/components/LinkedProducts.tsx:11` (`CountButton`) | PRESENT; renamed export |
| `frontend/src/components/PasscodeConfirmModal.tsx:18` | `PasscodeConfirmModal` | `web/src/components/PasscodeConfirmModal.tsx:6` | PRESENT |
| `frontend/src/components/ProductQr.tsx:15` | `ProductQr` | `web/src/components/ProductQr.tsx:6` | PRESENT |
| `frontend/src/components/RemoteImage.tsx:29` | `RemoteImage` | `web/src/components/RemoteImage.tsx:16` | PRESENT |
| `frontend/src/components/UI.tsx:37` | `Button` | `web/src/components/UI.tsx:18` | PRESENT |
| `frontend/src/components/UI.tsx:116` | `Card` | `web/src/components/UI.tsx:110` | PRESENT |
| `frontend/src/components/UI.tsx:147` | `Input` | `web/src/components/UI.tsx:154` | PRESENT |
| `frontend/src/components/UI.tsx:197` | `Chip` | `web/src/components/UI.tsx:274` | PRESENT |
| `frontend/src/components/UI.tsx:233` | `AppModal` | `web/src/components/UI.tsx:461` | PRESENT |
| `frontend/src/components/UI.tsx:294` | `ErrorModal` | `web/src/components/UI.tsx:566` | PRESENT |
| `frontend/src/components/UI.tsx:321` | `Header` | `web/src/components/UI.tsx:318` | PRESENT |
| `frontend/src/components/UI.tsx:359` | `EmptyState` | `web/src/components/UI.tsx:393` | PRESENT |
| `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:35` | `CatalogSpreadsheetImport` | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx:33` | PRESENT |
| `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx:17` | `groupCatalogFacet` | `web/src/features/catalog-taxonomy/group-catalog-facet.ts:6` | PRESENT; moved to utility module |
| `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx:35` | `CatalogFacetPage` | `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx:20` | PRESENT |
| `frontend/src/features/catalog-taxonomy/settings.ts:22` | `getTaxonomyTabs` | `web/src/features/catalog-taxonomy/settings.ts:16` | PRESENT |
| `frontend/src/features/catalog-taxonomy/settings.ts:33` | `setTaxonomyTabs` | `web/src/features/catalog-taxonomy/settings.ts:27` | PRESENT |
| `frontend/src/features/shelf-price-board/ShelfPriceBoard.tsx:22` | `ShelfPriceBoard` | `web/src/features/shelf-price-board/ShelfPriceBoard.tsx:33` | PRESENT |
| `frontend/src/hooks/use-icon-fonts.ts:47` | `useIconFonts` | `web/src/components/Icon.tsx:1` | PRESENT as SVG icon imports; no font-loading hook export |
| `frontend/src/state/session.ts:9` | `saveAdmin` | `web/src/state/session.ts:9` | PRESENT |
| `frontend/src/state/session.ts:14` | `getAdmin` | `web/src/state/session.ts:14` | PRESENT |
| `frontend/src/state/session.ts:26` | `clearAdmin` | `web/src/state/session.ts:26` | PRESENT |
| `frontend/src/state/session.ts:31` | `fullSignOut` | `web/src/state/session.ts:31` | PRESENT |
| `frontend/src/state/draft.ts:8` | `DraftLine` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:51` | `useHydratedDraft` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:61` | `useDraftLines` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:65` | `addToDraft` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:87` | `updateLine` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:92` | `removeLine` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:97` | `clearDraft` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:102` | `getLineCount` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:107` | `MoneyConfigVisible` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:116` | `Totals` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/state/draft.ts:124` | `computeTotals` | no equivalent | SKIPPED BY DESIGN; draft store unused by Expo screens |
| `frontend/src/utils/csv.ts:35` | `normalizeHeader` | `web/src/utils/csv.ts:35` | PRESENT |
| `frontend/src/utils/csv.ts:130` | `parseCsvBytes` | `web/src/utils/csv.ts:130` | PRESENT |
| `frontend/src/utils/csv.ts:180` | `discountToPercent` | `web/src/utils/csv.ts:180` | PRESENT |
| `frontend/src/utils/csv.ts:189` | `recoverSizeInch` | `web/src/utils/csv.ts:189` | PRESENT |
| `frontend/src/utils/csv.ts:224` | `inferProductClass` | `web/src/utils/csv.ts:224`; `web/src/utils/infer-product-class.ts:1` | PRESENT |
| `frontend/src/utils/csv.ts:250` | `mapClientTaxonomy` | `web/src/utils/csv.ts:250` | PRESENT |
| `frontend/src/utils/csv.ts:286` | `gstToPercent` | `web/src/utils/csv.ts:286` | PRESENT |
| `frontend/src/utils/csv.ts:292` | `findHeaderRowIndex` | `web/src/utils/csv.ts:292` | PRESENT |
| `frontend/src/utils/csv.ts:307` | `tableToRowRecords` | `web/src/utils/csv.ts:307` | PRESENT |
| `frontend/src/utils/csv.ts:325` | `parseSizeCell` | `web/src/utils/csv.ts:325` | PRESENT |
| `frontend/src/utils/csv.ts:336` | `rowsToItems` | `web/src/utils/csv.ts:336` | PRESENT |
| `frontend/src/utils/csv.ts:519` | `rowsToMasterItems` | `web/src/utils/csv.ts:519` | PRESENT |
| `frontend/src/utils/csv.ts:538` | `rowsToPricingItems` | `web/src/utils/csv.ts:538` | PRESENT |
| `frontend/src/utils/csv.ts:568` | `rowsToStockItems` | `web/src/utils/csv.ts:568` | PRESENT |
| `frontend/src/utils/import-templates.ts:69` | `buildTemplateCsv` | `web/src/utils/import-templates.ts:69` | PRESENT |
| `frontend/src/utils/import-templates.ts:74` | `downloadImportTemplate` | `web/src/utils/import-templates.ts:74` | PRESENT |
| `frontend/src/utils/import-templates.ts:95` | `templateColumnSummary` | `web/src/utils/import-templates.ts:80` | PRESENT |
| `frontend/src/utils/money.ts:1` | `formatMoney` | `web/src/utils/money.ts:1` | PRESENT |
| `frontend/src/utils/pick-image.ts:5` | `pickImageAsDataUrl` | no equivalent | SKIPPED BY DESIGN; browser file input replacement checked in H |
| `frontend/src/utils/pricing.ts:1` | `roundMoney` | `web/src/utils/pricing.ts:1` | PRESENT |
| `frontend/src/utils/pricing.ts:5` | `sellingFromMrpDiscount` | `web/src/utils/pricing.ts:5` | PRESENT |
| `frontend/src/utils/pricing.ts:9` | `discountFromMrpSelling` | `web/src/utils/pricing.ts:9` | PRESENT |
| `frontend/src/utils/read-asset-bytes.ts:6` | `readAssetBytes` | no equivalent | SKIPPED BY DESIGN; web file bytes use browser File handling (H) |
| `frontend/src/utils/read-asset-bytes.ts:25` | `base64ToBytes` | no equivalent | SKIPPED BY DESIGN; native asset conversion utility |
| `frontend/src/utils/size.ts:1` | `sizeMmLabel` | `web/src/utils/size.ts:1` | PRESENT |
| `frontend/src/utils/size.ts:8` | `sizeInchLabel` | `web/src/utils/size.ts:12` | PRESENT |
| `frontend/src/utils/size.ts:12` | `sizeLengthLabel` | `web/src/utils/size.ts:16` | PRESENT |
| `frontend/src/utils/size.ts:16` | `formatProductSize` | `web/src/utils/size.ts:20` | PRESENT |
| `frontend/src/utils/size.ts:26` | `parseSizeMm` | `web/src/utils/size.ts:32` | PRESENT |
| `frontend/src/utils/spreadsheet.ts:169` | `parseSpreadsheetBytes` | `web/src/utils/spreadsheet.ts:169` | PRESENT |
| `frontend/src/utils/storage/index.ts:25` | `Storage` (native implementation) | `web/src/utils/storage/index.ts:10` | PRESENT |
| `frontend/src/utils/storage/index.web.ts:11` | `Storage` (Expo web implementation) | `web/src/utils/storage/index.ts:10` | PRESENT |
| `frontend/src/utils/storage/index.ts:104` | `storage` (native singleton) | `web/src/utils/storage/index.ts:68` | PRESENT |
| `frontend/src/utils/storage/index.web.ts:69` | `storage` (Expo web singleton) | `web/src/utils/storage/index.ts:68` | PRESENT |

Section E totals: 57 PRESENT (web component/function or platform-equivalent locations listed), 0 MISSING, 14 SKIPPED BY DESIGN (11 unused draft exports/types and 3 native file helpers). The two linked-product component names are renamed to `CountButton` and `List` in web; the Expo names have exact aliases at the cited web lines.


## F. Storage keys, env vars, constants and feature flags
Command: `python3 - <<'PY'` scanned only `frontend/src` and `web/src` TS/TSX files; it counted unique storage-key strings, backend env names, and exported constants (excluding hooks and the storage singleton). Raw counts: Expo `storage_key_names=5 env_variable_names=1 exported_nonhook_nonstorage_constants=16`; web `storage_key_names=4 env_variable_names=1 exported_nonhook_nonstorage_constants=13`. Five import-template constants are assigned to Section G, not counted here.

| Name | Default | Where used (Expo; web) | Same in web? |
|---|---|---|---|
| Backend URL setting: `EXPO_PUBLIC_BACKEND_URL` / `VITE_BACKEND_URL` and `API_BASE_URL` | Expo fallback `http://187.127.148.44`; web no fallback, normalized empty value remains `""` | `frontend/src/config/env.ts:34-37` and `frontend/src/api/client.ts:105-106`; `web/src/config/env.ts:7-9` and `web/src/api/client.ts:109-110` | DIFFERENT: framework variable names differ and defaults differ. Expo fetches the fallback origin; web's empty origin makes URL construction relative. |
| `API_PREFIX` | `/api` | Expo `frontend/src/config/env.ts:40`, used by `frontend/src/api/client.ts:67`; web `web/src/config/env.ts:11`, used by `web/src/api/client.ts:67` | Yes |
| `session:admin` | missing key reads as `null`; cleared on sign-out | Expo `frontend/src/state/session.ts:7,15,27`; web `web/src/state/session.ts:7,15,27` | Yes |
| `session:admin:token` | missing key reads as `null`; remove on sign-out | Expo `frontend/src/api/client.ts:20,39,46-48`; web `web/src/api/client.ts:23,43,50-52` | Yes |
| `quotation:draft` | empty in-memory `lines`; persisted read fallback `null` | Expo `frontend/src/state/draft.ts:26,28,38`; no web equivalent | SKIPPED BY DESIGN: no Expo screen imports this draft store (`docs/migration/INVENTORY.md` §4). |
| `settings:showProductType` | `true`; only explicit `false` hides the page | Expo `frontend/src/features/catalog-taxonomy/settings.ts:9,17,24,28,35`; web `web/src/features/catalog-taxonomy/settings.ts:3,11,18,22,29` | Yes |
| `settings:showProductClass` | `true`; only explicit `false` hides the page | Expo `frontend/src/features/catalog-taxonomy/settings.ts:10,18,25,29,36`; web `web/src/features/catalog-taxonomy/settings.ts:4,12,19,23,30` | Yes |
| `colors` | color object defined at source | Expo `frontend/src/theme.ts:13`; web `web/src/theme.ts:3` | Yes; all 17 named color values are equal. |
| `radii` | `{sm:8, md:12, lg:16, chip:24, pill:999}` | Expo `frontend/src/theme.ts:34`; web `web/src/theme.ts:24` | Yes |
| `spacing` | `{xs:4, sm:8, md:12, lg:16, xl:24, xxl:32}` | Expo `frontend/src/theme.ts:42`; web `web/src/theme.ts:32` | Yes |
| `font` | h1 28/800; h2 22/700; h3 18/700; title 16/600; body 14/400; caption 12/500; mono Courier 13 | Expo `frontend/src/theme.ts:68`; web `web/src/theme.ts:41` | Yes; only the TypeScript `as const` annotations differ. |
| `isWeb` | `Platform.OS === "web"` | Expo `frontend/src/theme.ts:6`; no web equivalent | SKIPPED BY DESIGN; web is inherently browser-only. |
| `pointer` | web pointer/user-select style on Expo web, otherwise `{}` | Expo `frontend/src/theme.ts:9`; no exported web equivalent (DOM/CSS styles) | SKIPPED BY DESIGN; CSS replaces the RN style object. |
| `shadow` | card elevation 2 and sheet elevation 10 with RN shadow fields | Expo `frontend/src/theme.ts:51`; no web theme export | SKIPPED BY DESIGN; web shadow declarations are local CSS, not a shared token. |
| `DEFAULT_TAXONOMY_TABS` | `{ showProductType: true, showProductClass: true }` | Expo `frontend/src/features/catalog-taxonomy/settings.ts:17-20`; web `web/src/features/catalog-taxonomy/settings.ts:11-14` | Yes |
| `SHELF_PRICE_BOARD_ENABLED` | `true` | Expo `frontend/src/features/shelf-price-board/enabled.ts:17`; web `web/src/features/shelf-price-board/enabled.ts:1` | Yes |
| `LOGIN` test-ID object | values `login-email-input`, `login-password-input`, `login-submit-button`, `login-forgot-password-link`, `login-register-link` | Expo `frontend/constants/testIds/auth.js:19-25`; no equivalent web constant object or Expo app import found | SKIPPED BY DESIGN for runtime; test selectors are not imported by Expo app source. |
| `REGISTER` test-ID object | values `register-name-input`, `register-email-input`, `register-password-input`, `register-password-confirm-input`, `register-submit-button`, `register-login-link` | Expo `frontend/constants/testIds/auth.js:27-34`; no equivalent web constant object or Expo app import found | SKIPPED BY DESIGN for runtime; test selectors are not imported by Expo app source. |
| `LOGOUT` test-ID object | `logout-button` | Expo `frontend/constants/testIds/auth.js:36-38`; no equivalent web constant object or Expo app import found | SKIPPED BY DESIGN for runtime; test selectors are not imported by Expo app source. |

Constants omitted from this table by assignment, not by inference: `MASTER_TEMPLATE_HEADERS`, `PRICING_TEMPLATE_HEADERS`, `STOCK_TEMPLATE_HEADERS`, `PURCHASE_TEMPLATE_HEADERS`, and `SUBCATEGORY_TEMPLATE_HEADERS` are each compared in Section G. `useIconFonts` and the exported `storage` singleton were counted in Section E.


## G. CSV and file handling
Command: `python3 - <<'PY'` scanned the selected 22 source files containing template definitions, import/export flows, CSV helpers, and QR downloads for filenames, headers, quoting, delimiters, and BOM markers. Raw count printed: `RAW_COUNT selected_file_handling_lines=161 files=22`. Array comparison script reported each template set and the partner/RFQ/dispatch/inventory export arrays; all Expo arrays have equal web arrays except the web-only KYC-history header set.

Each artifact appears once below; a row marked `same` is based on the table comparison, not an unsupported generalization. Header ordering is exact as written. `\n` is LF between rows. `BOM` means a leading UTF-8 BOM (`\uFEFF`).

| Artifact / purpose | Expo file:line | Web file:line | Exact headers or file name | Delimiter / quoting / BOM | Result |
|---|---|---|---|---|---|
| Master template | `frontend/src/utils/import-templates.ts:4,49-53,64-71` | `web/src/utils/import-templates.ts:4,49-53,64-71` | `Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url`; `product-master-template.csv` | comma; quote fields only when comma/quote/LF/CR occurs, double embedded quotes; BOM + LF | Same |
| Pricing template | `frontend/src/utils/import-templates.ts:26,50` | `web/src/utils/import-templates.ts:26,50` | `Product Code, MRP (Rs) per nos, discount, Selling Price`; `product-prices-template.csv` | same template serializer; BOM + LF | Same |
| Stock template | `frontend/src/utils/import-templates.ts:33,51` | `web/src/utils/import-templates.ts:33,51` | `Product Code, qty`; `stock-qty-template.csv` | same template serializer; BOM + LF | Same |
| Purchase-lines template | `frontend/src/utils/import-templates.ts:35,52` | `web/src/utils/import-templates.ts:35,52` | `productCode, quantity, listPrice, purchaseDiscount, rackId, rackSlot`; `purchase-lines-template.csv` | same template serializer; BOM + LF | Same |
| Subcategory template | `frontend/src/utils/import-templates.ts:44,53` | `web/src/utils/import-templates.ts:44,53`; `web/src/pages/SubcategoriesPage.tsx:267` | `name, category`; `subcategories-template.csv` | shared template serializer and web screen template both include BOM; LF | Same |
| Catalog master import | `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:67-69`; `frontend/src/utils/csv.ts:130` | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx:52-55`; `web/src/utils/csv.ts:130` | Master template 19 columns above; CSV and spreadsheet parser | CSV/XLSX/XLS route parser; parser detects UTF-8/UTF-8 BOM/UTF-16 and delimiter; quote handling supports doubled quotes | Same header set and parser contract |
| Catalog pricing import | `frontend/src/utils/import-templates.ts:26`; `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:69,121` | `web/src/utils/import-templates.ts:26`; `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx:55,114` | `Product Code, MRP (Rs) per nos, discount, Selling Price`; accepts full master sheet with price fields | CSV/XLSX/XLS through spreadsheet parser; BOM stripped on CSV read | Same |
| Catalog stock import | `frontend/src/utils/import-templates.ts:33`; `frontend/app/(admin)/import-stock.tsx:11`; `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:125` | `web/src/utils/import-templates.ts:33`; `web/src/pages/CatalogImportPage.tsx:46`; `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx:120` | `Product Code, qty`; `stock_qty` also accepted | CSV/XLSX/XLS parser; BOM stripped on CSV read | Same |
| Purchase bulk import | `frontend/app/(admin)/purchases.tsx:205-216` | `web/src/pages/PurchasesPage.tsx:239-250` | Required `productCode` or `product code`, `quantity`, `listPrice` or `list price`; optional `purchaseDiscount` or `discount`, `rackId` or `rack id`, `rackSlot` or `rack slot` | comma/semicolon/tab sniffing; quoted/doubled quote fields; BOM stripped; six canonical template columns | Same |
| Subcategory import | `frontend/app/(admin)/subcategories.tsx:135-143` | `web/src/pages/SubcategoriesPage.tsx:222-231` | Name column `name` or `subcategory`; category `category` or `parent category`; both required after trim | comma/semicolon/tab sniffing; quoted/doubled quotes; BOM stripped | Same |
| Catalog export | `frontend/app/(admin)/catalog.tsx:428-456,463` | `web/src/pages/CatalogPage.tsx:249-280` | Master 19-column order above; `catalog.csv` | comma, LF, CSV-quote special cells/double embedded quotes, BOM | Same headers, values, name, and BOM |
| Partner list export | `frontend/app/(admin)/partners.tsx:34-55,273-281` | `web/src/pages/PartnersPage.tsx:22-43,290-293` | `id, name, phone, businessName, address, pincode, city, area, salesManager, kycStatus, appActive, locationVerified, rewardBalance, rfqCount, approvedRfqCount, approvedRfqValue, registeredVia, lastAppLoginAt, loginCount, createdAt`; `partners.csv` | comma, LF, every cell quoted, embedded quotes doubled, BOM | Same |
| Purchase history export | `frontend/app/(admin)/purchases.tsx:284-294` | `web/src/pages/PurchasesPage.tsx:318-323` | `productCode, quantity, listPrice, purchaseDiscount, rackId, rackSlot`; `purchases.csv` | comma, LF, conditional CSV quoting incl CR, embedded quotes doubled, BOM | Same |
| Inventory stock export | `frontend/app/(admin)/inventory.tsx:160-183,195` | `web/src/pages/InventoryPage.tsx:166-183,186` | `productCode, name, category, brand, stock, reorderLevel, unitCost, valuation, rackName, rackSlot`; `inventory-YYYY-MM-DD.csv` | comma, LF, conditional quoting, BOM | Same |
| Inventory movement export | `frontend/app/(admin)/inventory.tsx:160-183,195` | `web/src/pages/InventoryPage.tsx:166-183,186` | `type, productCode, productName, quantity, referenceId, at`; `inventory-moves-YYYY-MM-DD.csv` | comma, LF, conditional quoting, BOM | Same |
| RFQ export | `frontend/app/(admin)/rfqs.tsx:503-547,555` | `web/src/pages/RfqsPage.tsx:413-437` | `rfqId, partnerId, partnerName, partnerPhone, status, productCode, productName, quantity, unitPrice, lineSubtotal, specialDiscountPercent, rewardPoints, grandTotal, deliveryMode, scheduledAt, createdAt`; `rfqs-YYYY-MM-DD.csv` | comma, LF, conditional quoting, BOM | Same |
| Dispatch export | `frontend/app/(admin)/dispatches.tsx:278-304,312` | `web/src/pages/DispatchesPage.tsx:224-228` | `dispatchId, createdAt, sourceRfqId, customerName, customerPhone, productCode, productName, quantity, unitPrice, lineValue, type`; `dispatches-YYYY-MM-DD.csv` | comma, LF, conditional quoting, BOM | Same |
| Subcategory export | `frontend/app/(admin)/subcategories.tsx:125` | `web/src/pages/SubcategoriesPage.tsx:211-214` | `name, category`; `subcategories.csv` | comma, LF, conditional quoting, no BOM | Same; BOM is not added on either export path |
| Partner KYC-history export | no equivalent | `web/src/pages/PartnersPage.tsx:44-52,310-314` | `partnerId, partnerName, status, reviewedBy, reviewedAt, rejectionReason, locationVerified`; `partners-kyc-history.csv` | comma, LF, cells via partner quote-all helper, BOM | DIFFERENT; web-only export (listed once as a problem/addition) |
| Product QR image download | `frontend/src/components/ProductQr.tsx:39,43` | `web/src/components/ProductQr.tsx:30,34` | `${code}-qr.png` | PNG; not CSV | Same file-name pattern |
| Shared CSV parser / writer rules | `frontend/src/utils/csv.ts:86-147` and `frontend/src/utils/import-templates.ts:64-71` | `web/src/utils/csv.ts:86-147` and `web/src/utils/import-templates.ts:64-71` | Input delimiter candidates comma, semicolon, tab; output delimiter comma | Doubled quotes are unescaped; UTF-8/UTF-8-BOM/UTF-16 decoding; template serializer adds BOM; import normalizer strips BOM; rows output with LF | Same shared rules |

The only CSV artifact mismatch found is the web-only KYC-history export; its count is assigned here and Section K will reference it without counting it again. The `PARTNER_KYC_HISTORY_HEADERS` row is the only export header set with no Expo file counterpart.


## H. React Native replacements
Command: `python3 - <<'PY'` scanned all 70 Expo `.ts/.tsx/.js` source/config files for `Platform`, `Alert`, `AsyncStorage`, `Linking`, `Dimensions`, permission APIs, `DocumentPicker`, `ImagePicker`, `FileSystem`, `Sharing`, and `Share`. Raw counts: Platform 35 matching lines; Alert 0; AsyncStorage 15; Linking 19; Dimensions 0; DocumentPicker 12; ImagePicker 0; FileSystem 14; Sharing 0; Share 0; permission-pattern matches 3.

The three permission-pattern matches are `frontend/app/(admin)/team.tsx:213-215` data named `permissions` for user roles, not OS/device permissions. No native permission request API, `Alert`, `Dimensions`, image-picker module, or share API was found. Each actual matching Expo use is listed below by file and all line numbers (imports and calls/guards included).

| Expo API and every matching `frontend` source location | Web replacement and source anchors | Evidence / note |
|---|---|---|
| `Platform`: `frontend/app/_layout.tsx:2,14,18,39`; `frontend/app/(admin)/_layout.tsx:2,14`; `frontend/src/theme.ts:4,6`; `frontend/app/(admin)/purchases.tsx:2,289`; `frontend/app/(admin)/register.tsx:7,75`; `frontend/app/(admin)/login.tsx:7,57`; `frontend/app/(admin)/catalog.tsx:11,72,458,1201,1259,1285`; `frontend/app/(admin)/partners.tsx:6,276`; `frontend/src/utils/import-templates.ts:1,78`; `frontend/src/utils/read-asset-bytes.ts:1,7`; `frontend/src/utils/pick-image.ts:1,14`; `frontend/src/components/ProductQr.tsx:2,40`; `frontend/src/components/RemoteImage.tsx:2,69`; `frontend/src/components/UI.tsx:17,427`; `frontend/src/utils/storage/index.ts:1` | Web is browser-only and has no `Platform` check; route composition at `web/src/main.tsx:1` and `web/src/App.tsx:27-35`; page-specific DOM behavior at `web/src/pages/CatalogPage.tsx:280`, `PurchasesPage.tsx:323`, `LoginPage.tsx:1`, `RegisterPage.tsx:1`; CSS/browser components at `web/src/components/RemoteImage.tsx:1`, `web/src/components/UI.tsx:1` | Platform guards select native wrappers, keyboard behavior, native file/QR paths, or RN image input style. Web implementation uses DOM/CSS or the browser path; there is no single web `Platform` replacement. |
| `AsyncStorage`: `frontend/src/state/draft.ts:2`; `frontend/src/utils/storage/index.ts:8,20,26,33,46,56`; `frontend/src/utils/storage/storage-base.ts:16`; `frontend/src/utils/storage/index.web.ts:5,7,12,18,31,41,49` | `web/src/utils/storage/index.ts:1-` (adapter calls `localStorage.getItem/setItem/removeItem` at lines 18,31,41) | Native Expo adapter uses AsyncStorage; Expo's own web shim uses its AsyncStorage web implementation; React web directly uses `localStorage`. Same storage abstraction contract/keys; backing engine differs. |
| `AsyncStorage`: `frontend/src/state/draft.ts:2`; `frontend/src/utils/storage/index.ts:8,20,26,33,46,56`; `frontend/src/utils/storage/storage-base.ts:16`; `frontend/src/utils/storage/index.web.ts:5,7,12,18,31,41,49` | `web/src/utils/storage/index.ts:18,31,41` | Native Expo adapter uses AsyncStorage; Expo's own web shim uses its AsyncStorage web implementation; React web directly uses `localStorage`. Same storage abstraction contract/keys; backing engine differs. |
| `Linking`: `frontend/app/(admin)/purchases.tsx:2,300`; `frontend/app/(admin)/subcategories.tsx:2,127`; `frontend/app/(admin)/rfqs.tsx:2,559`; `frontend/app/(admin)/dispatches.tsx:2,316`; `frontend/app/(admin)/inventory.tsx:2,199`; `frontend/app/(admin)/catalog.tsx:14,469`; `frontend/app/(admin)/partners.tsx:5,245,285`; `frontend/src/utils/import-templates.ts:1,90`; `frontend/src/components/ProductQr.tsx:2,53` | Browser downloads: `web/src/utils/download-csv.ts:1-9`, CSV calls at `web/src/pages/PurchasesPage.tsx:323`, `SubcategoriesPage.tsx:214`, `RfqsPage.tsx:437`, `DispatchesPage.tsx:228`, `InventoryPage.tsx:186`, `CatalogPage.tsx:280`, `PartnersPage.tsx:293`, and template util `web/src/utils/import-templates.ts:74-77`. External partner documents use anchor `web/src/pages/PartnersPage.tsx:400`; QR uses anchor download `web/src/components/ProductQr.tsx:30-35` | Expo Linking opens native data URLs or a local QR file on native; web uses Blob/object URL downloads and ordinary links. Each relevant CSV/QR artifact is itemized in G. |
| `DocumentPicker`: `frontend/app/(admin)/purchases.tsx:6,194`; `frontend/app/(admin)/subcategories.tsx:6,133`; `frontend/app/(admin)/catalog.tsx:19,71,288`; `frontend/src/utils/read-asset-bytes.ts:5`; `frontend/src/utils/pick-image.ts:2,6`; `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx:5,54` | Native file/image inputs: `web/src/pages/PurchasesPage.tsx:396`, `SubcategoriesPage.tsx:306`, `CatalogProductEditor.tsx:333`, `CoverImageField.tsx:76`, `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx:159` | Browser `File` callbacks replace picker result objects; image reads use `FileReader` at `CatalogProductEditor.tsx:144` and `CoverImageField.tsx:20`; CSV/spreadsheet reads use `file.arrayBuffer()` at `PurchasesPage.tsx:233`, `SubcategoriesPage.tsx:222`, importer `CatalogSpreadsheetImport.tsx:54`. |
| `FileSystem`: `frontend/app/(admin)/catalog.tsx:20,90-91`; `frontend/src/utils/read-asset-bytes.ts:3,5,19-20`; `frontend/src/utils/pick-image.ts:3,32-33`; `frontend/src/components/ProductQr.tsx:3,50-52` | `web/src/features/catalog/CatalogProductEditor.tsx:144,333`; `web/src/components/CoverImageField.tsx:20,76`; `web/src/components/ProductQr.tsx:30-35`; `web/src/utils/download-csv.ts:1-9` | Expo native reads/writes local cache files; web reads selected `File` bytes/data URLs and downloads QR/CSV with browser APIs, so no filesystem path is used. |
| `Alert` | no equivalent (0 Expo usages; browser inline error/message state is implemented per page, e.g. `web/src/pages/CatalogPage.tsx:1`) | No Expo `Alert` call exists in the scanned source. |
| `Dimensions` | no equivalent (0 Expo usages; responsive CSS) | No Expo `Dimensions` call exists in the scanned source. |
| Native permissions | no equivalent (0 native permission-request usages) | Three `permissions` matches are Team role data only (`frontend/app/(admin)/team.tsx:213-215`); no permission prompt or browser permission API to map. |
| `ImagePicker`, `Sharing`, `Share` | no equivalent (0 Expo usages) | Image selection is through `DocumentPicker`; file save is through Linking/FileSystem and browser download, not a share sheet. |

Section H includes every source line matching the requested API identifiers. The zero-use rows are source-checked; no OS permission/share API call exists to exercise at runtime.


## I. Assets
Command: `python3 - <<'PY'` recursively counted physical assets in `frontend/assets`, `web/public`, and `web/src/assets`, matched each basename against source/config references, and extracted literal Expo icon uses plus individual SVG imports in web `Icon.tsx`. Raw counts: Expo assets 11; web public assets 2; web source assets 3; Expo literal icon names 34; web SVG registry names 48; Expo font/asset-reference lines 10; web font/asset-reference lines 51.
Command: `python3 - <<'PY'` recursively counted physical assets in `frontend/assets`, `web/public`, and `web/src/assets`, matched each basename against source/config references, and extracted literal Expo icon uses plus individual SVG imports in web `Icon.tsx`. Raw counts: Expo assets 11; web public assets 2; web source assets 3; Expo literal icon names 34; web SVG registry names 48; Expo font/asset-reference lines 10; web font/asset-reference lines 51.

Count unit: 34 Expo icon names yield 33 PRESENT and one missing `open-outline`; the 15 web-only icon names, missing `open-outline`, favicon file/strategy, and icon-font-vs-SVG rendering account for 18 DIFFERENT; mono font and remote-image pipeline account for two additional PRESENT comparisons (35 total); app icon, adaptive icon, and splash are the three SKIPPED BY DESIGN items. Unreferenced bundled files below are enumerated but excluded from parity counts. Dynamic icon names are the single NOT CHECKED item.

| Expo image/font asset | Expo use | Web asset / replacement | Match |
|---|---|---|---|
| `frontend/assets/images/icon.png` | `frontend/app.json:7` installed-app icon | no equivalent web-installed app icon; browser tab icon is a separate asset at `web/public/favicon.svg` (`web/index.html:4`) | SKIPPED BY DESIGN; installed-app launcher icon is not applicable to browser app |
| `frontend/assets/images/adaptive-icon.png` | `frontend/app.json:17` Android adaptive icon | no equivalent (web has no Android launcher icon) | SKIPPED BY DESIGN |
| `frontend/assets/images/favicon.png` | `frontend/app.json:26` Expo web favicon | `web/public/favicon.svg`, referenced `web/index.html:4` | DIFFERENT file/format; favicon role exists in both |
| `frontend/assets/images/splash-image.png` | `frontend/app.json:35` splash plugin image | no equivalent web splash asset | SKIPPED BY DESIGN; Vite mounts app directly |
| `frontend/assets/fonts/SpaceMono-Regular.ttf` | no source reference found | no equivalent; theme uses Courier generic family (`frontend/src/theme.ts:76`, `web/src/theme.ts:48`) | Unused Expo file, no app behavior |
| `frontend/assets/images/app-image.png` | no source/config reference found | no equivalent | Unused Expo file |
| `frontend/assets/images/favicon-48.png` | no source/config reference found | no equivalent | Unused Expo file |
| `frontend/assets/images/partial-react-logo.png` | no source/config reference found | no equivalent | Unused Expo file |
| `frontend/assets/images/react-logo.png` | no source/config reference found | no equivalent | Unused Expo file |
| `frontend/assets/images/react-logo@2x.png` | no source/config reference found | no equivalent | Unused Expo file |
| `frontend/assets/images/react-logo@3x.png` | no source/config reference found | no equivalent | Unused Expo file |
| no Expo equivalent | no Expo physical asset | `web/public/favicon.svg` `web/index.html:4` | Web browser favicon |
| no Expo equivalent | no Expo physical asset | `web/public/icons.svg` | No source reference found |
| no Expo equivalent | no Expo physical asset | `web/src/assets/hero.png` | No source reference found |
| no Expo equivalent | no Expo physical asset | `web/src/assets/react.svg` | No source reference found |
| no Expo equivalent | no Expo physical asset | `web/src/assets/vite.svg` | No source reference found |
| Dynamic remote product/category/brand images | Expo `frontend/src/components/RemoteImage.tsx:29-75` and image URL form/export use `frontend/app/(admin)/catalog.tsx:821` | Web `web/src/components/RemoteImage.tsx:16-58`, product image upload `web/src/features/catalog/CatalogProductEditor.tsx:144,333`, category/brand upload `web/src/components/CoverImageField.tsx:20,76` | PRESENT as API URL/browser FileReader and `<img>` handling, not a bundled static asset |

Font use: Expo loads Ionicons font only in Expo Go through `frontend/src/hooks/use-icon-fonts.ts:10-48`, using `@expo/vector-icons` version `15.1.1` and the CDN `.ttf` family URLs at `:40`; other builds/web pass an empty font map. Web imports individual Ionicons SVGs as raw strings from the installed `ionicons` package in `web/src/components/Icon.tsx:1-48`. Both themes use `Courier` for mono (`frontend/src/theme.ts:76`; `web/src/theme.ts:48`). No custom web font file or `@font-face` was found.

| Expo icon name and source use(s) | Web equivalent (SVG registry line) | Verdict |
|---|---|---|
| `add-circle` — `frontend/app/(admin)/brands.tsx:87`, `catalog.tsx:487`, `categories.tsx:117`, `dispatches.tsx:355`, `partners.tsx:307`, `product-groups.tsx:76`, `purchases.tsx:346`, `racks.tsx:31`, `rfqs.tsx:582`, `subcategories.tsx:164`, `team.tsx:157` | `web/src/components/Icon.tsx:2` | PRESENT |
| `bar-chart-outline` — `frontend/app/(admin)/csv-import.tsx:32`, `frontend/src/components/AdminShell.tsx:53` | `web/src/components/Icon.tsx:3` | PRESENT |
| `barcode-outline` — `frontend/src/components/AdminShell.tsx:62` | `web/src/components/Icon.tsx:4` | PRESENT |
| `cart-outline` — `frontend/src/components/AdminShell.tsx:52` | `web/src/components/Icon.tsx:5` | PRESENT |
| `checkmark` — `frontend/app/(admin)/catalog.tsx:900,909,933`, `product-groups.tsx:116`, `subcategories.tsx:233` | `web/src/components/Icon.tsx:7` | PRESENT |
| `chevron-back` — `frontend/src/components/UI.tsx:338` | `web/src/components/Icon.tsx:10` | PRESENT |
| `chevron-down` — `frontend/app/(admin)/catalog.tsx:842,854,873`, `purchases.tsx:412,431`, `subcategories.tsx:229` | `web/src/components/Icon.tsx:11` | PRESENT |
| `chevron-forward` — `frontend/app/(admin)/csv-import.tsx:73`, `dashboard.tsx:428` | `web/src/components/Icon.tsx:12` | PRESENT |
| `close` — `frontend/src/components/UI.tsx:276` | `web/src/components/Icon.tsx:14` | PRESENT |
| `cloud-upload-outline` — `frontend/app/(admin)/subcategories.tsx:162`, `frontend/src/components/AdminShell.tsx:34` | `web/src/components/Icon.tsx:17` | PRESENT |
| `construct-outline` — `frontend/src/components/AdminShell.tsx:61` | `web/src/components/Icon.tsx:16` | PRESENT |
| `create-outline` — `frontend/app/(admin)/catalog.tsx:1120`, `product-groups.tsx:94`, `subcategories.tsx:193`, `team.tsx:226` | `web/src/components/Icon.tsx:18` | PRESENT |
| `cube` — `frontend/app/(admin)/racks.tsx:32` | `web/src/components/Icon.tsx:19` | PRESENT |
| `cube-outline` — `frontend/app/(admin)/csv-import.tsx:18`, `frontend/src/components/AdminShell.tsx:21` | `web/src/components/Icon.tsx:20` | PRESENT |
| `document-outline` — `frontend/app/(admin)/subcategories.tsx:160` | `web/src/components/Icon.tsx:21` | PRESENT |
| `document-text-outline` — `frontend/src/components/AdminShell.tsx:59` | `web/src/components/Icon.tsx:22` | PRESENT |
| `download-outline` — `frontend/app/(admin)/catalog.tsx:484`, `dispatches.tsx:352`, `inventory.tsx:253`, `partners.tsx:304`, `purchases.tsx:343`, `rfqs.tsx:579`, `subcategories.tsx:163` | `web/src/components/Icon.tsx:23` | PRESENT |
| `ellipsis-vertical` — `frontend/app/(admin)/catalog.tsx:627` | `web/src/components/Icon.tsx:24` | PRESENT |
| `filter-outline` — `frontend/src/components/AdminShell.tsx:29` | `web/src/components/Icon.tsx:25` | PRESENT |
| `funnel-outline` — `frontend/src/components/AdminShell.tsx:25` | `web/src/components/Icon.tsx:26` | PRESENT |
| `git-branch-outline` — `frontend/src/components/AdminShell.tsx:27` | `web/src/components/Icon.tsx:27` | PRESENT |
| `grid-outline` — `frontend/src/components/AdminShell.tsx:44,51` | `web/src/components/Icon.tsx:28` | PRESENT |
| `image-outline` — `frontend/app/(admin)/brands.tsx:119`, `catalog.tsx:816`, `categories.tsx:156`, `product-types.tsx:168`, `frontend/src/components/RemoteImage.tsx:40,56` | `web/src/components/Icon.tsx:29` | PRESENT |
| `layers-outline` — `frontend/src/components/AdminShell.tsx:33` | `web/src/components/Icon.tsx:30` | PRESENT |
| `log-out-outline` — `frontend/app/(admin)/dashboard.tsx:89`, `frontend/src/components/AdminShell.tsx:160` | `web/src/components/Icon.tsx:33` | PRESENT |
| `open-outline` — `frontend/app/(admin)/partners.tsx:377` | no equivalent; web document anchors are `web/src/pages/PartnersPage.tsx:400` | COSMETIC difference; icon cue omitted beside the linked document |
| `options-outline` — `frontend/app/(admin)/catalog.tsx:524` | `web/src/components/Icon.tsx:34` | PRESENT |
| `people-outline` — `frontend/src/components/AdminShell.tsx:60` | `web/src/components/Icon.tsx:36` | PRESENT |
| `pricetag-outline` — `frontend/app/(admin)/csv-import.tsx:25` | `web/src/components/Icon.tsx:38` | PRESENT |
| `pricetags-outline` — `frontend/src/components/AdminShell.tsx:22` | `web/src/components/Icon.tsx:39` | PRESENT |
| `ribbon-outline` — `frontend/src/components/AdminShell.tsx:32` | `web/src/components/Icon.tsx:41` | PRESENT |
| `settings-outline` — `frontend/src/components/AdminShell.tsx:68` | `web/src/components/Icon.tsx:43` | PRESENT |
| `shield-outline` — `frontend/src/components/AdminShell.tsx:69` | `web/src/components/Icon.tsx:44` | PRESENT |
| `trash-outline` — `frontend/app/(admin)/brands.tsx:122`, `categories.tsx:160`, `dispatches.tsx:470`, `product-groups.tsx:95`, `product-types.tsx:172`, `racks.tsx:32`, `rfqs.tsx:762`, `subcategories.tsx:194`, `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx:144` | `web/src/components/Icon.tsx:47` | PRESENT |

Web icon names with no Expo literal name: `add`, `cash-outline`, `checkmark-circle`, `checkmark-circle-outline`, `chevron-up`, `close-circle`, `list-outline`, `log-in-outline`, `pause-circle-outline`, `play-circle-outline`, `receipt-outline`, `send-outline`, `swap-horizontal-outline`, `time-outline`, `warning-outline` (SVG registry references `web/src/components/Icon.tsx:1-48`; literal screen references include Dashboard `:74-158`, Login `web/src/pages/LoginPage.tsx:103`, Register `web/src/pages/RegisterPage.tsx:64`, status controls in Brands/Categories/ProductTypes pages). Three registry names (`checkmark-circle`, `close-circle`, `ellipsis-vertical`) had no direct literal-use match in the script; dynamic use is NOT CHECKED. The one exported Expo name `open-outline` is absent from the registry.
| Web-only icon name | Web source use or registry-only location | Expo equivalent | Verdict |
|---|---|---|---|
| `add` | `web/src/pages/ProductGroupsPage.tsx:292`; `web/src/pages/PurchasesPage.tsx:397` | no equivalent | DIFFERENT; web-only icon use |
| `cash-outline` | `web/src/pages/DashboardPage.tsx:81` | no equivalent | DIFFERENT; web-only icon use |
| `checkmark-circle` | registry `web/src/components/Icon.tsx:8`; no direct literal use found | no equivalent | DIFFERENT registry asset; runtime use NOT CHECKED |
| `checkmark-circle-outline` | `web/src/pages/DashboardPage.tsx:78`; `web/src/pages/RegisterPage.tsx:64` | no equivalent | DIFFERENT; web-only icon use |
| `chevron-up` | `web/src/components/LinkedProducts.tsx:20`; `web/src/pages/DispatchesPage.tsx:292` | no equivalent | DIFFERENT; web-only icon use |
| `close-circle` | registry `web/src/components/Icon.tsx:15`; no direct literal use found | no equivalent | DIFFERENT registry asset; runtime use NOT CHECKED |
| `list-outline` | `web/src/pages/DashboardPage.tsx:132` | no equivalent | DIFFERENT; web-only icon use |
| `log-in-outline` | `web/src/pages/LoginPage.tsx:103` | no equivalent | DIFFERENT; web-only icon use |
| `pause-circle-outline` | `web/src/pages/BrandsPage.tsx:320`, `CategoriesPage.tsx:310`, `ProductTypesPage.tsx:363` | no equivalent | DIFFERENT; web-only icon use |
| `play-circle-outline` | `web/src/pages/BrandsPage.tsx:320`, `CategoriesPage.tsx:310`, `ProductTypesPage.tsx:363` | no equivalent | DIFFERENT; web-only icon use |
| `receipt-outline` | `web/src/pages/DispatchesPage.tsx:300` | no equivalent | DIFFERENT; web-only icon use |
| `send-outline` | `web/src/pages/DashboardPage.tsx:79` | no equivalent | DIFFERENT; web-only icon use |
| `swap-horizontal-outline` | `web/src/pages/DispatchesPage.tsx:299` | no equivalent | DIFFERENT; web-only icon use |
| `time-outline` | `web/src/pages/DashboardPage.tsx:77` | no equivalent | DIFFERENT; web-only icon use |
| `warning-outline` | `web/src/pages/DashboardPage.tsx:76` | no equivalent | DIFFERENT; web-only icon use |

Three web registry names (`checkmark-circle`, `close-circle`, `ellipsis-vertical`) had no direct literal-use match; the first two are above and `ellipsis-vertical` is an Expo icon name already listed in the Expo-to-web table. Dynamic icon-name expressions were NOT CHECKED; the 34 Expo literal/data icon names are each listed above. Expo `open-outline` is absent from the web registry.

NOT CHECKED: JSX `Ionicons.name` values passed through non-literal expressions were not enumerated because the requested dynamic-name scan was skipped. The 34 literal/data icon names and every file-level static asset reference are reported above.


## J. Build and deploy settings

Command: recursive config scan over `frontend/` and `web/` for `vercel.json`, `_redirects`, nginx config, `netlify.toml`, `.htaccess`, plus line scan of `app.json`, `vite.config.ts`, and each app's `src/config/env.ts`. Raw counts printed: `RAW_COUNT frontend_host_config_files=1` (`frontend/vercel.json`); `RAW_COUNT web_host_config_files=0`.

| Setting | Expo | Web | Result |
|---|---|---|---|
| Backend URL variable name | `EXPO_PUBLIC_BACKEND_URL`, read in `frontend/src/config/env.ts:36-37` | `VITE_BACKEND_URL`, read in `web/src/config/env.ts:9` | Framework-specific names; default difference and exact defaults are counted in Section F, not recounted here. |
| API base path | API origin plus `/api`; `API_PREFIX` at `frontend/src/config/env.ts:40` | API origin plus `/api`; `API_PREFIX` at `web/src/config/env.ts:11` | Same `/api` prefix. |
| App/router base path | Expo `web.output="single"` at `frontend/app.json:25`; no explicit web base URL found in `app.json` | Vite config has no `base` property (`web/vite.config.ts:4-7`); BrowserRouter paths start at `/` (`web/src/App.tsx:31-57`) | Both source apps use root-relative paths. |
| Expo host config | `frontend/vercel.json:1-4` rewrites every path matching `/(.*)` to `/`; this serves the single-page output on direct route requests. | no equivalent | Present only in Expo deployment config. |
| React web host config | no equivalent | no `web/vercel.json`, nginx config, `_redirects`, `netlify.toml`, or `.htaccess` found; Vite dev server only specifies port 5173 (`web/vite.config.ts:6`) | DIFFERENT: no checked-in host fallback for `/brands`, `/rfqs`, etc. A static host that does not rewrite deep links to `index.html` can fail on direct load/reload. |

Deep-link reload behavior on a deployed web host is NOT CHECKED: no production host/configuration is present in `web/` to execute against. This is a deployment setting, class (e), for the existing deployment row 21b; it is not a web application-code defect. Section I only compared source registrations and did not assert deployed routing.


## K. Web-only additions
Command: `python3 - <<'PY'` scanned named current-source markers for RFQ filters, partner KYC export, Service Requests error handling, register form submission, Team query normalization, partner location field layout, and web routing wrappers. Raw count printed: `RAW_COUNT named_web_only_check_lines=51`.

Rows here inventory additions/differences, not new features requested by this task. Findings assigned to earlier sections are cross-referenced and not counted a second time.

| Addition or comparison | Expo file:line | Web file:line | Status / classification |
|---|---|---|---|
| RFQ Category filter | no equivalent; current Expo RFQ list has no Category selector | `web/src/pages/RfqsPage.tsx:139-151,237-240,472-484` | WEB-ONLY SOW addition; derives category from loaded catalog and RFQ line codes. Prior note `migration/dev/2026-10-10-20d-rfq-category-product-filters.md`. Counted in K only. |
| RFQ Product filter | no equivalent; current Expo RFQ list has no Product selector | `web/src/pages/RfqsPage.tsx:143-151,240,490-497` | WEB-ONLY SOW addition; options narrow by selected category, matching product code. Counted in K only. |
| Partner KYC-history CSV export | no equivalent; Expo renders history but has no history export | `web/src/pages/PartnersPage.tsx:44-52,310-314,333-337` | WEB-ONLY SOW addition, `partners-kyc-history.csv`, UTF-8 BOM. Prior note `migration/dev/2026-10-10-20e-partner-kyc-history-export.md`; its CSV artifact is counted in G only. |
| Service-request error popup | `frontend/app/(admin)/service-requests.tsx:50-51,120-121,153` | `web/src/pages/ServiceRequestsPage.tsx:29-34,72-75,124,178` | DIFFERENT presentation and error extraction: Expo places a message inline; web shows `ErrorModal` and parses nested API validation errors. |
| Register submits on Enter | `frontend/app/(admin)/register.tsx:133-141` (button `onPress`; no form submit handler) | `web/src/pages/RegisterPage.tsx:29,59-65` (`<form onSubmit>`) | WEB-ONLY browser form behavior; pressing Enter in a form field submits. Whether to remove it for strict parity is unclear. |
| Team search trims query | `frontend/app/(admin)/team.tsx:63-70` compares `query.toLowerCase()` | `web/src/pages/TeamPage.tsx:71-76` compares `query.trim().toLowerCase()` | DIFFERENT: leading/trailing whitespace is ignored on web, not Expo. |
| Pincode/city and area/manager rows | `frontend/app/(admin)/partners.tsx:427-433` | `web/src/pages/PartnersPage.tsx:447-453` | NOT web-only: both screens have the same Pincode+City row and Area+Sales manager row; field values and payload are shared. |
| Browser router and startup wrapper | Expo bootstrap `frontend/app/index.tsx:10-20`; Expo root layout `frontend/app/_layout.tsx:20-45` | `web/src/App.tsx:1,27-35`; `web/src/components/StartupRedirect.tsx:5-16` | Web-framework implementation only; bootstrap redirect behavior is present in both (Section A). |
| Empty-page wrapper / stale route | no current Expo `money-config` screen or route | `web/src/components/EmptyPage.tsx:1`; `web/src/App.tsx:55` | Web-only placeholder route; counted in Section A as P-001, not counted again here. |
| Native/browser file chooser and download wrappers | native APIs at `frontend/src/utils/pick-image.ts:5-14`, `frontend/src/utils/read-asset-bytes.ts:6-16`, `frontend/src/components/ProductQr.tsx:39-54` | DOM File input / FileReader / download at `web/src/components/CoverImageField.tsx:20,76`, `web/src/features/catalog/CatalogProductEditor.tsx:144,333`, `web/src/components/ProductQr.tsx:30-35` | Platform replacements, not added business behavior; fully inventoried in H/G. |
| Web-only SVG icon registry additions | no equivalent Expo usage for web-only names | `web/src/components/Icon.tsx:1-48` | Names beyond Expo's literal icon set are listed in I. Expo `open-outline` is missing on web (P-005 in I); icon names are not recounted here. |
| API helper signature differences | Expo `frontend/src/api/endpoints.ts:334,367` | Web `web/src/api/endpoints.ts:312,331` | `listServiceRequests` web helper has no optional query filters; `createTeamUser` web type adds optional `isActive`. Counted in D only; neither difference changes current page caller arguments/body. |
| Backend default and deployment host fallback | Expo `frontend/src/config/env.ts:34-37`; Expo rewrite `frontend/vercel.json:1-4` | Web `web/src/config/env.ts:7-9`; no web host file | Default URL difference counted in F; host setting counted in J as P-006, class (e). Not recounted here. |

No additional user-facing feature additions were found in the current static source scan beyond the rows above. Dynamic icon-name expressions remain NOT CHECKED and are counted in Section I.


## PROBLEMS

Command: `python3 - <<'PY'` counted table rows beginning `P-` and classified each severity from its column. Raw count printed: `RAW_COUNT problem_rows=9`.

| ID | Section | Severity | Expo file:line | Where it should be in web | What is different, in one sentence | Class | Fix size |
|---|---|---|---|---|---|---|---|
| P-001 | A | BEHAVIOUR | no equivalent (no current Expo money-config route) | `web/src/App.tsx:55` | Web still routes `/money-config` to an EmptyPage although Expo removed that route. | (a) web-only fix | S |
| P-002 | D | BEHAVIOUR | `frontend/src/api/endpoints.ts:334`; screen calls without filters at `frontend/app/(admin)/service-requests.tsx:45` | `web/src/api/endpoints.ts:312`; caller `web/src/pages/ServiceRequestsPage.tsx:60` | Expo's list helper accepts service type, status, search, and date query fields while web's helper accepts no arguments, so a filtered helper call cannot be made on web. | (a) web-only fix | S |
| P-003 | D | DOC-ONLY | `frontend/src/api/endpoints.ts:367` | `web/src/api/endpoints.ts:331` | Web's `createTeamUser` type adds optional `isActive` absent from Expo's helper type, although both screen payloads send that field. | (a) web-only fix | S |
| P-004 | F | BEHAVIOUR | `frontend/src/config/env.ts:34-37` | `web/src/config/env.ts:7-9` | With the backend env unset, Expo falls back to `http://187.127.148.44` while web builds a relative `/api` URL from an empty origin. | (d) unclear | S |
| P-005 | I | COSMETIC | `frontend/app/(admin)/partners.tsx:377` | `web/src/pages/PartnersPage.tsx:400`; no equivalent icon | Expo shows `open-outline` beside external partner documents but the web document anchor has no matching icon and the icon is absent from its registry. | (a) web-only fix | S |
| P-006 | J | BLOCKER | `frontend/vercel.json:2-4` supplies a route rewrite | no equivalent web host config; `web/src/App.tsx:31-57` uses BrowserRouter paths | On a static host without an SPA fallback, reloading a deep link such as `/brands` can fail before the React router loads. | (e) deployment setting for row 21b | S |
| P-007 | K | BEHAVIOUR | `frontend/app/(admin)/service-requests.tsx:153` | `web/src/pages/ServiceRequestsPage.tsx:29-34,178` | Expo displays service-request errors inline, while web opens an ErrorModal and extracts nested validation details. | (a) web-only fix | S |
| P-008 | K | BEHAVIOUR | `frontend/app/(admin)/register.tsx:133-141` | `web/src/pages/RegisterPage.tsx:29,59-65` | The web form submits when Enter is pressed, while Expo exposes submission through the explicit button. | (d) unclear | S |
| P-009 | K | BEHAVIOUR | `frontend/app/(admin)/team.tsx:65` | `web/src/pages/TeamPage.tsx:74` | Web trims leading/trailing whitespace before Team search but Expo does not. | (a) web-only fix | S |

## Short list of BLOCKER and BEHAVIOUR problems

Command: `python3 - <<'PY'` filtered the problem rows to severity BLOCKER or BEHAVIOUR. Raw count printed: `RAW_COUNT blocker_or_behaviour_findings=7`.


- P-006 (BLOCKER, conditional host failure): a static host without an SPA rewrite can fail on deep-link reload; this is a class-(e) deployment setting for row 21b.
- P-001: stale web-only `/money-config` route.
- P-002: web API helper lacks Expo's optional service-request list filters.
- P-004: unset backend environment variables resolve to different request origins.
- P-007: Service Requests uses a web error modal and more detailed error extraction instead of Expo's inline message.
- P-008: web registration supports Enter submission; strict parity intent is unclear.
- P-009: web Team search trims whitespace while Expo does not.

## Proposed new STATUS.md rows for the (a) items

Command: `python3 - <<'PY'` filtered problem rows to class `(a) web-only fix`. Raw count printed: `RAW_COUNT class_a_proposed_rows=6`.


- 21a(a)-01: Remove the stale `/money-config` route (`web/src/App.tsx:55`).
- 21a(a)-02: Add Expo's optional query fields to web `listServiceRequests` (`web/src/api/endpoints.ts:312`).
- 21a(a)-03: Align the `createTeamUser` helper type with Expo without changing the current page payload (`web/src/api/endpoints.ts:331`).
- 21a(a)-04: Add the `open-outline` icon SVG to the web registry or use an already registered equivalent for partner document links.
- 21a(a)-05: Align Service Requests error presentation/extraction with Expo's inline message behavior.
- 21a(a)-06: Remove `.trim()` from Team search filtering so web uses the same query semantics as Expo.

Proposals only; `migration/STATUS.md` was not edited. P-008 remains class (d) pending owner intent; P-006 remains class (e) for row 21b.
