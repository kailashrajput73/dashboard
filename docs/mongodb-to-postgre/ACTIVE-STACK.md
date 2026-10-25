# Active stack (for agents)

> Migrations closed — **`docs/MIGRATIONS-COMPLETE.md`**. Postgres cutover: **`8ffd98c`**. Web port: **`7a4cb70`**.

**Use only these paths for new work:**

| Layer | Folder | Notes |
| --- | --- | --- |
| Admin UI | `web/` | Vite + React; `VITE_BACKEND_URL` → API origin (no `/api` suffix) |
| API | `backend/` | FastAPI + PostgreSQL; `uvicorn app.main:app`; Alembic in `backend/alembic/` |

**Removed from the repo (2026-10-20):**

- `backend_refactor/` — legacy Mongo mirror (DB row 22)
- `frontend/` — legacy Expo admin (web migration row 21c)

**Reference only (no live code):**

- `BACKEND_INVENTORY.md` — route/collection facts from the Mongo era
- `BACKEND-FACTS-SUPPLEMENT.md`
- `docs/migration/INVENTORY.md` — screen map (Expo paths are historical)

**DB migration tracker (archive):** `DB-STATUS.md`  
**Web migration tracker (archive):** `docs/migration/STATUS.md`  
**Catalog rules (locked):** `CATALOG-DESIGN-RULES.md`  
**Spreadsheet / import map:** `docs/migration/Reactnative-to-react-migration-notes/SHEET-IMPORTS-INDEX.md`

Ongoing work branch: **`migration-mongodb-to-postgresql`** (feature + docs; migrations themselves are closed).

## Hosting (not Render)

- **Do not** use `https://python-api-6aft.onrender.com` — retired; not in this repo’s active config.
- **Local:** `VITE_BACKEND_URL=http://127.0.0.1:8001`, Postgres API via `backend/`.
- **Production:** user’s **VPS** URL in `VITE_BACKEND_URL` (HTTPS recommended). See root `README.md` deploy note.
