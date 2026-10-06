# Row 7e: Catalog CSV and delete decision

## Plan

Port Expo Web's short filtered catalog CSV export exactly, download it as the requested `catalog.csv`, and determine whether a product delete action is reachable in Expo Web before implementing any delete.

## Expo file to web file

- `frontend/app/(admin)/catalog.tsx` (`exportCatalogCsv`) -> `web/src/pages/CatalogPage.tsx`.
- Existing `web/src/utils/download-csv.ts` is reused for the browser file download.
- Product-delete outcome: see **Product delete decision** below.

## CSV behavior

The export remains Expo's current short CSV, not a master export. It exports only the currently filtered `listed` items. The header is exactly `productCode,name,category,type,subcategory,class,brand,unit,mrp,sellingPrice,discount,stock,imageUrl`. Every data cell is quoted; embedded quotes are doubled. Rows use line feeds; there is no BOM or trailing newline. An image URL is represented as `(url)`, otherwise the field is empty. The browser filename is exactly `catalog.csv`.

## Product delete decision

Expo Web uses the web table branch with inline pricing inputs and an edit action; table rows do not open the native action sheet. The QR is an image, not an action. The **Delete Item** button and secured delete modal exist only in Expo's native list/action-sheet branch. No product delete UI or API call was added to web. PENDING records **product delete: decision needed** in case the expected browser behavior should differ.

## Differences from Expo

- Expo Web opens a `data:text/csv` URL with `Linking.openURL`; the browser uses the existing Blob/anchor download helper with filename `catalog.csv`.
- No delete control was copied because it is not reachable in Expo Web. No plain or secured delete API is called by this row.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7e. Build and lint pass from `web/`.

## Left for later

- Product delete behavior requires a decision because Expo Web does not expose the native delete control.