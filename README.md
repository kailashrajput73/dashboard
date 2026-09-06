# Dashboard — sanitary / building-materials admin + API

This repo has three parts:

| Folder | What it is |
| --- | --- |
| `backend/` | FastAPI + MongoDB API (`backend/server.py`) — **source of truth for endpoints** |
| `frontend/` | Expo / React Native **admin dashboard** (web is the main UI) |
| `customerapp/` | Flutter customer app (reads catalog later; wire it to this API) |

Live API (Render): `https://python-api-6aft.onrender.com`  
All JSON routes are under **`/api`**.

---

## Contract every JSON route uses

```json
{ "success": true, "data": {}, "error": null }
```

On failure: `success` is `false`, `data` may include extra detail, `error` is a string. HTTP 4xx still returns this envelope.

Admin login returns a token. The dashboard sends `Authorization: Bearer <token>`. The current server does not require it for catalog routes, but keep sending it.

**Do not store a wallet balance.** Rewards are a ledger (`reward_ledger`). Balance is the sum of ledger rows.

---

## Where to look in code

- **Routes + request bodies:** `backend/server.py` (`APIRouter` prefix `/api`)
- **Dashboard API calls:** `frontend/src/api/endpoints.ts`
- **HTTP client:** `frontend/src/api/client.ts`
- **Backend URL for the dashboard:** `frontend/src/config/env.ts` (`EXPO_PUBLIC_BACKEND_URL` or Render URL)

Run API locally:

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000
```

Mongo: `MONGO_URI` (default `mongodb://127.0.0.1:27017`), database `DB_NAME` (default `quotation_db`).

Health check: `GET /api/` → `{ "ok": true }`.

---

## Catalog fields (Flutter + dashboard)

A catalog product is more than name/rate. Import, create, update, and list all use these fields (camelCase in JSON):

| Field | Meaning |
| --- | --- |
| `id` | UUID string (not Mongo `_id`) |
| `name` / `productName` | Display name |
| `productCode` | SKU / QR (`qrCode` copies this) |
| `brand` / `brandId` | Brand name + brands collection id |
| `category` | Category name |
| `type` | e.g. CPVC |
| `productGroup` / `productGroupIds` | Group name + ids |
| `unit` | e.g. `pcs` |
| `sizeMm` / `sizeInch` / `length` | Optional size |
| `mrp` | Printed MRP (app can strike this) |
| `discount` | Product discount **percent** (e.g. `25` for 25%) |
| `sellingPrice` | Price customer pays |
| `standardRate` | Same as selling price after save |
| `purchasePrice` | Cost / last purchase |
| `stock` | Qty on hand (app can show “only few left”) |
| `imageUrl` | Public photo URL |
| `isActive` | `true` / `false` |
| `reorderLevel` | Low-stock threshold |
| `priceUpdatedAt` | From `pricing` collection when present |

Selling price rule on the server: if `sellingPrice` is sent, it is used; else `mrp` and `discount` compute selling.

CSV / Excel import headers (same columns as `frontend/astral-products-import-test.xlsx`):

```
category, type, product_group, brand, product_name, size_mm, size_inch,
product_code, length, unit, mrp, selling_price, purchase_price,
stock_qty, discount, image_url, is_active
```

`discount` may be `25` or `25%`. `product_code` updates the existing row instead of duplicating.

---

## Endpoints

Base: `{API}/api/...`

