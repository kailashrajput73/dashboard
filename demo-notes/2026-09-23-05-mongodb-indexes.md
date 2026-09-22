# MongoDB indexes on API startup

**Date:** 2026-09-23  
**Why:** Catalog, RFQ, partner, and dispatch lists were doing full collection scans as data grows. Indexes speed equality lookups and sorted lists before VPS / large imports.

## What changed

- **`ensure_indexes()`** in `backend/server.py` runs on every app startup (after Mongo ping).
- **49 index definitions** across collections the API uses: `users`, `admin_tokens`, `partners`, `categories`, `subcategories`, `brands`, `product_groups`, `racks`, `catalog`, `pricing`, `pricing_history`, `purchases`, `rfqs`, `dispatches`, `reward_ledger`, `money_config`.
- Key fields indexed include: `id`, `productCode`, `partnerId`, `status`, `createdAt`, `contactNumber`, `token`, `adminId`, etc.
- If Mongo is unreachable, startup **skips** index creation once (no long retry loop).
- If one index fails (e.g. duplicate `productCode` blocking unique index), others still run; check API logs for `Index … failed`.

## What to tell client

> “We added database indexes so product and RFQ lookups stay fast as the catalog grows. Next phase can add list pagination and tighter API auth.”

## Deploy / ops

1. **Restart the API** after deploy so indexes are created or updated on the live database.
2. Watch startup logs for `MongoDB indexes ensured (49 definitions)` or warnings.
3. Fix duplicate `productCode` in catalog if `catalog_productCode_uq` fails, then restart.

## Not fixed by indexes alone (later work)

- Regex search on catalog/partners still scans more at huge scale.
- `GET /catalog` without pagination still returns all matching rows.
- Overview snapshot still reads many documents (indexes help some paths only).

## Files

`backend/server.py` (`ensure_indexes`, `on_startup`)

---

# Catalog browse, Class, and category/brand photos

**Same date:** 2026-09-23  
**Why:** Client app browse is category → type → sub-category → class → brand. Home-tile photos and brand logos are set by hand on those records, not from the product sheet.

## What changed

- **Browse / filters:** Catalog tree stays **Category → Type → Sub-Category → Class → Brand**. Class is stored as API `productClass` (Excel column still **Class**). List/filter: `GET /api/catalog?type=&subcategory=&product_class=&brand=`.
- **Manage Catalog:** **Category** chips stay visible (with a Category label). Type / class / brand sit behind a **Filter** button on the right.
- **Product type / Product class** admin tabs exist; Settings can hide those tabs without deleting data.
- **Import:** Master/product sheet `image_url` is **SKU photos only**. Upload does **not** write or overwrite category photos or brand logos. Class is persisted on import (`productClass`); names like SDR11 / Sch 40 can still be inferred if Class is blank.
- **Category edit / Brand edit:** Pick, replace, or remove a photo on the record itself.
  - Category → **Home photo** (`imageUrl`)
  - Brand → **Brand logo** (`logoUrl`)
- Active/inactive toggle does **not** wipe those images. Product import creating a category/brand does not set or clear the photo.

## What to tell client

> “Home pictures and brand logos are added on **Category** and **Brand** edit — not in the product Excel. The sheet only has SKU photos. The app can filter Category → Type → Sub-category → Class → Brand; Class comes from the Class column.”

## Deploy / ops

1. **Redeploy Render** with this `server.py` so `productClass`, `imageUrl`, and `logoUrl` persist. Old API left Class empty after upload.
2. After API deploy, **re-upload the product master** if Class is still blank on live catalog.
3. Then add home/brand pictures from Dashboard → Categories / Brands (not from upload).
4. Full catalog wipe (`replaceExisting` / reset tree) still deletes categories and brands, including their photos.

## Files

`backend/server.py` (catalog `productClass`, category `imageUrl`, brand `logoUrl`, import does not `$set` cover art)  
`frontend/app/(admin)/catalog.tsx` (Category chips + Filter)  
`frontend/app/(admin)/categories.tsx`, `frontend/app/(admin)/brands.tsx`  
`frontend/src/components/CoverImageField.tsx`, `frontend/src/utils/pick-image.ts`  
`frontend/src/api/endpoints.ts`, `frontend/src/utils/csv.ts`
