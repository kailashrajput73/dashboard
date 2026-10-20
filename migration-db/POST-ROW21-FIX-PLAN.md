# Post–row 21 fix plan (layers + agent prompts)

> **Historical (2026-10-20):** Layer 1 complete; row **22 Built** (`backend_refactor/` removed).
> Active stack: `migration-db/ACTIVE-STACK.md`. Use this file for layer history only.

**Audience:** Priyanshi and any DB-migration agent chat after row 21.

**Row 21 is only the audit.** Mark row 21 **Done** and commit  
`dbmigrate(21): full route parity audit mongo vs postgres`  
when you agree with  
`migration-db/dev/2026-10-13-21-route-parity-audit.md`.  
**Do not** bundle API fix work into row 21.

**This file** is the roadmap for closing parity gaps **one layer at a time**.  
Each layer can be one or more agent chats; **commit after you test a layer** (or after each chunk inside Layer 1 if you prefer smaller commits).  
Suggested commit prefix: `dbmigrate(post21-L{n}): …` (not `dbmigrate(21): …`).

**Always read first:** `DB-AGENTS.md`, `migration-db/DB-STATUS.md`,  
`migration-db/dev/2026-10-13-21-route-parity-audit.md`,  
`docs/BACKEND_INVENTORY.md`, `migration-db/BACKEND-FACTS-SUPPLEMENT.md`.

---

## Mental model

| Idea | Meaning |
|------|--------|
| **Migration** | Build and verify `backend/` (PostgreSQL) **alongside** `backend_refactor/` (Mongo). |
| **Not deploy yet** | VPS stays on Mongo until Layer 4 cutover (tracker row **22**). |
| **Greenfield PG** | Row **14** skipped + rows **12–13** not run is OK for dev; missing old purchases/RFQs is **not** a parity bug. |
| **81 routes** | Mongo has 81; PG had **61** + `GET /api/health` at row 21 audit; **20** routes missing on PG. |

---

## Do both backends need to be running?

| Activity | Mongo `:8000` | PG `:8001` |
|----------|---------------|------------|
| Row 21 audit (source review) | No | No |
| Implementing fixes (reading `backend_refactor/`) | No | No |
| **Sign-off** after each layer/chunk | **Yes** | **Yes** |

The **20 missing routes** and **purchase `partnerId`** finding came from **code**, not from live OpenAPI.  
Without both servers up you only miss **runtime** proof (edge cases, exact JSON).  
Use the PowerShell plan in the row 21 dev note when verifying a layer.

**Local web:** `web/.env` → `VITE_BACKEND_URL=http://127.0.0.1:8001` for PG; switch to VPS or `:8000` only when comparing to Mongo.

---

## Layer overview (do in order)

| Layer | Goal | Code? | Commit when |
|-------|------|-------|-------------|
| **1** | Finish missing API surface on `backend/` | Yes (main work) | Layer 1 tested on 8001 (+ spot checks vs 8000) |
| **2** | Keep intentional PG behavior; verify clients | Mostly verify; fix only regressions | After Layer 1 + verification pass |
| **3** | Optional Mongo → PG **data** copy | Scripts only if you want VPS-like data | When you choose to run 12–13 / 14 |
| **4** | Production cutover | Deploy + row **22** | Tracker row 22 Done |

**Rule:** Finish and test **Layer 1** before treating Layer 2 as complete. Layer 3 is optional anytime. Layer 4 only when Layers 1–2 are acceptable.

---

## Layer 1 — Finish API surface (biggest chunk)

Implement missing Mongo routes on PostgreSQL by **copying behavior** from `backend_refactor/` into `backend/`.  
Do **not** change route paths or response envelope shape.  
Do **not** edit `web/`, `frontend/`, or `backend_refactor/` unless you explicitly override `DB-AGENTS.md`.

### Layer 1 checklist (from row 21 P0 → P1 → P2)

Work in this order inside Layer 1:

