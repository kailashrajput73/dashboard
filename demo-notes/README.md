# Demo notes (one file per major change)

Use these before a client demo or handoff. Each file is a **single release or feature slice** — add a new dated file when something major ships; do not grow one mega-doc.

| File | What changed |
|------|----------------|
| [2026-09-20-01-split-catalog-imports.md](./2026-09-20-01-split-catalog-imports.md) | Master / price / stock imports |
| [2026-09-20-02-secured-delete-wipe.md](./2026-09-20-02-secured-delete-wipe.md) | Passcode deletes + catalog wipe |
| [2026-09-20-03-rfq-admin-and-catalog-exports.md](./2026-09-20-03-rfq-admin-and-catalog-exports.md) | RFQ edit/scan/dispatch + CSV exports |
| [2026-09-20-04-overview-snapshot.md](./2026-09-20-04-overview-snapshot.md) | Overview KPIs + moving / slow products |
| [2026-09-23-05-mongodb-indexes.md](./2026-09-23-05-mongodb-indexes.md) | MongoDB indexes; catalog Class (`productClass`); Category/Brand photos on edit (not Excel); Manage Catalog Category chips + Filter |

**Deploy reminder:** With `USE_CLOUD_PREVIEW = true` in `frontend/src/config/env.ts`, Render must run the same `backend/server.py` as local or new routes fail with 404.
