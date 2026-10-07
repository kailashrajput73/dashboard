# Row 10b: Master sheet imports

**Status:** Built; manual checks are waiting in `migration/PENDING.md`.

## Built

- Added one reusable web page component for both full master import and batch master import. Registered `/import-products` and `/import-products-batch` in `web/src/App.tsx`.
- The Spreadsheet imports hub's full-master link now opens the full page. The Subcategories batch-import link now opens the batch page instead of the placeholder.
- Full master retains the Expo category-routing control; batch master omits it, matching the Expo wrappers. Both use the same `CatalogSpreadsheetImport` component and `MASTER_TEMPLATE_HEADERS`.
- Matched the hub labels and subtitles to current Expo. Full master uses the exact template header and help text from Expo. No sheet columns, parsing, matching, normalization, delimiters, encodings, validation, or backend contracts changed.
- Adjusted the master import result for category-routing confirmation to use Expo's shorter confirmation text; the normal **Import now** flow retains the stock/prices notice. Both use the same `/catalog/import/master` payload and rules.

**Validation:** `npm run build` passed. `npm run lint` exited 0 with five existing warnings in `src/utils/csv.ts` (four regex escape warnings and one duplicate-branch warning).

## Expo comparison

Source files: `frontend/app/(admin)/import-products.tsx`, `import-products-batch.tsx`, `csv-import.tsx`, and `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx`.

- The two Expo wrappers are represented by a single configurable web page to avoid copying import behavior. The full/batch titles, subtitles, help, and category-mode visibility match Expo.
- Expo Router navigation is React Router navigation. The Expo DocumentPicker/read-asset flow is the browser file input/`File.arrayBuffer` flow; the reader/parser and user-facing validation remain shared equivalents.
- Expo React Native layout becomes DOM layout and existing web UI components. This changes layout mechanics only.
- No decision-needed Expo-only behavior was identified for full or batch master imports.

## How to test

Use the disposable master/batch cases listed under Row 10b in `migration/PENDING.md`. Full master is reachable from Spreadsheet imports; batch master is reachable from Subcategories → Import products (batch sheet).

## Left

Manual API/import behavior checks remain pending. Prices and stock routes are row 10c.
