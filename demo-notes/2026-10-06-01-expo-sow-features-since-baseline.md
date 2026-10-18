# Expo SOW features since baseline (for React migration)

**Date:** 2026-10-06  
**Audience:** Agents on `web-migration-reactnative-to-react`  
**Baseline:** `docs/migration/INVENTORY.md` body (2026-10-01 SCR table), `docs/BACKEND_INVENTORY.md` body (2026-10-04)

---

## How to use this file (merge-safe)

- **Do not** rewrite `migration/STATUS.md`, `docs/migration/INVENTORY.md`, or `docs/BACKEND_INVENTORY.md` on feature branches — that causes conflicts when merging into the migration branch.
- **Add** new dated notes under `migration/dev/` (like this file) for anything built after the baseline snapshots.
- On the migration branch, read **`migration/STATUS.md`** (branch-specific progress) **then** this file **then** `migration/bug_fix/HANDOFF-READY.md`.

---

## Expo admin — what changed (2026-10-05 → 2026-10-06)

| Area | Screen / module | Main app files | Notes for port |
|------|-----------------|----------------|----------------|
| Product | Catalog / master export | `catalog.tsx`, API in `endpoints.ts` | HSN, GST, pack, MRP on forms; master export |
| Purchase | Purchases | `purchases.tsx` | Filters, export, rack picker, bulk UX |
| Partners | Partners admin | `partners.tsx` | KYC, export, admin create; mobile auth is **not** in repo — see `migration/bug_fix/PARTNER-MOBILE-AUTH-FLOW.md`, `docs/PARTNER-API.md` |
| RFQ | RFQs | `rfqs.tsx` | Filters, export, create UX |
| Dispatch | Dispatches | `dispatches.tsx` | Retail cart, export |
| Inventory | Inventory | `inventory.tsx` | UI polish, export |
| Team | Team + auth | `team.tsx` | Teammate admin login (`store_manager` / `staff`); backend `auth_service.py` |
| Bugs | Racks / groups | — | `product_groups_racks_service.py` (FIX-01 rack) |
| Service requests | §10 admin | `service-requests.tsx` | Backend `service_requests_service.py`; contract `docs/SERVICE-REQUESTS-API.md` |

**Demo / agent notes (if present on branch):** `2026-10-05-10-*` (product), `11-*` (purchase), `12-*` (partners), `2026-10-06-13-*` (RFQ), `14-*` (dispatch), `15-*` (inventory), `16-*` (team + bug sweep).

**Owner verify:** One pass — `migration/bug_fix/OWNER-SIGNOFF.md` (code-complete, not owner-tested).

---

## Backend delta (vs 2026-10-04 inventory)

Deploy from **`backend_refactor/`** on VPS (not legacy `backend/server.py`).

| Change | Detail |
|--------|--------|
| Collection | `service_requests` (19th collection) |
| Routes | +service-request lifecycle routes; see `docs/SERVICE-REQUESTS-API.md` |
| Auth | Team/teammate login paths used by admin |
| Fixes | Rack handling (FIX-01); see pytest / HANDOFF for FIX-06 etc. |

**Tests:** `test_service_requests_api.py` (and related suite on feature branch).

---

## Still out of repo (do not assume in Expo)

- Dashboard §9 full custom reports hub (per-module CSV / snapshots OK elsewhere)
- FIX-07 QR camera, FIX-09/10, FIX-03/04/11 imports (see `migration/bug_fix/`)
- Partner **customer** mobile UI, Firebase customer auth
- Role-based menu hiding (if not landed on your checkout — verify `team.tsx` / menu config)

---

## Suggested React port order

Match existing phase order in `docs/migration/INVENTORY.md` (bottom of file): master data screens first, transactional modules, **service-requests last** (newest API surface).

**Rule:** Expo behavior is source of truth until a `web/` screen is ported and accepted.

---

## Changelog index (additive files only)

| Date | File |
|------|------|
| 2026-10-06 | This file — Expo SOW feature delta since 2026-10-01 / API since 2026-10-04 |
| — | `migration/bug_fix/HANDOFF-READY.md` — done vs not in repo |
| — | `docs/SERVICE-REQUESTS-API.md`, `docs/PARTNER-API.md` — mobile contracts |

*Future updates: add `migration/dev/YYYY-MM-DD-*.md`; do not replace migration `STATUS.md`.*
