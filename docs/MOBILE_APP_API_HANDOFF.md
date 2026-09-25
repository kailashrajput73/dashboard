# Mobile / partner app — API handoff

Give this file to your frontend developer (or paste into her AI). It describes **what the admin team uploads** and **what JSON you get back** when you call the API.

**Live API (default):** `https://python-api-6aft.onrender.com`  
**Prefix:** every route is `/api/...`  
**Full route list:** see [README.md](../README.md) (backend source of truth: `backend/server.py`).

---

## 1. How to call any endpoint

### URL

```text
GET  https://python-api-6aft.onrender.com/api/catalog
POST https://python-api-6aft.onrender.com/api/rfqs
```

### Headers

```http
Content-Type: application/json
Accept: application/json
```

Partner app routes (`/catalog`, `/categories`, `/partners/register`, `/rfqs`, …) **do not require** admin login today.  
Admin dashboard uses `Authorization: Bearer <token>` from `POST /api/auth/admin/login` — optional for catalog reads.

### Response envelope (always)

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

On failure: `success: false`, `error` is a human string, HTTP is often 400/404/409.  
**Use `response.json()` then read `data` when `success === true`.**

### Example (fetch)

```javascript
const BASE = "https://python-api-6aft.onrender.com/api";

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API error");
  return json.data;
}

// Partner catalog browse
const products = await api("/catalog?category=All");
```

### Product images

- `imageUrl` on each product is usually a **public HTTPS URL** (from master upload).
- If the image host blocks mobile hotlinking, use:  
  `GET /api/media/proxy?url=<encodeURIComponent(imageUrl)>`  
  (returns **image bytes**, not JSON.)

---

## 2. What admin uploads → what you read

Admin does **not** send one giant file for daily ops. Data is merged in MongoDB; the app **only reads** via GET endpoints (mainly **`GET /catalog`**).

| Admin upload (dashboard) | Purpose | App reads via |
| --- | --- | --- |
| **Product master** CSV/Excel | Names, category, type, brand, codes, size, image URL | `GET /catalog` |
| **Prices** CSV/Excel | MRP, discount %, selling price per `product_code` | `GET /catalog` (pricing merged on server) |
| **Stock** CSV/Excel | Qty on hand per `product_code` | `GET /catalog` → `stock` |
| **Purchases** CSV | Stock in from supplier | Updates `stock`; history in admin only |

**Merge key:** `productCode` (same value as **`qrCode`** — use either for QR/barcode UI).

### Master spreadsheet columns (admin)

Headers are flexible; these are the names the admin UI accepts (snake_case or camelCase):

| Column | Maps to JSON field on product |
| --- | --- |
| `category` | `category` |
| `type` | `type` |
| `sub_category` / `subcategory` | `subcategory` |
| `class` / `product_class` | `productClass` |
| `brand` | `brand` |
| `product_name` | `productName`, `name` |
| `product_code` | `productCode`, **`qrCode`** |
| `product_group` | `productGroup` |
| `length` | `length` |
| `size_cm` / `size_mm` / `size_inch` | `sizeCm`, `sizeMm`, `sizeInch`, `size` |
| `unit` | `unit` |
| `image_url` | `imageUrl` |
| *(not on master file)* | `mrp`, `discount`, `sellingPrice`, `stock` come from **price/stock** files or admin edit |

### Price file columns

| Column | Field |
| --- | --- |
| `product_code` | required |
| `mrp` | `mrp` |
| `discount` / `discount_percent` | `discount` (percent, e.g. `20` = 20%) |
| `selling_price` | `sellingPrice` (optional; else derived from MRP − discount) |

### Stock file columns

| Column | Field |
| --- | --- |
| `product_code` | required |
| `stock` / `qty` / `quantity` | `stock` (absolute qty, not delta) |

---

## 3. Main read model: `GET /catalog`

**Query params (all optional):**

| Param | Example | Filters by |
| --- | --- | --- |
| `category` | `Pipes & Tubing` | category name (not `All`) |
| `search` | `astral` | name, productCode, brand, aliases |
| `group_id` | uuid | product group id |
| `type` | `CPVC` | type |
| `brand` | `Astral` | brand |
| `product_group` | group name | |
| `subcategory` | | subcategory name |
| `product_class` | `SDR11` | |
| `size_mm` | `25` | numeric size |

**Each item in `data` (array)** — typical shape after admin upload:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "PIPE SDR-11 1\"",
  "productName": "PIPE SDR-11 1\"",
  "productCode": "M511130301",
  "qrCode": "M511130301",
  "category": "Pipes & Tubing",
  "subcategory": "CPVC Pipes",
  "type": "CPVC",
  "productClass": "SDR11",
  "productGroup": "PIPE SDR-11",
  "brand": "Astral",
  "brandId": "...",
  "unit": "pcs",
  "sizeMm": 25,
  "sizeInch": "1",
  "length": "3 m",
  "mrp": 294,
  "discount": 20,
  "sellingPrice": 235.2,
  "standardRate": 235.2,
  "purchasePrice": 180,
  "stock": 48,
  "reorderLevel": 10,
  "regularDiscount": 0,
  "imageUrl": "https://example.com/photo.jpg",
  "aliases": ["1 inch pipe"],
  "multilingualNames": { "hi": "..." },
  "productGroupIds": ["..."],
  "isActive": true,
  "priceUpdatedAt": "2026-09-20T10:00:00+00:00",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**UI hints:**

