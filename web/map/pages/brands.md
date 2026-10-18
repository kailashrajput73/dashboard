# brands

| | |
|---|---|
| **Map ID** | `brands` |
| **Route** | `/brands` |
| **Source file** | `web/src/pages/BrandsPage.tsx` (496 lines) |
| **SOW** | Brand §3 |
| **Operator guide** | `migration/admin/brands.md` |

## Load / refresh

- **L64** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L48 | `listBrands` | GET /brands | `() => Promise.all([listBrands(), listCatalog()]),` |
| L48 | `listCatalog` | GET /catalog | `() => Promise.all([listBrands(), listCatalog()]),` |
| L131 | `updateBrand` | PUT /brands/{id} | `await updateBrand(editor.id, {` |
| L137 | `createBrand` | POST /brands | `await createBrand(name.trim(), logoUrl);` |
| L152 | `updateBrand` | PUT /brands/{id} | `await updateBrand(brand.id, {` |
| L173 | `deleteBrandCascade` | POST /brands/{id}/delete-cascade | `const result = await deleteBrandCascade(deleteTarget.id, credentials);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L31 | `BrandsPage` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L52 | `load (useCallback)` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L102 | `productsFor` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L111 | `openCreate` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L117 | `openEdit` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L123 | `save` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L150 | `toggle` | Open `web/src/pages/BrandsPage.tsx` at this line |
| L166 | `confirmDeleteBrand` | Open `web/src/pages/BrandsPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L197 | `open-add-brand` | `openCreate` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
