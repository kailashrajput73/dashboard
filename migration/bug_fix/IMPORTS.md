# IMPORTS — bug fix & policy notes

## Split upload rules (expected behavior)

| File | Updates on existing SKU |
|------|-------------------------|
| Master | Taxonomy, ROL, HSN, names, etc. — **not** price, discount, stock |
| Prices | MRP, discount, selling price |
| Stock | Quantity only |
| Subcategory CSV | Subcategory records only — **not** product discount |

Master with discount column filled does **not** change an existing product’s discount — **not a bug**.

---

## FIX-03 — Prices import 49% stays 45% (test step 7)

**Reported:** After 45% via prices/stock path, user set 49% in prices sheet (twice); discount still 45%.

**Confirm before coding:**

1. Use **Prices import** screen only (not master, not subcategory).
2. One known `productCode`, column headers per `frontend/src/utils/import-templates.ts` (PRICING_TEMPLATE_HEADERS).
3. Check product in UI or `GET /api/catalog?search=CODE` before and after.

If still 45% → bug in pricing import path (`POST /api/catalog/import/pricing`) or CSV column mapping (`frontend/src/utils/csv.ts`).

---

## FIX-04 — Purchase CSV (test step 11)

**Reported:** First test suggested CSV format/message needs improvement.

**Repro note:** Document required columns (productCode, quantity, listPrice, etc.) from purchases screen / `PURCHASE_TEMPLATE_HEADERS`.

---

## FIX-11 — Should master also update stock + price?

**Options:** A) keep split, B) master updates price when columns filled, C) migration-only full sheet.

**Decision:** pending product owner. See `README.md`.