| Step | RTE IDs | Paths (under `/api`) | Notes |
|------|---------|----------------------|--------|
| **1A** | 39, 40 | `POST /purchases`, `POST /purchases/import` | **Decision required** (see below) |
| **1B** | 74 | `GET /dashboard/snapshot` | `DashboardPage` |
| **1C** | 28–32 | `/product-groups*` | Tables exist; no router yet |
| **1D** | 33–37 | `/racks*` | Tables exist; purchases may use rack fields |
| **1E** | 77–81 | `/service-requests*` | **New PG table + module** |
| **1F** | 72–73 | `GET/PUT /money-config/{admin_id}` | Table exists |
| **1G** | 76 (+ optional 75) | `GET /media/proxy`, optional `GET /` | PG has `/api/health` ≠ RTE-75 |

**Purchase decision (1A) — you choose before the agent runs:**

- **Option A (mirror Mongo + current web):** PG accepts body `{ lines }` only; `partnerId` optional/absent like Mongo writer (may weaken row 8 intent on PG).
- **Option B (keep PG rule, change client):** Web sends `partnerId`; PG keeps required partner — **requires editing `web/`** (override DB-AGENTS).

Default migration rule: **Option A** unless you explicitly want Option B.

### Layer 1 — verification (both backends for 1A–1E)

1. Start Mongo: `cd backend_refactor` → uvicorn on **8000**.  
2. Start PG: `cd backend` → `alembic upgrade head` → uvicorn on **8001**.  
3. Login on web against **8001**; exercise dashboard, groups, racks, purchases, service requests.  
4. For critical routes, same method/path/body on 8000 vs 8001 (PG with `Authorization: Bearer …`).  
5. Expect **404 → 200** for newly implemented routes; purchases per your 1A decision.

### Layer 1 — suggested commits (after your testing)

One commit per step or one for whole Layer 1 — your choice:

- `dbmigrate(post21-L1a): purchase api parity with mongo web contract`
- `dbmigrate(post21-L1b): dashboard snapshot on postgres`
- `dbmigrate(post21-L1c): product groups api on postgres`
- `dbmigrate(post21-L1d): racks api on postgres`
- `dbmigrate(post21-L1e): service requests schema and api on postgres`
- `dbmigrate(post21-L1f): money config api on postgres`
- `dbmigrate(post21-L1g): media proxy on postgres`

---

## Layer 2 — Intentional differences (verify, don’t “Mongo-ify” PG)

Row 21 **section B** documents behavior that is often **correct on PG**:

- Admin **Bearer** on protected routes (Mongo admin routes were open).
- **`partner_id`** on purchases when you chose Option B or a hybrid.
- **Transactions** (purchases, RFQ approve, dispatch).
- **Soft delete** (`deleted_at`) vs Mongo hard delete.
- **Unique dispatch per RFQ** on PG.

**Layer 2 work:** regression pass — RFQ create/edit, dispatch, inventory, partner KYC, team users, catalog wipe (passcode).  
Fix only if PG **breaks the documented API contract** clients use, not to undo safety on purpose.

**No separate “row” in DB-STATUS** unless you add one; optional commit:  
`dbmigrate(post21-L2): parity verification fixes after layer 1`.

---

## Layer 3 — Data copy (optional)

Not required to finish APIs or local dev on an empty DB.

| Tracker row | What | When |
|-------------|------|------|
| **12–13** | Auth/taxonomy + catalog/pricing from Mongo | Want VPS-like catalog locally |
| **14** | Purchases, RFQs, ledger, dispatches | Want historical ops on PG |

Skipped row 14 stays valid for greenfield testing.

---

## Layer 4 — Cutover (tracker row 22)

Only when:

- Layer 1 P0 items done (or accepted exceptions documented).
- Layer 2 verification done.
- Side-by-side checks with both backends passed for your critical flows.

Then: deploy `backend/`, point production admin env at new API, row **22** decommission Mongo path.  
**Do not start row 22** until Layer 1 is done.

---

# Copy-paste agent prompts

Put **STOP** on the first line of every prompt.  
**One layer (or one Layer-1 step) per chat.**  
Agent must: dev note in `migration-db/dev/`, **exec-log** in `migration-db/exec-log/`, **no git commit**, **STOP** when Built.

---

## Prompt — Layer 1 only (full layer; large)

