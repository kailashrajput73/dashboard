# SOW status

Read this with `migration/STATUS.md` before any migration edit.

**Expo** is the admin app that already runs (React Native on the web). That column is what is already built. Do not rebuild those rules.

**React** is the new Vite app in `web/`. A module becomes Done there only when that screen is accepted in the new app. Until then it stays Not started, even if Expo is Done.

The **Phase** column is the row in `STATUS.md` that migrates that module.

| Module | Expo | React | Phase |
|---|---|---|---|
| Category | Done | Not started | 2 |
| Subcategory | Done | Not started | 3a to 3c |
| Brand | Done | Not started | 4 |
| Product group | Done | Not started | 8 |
| Rack | Done | Not started | 9 |
| Stock | Done | Not started | 12 |
| Product | Partial — form has QR, subcategory, Hindi and Gujarati. Catalog download is still the short CSV, not the full master sheet. | Not started | 7a to 7e |
| Purchase | Partial — entry, CSV upload, history. No separate purchase analytics report. | Not started | 11 |
| Referral partner KYC | Partial — approve, reject, direct create. No KYC Excel export. | Not started | 13 |
| Referral partner list | Partial — list, location, manager, rewards. No partner export. | Not started | 13 |
| RFQ | Partial — review, discount, rewards, pickup/delivery, edit before dispatch. No approval push. Filters are thinner than the SOW. | Not started | 14a to 14c |
| Dispatch | Partial — RFQ to dispatch, retail bill, stock down. Store-manager access is a role label. | Not started | 15 |
| Team | Partial — users and role labels. Routes are not locked by role. | Not started | 16 |
| Dashboard and reports | Partial — operations snapshot only. Monthly, quarterly, and yearly reports are not built. | Not started | 19 |
| Plumber and electrician requests | Not started | Not started | not migrated (nothing to move) |

Screens that exist in Expo but are not a module in the SOW. They are migrated too:

| Screen | Phase |
|---|---|
| Admin login | 1e |
| Product types | 5 |
| Product classes | 6 |
| Spreadsheet imports (master, batch master, prices, stock) | 10a to 10c |
| Money config | 17 |
| Settings | 18 |
| Register | 20 |

Deferred on purpose: partner mobile app, approval push notifications, full report pack, real role permissions, reward redemption, list pagination.

Master sheet columns and ROL import already exist in the Expo app. Do not redo them. Sheet spec: `migration/SHEET-FORMAT.md` (copied from `demo-notes/` in row 0b, because that folder is gitignored).
