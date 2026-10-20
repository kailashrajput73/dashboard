# Row 22 — decommission Mongo backend folder

## Planned

Remove `backend_refactor/` from the repository and point documentation at
`backend/` (PostgreSQL) as the only API implementation. User confirmed Mongo
held no useful data; Layer 3 data copy was skipped.

## Built

- Deleted `backend_refactor/` from git (routers, services, `server.py`, utils).
- Updated agent entry docs: `migration-db/ACTIVE-STACK.md`, `DB-AGENTS.md`
  (post-cutover rules), `backend/README.md` intro, root `README.md` API section.
- Updated `migration/bug_fix/AGENT-WORKFLOW.md` to reference `backend/` only.
- `backend/requirements.txt` still lists `pymongo` for optional rows 12–13
  migration scripts only; no Motor, no `backend_refactor` package.

## Not done in this row (user / ops)

- **VPS deploy** must run `backend/` + PostgreSQL, `alembic upgrade head`, and
  production admin `VITE_BACKEND_URL` — not automated here.
- Mark row **22 Done** in `DB-STATUS.md` after VPS/local production smoke test.
- Row **21** audit: mark **Done** if not already.

## How to test

```powershell
cd backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Web: `web/.env` → `VITE_BACKEND_URL=http://127.0.0.1:8001`, login and spot-check
catalog + purchases.

## Rollback

Restore `backend_refactor/` from git history before this commit if a Mongo
rollback is ever needed.
