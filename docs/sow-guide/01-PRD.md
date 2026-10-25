# Product Requirements Document (PRD)

**Source of truth for requirements:** `Sow/SOW.pdf`  
**Audience:** Owner, PM, developers, handover  
**Product:** Sanitary / building-materials wholesale — **web admin** + **server**  
**Updated:** 25 October 2026  

---

## 1. Vision and goals

**Vision:** One admin platform to run catalog, warehouse, purchases, partner relationships, quotations (RFQs), dispatch, inventory, team access, and basic operations reporting — with bulk Excel workflows and QR support for products.

**Goals (from SOW):**

- Reduce manual data entry (imports, bulk pricing/stock).
- Keep stock accurate from purchase through dispatch.
- Let staff approve partner KYC and manage referral partners.
- Support quote → approve (with rewards) → dispatch with stock checks.
- Give management a dashboard; SOW also asks for a **custom report pack** (largely not built).

**Success for admin SOW:** Staff can run daily operations without spreadsheets except where imports are designed; partner mobile is a **separate** delivery.

---

## 2. Users and roles

| Persona | Needs |
|---------|--------|
| **Business owner / admin** | Full access; company register; team; settings; destructive actions (catalog wipe) gated |
| **Store manager** | Purchases, RFQs, dispatches; read catalog/stock/partners per policy |
| **Staff** | Limited read (inventory, dashboard, catalog read) per policy |
| **Referral partner** | **Not this PRD** — mobile app (browse, RFQ create) |
| **Customer (plumber/electrician request)** | **Not this PRD** — mobile submit; admin handles in §M15 |

**Role behaviour (product):**

- Users sign in with **contact number + passcode** (admin register for first company).
- **Module access** (which menu areas appear and read vs write) is configurable per user on the team screen, with defaults by role (`store_manager`, `staff`). Admin role has full access.
- SOW asks for **role-based access control** — **Partial:** menu/route gating exists in admin; not every API edge case is role-scoped.

---

## 3. Scope boundaries

**In scope:** All SOW **Admin Panel** modules listed in the PDF (sections 1–11 and summary modules).

**Out of scope (this PRD):**

- Referral Partner **mobile application** (catalog, RFQ create, notifications, approved price display on phone).
- Firebase / partner app sign-in UX (server support may exist — see TRD).
- Full analytics hub unless listed as remaining work in §M14.

**Deferred by product decision (not blocked for daily ops):**

- Push notifications on RFQ approval.
- Camera barcode scan at RFQ/dispatch desk.
- Reward **redemption** (earn on approve exists).
- List pagination at very large scale (may be partial).
- Import policy experiments (FIX-03/04/11) — frozen unless owner reopens.

---

## 4. Cross-cutting product requirements

| ID | Requirement (SOW / product) | Why | Status |
|----|-----------------------------|-----|--------|
| X-1 | Web admin usable on desktop and tablet | Operations at counter and office | **Done** (responsive shell) |
| X-2 | Bulk Excel/CSV for master data and stock/price | Fast onboarding | **Done** (multiple import paths; pipes & fittings v1 for primary category) |
| X-3 | QR on products | Warehouse and billing speed | **Partial** — display/generation **Done**; camera scan **Not done** |
| X-4 | Reward points as **ledger**, not wallet field | Audit and disputes | **Done** |
| X-5 | RFQ does not reduce stock until dispatch | Business rule | **Done** |
| X-6 | Approved RFQ editable until dispatch | In-store negotiation | **Done** |
| X-7 | One dispatch per RFQ | Prevent double stock-out | **Done** (DB constraint) |
| X-8 | JSON API contract `{ success, data, error }` | One client pattern | **Done** |

---

## Module requirements (SOW-aligned)

For each module: **About** → **Requirements** → **Acceptance (admin)** → **Status** → **Gaps** → **See also**.

---

### M1 — Category management (SOW §1)

**About:** Top of product hierarchy; drives catalog, filters, and reports.

**Requirements:**

- Create, rename, activate/deactivate categories.
- Search/filter; show product count per category.
- No duplicate category names.
- Prefer deactivate over delete; cascade delete with products when explicitly chosen.
- Optional category image.

**Acceptance:** Admin can maintain categories and see counts; products reference categories by stable ids internally.

**Status:** **Done**

**Gaps:** None material for admin.

**See also:** `migration/admin/categories.md`, product management hub taxonomy panels.

---

### M2 — Subcategory management (SOW §2)

**About:** Finer classification under a category; bulk setup via file.

**Requirements:**

- CRUD; mandatory parent category.
- Bulk upload with validation (duplicates, bad rows rejected).
- Export list for backup/edit (SOW wording).
- Search/filter.

