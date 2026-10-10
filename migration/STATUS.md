# Migration status

Every migration chat starts here. Do only the row(s) the user names. If the user names several rows, do them in the order given, then STOP after the last one. Never go beyond the named rows.

Branch: `web-migration-reactnative-to-react` only.

Expo admin stays in `frontend/` until a screen is checked in `web/`. The FastAPI backend stays. Do not rewrite APIs.

Scope: move what the Expo app already does, nothing more. No new features. What Expo is missing is listed in [SOW-STATUS.md](SOW-STATUS.md) and is not part of this migration.

Old app map (file paths, API calls, what each screen does): [INVENTORY.md](INVENTORY.md).

## How one row works

1. The agent does that one row in `web/`, matching the Expo screen.
2. In the same row, the agent writes the notes (see below), sets the status to **Built**, and **stops**. The agent never runs `git commit`.
3. You test the screen in the browser next to the Expo one.
4. If it is right, you change **Built** to **Done** and you commit.
5. If it is wrong, tell the agent. The row stays Built.

Commit message: `migrate(2): categories` (row ID in brackets, so `git log --grep "(2)"` finds it).

If a row is too big for one go, the agent says so and proposes a split. It does not run on.

## Notes the agent writes for every row

- **Dev note** `migration/dev/YYYY-MM-DD-NN-name.md`: what this row planned, what was built, old file → new file, how it works, API calls used, what differs from Expo, how to test, what is left.
- **Admin note** `migration/admin/<screen>.md`: for people using the dashboard. What the screen is for, how to do each task, what each field means, what cannot be undone. Later rows for the same screen extend the same file.


Statuses: Not started → Built → Done.

---

