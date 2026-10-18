# 22c-A Responsive Shell and Page Containers

Date: 2026-10-18

Implemented the mobile shell and responsive page-container work in two batches. Below 1024px, the fixed desktop sidebar becomes a drawer controlled by a top-bar menu; it closes on item selection, overlay click, and Escape. Responsive page padding, horizontal overflow containment, Header action wrapping, and modal sizing apply only below 1024px. No API, route, copy, or page data behavior was changed.

## Application files

- `web/src/components/AdminShell.tsx`
- `web/src/components/UI.tsx`
- `web/src/index.css`
- `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx`
- `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx`
- `web/src/pages/BrandsPage.tsx`
- `web/src/pages/CatalogPage.tsx`
- `web/src/pages/CategoriesPage.tsx`
- `web/src/pages/DashboardPage.tsx`
- `web/src/pages/DispatchesPage.tsx`
- `web/src/pages/InventoryPage.tsx`
- `web/src/pages/PartnersPage.tsx`
- `web/src/pages/ProductGroupsPage.tsx`
- `web/src/pages/ProductTypesPage.tsx`
- `web/src/pages/PurchasesPage.tsx`
- `web/src/pages/RacksPage.tsx`
- `web/src/pages/RfqsPage.tsx`
- `web/src/pages/ServiceRequestsPage.tsx`
- `web/src/pages/SettingsPage.tsx`
- `web/src/pages/SpreadsheetImportsPage.tsx`
- `web/src/pages/SubcategoriesPage.tsx`
- `web/src/pages/TeamPage.tsx`

## Verification

- MODE B with isolated Playwright fixtures: all 25 routes at 1920, 1366, 1024, 768, and 390px (125 measurements).
- Document horizontal overflow: 0 cases. Interactive-element center hit failures: 0. Unhandled API mocks/page errors: 0. The Catalog pricing table scrolls horizontally inside its own wrapper at 1366px and narrower; document width remains bounded.
- Drawer open, overlay close, Escape close, and item close: pass on authenticated mobile routes.
- 1920px/1366px geometry differences over 1px: 0. At 390px, the Subcategories and Partners header action overlaps are resolved. Login/Register center offset is 0px at all five viewport widths.
- `npm run build`: passed; existing bundle-size advisory remains. `npm run lint`: completed with five existing warnings in `web/src/utils/csv.ts`.
- Live-backend verification and visual owner review remain pending because the local backend was unavailable; see `migration/PENDING.md`.
