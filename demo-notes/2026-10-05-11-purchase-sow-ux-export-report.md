# Purchase SOW: admin UX, export, and report

**Date:** 2026-10-05

## Why

Close the remaining Purchase Management gaps in the Expo admin screen: make purchase export work on web, improve recording and bulk-upload feedback, and provide a basic date-filtered purchase report.

## What changed

- Purchase CSV export downloads through a Blob and browser anchor on web; native keeps the data-URL `Linking` path. It exports one row per purchase line with the six `PURCHASE_TEMPLATE_HEADERS` columns first and no extra audit columns.
- The record form searches products by name, product code, or brand. Selecting a product defaults list price from `lastPurchasePrice` when available, otherwise `standardRate`.
- Rack selection displays rack names and offers slots from the selected rack. Rack is optional; selecting a rack requires a slot. No rack still records stock-in.
- Bulk CSV validation reports row-level missing/invalid values and displays backend validation error arrays. Successful imports show an inline success message, not the error modal.
- The UI documents template headers and common aliases: Product Code, List Price, and discount.
- The Purchases screen has optional inclusive date-from/date-to filters on transaction `createdAt`, a filtered transaction/line/quantity/list-value summary, and exports only filtered lines.
- Manual Record purchase remains one line per submission; bulk CSV continues to support multiple lines. No backend code or purchase validation semantics changed. Master/prices/stock import rules were not changed.

## How to verify

1. On Expo web, export purchases and confirm `purchases.csv` downloads with exactly `productCode, quantity, listPrice, purchaseDiscount, rackId, rackSlot` as its header. Set a date range and confirm only matching purchase lines export.
2. Check the report summary against the filtered list: transactions, lines, sum of quantity, and sum of quantity multiplied by list price.
3. Record a purchase by searching for a product, checking the default price, choosing a rack by name and one of its slots, and submitting. Confirm catalog/inventory stock increases. Repeat with no rack to confirm stock-in still works.
4. Upload a valid purchase CSV and confirm an inline success message appears without the error modal. Try missing productCode or invalid quantity/listPrice and confirm a clear validation message appears.
5. Re-import one existing SKU through master with changed discount and stock cells; confirm the existing values remain unchanged.

## Files

- `frontend/app/(admin)/purchases.tsx`
- `frontend/src/api/endpoints.ts`
- `demo-notes/README.md`
- `migration/bug_fix/README.md`