# product-groups

| | |
|---|---|
| **Map ID** | `product-groups` |
| **Route** | `/product-groups` |
| **Source file** | `web/src/pages/ProductGroupsPage.tsx` (485 lines) |
| **SOW** | Product group §5 |
| **Operator guide** | `migration/admin/product-groups.md` |

## Load / refresh

- **L65** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L51 | `listProductGroups` | GET /product-groups | `listProductGroups(),` |
| L52 | `listCatalog` | GET /catalog | `listCatalog(),` |
| L67 | `listProductGroups` | GET /product-groups | `void Promise.all([listProductGroups(), listCatalog()])` |
| L67 | `listCatalog` | GET /catalog | `void Promise.all([listProductGroups(), listCatalog()])` |
| L138 | `updateProductGroup` | PUT /product-groups/{id} | `await updateProductGroup(editor.id, {` |
| L143 | `createProductGroup` | POST /product-groups | `await createProductGroup({ name: name.trim(), productIds: selected });` |
| L165 | `deleteProductGroupCascade` | POST /product-groups/{id}/delete-cascade | `const result = await deleteProductGroupCascade(` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L32 | `ProductGroupsPage` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L48 | `load (useCallback)` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L107 | `productsFor` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L116 | `openCreate` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L123 | `openEdit` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L130 | `save` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L158 | `confirmDeleteGroup` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L183 | `toggleProduct` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |
| L459 | `checkboxStyle` | Open `web/src/pages/ProductGroupsPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L200 | `open-add-product-group` | `openCreate` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
