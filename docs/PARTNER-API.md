# Partner API

One contract for the referral-partner mobile app and the API it calls. Admin and the app must use the **same base URL** (`frontend/src/config/env.ts`, `EXPO_PUBLIC_BACKEND_URL`).

**Live API:** `backend_refactor/` on the VPS.  
**Base:** `http://YOUR_VPS_IP/api` or `https://api.yourdomain.com/api`  
**Envelope:** `{ "success": true, "data": {}, "error": null }`. On failure `success` is false, `error` is a string, and `data.errors` may list field problems. Read `data` only when `success` is true. A **404** means that host is not running this API.

Mobile app repo: Flutter `customerapp-main`. OTP `123456` is mock on the phone only. The API never sees OTP. Identity is phone + passcode.

---

## App flow

1. `GET /partners?search=<phone>` before signup. If a row exists, send the user to login.
2. `POST /auth/partner/register` once, then `POST /auth/partner/login`. Save `token` and `partnerId`.
3. `GET /auth/partner/me` with `Authorization: Bearer <token>` to restore the session. **401** signs the user out.
4. Home tiles: `GET /catalog/tree`. Products: `GET /catalog`.
5. Block **`POST /rfqs`** until `kycStatus === "approved"` (recommended). Register and login still work while pending.
6. `POST /rfqs` submits the cart. `GET /rfqs?partner_id=` is “My quotations”. No push; refresh on screen focus.
7. `GET /partners/{partnerId}/rewards` is the points screen.

| App action | Admin screen |
| --- | --- |
| Register | Referral Partners: new row, `registeredVia: "mobile_app"`, KYC `pending` |
| Login | Same row: `lastAppLoginAt`, `loginCount` |
| Submit RFQ | RFQ Management: `pending` |

---

## Auth

### Register

`POST /auth/partner/register`

```json
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "passcode": "4567",
  "address": "",
  "businessName": "",
  "pincode": "",
  "city": "",
  "area": "",
  "salesManager": "",
  "documents": []
}
```

Required: `name`, `phone`, `passcode` (min 4). Phone is **10 digits**, no `+91`. Store one canonical form (digits only; drop a leading `91` when the number is 12 digits) on register, login, and search.

Success `data`: partner with `id` (this is `partnerId`), `kycStatus: "pending"`, no `passcodeHash`. Persist `registeredVia: "mobile_app"`, `loginCount: 0`. **409** if the phone exists. **400** if name, phone, or passcode is missing.

`POST /partners/register` has **no passcode**. Do not use it for this app. Those rows cannot log in until they have a `passcodeHash`.

The app calls login immediately after register.

### Login

`POST /auth/partner/login` with `{ "phone", "passcode" }`.

Success `data`: `token`, `partnerId`, `partner` (`id`, `name`, `phone`, `kycStatus`, `lastAppLoginAt`, `loginCount`). Server checks `passcodeHash`, writes `partner_tokens`, sets `lastAppLoginAt`, and increments `loginCount`. **401** on a bad passcode or a legacy row with no hash.

### Session

`GET /auth/partner/me` with the bearer token. Partner profile, no hash, plus `rewardBalance`. **401** if the token is bad.

### Duplicate search

`GET /partners?search=<phone>` before OTP. Match the same canonical phone.

---

## Catalog and home

Do not hardcode category or type tiles. Draw only what the API returns.

`GET /catalog/tree` — `data.categories[]` with `name`, `imageUrl`, `productCount`, and `types[]` (`name`, `imageUrl`, `productCount`). Null `imageUrl` means a blank placeholder. Category and type photos are set in admin. The sheet `image_url` column is the SKU photo only.

Also: `GET /categories`, `GET /product-types`, `GET /subcategories?category_id=`, `GET /brands` (`logoUrl`), `GET /product-groups`.

`GET /catalog` query params, all optional: `category`, `search`, `group_id`, `type`, `brand`, `product_group`, `subcategory`, `product_class`, `size_mm`.

Price on screen: `sellingPrice` or `standardRate`. Strike price: `mrp` and `discount`. Stock: `stock`. Hide `isActive === false`. QR: encode `qrCode` in the app. It equals `productCode`. There is no QR image URL. `GET /media/proxy?url=` returns image bytes when a host blocks hotlinking.

