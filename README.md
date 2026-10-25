# Dashboard — sanitary / building-materials admin + API

**Last verified local setup:** 25 October 2026 (IST) — PostgreSQL + `backend/` on **8001**, admin `web/` on **5173**.

| Folder | What it is |
| --- | --- |
| `backend/` | FastAPI + **PostgreSQL** (`app.main:app`) — API source of truth |
| `web/` | Vite + React **admin** (`/product-management`, RFQ, partners, …) |
| `customerapp/` | Flutter partner app (separate; see `docs/PARTNER-API.md`) |

**Docs:** Product/requirements → `docs/sow-guide/00-index.md` · **Migrations closed (read first)** → `docs/MIGRATIONS-COMPLETE.md` · Stack → `docs/mongodb-to-postgre/ACTIVE-STACK.md` · Agents → `docs/migration/AGENTS.md`

Legacy **Render** URL and Mongo `backend_refactor/` are **not** used.

All JSON routes: **`/api`** · Envelope: `{ "success", "data", "error" }`.

---

## Local development (Windows, macOS, Linux)

You need **PostgreSQL 16+**, **Python 3.11+** (3.12 OK), **Node.js 20+**, and **git**.  
Ports: API **8001**, admin **5173**.

Set `REPO` to your clone path (examples use `$REPO` on Unix, `%REPO%` on Windows).

### 1. PostgreSQL — create database

Use database name **`quotation_db_pg`** (and optional **`quotation_test`** for tests).

#### Windows (PowerShell)

```powershell
winget install --id PostgreSQL.PostgreSQL.17 --exact --source winget
# Or use the EnterpriseDB installer; remember the postgres password.
psql -U postgres -h 127.0.0.1 -p 5432 -d postgres
```

In `psql`:

```sql
CREATE ROLE quotation_app WITH LOGIN;
-- then: \password quotation_app
CREATE DATABASE quotation_db_pg OWNER quotation_app;
```

Or use the `postgres` superuser and set `DATABASE_URL` accordingly (see `backend/README.md`).

#### macOS (Homebrew)

```bash
brew install postgresql@17 node
brew services start postgresql@17
createuser -s postgres 2>/dev/null || true
createdb quotation_db_pg 2>/dev/null || true
```

Adjust if your Homebrew PostgreSQL user is your macOS username — set `DATABASE_URL` to match.

#### Linux (Debian / Ubuntu)

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client python3-venv python3-pip git curl
sudo systemctl enable --now postgresql
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER USER postgres WITH PASSWORD 'YOUR_DB_PASSWORD';
SELECT 'CREATE DATABASE quotation_db_pg OWNER postgres' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quotation_db_pg')\gexec
SELECT 'CREATE DATABASE quotation_test OWNER postgres' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quotation_test')\gexec
SQL
```

URL-encode special characters in passwords inside `DATABASE_URL`.

#### Fedora / RHEL

Install `postgresql-server` and `postgresql` client via `dnf`, run your distro’s DB init, then create `quotation_db_pg` in `psql` (same SQL as above).

---

### 2. Backend (API)

```bash
cd backend
cp -n .env.example .env   # Windows: copy .env.example .env
```

Edit **`backend/.env`** (minimum for local):

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@127.0.0.1:5432/quotation_db_pg
CORS_ORIGINS=
AUTH_MODE=dev
ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=
```

**Windows (PowerShell)** — from repo root:

```powershell
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
backend\..\.venv\Scripts\python.exe scripts\test_pg_connection.py
backend\..\.venv\Scripts\alembic.exe upgrade head
backend\..\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001 --reload
```

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/test_pg_connection.py
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Check: [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health) → `{"status":"ok"}`.

More detail: **`backend/README.md`**.

---

### 3. Web (admin UI)

```bash
cd web
npm ci
cp -n .env.example .env
```

Usually **leave `VITE_BACKEND_URL` unset** — Vite proxies `/api` → `http://127.0.0.1:8001` (see `web/vite.config.ts`).

If the proxy fails (some hosts or custom ports), set in **`web/.env`**:

```env
VITE_BACKEND_URL=http://127.0.0.1:8001
```

Then:

