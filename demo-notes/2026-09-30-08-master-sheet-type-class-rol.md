# Master sheet — Type vs class fix, ROL, final columns

**Date:** 2026-09-30  
**Why:** Client master Excel had **Type** and **class** mixed up (e.g. Type = Sch 40). That stored wrong `type` / `productClass` in Mongo and broke admin **Product type** tabs and partner app category hierarchy. Added explicit **`class`** column and **ROL** on the sheet.

## What changed

- **Final header row** (template + importer):  
  `Category, Type, Sub-Category, class, Brand, Product Name, … Pack Size, MRP Pkg, ROL, image_url`  
  Full spec: [SHEET-FORMAT.md](./SHEET-FORMAT.md)
- **Type** → API `type` (UPVC, CPVC, PVC). **class** → API `productClass` (Sch 40, SDR11). **Sub-Category** → `subcategory`.
- **ROL** → `reorderLevel` on master import (inventory low-stock; alerts/notifications later).
- **image_url** → `imageUrl` on `GET /api/catalog` (partner app shows image; admin does not build mobile UI).
- **Legacy sheets** (Type = schedule, no class column): still auto-corrected **only if `class` is empty**. New files must use the final columns.
- Admin **Download empty template (CSV)** uses the same headers as above.

## What to do after deploy

1. **Redeploy API** (VPS) with latest `server.py` — master import must accept `reorderLevel` and new taxonomy rules.
2. **Redeploy / refresh admin** so template and import help text match.
3. **Re-import master** once with the corrected sheet so existing SKUs get fixed `type` / `productClass` (merge by Product Code).
4. **Prices / stock** still separate imports for existing codes (master does not overwrite stock or prices on update).

## What to tell the app developer

> Browse/filter uses JSON from **`GET /api/catalog`**: `category`, `type`, `subcategory`, `productClass`, `imageUrl`, `productCode` / `qrCode`, `sellingPrice`, `stock`. We fixed upload mapping; **re-import master** on server before testing hierarchy. Home tiles still from **`GET /api/catalog/tree`** (category/type photos are admin-uploaded, not Excel).

## Quick demo script

1. Download template → confirm **Type** and **class** are separate columns.
2. Import corrected master → open **Product type** (UPVC…) and **Product class** (Sch 40…).
3. `GET /api/catalog?search=U4015` → check `type`, `productClass`, `reorderLevel`, `imageUrl`.
4. Inventory → low stock uses **ROL** when stock ≤ reorder level.

## Files

`demo-notes/SHEET-FORMAT.md`  
`frontend/src/utils/import-templates.ts`, `frontend/src/utils/csv.ts`  
`frontend/app/(admin)/import-products.tsx`  
`backend/server.py` (`MasterImportRow.reorderLevel`, `resolve_product_taxonomy`)
