# rfqs

| | |
|---|---|
| **Map ID** | `rfqs` |
| **Route** | `/rfqs` |
| **Source file** | `web/src/pages/RfqsPage.tsx` (663 lines) |
| **SOW** | RFQ §10 |
| **Operator guide** | `migration/admin/rfqs.md` |

## Load / refresh

- **L170** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L22 | `getPartnerMatches` | (see endpoints.ts) | `function getPartnerMatches(partners: Partner[], query: string) {` |
| L28 | `getProductMatches` | (see endpoints.ts) | `function getProductMatches(products: CatalogItem[], query: string) {` |
| L62 | `getFullYear` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L62 | `getMonth` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L62 | `getDate` | (see endpoints.ts) | `if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return n` |
| L63 | `getTime` | (see endpoints.ts) | `return date.getTime();` |
| L162 | `listRfqs` | GET /rfqs | `const fetchData = useCallback(() => Promise.all([listRfqs(), listPartners(), listCatalog()]), []);` |
| L162 | `listPartners` | GET /partners | `const fetchData = useCallback(() => Promise.all([listRfqs(), listPartners(), listCatalog()]), []);` |
| L162 | `listCatalog` | GET /catalog | `const fetchData = useCallback(() => Promise.all([listRfqs(), listPartners(), listCatalog()]), []);` |
| L200 | `getPartnerMatches` | (see endpoints.ts) | `const partnerMatches = useMemo(() => getPartnerMatches(partners, partnerSearch), [partners, partnerS` |
| L201 | `getProductMatches` | (see endpoints.ts) | `const productMatches = useMemo(() => getProductMatches(products, productSearch), [products, productS` |
| L241 | `getTime` | (see endpoints.ts) | `const createdAt = new Date(rfq.createdAt).getTime();` |
| L299 | `createRfq` | POST /rfqs | `await createRfq({ partnerId: partnerId.trim(), lines: [{ productCode, quantity: safeQuantity }], del` |
| L320 | `rfqHistory` | GET /rfqs/{id}/history | `setHistory(await rfqHistory(rfq.id));` |
| L354 | `updateRfq` | PUT /rfqs/{id} | `const updated = await updateRfq(selected.id, { partnerId: selected.partnerId, lines, deliveryMode, s` |
| L370 | `approveRfq` | POST /rfqs/{id}/approve | `await approveRfq(selected.id, {` |
| L394 | `createDispatch` | POST /dispatches | `await createDispatch({` |
| L407 | `updateLineQuantity` | (see endpoints.ts) | `function updateLineQuantity(index: number, value: string) {` |
| L569 | `updateLineQuantity` | (see endpoints.ts) | `{canEditSelected ? <div style={lineActionsStyle}><Input testID={'rfq-line-qty-${index}'} value={line` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L14 | `linesToEditable` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L18 | `editableToApi` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L22 | `getPartnerMatches` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L28 | `getProductMatches` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L34 | `estimatedRewardAfterDiscount` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L38 | `formatHistorySummary` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L53 | `dateBoundary` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L66 | `rfqLineTotal` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L70 | `statusLabel` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L75 | `rfqErrorMessage` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L83 | `csvCell` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L87 | `SummaryCell` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L96 | `RfqsPage` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L168 | `load (useCallback)` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L269 | `partnerTitle` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L273 | `partnerSubtitle` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L279 | `openCreate` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L291 | `saveCreate` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L310 | `openDetails` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L326 | `closeDetails` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L333 | `addScannedLine` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L344 | `saveLineChanges` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L365 | `decide` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L386 | `dispatchSelected` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L407 | `updateLineQuantity` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L411 | `exportCsv` | Open `web/src/pages/RfqsPage.tsx` at this line |
| L614 | `statusColor` | Open `web/src/pages/RfqsPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L451 | `export-rfqs` | `exportCsv` |
| L475 | `rfq-category-filter` | `—` |
| L491 | `rfq-product-filter` | `—` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
