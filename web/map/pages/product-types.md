# product-types

| | |
|---|---|
| **Map ID** | `product-types` |
| **Route** | `/product-types` |
| **Source file** | `web/src/pages/ProductTypesPage.tsx` (534 lines) |
| **SOW** | Taxonomy (partner browse) |
| **Operator guide** | `migration/admin/product-types.md` |

## Load / refresh

- **L118** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L59 | `listCatalog` | GET /catalog | `const products = (await listCatalog()) || [];` |
| L63 | `listProductTypes` | (see endpoints.ts) | `types: (await listProductTypes()) || [],` |
| L187 | `updateProductType` | (see endpoints.ts) | `await updateProductType(editor.id, {` |
| L205 | `updateProductType` | (see endpoints.ts) | `await updateProductType(row.id, {` |
| L226 | `purgeCatalogByField` | POST /catalog/purge-by-field | `const result = await purgeCatalogByField({` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L31 | `typesFromCatalog` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L53 | `fetchTypesData` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L80 | `ProductTypesPage` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L96 | `load (useCallback)` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L166 | `productsFor` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L172 | `openEdit` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L177 | `save` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L203 | `toggle` | Open `web/src/pages/ProductTypesPage.tsx` at this line |
| L219 | `confirmPurge` | Open `web/src/pages/ProductTypesPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
