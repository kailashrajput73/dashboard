# Spreadsheet / CSV imports — index (do not lose this map)

**Operator steps:** `migration/admin/spreadsheet-imports.md`  
**Catalog architecture (families, pipes v1):** `migration-db/CATALOG-DESIGN-RULES.md`  
**Web templates (download filenames):** `web/src/utils/import-templates.ts`  
**Backend routes:** `backend/app/routers/catalog.py`, `backend/app/services/pipes_fittings_import.py`

Statuses: **Legacy** = still supported; **Pipes v1** = new family/SKU path (pipes & fitting category first).

---

## Group A — Spreadsheet imports hub (`/csv-import`)

Three merge-by-`product_code` flows (unchanged contract).

| # | UI label | Route | Template download | Column spec | API |
|---|----------|-------|-------------------|-------------|-----|
| A1 | Product master (full) | `/import-products` | `product-master-template.csv` | `migration/SHEET-FORMAT.md` | `POST /api/catalog/import/master` |
| A2 | Prices & discount | `/import-prices` | `product-prices-template.csv` | same doc (pricing block) | `POST /api/catalog/import/pricing` |
| A3 | Stock quantities | `/import-stock` | `stock-qty-template.csv` | same doc (stock block) | `POST /api/catalog/import/stock` |

**Also:** Full master link from **Product master (full)** → entry to **Pipes & fittings (v1)** (not a fourth hub tile).

---

## Group B — Product master entry (legacy + pipes)

| # | UI label | Route | Template | Column spec | API |
|---|----------|-------|----------|-------------|-----|
| B1 | Product master (full) | `/import-products` | `product-master-template.csv` | `migration/SHEET-FORMAT.md` | `POST /api/catalog/import/master` |
| B2 | Import products (batch) | `/import-products-batch` | same headers as B1 | `migration/SHEET-FORMAT.md` | `POST /api/catalog/import/master` |
| B3 | Pipes & fittings (v1) | `/import-pipes-fittings` | `pipes-fittings-v1-template.csv` | `migration/sheet-pipes-fittings-v1.md` + `migration-db/CATALOG-DESIGN-RULES.md` | `POST /api/catalog/import/pipes-fittings/validate`, `POST /api/catalog/import/pipes-fittings` |
| B4 | Family images (step 2 on same page) | `/import-pipes-fittings#family-images` | **Download from catalog** (pre-filled `brand`, `product_family`; empty `image_url`) or `pipes-fittings-images-template.csv` | `migration/sheet-pipes-fittings-images.md` | `GET /api/catalog/import/pipes-fittings/images/template`, `POST …/images/validate`, `POST …/images` |

**Order for pipes:** B3 master must succeed before B4 images match families in Postgres.

**Redirect:** `/import-pipes-fittings-images` → `/import-pipes-fittings#family-images`.

---

## Group C — Other admin CSV (not on spreadsheet hub)

| # | Screen | Template | Spec / notes | API |
|---|--------|----------|--------------|-----|
| C1 | Subcategories → import | `subcategories-template.csv` | `migration/dev/2026-10-04-3b-subcategory-csv-import.md` | subcategories router |
| C2 | Purchases → bulk CSV | `purchase-lines-template.csv` | `migration/bug_fix/IMPORTS.md` (FIX-04) | purchases import |

---

## Group D — Sheet file quick reference (header row only)

| File | Path |
|------|------|
| Legacy master header | `migration/sheet-master.md` |
| Pipes v1 master header | `migration/sheet-pipes-fittings-v1.md` |
| Pipes family images header | `migration/sheet-pipes-fittings-images.md` |

---

## Dev / migration notes (web rows)

| Topic | Note |
|-------|------|
| Shared reader + templates | `migration/dev/2026-10-07-10a-spreadsheet-import-foundation.md` |
| Master + batch UI | `migration/dev/2026-10-07-10b-master-import.md` |
| Prices + stock UI | `migration/dev/2026-10-07-10c-price-stock-imports.md` |
| Pipes v1 + families (Postgres) | `migration-db/dev/2026-10-21-19-product-families-pipes-import.md` |
| Pipes v1 UI | `migration/dev/2026-10-21-10d-pipes-fittings-import.md` |

---

## Outdated references (read with care)

| Doc | Issue |
|-----|--------|
| `migration/bug_fix/IMPORTS.md` | Paths say `frontend/` — use `web/`; rules for master/prices/stock still valid |
| `backend/README.md` Alembic line | May cite an old revision id; run `alembic current` on your DB |
| `migration/SHEET-FORMAT.md` | **Legacy master only**; pipes v1 uses separate columns (Size mm/cm/in, `product_family`, no per-row `image_url`) |
