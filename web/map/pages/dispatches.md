# dispatches

| | |
|---|---|
| **Map ID** | `dispatches` |
| **Route** | `/dispatches` |
| **Source file** | `web/src/pages/DispatchesPage.tsx` (364 lines) |
| **SOW** | Dispatch |
| **Operator guide** | `migration/admin/dispatches.md` |

## Screen blocks (Header titles)

- **L256** — `Dispatch & Billing`

## Load / refresh

- **L104** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L23 | `getFullYear` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L23 | `getMonth` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L23 | `getDate` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L24 | `getTime` | (see endpoints.ts) | `return date.getTime();` |
| L39 | `getRfqStockIssues` | (see endpoints.ts) | `function getRfqStockIssues(rfq: Rfq, stockByCode: Map<string, number>) {` |
| L95 | `listDispatches` | GET /dispatches | `const fetchData = useCallback(() => Promise.all([listDispatches(), listCatalog(), listPartners(), li` |
| L95 | `listCatalog` | GET /catalog | `const fetchData = useCallback(() => Promise.all([listDispatches(), listCatalog(), listPartners(), li` |
| L95 | `listPartners` | GET /partners | `const fetchData = useCallback(() => Promise.all([listDispatches(), listCatalog(), listPartners(), li` |
| L95 | `listRfqs` | GET /rfqs | `const fetchData = useCallback(() => Promise.all([listDispatches(), listCatalog(), listPartners(), li` |
| L116 | `getTime` | (see endpoints.ts) | `const createdAt = new Date(dispatch.createdAt).getTime();` |
| L175 | `updateRetailLine` | (see endpoints.ts) | `function updateRetailLine(index: number, value: string) {` |
| L189 | `createDispatch` | POST /dispatches | `await createDispatch({` |
| L206 | `getRfqStockIssues` | (see endpoints.ts) | `const issues = getRfqStockIssues(rfq, stockByCode);` |
| L211 | `createDispatch` | POST /dispatches | `await createDispatch({ sourceRfqId: rfq.id, lines: rfq.lines.map((line) => ({ productCode: line.prod` |
| L309 | `updateRetailLine` | (see endpoints.ts) | `<div style={lineActionsStyle}><Input value={String(line.quantity)} onChangeText={(value) => updateRe` |
| L319 | `getRfqStockIssues` | (see endpoints.ts) | `const issues = getRfqStockIssues(rfq, stockByCode);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L14 | `dateBoundary` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L27 | `dispatchErrorMessage` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L35 | `csvCell` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L39 | `getRfqStockIssues` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L49 | `SummaryCell` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L53 | `DispatchesPage` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L102 | `load (useCallback)` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L138 | `openRetail` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L150 | `selectRetailProduct` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L156 | `addRetailLine` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L175 | `updateRetailLine` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L183 | `dispatchRetail` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L205 | `dispatchRfq` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L222 | `exportCsv` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L236 | `dispatchLabel` | Open `web/src/pages/DispatchesPage.tsx` at this line |
| L245 | `dispatchMeta` | Open `web/src/pages/DispatchesPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L256 | `export-dispatches` | `exportCsv` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
