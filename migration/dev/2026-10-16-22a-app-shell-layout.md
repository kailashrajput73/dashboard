# Row 22a: App shell layout

**Planned:** Match Expo's viewport-bound shell: a 240px sidebar at viewport height, a separately scrolling menu, and a content pane that owns vertical scrolling. Preserve route behavior and page content.

## Diagnosis

**Expo layout and scrolling:** `frontend/app/_layout.tsx:33-44` mounts the app stack in a flex root. `frontend/src/components/AdminShell.tsx:102-120,164,170-225` gives the shell a flex-row root, a 240px sidebar, an internal `ScrollView` for navigation, and a flex main region. Screen-level scrolling is owned by `FlatList`/`ScrollView`, not the browser document:

| Screen | Expo scroll primitives |
|---|---|
| Brands | `frontend/app/(admin)/brands.tsx:97` FlatList |
| Catalog | `frontend/app/(admin)/catalog.tsx:497,544,594` horizontal ScrollView, vertical ScrollView, FlatList |
| Categories | `frontend/app/(admin)/categories.tsx:129` FlatList |
| Spreadsheet import hub | `frontend/app/(admin)/csv-import.tsx:47` ScrollView |
| Dashboard | `frontend/app/(admin)/dashboard.tsx:94` ScrollView |
| Dispatches | `frontend/app/(admin)/dispatches.tsx:364,393` horizontal ScrollView, FlatList |
| Inventory | `frontend/app/(admin)/inventory.tsx:261,284,315` horizontal ScrollView, FlatLists |
| Login | `frontend/app/(admin)/login.tsx:59` ScrollView |
| Partners | `frontend/app/(admin)/partners.tsx:314,322,333` FlatList, horizontal ScrollView, FlatList |
| Product groups | `frontend/app/(admin)/product-groups.tsx:79` FlatList |
| Product types | `frontend/app/(admin)/product-types.tsx:146` FlatList |
| Purchases | `frontend/app/(admin)/purchases.tsx:354` FlatList |
| Racks | `frontend/app/(admin)/racks.tsx:32` FlatList |
| Register | `frontend/app/(admin)/register.tsx:77` ScrollView |
| RFQs | `frontend/app/(admin)/rfqs.tsx:591,598,613,650` horizontal ScrollViews, FlatList |
| Service requests | `frontend/app/(admin)/service-requests.tsx:182` ScrollView |
| Subcategories | `frontend/app/(admin)/subcategories.tsx:169,172` horizontal FlatList, FlatList |
| Team | `frontend/app/(admin)/team.tsx:164,195` FlatLists |

**Root cause:** Before this row, `.admin-shell` had `min-height: 100vh` but no definite height or overflow boundary. Each of 17 web page roots also used `minHeight: 100vh` (listed below), allowing the flex shell to grow with content. `.admin-main` had `min-height: 0` but no fixed-height parent or `overflow-y`, so scrolling propagated to the document. The flex sidebar stretched to the expanded row height; its `.admin-nav { overflow-y: auto }` had no constrained height and therefore grew with that sidebar instead of becoming an internal scroller.

Before the fix, browser measurement at 1366x768 found `document.documentElement.scrollHeight = 955` on all 22 admin routes; `/`, `/login`, and `/register` measured 768. The viewport minimum rules were:

- `web/src/pages/BrandsPage.tsx:189`
- `web/src/pages/CatalogPage.tsx:538`
- `web/src/pages/CategoriesPage.tsx:185`
- `web/src/pages/DashboardPage.tsx:162`
- `web/src/pages/DispatchesPage.tsx:255`
- `web/src/pages/InventoryPage.tsx:215`
- `web/src/pages/PartnersPage.tsx:326`
- `web/src/pages/ProductGroupsPage.tsx:192`
- `web/src/pages/ProductTypesPage.tsx:246`
- `web/src/pages/PurchasesPage.tsx:348`
- `web/src/pages/RacksPage.tsx:138`
- `web/src/pages/RfqsPage.tsx:446`
- `web/src/pages/ServiceRequestsPage.tsx:183`
- `web/src/pages/SettingsPage.tsx:111`
- `web/src/pages/SpreadsheetImportsPage.tsx:34`
- `web/src/pages/SubcategoriesPage.tsx:255`
- `web/src/pages/TeamPage.tsx:191`

`web/src/index.css:157-188` separately keeps the startup and login/register screens at least viewport height and flex-centers their content; those routes bypass the sidebar shell and were not changed.

## Built

Only application source file changed: `web/src/index.css`. `.admin-shell` now has `height: 100dvh`, `min-height: 0`, and `overflow: hidden`; the 240px sidebar has `height: 100dvh`, `min-height: 0`, and clips its own bounds; `.admin-nav` has `min-height: 0` while retaining `overflow-y: auto`; `.admin-main` retains `min-width: 0`/`min-height: 0` and now has `overflow-y: auto`. `AdminShell.tsx`, all page wrappers, menu items, routes, and auth screens remain unchanged.

## Browser measurements

At 1366x768, all 25 registered routes were loaded and measured after the change. Every route had document height 768 and width 1366. On admin routes the sidebar height was 768px, the main pane was 768px high and 1126px wide, and the sidebar menu had 821px scroll content in a 634px viewport. Login and Register remained without a sidebar and flex-centered; their frame centers measured x=683 and y=372 (viewport center x=683/y=384, with the existing 40px bottom padding shifting the content-area center upward 12px).

## 22b Leftovers

- **Dashboard:** the main pane scrolls internally (`scrollHeight=896`, `clientHeight=768`) in the measured state. The document itself stays at 768px; this is expected content-pane scrolling, not endless document growth.
- **Subcategories:** `web/src/pages/SubcategoriesPage.tsx:422-425,522-527` keeps the batch-import button in a fixed footer at `left: spacing.lg` (16px). Its measured bounds were x=16..1350 while the content pane begins at x=240, so the button extends under the sidebar and is clipped by the shell. Leave this for row 22b.
- **Horizontal overflow:** none measured at document or main-pane level on the 25 routes. No other clipped buttons were observed in the tested empty/loading state.

Some pages were in empty/loading states because route verification does not seed application data. Larger populated lists may increase the main pane's internal scroll height; their document height remains constrained by the shell. Browser checks for a populated data set and the Subcategories footer are listed in `migration/PENDING.md`.

**How to test:** Run `cd web && npm run build` and `npm run lint`. At 1366x768, visit every route, confirm document height remains 768px, verify menu scrolling inside the sidebar and page scrolling inside `.admin-main`, and confirm Login/Register still center without the sidebar. Record the 22b leftovers before changing page wrappers.

**Left:** Resolve the Subcategories fixed footer overlap and any additional page-specific overflow/clipped controls in row 22b.
