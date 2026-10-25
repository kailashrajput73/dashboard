# AGENTS.md

Project: admin app is **React web** in `web/` (Vite). Expo `frontend/` was removed (row 21c).
API: **`backend/`** (PostgreSQL). See `migration-db/ACTIVE-STACK.md`.
Branch: `web-migration-reactnative-to-react` for web tracker rows; DB work uses `migration-mongodb-to-postgresql`.

## Start of every chat
1. Read `docs/migration/STATUS.md`, `migration/NOW.md`, then `docs/migration/SOW-STATUS.md` if present.
2. Do ONLY the row(s) the user names. If none is named, ask. Do not start migrating on your own.

## Rules
- Do only the row(s) the user names. If the user names several rows, do them in the order given, then STOP after the last one. Never go beyond the named rows.
- Match behavior described in `docs/migration/INVENTORY.md` (Expo paths are **historical**; implement in `web/`).
- Do not touch `backend/` unless the user names a backend/DB task.
- Do not recreate `frontend/` or `backend_refactor/`.
- Do not guess. Write "unknown" and ask.
- NEVER run `git commit`, `git push`, or `git merge`. The user does that.

## When the row is built
1. Write the dev note in `migration/dev/` and the admin note in `migration/admin/` (what is in each is described in STATUS.md).
2. Set the row to **Built** in `docs/migration/STATUS.md`. Never set Done; the user does that after testing.
3. Tell the user: what was built, which files changed, how to test it, and a commit message like `migrate(2): categories`.
4. STOP.
   ## Live handoff (every task)
   - At the start, read migration/NOW.md. If the user names a task file in migration/tasks/, read it too.
   - While you work, update migration/NOW.md after every batch and BEFORE you stop for any reason (usage limit, blocker, error). Say what is done, the files changed, and the exact next action.
   - If NOW.md shows work already done, do not redo it. Continue at "Next action".
   - Keep NOW.md under one screen. Overwrite it; do not append forever.