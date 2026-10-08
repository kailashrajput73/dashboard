# Row 14a: RFQ list, filters, and export

**Planned:** Port the Expo RFQ list, filtering, search, and CSV export to the React app.

**Built:** Added `RfqsPage` and mounted it at `/rfqs`. It loads RFQs and partners, displays status counts and RFQ summary values, and supports status, partner, manager, date, and text filters. CSV export uses the currently filtered RFQs and the Expo 16-column line-level format.

**Old -> new:** `frontend/app/(admin)/rfqs.tsx` -> `web/src/pages/RfqsPage.tsx`; `/rfqs` route updated in `web/src/App.tsx`.

**How it works:** `listRfqs()` and `listPartners()` supply the data. Filters are applied client-side; the export uses the filtered result and the shared CSV download helper.

**API calls:** `GET /rfqs`, `GET /partners`.

**Differences from Expo:** Uses the React UI components and browser CSV download helper. RFQ creation and review/edit/decision actions remain in rows 14b and 14c.

**How to test:** Open RFQs. Check status counts and each status tab; search by partner, phone, RFQ ID, product name, or code; apply partner, sales-manager, and date filters; export and verify the filtered rows and 16 headers. Run `cd web && npm run build`.

**Left:** Create/edit RFQs (14b); approve, reject, history, and dispatch from RFQ review (14c).
