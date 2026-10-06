# Bug fix & refactor sign-off backlog

**Created:** 2026-10-03 (home PC testing)  
**Backend on VPS:** `backend_refactor/` (not `backend/server.py`)  
**Purpose:** Handoff for office PC / any new chat. Read this before fixing bugs.

---

## For the agent at the office

1. Pull latest git on branch you use for this project (see repo `migration/STATUS.md` if present).
2. Read this file end to end.
3. API base URL should point at **VPS refactor**, not the old monolith.
4. Follow **`AGENT-WORKFLOW.md`** — **one FIX at a time**; owner tests; then **next**.
5. Do not redo refactor route parity — routes already matched 76/76.

### Owner testing (2026-10-05)

Owner **does not** smoke-test after every module. Implementation is tracked as **code complete** with **owner verify pending** until one consolidated app pass. See **`OWNER-SIGNOFF.md`** for the final checklist and module table.

### Uploads — out of scope for bug-fix agents

Owner sign-off: **master / prices / stock / subcategory uploads are fine.** Do **not** change import rules or “fix” master vs discount behavior. **FIX-03, FIX-04, FIX-11 are deferred.**

---


## Summary

You have enough to **keep refactor on the VPS** and **not rely on `backend/server.py`** for daily use. You do **not** have “everything green” yet — you have a clear **fix-later** list.

---

## Discount / upload (test steps 4 and 7)

### What was seen

- Stock/prices imports: **45%** discount (and qty) set.
- Later **master** (or subcategory sheet) with **49%** on the same product → still **45%**.

### Is that a problem?

| Upload type | On an **existing** product code, should discount change? |
|-------------|--------------------------------------------------------|
| **Product master** | **No** — by design. Master updates name, category, type, class, ROL, HSN, etc. It does **not** overwrite MRP, discount, selling price, or stock on existing SKUs. Split-upload rule (see `demo-notes/` import notes). |
| **Prices import** | **Yes** — that file is for price/discount (and MRP) only. |
| **Stock import** | **Only** quantity. |
| **Subcategory import** | **No** — only subcategory rows, not product discount. |

**Master with 49% not changing 45% is correct, not a bug.**

If the **Prices** sheet was used twice with 49% and discount stayed 45% → noted as **FIX-03** but **deferred** — owner decided uploads are OK for now; do not fix unless reopened.

### “Master should do stock + price + discount”

That would undo the **split upload** (safe daily price updates without touching stock). Options (discussion only):

- **A)** Keep split (document for client).
- **B)** Master updates price/discount only when those columns are filled (empty = keep old).
- **C)** One “full replace” import for migrations only (dangerous on live).

No decision required for refactor sign-off.

**ROL (step 4):** Re-import with empty ROL keeps previous value (e.g. 500) → **pass** on refactor.

---

## Money config (test step 2)

Tested. Feature **unused** (leftover from old quotation demo). **Remove from admin UI later** — not a refactor blocker. Backend route can stay until cleanup.

---

## VPS refactor test map (home PC)

| # | Area | Result | Notes |
|---|------|--------|--------|
| 1 | Login | Pass | |
| 2 | Money config | Pass | Remove UI later (FIX-05) |
| 3–6 | Master / prices / stock / subcategory imports | Pass | |
| 4 | ROL + discount on master | ROL pass; 49% on master ignored | **Expected** |
| 7 | Subcategory + 49% discount | Subcategory does not set discount | If **prices** import also failed → FIX-03 |
| 8–10 | Product form, QR | Pass | 2026-10-05: master-shaped catalog export and HSN/GST/pack/MRP-per-pack form fields implemented; smoke verification pending. Scanner later (FIX-07) |
| 11 | Purchase CSV | UX implemented; owner smoke test pending | FIX-04 |
| 12 | Rack assign | **Bug** | API error when assigning product — FIX-01 |
| 13–17 | RFQ, approve, edit, dispatch, retail | Pass | Heavy path OK |
| 15 | Edit approved RFQ before dispatch | Covered | User edited during RFQ/dispatch flow |
| 18–19 | Partners | Admin SOW code complete; owner verify pending | Mobile auth unchanged; see partner SOW note and `OWNER-SIGNOFF.md` |
| 20 | Secured delete | Not found in UI | Catalog secured delete — find or skip |
| 21 | Wipe catalog | Used on test DB | Security before live — FIX-10 |
| 22–26 | Dashboard, lists | Pass | With earlier tests |
| 27 | Team | **Code complete** | Team list refresh, role defaults, active/inactive toggle, teammate login — FIX-06 |
| 28 | Catalog download | **Resolved in code** | Web Blob export — FIX-02 |
| 29–31 | Partner API | Pending | Mobile developer — FIX-09 |

