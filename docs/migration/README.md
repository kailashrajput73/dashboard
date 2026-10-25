# Migration control docs (one folder)

**Purpose:** Agent rules, port tracker, SOW module table, and Expo screen inventory — kept together so paths are not split across the repo root and `migration/`.

| File | Use today |
|------|-----------|
| `AGENTS.md` | Agent rules — start of every coding chat |
| `STATUS.md` | Row-by-row web port tracker (migration largely complete) |
| `SOW-STATUS.md` | SOW vs Expo/React columns (**historical** — treat as archive) |
| `INVENTORY.md` | Expo screen/API map (**archive** — port complete; use `web/` + sow-guide for live UI) |
| `INVENTORYmd` | Duplicate copy of inventory baseline — **archive**; prefer `INVENTORY.md` |
| `AGENT-PROMPTS.md` | Copy-paste prompts for agents |

**Live app:** `web/` + `backend/`. See `migration-db/ACTIVE-STACK.md` and `docs/sow-guide/00-index.md`.

**Still under `migration/` (not moved):** `migration/dev/`, `migration/admin/`, `migration/NOW.md`, `migration/bug_fix/`, sheet specs, tasks.

**Old paths:** `migration/STATUS.md` etc. are stubs pointing here.