| Row | What | Status | Notes |
|---|---|---|---|
| 0a | Fast-forward this branch onto `restore-brand-imports`. Add this tracker. | Done | [dev/2026-10-01-00-branch-and-tracker.md](dev/2026-10-01-00-branch-and-tracker.md) |
| 0b | Put `INVENTORY.md` and `AGENTS.md` in the repo. Copy `demo-notes/SHEET-FORMAT.md` into `migration/` (demo-notes is gitignored, and the office PC may not have it). | Done | [dev/2026-10-02-0b-inventory-and-sheet-spec.md](dev/2026-10-02-0b-inventory-and-sheet-spec.md) |
| 1a | Vite + React app in `web/`, backend URL setting, colours and theme. Expo still runs. | Done | [dev/2026-10-02-1a-vite-theme.md](dev/2026-10-02-1a-vite-theme.md) |
| 1b | Storage, session, API client with all the endpoint functions. | Done | [dev/2026-10-02-1b-storage-session-api.md](dev/2026-10-02-1b-storage-session-api.md) |
| 1c | Basic parts: button, input, card, chip, header, empty state, message and error popups, icons. | Done | [dev/2026-10-02-1c-basic-ui-components.md](dev/2026-10-02-1c-basic-ui-components.md) |
| 1d | Menu shell: remove Money config and add Service requests to Sales navigation. | Built | [dev/2026-10-02-1d-menu-shell.md](dev/2026-10-02-1d-menu-shell.md), [dev/2026-10-08-1d-menu-sync.md](dev/2026-10-08-1d-menu-sync.md) |
| 1e | Start-up redirect and admin login; also remove `web/src/DevPreview.tsx` and restore `App.tsx`. | Done | [dev/2026-10-03-1e-startup-login.md](dev/2026-10-03-1e-startup-login.md) |
| 2 | Categories (list, search, filter, create, edit, photo, active, delete with its products). Photo field and linked-products parts are built here. | Done | [dev/2026-10-03-2-categories.md](dev/2026-10-03-2-categories.md) |
| 3a | Subcategories: list, create, edit, delete | Done | [dev/2026-10-03-3a-subcategories.md](dev/2026-10-03-3a-subcategories.md) |
| 3b | Subcategories: CSV import | Built| [dev/2026-10-04-3b-subcategory-csv-import.md](dev/2026-10-04-3b-subcategory-csv-import.md) |
| 3c | Subcategories: shelf price board | Built | [dev/2026-10-04-3c-shelf-price-board.md](dev/2026-10-04-3c-shelf-price-board.md) |
| 4 | Brands (logo, active, delete) | Built | [dev/2026-10-04-4-brands.md](dev/2026-10-04-4-brands.md) |
| 5 | Product types | Built | [dev/2026-10-05-5-product-types.md](dev/2026-10-05-5-product-types.md) |
| 6 | Product classes | Built | [dev/2026-10-05-6-product-classes.md](dev/2026-10-05-6-product-classes.md) |
| 7a | Catalog: list, search, filters | Built | [dev/2026-10-06-7a-catalog-list-filters.md](dev/2026-10-06-7a-catalog-list-filters.md) |
| 7b | Catalog: product form (name, code, brand, category, subcategory, Hindi, Gujarati, aliases, ROL, discount) | Built | [dev/2026-10-06-7b-catalog-product-form.md](dev/2026-10-06-7b-catalog-product-form.md) |
| 7c | Catalog: pricing, single and bulk | Built | [dev/2026-10-06-7c-catalog-pricing.md](dev/2026-10-06-7c-catalog-pricing.md) |
| 7d | Catalog: QR code |Built | [dev/2026-10-06-7d-catalog-qr.md](dev/2026-10-06-7d-catalog-qr.md) |
| 7e | Catalog: CSV download (the current short one), delete, secured delete | Built | [dev/2026-10-06-7e-catalog-csv-delete.md](dev/2026-10-06-7e-catalog-csv-delete.md) |
| 8 | Product groups | Built | [dev/2026-10-06-8-product-groups.md](dev/2026-10-06-8-product-groups.md) |
| 9 | Racks | Built | [dev/2026-10-06-9-racks.md](dev/2026-10-06-9-racks.md) |
| 10a | Spreadsheet imports: shared CSV/xlsx reader, templates, import component. Do not change sheet column rules. | Built | [dev/2026-10-07-10a-spreadsheet-import-foundation.md](dev/2026-10-07-10a-spreadsheet-import-foundation.md) |
| 10b | Spreadsheet imports: master sheet and batch master | Built | [dev/2026-10-07-10b-master-import.md](dev/2026-10-07-10b-master-import.md) |
| 10c | Spreadsheet imports: prices and stock | Built | [dev/2026-10-07-10c-price-stock-imports.md](dev/2026-10-07-10c-price-stock-imports.md) |
| 11 | Purchases (entry, CSV upload, history) | Built | [dev/2026-10-07-11-purchases.md](dev/2026-10-07-11-purchases.md) |
| 12 | Inventory | Built | [dev/2026-10-07-12-inventory.md](dev/2026-10-07-12-inventory.md) |
| 13 | Partners (list, KYC approve and reject, rewards) | Built | [dev/2026-10-07-13-partners.md](dev/2026-10-07-13-partners.md) |
| 14a | RFQs: list, filters, search, CSV | Built | [dev/2026-10-08-14a-rfq-list-filters-export.md](dev/2026-10-08-14a-rfq-list-filters-export.md) |
| 14b | RFQs: create, edit lines | Built | [dev/2026-10-08-14b-rfq-create-edit-lines.md](dev/2026-10-08-14b-rfq-create-edit-lines.md) |
| 14c | RFQs: approve, reject, history, move to dispatch | Built | [dev/2026-10-08-14c-rfq-decisions-history-dispatch.md](dev/2026-10-08-14c-rfq-decisions-history-dispatch.md) |
| 15 | Dispatches | Built | [dev/2026-10-08-15-dispatches.md](dev/2026-10-08-15-dispatches.md) |
| SCR-29 | Service requests | Built | [dev/2026-10-08-SCR-29-service-requests.md](dev/2026-10-08-SCR-29-service-requests.md) |
| 16 | Team | Built | [dev/2026-10-08-16-team.md](dev/2026-10-08-16-team.md) |
| 17 | Money config | Skipped (removed from current Expo menu) | |
| 18 | Settings | Built | [dev/2026-10-08-18-settings.md](dev/2026-10-08-18-settings.md) |
| 19 | Dashboard snapshot | Built | [dev/2026-10-08-19-dashboard.md](dev/2026-10-08-19-dashboard.md) |
| 20 | Register page (exists in Expo, was missing from the first list) | Built | [dev/2026-10-08-20-register.md](dev/2026-10-08-20-register.md) |
| 20b | RFQ date bounds apply independently, including reversed ranges, like Expo | Built | [dev/2026-10-10-20b-rfq-date-bounds.md](dev/2026-10-10-20b-rfq-date-bounds.md) |
| 20c | Team user list requests use `cache: "no-store"`, like Expo FIX-06 | Built | [dev/2026-10-10-20c-team-no-store.md](dev/2026-10-10-20c-team-no-store.md) |
| 20d | RFQ list Category and Product filters from loaded catalog and lines | Built | [dev/2026-10-10-20d-rfq-category-product-filters.md](dev/2026-10-10-20d-rfq-category-product-filters.md) |
| 20e | Partners KYC-history CSV export | Built | [dev/2026-10-10-20e-partner-kyc-history-export.md](dev/2026-10-10-20e-partner-kyc-history-export.md) |
| 21a | Check every Expo screen exists in `web/`. List anything missed. | Not started | |
| 21b | Production build and deploy | Not started | |
| 21c | Remove Expo from `frontend/`, only after every screen is checked | Not started | |

