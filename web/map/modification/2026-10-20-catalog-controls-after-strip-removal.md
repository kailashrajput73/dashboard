# Catalog page controls after filter-strip removal (2026-10-20)

**Route:** `/catalog`  
**Source:** `web/src/pages/CatalogPage.tsx`  
**Title:** Manage Catalog

Use this file to reimplement or extend the catalog page without reading the whole component.

---

## Page load

| Step | Behavior | API |
|------|----------|-----|
| Mount | Parallel fetch | `GET /categories`, `GET /brands`, `GET /catalog`, `GET /subcategories` |
| Failure | `ErrorModal` with message | — |
| Loading | Centered spinner, label “Loading catalog” | — |

Categories, brands, subcategories are used by the product editor modal, not shown as filters on the main page anymore.

---

## Header

| Control | testID | Action |
|---------|--------|--------|
| Back | (Header default) | `navigate(-1)` |
| Export CSV | `export-catalog-csv` | Download `catalog.csv` for **currently listed** rows (see search below), master template columns |
| Add product | `open-add-item` | Open editor with no item (create) |

**Subtitle:** `{listed.length} of {items.length} item(s) · edit MRP, discount, and stock without re-uploading`

---

## Search (only list filter on page)

| Field | testID | Placeholder |
|-------|--------|-------------|
| Search | `product-search` | Search code, name, alias, or brand |

**Listed rows:** If search empty → all `items`. If search non-empty → filter where concatenation of name, productCode, brand, aliases (lowercase) contains query.

Empty listed + not loading → empty state: “No items yet” / “Add your first item or import a CSV file.”

---

## Product table

Horizontal scroll container: classes `admin-horizontal-scroll admin-page-container`.

**Columns (header row):** Product | cm / mm | Inch | Length | MRP | Discount % | Selling | Stock | (actions)

Each row: `CatalogPricingRow` (`web/src/features/catalog/CatalogPricingRow.tsx`)

| Row action | Behavior | API |
|------------|----------|-----|
| Edit MRP / discount / stock + Save | Per-row pricing update | PATCH-style via catalog pricing helper (see row component) |
| Edit (icon) | Open `CatalogProductEditor` for that SKU | — |
| Delete | Opens passcode modal → secured delete | `POST /catalog/{id}/delete-secured` |

Selling price on row updates from MRP and discount (same as before strip removal).

---

## Product editor modal

**Component:** `CatalogProductEditor`  
**Open from:** add header button or row edit.

| Action | API |
|--------|-----|
| Create | `POST /catalog` |
| Update | `PUT /catalog/{id}` |
| After save | Reload lists (`load`) |

Uses `categories`, `brands`, `subcategories` from page state. Can refresh categories from editor via `onCategoriesChanged`.

---

## Delete confirmation

**Component:** `PasscodeConfirmModal`  
**testID flow:** delete from row → modal “Delete product” → passcode + contact → confirm.

---

## Errors

**Component:** `ErrorModal` — global `error` string from load, save, delete, export failures.

---

## Not on this page anymore

Category chips, filter modal, table helper text, bulk discount/stock bar — documented in [2026-10-20-catalog-removed-filter-strip.md](2026-10-20-catalog-removed-filter-strip.md).

---

## Related routes (unchanged; future hub work)

**Update (2026-10-21):** Classic sidebar entries were removed; use `/product-management` or see [2026-10-21-decommission-classic-catalog-pages.md](2026-10-21-decommission-classic-catalog-pages.md).

---

## Quick test (manual)

1. Log in → **Products** (`/catalog`).
2. Confirm only search appears under header (no category row, no bulk bar, no helper line).
3. Search narrows rows; subtitle counts update.
4. Row Save still updates pricing; Add opens editor; Export downloads CSV matching visible list.
5. Delete still requires passcode.
