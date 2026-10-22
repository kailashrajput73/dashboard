# Decommission legacy full product master in import hub (2026-10-22)

**Removed from Product management → Import (inside product master only):**

- **Legacy client master** UI (`kind=master`): long Columns list (Category, Type, Sub-Category, …), category routing — not shown when you open product master.

**Kept (hub list → inner screen):**

- **1 — Product master (full)** on the import list opens a **second menu** (one button per catalog format). Today: **Pipes & fittings (v1)** only; that button opens the two-step upload page. More buttons can be added without changing prices/stock rows on the top list.
- **Prices** and **stock** imports unchanged.
- **Batch master** still only via Subcategories manage (+) → Import products (batch sheet).
- Legacy master UI remains in `CatalogImportPage.tsx` / `CatalogSpreadsheetImport` for rewrite reference; not linked from the hub.

**Redirects:** `/import-products` and `/import-pipes-fittings` open the pipes v1 flow on `/product-management`.

**Rebuild legacy full master in hub:** restore picker `{ kind: "master" }` and `showPipesFittingsEntry` block in `import-hub-modal.tsx` from git history before this change.
