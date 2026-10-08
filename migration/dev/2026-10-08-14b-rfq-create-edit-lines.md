# Row 14b: RFQ create and edit lines

**Planned:** Port manual RFQ creation and line editing before the request is dispatched or cancelled.

**Built:** Added partner and catalog product search, single-line RFQ creation, and review modal line editing. Staff can scan/type a product code, add a line (or increment an existing line), remove lines, change quantities, and update pickup/delivery mode and schedule.

**Old -> new:** `frontend/app/(admin)/rfqs.tsx` -> `web/src/pages/RfqsPage.tsx`.

**How it works:** Partner/catalog/RFQ lists are loaded through the web API client. Creation sends a partner ID and one selected product line. Editing validates positive quantities and sends the updated line list and delivery details.

**API calls:** `GET /rfqs`, `GET /partners`, `GET /catalog`, `POST /rfqs`, `PUT /rfqs/{id}`.

**Differences from Expo:** React modal and browser controls replace React Native components. The payload fields and validation follow Expo.

**How to test:** Create an RFQ by selecting a partner and product, enter a positive quantity, choose delivery mode and optional schedule, then submit. Open an editable RFQ, change quantities, add a product by code, remove a line, change delivery details, and save. Confirm it refreshes in the list. Run `npm run build` from `web/`.

**Left:** Approval, rejection, history, and transition to dispatch are in row 14c.
