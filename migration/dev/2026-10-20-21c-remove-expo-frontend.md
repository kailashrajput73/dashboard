# Row 21c — remove Expo admin (`frontend/`)

## Planned

Remove the Expo / React Native admin app from the repo now that `web/` is the
admin UI. User requested removal to reduce agent confusion.

## Built

- Removed entire `frontend/` tree from git (Expo app, `package.json`, screens).
- Updated root `AGENTS.md` and `migration/STATUS.md` (row 21c → **Built**).
- Added `migration-db/ACTIVE-STACK.md` as the single “what to use” pointer.

## Left

- Row **22b-3** (layout clipping) remains **Not started** — optional polish on `web/`.
- Row **21b** production deploy for `web/` not started.
- Historical dev notes still mention `frontend/...` paths for traceability.

## How to test

```powershell
cd web
npm install
npm run dev
```

Use admin flows on `http://localhost:5173` against `backend/` on port 8001.

## Commit message (user)

`migrate(21c): remove expo frontend; web is admin ui`
