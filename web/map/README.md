# Web admin UI map (read before editing `web/`)

**Purpose:** Short, addressable docs so you can say *“on map `catalog`, control `export-catalog-csv`, remove”* without reading 700-line React files. Each entry includes **file, line, function, block, API, result**.

**Not a replacement for:** `migration/admin/*.md` (how operators use the app) or `SOW.pdf` (contract). This is for **your cleanup and client-demo decisions**.

---

## How to read (2 minutes)

1. Open **`INDEX.md`** → pick route → open **`pages/<name>.md`**.
2. Skim **Screen blocks** and **Load / refresh** (what data appears on open).
3. Use **Control registry** or **testID** tables: note **Line** → open that line in the **Source file**.
4. If the page delegates UI, follow **Shared UI map** (e.g. Product class → `features/catalog-facet-page.md`).
5. Fill **Your tags** (`KEEP` / `REVIEW` / `REMOVE` / `REDESIGN`) when you decide.

---

## How to tell an agent what to change

Use this pattern (no ambiguity):

```text
Map: web/map/pages/subcategories.md
Control: testID `subcategory-products-{id}` block (ShelfPriceBoard expand)
Action: REMOVE from nav / hide feature — do not change import rules
File hint: web/src/pages/SubcategoriesPage.tsx around L400+
```

Or:

```text
Map: web/map/features/catalog-facet-page.md
Ref: facet.peek (ProductPeekList)
Action: REDESIGN — do not list all SKUs; link to /catalog?filter=...
```

---

## Line numbers

- Generated from current `web/src/pages/*.tsx` (and key `features/*`).
- **Drift:** any edit above a control shifts lines. Re-run:

```bash
node web/map/tools/generate-page-maps.mjs
```

- **API names** map to HTTP in the table via `web/src/api/endpoints.ts` → `backend_refactor` routes.

---

## Folder layout

| Path | Contents |
|------|----------|
| `INDEX.md` | Route → map file → one-line purpose |
| `pages/*.md` | One file per screen component |
| `features/*.md` | Shared widgets used by multiple routes |
| `shared-shell-and-components.md` | Sidebar, login shell, modals, CSV helpers |
| `tools/generate-page-maps.mjs` | Regenerate line/testID/function tables |

---

## Part 2 (your cut list)

Use the **Your tags** section in each page map, or add `DECISIONS.md` later with the same Map IDs — synced with this inventory (plan part 2).
