# Catalog architecture rules (locked)

**Status:** Hard rules for catalog storage, imports, and API shape.  
**Do not change** these decisions unless the team explicitly starts a **full catalog redesign** (new doc + migration plan), not a routine feature.

**Scope:** `backend/` catalog + taxonomy + pricing imports, `web/` catalog upload screens, partner/mobile catalog JSON.

**Related:** `migration/SHEET-FORMAT.md` (legacy master columns; superseded for new work by **Pipes & fittings v1** below).

**Signed off:** 2026-10-21 — family/SKU split, pre-upload validation, generated display names, `product_family` column, unique `product code`, separate image sidecar.

---

## Locked decisions (why they last)

| Decision | Why it lasts |
| --- | --- |
| **SKU = one sellable row** (`product code` unique; stock, price, RFQ, dispatch, QR all hang off code) | Matches SOW + everything you already built |
| **Family = one logical product** (your `product` column + taxonomy + brand) | Fixes repetition without breaking mobile “list of items” |
| **Taxonomy tables** (category, type, subcategory, class, brand) + **family table** + **catalog/SKU table** | Normal Postgres; not Mongo cosplay |
| **Separate imports**: structure (master) / **prices** / **stock** (and purchases for stock-in) | You already proved this in ops |
| **Per-category upload** (pipes & fittings first, others later) | Scales to 7–8 sheet shapes without one monster importer |
| **Images on family**, not on every row | Forever correct |
| **API returns flat product JSON** (join family → each SKU at read time) | Apps do not need to know your internal split |

---

## Family vs SKU — where each field lives

| Field | Family (once) | SKU (per `product code`) |
| --- | --- | --- |
| Category, Type, Sub-Category, class, Brand | ✓ (via FKs + family key) | — |
| **product_family** (sheet column; was `product`) | ✓ | — |
| **HSN, GST, UoM** | ✓ | — (API may echo joined values on each SKU) |
| **image** (sidecar sheet only) | ✓ | — |
| Product Name | — | **Not stored** — generated at read time (see below) |
| Size, Length | — | ✓ |
| **product code** | — | ✓ **unique** (core key for stock, price, RFQ, dispatch, QR) |
| MRP, discount, Selling Price, Pack Size, MRP Pkg, ROL | — | ✓ (may still use **prices** import by code for frequent updates) |

**Column rename:** sheet header **`product_family`** (not `product`). Importers may accept legacy `product` with a warning until templates are updated.

**Product Name on sheet:** optional for humans preparing the file. Pre-upload validation may require it for readability checks, but **import does not persist** `name` / `productName` columns — display strings are **generated** when serving API/list (same fields clients already see).

**Images:** never on the master sheet. Separate upload: sidecar file with **`brand`**, **`product_family`**, **`image_url`** (scoped to the same category, e.g. Pipes & fitting).

---

## Family key (identity)

One family row per:

`normalize(category) + normalize(type) + normalize(sub_category) + normalize(class) + normalize(brand) + normalize(product_family)`

Normalization (see next section) ensures `KING` and `King` are the same brand. A typo such as **`KINGS`** is a **different** brand — must fail validation if the row intended `KING`.

---

## Pre-upload “sheet program” (mandatory before any write)

No database writes until the full file passes validation. Two phases:

1. **Header gate** — wrong template → **zero rows imported**; response lists missing/extra/renamed columns vs `pipes_fittings_v1` (or selected category template).
2. **Row gate** — every data error returns **sheet row number** (Excel row), **column name**, and **message** (e.g. “Row 47, Brand: ‘KINGS’ not found; did you mean ‘KING’?”).

### Case and spelling (taxonomy + family block)

For **Category, Type, Sub-Category, class, Brand, product_family**:

- Compare using **normalized form**: trim, collapse internal spaces, **case-fold** (treat `KING`, `King`, `KiNg` as one value).
- **Within the same upload file**, all rows that should share an entity must use the **same normalized value**. If two rows differ only by casing, **auto-merge to one canonical display form** (e.g. title-case or first-seen spelling — pick one rule in code and document it).
- If normalized values differ (**KING** vs **KINGS**), that is an **error** (or a hard warning requiring fix) — not a silent second brand.
- After validation, create/link taxonomy rows once; SKUs reference FKs — do not store duplicate strings per SKU for the family block.

### HSN, GST, UoM — repetition is OK; conflict is not

These columns **repeat on every Excel row** on purpose. The sheet program must **not** treat repetition as an error.

For each **family key**, collect the **normalized** values of HSN, GST, and UoM from every row in that family:

