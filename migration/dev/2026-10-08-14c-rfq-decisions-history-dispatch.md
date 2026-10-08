# Row 14c: RFQ decisions, history, and dispatch

**Planned:** Port RFQ approve/reject actions, history, and transition of approved RFQs to dispatch.

**Built:** Added pending approval/rejection with special discount input and reward estimate, event history in the review modal, and dispatch for approved RFQs. Dispatch is disabled while any line is absent from catalog or exceeds available stock.

**Old -> new:** `frontend/app/(admin)/rfqs.tsx` -> `web/src/pages/RfqsPage.tsx`.

**How it works:** History loads when a request is opened. Approval calls the Expo approval endpoint with the discount, rewardPoints value, and delivery details. Dispatch sends the approved RFQ ID and its product lines to the existing dispatch endpoint, then refreshes the list.

**API calls:** `GET /rfqs/{id}/history`, `POST /rfqs/{id}/approve`, `POST /dispatches`, plus the list refresh calls from row 14b.

**Differences from Expo:** Uses React modals and the web API wrapper; review actions and stock checks follow the Expo behavior.

**How to test:** Open a pending RFQ, inspect history, enter a discount, and approve or reject. Open an approved RFQ with adequate stock and dispatch it; verify status and stock change. Also verify dispatch is disabled for an absent product or insufficient stock. Run `npm run build` from `web/`.

**Caution:** Approval/rejection changes the request state. Dispatch reduces stock and marks the RFQ dispatched; the Expo workflow does not allow further edits after dispatch.
