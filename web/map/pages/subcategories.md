# subcategories

| | |
|---|---|
| **Map ID** | `subcategories` |
| **Route** | `/subcategories` |
| **Source file** | `web/src/pages/SubcategoriesPage.tsx` (610 lines) |
| **SOW** | Subcategory §2 |
| **Operator guide** | `migration/admin/subcategories.md` |

## Control registry (file → line → function → result)

| Map ref | Block | File:line | Function | Purpose | API / result |
|---------|-------|-----------|----------|---------|--------------|
| `subcat.load` | Page open | `SubcategoriesPage.tsx:79-103` | `useEffect` → `fetchData` | Categories + subcategories + **full catalog** (for counts/boards) | GET `/categories`, `/subcategories`, `/catalog` |
| `subcat.export` | Header **L284** | `exportCsv` L208+ | Template/export CSV | Client download |
| `subcat.import` | **L274** | `importCsv` L220+ | Bulk subcategory rows | POST `/subcategories/import` → `load()` |
| `subcat.create-save` | Modal **L459-464** | `save` L158+ | Create/edit subcategory | POST/PUT `/subcategories` |
| `subcat.delete` | **L387** | `confirmDeleteSubcategory` L184+ | Cascade delete subcategory + products | POST `/subcategories/{id}/delete-cascade` |
| `subcat.expand` | **L365-370** | `ProductCountButton` → `setOpenId` | Expand row | — |
| `subcat.shelf-board` | **L396-404** | `ShelfPriceBoard` | Price edit by product group (if flag on) | PATCH pricing via board → `onSaved` → `load()` |
| `subcat.peek-fallback` | **L406-409** | `ProductPeekList` | Ungrouped SKU list when board off or empty | **REVIEW at scale** |
| `subcat.batch-import-footer` | **L420-428** | `admin-pane-footer` Button | Navigate to batch master import | Route `/import-products-batch` only |

## Load / refresh

- **L79** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L57 | `listCategories` | GET /categories | `listCategories(),` |
| L58 | `listSubcategories` | GET /subcategories | `listSubcategories(),` |
| L59 | `listCatalog` | GET /catalog | `listCatalog(),` |
| L166 | `updateSubcategory` | PUT /subcategories/{id} | `await updateSubcategory(editor.id, {` |
| L171 | `createSubcategory` | POST /subcategories | `await createSubcategory({ name: name.trim(), categoryId });` |
| L191 | `deleteSubcategoryCascade` | POST /subcategories/{id}/delete-cascade | `const result = await deleteSubcategoryCascade(deleteTarget.id, credentials);` |
| L220 | `importCsv` | (see endpoints.ts) | `async function importCsv(file: File) {` |
| L238 | `importSubcategories` | POST /subcategories/import | `const result = await importSubcategories(payload);` |
| L251 | `importCsv` | (see endpoints.ts) | `if (file) void importCsv(file);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L35 | `SubcategoriesPage` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L64 | `load (useCallback)` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L115 | `productsFor` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L131 | `boardsFor` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L142 | `openCreate` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L152 | `openEdit` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L158 | `save` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L184 | `confirmDeleteSubcategory` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L208 | `exportCsv` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L220 | `importCsv` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L248 | `onImportFileChange` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |
| L513 | `csvCell` | Open `web/src/pages/SubcategoriesPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L264 | `download-subcategory-template` | `() => downloadCsv("\uFEFFname,category\n", "subcategories-template.csv")` |
| L274 | `import-subcategories` | `() => importInput.current?.click()` |
| L284 | `export-subcategories` | `exportCsv` |
| L294 | `open-add-subcategory` | `openCreate` |
| L309 | `subcategory-csv-input` | `—` |
| L448 | `subcategory-parent-picker` | `() => setPickerOpen(true)` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
