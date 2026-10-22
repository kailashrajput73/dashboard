# Merge: pipes PR + product management hub (2026-10-22)

## Problem

Local work mixed **299393b-style decommission** (staged index) with **refined hub UX** (working tree) while **origin** had **11 commits** from the pipes & fittings PR (`45a6100`).

## Resolution

1. Staged **working tree** (not the old staged snapshot) — import hub with Product master submenu, pipes-only flow, no legacy full master in hub.
2. Committed unified stack (hub + `SheetValidationPanel` + migration `0019` + backend routers).
3. Merged `origin/migration-mongodb-to-postgresql`; conflicts resolved by **keeping hub design**:
   - `App.tsx` — `/product-management`, legacy redirects, import deep links.
   - `CatalogSpreadsheetImport.tsx` — validate-on-upload, embedded layout, `onOpenPipesFittings`, column help (i).
   - `.env.example` — commented options (proxy default).

## Test

- `npm run build` in `web/`
- Log in → Product management → Import → Product master (full) → Pipes & fittings (v1) → upload + validation
- Deep links: `/import-pipes-fittings`, `/import-pipes-fittings-images` → hub import modal
- Backend: `alembic upgrade head` (0019), API on **8001**
