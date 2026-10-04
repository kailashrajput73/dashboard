# Row 3b: Subcategory CSV import

## Planned and built

Added the subcategory template, CSV import, and CSV export controls to the React web Subcategories page. Added the existing batch-product-import button and its placeholder route so it continues to navigate as it does in Expo. No packages were added, and `frontend/` and `backend/` were not changed.

## Expo file to web file

- `frontend/app/(admin)/subcategories.tsx` -> `web/src/pages/SubcategoriesPage.tsx`: import, export, template, and batch-import controls.
- `frontend/src/utils/csv.ts` -> `web/src/utils/csv-reader.ts`: the small CSV reader needed by this screen, including its encodings, delimiter/header handling, and errors.
- `frontend/src/utils/import-templates.ts` -> `web/src/pages/SubcategoriesPage.tsx` plus `web/src/utils/download-csv.ts`: the subcategory template bytes and browser download.
- `frontend/src/utils/read-asset-bytes.ts` -> browser `File.arrayBuffer()` in `web/src/pages/SubcategoriesPage.tsx`.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: reused `importSubcategories`; no endpoint or API changes.
- Expo's batch import route -> `web/src/App.tsx`: added `/import-products-batch` as an `EmptyPage` placeholder.

## CSV and API behavior

The template is `subcategories-template.csv` with a UTF-8 BOM and the exact content `name,category\n`. Import calls `POST /api/subcategories/import` with `{ items: [{ name, category }] }`. The parser retains Expo's UTF-8, UTF-8 BOM, UTF-16 LE/BE decoding, comma/semicolon/tab delimiter detection, header normalization, quoted-cell handling, blank-row handling, and parse errors. Binary Excel files receive Expo's exact rejection message.

Rows map `name` or `subcategory` to the name, and `category` to the parent category. Expo's screen also checks a literal `parent category` key, but its parser normalizes that header to `parent_category`, so that fallback is ineffective. The web keeps that effective behavior unchanged. Rows without both mapped values are filtered out; if none remain, the screen shows `CSV needs name and category columns.`

On success, the existing list loader runs before the screen shows `Subcategory import: X added, Y skipped.` Thus newly imported rows appear without a manual reload. API validation errors retain Expo's displayed error message. The API also returns row-numbered details in its response body, but Expo does not render those details, and neither does this screen.

## Export parity

Export is built exactly as Expo builds its CSV text: `name,category` first, then every loaded subcategory in list/API order; cells are quoted only when they contain a comma, quote, or line feed, with embedded quotes doubled. Rows are joined with line feeds, with no BOM and no final newline. No filtered-list export or additional columns were added.

Expo passes a `data:text/csv;charset=utf-8` URL to `Linking.openURL` and does not specify an export filename. The web downloads the same CSV content bytes using a Blob and an anchor named `subcategories.csv`; this browser filename is the necessary deterministic download name, not a filename specified by Expo. The template name and bytes are identical to Expo's.

## Differences from Expo

- Expo's document picker is replaced by an unrestricted browser file input because Expo includes `*/*` (any file type). The selected `File` is read with `arrayBuffer()`.
- Expo opens data URLs for CSV downloads. The web uses a Blob URL and an anchor with a download filename.
- The export content is byte-for-byte equivalent, but Expo does not set a filename; the web uses `subcategories.csv`.
- The batch product import button navigates to `/import-products-batch`, which remains a placeholder until row 10. No batch import workflow was built here.

## Test

1. Open Subcategories and download the template. Confirm its filename and `name,category` header.
2. Make a CSV with those two columns and a new subcategory under an existing category, import it, and confirm the success counts and that the row appears without reloading.
3. Choose an `.xlsx` file and confirm the Excel rejection message. Try a CSV with no usable rows and confirm the existing validation message.
4. Export and check that the file contains `name,category` and the full current list, including rows outside the current filter.
5. Select **Import products (batch sheet)** and confirm it navigates to the placeholder page.

`get_errors` reported no TypeScript diagnostics in the changed web files. `npm run build` could not run because this environment has no `npm` or Node executable.

## Left for later

- Row 3c shelf price board.
- Row 10 batch product-import workflow. Its button and placeholder route are present; the route content is still the placeholder.