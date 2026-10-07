# Dispatch SOW: filtered export, retail billing UX, and RFQ dispatch polish

**Date:** 2026-10-06

## Why

Close the Expo admin dispatch gaps called out in the SOW: admin users need a working filtered history view, a real retail billing cart, a reliable web export of only the current dispatch rows, and a safer RFQ-to-dispatch flow that still uses the existing server contract.

## What changed

- The Dispatch screen now applies the same pattern as the purchase/RFQ report screens: optional date range filtering, a search field, and a `All / Retail / RFQ-linked` chip switcher.
- The report summary above the list updates to the active filtered results, including dispatch count, line count, total quantity, and total dispatch value.
- CSV export emits one row per dispatch line, includes a UTF-8 BOM for Excel-safe CSVs, and downloads only the filtered dispatch result set.
- The retail modal now uses a searchable product picker plus code field rather than a scan-only flow, supports a multi-line cart, and blocks dispatch when any line exceeds available stock.
- The approved-RFQ modal now shows partner name/phone and a stock check before dispatch; it disables the button when catalog stock is insufficient and refreshes the approved list after a successful dispatch.
- Dispatch rows can expand to reveal all item lines, customer metadata, RFQ linkage, and the line total for the transaction, while RFQ-linked rows label themselves as `RFQ · {short id}` when known.
- Error handling is aligned with the RFQ pattern: API `errors[]` payloads are parsed into readable messages, and the screen keeps success messages inline rather than using the Error modal for successful operations.
- The existing `POST /dispatches` contract remains unchanged; the retail billing flow and RFQ dispatch flow still use the same server endpoint and stock-deduction semantics.

## Owner testing

**2026-10-06:** Dispatch shipped toward GitHub; **owner has not smoke-tested yet** (same as Partner/RFQ/Purchase). Run the Dispatch section in `migration/bug_fix/OWNER-SIGNOFF.md` in one end-to-end session before demo.

## How to verify

1. Open the admin Dispatch screen and apply a date range, search, and the `All / Retail / RFQ-linked` switch. Confirm the visible list and summary update together.
2. Export on web while a filter is active. Confirm the downloaded CSV has one row per dispatch line and only includes the filtered rows that are currently visible.
3. Open the retail billing modal, search for two products, add both to the cart, and dispatch once. Confirm the order succeeds and stock decreases for both products in the catalog.
4. Open an approved RFQ from the Dispatch screen and confirm the modal shows partner name/phone plus a stock check before enabling Dispatch.
5. Dispatch the same RFQ from both the RFQ detail screen and the Dispatch screen. Confirm the RFQ moves to `dispatched`, disappears from the approved list, and stock is reduced.
6. Expand a dispatch row and confirm it shows all lines, customer fields, RFQ linkage, and the total value without duplicating RFQ editing flows.

## Files

- `frontend/app/(admin)/dispatches.tsx`
- `demo-notes/README.md`
- `migration/bug_fix/OWNER-SIGNOFF.md`
