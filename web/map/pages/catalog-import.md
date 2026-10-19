# catalog-import

| | |
|---|---|
| **Map ID** | `catalog-import` |
| **Route** | `/import-products, /import-products-batch, /import-prices, /import-stock` |
| **Source file** | `web/src/pages/CatalogImportPage.tsx` (63 lines) |
| **SOW** | Product import |
| **Operator guide** | `migration/admin/spreadsheet-imports.md` |

## Load / refresh

- No `useEffect` in this file (may delegate to a feature component).

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L19 | `getPageConfig` | (see endpoints.ts) | `function getPageConfig(kind: CatalogImportKind, batch: boolean): PageConfig {` |
| L51 | `getPageConfig` | (see endpoints.ts) | `const config = getPageConfig(kind, batch);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L19 | `getPageConfig` | Open `web/src/pages/CatalogImportPage.tsx` at this line |
| L50 | `CatalogImportPage` | Open `web/src/pages/CatalogImportPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