---

## Delete `backend/server.py` in git?

**OK when:**

- VPS runs **only** `backend_refactor`.
- Sales path (steps 13–17) passed on refactor.

**Deleting the monolith file does not fix** rack assign, catalog download, or prices-import bugs — fix FIX-xx separately.

### Optional checks later (not blockers for deleting monolith source)

| Topic | Why |
|--------|-----|
| Prices import 49% (FIX-03) | Data correctness |
| Rack assign (FIX-01) | Warehouse |
| Catalog download (FIX-02) | Export |
| Purchase CSV (FIX-04) | Stock-in |
| Secured product delete (20) | Find UI |
| Partner API 29–31 (FIX-09) | When app ready |
| Product groups, settings taxonomy | Quick spot-check if used |

**Before client demo (active bugs):** FIX-01 rack assign, FIX-02 catalog download. See **`AGENT-WORKFLOW.md`** for order.

---

## Fix backlog (FIX-xx)

| ID | Area | Issue | Test # | Priority |
|----|------|--------|--------|----------|
| FIX-01 | Rack / API | Assign product to slot → server API error | 12 | P1 demo | Fixed in backend_refactor; owner verify pending |
| FIX-02 | Catalog UI | Download button does nothing | 28 | P1 demo | Resolved in code; web Blob export verified |
| FIX-03 | Import | Prices 49% — **deferred** (uploads OK) | 7 | — | No import rule changes |
| FIX-04 | Purchase | CSV UX implemented; backend/import rules unchanged | 11 | — | No import rule changes |
| FIX-05 | Admin | Remove unused money config screen | 2 | P2 | Removed from admin nav in source; API retained |
| FIX-06 | Team | Fresh list + teammate login + active/inactive status | 27 | P2 | Code complete; owner verify pending |
| FIX-07 | Product | QR scanner (later); download OK | 9 | P3 |
| FIX-08 | Partner | Admin SOW implemented; mobile app/auth follow-up remains separate | 18–19 | P2 product |
| FIX-09 | Partner API | Login, catalog, RFQ when app ready | 29–31 | P2 mobile |
| FIX-10 | Security | Wipe + destructive actions before production | 21 | P0 go-live |
| FIX-11 | Import policy | Master vs full upload — **deferred** | 4 | — |

See also:

- `BACKEND.md` — FIX-01
- `IMPORTS.md` — FIX-03, FIX-04, FIX-11
- `ADMIN-UI.md` — FIX-02, FIX-05, FIX-06, FIX-07, step 20
- `PARTNER.md` — FIX-08, FIX-09
- `SECURITY.md` — FIX-10

---

## Short answers

| Question | Answer |
|----------|--------|
| 45% vs 49% on **master** | Not a problem — expected with split imports. |
| 49% on **prices** import still 45% | Likely bug — FIX-03. |
| Master doing stock + price | Design choice — FIX-11. |
| Delete `backend/server.py` | Reasonable if VPS uses refactor only. |
| What's left | FIX table; demo-critical: FIX-01, FIX-02, FIX-03 confirm. |

---

## Related docs

- `route/server-routes.md` — all API paths
- `docs/migration/INVENTORY.md` — admin screens (if present on disk; `docs/` may be gitignored)
- `demo-notes/SHEET-FORMAT.md` — master column layout
- `docs/PARTNER-API.md` — partner API (if present)
