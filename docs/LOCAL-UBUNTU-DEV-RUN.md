# Local development on Ubuntu (your PC)

Use this on **your Ubuntu machine** after you clone the repo.  
(Cloud agents use `/cursor/stores/self/CLOUD-LOCAL-RUN.md` — paths there assume `/workspace`.)

**Stack:** `backend/` (FastAPI + PostgreSQL, port **8001**) · `web/` (Vite admin, port **5173**)

Set **`REPO`** to your clone path everywhere below, e.g.:

```bash
export REPO="$HOME/dashboard"   # change to your path
cd "$REPO"
```

---

## 1. One-time system packages

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client python3-venv python3-pip curl git

# Node 20+ (pick one)
# Option A — NodeSource 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Option B — nvm (if you already use it)
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# nvm install 20
```

Start PostgreSQL (version number may be 16 or 17 — check with `pg_lsclusters`):

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
pg_isready -h 127.0.0.1 -p 5432
```

Create databases (set a password you will use in `DATABASE_URL`):

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER USER postgres WITH PASSWORD 'YOUR_DB_PASSWORD';
SELECT 'CREATE DATABASE quotation_db_pg OWNER postgres' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quotation_db_pg')\gexec
SELECT 'CREATE DATABASE quotation_test OWNER postgres' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quotation_test')\gexec
SQL
```

Replace `YOUR_DB_PASSWORD` with a real password. If the password has `@`, `#`, etc., **URL-encode** it in `DATABASE_URL`.

---

## 2. Backend setup

```bash
cd "$REPO/backend"
cp -n .env.example .env
nano .env   # or your editor
```

Minimum **`backend/.env`** for local dev:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_DB_PASSWORD@127.0.0.1:5432/quotation_db_pg
CORS_ORIGINS=
AUTH_MODE=dev
ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=
```

Install and migrate:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/test_pg_connection.py
alembic upgrade head
alembic current
# Expect head including 0020_partner_firebase_app after partner Firebase PR is merged
```

---

## 3. Web (admin) setup

```bash
cd "$REPO/web"
npm ci
cp -n .env.example .env
```

For local Ubuntu you usually **do not** need `web/.env`: Vite proxies `/api` → `http://127.0.0.1:8001`.

Only if the proxy fails, add `web/.env`:

```env
VITE_BACKEND_URL=http://127.0.0.1:8001
```

Then restart `npm run dev`.

---

## 4. Every day — run backend + web

**Terminal 1 — API**

```bash
cd "$REPO/backend"
source .venv/bin/activate
alembic upgrade head    # after git pull
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

**Terminal 2 — Admin UI**

```bash
cd "$REPO/web"
npm run dev
```

| What | URL |
| --- | --- |
| Admin dashboard | http://127.0.0.1:5173 |
| API health | http://127.0.0.1:8001/api/health → `{"status":"ok"}` |

Register admin once: http://127.0.0.1:5173/register (or use existing admin login).

---

## 5. Kill stuck ports (Ubuntu)

See what is using the port:

```bash
sudo lsof -i :8001 -i :5173
# or
sudo fuser -v 8001/tcp 5173/tcp
```

Kill dev servers (not Postgres):

```bash
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
```

Stop PostgreSQL only if you mean to:

```bash
sudo systemctl stop postgresql
```

If `pg_ctlcluster` exists:

```bash
pg_lsclusters
sudo pg_ctlcluster 16 main stop    # use YOUR version from pg_lsclusters
```

---

## 6. Test partner Firebase API (no Firebase key)

With `AUTH_MODE=dev` and API running:

```bash
curl -s -X POST http://127.0.0.1:8001/api/app/session \
  -H "Authorization: Bearer dev:9876543210" | python3 -m json.tool

curl -s http://127.0.0.1:8001/api/app/me \
  -H "Authorization: Bearer dev:9876543210" | python3 -m json.tool
```

Then open **Partners** in the admin UI — you should see phone `9876543210`.

More examples: **`docs/PARTNER_APP_API.md`**.

---

## 7. Real Firebase on local Ubuntu (optional)

1. Download **service account JSON** (Firebase Console → Project settings → Service accounts).
2. Save outside the repo, e.g. `$HOME/secrets/firebase-sa.json` (`chmod 600`).
3. In **`backend/.env`**:

```env
AUTH_MODE=firebase
ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=/home/YOU/secrets/firebase-sa.json
```

4. Restart uvicorn. Flutter sends `Authorization: Bearer <Firebase ID token>` to `POST /api/app/session`.

**Never commit** the JSON file (see root `.gitignore`).

---

## 8. Backend tests (optional)

```bash
cd "$REPO/backend"
source .venv/bin/activate
export TEST_DATABASE_URL="postgresql+psycopg://postgres:YOUR_DB_PASSWORD@127.0.0.1:5432/quotation_test"
DATABASE_URL="$TEST_DATABASE_URL" alembic upgrade head
AUTH_MODE=dev ENV=development python -m unittest discover -s tests -p 'test_partner_app.py' -v
```

---

## 9. Git branch reminder

- Base migration branch: **`migration-mongodb-to-postgresql`**
- Partner Firebase API: merge **PR #5** (or branch `cursor/partner-firebase-app-9a43`) then `git pull` and `alembic upgrade head`.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `DATABASE_URL is not set` | Create `backend/.env` from `.env.example` |
| `alembic upgrade` fails | Postgres running? Password in URL correct? |
| `Connection refused :8001` | Start uvicorn in terminal 1 |
| Admin loads but API errors | Start backend; check proxy needs both 5173 + 8001 |
| `Refusing to start AUTH_MODE=dev` | Set `ENV=development` (not `production`) on local |
| `AUTH_MODE=firebase` startup error | Set valid `FIREBASE_SERVICE_ACCOUNT_PATH` |

---

**Repo copy of this file:** `docs/LOCAL-UBUNTU-DEV-RUN.md`  
**Also see:** `backend/README.md`, `migration-db/ACTIVE-STACK.md`
