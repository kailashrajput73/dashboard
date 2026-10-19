# catalog

| | |
|---|---|
| **Map ID** | `catalog` |
| **Route** | `/catalog` |
| **Source file** | `web/src/pages/CatalogPage.tsx` (714 lines) |
| **SOW** | Product §4 |
| **Operator guide** | `migration/admin/catalog.md` |

## Control registry (file → line → function → result)

| Map ref | Block | File:line | Function | Purpose | API / result |
|---------|-------|-----------|----------|---------|--------------|
| `catalog.load` | Page open | `CatalogPage.tsx:60-83` | `useEffect` → `fetchData` | Load categories, brands, **full catalog**, subcategories | GET `/categories`, `/brands`, `/catalog`, `/subcategories` |
| `catalog.refresh` | After save/delete | `CatalogPage.tsx:179-189` | `load` | Same four lists | Same |
| `catalog.export` | Header | `CatalogPage.tsx:248+`, button **L294** | `exportCatalogCsv` | Download master-shaped CSV for **filtered** rows only | Client CSV only |
| `catalog.add` | Header **L299** | opens editor modal | `setEditorOpen(true)` | New product form | — |
| `catalog.filter` | **L341** | Filter modal | type/class/brand chips | Narrows `listed` in memory | — |
| `catalog.save` | Editor modal | `CatalogPage.tsx:191-203` | `saveItem` | Create or update product | POST/PUT `/catalog` → `load()` |
| `catalog.delete` | Row/modal | `CatalogPage.tsx:205-217` | `confirmDelete` | Secured delete one SKU | POST `/catalog/{id}/delete-secured` |
| `catalog.bulk-discount` | Bulk bar **L381-382** | `applyListed("discount")` L219+ | Bulk discount on **listed** only | POST `/catalog/pricing-bulk` |
| `catalog.bulk-stock` | **L383-384** | `applyListed("stock")` | Bulk stock on **listed** only | POST `/catalog/pricing-bulk` |
| `catalog.row-pricing` | Table rows | `updateCatalogPricing` (grep in file) | Per-row MRP/discount/stock save | PATCH `/catalog/{id}/pricing` |

## Load / refresh

- **L60** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L56 | `listCategories` | GET /categories | `() => Promise.all([listCategories(), listBrands(), listCatalog(), listSubcategories()]),` |
| L56 | `listBrands` | GET /brands | `() => Promise.all([listCategories(), listBrands(), listCatalog(), listSubcategories()]),` |
| L56 | `listCatalog` | GET /catalog | `() => Promise.all([listCategories(), listBrands(), listCatalog(), listSubcategories()]),` |
| L56 | `listSubcategories` | GET /subcategories | `() => Promise.all([listCategories(), listBrands(), listCatalog(), listSubcategories()]),` |
| L194 | `updateCatalogItem` | PUT /catalog/{id} | `if (editing) await updateCatalogItem(editing.id, body);` |
| L195 | `createCatalogItem` | POST /catalog | `else await createCatalogItem(body);` |
| L209 | `deleteCatalogItemSecured` | POST /catalog/{id}/delete-secured | `await deleteCatalogItemSecured(deleteTarget.id, credentials);` |
| L233 | `applyCatalogPricingBulk` | POST /catalog/pricing-bulk | `const result = await applyCatalogPricingBulk(` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L29 | `CatalogPage` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L179 | `load (useCallback)` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L191 | `saveItem` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L205 | `confirmDelete` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L219 | `applyListed` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L248 | `exportCatalogCsv` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L509 | `FacetPicker` | Open `web/src/pages/CatalogPage.tsx` at this line |
| L584 | `filterButtonStyle` | Open `web/src/pages/CatalogPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L294 | `export-catalog-csv` | `exportCatalogCsv` |
| L299 | `open-add-item` | `—` |
| L341 | `open-catalog-filter` | `—` |
| L381 | `bulk-discount-input` | `() => void applyListed("discount")` |
| L383 | `bulk-stock-input` | `() => void applyListed("discount")` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