**Acceptance:** Import updates many rows safely; subcategories appear on products and filters.

**Status:** **Done** (+ shelf price board extra for shop display)

**Gaps:** Confirm export format vs client expectation if they need exact Excel template.

**See also:** `migration/admin/subcategories.md`, `migration/SHEET-FORMAT.md`.

---

### M3 — Brand management (SOW §3)

**About:** Central brand list; partners search by brand.

**Requirements:**

- CRUD; active/inactive; logo; duplicate names prevented.
- Products must link to brand; rename propagates to product display fields as designed.

**Acceptance:** Brands manageable; inactive brands handled without breaking history.

**Status:** **Done**

**See also:** `migration/admin/brands.md`.

---

### M4 — Product management (SOW §4)

**About:** Core catalogue — codes, prices, stock, aliases, languages, groups, imports/exports, QR.

**Requirements:**

- Unique **product code** per sellable SKU; stock, RFQ, dispatch, QR tied to code.
- Fields: name (display rules per catalog design), sequence, ROL, regular discount, category/subcategory/brand/type/class, aliases, multilingual names, pricing, stock, images (family-level where applicable).
- Auto or assisted product code on create (business rule).
- Bulk import and export.
- Search by code, name, alias, brand.

**Acceptance:** Staff maintain catalogue; imports follow locked sheet rules; list/export usable for operations.

**Status:** **Partial → strong on hub**

**Built:**

- **`/product-management`** hub: list, filters, export session, import hub (pipes & fittings v1, prices, stock, legacy paths redirect).
- Family + SKU architecture per `migration-db/CATALOG-DESIGN-RULES.md`.
- QR generation for codes.

**Gaps:**

- SOW “full master export” — export improved in hub; confirm parity with all columns client expects.
- Camera scan not in scope of admin product module (RFQ/dispatch).

**See also:** `migration-db/CATALOG-DESIGN-RULES.md`, `web/map/modification/`, `migration/SHEET-IMPORTS-INDEX.md`.

---

### M5 — Product group management (SOW §5)

**About:** Marketing/logical bundles of 2+ products.

**Requirements:**

- Create/edit groups; assign multiple products; search; filter catalog by group in admin.

**Acceptance:** Groups editable; products can belong to multiple groups.

**Status:** **Done** (admin)

**Gaps:** Partner mobile group filter — **Separate track**.

**See also:** `migration/admin/product-groups.md`.

---

### M6 — Rack management (SOW §6)

**About:** Physical warehouse grid; slot codes; tie-in to purchases.

**Requirements:**

- Define rows/columns; auto slot labels.
- Assign slot on purchase; view product location.

**Acceptance:** Purchase can set rack/slot; racks visible in warehouse UI.

**Status:** **Done**

**Gaps:** Dedicated “rack-only search” as a named SOW screen — partially covered via inventory/racks.

**See also:** `migration/admin/racks.md`.

---

### M7 — Purchase management (SOW §7)

**About:** Stock-in; updates on-hand quantity.

**Requirements:**

- Manual entry and bulk file.
- Line: product code, qty, list price, purchase discount, rack/slot.
- Automatic stock increase; history retained.
- Purchase report (SOW).

**Acceptance:** Stock increases match purchase; history list/export usable.

**Status:** **Partial**

**Gaps:** Dedicated **purchase analytics report** module not built.

**See also:** `migration/admin/purchases.md`.

---

### M8 — Referral partner KYC (SOW §8) — admin

**About:** Verify partners before they trade; accountability.

**Requirements:**

- Queue of registrations; documents; location verification flag.
- Approve/reject with reason; auditor fields (who/when).
- Direct create by admin.
- KYC export.
- Mobile activation on approve — **partner app**.

**Acceptance:** Admin can clear or reject KYC; history auditable.

**Status:** **Partial**

**Built:** Full admin workflow; KYC history CSV export.

**Gaps:** Full Excel KYC export as in marketing list; mobile activation **Separate track**.

**See also:** `migration/admin/partners.md`.

---

### M9 — Referral partner management (SOW §9) — admin

**About:** Directory of approved partners; search and performance context.

**Requirements:**

- List; search pincode, city, area, manager; KYC status; rewards balance (from ledger).
- Purchase/sales performance views; export.

**Acceptance:** Admin finds partners and sees rewards.

**Status:** **Partial**

**Gaps:** Rich performance dashboards; full partner export.

**See also:** `migration/admin/partners.md`.

---

### M10 — RFQ management (SOW §10)

**About:** Quote requests; approval with discount and rewards; schedule pickup/delivery; edit before dispatch.

