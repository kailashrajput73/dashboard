# SCR-29: Service requests

**Planned:** Port the Expo admin screen for plumber and electrician requests.

**Built:** Added a searchable, status-filtered and service-type-filtered list with request details, lifecycle status editing, recommended person name/phone, admin note, and request history. The page is registered at `/service-requests`.

**Old -> new:** `frontend/app/(admin)/service-requests.tsx` -> `web/src/pages/ServiceRequestsPage.tsx`; route in `web/src/App.tsx`; typed API additions in `web/src/api/endpoints.ts`.

**How it works:** `listServiceRequests()` loads requests with embedded history. Selecting a request hydrates the edit form. Save sends the current status, trimmed recommendation fields and admin note, `actor: "admin"`, and the review note through `updateServiceRequest()`.

**API calls:** `GET /service-requests`, `PATCH /service-requests/{id}`.

**Differences from Expo:** Uses responsive web list/detail layout and React form controls. Request fields, status values, update body, and embedded history follow Expo. The sidebar link is added in the separately requested menu-fix row.

**How to test:** Open `/service-requests` directly until the menu row is built. Search by customer, phone, service type, description, city, or area; filter by status and plumber/electrician; select a request; update lifecycle and recommendation fields, add an admin note, save, and verify refreshed history. Run `npm run build` from `web/`.

**Left:** Add Service requests to the web sidebar in the menu-fix row.