Use only if you want one agent to do all of 1A–1G in one go (not recommended).

```
STOP AFTER THIS LAYER. DO NOT START LAYER 2 OR ROW 22.

Post–row 21 Layer 1: implement ALL missing PostgreSQL API routes listed in
migration-db/POST-ROW21-FIX-PLAN.md (steps 1A–1G), mirroring
backend_refactor/ behavior and {success,data,error} envelopes.

Read: DB-AGENTS.md, migration-db/POST-ROW21-FIX-PLAN.md,
migration-db/dev/2026-10-13-21-route-parity-audit.md.

Purchase (1A): use Option [A or B — FILL IN] from the plan.

Rules: code only in backend/. Do not edit web/, frontend/, backend_refactor/.
Do not change API paths or JSON shapes clients expect. Service requests need
new schema (Alembic) + RTE-77–81.

Deliverables: dev note migration-db/dev/YYYY-MM-DD-post21-layer1.md,
exec-log migration-db/exec-log/…, how to test on 8001 and compare 8000,
suggested commit message dbmigrate(post21-L1): …
Do NOT commit. STOP.
```

---

## Prompt — Layer 1 step 1A (purchases)

```
STOP AFTER 1A. DO NOT DO 1B–1G OR LAYER 2.

Post–row 21 Layer 1 step 1A only: RTE-39 and RTE-40
POST /api/purchases and POST /api/purchases/import on backend/.

Purchase decision: Option [A = mirror Mongo {lines} only | B = require partnerId and document web change needed].

Read: DB-AGENTS.md, migration-db/POST-ROW21-FIX-PLAN.md, row 21 audit RTE-39/40,
backend_refactor/services for purchases.

Copy mirror behavior; keep envelope. Code only backend/. No commit. Dev note +
exec-log. Test: web PurchasesPage against 8001; compare POST body to Mongo 8000.
Suggested commit: dbmigrate(post21-L1a): …
STOP.
```

---

## Prompt — Layer 1 step 1B (dashboard)

```
STOP AFTER 1B.

Post–row 21 Layer 1 step 1B only: RTE-74 GET /api/dashboard/snapshot on backend/,
mirroring backend_refactor/services/config_dashboard_service.py.

Read DB-AGENTS.md and migration-db/POST-ROW21-FIX-PLAN.md. backend/ only.
Dev note + exec-log. Test DashboardPage on 8001. No commit.
Suggested commit: dbmigrate(post21-L1b): dashboard snapshot on postgres
STOP.
```

---

## Prompt — Layer 1 step 1C (product groups)

```
STOP AFTER 1C.

Post–row 21 Layer 1 step 1C only: RTE-28–32 /api/product-groups* on backend/,
mirroring backend_refactor/routers/product_groups_racks.py and services.
Use existing product_groups / product_group_items tables.

Read DB-AGENTS.md and migration-db/POST-ROW21-FIX-PLAN.md. backend/ only.
Dev note + exec-log. Test ProductGroupsPage on 8001. No commit.
Suggested commit: dbmigrate(post21-L1c): product groups api on postgres
STOP.
```

---

## Prompt — Layer 1 step 1D (racks)

```
STOP AFTER 1D.

Post–row 21 Layer 1 step 1D only: RTE-33–37 /api/racks* on backend/,
mirroring backend_refactor product_groups_racks service (racks section).
Use existing racks / rack_slots tables.

Read DB-AGENTS.md and migration-db/POST-ROW21-FIX-PLAN.md. backend/ only.
Dev note + exec-log. Test RacksPage and purchase rack fields on 8001. No commit.
Suggested commit: dbmigrate(post21-L1d): racks api on postgres
STOP.
```

---

## Prompt — Layer 1 step 1E (service requests)

```
STOP AFTER 1E.

Post–row 21 Layer 1 step 1E only: full service-requests module RTE-77–81 on backend/.
Add PostgreSQL table(s) per BACKEND-FACTS-SUPPLEMENT COL-19, Alembic migration,
routers/services mirroring backend_refactor/service_requests*.

Read DB-AGENTS.md, BACKEND-FACTS-SUPPLEMENT.md, POST-ROW21-FIX-PLAN.md.
backend/ only. Dev note + exec-log. Test ServiceRequestsPage on 8001. No commit.
Suggested commit: dbmigrate(post21-L1e): service requests on postgres
STOP.
```

