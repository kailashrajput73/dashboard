# Quotation Generator — Mobile App PRD

## What this app is
React Native + Expo (TypeScript) mobile app for the Quotation Generator project. Two-role app:

- **Requester** — registers, browses catalog (with dynamic category chips), builds a live draft quotation, and generates a polished plain-text quotation output.
- **Admin** — registers/logs in with a passcode, manages catalog (add/edit/delete), imports CSV in bulk (with encoding auto-detect + xlsx blocking + category routing), and configures money settings (discount %, GST %, special discount % + visibility toggles).

Role selection persists across app restarts. Session (requester profile / admin token) auto-routes on relaunch.

## Backend contract (mirror ships in this workspace)
- Response envelope: `{ success, data, error }`
- All routes prefixed with `/api`
- Endpoints exactly match the teammate's backend:
  - Auth: `POST /api/auth/requester/register`, `POST /api/auth/admin/register`, `POST /api/auth/admin/login`
  - Categories: `GET /api/categories`, `POST /api/categories`
  - Catalog: `GET /api/catalog?category=`, `POST /api/catalog`, `PUT /api/catalog/:id`, `DELETE /api/catalog/:id`, `POST /api/catalog/import`
  - Money Config: `GET /api/money-config/:adminId`, `PUT /api/money-config/:adminId`
- MongoDB collections mirror teammate's schema (`users`, `catalog`, `categories`, `money_config`) with the exact field names in the spec.

## Point the app at teammate's backend
Single knob: `frontend/src/config/env.ts` — flip `USE_CLOUD_PREVIEW` to `false` and set `LOCAL_BACKEND_URL` to `http://localhost:8000` (emulator) or `http://<laptop-lan-ip>:8000` (physical phone via Expo Go on same WiFi). Everything else stays the same.

## Key features shipped
- **Role selection** onboarding screen with two large image cards, persisted via AsyncStorage
- **Requester registration** with validated Name / Phone / Address form
- **Admin registration + login** with bcrypt passcode; Bearer token auto-attached on subsequent calls
- **Catalog browse** — sticky horizontal category chips (single-line, non-wrapping, flexShrink), FlatList of items with per-unit + rate, add-to-draft with `+` action
- **Quotation draft** — editable Qty + Unit Price per row, live-updating estimation summary (Subtotal, Discount, Special discount, GST, Grand Total)
- **Final quotation output** — monospace plain-text card with header, itemized rows, totals
- **Admin catalog management** — chip filter + FlatList; add/edit dialog with category picker + "➕ Create New Category"; slide-up action modal for Edit / Delete
- **CSV import** — file picker; encoding detection (UTF-8, UTF-8 BOM, UTF-16 LE/BE); `.xlsx`/`.xls` blocked with error modal; category routing modal (`fromCsv` / `overrideExisting` / `overrideNew`); preview table before import; success modal
- **Money config** — discount%, GST%, special discount% + visibility toggles for each; persisted per admin
- **Error modals** — friendly messages for backend unreachable, invalid CSV, login failure, etc.
- **Session persistence** — role, requester profile, admin token all restored on relaunch
- **Trace comments** — `// CONFIG:`, `// TODO (BACKEND):`, `// NOTE (DB):`, `// MANUAL STEP:` throughout so the user can audit / hand off to teammate

## Design language
- Deep Indigo primary (#1E3A8A) on light slate (#F8FAFC), pure white surfaces with 1px borders
- 16px screen padding, 16px card radius, 999px pill chips, Material-style ripples via TouchableOpacity
- SafeArea-aware everywhere, sticky chip row (56pt) never wraps, chips have `flexShrink: 0`
- All interactive/informational elements carry `testID`s

## Test status
Backend: 11/11 pytest tests pass. Frontend: full end-to-end flow verified for both roles including session persistence & sign-out. No blocking issues.