**Requirements:**

- Admin: list, filter (partner, status, date, category, product), export.
- Approve/reject; special discount; reward points on approve (formula: business rule floor(total/100)).
- Pickup vs delivery + schedule.
- Edit lines after approve until dispatch; history of changes.
- Partner creates RFQ on mobile — **Separate track**.
- Push notification and show price on phone — **Separate track / Deferred**.
- Barcode add at counter — **Not done**.

**Acceptance:** End-to-end admin RFQ lifecycle through to dispatch handoff.

**Status:** **Partial** (admin core **Done**)

**See also:** `migration/admin/rfqs.md`, `web/map/pages/rfqs.md`.

---

### M11 — Dispatch management (SOW summary)

**About:** Fulfill approved quote; retail walk-in; stock-out.

**Requirements:**

- Create dispatch from approved RFQ; adjust lines; retail customer fields.
- Stock decreases; dispatch history; store manager involvement.
- Barcode scan — **Not done**.

**Acceptance:** Cannot dispatch same RFQ twice; stock insufficient blocks or warns per implementation.

**Status:** **Partial**

**See also:** `migration/admin/dispatches.md`.

---

### M12 — Stock / inventory management (SOW summary)

**About:** Operational stock visibility.

**Requirements:**

- Live stock; in/out from purchases and dispatches; valuation; low stock vs ROL; exports.

**Acceptance:** Manager sees what is on hand and what moved.

**Status:** **Partial** (operational screens **Done**; formal report pack **Not done**)

**See also:** `migration/admin/inventory.md`.

---

### M13 — Team management (SOW summary)

**About:** Staff accounts and access.

**Requirements:**

- CRUD users; roles; active flag; teammate login.
- Role-based access to features.

**Acceptance:** Store manager and staff see only allowed modules.

**Status:** **Partial** — module access **Done** in UI; API enforcement varies by route.

**See also:** `migration/admin/team.md`, `web/src/access/modules.ts`.

---

### M14 — Dashboard and reports (SOW §Dashboard)

**About:** Business overview and customised analytics.

**Requirements:**

- Business dashboard.
- Product, partner, category, brand, retail, RFQ, purchase, dispatch, inventory reports.
- Monthly, quarterly, yearly analytics.
- Customised to client requirements.

**Acceptance:** Client-signed report set available in admin.

**Status:** **Partial** — **operations snapshot only**

**Gaps:** This is the **largest SOW gap** for admin.

**See also:** `migration/admin/dashboard.md`.

---

### M15 — Plumber and electrician requests (SOW §11)

**About:** Service jobs from customers; admin triage.

**Requirements:**

- Customer submit via mobile — **Separate track** (API exists).
- Admin: list; filter type, status, date; update status; history.

**Acceptance:** Admin can run service desk.

**Status:** **Done** (admin); mobile submit **Separate track**

**See also:** `migration/admin/service-requests.md`, `docs/SERVICE-REQUESTS-API.md`.

---

## 5. Supporting admin capabilities (not always SOW chapters)

| Capability | Status | Notes |
|------------|--------|--------|
| Login / register | **Done** | |
| Settings (taxonomy visibility, catalog wipe) | **Done** | Passcode on destructive |
| Money config (quotation GST) | **Skipped** | Removed from nav |
| Production deploy | **Not done** | Hosting checklist separate |

---

## 6. Non-functional expectations (product level)

| Area | Expectation | Status |
|------|-------------|--------|
| Data safety | Purchases, approve, dispatch atomic in Postgres | **Done** |
| Audit | RFQ history, KYC history, service request history | **Done** |
| Imports | Validate before write; no silent bad taxonomy | **Done** (pipes v1 program) |
| Security | Bearer token; CORS allow-list; module access | **Partial** |
| Scale | Large catalog lists | **Partial** (paging/export sessions improving) |

---

## 7. Remaining product backlog (priority)

1. **Dashboard §14** — report pack and M/Q/Y analytics (if client requires per SOW).
2. **RFQ/dispatch** — optional barcode scan.
3. **RFQ** — push notifications when partner app exists.
4. **Exports** — partner list, purchase report, any Excel templates client signs off.
5. **Production deploy + UAT** — `migration/bug_fix/OWNER-SIGNOFF.md`.
6. **Partner mobile** — separate PRD/track (`docs/PARTNER_APP_API.md`).

---

## 8. Document map

| Need | Read |
|------|------|
| Short handover % | `docs/SOW-PROGRESS.md` |
| Technical how | `02-TRD.md` |
| Screen-level | `web/map/INDEX.md` |
| Index | `00-index.md` |
