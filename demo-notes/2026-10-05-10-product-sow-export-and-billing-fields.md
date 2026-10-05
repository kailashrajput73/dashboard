# Product SOW: catalog export and billing fields

**Date:** 2026-10-05

## Why

Close the remaining Product Management SOW gaps in the admin Expo app: catalog export should use the master sheet schema, and HSN/GST/package values already supported by the API should be editable on the product form.

## What changed

- Catalog export uses `MASTER_TEMPLATE_HEADERS` and exports the same 19 columns as the master sheet, with no stock column.
- Exported values include product class, HSN code, GST, package size, package MRP, and reorder level. Size in mm is converted to cm when no `sizeCm` is stored. `image_url` contains full HTTP(S) URLs only; data URLs are left blank.
- Product add/edit now loads and saves HSN code, GST rate, pack size (`stdPkg`), and MRP per pack (`mrpPkg`). GST uses the same percent normalization as master import.
- Aliases and display sequence remain form-only; no import columns were added. Master/prices/stock import behavior was not changed, including the rule that master re-import does not overwrite price or stock fields on existing product codes.
- Backend code and API routes were not changed.

## How to verify

1. Export a product with HSN, GST, pack size, package MRP, and ROL set. Confirm the CSV header matches `SHEET-FORMAT.md` exactly and the values appear under the corresponding columns; confirm there is no stock column.
2. Add or edit a product with HSN code, GST (%), pack size, and MRP per pack. Save, reopen the product, and confirm all four values persist.
3. As a smoke check, master-re-import an existing product code with changed discount and stock cells; confirm existing discount and stock remain unchanged.

## Files

- `frontend/app/(admin)/catalog.tsx`
- `frontend/src/api/endpoints.ts`
- `demo-notes/README.md`
- `migration/bug_fix/README.md`