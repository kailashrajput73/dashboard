# catalog-import

| | |
|---|---|
| **Map ID** | `catalog-import` |
| **Route** | `/import-products`, `/import-products-batch`, `/import-prices`, `/import-stock`, `/import-pipes-fittings` (redirect: `/import-pipes-fittings-images` → `#family-images`) |
| **Source file** | `web/src/pages/CatalogImportPage.tsx` |
| **Feature** | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` |
| **SOW** | Product import |
| **Operator guide** | `migration/admin/spreadsheet-imports.md` |
| **Import index** | `migration/SHEET-IMPORTS-INDEX.md` |

## Routes by kind

| kind prop | Page |
|-----------|------|
| `master` | Full legacy master; link to pipes v1 |
| `master` + `batch` | Batch master (subcategories entry) |
| `pricing` | Prices import |
| `stock` | Stock import |
| `pipes-fittings` | Combined pipes v1: master + images (`PipesFittingsCombinedImportPage`) |

Pipes images are not a separate top-level route anymore; they are embedded as step 2 on `/import-pipes-fittings`.

## API (via `web/src/api/endpoints.ts`)

Legacy: `importCatalogMaster`, `importCatalogPricing`, `importCatalogStock`.

Pipes: `validatePipesFittingsImport`, `importPipesFittings`, `fetchPipesFittingsImagesTemplate`, `validatePipesFittingsImagesImport`, `importPipesFittingsImages`.

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate line-level map: `node web/map/tools/generate-page-maps.mjs` (optional; this file is manually updated for pipes routes)._
