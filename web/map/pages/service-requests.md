# service-requests

| | |
|---|---|
| **Map ID** | `service-requests` |
| **Route** | `/service-requests` |
| **Source file** | `web/src/pages/ServiceRequestsPage.tsx` (204 lines) |
| **SOW** | Plumber/electrician §11 |
| **Operator guide** | `migration/admin/service-requests.md` |

## Screen blocks (Header titles)

- **L132** — `Service requests`

## Load / refresh

- **L65** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L26 | `getTime` | (see endpoints.ts) | `return Number.isNaN(date.getTime()) ? value : date.toLocaleString();` |
| L60 | `listServiceRequests` | GET /service-requests | `const next = await listServiceRequests();` |
| L67 | `listServiceRequests` | GET /service-requests | `void listServiceRequests()` |
| L98 | `updateForm` | (see endpoints.ts) | `function updateForm(updater: (current: LifecycleForm) => LifecycleForm) {` |
| L112 | `updateServiceRequest` | PATCH /service-requests/{id} | `await updateServiceRequest(selectedRequest.id, {` |
| L160 | `updateForm` | (see endpoints.ts) | `<div style={filtersStyle}>{(["pending", "in_progress", "completed", "cancelled"] as const).map((opti` |
| L161 | `updateForm` | (see endpoints.ts) | `<Input testID="service-request-recommended-name" label="Recommended person" value={form.recommendedN` |
| L162 | `updateForm` | (see endpoints.ts) | `<Input testID="service-request-recommended-phone" label="Recommended person's phone" value={form.rec` |
| L163 | `updateForm` | (see endpoints.ts) | `<Input testID="service-request-admin-note" label="Admin note" value={form.adminNote} onChangeText={(` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L15 | `statusLabel` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L23 | `formatAt` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L29 | `requestErrorMessage` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L37 | `formFromRequest` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L46 | `ServiceRequestsPage` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L59 | `load (useCallback)` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L98 | `updateForm` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |
| L106 | `saveSelected` | Open `web/src/pages/ServiceRequestsPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
