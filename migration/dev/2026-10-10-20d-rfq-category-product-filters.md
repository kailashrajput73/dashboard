# Row 20d: RFQ category and product filters

**Planned:** Add the Category and Product RFQ list filters required by the SOW, using already loaded RFQ lines and catalog data.

**Built:** Added Category and Product selectors to the RFQ list. Category options come from loaded catalog items; product options narrow when a category is selected. RFQs match a category through line product codes mapped to catalog items, and match a product through its product code. Existing summary and CSV export use the filtered list.

**Old -> new:** `frontend/app/(admin)/rfqs.tsx` -> `web/src/pages/RfqsPage.tsx`.

**How it works:** No endpoint or backend change was needed. The screen already loads `GET /rfqs`, `GET /partners`, and `GET /catalog`; an in-memory product-code map derives line categories.

**API calls:** No new calls; existing `GET /rfqs`, `GET /partners`, and `GET /catalog`.

**Differences from Expo:** Current Expo does not expose dedicated Category and Product list filters. These selectors implement the requested SOW filters from data already loaded by the screen.

**How to test:** See Row 20d in `migration/PENDING.md`. `npm run build` passed. `npm run lint` exited successfully with five existing warnings in `web/src/utils/csv.ts`.

**Left:** Browser verification with RFQs containing multiple products/categories is pending.