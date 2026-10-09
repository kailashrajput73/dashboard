# Backend facts supplement

> Authoritative for migration when this file disagrees with `docs/BACKEND_INVENTORY.md` on listed items; baseline inventory is unchanged for merge safety.

This supplement records the post-baseline service-request routes, collection, and index facts observed in `backend_refactor/`. The baseline inventory remains read-only and unchanged.

## Post-baseline counts

- Service-request routes: 5.
- Total API routes: 81.
- MongoDB collections: 19.
- `ensure_indexes` definitions in `backend_refactor/utils.py`: 57.

## COL-19 — `service_requests`

Observed in `backend_refactor/utils.py`, `backend_refactor/services/service_requests_service.py`, and `backend_refactor/routers/service_requests.py`. Local document count: unknown.

| Field | Code-derived shape / behavior |
|---|---|
| `id` | String returned by `new_id()`; assigned on create. |
| `serviceType` | Required string; accepted values are `plumber` and `electrician`. |
| `customerName` | Required string; trimmed and checked non-empty by the service. |
| `customerPhone` | Required string; trimmed and checked non-empty by the service. |
| `description` | Required string; trimmed and checked non-empty by the service. |
| `address` | String; request model defaults to `""`; trimmed on create. |
| `pincode` | String; request model defaults to `""`; trimmed on create. |
| `city` | String; request model defaults to `""`; trimmed on create. |
| `area` | String; request model defaults to `""`; trimmed on create. |
| `status` | String; initialized to `pending`; updates accept `pending`, `in_progress`, `completed`, or `cancelled`. |
| `recommendedName` | Initially `None`; optional string on update. |
| `recommendedPhone` | Initially `None`; optional string on update. |
| `adminNote` | Initially `None`; optional string on update. |
| `createdAt` | String returned by `now_iso()`; assigned on create. |
| `updatedAt` | String returned by `now_iso()`; assigned on create and refreshed on update. |
| `history` | List initialized with a status event. Events contain `status`, `actor`, and `at`; may contain `note` and `recommendedPerson` (`name` and `phone`). `at` is a string returned by `now_iso()`. |

The request models are `ServiceRequestIn` and `ServiceRequestUpdateIn` in `backend_refactor/utils.py`. The service also reads optional `actor` (default `admin`) and `note` during updates; these are request fields, not top-level stored fields.

## RTE-77–RTE-81 — service requests

Routes are mounted under `/api` by the router.

| ID | Method | Path | Behavior |
|---|---|---|---|
| RTE-77 | POST | `/api/service-requests` | Public/mobile create; inserts one COL-19 document. |
| RTE-78 | GET | `/api/service-requests` | Lists COL-19 documents; optional `service_type`, `status`, `search`, `created_from`, and `created_to` query parameters. |
| RTE-79 | GET | `/api/service-requests/{request_id}` | Reads one COL-19 document by `id`. |
| RTE-80 | PATCH | `/api/service-requests/{request_id}` | Updates one COL-19 document and appends its history event. |
| RTE-81 | GET | `/api/service-requests/{request_id}/history` | Reads the embedded history from one COL-19 document. |

## Indexes and transaction scope

`ensure_indexes` in `backend_refactor/utils.py` contains 57 index definitions. The service-request indexes are:

- `service_requests_id_uq` on `id` (unique).
- `service_requests_status_type_created` on `status`, `serviceType`, and `createdAt`.
- `service_requests_createdAt` on `createdAt`.

No new TXN-* entry is needed for service requests: their create and update writes affect only the single `service_requests` collection; history is embedded in that document.
