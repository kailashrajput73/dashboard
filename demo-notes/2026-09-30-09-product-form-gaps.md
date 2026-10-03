# Product form — QR, subcategory, languages

**Date:** 2026-09-30  
**Why:** Master import parsed the ROL column but did not store it. The product form had no QR image, no subcategory, and asked the admin to type language names as JSON.

## What changed

- **Master import** writes `reorderLevel` from ROL when the cell has a number. An empty ROL cell leaves the stored reorder level as it is. Price and stock rules are unchanged.
- **QR image** on the product is generated from the product code (`qrCode` is still that code). Admin can download the PNG. No camera scanner.
- **Subcategory** picker on add/edit product lists only subcategories of the selected category. Save sends `subcategory` and `subcategoryId`.
- **Hindi (hi)** and **Gujarati (gu)** are normal inputs. They save as `multilingualNames`.

## What you can demo

1. Master-import a product with ROL filled in → `reorderLevel` matches. Re-import the same code with ROL blank → the old reorder level stays.
2. Add a product (or open one) → QR image from the product code → Download QR.
3. Pick a category, then a subcategory under that category → save → reopen → same subcategory.
4. Type Hindi and Gujarati names → save → reopen → both names are still there.

## Files

`backend/server.py` (`_run_master_catalog_import` reorderLevel)  
`frontend/app/(admin)/catalog.tsx`  
`frontend/src/components/ProductQr.tsx`  
`frontend/src/api/endpoints.ts`
