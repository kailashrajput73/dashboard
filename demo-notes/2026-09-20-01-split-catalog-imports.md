# Split catalog imports (commit `7930fa4`)

**Date:** 2026-09-20  
**Why:** One product spreadsheet was doing master data, MRP, discount, and stock at once — bad for daily CPVC updates and risky for wiping qty.

## What you can demo

1. **Dashboard → Spreadsheet imports** hub with three paths:
   - **Product master** — taxonomy + name + `product_code` + size + image URL. **No** MRP/stock on existing rows from this file.
   - **Prices** — `product_code`, MRP, discount % (empty = keep existing; `0` = clear).
   - **Stock** — `product_code` + qty (sets absolute on-hand).

2. **Subcategories → Import products (batch sheet)** — same columns as master, smaller files (one sub-category or brand batch).

3. **Purchases → Bulk CSV** — stock **in** from supplier (productCode, qty, list price, rack) — unchanged, still the SOW “purchase upload” path.

## Backend (must be deployed)

- `POST /api/catalog/import/master`
- `POST /api/catalog/import/pricing`
- `POST /api/catalog/import/stock`
- Legacy `POST /api/catalog/import` still exists; existing rows ignore sheet stock on update.

## Merge rule (say this to client)

- Rows match on **`product_code`**. New codes create products; existing codes update only what that import type allows.
- Normal imports **do not wipe** the whole catalog.

## Files touched

`backend/server.py`, `frontend/src/features/catalog-import/CatalogSpreadsheetImport.tsx`, import routes, `frontend/src/utils/csv.ts`, tests in `backend/tests/test_quotation_api.py`.
