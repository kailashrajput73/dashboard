# Migration status

Every migration chat starts here. Do the first row that is not Done. One row, then stop.

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
| 1d | Menu shell (sidebar) and an empty page for every menu item. | Done | [dev/2026-10-02-1d-menu-shell.md](dev/2026-10-02-1d-menu-shell.md) |
| 1e | Start-up redirect and admin login; also remove `web/src/DevPreview.tsx` and restore `App.tsx`. | Done | [dev/2026-10-03-1e-startup-login.md](dev/2026-10-03-1e-startup-login.md) |
| 2 | Categories (list, search, filter, create, edit, photo, active, delete with its products). Photo field and linked-products parts are built here. | Done | [dev/2026-10-03-2-categories.md](dev/2026-10-03-2-categories.md) |
| 3a | Subcategories: list, create, edit, delete | Not started | |
| 3b | Subcategories: CSV import | Not started | |
| 3c | Subcategories: shelf price board | Not started | |
| 4 | Brands (logo, active, delete) | Not started | |
| 5 | Product types | Not started | |
| 6 | Product classes | Not started | |
| 7a | Catalog: list, search, filters | Not started | |
| 7b | Catalog: product form (name, code, brand, category, subcategory, Hindi, Gujarati, aliases, ROL, discount) | Not started | |
| 7c | Catalog: pricing, single and bulk | Not started | |
| 7d | Catalog: QR code | Not started | |
| 7e | Catalog: CSV download (the current short one), delete, secured delete | Not started | |
| 8 | Product groups | Not started | |
| 9 | Racks | Not started | |
| 10a | Spreadsheet imports: shared CSV/xlsx reader, templates, import component. Do not change sheet column rules. | Not started | |
| 10b | Spreadsheet imports: master sheet and batch master | Not started | |
| 10c | Spreadsheet imports: prices and stock | Not started | |
| 11 | Purchases (entry, CSV upload, history) | Not started | |
| 12 | Inventory | Not started | |
| 13 | Partners (list, KYC approve and reject, rewards) | Not started | |
| 14a | RFQs: list, filters, search, CSV | Not started | |
| 14b | RFQs: create, edit lines | Not started | |
| 14c | RFQs: approve, reject, history, move to dispatch | Not started | |
| 15 | Dispatches | Not started | |
| 16 | Team | Not started | |
| 17 | Money config | Not started | |
| 18 | Settings | Not started | |
| 19 | Dashboard snapshot | Not started | |
| 20 | Register page (exists in Expo, was missing from the first list) | Not started | |
| 21a | Check every Expo screen exists in `web/`. List anything missed. | Not started | |
| 21b | Production build and deploy | Not started | |
| 21c | Remove Expo from `frontend/`, only after every screen is checked | Not started | |
