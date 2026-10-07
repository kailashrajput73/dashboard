# Row 10a: Spreadsheet import foundation

**Status:** Built; manual import checks are waiting in `migration/PENDING.md`.  
**Scope:** Web-only compile fixes and shared CSV/XLSX reader, template, and import component comparison. No import rules were changed.

## Built

- Fixed strict TypeScript errors in `web/src/utils/csv.ts` with type assertions on the optional taxonomy mapper fields. These assertions do not change runtime fallback values.
- Fixed compile errors in `web/src/utils/spreadsheet.ts`: imported the already-existing `parseCsvBytes`, removed the unused `normalizeHeader` import, typed the byte arrays with `ArrayBuffer`, and narrowed the DOM helper root to `Document | Element`.
- No packages were added. The web parser remains the existing browser implementation.

**Validation:** From `web/`, `npm run build` passes (`tsc -b` and Vite production build). `npm run lint` exits 0 with five warnings: four existing unnecessary escape warnings in the date regex and one existing duplicate `else if` warning in `mapClientTaxonomy`. Those branches/rules were not changed.

## Expo-to-web plain diffs and remaining differences

Compared current Expo and web with `diff -u` for the corresponding 10a files.

### `frontend/src/utils/csv.ts` → `web/src/utils/csv.ts`

- The only remaining diff is six `as string` assertions around `tax.type`, `tax.subcategory`, and `tax.productClass` in the two row mappers. Reason: the web TypeScript version infers optional fields from `mapClientTaxonomy`; Expo's environment did not report these errors. Runtime expressions, column aliases, matching, normalization, delimiters, decoding, row validation, results, and messages are otherwise identical.

### `frontend/src/utils/spreadsheet.ts` → `web/src/utils/spreadsheet.ts`

- The web import is `parseCsvBytes` rather than Expo's unused `normalizeHeader`; this supplies the CSV fallback call and removes an unused import.
- Browser reader function signatures use `Uint8Array<ArrayBuffer>` and the ZIP map uses that byte type. Reason: current TypeScript's typed-array generics distinguish `ArrayBufferLike` from the browser `BlobPart` type.
- `descendants` accepts `Document | Element` rather than the broader `ParentNode`. Reason: `getElementsByTagName` is available on the narrowed DOM types.
- CSV/XLSX detection, decompression, workbook parsing, row mapping, validation, and error text are otherwise unchanged. No package was introduced.

### `frontend/src/utils/import-templates.ts` → `web/src/utils/import-templates.ts`

- Template constants, filenames, BOM, CSV serialization, and column summaries are the same. The master template has the 19 headers in `migration/SHEET-FORMAT.md` in the exact order.
- Expo branches on `Platform.OS`, uses browser Blob download on web, and has a Linking fallback on native. Web delegates to the shared `downloadCsv` browser helper. Reason: React web has no React Native `Platform` or `Linking`; the helper defers object-URL revocation with `setTimeout`.

### `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx` → `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx`

- Imports use React DOM and React Router rather than React Native, Expo Router, DocumentPicker, and `readAssetBytes`; navigation is `navigate(-1)` rather than `router.back()`. Reason: browser app/platform APIs.
- File selection uses a hidden `<input type="file">`, `File.arrayBuffer()`, and a browser `ChangeEvent`; Expo uses DocumentPicker and `readAssetBytes`. Web resets the input value after selection so the same file can be selected again. The accepted extensions include `.csv`, `.xlsx`, and `.xls`; the shared reader still rejects legacy `.xls` using Expo's existing message.
- Native `SafeAreaView`, `ScrollView`, `View`, `Text`, and `StyleSheet` layout became semantic HTML elements and inline styles. Web buttons do not use Expo's `fullWidth` prop. Reason: DOM layout and the existing web UI component API.
- Web uses the shared file input ref, `onFileChange`, and `readFile`; it renames the error state and consolidates import execution into `submitImport(categoryMode)`. The same three endpoint functions receive the same mapped payloads and category override.
- Expo's separate `confirmMasterImport` reports `Imported X new, updated Y, skipped Z.`; web's unified `submitImport` also appends `Existing products kept their stock and prices.` for that confirmation path. This text difference already exists in web; it is documented, not changed, per the instruction not to alter messages.
- Badge text uses hyphens in web where Expo uses em dashes; the loading label uses `Reading...` instead of `Reading…`. These are existing presentation/text differences and were not changed.
- Expo's direct component includes the master/pricing/stock parsing and API branches. Web retains those branches with explicit import payload types. Error handling, user-visible parse validation messages, result text apart from the noted category-confirmation wording, and endpoint calls remain otherwise the same.

At completion of row 10a, the shared component was not yet mounted by the router. Rows 10b/10c have since connected `/import-products`, `/import-products-batch`, `/import-prices`, and `/import-stock` to it. Manual import checks for those routes remain under their respective rows in `migration/PENDING.md`.

## How to test

- Run `npm run build` and `npm run lint` in `web/` (both passed for this row).
- Perform the manual CSV/XLSX, template, and import checks listed under Row 10a in `migration/PENDING.md` through the now-registered row 10b/10c pages.

## Left

- No import policy or sheet-column changes.
- Manual behavior checks remain pending for the registered row 10b/10c import routes.
- Five non-blocking lint warnings remain as listed above.
