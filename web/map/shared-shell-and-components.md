# Shared shell and components

Use when a control is not in `pages/*.md` or is reused on many screens.

## App routing and session

| Block | File:line | Function | Purpose |
|-------|-----------|----------|---------|
| Route table | `web/src/App.tsx:26-58` | `App` | All URL → page mappings |
| Auth gate | `web/src/components/StartupRedirect.tsx` | `getAdmin()` | `/` → dashboard or login |
| Sidebar layout | `web/src/components/AdminShell.tsx:97-152` | `AdminShell` | 240px nav + `<Outlet />` scroll pane |
| Sign out | `AdminShell.tsx:92-95` | `signOut` → `fullSignOut()` | Clears `session:admin` + token |
| Session storage | `web/src/state/session.ts:9-33` | `saveAdmin`, `getAdmin`, `clearAdmin` | localStorage keys |
| API wrapper | `web/src/api/client.ts:78-142` | `apiRequest` | Bearer token, `{ success, data, error }` envelope |

## `LinkedProducts.tsx` (expandable SKU lists)

| Map ref | File:line | Function | Purpose | API |
|---------|-----------|----------|---------|-----|
| `linked.count-btn` | `LinkedProducts.tsx:12-50` | `CountButton` | Toggle expand; shows “N products” | None |
| `linked.peek-list` | `LinkedProducts.tsx:53-137` | `List` (`ProductPeekList`) | Read-only mini table of products | None |

**Used on:** Categories, Brands, Subcategories, Product types, Product groups, Catalog facet page. **REVIEW** for large catalogs.

## `PasscodeConfirmModal.tsx`

| Map ref | File:line | Purpose | API |
|---------|-----------|---------|-----|
| `passcode.confirm` | `PasscodeConfirmModal.tsx` (whole file) | Collect admin contact + passcode for destructive ops | Passed to caller → usually `*Cascade` or `deleteCatalogItemSecured` or `wipeCatalogAll` |

## `ShelfPriceBoard.tsx`

| Map ref | File:line | Purpose | API |
|---------|-----------|---------|-----|
| `shelf.board` | `web/src/features/shelf-price-board/ShelfPriceBoard.tsx` | Edit MRP/discount per size group on a board | `updateCatalogPricing` / bulk via board actions |

**Flag:** `web/src/features/shelf-price-board/enabled.ts` — `SHELF_PRICE_BOARD_ENABLED`. When false, subcategories/groups show `ProductPeekList` instead.

## `CatalogSpreadsheetImport.tsx`

| Map ref | File | Purpose | API |
|---------|------|---------|-----|
| `import.spreadsheet` | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` | Parse CSV/xlsx, preview, confirm | `importCatalogMaster` / `Pricing` / `Stock` |

Used by all `/import-*` routes via `CatalogImportPage.tsx`.

## CSV download helper

| File:line | Function | Purpose |
|-----------|----------|---------|
| `web/src/utils/download-csv.ts` | `downloadCsv` | Browser Blob download (replaces Expo `Linking`) |
