# Removed: Catalog filter strip (2026-10-20)

**Route:** `/catalog`  
**Source (before removal):** `web/src/pages/CatalogPage.tsx`  
**Reason:** Clutter before a unified “product management” hub; bulk bar unused; filters will be redesigned when taxonomy pages are combined.

---

## What the user saw (full block, removed as one unit)

Below the search field and above the product table:

1. **Category row** — label `CATEGORY`, horizontal chip pills (`All` + one chip per category name from API), and a **Filter** button on the right.
2. **Helper paragraph** — “Day-to-day work: change MRP, discount %, or stock on a row, then Save. Selling price updates from MRP and discount.”
3. **Bulk bar** — bordered panel: “Apply to *N* listed product(s)”, discount % input + **Apply discount**, stock qty input + **Set stock**.

---

## How “listed products” worked

The table and export used a derived array `listed` = in-memory filter of full `items` from `GET /catalog`.

Filters were **AND** combined:

| Dimension | UI | State | Match rule |
|-----------|-----|-------|------------|
| Category | Chips on page | `selectedCategory` (default `"All"`) | `item.category === selectedCategory` |
| Product type | Filter modal | `selectedType` | Case-insensitive `item.type` |
| Product class | Filter modal | `selectedClass` | Case-insensitive `inferProductClass(item)` |
| Brand | Filter modal | `selectedBrand` | Case-insensitive `item.brand` |
| Search | Search input | `search` | Substring on name, product code, brand, aliases |

Changing category chip reset type, class, and brand to `"All"`.

Header subtitle showed `{listed.length} of {items.length} items`.

CSV export (`export-catalog-csv`) exported **only `listed` rows**, master-sheet column layout via `MASTER_TEMPLATE_HEADERS`.

---

## Category chips (removed)

- **Data:** `listCategories()` → chip labels = `["All", ...categories.map(c => c.name)]`.
- **testIDs:** `admin-cat-{categoryName}` (e.g. `admin-cat-All`).
- **No API** on select; only React state.

---

## Filter modal (removed)

- **Open:** `open-catalog-filter` — copied `selectedType/Class/Brand` into draft state, opened modal `catalog-filter-modal`, title “Filter products”.
- **Sections:** `FacetPicker` chips for Product type, Product class, Brand.
  - Type/class/brand option lists were **computed from current catalog items**, narrowed by category (and by draft type/class when modal open).
  - testID prefixes: `admin-type-`, `admin-class-`, `admin-brand-`.
- **Apply:** `apply-catalog-filter` — committed draft → selected, closed modal.
- **Clear:** `clear-catalog-filter` — reset all three to `"All"`, closed modal.
- **Filter button badge:** showed `Filter (n)` when n of type/class/brand were not `"All"`.
- **No API**; in-memory only.

Modal hint text: “Pick product type, class, and brand, then Apply. Category stays on the main page.”

---

## Helper copy (removed)

Static UX text only; no logic. Explained row-level MRP/discount/stock save and that selling price derives from MRP and discount (same rules as per-row pricing in `CatalogPricingRow`).

---

## Bulk bar (removed)

- **Scope:** Only products in **`listed`** (after all filters + search).
- **Discount:** `bulk-discount-input` + `bulk-discount-btn` → `applyListed("discount")`.
  - Parsed float from discount field; error if NaN.
  - API: `applyCatalogPricingBulk(listed, { discount })` → `POST /catalog/pricing-bulk`.
- **Stock:** `bulk-stock-input` + `bulk-stock-btn` → `applyListed("stock")`.
  - Parsed float from stock field; error if NaN.
  - API: `applyCatalogPricingBulk(listed, { stock })` → same endpoint.
- After success: reload catalog via same fetch as page load; if response had `skipped`, show error modal with updated/skipped counts.
- **Loading:** single `bulkSaving` flag disabled both buttons while request in flight.

**Note:** Per-row MRP/discount/stock save was **not** removed; only this bulk apply UI.

---

## API still available (backend unchanged)

Bulk endpoint remains in client: `applyCatalogPricingBulk` in `web/src/api/endpoints.ts`. Only the catalog page UI was removed.

---

## To rebuild this strip (checklist)

1. Restore state: `selectedCategory`, `selectedType`, `selectedClass`, `selectedBrand`, draft trio for modal, `filterOpen`, `bulkDiscount`, `bulkStock`, `bulkSaving`.
2. Restore `listed` useMemo with all five dimensions (category, type, class, brand, search).
3. Restore `typeChips` / `classChips` / `brandChips` useMemos (see git history on `CatalogPage.tsx` before 2026-10-20).
4. UI: category bar + Filter button; table hint; bulk bar; `AppModal` + `FacetPicker` + `Chip` components.
5. Wire bulk actions to `applyCatalogPricingBulk` as above.
6. Keep export tied to `listed` if parity with old behavior is desired.

For a **better** version later: consider server-side filter params, confirmation before bulk update, and discount plans instead of a raw “apply to all listed” bar.
