# Pipes & fittings import — Product management hub parity (2026-10-22)

**Goal:** Everything from remote commit `45a6100` (product families, pipes v1, family images, validate-on-upload) works inside **Product management**, not on removed standalone routes.

## Where each old entry point went

| Old (remote branch) | New (hub) |
|---------------------|-----------|
| `/import-pipes-fittings` | Redirect → `/product-management` + import modal **Pipes & fittings (v1)** |
| `/import-pipes-fittings-images` | Same redirect; scrolls to **2 — Family images** section |
| Full master `/import-products` → “Pipes v1” card | **1 — Product master (full)** in import modal → same card → switches to pipes flow in modal |
| Combined page step 1 + step 2 | Import modal **Pipes & fittings (v1)** (two `CatalogSpreadsheetImport` sections) |
| `/csv-import` hub (3 links) | Import modal picker: master, prices, stock (3 rows) |
| Batch master via subcategories page | **Subcategories** manage (+) only — not duplicated in import picker |
| Pipes v1 top-level link | **Removed** from picker; use card inside **Product master (full)** only |

## Unchanged behavior (same components / API)

- `CatalogSpreadsheetImport` kinds: `pipes-fittings`, `pipes-fittings-images`
- `SheetValidationPanel`, auto-validate on file pick, error CSV download
- Download family image sheet from catalog; empty templates
- `validatePipesFittingsImport`, `importPipesFittings`, `validatePipesFittingsImagesImport`, `importPipesFittingsImages`
- Backend routes under `/catalog/import/pipes-fittings*` (requires migrated DB + row 19 backend on port 8001)

## Files

- `web/src/features/product-management/import-hub-modal.tsx`
- `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx`
- `web/src/features/catalog-import/SheetValidationPanel.tsx`
- `web/src/pages/ProductManagementPage.tsx` (deep link state)
- `web/src/App.tsx` (legacy redirects)

## How to test (Product management only)

1. **Import → Pipes & fittings (v1)** — upload master sheet; fix validation errors; confirm import success.
2. **Step 2 — Family images** — download from catalog, fill URLs, upload; confirm updates.
3. **Import → Product master (full)** — confirm purple **Pipes & fittings (v1)** card opens pipes flow inside modal.
4. Open `/import-pipes-fittings-images` in address bar — lands on hub with step 2 in view.
5. Legacy master/prices/stock imports still work from the same modal.
