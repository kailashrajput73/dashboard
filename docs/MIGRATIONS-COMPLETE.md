# Migrations complete — read this first

**Updated:** 25 October 2026  

There were **two separate migrations**. Both are **finished in code**. Do **not** start new “port Expo” or “move Mongo to Postgres” work unless the owner opens a **new** project.

**Live product today:** admin **`web/`** + API **`backend/`** (PostgreSQL).  
**Setup:** root **`README.md`**.

---

## 1. Expo admin → React web (`web/`)

| Item | Detail |
|------|--------|
| **What** | Replaced Expo `frontend/` with Vite/React `web/` (same SOW behaviour). |
| **Branch (history)** | `web-migration-reactnative-to-react` |
| **Closure commit** | `7a4cb70` — *Checking Out Of from web-migration-reactnative-to-react* (docs: mark 22b-2, 22c-1, 22c-2 Done; reset NOW) |
| **Also** | `frontend/` removed from repo (row 21c). |

### “Built” vs “Done” in old notes

Tracker rows in **`docs/migration/STATUS.md`** often still say **Built**, not **Done**.

| Word in tracker | Meaning **now** |
|-----------------|------------------|
| **Built** | Implementation finished in `web/`; row was waiting on **owner browser sign-off**. |
| **Done** | Owner confirmed that screen in the browser. |

**For new readers:** treat **Built = work complete** unless you are redoing formal UAT. You do **not** need to re-run the migration row-by-row.

**Archive (diary):** `docs/migration/Reactnative-to-react-migration-notes/` — dev notes, admin how-tos, old `STATUS` copies. **Historical only.**

**Control files (short):** `docs/migration/AGENTS.md`, `STATUS.md`, `INVENTORY.md` — keep for context; see banner at top of `STATUS.md`.

---

## 2. MongoDB API → PostgreSQL (`backend/`)

| Item | Detail |
|------|--------|
| **What** | Replaced `backend_refactor/` (Mongo) with `backend/` + PostgreSQL, Alembic, transactions. |
| **Branch (history)** | `migration-mongodb-to-postgresql` |
| **Closure commit** | `8ffd98c` — *postgres backend complete, remove mongo mirror and old react native* |
| **Also** | `backend_refactor/` removed; Mongo mirror decommissioned (DB tracker row 22). |

### “Built” vs “Done” in DB notes

Same rule as web migration: **Built** in **`docs/mongodb-to-postgre/DB-STATUS.md`** means implemented and merged; **Done** meant owner verified + committed that row.

**For new readers:** Postgres API and schema in `backend/` are the **only** backend. Ignore instructions that say “run alongside `backend_refactor/`”.

**Archive (diary):** `docs/mongodb-to-postgre/dev/` — schema/migration row notes. **Historical only.**

**Still useful (not archive):** `docs/mongodb-to-postgre/ACTIVE-STACK.md`, `CATALOG-DESIGN-RULES.md`, `DB-STATUS.md` (with closure banner).

---

## What to do instead of migrating

| Goal | Read |
|------|------|
| Run locally | `README.md` |
| Product / SOW requirements | `docs/sow-guide/00-index.md` |
| What’s left vs SOW | `docs/SOW-PROGRESS.md` (if present) or sow-guide PRD |
| Partner mobile API | `docs/PARTNER-API.md`, `docs/PARTNER_APP_API.md` |

---

## One-line summary

**Expo → `web/` is done (`7a4cb70`). Mongo → Postgres is done (`8ffd98c`). “Built” in old tables means shipped, not “still in progress”.**
