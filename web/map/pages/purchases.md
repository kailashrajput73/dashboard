# purchases

| | |
|---|---|
| **Map ID** | `purchases` |
| **Route** | `/purchases` |
| **Source file** | `web/src/pages/PurchasesPage.tsx` (494 lines) |
| **SOW** | Purchase §7 |
| **Operator guide** | `migration/admin/purchases.md` |

## Load / refresh

- **L138** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L30 | `getFullYear` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L30 | `getMonth` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L30 | `getDate` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L31 | `getTime` | (see endpoints.ts) | `return date.getTime();` |
| L98 | `getTime` | (see endpoints.ts) | `const createdAt = new Date(purchase.createdAt).getTime();` |
| L115 | `listCatalog` | GET /catalog | `listCatalog(),` |
| L116 | `listRacks` | GET /racks | `listRacks(),` |
| L117 | `listPurchases` | GET /purchases | `listPurchases(),` |
| L207 | `createPurchase` | POST /purchases | `await createPurchase([{` |
| L250 | `getValue` | (see endpoints.ts) | `const code = getValue(row, "productCode", "product code");` |
| L251 | `getValue` | (see endpoints.ts) | `const quantityText = getValue(row, "quantity");` |
| L252 | `getValue` | (see endpoints.ts) | `const priceText = getValue(row, "listPrice", "list price");` |
| L253 | `getValue` | (see endpoints.ts) | `const discountText = getValue(row, "purchaseDiscount", "discount");` |
| L254 | `getValue` | (see endpoints.ts) | `const rack = getValue(row, "rackId", "rack id");` |
| L255 | `getValue` | (see endpoints.ts) | `const slot = getValue(row, "rackSlot", "rack slot");` |
| L299 | `createPurchase` | POST /purchases | `await createPurchase(lines);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L21 | `dateBoundary` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L34 | `purchaseErrorMessage` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L54 | `PurchasesPage` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L130 | `load (useCallback)` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L155 | `openCreate` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L168 | `selectProduct` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L175 | `selectRack` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L180 | `save` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L224 | `onBulkFileChange` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L230 | `bulkUpload` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L309 | `exportPurchasesCsv` | Open `web/src/pages/PurchasesPage.tsx` at this line |
| L479 | `productOptionStyle` | Open `web/src/pages/PurchasesPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L333 | `export-purchases` | `exportPurchasesCsv` |
| L341 | `open-add-purchase` | `openCreate` |
| L362 | `purchase-report-summary` | `—` |
| L366 | `purchase-success` | `—` |
| L396 | `purchase-csv-file` | `() => downloadImportTemplate("purchase")` |
| L430 | `purchase-rack-picker` | `—` |
| L437 | `purchase-slot-picker` | `—` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
