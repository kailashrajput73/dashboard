# Temporary: public catalog browse (mobile demo, no token)

**Purpose:** Tonight’s meeting — mobile app can **read** the full shop hierarchy (categories, types, subcategories, catalog, tree, brands) **without** admin token, partner token, or Firebase.

**Not in scope:** Firebase, partner login, RFQ submit, guest limits (10 products), new routes, mobile app repo changes (unless app sends a bad Bearer header).

**After demo:** Revert these edits (or replace with env-flag + proper guest/partner rules). **No PR required** for this temp pass if you prefer manual deploy + undo.

---

## Rule in one sentence

Remove the **`CatalogRead` / admin dependency** from **GET browse handlers only**. Every **POST / PUT / PATCH / DELETE** on catalog and taxonomy stays **`CatalogWrite` / `CatalogRead` as today** — dashboard login and imports unchanged.

---

## Routes opened (no `Authorization` header)

| # | Method | Path | Used for |
|---|--------|------|----------|
| 1 | GET | `/api/categories` | Home / all categories (`active_only=true`) |
| 2 | GET | `/api/catalog` | Product list, filters, poll |
| 3 | GET | `/api/catalog/tree` | Category + type tiles (UPVC / CPVC / PVC) |
| 4 | GET | `/api/subcategories` | Sidebar subcats (`category_id=`) |
| 5 | GET | `/api/brands` | Brand on product page |
| 6 | GET | `/api/product-types` | Type list if app calls it |
| 7 | GET | `/api/product-groups` | Groups if app uses them |
| 8 | GET | `/api/catalog/filter-options` | Filter dropdowns if app uses them |
| 9 | GET | `/api/media/proxy` | **Already public** — no file change |

**Expected response:** Same as today when admin calls with token: `{ "success": true, "data": ..., "error": null }`.

**Still require admin (or partner where already defined):**

- All catalog/taxonomy **writes** and **imports**
- `/api/dashboard/*`, `/api/purchases`, `/api/rfqs`, `/api/partners`, `/api/team/*`, `/api/auth/admin/*`, etc.
- `GET /api/catalog/import/pipes-fittings/images/template` — stays admin/write (do **not** open)

---

## Files to change (7 handlers + 0 new files)

Only **delete one parameter line** (or the `_admin` argument) per handler below. **Do not** change `return service....` lines.

### 1. `backend/app/routers/taxonomy.py`

| Lines | Handler | Change |
|-------|---------|--------|
| **31** | `list_categories` | Remove the whole line: `_admin: CatalogRead,` |
| **84** | `list_brands` | Change signature from `def list_brands(session: DbSession, _admin: CatalogRead):` to `def list_brands(session: DbSession):` |
| **124** | `list_product_types` | Remove the whole line: `_admin: CatalogRead,` |

**Leave unchanged:** lines 37–80, 88–118, 130–146 (all POST/PUT/DELETE still use `CatalogWrite`).

---

### 2. `backend/app/routers/catalog.py`

| Lines | Handler | Change |
|-------|---------|--------|
| **45** | `list_catalog` | Remove: `_admin: CatalogRead,` |
| **79** | `catalog_filter_options` | Remove: `_admin: AdminPrincipal,` (today this name is **undefined** — opening browse also avoids admin-only on this GET) |
| **93** | `get_catalog_tree` | Remove: `_admin: CatalogRead,` |

**Leave unchanged:** lines 99–303 except the three rows above — all mutations/imports keep `CatalogWrite` (and lines 128–136, 260–266 keep admin/write gates).

**Do not touch in this pass:**

- Line 133 `_admin: AdminPrincipal` on `update_catalog_active`
- Lines 263–266 `pipes_fittings_images_template` + `_require_catalog_write`

(Those are admin-only; fixing `AdminPrincipal` / `_require_catalog_write` imports is a **separate** bugfix if dashboard hits those routes.)

---

### 3. `backend/app/routers/subcategories.py`

| Lines | Handler | Change |
|-------|---------|--------|
| **28** | `list_subcategories` | Remove: `_admin: CatalogRead,` |

**Leave unchanged:** lines 34–86 (POST/PUT/DELETE/import).

---

### 4. `backend/app/routers/product_groups.py`

