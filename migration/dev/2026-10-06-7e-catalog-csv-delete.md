# Row 7e: Catalog CSV and delete decision

## Plan

Port Expo Web's short filtered catalog CSV export exactly, download it as the requested `catalog.csv`, and determine whether a product delete action is reachable in Expo Web before implementing any delete.

## Expo file to web file

- `frontend/app/(admin)/catalog.tsx` (`exportCatalogCsv`) -> `web/src/pages/CatalogPage.tsx`.
- Existing `web/src/utils/download-csv.ts` is reused for the browser file download.
- Product-delete outcome: see **Product delete decision** below.

## CSV behavior

The initial export matched Expo's former short CSV. The 2026-10-08 sync-audit follow-up now exports the filtered `listed` items using `MASTER_TEMPLATE_HEADERS`: `Category,Type,Sub-Category,class,Brand,Product Name,Size (cm),Length,Product Code,HSN Code,GST,UoM,MRP (Rs) per nos,discount,Selling Price,Pack Size,MRP Pkg,ROL,image_url`. It has a UTF-8 BOM, conditionally quotes cells and doubles embedded quotes, uses the actual HTTP(S) image URL when present, and keeps the browser filename `catalog.csv`.

## Product delete decision

Expo Web uses the web table branch with inline pricing inputs and an edit action; table rows do not open the native action sheet. The QR is an image, not an action. The Expo native list/action-sheet branch provides **Delete Item** with passcode confirmation and calls `POST /catalog/{id}/delete-secured`. The 2026-10-08 sync-audit follow-up adds a row-level web delete action using the same secured endpoint and `PasscodeConfirmModal`; it does not add plain delete.

## Differences from Expo

- Expo Web opens a `data:text/csv` URL with `Linking.openURL`; the browser uses the existing Blob/anchor download helper with filename `catalog.csv`.
- Web deletion is exposed beside the pricing row instead of Expo's native action sheet. It requires the signed-in admin contact and passcode and calls the existing secured-delete API.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7e. Build passes from `web/`; verify export columns/image URL and secured deletion using only a disposable `ZZ` product.

## Left for later

- Owner browser verification of the synced export and secured delete remains pending.