# inventory

| | |
|---|---|
| **Map ID** | `inventory` |
| **Route** | `/inventory` |
| **Source file** | `web/src/pages/InventoryPage.tsx` (354 lines) |
| **SOW** | Stock §8 |
| **Operator guide** | `migration/admin/inventory.md` |

## Load / refresh

- **L86** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L28 | `getFullYear` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L28 | `getMonth` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L28 | `getDate` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L29 | `getTime` | (see endpoints.ts) | `return date.getTime();` |
| L75 | `listInventory` | GET /inventory | `listInventory(),` |
| L76 | `listLowStock` | GET /inventory/low-stock | `listLowStock(),` |
| L77 | `listInventoryTransactions` | GET /inventory/transactions | `listInventoryTransactions(),` |
| L130 | `getTime` | (see endpoints.ts) | `const at = new Date(item.at).getTime();` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L19 | `dateBoundary` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L32 | `inventoryErrorMessage` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L40 | `movementReferenceLabel` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L48 | `csvCell` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L52 | `SummaryCell` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L61 | `InventoryPage` | Open `web/src/pages/InventoryPage.tsx` at this line |
| L163 | `exportCsv` | Open `web/src/pages/InventoryPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L227 | `export-inventory` | `exportCsv` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
