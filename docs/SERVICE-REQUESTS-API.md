# Service Requests API contract

This API covers the plumbing and electrician service-request flow used by a future mobile customer app and the Expo admin panel.

Base URL: `/api`
Envelope: `{ "success": true, "data": {}, "error": null }`

## Collection

Mongo collection: `service_requests`

Document fields:

```json
{
  "id": "uuid-string",
  "serviceType": "plumber",
  "customerName": "Ravi",
  "customerPhone": "9876543210",
  "address": "",
  "pincode": "",
  "city": "",
  "area": "",
  "description": "Kitchen tap leaking",
  "status": "pending",
  "recommendedName": null,
  "recommendedPhone": null,
  "adminNote": null,
  "createdAt": "2026-10-06T12:00:00Z",
  "updatedAt": "2026-10-06T12:00:00Z",
  "history": [
    {
      "status": "pending",
      "actor": "system",
      "at": "2026-10-06T12:00:00Z",
      "note": "New service request created"
    }
  ]
}
```

Status values:

- `pending`
- `in_progress`
- `completed`
- `cancelled`

## Public create route

`POST /api/service-requests`

### Request body

```json
{
  "serviceType": "plumber",
  "customerName": "Ravi",
  "customerPhone": "9876543210",
  "description": "Kitchen tap leaking",
  "address": "",
  "pincode": "",
  "city": "",
  "area": ""
}
```

Validation:

- `serviceType` must be `plumber` or `electrician`
- `customerName`, `customerPhone`, and `description` are required
- On validation failure, return `400` with `data.errors[]`

### Success response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "serviceType": "plumber",
    "customerName": "Ravi",
    "customerPhone": "9876543210",
    "description": "Kitchen tap leaking",
    "address": "",
    "pincode": "",
    "city": "",
    "area": "",
    "status": "pending",
    "recommendedName": null,
    "recommendedPhone": null,
    "adminNote": null,
    "createdAt": "...",
    "updatedAt": "...",
    "history": [{ "status": "pending", "actor": "system", "at": "...", "note": "New service request created" }]
  },
  "error": null
}
```

## Admin list and detail

`GET /api/service-requests`

Optional query params:

- `service_type`
- `status`
- `search`
- `created_from`
- `created_to`

Example:

`GET /api/service-requests?service_type=plumber&status=pending&search=Ravi`

`GET /api/service-requests/{id}`

`GET /api/service-requests/{id}/history`

## Admin update lifecycle

`PATCH /api/service-requests/{id}`

### Request body

```json
{
  "status": "in_progress",
  "recommendedName": "Rahul",
  "recommendedPhone": "9090909090",
  "adminNote": "Assigned to electrician team",
  "actor": "admin",
  "note": "Admin reviewed request"
}
```

Rules:

- `status` may be `pending`, `in_progress`, `completed`, or `cancelled`
- `recommendedName` and `recommendedPhone` are stored on the request once the admin moves it to `in_progress`
- every status change appends to `history[]` as `{ status, actor, at, note?, recommendedPerson? }`
- `adminNote` is optional and persisted on the request

Example history item:

```json
{
  "status": "in_progress",
  "actor": "admin",
  "at": "2026-10-06T12:34:56Z",
  "note": "Admin reviewed request",
  "recommendedPerson": {
    "name": "Rahul",
    "phone": "9090909090"
  }
}
```

This API is intentionally open for future mobile customer submission and is not gated behind partner auth yet.