```bash
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) · Register admin once at `/register` if needed.

---

### 4. Daily workflow

| Step | Command |
| --- | --- |
| After `git pull` | `cd backend && source .venv/bin/activate && alembic upgrade head` (Windows: activate `.venv` first) |
| Terminal 1 | API: `uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload` |
| Terminal 2 | UI: `cd web && npm run dev` |

---

### 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| `DATABASE_URL is not set` | Create `backend/.env` from `.env.example` |
| Alembic / DB connection fails | Postgres running? Password URL-encoded? DB exists? |
| Admin UI loads, API errors | Start backend on **8001**; both processes required |
| `Refusing to start` with `AUTH_MODE=dev` | Set `ENV=development` locally (not `production`) |
| Port in use | Stop old uvicorn/node; on Linux: `fuser -k 8001/tcp 5173/tcp` |
| Partner `/api/app/*` local test | `AUTH_MODE=dev` → `Authorization: Bearer dev:9876543210` — see `docs/PARTNER_APP_API.md` |

Optional Firebase on local: set `AUTH_MODE=firebase` and `FIREBASE_SERVICE_ACCOUNT_PATH` to a **non-committed** JSON path.

---

### 6. Backend tests (optional)

```bash
cd backend
source .venv/bin/activate
export TEST_DATABASE_URL="postgresql+psycopg://postgres:YOUR_PASSWORD@127.0.0.1:5432/quotation_test"
DATABASE_URL="$TEST_DATABASE_URL" alembic upgrade head
AUTH_MODE=dev ENV=development python -m unittest discover -s tests -v
```

---

## Keeping this README accurate

Setup drifts when ports, env vars, or migrations change. Use this habit:

1. **Touch README in the same PR** when you change any of:
   - `backend/.env.example` or required env vars
   - Default API port (**8001**) or Vite port (**5173**) / `web/vite.config.ts` proxy
   - Alembic revision that everyone must run (`alembic upgrade head`)
   - Node or Python version requirements
2. **Bump “Last verified local setup”** at the top of this file when you successfully run through § Local development on your machine.
3. **Commit message:** include `docs(readme):` when only setup docs changed so history is searchable.
4. **Do not** duplicate long runbooks elsewhere — extend this section or `backend/README.md` instead of new `docs/LOCAL-*.md` files.
5. **Product/API contract** lives in `docs/sow-guide/` and `backend/README.md`; this file is **clone → run → smoke test**.

---

## API base URL

| Where | Setting |
| --- | --- |
| Local dev | Usually no `web/.env` (proxy). Else `VITE_BACKEND_URL=http://127.0.0.1:8001` (no `/api` suffix) |
| Production | VPS HTTPS origin in `VITE_BACKEND_URL` at **build time** for static admin |

**Partner / mobile:** [docs/PARTNER-API.md](docs/PARTNER-API.md) · Firebase app routes: [docs/PARTNER_APP_API.md](docs/PARTNER_APP_API.md)

---

## Contract every JSON route uses

```json
{ "success": true, "data": {}, "error": null }
```

On failure: `success` is `false`, `data` may include extra detail, `error` is a string. HTTP 4xx still returns this envelope.

Admin login returns a token. The dashboard sends `Authorization: Bearer <token>`.

**Do not store a wallet balance.** Rewards are a ledger (`reward_ledger`). Balance is the sum of ledger rows.

---

## Where to look in code

- **Routes:** `backend/app/routers/` → `backend/app/main.py` (`/api`)
- **Dashboard API:** `web/src/api/endpoints.ts`, `web/src/api/client.ts`
- **Main admin screen:** `web/src/pages/ProductManagementPage.tsx`

---

## Catalog & imports

Spreadsheet rules: `docs/migration/Reactnative-to-react-migration-notes/SHEET-IMPORTS-INDEX.md` (archive path) or import UI in **Product management** hub.  
Catalog architecture (locked): `docs/mongodb-to-postgre/CATALOG-DESIGN-RULES.md`.

Legacy single-sheet columns (reference): `docs/migration/Reactnative-to-react-migration-notes/SHEET-FORMAT.md`.

Catalog JSON fields (camelCase) — summary:

| Field | Meaning |
| --- | --- |
| `id` | UUID string |
| `productCode` | SKU / QR (`qrCode` copies this) |
| `name` / `productName` | Display (family/SKU rules apply) |
| `brand` / `brandId`, `category`, `type`, … | Taxonomy |
| `mrp`, `discount`, `sellingPrice`, `stock`, `reorderLevel` | Pricing & stock |

Selling price: if `sellingPrice` is sent, it is used; else `mrp` + `discount` %.

---

## Endpoints

Base: `{API_ORIGIN}/api/...` — interactive list: run API and open `/docs` (Swagger).

### Health & media

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/media/proxy?url=` | Image bytes (not JSON) |

### Auth

| Method | Path | Body |
| --- | --- | --- |
| POST | `/auth/admin/register` | `{ companyName, gstin, contactNumber, passcode }` |
| POST | `/auth/admin/login` | `{ contactNumber, passcode }` → token |

### Partners, team, catalog, purchases, RFQs, dispatch, inventory

See Swagger at `/docs` or historical route list in `docs/mongodb-to-postgre/BACKEND_INVENTORY.md` (Mongo-era IDs; live code is Postgres in `backend/app/`).

**RFQ flow:** approve writes `reward_ledger`; dispatch decrements stock.

---

## Data store

**PostgreSQL** via SQLAlchemy + Alembic (`backend/alembic/`). Table definitions: `backend/app/models/`.

Old Mongo collection names in older docs map to Postgres tables — see `docs/mongodb-to-postgre/` notes.

---

## Admin UI (`web/`)

| URL | Screen |
| --- | --- |
| `/product-management` | Catalog hub (list, import, taxonomy) |
| `/dashboard`, `/rfqs`, `/partners`, `/purchases`, `/inventory`, … | Operations |

Legacy paths (`/catalog`, `/categories`, …) redirect into product management.

---

## Deploy (production)

Run **`backend/`** on VPS with PostgreSQL (`alembic upgrade head`, nginx + SSL). Build **`web/`** with `VITE_BACKEND_URL` pointing at that API origin. Git push alone does not deploy until you update the server.
