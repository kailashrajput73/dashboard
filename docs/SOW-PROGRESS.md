# SOW progress — admin platform (vs `Sow/SOW.pdf`)

**Updated:** 24 October 2026 (IST)  
**Branch / stack:** `migration-mongodb-to-postgresql` — admin UI `web/`, API `backend/` + PostgreSQL (`migration-db/ACTIVE-STACK.md`)  
**Contract source:** `Sow/SOW.pdf`  
**Evidence:** `migration/STATUS.md`, `migration/SOW-STATUS.md`, `migration-db/DB-STATUS.md`, `web/map/`, `migration/admin/*`, `migration/dev/*`, `docs/SERVICE-REQUESTS-API.md`

---

## How to read this file

| Column | Meaning |
|--------|---------|
| **Status** | **Done** = SOW intent met for **admin + API** in this repo. **Partial** = core works; one or more SOW bullets missing. **Not started** = not implemented. **Deferred** = agreed not to build now (see §Deferred). **Skipped** = removed from product (not in SOW module list). **Out of scope** = **Referral Partner Mobile App** (or customer mobile) — not counted in admin completion %. |
| **Where** | Primary place to verify today (not historical Expo/Mongo paths). |

**Important:** Many rows are **Built** in `migration/STATUS.md` but not yet **Done** (owner browser sign-off). This document describes **feature match to SOW**, not UAT sign-off.

---

## Scope boundary (your rule)

| In scope for this document | Out of scope |
|----------------------------|--------------|
| Web **Admin Panel** (`web/`) | **Referral Partner Mobile Application** (catalog browse, partner RFQ create, partner notifications, partner-facing pricing display, partner app auth/Firebase) |
| **Admin** APIs in `backend/` (PostgreSQL) | Partner mobile UI in `customerapp/` or any separate mobile repo |
| **Admin** management of partners, RFQs, dispatches, inventory | End-to-end “customer mobile” journeys except where a **public API** exists for a future app |
| Database design & migration to PostgreSQL | — |

Partner **admin** features (KYC, list, rewards on admin screen) **are in scope**.

---

## Executive summary