| Field | Use in app |
| --- | --- |
| `sellingPrice` or `standardRate` | Show price customer pays |
| `mrp` + `discount` | Show strike MRP + “X% off” |
| `stock` | “In stock” / “Only N left” / hide if 0 |
| `qrCode` | Encode in QR widget (**no PNG URL from API**) |
| `isActive` | Hide inactive SKUs in partner browse |
| `multilingualNames` / `aliases` | Local search |

TypeScript mirror: `frontend/src/api/endpoints.ts` → `CatalogItem`.

---

## 4. Taxonomy endpoints (filters / chips)

```http
GET /api/categories
GET /api/subcategories?category_id=
GET /api/brands
GET /api/product-groups
```

Use these to build category chips, brand filters, and “shop by group” — same data admin maintains.

---

## 5. Partner registration & KYC (referral app)

```http
POST /api/partners/register
```

Body:

```json
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "address": "...",
  "businessName": "...",
  "pincode": "110001",
  "city": "Delhi",
  "area": "...",
  "salesManager": "...",
  "documents": ["https://.../id-proof.jpg"]
}
```

Response includes `id`, `kycStatus`: `pending` | `approved` | `rejected`.  
App should block ordering until `kycStatus === "approved"` (business rule; enforce in app).

Rewards (after admin approves RFQs):

```http
GET /api/partners/{partnerId}/rewards
```

```json
{
  "balance": 120,
  "entries": [
    {
      "id": "...",
      "quotationId": "<rfq id>",
      "points": 45,
      "type": "earned",
      "createdAt": "..."
    }
  ]
}
```

---

## 6. RFQ flow (partner creates → admin approves in dashboard)

### Create RFQ (partner app)

```http
POST /api/rfqs
```

```json
{
  "partnerId": "<partner id from register>",
  "lines": [
    { "productCode": "M511130301", "quantity": 10 }
  ],
  "deliveryMode": "storePickup",
  "scheduledAt": "2026-09-25 14:00"
}
```

`deliveryMode`: `"storePickup"` | `"homeDelivery"`.

Server resolves `productName`, `unitPrice` from catalog. Status starts as **`pending`**.

### List partner RFQs

```http
GET /api/rfqs?partner_id=<partnerId>&status=pending
```

Status values: `pending`, `approved`, `rejected`, `dispatched`.

### After admin approval

Admin calls `POST /api/rfqs/{id}/approve` — partner app should **refresh** RFQ and show:

- `status`: `approved`
- `specialDiscountPercent`
- `rewardPoints` (server formula: `floor(grandTotal / 100)`)
- `grandTotal`, `scheduledAt`, `deliveryMode`

**Push notifications are not implemented** — poll or refresh on app focus.

### Update before dispatch (admin only today)

`PUT /api/rfqs/{id}` — same body as create; partner app read-only unless you add partner edit later.

---

## 7. QR / barcode

- API does **not** return a QR image URL.
- **`qrCode`** equals **`productCode`** — render QR in the app (e.g. `react-native-qrcode-svg`).
- Admin scan at shop uses the same string.

Optional **cart batch QR** (future): agree a JSON payload between apps; not a server endpoint yet.

---

## 8. Endpoints admin uses (you usually skip)

| Path | Note |
| --- | --- |
| `POST /catalog/import/master` | Admin bulk master |
| `POST /catalog/import/pricing` | Admin prices |
| `POST /catalog/import/stock` | Admin stock |
| `POST /purchases` | Stock in |
| `POST /dispatches` | Stock out / billing |
| `GET /dashboard/snapshot` | Admin home KPIs |
| `POST /auth/admin/login` | Admin only |

Partner app **reads** catalog + taxonomy; **writes** partner register + RFQs.

---

## 9. Environment / local dev

Point the app at:

| Environment | Base URL |
| --- | --- |
| Production (Render) | `https://python-api-6aft.onrender.com` |
| Local backend | `http://10.0.2.2:8000` (Android emulator) or `http://<LAN-IP>:8000` (phone) |

Dashboard config reference: `frontend/src/config/env.ts`.

If a route returns **404**, the deployed API is behind local code — admin must redeploy `backend/server.py`.

---

## 10. Quick checklist for her AI

1. All JSON under `/api`, envelope `{ success, data, error }`.
2. **Products = `GET /catalog`** — includes merged price + stock + `qrCode`.
3. **Upload columns** in section 2 explain admin data; no separate “upload API” for the partner app.
4. **RFQ:** `POST /rfqs`, `GET /rfqs?partner_id=`.
5. **Partner:** `POST /partners/register`, `GET /partners/{id}/rewards`.
6. **QR:** encode `qrCode` client-side.
7. Types: copy from `frontend/src/api/endpoints.ts` or generate from examples above.

---

## 11. Example: minimal partner catalog screen

```javascript
const BASE = "https://python-api-6aft.onrender.com/api";

async function loadBrowse(category) {
  const q = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`${BASE}/catalog${q}`);
  const { success, data, error } = await res.json();
  if (!success) throw new Error(error);
  return (data || []).filter((p) => p.isActive !== false);
}
```

---

*Last updated: 2026-09-23 — matches split master/price/stock imports and catalog `qrCode`.*