Admin uploads (app only reads the result on `GET /catalog`):

| Upload | Writes |
| --- | --- |
| Product master | Names, category, type, class, brand, code, size, `imageUrl`. Does not set MRP, discount, or stock on an existing code. |
| Prices | `mrp`, `discount`, `sellingPrice` by `product_code` |
| Stock | `stock` by `product_code` (absolute qty) |
| Purchases | Stock in; history stays in admin |

Master columns the importer accepts: `category`, `type`, `sub_category`, `class` / `product_class`, `brand`, `product_name`, `product_code`, `product_group`, `length`, `size_cm` / `size_mm` / `size_inch`, `unit`, `image_url`.

Cart line uses `productCode`. Show `sellingPrice` as an estimate. The server sets `unitPrice` on create. Warn if quantity is above `stock`.

Types live in `frontend/src/api/endpoints.ts` (`CatalogItem`).

---

## RFQ

`POST /rfqs`

```json
{
  "partnerId": "<from login>",
  "lines": [{ "productCode": "M511130301", "quantity": 10 }],
  "deliveryMode": "storePickup",
  "scheduledAt": "2026-09-25 14:00"
}
```

`partnerId` required. At least one line. `productCode` must exist in catalog. `quantity` > 0. `deliveryMode`: `storePickup` or `homeDelivery`. `scheduledAt` optional. On-device PDF is UI only. This POST is what the store receives.

Success `data` starts at `status: "pending"` and includes `id`, `lines` (`productCode`, `productName`, `quantity`, `unitPrice`), `grandTotal`, `specialDiscountPercent`, `rewardPoints` (0 until approval), `deliveryMode`, `scheduledAt`, `history`.

`GET /rfqs?partner_id=<id>&status=` — `pending`, `approved`, `rejected`, `dispatched`.

| Status | Show |
| --- | --- |
| `pending` | Waiting for admin |
| `approved` | `grandTotal`, `specialDiscountPercent`, `rewardPoints`, pickup or delivery |
| `rejected` | Declined |
| `dispatched` | Billed at the store |

Approve (`POST /rfqs/{id}/approve`, admin) sets `rewardPoints` to `floor(grandTotal / 100)` and writes `reward_ledger`: `type: "earned"`, `requesterId` = **partner id**, `quotationId` = RFQ `id`. The field name is still `requesterId`.

`GET /rfqs/{id}/history` — `{ action, actor, details, at }`.

Rewards: `GET /partners/{partnerId}/rewards` → `{ balance, entries[] }`. `quotationId` is the RFQ id. If balance stays 0 after approve, the ledger `requesterId` is not the partner id.

### Do not call from the app

| Method | Path |
| --- | --- |
| POST | `/rfqs/{id}/approve` |
| PUT | `/rfqs/{id}` |
| POST | `/dispatches` |
| POST | `/catalog/import/master`, `/pricing`, `/stock` |
| POST | `/purchases` |
| GET | `/dashboard/snapshot` |
| POST | `/auth/admin/login` |

---

## Checks

```bash
BASE="http://YOUR_VPS_IP/api"
# 401 + envelope, not 404
curl -sS -X POST "$BASE/auth/partner/login" -H "Content-Type: application/json" \
  -d '{"phone":"0000000000","passcode":"0000"}'
# success + data array, not 404
curl -sS "$BASE/rfqs"
```

| Symptom | Cause |
| --- | --- |
| 404 | This host is not `backend_refactor` |
| 400 on RFQ | `productCode` missing from `GET /catalog`, or quantity ≤ 0 |
| Logins stay 0 | App never called `/auth/partner/login`, or it used `/partners/register` |
| 401 on login | Row has no `passcodeHash` |
| Partner visible, RFQ missing | RFQ saved on a different database than admin |
| Rewards stay 0 | Approve not run, or ledger `requesterId` ≠ partner id |
| Empty catalog | Master and prices not imported |

Later, not in the app: real OTP, password reset, push on approval.

**Firebase / progressive KYC (planning, not implemented):** `migration/bug_fix/PARTNER-MOBILE-AUTH-FLOW.md`

*Merged 2026-10-04 from the four partner handoffs. Sheet columns: `demo-notes/SHEET-FORMAT.md`.*
