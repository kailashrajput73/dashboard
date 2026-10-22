# Web UI modifications log

Ad-hoc UI changes on the React admin (`web/`). Each entry documents what changed and enough detail to rebuild removed behavior later.

| Date | Doc | Summary |
|------|-----|---------|
| 2026-10-20 | [2026-10-20-catalog-removed-filter-strip.md](2026-10-20-catalog-removed-filter-strip.md) | Removed category pills, filter modal, helper copy, and bulk pricing bar from `/catalog` |
| 2026-10-20 | [2026-10-20-catalog-controls-after-strip-removal.md](2026-10-20-catalog-controls-after-strip-removal.md) | Current catalog page controls after the strip removal (rewrite reference) |
| 2026-10-20 | [2026-10-20-product-management-hub-beta.md](2026-10-20-product-management-hub-beta.md) | Beta `/product-management` hub (filters, import modal, taxonomy manage) |
| 2026-10-21 | [2026-10-21-decommission-classic-catalog-pages.md](2026-10-21-decommission-classic-catalog-pages.md) | Sidebar/dashboard decommission; legacy routes redirect to hub |
| 2026-10-22 | [2026-10-22-pipes-import-hub-parity.md](2026-10-22-pipes-import-hub-parity.md) | Pipes/families import 100% in Product management import hub |
| 2026-10-22 | [2026-10-22-decommission-legacy-master-import-hub.md](2026-10-22-decommission-legacy-master-import-hub.md) | Remove legacy full master Columns upload from import hub |
| 2026-10-22 | [2026-10-22-merge-pipes-pr-with-hub.md](2026-10-22-merge-pipes-pr-with-hub.md) | Git merge: pipes PR + hub design (299393b confusion resolved) |
| 2026-10-22 | [2026-10-22-product-management-list-export-paging.md](2026-10-22-product-management-list-export-paging.md) | Server paging, read-only list, export modes, pipes image CSV filter |

**Scope:** `web/` only. Never modify `frontend/` or `backend_refactor/`.

**Branch when applied:** `migration-mongodb-to-postgresql`