### Health & media

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/` | | `{ ok: true }` |
| GET | `/media/proxy?url=` | image URL | Proxies hotlinked product photos. Returns image bytes, not JSON. |

### Auth

| Method | Path | Body |
| --- | --- | --- |
| POST | `/auth/requester/register` | `{ name, phone, address }` |
| POST | `/auth/admin/register` | `{ companyName, gstin, contactNumber, passcode }` |
| POST | `/auth/admin/login` | `{ contactNumber, passcode }` → `{ token, ... }` |

### Partners / KYC

| Method | Path | Body / query |
| --- | --- | --- |
| POST | `/partners/register` | `{ name, phone, address, businessName, pincode, city, area, salesManager, documents[] }` |
| POST | `/partners` | same |
| GET | `/partners` | `?search=&kyc_status=&sales_manager=` |
| GET | `/partners/{partner_id}` | |
| PUT | `/partners/{partner_id}/kyc` | `{ approved, locationVerified, rejectionReason }` |
| GET | `/partners/{partner_id}/rewards` | ledger + computed `balance` |

### Team

| Method | Path | Body |
| --- | --- | --- |
| GET | `/team/users` | |
| POST | `/team/users` | `{ name, contactNumber, role, passcode, permissions[] }` `role`: `admin` \| `store_manager` \| `staff` |
| PUT | `/team/users/{user_id}` | `{ name, contactNumber, role, isActive, permissions[] }` |

### Categories / subcategories / brands / groups

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/categories` | seeds defaults if empty: General, Materials, Labor, Services, Equipment |
| POST | `/categories` | `{ name }` |
| PUT | `/categories/{category_id}` | `{ name, isActive }` — also renames catalog rows |
| GET | `/subcategories` | `?category_id=` |
| POST | `/subcategories` | `{ name, categoryId }` |
| PUT | `/subcategories/{id}` | `{ name, categoryId }` |
| DELETE | `/subcategories/{id}` | |
| POST | `/subcategories/import` | `{ items: [{ name, categoryId?, category? }] }` |
| GET | `/brands` | includes `productCount` |
| POST | `/brands` | `{ name }` |
| PUT | `/brands/{brand_id}` | `{ name, isActive }` |
| GET | `/product-groups` | |
| POST | `/product-groups` | `{ name, productIds[] }` |
| PUT | `/product-groups/{group_id}` | `{ name, productIds[] }` |
| DELETE | `/product-groups/{group_id}` | |

### Catalog (products)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/catalog` | `?category=&search=&group_id=&type=&brand=&product_group=&size_mm=` Merges `pricing` onto each item. |
| POST | `/catalog` | See **CatalogItemIn** below. Creates brand if `brand` name is new. |
| PUT | `/catalog/{item_id}` | Same body as create. |
| PATCH | `/catalog/{item_id}/pricing` | `{ mrp?, sellingPrice?, discount?, purchasePrice?, stock? }` Day-to-day price/qty. |
| POST | `/catalog/pricing-bulk` | `{ itemIds[], mrp?, discount?, stock? }` Apply discount or stock to many products. |
| DELETE | `/catalog/{item_id}` | One product. |
| DELETE | `/catalog` | **Wipe entire catalog.** |
| POST | `/catalog/import` | See import body below. |

**CatalogItemIn** (`POST` / `PUT /catalog/{id}`):

```json
{
  "name": "PIPE SDR-11",
  "category": "Pipes & Tubing",
  "unit": "pcs",
  "standardRate": 235.2,
  "productCode": "M511130301",
  "productName": "PIPE SDR-11",
  "type": "CPVC",
  "productGroup": "PIPE SDR-11",
  "sizeMm": null,
  "sizeInch": null,
  "length": null,
  "brand": "Astral",
  "brandId": "<optional if brand name is sent>",
  "subcategoryId": null,
  "aliases": [],
  "multilingualNames": {},
  "displaySequence": 0,
  "reorderLevel": 0,
  "regularDiscount": 0,
  "productGroupIds": [],
  "imageUrl": "https://...",
  "imageName": null,
  "mrp": 294,
  "sellingPrice": 235.2,
  "purchasePrice": null,
  "discount": 20,
  "stock": 18,
  "isActive": true
}
```

**Import** `POST /catalog/import`:

```json
{
  "items": [ { "name": "...", "unit": "pcs", "standardRate": 235.2, "category": "...", "type": "CPVC", "productGroup": "...", "brand": "Astral", "productName": "...", "productCode": "M511130301", "mrp": 294, "sellingPrice": 235.2, "purchasePrice": null, "discount": 20, "stock": 18, "imageUrl": "https://...", "isActive": true } ],
  "categoryMode": "fromCsv",
  "overrideCategory": "",
  "replaceExisting": false
}
```

