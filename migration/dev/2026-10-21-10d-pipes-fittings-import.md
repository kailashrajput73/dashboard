# Row 10d: Pipes & fittings v1 import (web + API)

**Status:** Built (see `migration-db/dev/2026-10-21-19-product-families-pipes-import.md`).  
**Depends on:** Row 10a foundation (shared `CatalogSpreadsheetImport`, `import-templates.ts`, spreadsheet reader).

## Built (web)

- `/import-pipes-fittings`: combined page — **1 — Master sheet**, **2 — Family images**.
- Product master (full) exposes one link to pipes v1 (not on `/csv-import` hub).
- Validate-on-upload + scrollable error list + CSV error download (pipes master and images).
- Image template: **Download sheet from catalog** (`GET …/images/template`).
- `/import-pipes-fittings-images` redirects to `#family-images`.

## Built (behavior, no change to legacy)

- Legacy master / prices / stock flows and templates unchanged.
- `Product Name` on pipes sheet: optional in Excel; **not stored** — API generates name (see CATALOG-DESIGN-RULES).

## Specs

- Master columns: `migration/sheet-pipes-fittings-v1.md`, full rules in `migration-db/CATALOG-DESIGN-RULES.md`.
- Images columns: `migration/sheet-pipes-fittings-images.md`.

## How to test

Same as DB dev note; use admin login so template GET and validate POST succeed.

## Left

- Regenerate `web/map/pages/catalog-import.md` when running `node web/map/tools/generate-page-maps.mjs` (line numbers drift).
