# React migration — status pointer

**Updated:** 2026-10-06  
**Purpose:** When you checkout `web-migration-reactnative-to-react` (or latest commit owner names), read this first, then the delta sections in the two inventory files.

---

## Read order for migration agent

1. **`migration/STATUS.md`** (this file) — branch, what’s done, what’s next  
2. **`docs/migration/INVENTORY.md`** — Expo baseline (2026-10-01) + **§ Migration delta (2026-10-06)** at top  
3. **`docs/BACKEND_INVENTORY.md`** — API/DB baseline (2026-10-04) + **§ Changelog since 2026-10-04** at top  
4. **`migration/bug_fix/HANDOFF-READY.md`** — Expo admin feature-complete list (do not re-build in React until ported)

---

## Branches (repo)

| Branch | Role |
|--------|------|
| `restore-brand-imports` (typical feature work) | Expo SOW + `backend_refactor` fixes through 2026-10-06 |
| `web-migration-reactnative-to-react` | Vite/React admin shell; port screens one phase at a time |

**Rule:** Expo remains source of truth for behavior until a screen is ported and accepted on `web/`.

---

## Expo admin (source) — 2026-10-06

**Code-complete** for SOW admin modules; owner verify pending (`migration/bug_fix/OWNER-SIGNOFF.md`).

**Not in Expo repo:** partner customer mobile UI, Firebase customer auth, Dashboard §9 custom analytics hub.

**React (`web/`):** Check branch — likely login/shell only or empty; port using **Suggested phase order** in `INVENTORY.md` (bottom of file).

---

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

---

## Owner handoff (same week)

Single test pass: `migration/bug_fix/OWNER-SIGNOFF.md`.  
Mobile plumber/electrician: `docs/SERVICE-REQUESTS-API.md`.
