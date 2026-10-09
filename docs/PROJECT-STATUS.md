# Project status (internal)

**Updated:** 9 October 2026  
**Audience:** Owner and dev agents on **this Expo admin repo branch**  
**Sources:** `migration/bug_fix/OWNER-SIGNOFF.md`, `migration/bug_fix/HANDOFF-READY.md`, `migration/dev/2026-10-06-01-expo-sow-features-since-baseline.md`

### Agent scope (read first)

| In scope on **this branch** | Out of scope here (do not start from this doc) |
|-----------------------------|------------------------------------------------|
| **§1** — Expo admin SOW code in `frontend/` + `backend_refactor/` touched for admin | **§3** — partner mobile / Firebase (separate delivery) |
| **§2** — owner UAT checklist for the Expo admin app on VPS | **§4** — React `web/` port (other branch) |

Owner is **leaving this branch**; any remaining **§1** work (mainly Dashboard §9) continues on the branch the owner assigns. Sections **2–4** are **project-wide context** for the owner only — not a task list for agents cloning this repo.

---

## Summary table

| Track | Done | Left |
|-------|------|------|
| **Expo admin code (in-repo SOW)** | **~90%** | **~10%** (mainly Dashboard §9 + optional polish) |
| **Demo / owner sign-off** | **~30%** | **~70%** (one test pass + deploy + confirm bugs) |
| **Mobile + partner app** | **~20%** | **~80%** |
| **React admin port** | **~5–10%** | **~90–95%** |

```
Expo admin SOW (this repo)     [████████████████████░░░░]  ~90%
```

---

## 1) Expo admin SOW — building in this repo

| | Detail |
|---|--------|
| **Done (~88–92%)** | Master data (category → racks/stock), Product, Purchase, Partners (admin), RFQ, Dispatch, Inventory, Team + teammate login, Service requests (API + admin). Most demo bugs addressed in code (rack, catalog export, team refresh, etc.). |
| **Left (~8–12%)** | Dashboard §9 — only snapshot-style reporting, not the full custom analytics hub. Optional/later: QR scan (FIX-07), role-based menu hiding if not on your branch. Deferred by choice: import policy (FIX-03/04/11). |
| **One line** | Admin implementation for in-repo SOW is roughly **~9/10**; the missing slice is mostly **Dashboard §9** plus small optional items. |

### 1a) Build vs owner verify (Expo modules)

| Module | Code (agent) | Owner verified |
|--------|----------------|----------------|
| Category, subcategory, brand, product group, rack, stock | Done (earlier) | ☐ |
| Product (export, HSN/GST/pack/MRP) | Code complete | ☐ |
| Purchase | Code complete | ☐ |
| Partners (admin KYC) | Code complete | ☐ |
| RFQ | Code complete | ☐ |
| Dispatch | Code complete | ☐ |
| Inventory / stock UI | Code complete | ☐ |
| Team + teammate login | Code complete | ☐ |
| Dashboard & reports (§9) | **Snapshot only** — custom hub not built | ☐ |
| Plumber / electrician (service requests) | API + admin shipped | ☐ |

Test steps: **`migration/bug_fix/OWNER-SIGNOFF.md`**.

### 1b) Remaining build work (this repo only)

| Item | Notes |
|------|--------|
| Dashboard §9 custom reports / analytics hub | Main code gap |
| Optional FIX-07 QR | Defer unless owner asks |
| Optional role-based menu hiding | Verify on branch before building |
| FIX-03 / FIX-04 / FIX-11 imports | **Deferred** — do not reopen without owner |

**Rough effort (§1 only):** ~2–4 weeks focused if §9 scope is agreed; RFQ/dispatch/partners/etc. are already in code.

### 1c) Owner-tested on VPS (refactor API)

| Item | Status |
|------|--------|
| Admin login | ✓ |
| Categories / subcategories / brands | ✓ |
| Product master import, ROL, split upload (master vs prices) | ✓ |
| Core catalog browse / stock visibility | ✓ |
| Purchase recording (spot check) | ✓ |
| Money config screen | Removed from nav ✓ |

