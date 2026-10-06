# RFQ SOW: admin filter, export, and detail gap closeout

**Date:** 2026-10-06

## Why

Close the Expo admin RFQ gaps called out in the SOW: admin users need to filter the current RFQ list correctly, export only the active filtered view, create RFQs from searchable partner/product data, and review pending approvals without leaving the existing detail flow.

## What changed

- RFQ list now combines `status`, `search`, `partner`, `sales manager`, and `date range` filters instead of relying on a single raw list.
- `Report summary` updates to show the filtered RFQ count, line count, total quantity, and total value for the current view.
- CSV export downloads on web and includes only the currently filtered RFQs/lines; the file is created with a UTF-8 BOM for cleaner Excel import.
- The create-RFQ modal uses searchable partner and catalog-product lookup so the admin picks a real partner and product instead of entering raw IDs manually.
- Pending RFQs show an estimated reward value after a special-discount override before approval.
- RFQ detail keeps the existing approve/reject/dispatch flow intact; dispatch remains on the RFQ detail screen and does not rebuild a separate dispatch screen.
- History rendering normalizes event payloads so approvals, edits, and other actions show a readable summary instead of raw payload dumps.
- The mobile `POST /rfqs` contract remains unchanged; this is admin-only UX and filtering work and does not alter the partner app API.

## Owner testing

**2026-10-06:** RFQ code committed toward GitHub; **owner has not run this checklist yet.** Same policy as Partner/Purchase — verify in one session via `migration/bug_fix/OWNER-SIGNOFF.md` (RFQ section).

## How to verify

1. Open the admin RFQ list and apply a status chip plus a partner filter plus a manager filter plus a date range. Confirm the list narrows to only the matching RFQs.
2. Search by partner name, phone, or product code and confirm search combines with the above filters rather than replacing them.
3. Export on web with one or more filters active. Confirm the downloaded CSV contains only the visible filtered rows and that Excel opens the file cleanly.
4. Create an RFQ from the modal using a partner search and a product search; confirm the RFQ appears in the correct filtered list and status bucket.
5. Open a pending RFQ, edit the line quantities, apply a discount, approve it, and confirm the approval history summary reads cleanly.
6. Open an approved RFQ and dispatch it from the RFQ detail. Confirm the existing dispatch path still works without rebuilding the separate Dispatch screen.

## Files

- `frontend/app/(admin)/rfqs.tsx`
- `demo-notes/README.md`
- `migration/bug_fix/OWNER-SIGNOFF.md`
- `docs/PARTNER-API.md`
