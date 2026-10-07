# Row 10c: Price and stock imports

**Status:** Built; manual checks are waiting in `migration/PENDING.md`.

## Built

- Added `/import-prices` and `/import-stock` routes in `web/src/App.tsx`, both using the shared `CatalogImportPage` configuration and existing `CatalogSpreadsheetImport`.
- The Spreadsheet imports hub links now reach each page. Titles, subtitles, column help, templates, import endpoint calls, preview, and result messages match the current Expo wrappers.
- Pricing uses `POST /catalog/import/pricing`; stock uses `POST /catalog/import/stock`.
- Expo and web `rowsToPricingItems` and `rowsToStockItems` implementations are identical. No headers, aliases, normalization, delimiters, encodings, validation, or messages were changed. No package was added.

**Validation:** `npm run build` passed. `npm run lint` exited 0 with five existing warnings in `src/utils/csv.ts` (four regex escape warnings and one duplicate-branch warning).

## Expo comparison

Sources: `frontend/app/(admin)/import-prices.tsx`, `import-stock.tsx`, `frontend/src/utils/import-templates.ts`, and `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx`.

- Page configuration strings and template headers match the Expo wrappers exactly.
- Expo Router and DocumentPicker are replaced with React Router and a browser file input; DOM/layout details differ as documented in the 10a foundation note.
- Pricing/stock row mapping, endpoint payloads, and current visible validation/result text match Expo. No feature reachable in Expo Web was omitted.

## How to test

Use the disposable-product cases under Row 10c in `migration/PENDING.md`. Open the pages from Spreadsheet imports or directly at `/import-prices` and `/import-stock`.

## Left

Manual imports and backend effects remain pending. No decision-needed items identified.