| Not yet in one owner pass | RFQ, dispatch, partners, exports, team login, service requests, rack assign (FIX-01 confirm), full web export matrix |

### 1d) Module checklist (build)

| Module | Build | Owner verified |
|--------|-------|----------------|
| Categories, subcategories, brands, types/classes | Built | partial |
| Product groups, racks | Built | — |
| Product CRUD, master import, billing fields, catalog export | Built | partial |
| Stock, movements, purchase, bulk CSV | Built | partial |
| RFQ, dispatch, partners admin, team + login | Built | — |
| Service requests | Built | — |
| Dashboard snapshot | Built | ✓ |
| Dashboard §9 custom reports | **Not built** | — |
| QR scan | Not built (optional) | — |

---

## 2) Ready for client demo / go-live — process + verify

| | Detail |
|---|--------|
| **Done (~25–35%)** | Code written, docs/API contracts, handoff lists. |
| **Left (~65–75%)** | Owner single pass (all modules still ☐ in `OWNER-SIGNOFF`). Deploy `backend_refactor` on VPS and smoke on web. Confirm FIX-01 / FIX-02 on real environment. Go-live items (FIX-10 security/wipe) not started. |
| **One line** | Build is far along; **signed-off quality** is still mostly ahead of you. |

| Step | Status |
|------|--------|
| Consolidated owner UAT (`OWNER-SIGNOFF.md`) | Not started as full pass |
| VPS API = refactor only | Owner confirmed for tested flows |
| FIX-01 rack assign | Fix in code; owner confirm pending |
| FIX-02 catalog download (web) | Resolved in code; owner confirm pending |
| FIX-10 destructive / wipe policies | Not started (go-live) |

---

## 3) Out of this repo (contract-wide — not this branch’s queue)

| | Detail |
|---|--------|
| **Done (~15–25%)** | Partner API docs, mobile auth plan (`migration/bug_fix/PARTNER-MOBILE-AUTH-FLOW.md`, `docs/PARTNER-API.md`). |
| **Left (~75–85%)** | Partner customer app + Firebase auth, FIX-09 live API testing with mobile dev, full §9 dashboard if required in contract beyond Expo snapshot. |
| **One line** | Tracked for **overall project** reporting; **do not implement mobile/Firebase from this Expo admin branch.** |

| Deliverable | Where |
|-------------|--------|
| Partner API contract | `docs/PARTNER-API.md` |
| Service requests (mobile/public) | `docs/SERVICE-REQUESTS-API.md` |
| Admin partners / RFQ screens | This repo (§1) |

---

## 4) React migration (`web-migration-reactnative-to-react`)

| | Detail |
|---|--------|
| **Done (~5–10%)** | Branch/tracker sync, likely login + empty shell (phase 0–1). |
| **Left (~90–95%)** | Port ~15+ admin screens one phase at a time; Expo remains source of truth until each screen is accepted. |
| **One line** | **Not active on this branch** — agents use `migration/STATUS.md` on the migration branch only. |

| Item | This repo branch | Migration branch |
|------|------------------|------------------|
| Expo admin `frontend/` | Source of truth | Reference for ports |
| Vite `web/` app | Do not expand here | Active migration work |

---

## Handoff pointers (this repo)

| Doc | Use |
|-----|-----|
| `migration/bug_fix/OWNER-SIGNOFF.md` | Owner one-pass checklist |
| `migration/bug_fix/HANDOFF-READY.md` | In vs out of repo for handoff |
| `migration/dev/2026-10-06-01-expo-sow-features-since-baseline.md` | Expo delta since baseline (merge-safe) |
| `backend_refactor/` | Deploy target on VPS (not `backend/server.py`) |

**Merge-safe rule:** add `migration/dev/YYYY-MM-DD-*.md` for new notes — do not rewrite `migration/STATUS.md` or inventory baselines on feature branches.

---

*§1 is the working truth for this branch. §2–4 are owner context; agents task only from §1 and `OWNER-SIGNOFF`.*
