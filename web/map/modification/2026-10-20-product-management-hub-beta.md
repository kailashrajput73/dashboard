# Added: Product management hub (beta) — 2026-10-20

**Route:** `/product-management`  
**Sidebar:** **Product management** is the only Catalog nav item (classic pages decommissioned 2026-10-21; see [2026-10-21-decommission-classic-catalog-pages.md](2026-10-21-decommission-classic-catalog-pages.md)).

## Purpose

Single-page experiment: product table + combined taxonomy filters + in-modal admin/import. If rejected, delete this route and feature folder only.

## UI zones

1. **Header** — title, counts, **Add product** (+).
2. **Toolbar row** — compact search (max ~480px) + **Export** + **Import** on the same row.
3. **Filter bar** — Category, Subcategory, Product type*, Product class*, Brand, Product group (*hidden when off in Settings taxonomy tabs).
   - Each segment: dropdown (All + values) + **+** → “Add or manage…” → manage modal.
   - Active filter chips + **Clear all**.
4. **Product table** — same as `/catalog` (`CatalogPricingRow`, editor, secured delete, CSV export of filtered list).

## Import (replaces visiting `/csv-import` for daily use on this page)

**Import** → modal step 1: three cards (master, prices, stock) — same copy as `SpreadsheetImportsPage`.  
Step 2: embedded `CatalogSpreadsheetImport` (`layout="embedded"`), same APIs as import routes.  
Batch master still documented as subcategory classic flow.

## Manage modals (per taxonomy +)

| Dimension | Add | Edit | Toggle | Delete / purge |
|-----------|-----|------|--------|----------------|
| Category | ✓ | ✓ photo/name | ✓ active | cascade + passcode |
| Subcategory | ✓ | ✓ | — | cascade + passcode |
| Brand | ✓ | ✓ logo | ✓ active | cascade + passcode |
| Product type | ✓ | photo | ✓ active | purge by type + passcode |
| Product class | — | — | — | purge by class + passcode (inferred list) |
| Product group | ✓ | ✓ name + product pick (first 200 SKUs in picker) | — | cascade + passcode |

**Parity pass (2026-10-21):** Manage modals mirror classic pages — search/chips, product peek expand, shelf price boards (when enabled), subcategory CSV import/export, batch master in Import hub, full group product picker with search, product-class facet panel with purge.

**Still intentionally absent:** bulk discount/stock bar (see removed-strip doc). **Still same as classic:** full `GET /catalog` on load (performance work later).

## Files

- `web/src/pages/ProductManagementPage.tsx`
- `web/src/features/product-management/taxonomy-filter-bar.tsx`
- `web/src/features/product-management/taxonomy-manage-modal.tsx`
- `web/src/features/product-management/import-hub-modal.tsx`
- `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` — optional `layout="embedded"`, `onImported`

## Test

1. Sidebar → **Product management**.
2. Filters combine; chips clear.
3. Export/Import on search row; import completes and table refreshes.
4. Each **+** → manage list; add/edit/delete where supported.
5. Classic **Products** and other catalog routes still work unchanged.
