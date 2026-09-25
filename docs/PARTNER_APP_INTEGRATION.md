# Partner mobile app — login, catalog, RFQ (send to frontend developer)

**API base:** `https://python-api-6aft.onrender.com/api`  
**Envelope:** every JSON response is `{ "success", "data", "error" }`.

**Dashboard (admin) sees:**

| App action | Where admin sees it |
| --- | --- |
| Register | **Referral Partners** → new row, KYC **pending**, `registeredVia: mobile_app` |
| Login | Same partner row → **Last app login**, **Logins** count |
| Submit RFQ | **RFQ Management** → **pending** (+ Overview tile) |

Deploy latest `backend/server.py` to Render before testing new auth routes.

---

## Recommended app flow

1. **Register** (once) → save `partnerId` + `token` if you login immediately after  
2. **Login** (every session) → save `token` + `partnerId`  
3. **GET /catalog** → browse / cart  
4. **POST /rfqs** → send quotation to Dashboard  
5. **GET /rfqs?partner_id=** → my quotations  

Optional: **`Authorization: Bearer <token>`** on `/auth/partner/me` to restore session.

---

## Auth paths (partner user login)

### Register (phone + passcode)

```http
POST /api/auth/partner/register
Content-Type: application/json
```

```json
{
  "name": "Partner name",
  "phone": "9876543210",
  "passcode": "1234",
  "address": "",
  "businessName": "",
  "pincode": "",
  "city": "",
  "area": "",
  "salesManager": "",
  "documents": []
}
```

| Field | Required |
| --- | --- |
| `name`, `phone`, `passcode` | Yes (`passcode` min 4 characters) |
| Rest | Optional |

**Success `data`:** partner object including **`id`** (use as **`partnerId`** for RFQs), **`kycStatus`: `"pending"`**.

**Errors:** `409` phone already registered.

> Legacy route `POST /api/partners/register` has **no passcode** — use **`/auth/partner/register`** for the app.

---

### Login

```http
POST /api/auth/partner/login
Content-Type: application/json
```

```json
{
  "phone": "9876543210",
  "passcode": "1234"
}
```

**Success `data`:**

```json
{
  "token": "opaque-session-token",
  "partnerId": "uuid",
  "partner": {
    "id": "uuid",
    "name": "...",
    "phone": "...",
    "kycStatus": "pending",
    "lastAppLoginAt": "...",
    "loginCount": 3
  }
}
```

Store **`token`** and **`partnerId`**.  
**401** if wrong phone/passcode or partner registered without passcode (old row).

---

### Current user (session check)

```http
GET /api/auth/partner/me
Authorization: Bearer <token>
```

**Success `data`:** partner profile + `rewardBalance`.

---

## Catalog (cart / quotation lines)

```http
GET /api/catalog
GET /api/catalog?category=Pipes%20%26%20Tubing&search=astral
GET /api/categories
GET /api/brands
GET /api/product-groups
```

Cart line needs **`productCode`** from catalog (same as **`qrCode`** for scan).

Details: [MOBILE_APP_API_HANDOFF.md](./MOBILE_APP_API_HANDOFF.md)

---

## RFQ (send quotation to Dashboard)

### Create (submit cart)

```http
POST /api/rfqs
Content-Type: application/json
```

```json
{
  "partnerId": "<from login or register id>",
  "lines": [
    { "productCode": "M511130301", "quantity": 10 }
  ],
  "deliveryMode": "storePickup",
  "scheduledAt": "2026-09-25 14:00"
}
```

| Field | Values |
| --- | --- |
| `deliveryMode` | `"storePickup"` \| `"homeDelivery"` |
| `lines[].productCode` | Must exist in catalog |
| `lines[].quantity` | Number > 0 |

**Success:** `data.status` = **`"pending"`** → admin sees it in **RFQ Management**.

**On-device “generate quotation” PDF/text:** app UI only. **Sending to Dashboard = this POST.**

---

### List my RFQs

```http
GET /api/rfqs?partner_id=<partnerId>
GET /api/rfqs?partner_id=<partnerId>&status=pending
GET /api/rfqs?partner_id=<partnerId>&status=approved
GET /api/rfqs?partner_id=<partnerId>&status=rejected
GET /api/rfqs?partner_id=<partnerId>&status=dispatched
```

Show **`rewardPoints`**, **`grandTotal`**, **`specialDiscountPercent`** when **`status === "approved"`**.

---

### Rewards

```http
GET /api/partners/{partnerId}/rewards
```

---

## Full path cheat sheet

| Method | Path | App use |
| --- | --- | --- |
| POST | `/auth/partner/register` | Sign up |
| POST | `/auth/partner/login` | Sign in |
| GET | `/auth/partner/me` | Session restore |
| GET | `/catalog` | Products |
| GET | `/categories` | Filters |
| POST | `/rfqs` | **Submit quotation** |
| GET | `/rfqs?partner_id=` | My RFQs |
| GET | `/partners/{id}/rewards` | Points |

Admin-only (do not call from app): `/rfqs/{id}/approve`, `/rfqs/{id}` PUT, `/dispatches`.

More RFQ detail: [RFQ_INTEGRATION_FOR_MOBILE.md](./RFQ_INTEGRATION_FOR_MOBILE.md)

---

## Minimal integration example

```javascript
const API = "https://python-api-6aft.onrender.com/api";

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// Login
const session = await api("/auth/partner/login", {
  method: "POST",
  body: { phone: "9876543210", passcode: "1234" },
});
const { token, partnerId } = session;

// Submit cart as RFQ
await api("/rfqs", {
  method: "POST",
  body: {
    partnerId,
    lines: [{ productCode: "M511130301", quantity: 2 }],
    deliveryMode: "storePickup",
  },
});

// My RFQs
const mine = await api(`/rfqs?partner_id=${encodeURIComponent(partnerId)}`);
```

---

## KYC gate (recommended)

Block **POST /rfqs** until `partner.kycStatus === "approved"` (admin approves under **Referral Partners**).  
Register and login still work while **pending**.

---

*Updated: 2026-09-25*
