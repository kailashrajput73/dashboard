# categories

| | |
|---|---|
| **Map ID** | `categories` |
| **Route** | `/categories` |
| **Source file** | `web/src/pages/CategoriesPage.tsx` (439 lines) |
| **SOW** | Category §1 |
| **Operator guide** | `migration/admin/categories.md` |

## Load / refresh

- **L52** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L48 | `listCategories` | GET /categories | `() => Promise.all([listCategories(), listCatalog()]),` |
| L48 | `listCatalog` | GET /catalog | `() => Promise.all([listCategories(), listCatalog()]),` |
| L129 | `updateCategory` | PUT /categories/{id} | `await updateCategory(editor.id, {` |
| L135 | `createCategory` | POST /categories | `await createCategory(name.trim(), imageUrl);` |
| L148 | `updateCategory` | PUT /categories/{id} | `await updateCategory(category.id, {` |
| L169 | `deleteCategoryCascade` | POST /categories/{id}/delete-cascade | `const result = await deleteCategoryCascade(deleteTarget.id, credentials);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L31 | `CategoriesPage` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L77 | `load` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L103 | `productsFor` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L109 | `openCreate` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L115 | `openEdit` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L121 | `save` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L146 | `toggle` | Open `web/src/pages/CategoriesPage.tsx` at this line |
| L162 | `confirmDeleteCategory` | Open `web/src/pages/CategoriesPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L193 | `open-add-category` | `openCreate` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