---

## Prompt — Layer 1 step 1F (money config)

```
STOP AFTER 1F.

Post–row 21 Layer 1 step 1F only: RTE-72–73 GET/PUT /api/money-config/{admin_id}
on backend/, mirroring backend_refactor config_dashboard_service.

money_config table already exists. backend/ only. Dev note + exec-log. No commit.
Suggested commit: dbmigrate(post21-L1f): money config api on postgres
STOP.
```

---

## Prompt — Layer 1 step 1G (media proxy)

```
STOP AFTER 1G.

Post–row 21 Layer 1 step 1G only: RTE-76 GET /api/media/proxy on backend/,
mirroring backend_refactor/system + service behavior. RTE-75 optional only if
you need Mongo root envelope; do not claim /api/health replaces RTE-75.

backend/ only. Dev note + exec-log. Test RemoteImage / catalog images on 8001.
No commit. Suggested commit: dbmigrate(post21-L1g): media proxy on postgres
STOP.
```

---

## Prompt — Layer 2 (verification pass, minimal code)

```
STOP AFTER LAYER 2.

Post–row 21 Layer 2: verification only unless a contract bug is found.

Read migration-db/POST-ROW21-FIX-PLAN.md Layer 2 and row 21 audit section B.
Assume Layer 1 is Done on 8001.

Run through: auth Bearer, RFQ create/approve, dispatch, inventory transactions,
partner detail purchase history, soft-delete visibility, validation envelopes on
catalog and operational paths.

Document results in migration-db/dev/YYYY-MM-DD-post21-layer2-verification.md
and exec-log. Fix backend/ ONLY for clear API contract breaks vs Mongo mirror;
do not remove Bearer, transactions, or soft deletes without user approval.

No commit. Suggest: dbmigrate(post21-L2): … only if code changed. STOP.
```

---

## Prompt — Layer 3 (optional data copy)

```
STOP AFTER LAYER 3.

Post–row 21 Layer 3 (optional): run or document Mongo→PG data copy per tracker
rows 12–13 and/or 14. User chose greenfield; only do what I name: [12 | 13 | 14].

Read DB-AGENTS.md and migration-db/dev notes for those rows. Do not copy
operational data unless I explicitly include row 14.

Dev note + exec-log. No commit unless I ask. STOP.
```

---

## Prompt — Layer 4 (cutover — row 22 only)

```
DO ONLY ROW 22 FROM migration-db/DB-STATUS.md. THEN STOP.

Prerequisite: POST-ROW21-FIX-PLAN Layer 1 complete and Layer 2 verified.

Read DB-AGENTS.md. Row 22 is decommission backend_refactor / cutover — not
Layer 1 implementation. Follow DB-AGENTS row 22 rules exactly.

Dev note + exec-log. No commit. STOP.
```

---

## Your workflow (short)

1. Mark row **21** Done + commit audit (if not already).  
2. Pick **one** Layer 1 prompt (start with **1A** or **1B**).  
3. Agent → Built → **you test** on 8001 (and 8000 for parity).  
4. **You commit** with `dbmigrate(post21-L1x): …`.  
5. Repeat until Layer 1 checklist is green.  
6. Run **Layer 2** prompt.  
7. Layer 3 only if you need Mongo data on PG.  
8. Layer 4 = row **22** when ready for VPS switch.

---

## Quick reference — row 21 gaps (20 missing on PG)

| Gap | RTE |
|-----|-----|
| Product groups | 28–32 |
| Racks | 33–37 |
| Money config | 72–73 |
| Dashboard snapshot | 74 |
| Mongo root | 75 |
| Media proxy | 76 |
| Service requests | 77–81 |

**Exists but wrong contract:** 39–40 purchases (`partnerId` vs web `{lines}`).

Full matrix: `migration-db/dev/2026-10-13-21-route-parity-audit.md`.