| Metric | Value | Notes |
|--------|-------|--------|
| **In-scope SOW (admin + API) — implementation** | **~82–86%** | Weighted by module below; largest gap is **Dashboard & Reports (§9)** |
| **In-scope SOW — owner verified** | **~25–35%** | See `migration/bug_fix/OWNER-SIGNOFF.md`; VPS spot-checks only on subset |
| **Partner mobile app (SOW platform #2)** | **Out of scope** | API contracts exist (`docs/PARTNER-API.md`); app not this delivery |
| **PostgreSQL migration (engineering)** | **Schema + API ~95%** | Row **14** (bulk copy purchases/RFQ/dispatch/ledger data) **not started**; row **22** decommissioned Mongo mirror **Built** |
| **Production deploy of `web/` build** | **Not started** | `migration/STATUS.md` row **21b** |

**One-line:** Master data through dispatch/inventory/partners/RFQ/service-request **admin** is largely built on `web/` + Postgres API; **reporting hub**, **true RBAC**, **mobile-only SOW bullets**, and **several export/notification** items remain partial or deferred.

---

## Roll-up by SOW module (admin + API only)

| # | SOW module (PDF) | Implementation | Owner verify | Main gap vs SOW |
|---|------------------|----------------|--------------|-----------------|
| 1 | Category Management | **Done** | Partial | — |
| 2 | Sub Category Management | **Partial** | Partial | Shelf price board is extra; export parity vs SOW “full Excel export” — confirm with `migration/admin/subcategories.md` |
| 3 | Brand Management | **Done** | Partial | — |
| 4 | Product Management | **Partial** | Partial | Catalog **short CSV** export vs SOW “bulk Excel export” / full master sheet; auto product code rules — see §4 |
| 5 | Product Group Management | **Done** | Partial | Partner mobile group filter = out of scope |
| 6 | Rack Management | **Done** | Partial | Rack-wise inventory search — partial via inventory + racks |
| 7 | Purchase Management | **Partial** | Partial | No dedicated **purchase analytics report** (SOW bullet) |
| 8 | Referral Partner KYC | **Partial** | Partial | KYC history CSV added (`20e`); full **KYC Excel export** per early SOW notes still thin |
| 9 | Referral Partner Management | **Partial** | Partial | **Partner list export**; **sales performance** depth vs SOW |
| 10 | RFQ Management | **Partial** | Partial | No **approval push** to partner app; no **camera QR scan** at dispatch desk; **Manager** filter thinner than SOW |
| 11 | Dispatch Management | **Partial** | Partial | Core RFQ→dispatch, retail bill, stock down **Done**; **barcode scan** not built; store-manager = role label only |
| — | Stock / Inventory (SOW summary §) | **Partial** | Partial | Live inventory, low stock, valuation, movements **Done**; some **report/export** labels differ from SOW marketing list |
| 12 | Team Management | **Partial** | Partial | Users CRUD **Done**; **role-based access control** (route/menu lock) **not** enforced |
| 13 | Dashboard & Reports | **Partial** | Partial | **Operations snapshot only** — not Product/Partner/Category/Brand/Retail/RFQ/Purchase/Dispatch/Inventory report pack or **M/Q/Y analytics** |
| 14 | Plumber & Electrician (admin) | **Done** | Partial | Admin list/filter/update/history **Done**; **mobile submit** = out of scope (API exists) |

*Dispatch is only detailed in SOW **summary** (PDF pp. 3–4), not a separate chapter; rows above follow PDF numbering for modules 1–11 + summary sections.*

---

## Cross-cutting SOW promises (admin panel intro, PDF p. 3)

| SOW bullet | Status | Notes |
|------------|--------|--------|
| Web-based admin panel | **Done** | `web/` replaces removed Expo `frontend/` (row **21c Built**) |
| Bulk data management through Excel | **Partial** | Master, batch master, prices, stock, subcategory import, purchase import — `migration/SHEET-FORMAT.md`, rows **10a–10c**, **11** |
| QR / Barcode integration | **Partial** | **QR display/generation** on products **Done**; **camera scan** on RFQ/dispatch **Not started** (optional FIX-07) |
| Role-based access control | **Partial** | Roles stored; **routes not locked** by role |
| Real-time dashboards | **Partial** | Snapshot dashboard **Done**; full analytics **Not started** |

---

## Detail by SOW feature (point-by-point)

### 1. Category Management (PDF §1)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create categories | **Done** | `web/pages/categories`, `migration/admin/categories.md` |
| Update categories | **Done** | Includes photo |
| Activate / deactivate | **Done** | |
| Search and filter | **Done** | |
| Category-wise product count | **Done** | |
| Prevent duplicate names | **Done** | API validation |
| Disable vs delete | **Done** | Cascade delete with products supported |

---

### 2. Sub Category Management (PDF §2)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create, edit, delete | **Done** | Row **3a Done** |
| Map to parent category | **Done** | |
| Bulk upload (Excel) | **Done** | Row **3b Built** — CSV/xlsx import |
| Export complete list | **Partial** | Confirm export UX vs SOW “Excel export” wording |
| Search and filter | **Done** | |
| Duplicate validation | **Done** | Import validation |
| *(Extra, not SOW)* Shelf price board | **Done** | Row **3c Built** — business add-on |

---

### 3. Brand Management (PDF §3)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create, update, manage brands | **Done** | Row **4 Built** |
| Activate / deactivate | **Done** | |
| Associate with products | **Done** | |
| Search and filter | **Done** | |
| Duplicate validation | **Done** | |
| Logo | **Done** | |

---

### 4. Product Management (PDF §4)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Auto-generated product code | **Partial** | Codes supported; verify auto-gen vs manual entry on create |
| Product name, sequence, ROL, regular discount | **Done** | Row **7b Built** |
| Aliases | **Done** | |
| Multi-language names | **Done** | Hindi / Gujarati on form |
| Brand / category / subcategory mapping | **Done** | |
| Product group assignment | **Done** | |
| QR code generation | **Done** | Row **7d Built** |
| Bulk Excel import | **Done** | Master + batch via rows **10b**, **10a** |
| Bulk Excel export | **Partial** | Row **7e**: **short catalog CSV**, not full master export per early `migration/SOW-STATUS.md` |
| Search by code, name, alias, brand | **Done** | Row **7a Built** |
| Pricing, stock patch, bulk pricing | **Done** | Row **7c Built** |
| Product types / classes (supporting taxonomy) | **Done** | Rows **5**, **6** — not separate SOW chapters |

---

### 5. Product Group Management (PDF §5)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create groups | **Done** | Row **8 Built** |
| Assign multiple products | **Done** | |
| Edit / remove products from groups | **Done** | |
| Search groups | **Done** | |
| Group-wise filtering (admin) | **Done** | Catalog filters |
| Group-wise filtering (partner mobile) | **Out of scope** | |

---

### 6. Rack Management (PDF §6)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create rack, rows/columns | **Done** | Row **9 Built** |
| Auto rack slot codes | **Done** | |
| Assign rack on purchase | **Done** | Purchases flow |
| View product storage location | **Done** | Racks + catalog/purchase fields |
| Rack-wise inventory search | **Partial** | Inventory views; not a dedicated “rack search” SOW screen name |

---

### 7. Purchase Management (PDF §7)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Purchase entry | **Done** | Row **11 Built** |
| Bulk Excel upload | **Done** | |
| Purchase discount, list price | **Done** | |
| Rack allocation | **Done** | |
| Automatic stock update | **Done** | Postgres TXN per `migration-db` row **15** |
| Purchase history | **Done** | |
| Purchase report | **Partial** | No separate analytics report module |
| Excel export | **Partial** | List/export UX — see `migration/dev/2026-10-07-11-purchases.md` |

---

### 8. Referral Partner KYC (PDF §8) — admin only

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Review registration requests | **Done** | Row **13 Built** |
| Document verification | **Done** | Document URLs on partner |
| Location verification flag | **Done** | |
| Approve / reject | **Done** | |
| Responsible person / history | **Done** | `kycHistory`; export **20e Built** |
| Direct partner creation | **Done** | |
| KYC export | **Partial** | History CSV; full Excel export per SOW marketing list — partial |
| Automatic mobile app activation | **Out of scope** | Partner app; `appActive` field exists in API |

---

### 9. Referral Partner Management (PDF §9) — admin only

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Partner listing | **Done** | |
| Search by location / pincode / city / area | **Done** | |
| Filter by sales manager | **Done** | |
| View KYC status, reward points | **Done** | Ledger-based rewards |
| View purchase history | **Partial** | Partner detail aggregates — verify depth vs SOW |
| View sales performance | **Partial** | RFQ/reward linkage; not full “performance” report suite |
| Export data | **Partial** | KYC history export; not full partner export |

---

### 10. RFQ Management (PDF §10) — admin + API; partner create out of scope

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Create RFQ from partner mobile | **Out of scope** | API supports create; mobile app not in repo |
| View / manage RFQs in admin | **Done** | Rows **14a–14c Built** |
| Filter by partner, category, product, date, status | **Partial** | **20d** improved category/product; **Manager** filter thinner than SOW |
| Export RFQ reports (Excel) | **Done** | **14a** |
| Approve with special discount | **Done** | |
| Allocate reward points on approve | **Done** | `reward_ledger`; TXN row **16** |
| Record approver | **Done** | History |
| Approval notification to partner app | **Deferred** | Push not built |
| Show approved pricing in partner app | **Out of scope** | |
| Pickup / delivery + schedule | **Done** | |
| Update approved RFQ before dispatch | **Done** | **14b** |
| Add/remove lines, change quantities | **Done** | |
| Barcode / QR scan to add products | **Not started** | Optional FIX-07 |
| RFQ update history / audit | **Done** | **14c** |

---

### Dispatch Management (SOW summary, PDF pp. 3–4)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Convert RFQ to dispatch | **Done** | Row **15 Built** |
| Update products before dispatch | **Done** | Retail cart / line edits |
| Barcode / QR scanning | **Not started** | |
| Retail customer billing | **Done** | |
| Store manager access | **Partial** | Role exists; **no route-level enforcement** |
| Automatic stock deduction | **Done** | TXN row **17**; unique dispatch per RFQ |
| Dispatch history | **Done** | |

---

### Stock Management (SOW summary, PDF pp. 3–4)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Live inventory | **Done** | Row **12 Built** |
| Current stock report | **Done** | |
| Stock in / stock out statement | **Done** | Purchases + dispatches |
| Product-wise stock report | **Done** | |
| Inventory valuation | **Done** | |
| Low stock (ROL) report | **Done** | |
| Excel export | **Partial** | Export paths — see `migration/dev/2026-10-07-12-inventory.md` |

---

### Team Management (PDF summary + §Team)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| User management (CRUD) | **Done** | Row **16 Built** |
| Admin / store_manager / staff login | **Done** | Teammate login on API |
| Role-based access control | **Partial** | Permissions stored; **menus/routes not locked** |

---

### Dashboard & Reports (PDF §Dashboard)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Business dashboard (snapshot) | **Done** | Row **19 Built** |
| Product performance reports | **Not started** | §9 hub |
| Referral partner performance reports | **Not started** | |
| Category & brand reports | **Not started** | |
| Retail sales reports | **Not started** | |
| RFQ / purchase / dispatch / inventory reports (dedicated) | **Partial** | Per-module CSV/list exports exist; not full SOW report pack |
| Monthly, quarterly, yearly analytics | **Not started** | |
| Customized analytics hub | **Not started** | Explicit gap in `HANDOFF-READY.md` |

---

### 11. Plumber & Electrician requests (PDF §11)

| SOW feature | Status | Where / notes |
|-------------|--------|----------------|
| Submit request via mobile app | **Out of scope** | Public `POST /service-requests` — `docs/SERVICE-REQUESTS-API.md` |
| Admin list | **Done** | SCR-29 / `web/map/pages/service-requests.md` |
| Filter by type, status, date | **Done** | |
| Status updates | **Done** | |
| Request history | **Done** | |

---

## Supporting screens (not separate SOW chapters)

| Item | Status | Notes |
|------|--------|--------|
| Admin login / register | **Done** | Rows **1e**, **20** |
| Settings | **Done** | Row **18** |
| Spreadsheet import hub | **Done** | Rows **10a–10c** |
| Money config (quotation GST) | **Skipped** | Removed from nav; row **17 Skipped** |
| Responsive admin / layout polish | **Partial** | **22a–22c Built**; **22b-3** not started |
| Production build & deploy | **Not started** | Row **21b** |

---

## Database & API (supports SOW — separate engineering track)

| Item | Status | Notes |
|------|--------|--------|
| PostgreSQL schema (19 logical domains) | **Done** | `migration-db/DB-STATUS.md` rows **2–11** |
| API parity vs Mongo-era inventory | **Built** | Row **21** audit + `POST-ROW21-FIX-PLAN.md` |
| Transactional purchase / RFQ approve / dispatch | **Done** | Rows **15–17** |
| Mongo `backend_refactor/` removed | **Done** | Row **22 Built** |
| One-shot data migration (purchases, RFQs, ledger, dispatches) | **Not started** | Row **14** |
| Many rows **Built** not **Done** | **Partial** | Owner verification + commits pending on DB tracker |

---

## Deferred / not in current plan (still in repo notes)

From `migration/SOW-STATUS.md` and `migration/bug_fix/HANDOFF-READY.md`:

- Partner mobile app and Firebase auth  
- RFQ **approval push** notifications  
- Full **report pack** and **M/Q/Y analytics** (Dashboard §9)  
- **Reward redemption** path  
- **List pagination** at scale  
- **True RBAC** (route/menu enforcement)  
- Import policy changes FIX-03 / FIX-04 / FIX-11  
- Go-live destructive/wipe policies FIX-10  

---

## Where to go deeper (existing repo docs)

| Need | Document |
|------|----------|
| Screen-level controls | `web/map/INDEX.md` |
| Operator how-to | `migration/admin/*.md` |
| What was built per migration row | `migration/dev/*.md` |
| DB row status | `migration-db/DB-STATUS.md` |
| API contract (historical + supplement) | `docs/BACKEND_INVENTORY.md`, `migration-db/BACKEND-FACTS-SUPPLEMENT.md` |
| Owner test checklist | `migration/bug_fix/OWNER-SIGNOFF.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-24 | Initial rewrite for `web/` + PostgreSQL stack; partner app excluded; supersedes outdated phase list in `DASHBOARD.md` for **SOW %** purposes only (do not delete `DASHBOARD.md` — it remains handoff context). |

---

*Send this file as the single “how much SOW is done” summary. For the full per-feature spec guide (next phase), use the approved master SOW guide plan — this file is the **status matrix** only.*