| Situation | Result |
| --- | --- |
| All rows show the **same** HSN (and same GST, same UoM), copied 200 times | **Pass** — store once on the family row |
| **Different families** (e.g. COUPLER vs REDUCER TEE) with **different** HSN/GST/UoM | **Pass** — each family has its own values |
| Same family key, but row 12 has HSN `39174000` and row 47 has HSN `39181090` (after normalize) | **Error** — list both row numbers and both values |
| Same family key, GST `0.18` on some rows and `18` on others | **Pass** if normalized to the same percent; **error** if they are truly different rates |
| Same family key, UoM `Pcs` vs `PCS` vs `pcs` | **Pass** — case-fold to one UoM |
| Same family key, UoM `Pcs` on one row and `Pack` on another | **Error** — one family, one unit of measure |

There is **no** online HSN/GST lookup in v1; whatever the sheet contains is trusted **after** this consistency check. Typos are caught by **conflict within a family**, not by repeating the correct value on every size row.

If a sellable line truly needs a **different HSN than its siblings**, that line belongs under a **different family key** (e.g. different `product_family` or class) — not mixed under one family.

### Other row rules (minimum)

| Rule | On failure |
| --- | --- |
| Duplicate **product code** in file | Error: both row numbers |
| Same **product code**, different family or brand | Error |
| Required SKU fields empty (code, size policy TBD in v1 spec) | Error with row + column |
| **product code** already exists in DB with different family | Error (or explicit override mode later — default: reject) |

### Product display name (generated, not stored)

Generate for API/export (exact template to implement in code, stable forever unless sign-off):

Client Excel (reference — same logic in `generate_sku_display_name`):

```excel
=TEXTJOIN(", ", TRUE, Type, product_family, class,
  IF(AND(Size<>"", Length<>""), Size & " (" & Length & ")", Size & Length), Brand)
```

Comma-separated parts (skip blanks): **Type**, **product_family**, **class**, **size/length** (both → `size (length)`; one → that value only), **Brand**.

Sheet **Product Name** / formula column is optional for humans; import **does not persist** it.

---

## Pipes & fittings v1 — master sheet columns (target)

Upload UI: user selects category **Pipes & fitting** → only this template.

**Block A — family (repeats in Excel; stored once in DB):**  
`Category`, `Type`, `Sub-Category`, `class`, `Brand`, `HSN Code`, `GST`, `UoM`, `product_family`

**Block B — SKU:**  
`Size (mm,cm,in)`, `Length`, `product code`, `MRP (Rs) per nos`, `discount`, `Selling Price`, `Pack Size`, `MRP Pkg`, `ROL`

**Not on master:** `image_url`, `Product Name` (optional helper column allowed but not imported).

**Template id:** first row or metadata sheet value `template_id=pipes_fittings_v1` (exact mechanism TBD in implementation).

**Sidecar:** `brand`, `product_family`, `image_url` — applied after or with master; same normalization rules.

---

## Implementation rules (coding)

When building or changing catalog behavior:

1. **Preserve what works.** Existing routes, response envelopes (`{ success, data, error }`), field names on catalog JSON, and flows (list, create, edit, master/prices/stock imports, purchases, RFQ, dispatch) must keep working unless a deliberate, documented breaking change is approved.
2. **Extend, do not destroy.** Add tables/columns and join at read time; do not remove denormalized API fields clients already use without a compatibility period.
3. **Fix without rip-out.** Bugs and data-quality issues are fixed in place (transactions, validation, normalization). No “rewrite catalog from scratch” in the same branch as a small import change.
4. **Normalize in the database; flatten at the API.** Storage may use `family_id` and family-level HSN/GST/image; HTTP responses still expose the same per-SKU shape partners and `web/` expect today.
5. **One category template at a time.** Pipes & fittings first (`pipes_fittings_v1` or successor name in a future spec). Other categories add new template ids, not new storage models.

---

## Change control

- **Allowed without redesign:** New category import template, stricter validation, backfill scripts, indexes, performance, bug fixes, sidecar image upload for a category.
- **Requires new architecture doc + explicit sign-off:** Dropping `productCode` as the SKU key, returning nested `{ family, variants }` only in public API, merging prices/stock into master import, or storing images only on SKU rows again.

---

## Before coding — remaining implementation checklist

Architecture is signed off. These are **build tasks**, not open design debates:

| Item | Notes |
| --- | --- |
| Alembic: `product_families` (+ FKs) and `catalog.family_id` | Keep existing `catalog` columns during transition; join for API |
| Backfill script | Group existing PG catalog rows into families; one-time |
| `pipes_fittings_v1` validator + importer | Header gate + row errors with Excel row numbers |
| Category picker on upload page | Pipes & fitting first |
| Image sidecar upload | Same category scope |
| Display name generator | Single function used by list/get/import preview |
| Prices / stock imports | Unchanged: keyed by **product code** |
| Tests | Golden file from KING fitting sample + error cases (KING vs KINGS, bad header) |

---

## Agents

Read this file before any catalog schema, import, or API work.  
If a task conflicts with the table above, stop and ask — do not improvise a different model.
