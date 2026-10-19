# catalog-facet

| | |
|---|---|
| **Map ID** | `catalog-facet` |
| **Route** | `(shared)` |
| **Source file** | `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx` (265 lines) |
| **SOW** | Taxonomy |
| **Operator guide** | `migration/admin/product-classes.md` |

## Why this exists

Groups **all catalog products** by a field (`type` or `productClass`) for admin taxonomy cleanup. Used by `/product-classes` (and similar pattern elsewhere). **Pain at 1000+ SKUs:** expanding a facet loads an **ungrouped product peek list** (`LinkedProducts`) — fine for demo, heavy for production editing.

## Control registry (file + line + function + result)

| Map ref | Block | File:line | Function | Purpose | API / result |
|---------|-------|-----------|----------|---------|--------------|
| `facet.load` | Initial load | `CatalogFacetPage.tsx:47-68` | `useEffect` → `listCatalog()` | Fill `products` state | GET /catalog — **full catalog in memory** |
| `facet.search` | Search input | `CatalogFacetPage.tsx:127-133` | `Input` onChange → `setQuery` | Filter facet **names** client-side | No API |
| `facet.expand` | Count chip | `CatalogFacetPage.tsx:158-163` | `ProductCountButton` → `setOpenId` | Toggle `ProductPeekList` for one facet | No API |
| `facet.peek` | Expanded list | `CatalogFacetPage.tsx:177-181` | `ProductPeekList` | Show matching products (read-only list) | No API |
| `facet.purge-open` | Trash icon | `CatalogFacetPage.tsx:166-174` | `onClick` → `setDeleteTarget` | Open passcode modal | No API |
| `facet.purge-confirm` | Passcode modal | `CatalogFacetPage.tsx:191-198` | `confirmPurge` L93-117 | Delete all products with that type/class | POST /catalog/purge-by-field → reload `load()` |


## Load / refresh

- **L47** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L39 | `listCatalog` | GET /catalog | `setProducts((await listCatalog()) || []);` |
| L49 | `listCatalog` | GET /catalog | `void listCatalog()` |
| L100 | `purgeCatalogByField` | POST /catalog/purge-by-field | `const result = await purgeCatalogByField({` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L37 | `load (useCallback)` | Open `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx` at this line |
| L82 | `productsFor` | Open `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx` at this line |
| L93 | `confirmPurge` | Open `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
