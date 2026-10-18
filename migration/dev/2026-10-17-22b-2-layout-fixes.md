# 22b-2 Layout Fixes

Date: 2026-10-17

Scope: record the layout changes in the last commit, `e3ae773` (`migrate(22b-2): layout fixes`). Per `git show --stat HEAD`, it changed 18 files (445 insertions, 617 deletions). The file-by-file notes below summarize the changes visible in `git show HEAD`.

## Files changed

- `migration/STATUS.md` — recorded row 22b-2 as Built.
- `migration/dev/2026-10-13-21a-completeness-scan.md` — rewrote the completeness report for the current app state; no UI style change.
- `migration/dev/2026-10-16-22b-layout-audit.md` — added the read-only shell and page layout audit; no UI style change.
- `web/.env.example` — updated the backend URL example/configuration guidance; no UI style change.
- `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` — removed the content max-width cap, improved label/help line sizing, changed the control group to a grid, and made inputs full width.
- `web/src/index.css` — added horizontally scrollable chip rows, scrollbar hiding for navigation/content, and shared fixed action-footer styling.
- `web/src/pages/DashboardPage.tsx` — removed the centered max-width constraint from the content wrapper.
- `web/src/pages/DispatchesPage.tsx` — removed the list max-width and moved fixed footer positioning into the shared footer class.
- `web/src/pages/InventoryPage.tsx` — removed the list max-width and centering.
- `web/src/pages/PartnersPage.tsx` — made filter chip rows use the horizontal-scroll class and removed max-width/centering constraints from controls and list.
- `web/src/pages/ProductGroupsPage.tsx` — moved fixed action-footer positioning into the shared footer class.
- `web/src/pages/PurchasesPage.tsx` — removed the content max-width and changed footer actions to a vertically stacked, full-width layout.
- `web/src/pages/RfqsPage.tsx` — made filter chip rows horizontally scrollable and removed the list max-width/centering.
- `web/src/pages/ServiceRequestsPage.tsx` — removed the content max-width and centering.
- `web/src/pages/SettingsPage.tsx` — removed the body max-width constraint.
- `web/src/pages/SpreadsheetImportsPage.tsx` — removed the import content max-width and added a fixed-size icon wrapper.
- `web/src/pages/SubcategoriesPage.tsx` — moved import-bar fixed positioning into the shared footer class.
- `web/src/pages/TeamPage.tsx` — removed the list max-width and centering.

No app code was changed for this note. The changes above are documented from the last commit; they are not new work in this housekeeping step.