| Lines | Handler | Change |
|-------|---------|--------|
| **23** | `list_product_groups` | Remove: `_admin: CatalogRead,` |

**Leave unchanged:** lines 28+ (create/update/delete).

---

### 5. `backend/app/routers/media_proxy.py`

**No change** — `GET /api/media/proxy` has no auth dependency (lines 12–14).

---

## What we deliberately do **not** change

| Area | Why |
|------|-----|
| `backend/app/deps/auth.py` | Admin/partner token logic stays |
| `backend/app/deps/module_access.py` | Staff “hidden product-management” still blocks **writes** |
| `backend/app/routers/auth.py` | Admin/partner login unchanged |
| `backend/app/routers/partner_app.py` | Firebase `/api/app/*` unchanged |
| `backend/app/services/*` | No business logic change — same data, same filters |
| `backend/app/main.py` | CORS unchanged |
| Web `web/src/api/client.ts` | Still sends admin token when logged in — **still works** (public GET + Bearer both OK) |

---

## Dashboard “still works start to end” checklist

After deploy + API restart, verify **with admin login** (web):

1. Login / register admin  
2. **Categories** — list, create, edit, photo  
3. **Subcategories** — list, create  
4. **Catalog** — list, edit product, pricing row  
5. **Import** — pipes-fittings master (or small test row)  
6. **Settings / wipe** — only if you use them (still passcode + admin)

Verify **without token** (curl or mobile):

```bash
curl -s "https://YOUR_HOST/api/categories?active_only=true"
curl -s "https://YOUR_HOST/api/catalog/tree?active_only=true"
curl -s "https://YOUR_HOST/api/catalog?category=PIPES+%26+FITTING"
```

Expect **200** and `"success": true`, not **401** `"Missing admin token"`.

Verify **writes still blocked** without token:

```bash
curl -s -X POST "https://YOUR_HOST/api/categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hack"}'
```

Expect **401** (or 403), not 200.

---

## Mobile app (no backend doc change required)

| Check | Action |
|-------|--------|
| Browse calls send **no** Bearer, or ignore 401 | Prefer **no** `Authorization` on the five GETs in your table |
| App forces login before home | Skip login for demo **or** login still OK — public reads work either way |
| Empty UI after 200 | **Data**: inactive products, wrong category string — not auth |

---

## Tests (only when you say **go** — expect updates)

These tests **currently assert 401 without token**; after the change they should expect **200** (or use DB fixture):

| File | Approx lines | Test |
|------|--------------|------|
| `backend/tests/test_auth_taxonomy_api.py` | 83–92 | Unauthenticated `GET /api/categories` |
| `backend/tests/test_catalog_api.py` | 278–280 | Unauthenticated `GET /api/catalog` |
| `backend/tests/test_module_access_api.py` | 18–25 | Staff with hidden module on `GET /api/catalog` → today 403; after change **200** (public read bypasses module) |

**Dashboard CI:** Update assertions or mark temp skip — your choice when implementing.

---

## Undo (no git required)

1. Re-add the removed `_admin: CatalogRead,` (and `AdminPrincipal` on filter-options) on the **same line numbers** in the four router files.  
2. Restart API process.  
3. Unauthenticated `GET /api/categories` should return **401** again.

Keep a copy of this doc or a `git diff` locally before editing if you want one-command revert later.

---

## Security (meeting-only)

While this is live, anyone who knows the API base URL can read **full catalog, prices, stock**. Acceptable for internal demo; **revert or add env flag** before long-term public VPS exposure.

---

## Optional later (not tonight)

- Env `CATALOG_BROWSE_PUBLIC=true` wired in a small dependency helper instead of deleting parameters (easier toggle).  
- Proper model: public GET + partner token for RFQ + Firebase session.  
- Guest cap (10 products) in app or query param — product rule, not auth.

---

## Implementation order when you say **go**

1. Edit four router files (sections above).  
2. Restart backend on VPS.  
3. Curl smoke (no token) + web admin smoke (with token).  
4. Mobile app on same `EXPO_PUBLIC_BACKEND_URL` / API base.  
5. (Optional) Fix test assertions.

**Say `go` to apply these edits in the repo.** Until then: **documentation only**, no PR, no git commands from agent unless you ask.
