# SOW master guide — index

**Contract:** `Sow/SOW.pdf`  
**Stack:** Admin `web/` + API `backend/` (PostgreSQL) — see `migration-db/ACTIVE-STACK.md`  
**Simple status sheet (handover):** `docs/SOW-PROGRESS.md`  
**Updated:** 25 October 2026  

This folder is the **single organised guide** for what the system must do, why, and how it is built. Older notes in `migration/`, `migration-db/`, and `web/map/` stay valid as **detail appendices**; this guide **indexes** them and aligns every section to SOW.

---

## Documents in this guide (roadmap)

| Step | File | Purpose | Status |
|------|------|---------|--------|
| — | **00-index.md** (this file) | Navigation | Done |
| 1 | **01-PRD.md** | Product requirements: users, scope, per-module *what* and *why*, acceptance, build status | Done |
| 1 | **02-TRD.md** | Technical design: stack, API, data, rules, per-module implementation | Done |
| 2 | *03-alignment.md* | Compare live code vs TRD (gap list) | Not started |
| 3 | *04-app-flow.md* | End-to-end flows (purchase, RFQ, dispatch, KYC, …) | Not started |
| 4 | *05-ui-ux-brief.md* | Admin UX principles, screens, responsive rules | Not started |
| 5 | *06-backend-schema.md* | Tables, FKs, transactions (Postgres) | Not started |
| 6 | *07-implementation-plan.md* | Remaining work ordered by priority | Not started |

**Rule:** Do not redesign working behaviour to match this guide. The guide **describes** the product you already built from SOW; gaps are **remaining work**, not rewrite mandates.

---

## Scope

| In scope | Out of scope for this guide |
|----------|-----------------------------|
| Web **admin panel** | Partner **customer mobile UI** (separate app/repo) |
| **Admin** APIs and PostgreSQL data | End-user marketing site |
| Admin management of partners, RFQs, stock | Full SOW “push to partner phone” until mobile phase |
| Service requests **admin** + public create API | Customer mobile for service requests (API ready) |

**Note:** `backend/` includes `partner_app` routes and Firebase hooks for a **future/partner** track — documented in TRD §Partner API, not counted as admin SOW completion.

---

## Status legend (used in PRD / TRD)

| Status | Meaning |
|--------|---------|
| **Done** | Matches SOW intent for admin + server; usable in production path after deploy/UAT |
| **Partial** | Core workflow works; listed SOW bullets still open |
| **Not done** | Not implemented |
| **Deferred** | Agreed later (see PRD §Deferred) |
| **Separate track** | Built or started but not part of admin SOW sign-off |

---

## SOW module map → guide sections

| SOW module (PDF) | PRD section | Admin entry (today) |
|------------------|-------------|---------------------|
| 1 Categories | 01-PRD §M1 | Product management hub → taxonomy panels; legacy `/categories` redirects |
| 2 Subcategories | §M2 | Hub + import; shelf price board |
| 3 Brands | §M3 | Hub |
| 4 Products | §M4 | **`/product-management`** (primary) |
| 5 Product groups | §M5 | Hub |
| 6 Racks | §M6 | `/racks` |
| 7 Purchases | §M7 | `/purchases` |
| 8 Partner KYC | §M8 | `/partners` |
| 9 Partner list | §M9 | `/partners` |
| 10 RFQ | §M10 | `/rfqs` |
| Dispatch (summary) | §M11 | `/dispatches` |
| Stock / inventory (summary) | §M12 | `/inventory` |
| Team | §M13 | `/team` |
| Dashboard & reports | §M14 | `/dashboard` |
| Plumber / electrician | §M15 | `/service-requests` |

---

## Where to read more (appendices)

| Topic | Deeper doc |
|-------|------------|
| Operator how-to per screen | `migration/admin/*.md` |
| UI controls, routes, line refs | `web/map/INDEX.md` |
| Spreadsheet columns | `migration/SHEET-FORMAT.md`, `migration/SHEET-IMPORTS-INDEX.md`, pipes sheets |
| Catalog family/SKU rules (locked) | `migration-db/CATALOG-DESIGN-RULES.md` |
| DB migration rows | `migration-db/DB-STATUS.md` |
| Web port rows | `docs/migration/STATUS.md` |
| Partner app API (separate) | `docs/PARTNER_APP_API.md` |
| Service requests API | `docs/SERVICE-REQUESTS-API.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-25 | Added index, PRD, TRD (Step 1 of master guide plan) |