`categoryMode`: `fromCsv` | `overrideExisting` | `overrideNew`.  
`replaceExisting: true` deletes all catalog rows first, then inserts. Import also upserts **brands** and **product groups**.

### Racks

| Method | Path | Body |
| --- | --- | --- |
| GET | `/racks` | |
| POST | `/racks` | `{ name, rows, columns }` |
| DELETE | `/racks/{rack_id}` | |
| PUT | `/racks/{rack_id}/assign` | `{ productId, slotCode }` |
| GET | `/racks/{rack_id}/products` | |

### Purchases (stock in)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/purchases` | |
| POST | `/purchases` | `{ lines: [{ productCode, quantity, listPrice, purchaseDiscount, rackId, rackSlot }] }` |
| POST | `/purchases/import` | same shape |

Purchase **increments** `catalog.stock`.

### RFQ → approve → rewards → dispatch

Do not skip this flow. Approval writes **reward_ledger** rows. Dispatch decrements stock.

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/rfqs` | `?partner_id=&status=&search=` |
| POST | `/rfqs` | `{ partnerId, lines: [{ productCode, quantity }], deliveryMode, scheduledAt }` `deliveryMode`: `storePickup` \| `homeDelivery` |
| PUT | `/rfqs/{rfq_id}` | same as create (not after dispatched/cancelled) |
| POST | `/rfqs/{rfq_id}/approve` | `{ approved, specialDiscountPercent, deliveryMode, scheduledAt }` Reward points = `floor(grandTotal / 100)` on approve |
| GET | `/rfqs/{rfq_id}/history` | audit events |
| GET | `/dispatches` | |
| POST | `/dispatches` | `{ lines: [{ productCode, quantity }], sourceRfqId, customerName, customerPhone }` Only **approved** RFQ can be dispatched; stock must be enough |

### Inventory

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/inventory` | stock, brand, rack, valuation |
| GET | `/inventory/low-stock` | `stock <= reorderLevel` |
| GET | `/inventory/transactions` | purchases = `in`, dispatches = `out` |

### Quotation money config (GST / header discounts)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/money-config/{admin_id}` | creates defaults if missing |
| PUT | `/money-config/{admin_id}` | `{ discountPercent, gstPercent, specialDiscountPercent, showDiscount, showGst, showSpecialDiscount }` |

This is **quotation** GST/discount, not the per-product `discount` on catalog.

---

## MongoDB collections

Database name: `quotation_db` (or `DB_NAME`).

| Collection | Used for |
| --- | --- |
| `users` | Admin / requester / team (`role`, `passcodeHash`, …) |
| `partners` | KYC partners |
| `catalog` | Products (mrp, sellingPrice, discount, stock, brand, productCode, imageUrl, …) |
| `pricing` | Current price per `productCode` (merged on GET catalog) |
| `pricing_history` | Every price save |
| `categories` | Categories |
| `subcategories` | Subcategories |
| `brands` | Brands (import creates these) |
| `product_groups` | Groups + `productIds` |
| `racks` | Warehouse slots |
| `purchases` | Stock-in |
| `rfqs` | RFQs + `history` |
| `reward_ledger` | Points earned on RFQ approve (`type: earned`) |
| `dispatches` | Stock-out / billing |
| `money_config` | Quotation GST flags |

Documents use string field `id`. API responses never send Mongo `_id`.

---

## Dashboard (frontend) map

```
frontend/app/(admin)/     login, dashboard, catalog, csv-import, brands, …
frontend/src/api/         client.ts, endpoints.ts
frontend/src/utils/csv.ts spreadsheet.ts   CSV + xlsx import
frontend/src/components/AdminShell.tsx     web sidebar
```

CSV import is web-friendly (file picker). Excel `.xlsx` with the same headers is accepted.

---

## Deploy note

Pushing to GitHub only updates the live API/site if Render (backend) and the web host (frontend) deploy the **same branch** they watch — usually `main`. Feature work on another branch will not show on the live URL until it is on that branch and those services redeploy.