---

# React migration — status pointer
---

**Updated:** 2026-10-06  
**Purpose:** When you checkout `web-migration-reactnative-to-react` (or latest commit owner names), read this first, then the delta sections in the two inventory files.


## Read order for migration agent

1. **`migration/STATUS.md`** (this file) — branch, what’s done, what’s next  
2. **`docs/migration/INVENTORY.md`** — Expo baseline (2026-10-01) + **§ Migration delta (2026-10-06)** at top  
3. **`docs/BACKEND_INVENTORY.md`** — API/DB baseline (2026-10-04) + **§ Changelog since 2026-10-04** at top  
---
4. **`migration/bug_fix/HANDOFF-READY.md`** — Expo admin feature-complete list (do not re-build in React until ported)


## Branches (repo)

| Branch | Role |
|--------|------|
| `restore-brand-imports` (typical feature work) | Expo SOW + `backend_refactor` fixes through 2026-10-06 |
| `web-migration-reactnative-to-react` | Vite/React admin shell; port screens one phase at a time |
---

**Rule:** Expo remains source of truth for behavior until a screen is ported and accepted on `web/`.


## Expo admin (source) — 2026-10-06

**Code-complete** for SOW admin modules; owner verify pending (`migration/bug_fix/OWNER-SIGNOFF.md`).

**Not in Expo repo:** partner customer mobile UI, Firebase customer auth, Dashboard §9 custom analytics hub.
---

**React (`web/`):** Check branch — likely login/shell only or empty; port using **Suggested phase order** in `INVENTORY.md` (bottom of file).


## Next migration agent actions

1. `git checkout web-migration-reactnative-to-react` and `git merge` or rebase from owner’s latest Expo commit (e.g. `restore-brand-imports`).  
2. Read **INVENTORY.md → Migration delta** — line counts and SCR list there are newer than the 2026-10-01 table body.  
3. Open `migration/SOW-STATUS.md` on that branch if present; else use delta + phase order.  
4. Port **one screen per PR/commit** (categories → … → service-requests last).  
5. Do **not** change import rules or `backend_refactor` contracts while migrating UI.
---


## Changelog index (Expo + API)

| Date | Summary | Detail |
|------|---------|--------|
| 2026-10-01 | Admin inventory snapshot | `INVENTORY.md` body (SCR-01–25) |
| 2026-10-04 | Backend inventory snapshot | `BACKEND_INVENTORY.md` body (76 routes, 18 collections) |
| 2026-10-05 | Product, Purchase, Partners SOW | demo-notes `2026-10-05-*` |
| 2026-10-06 | RFQ, Dispatch, Inventory UI, Team + login, service requests | demo-notes / HANDOFF-READY |
| 2026-10-06 | Backend delta | `BACKEND_INVENTORY.md` changelog (19th collection, +4 routes, login/rack fixes) |


## Owner handoff (same week)

Single test pass: `migration/bug_fix/OWNER-SIGNOFF.md`.  
Mobile plumber/electrician: `docs/SERVICE-REQUESTS-API.md`.
