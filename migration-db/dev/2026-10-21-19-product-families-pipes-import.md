# Post–row 22: `product_families` + pipes & fittings v1 import

**Status:** Built on branch `cursor/catalog-families-pipes-import-1d32` (merge to `migration-mongodb-to-postgresql` when approved).  
**Design (locked):** `migration-db/CATALOG-DESIGN-RULES.md`  
**Import index:** `migration/SHEET-IMPORTS-INDEX.md`

## Schema

| Object | Migration | Notes |
|--------|-----------|--------|
| `product_families` | `backend/alembic/versions/0019_product_families.py` | Family-level HSN, GST, UoM, `image_url`, `family_key` unique |
| `catalog.family_id` | same revision | Nullable FK; SKU rows point at family |

Existing `catalog` columns remain for transition; API joins family fields at read time.

## API (admin, `/api`, Bearer)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/catalog/import/pipes-fittings/validate` | Full-sheet validation; returns `errors[]` with Excel row numbers |
| POST | `/catalog/import/pipes-fittings` | Import after validation |
| GET | `/catalog/import/pipes-fittings/images/template` | CSV rows: `brand`, `product_family`, empty `image_url` from DB |
| POST | `/catalog/import/pipes-fittings/images/validate` | Match families before write |
| POST | `/catalog/import/pipes-fittings/images` | Set `product_families.image_url` |

Legacy unchanged: `/catalog/import/master`, `/pricing`, `/stock`.

## Web

- Route: `/import-pipes-fittings` — step 1 master + step 2 images on one page.
- Entry: Product master (full) → single link “Pipes & fittings (v1)”.
- Hub `/csv-import`: still only three tiles (master / prices / stock).
- Auto-validation on file pick for pipes master and images (`SheetValidationPanel`).

## Code map

- `backend/app/services/pipes_fittings_import.py`, `pipes_fittings_template.py`, `catalog_family_util.py`
- `backend/app/services/catalog_service.py` — `_catalog_json` display name + family fields
- `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx`
- `web/src/utils/import-templates.ts` — `pipes_fittings`, `pipes_fittings_images` kinds

## How to test

1. `cd backend && alembic upgrade head` (includes `0019_product_families`).
2. `uvicorn app.main:app --host 0.0.0.0 --port 8001`
3. `cd web && npm run dev`
4. Import pipes master sample; fix duplicate `product code` errors if any.
5. Download image sheet from catalog; fill URLs; upload step 2.

## Left

- Backfill script: existing `catalog` rows → `product_families` (checklist in CATALOG-DESIGN-RULES).
- Category picker on upload (optional; v1 assumes Pipes & fitting sheet).
