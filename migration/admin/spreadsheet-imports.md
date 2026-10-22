# Spreadsheet Imports

**Full import map (routes, APIs, sheet files):** `migration/SHEET-IMPORTS-INDEX.md`  
**Pipes & fittings (families, validation, display names):** `migration-db/CATALOG-DESIGN-RULES.md`

---

## Hub (`/csv-import`) — three uploads only

These three stay on the **Spreadsheet imports** screen. Merge is always by **`product_code`** (legacy master path).

| Tile | Route | Template file |
|------|-------|----------------|
| 1 — Product master (full) | `/import-products` | `product-master-template.csv` |
| 2 — Prices & discount | `/import-prices` | `product-prices-template.csv` |
| 3 — Stock quantities | `/import-stock` | `stock-qty-template.csv` |

**Pipes & fittings (v1)** is **not** on this hub. Open it from **Product master (full)** → **Pipes & fittings (v1)** (master + family images on one page).

**Batch master:** Subcategories → Import products (batch sheet) → `/import-products-batch` (same columns as full master).

---

## Availability

The full master import is available from Spreadsheet imports. The batch master import is available from Subcategories → Import products (batch sheet). Prices and stock imports are covered by row 10c (`migration/dev/2026-10-07-10c-price-stock-imports.md`).

## File types

Choose a CSV or `.xlsx` spreadsheet. Legacy `.xls` files are rejected; save them as `.xlsx` or CSV (UTF-8). The browser reader reports an error when it cannot read the workbook. Import checks should be performed through the finished row 10b/10c pages (and pipes v1 pages for the new path).

## Templates and columns (legacy master)

The template files keep the existing Expo names and headers:

- Full master and batch master use the exact 19-column header in `migration/SHEET-FORMAT.md`: `Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url`.
- Prices use `Product Code, MRP (Rs) per nos, discount, Selling Price`.
- Stock uses `Product Code, qty`.

Do not rename, reorder, or reinterpret columns on **legacy** master. On master import, existing products keep their stock and prices; use the price or stock import for those updates.

## Pipes & fittings v1 (new path)

**Route:** `/import-pipes-fittings`  
**Spec:** `migration/sheet-pipes-fittings-v1.md` + `migration-db/CATALOG-DESIGN-RULES.md`

1. **Step 1 — Master sheet** — families + SKUs (`product_family`, `product code`, size/length, pricing columns). HSN/GST/UoM repeat per row in Excel but store once per family. **Product Name** column may exist for your Excel formulas; the server **does not save** it — display names are generated on read (same TEXTJOIN logic as your sheet).
2. **Step 2 — Family images** — after step 1 succeeds, use **Download sheet from catalog** (brand + `product_family` filled, empty `image_url`), add URLs, upload. Optional empty header template: `pipes-fittings-images-template.csv` (`migration/sheet-pipes-fittings-images.md`).

Validation runs when you select a file (row/column messages + downloadable error CSV). Fix duplicate or conflicting **product code** before import.

**Prices / stock** for pipes SKUs still use hub tiles 2 and 3 by `product_code`.

## Prices

Open **Prices & discount** from Spreadsheet imports. The template columns are `Product Code, MRP (Rs) per nos, discount, Selling Price`. Product Code is required. The importer also accepts the same full client master sheet and uses only its price fields. A decimal discount such as `0.49` means 49%. If Selling Price is blank, it is calculated from MRP and discount. Price updates are sent to the existing price-import API.

## Stock quantities

Open **Stock quantities** from Spreadsheet imports. The template columns are `Product Code, qty`; `stock_qty` is also accepted. This import sets the absolute on-hand quantity, so use Purchases for incoming supplier goods. Stock updates are sent to the existing stock-import API.

## Other CSV uploads (not on this hub)

| Screen | Template | Notes |
|--------|----------|--------|
| Subcategories | `subcategories-template.csv` | Subcategory records only |
| Purchases → bulk | `purchase-lines-template.csv` | See `migration/bug_fix/IMPORTS.md` |
