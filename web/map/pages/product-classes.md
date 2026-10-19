# product-classes

| | |
|---|---|
| **Map ID** | `product-classes` |
| **Route** | `/product-classes` |
| **Source file** | `web/src/pages/ProductClassesPage.tsx` (**19 lines** — wrapper only) |
| **Real UI** | `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx` |
| **SOW** | Taxonomy (partner browse); class column on master sheet |
| **Operator guide** | `migration/admin/product-classes.md` |
| **Full control map** | **`web/map/features/catalog-facet-page.md`** ← read this |

## Wrapper (what the page file does)

| File:line | Function | Purpose |
|-----------|----------|---------|
| `ProductClassesPage.tsx:6-8` | `valueOf` | Read `productClass` from each catalog item |
| `ProductClassesPage.tsx:11-18` | `return <CatalogFacetPage …>` | Pass title, empty text, `purgeField="productClass"`, testID prefix `product-class` |

**No buttons in the page file.** All controls, lines, and APIs are in **`catalog-facet-page.md`**.

## Your tags

| Area | KEEP / REVIEW / REMOVE | Notes |
|------|------------------------|-------|
| Entire route vs merge into Settings | | Facet page loads **GET /catalog** (all products) |
| `facet.peek` expand list | | Likely REMOVE/REDESIGN for client demo |

_Regenerate wrapper stats: `node web/map/tools/generate-page-maps.mjs`._
