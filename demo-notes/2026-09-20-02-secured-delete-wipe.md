# Secured delete & catalog wipe (commit `8ecc5b2`)

**Date:** 2026-09-20  
**Why:** Cleaning bad test data (old categories, full catalog mistakes) without one-click accidents.

## What you can demo

1. **PasscodeConfirmModal** — destructive actions ask for **admin contact number + passcode** (same as login).

2. **Cascade delete** (category, brand, subcategory, product group) — removes linked products in that slice.

3. **Catalog** — secured single-product delete; taxonomy pages can **purge products by type/class** (passcode).

4. **Settings → Wipe entire catalog** — nuclear reset with passcode (`POST /api/catalog/wipe-all`). **Demo only**; remove or hide before production.

## Backend routes

- `POST /api/categories/{id}/delete-cascade`
- `POST /api/brands/{id}/delete-cascade`
- `POST /api/subcategories/{id}/delete-cascade`
- `POST /api/product-groups/{id}/delete-cascade`
- `POST /api/catalog/{id}/delete-secured`
- `POST /api/catalog/purge-by-field`
- `POST /api/catalog/wipe-all`

## Demo caution

- Wipe and cascade deletes are **irreversible** on Mongo (Atlas or local).
- Use a test database or demo tenant when showing wipe to client.

## Files touched

`PasscodeConfirmModal.tsx`, `settings.tsx`, taxonomy/catalog screens, `frontend/src/api/endpoints.ts`, `backend/server.py`.
