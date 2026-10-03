# Category + type photos for the partner home screen

**Date:** 2026-09-26  
**Why:** The Flutter home “Shop by Category” and type sidebar (PVC / CPVC / UPVC) were mock pictures. Real tiles must come from Mongo after admin upload, with a few photos added later in the dashboard (same as brand logos).

## What changed

- **Sheet first, photos later.** Master Excel still has SKU `image_url` only. It does **not** set category or type tile photos.
- **Category home photo** — Dashboard → **Manage Categories** → **Add photo** (file or paste URL). Stored as `imageUrl`.
- **Type photo** — Dashboard → **Product type** → **Add photo** on PVC / CPVC / UPVC (file or URL). Stored as `imageUrl` on `product_types`. Import creates the type row; photo stays until you set it.
- **Partner browse tree:** `GET /api/catalog/tree` returns only categories/types that exist in the database, with photos and product counts. New categories from a later upload show up on the next fetch.
- Catalog wipe also deletes `product_types`.

## What to tell the app developer

> Delete mock home tiles (Fittings, Valves, Sanitary, etc.). Call **`GET /api/catalog/tree`**. Draw only `data.categories`. Use `imageUrl` for the tile; if it is null, show a placeholder — do not invent extra categories. Type list = `categories[].types` (photos on `imageUrl`). Full contract: `docs/MOBILE_APP_API_HANDOFF.md` section 4.

## What you can demo

1. Upload master sheet (categories + Type column).
2. Categories → Add photo on “Pipes & Fitting”.
3. Product type → Add photo on CPVC, PVC, UPVC.
4. Open `GET /catalog/tree` — only those names, with photos.

## Deploy

Redeploy API so `/product-types` and `/catalog/tree` exist (404 means old server). Then refresh the partner app without mock data.

## Files

`backend/server.py` (`product_types`, `GET /catalog/tree`, `GET /product-types`)  
`frontend/app/(admin)/product-types.tsx`, `categories.tsx`  
`frontend/src/components/CoverImageField.tsx`  
`docs/MOBILE_APP_API_HANDOFF.md`
