# Quotation Generator — Mobile App

React Native + Expo (TypeScript) mobile app for the Quotation Generator project.

Two roles:

- **Requester** — registers, browses catalog, builds live quotation, sees final estimation.
- **Admin** — registers/logs in with passcode, manages catalog, imports CSV, configures discount/GST/special discount.

The backend contract is the one used by the teammate's FastAPI + MongoDB service — this app calls the same endpoints so data flows through the same MongoDB collections.

---

## 1) Run locally

```bash
cd frontend
yarn install
yarn start          # then press `a` for Android, `i` for iOS, or scan QR in Expo Go
```

The frontend is served by Metro on the Emergent preview URL, so you can just open the preview.

## 2) Pointing the app at the correct backend

The single knob is `frontend/src/config/env.ts`:

```ts
const USE_CLOUD_PREVIEW = true;               // flip to false for local
const LOCAL_BACKEND_URL = "http://localhost:8000"; // change to LAN IP for phone
```

- **Cloud preview (default)** → talks to the mirror backend in this workspace
  (same contract, same schema).
- **Your laptop, emulator** → set `USE_CLOUD_PREVIEW = false`.
  `LOCAL_BACKEND_URL` stays `http://localhost:8000`.
- **Your laptop, physical phone via Expo Go on same WiFi** → set
  `LOCAL_BACKEND_URL` to `http://<laptop-lan-ip>:8000`
  (macOS: `ipconfig getifaddr en0`; Windows: `ipconfig`).
- **Deployed URL later** → point `LOCAL_BACKEND_URL` (with `USE_CLOUD_PREVIEW=false`)
  or set `EXPO_PUBLIC_BACKEND_URL` in `.env` to the production domain.

If the backend is unreachable you will see a friendly modal:
> Backend not running — please start the FastAPI server (uvicorn server:app --host 0.0.0.0 --port 8000).

---

## 3) API endpoints the app depends on

All prefixed with `/api`. Response envelope: `{ success, data, error }`.

**Auth**
- `POST /api/auth/requester/register` — `{ name, phone, address }`
- `POST /api/auth/admin/register` — `{ companyName, gstin, contactNumber, passcode }`
- `POST /api/auth/admin/login` — `{ contactNumber, passcode }` → `{ token }`

**Categories**
- `GET /api/categories`
- `POST /api/categories` — `{ name }`

**Catalog**
- `GET /api/catalog?category=<optional>`
- `POST /api/catalog` — `{ name, category, unit, standardRate }`
- `PUT /api/catalog/:id`
- `DELETE /api/catalog/:id`
- `POST /api/catalog/import` — `{ items: [...], categoryMode, overrideCategory }`

**Money config**
- `GET /api/money-config/:adminId`
- `PUT /api/money-config/:adminId`

MongoDB collections (mirror teammate's schema):
- `users { _id, role, name, phone, address, companyName, gstin, contactNumber, passcodeHash, createdAt }`
- `catalog { _id, name, category, unit, standardRate, createdAt, updatedAt }`
- `categories { _id, name, isDefault }`
- `money_config { _id, adminId, discountPercent, gstPercent, specialDiscountPercent, showDiscount, showGst, showSpecialDiscount }`

---

## 4) Code map (where to look)

```
frontend/
  src/
    config/env.ts        # API base URL config + comments
    api/
      client.ts          # fetch wrapper, error handling, admin bearer token
      endpoints.ts       # every API call with // NOTE (DB): trace comments
    components/UI.tsx    # Button, Card, Chip, Input, AppModal, ErrorModal, Header, EmptyState
    state/
      session.ts         # role/requester/admin persisted via AsyncStorage
      draft.ts           # quotation draft store + totals calculator
    utils/
      csv.ts             # CSV parse, encoding detection, xlsx blocking
      storage/           # pre-shipped storage util (do not replace)
  app/
    index.tsx            # bootstrap → decides landing route
    role-selection.tsx   # onboarding
    (requester)/
      register.tsx
      catalog.tsx
      draft.tsx
      output.tsx
    (admin)/
      register.tsx
      login.tsx
      dashboard.tsx
      catalog.tsx
      csv-import.tsx
      money-config.tsx
```

Search the codebase for these comment prefixes:

- `// CONFIG:` — where to change the backend URL.
- `// TODO (BACKEND):` — behaviors the teammate's backend must implement.
- `// NOTE (DB):` — the exact MongoDB collection/fields each call touches.
- `// MANUAL STEP:` — one-time actions you may need to run.

---

## 5) Troubleshooting

- **"Backend not running"** — start the FastAPI server locally
  (`uvicorn server:app --host 0.0.0.0 --port 8000`) and make sure the URL in
  `src/config/env.ts` matches.
- **Phone can't reach laptop** — use LAN IP, not `localhost`; laptop + phone
  must be on the same WiFi; disable laptop firewall or allow port 8000.
- **CORS error** — teammate's backend must allow the mobile origin
  (`allow_origins=["*"]` is easiest for local dev).
- **Categories empty** — the mirror backend seeds `General, Materials, Labor,
  Services, Equipment` on first `GET /api/categories`. If using teammate's
  backend, ensure at least one category exists (or add via `POST /api/categories`).
- **CSV rejected** — the app blocks `.xlsx` and `.xls` binaries. Export to CSV
  first. Headers required: `name`, `unit`, `standardRate` (aka `rate`);
  `category` is optional.

## 6) Preview backend (this workspace)

A **mirror FastAPI backend** ships in `/app/backend/server.py`. It implements
the same contract and schema so the preview works end-to-end without needing
the teammate's laptop. Data lives in the workspace MongoDB. When you switch
`API_BASE_URL` to the teammate's backend, this mirror is bypassed.
