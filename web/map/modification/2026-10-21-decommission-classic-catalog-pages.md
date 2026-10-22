# Decommission classic catalog pages (2026-10-21)

**Canonical route:** `/product-management`  
**Scope:** `web/` only. Page source files are kept on disk for rewrite reference; they are no longer routed or linked.

## Removed from navigation

Sidebar **Catalog** section is a single link: **Product management**.

Previously separate sidebar entries (removed):

| Old path | Old label |
|----------|-----------|
| `/catalog` | Products |
| `/categories` | Categories |
| `/product-types` | Product type |
| `/subcategories` | Subcategories |
| `/product-classes` | Product class |
| `/brands` | Brands |
| `/product-groups` | Product groups |
| `/csv-import` | Spreadsheet imports |

## Redirects (bookmarks still work)

All legacy paths above plus dedicated import URLs redirect with `replace` to `/product-management`:

- `/import-products`
- `/import-products-batch`
- `/import-prices`
- `/import-stock`

Implementation: `web/src/components/CatalogLegacyRedirect.tsx` and `legacyCatalogPaths` in `web/src/App.tsx`.

## Dashboard

- SKU stat card opens `/product-management`.
- **Modules** grid: one **Product management** tile replaces separate catalog / category / taxonomy / import tiles.

## Source files retained (not bundled)

These remain under `web/src/pages/` for rebuild docs; Vite no longer imports them from `App.tsx`:

- `CatalogPage.tsx`
- `CategoriesPage.tsx`, `BrandsPage.tsx`, `SubcategoriesPage.tsx`
- `ProductTypesPage.tsx`, `ProductClassesPage.tsx`, `ProductGroupsPage.tsx`
- `SpreadsheetImportsPage.tsx`, `CatalogImportPage.tsx`

To restore a standalone page: re-add its `Route` in `App.tsx`, restore sidebar/dashboard links, and see the dated modification notes for behavior.

## Pipes & fittings import (2026-10-22 merge)

Remote branch added **product families** and **pipes/fittings v1** upload (validate-on-upload, family images). That work lived on **old multi-page routes** (`/import-pipes-fittings`, master page link). After decommission:

- Import hub picker includes **Pipes & fittings (v1)** (master + family images, same two steps as the old combined page).
- Legacy URLs redirect to `/product-management` with router state → import modal opens on pipes flow.
- `CatalogSpreadsheetImport` keeps remote pipes logic plus hub `layout="embedded"` / `onImported`.

## Rebuild checklist

1. Copy route + nav pattern from git history before this commit.
2. Use [2026-10-20-product-management-hub-beta.md](2026-10-20-product-management-hub-beta.md) for hub behavior.
3. Use [2026-10-20-catalog-controls-after-strip-removal.md](2026-10-20-catalog-controls-after-strip-removal.md) for legacy `/catalog` UI.
