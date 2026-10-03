# Backend handoff — Shivani mobile app (partner auth + RFQ + rewards)

**Audience:** Dashboard / API developer  
**Mobile app repo:** `customerapp-main` (Flutter)  
**Reference implementation:** `Dashboard/backend/server.py` (must match what is deployed)

**Production API (app default):**  
`https://python-api-6aft.onrender.com/api`

Every response must use the envelope:

```json
{ "success": true, "data": { }, "error": null }
```

On failure: `success: false`, human-readable `error`, optional `data` (e.g. `{ "errors": ["..."] }`).

---

## What the mobile app does today

| User action | When API is called | What Dashboard should show |
| --- | --- | --- |
| **Sign up** (phone → OTP → name/password → location → profession) | End of signup: **`POST /auth/partner/register`** then **`POST /auth/partner/login`** | **Referral Partners** → new row, `registeredVia: "mobile_app"`, KYC `pending`, name/phone/address fields |
| **Log in** (phone + password only) | **`POST /auth/partner/login`** | Same partner → **`lastAppLoginAt`**, **`loginCount`** incremented |
| **Session restore** | **`GET /auth/partner/me`** with `Authorization: Bearer <token>` | App refreshes KYC; invalid token → user signed out |
| **Browse / cart** | **`GET /catalog`** (poll ~3s) | N/A (catalog admin) |
| **Submit quotation** | **`POST /rfqs`** with `partnerId` + cart lines | **RFQ Management** → status `pending` |
| **My quotations / rewards** | **`GET /rfqs?partner_id=`**, **`GET /partners/{id}/rewards`** | N/A on admin list (partner sees in app); admin approves RFQ → ledger + points |

**OTP (123456) is mock on the phone only** — the backend does **not** receive OTP. Real identity is **phone + passcode** on register/login.

**Duplicate signup:** before OTP the app calls **`GET /partners?search=<phone>`**. If a partner exists, user is told to log in. Register must return **409** if phone already exists.

---

## Critical: deploy the correct backend

If Render (or your host) runs an **old** `server.py` without these routes, the app will fail silently or show connection errors:

| Route | Purpose |
| --- | --- |
| `POST /api/auth/partner/register` | Sign up with passcode |
| `POST /api/auth/partner/login` | Log in |
| `GET /api/auth/partner/me` | Session |
| `GET /api/partners` | Search by phone (duplicate check) |
| `POST /api/rfqs` | Submit quotation |
| `GET /api/rfqs` | List RFQs |
| `POST /api/rfqs/{id}/approve` | Admin approve + reward points |
| `GET /api/partners/{id}/rewards` | Partner reward balance + ledger |

**Quick check on production:**

```bash
curl -sS "https://python-api-6aft.onrender.com/api/rfqs"
# Expect: {"success":true,"data":[...]}  — NOT 404

curl -sS -X POST "https://python-api-6aft.onrender.com/api/auth/partner/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0000000000","passcode":"0000"}'
# Expect: 401 + envelope — NOT 404
```

If you get **404**, deploy latest `Dashboard/backend/server.py` to that host.

---

## 1. Partner registration (sign up)

**Called once** when the user finishes **profession** step (not on OTP).

```http
POST /api/auth/partner/register
Content-Type: application/json
```

**Body (example):**

```json
{
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "passcode": "4567",
  "address": "12, Main Road, Sector 5",
  "businessName": "",
  "pincode": "",
  "city": "South Delhi",
  "area": "",
  "salesManager": "REF123",
  "documents": []
}
```

| Field | App source | Notes |
| --- | --- | --- |
| `name` | Signup form | Required |
| `phone` | Signup mobile | **10 digits**, no `+91` (app normalizes) |
| `passcode` | User password (4–6 digits) | **Required**, min length 4; store **bcrypt hash** only |
| `address`, `city`, `pincode`, `area` | Map / location step | Optional strings |
| `salesManager` | Referral code field | Optional |

**Backend must persist (suggested document shape):**

- `id` (uuid)
- `name`, `phone` (unique), `passcodeHash` (never return in API)
- `kycStatus`: `"pending"`
- `registeredVia`: **`"mobile_app"`** (Dashboard UI uses this)
- `loginCount`: `0` initially
- `lastAppLoginAt`: set on first login, not on register
- `locationVerified`, `appActive`, `documents`, `createdAt`, `updatedAt`

**Responses:**

- **200** `success: true`, `data` = partner object (include `id`, no `passcodeHash`)
- **409** phone already registered (app shows “please log in”)
- **400** missing name/phone/passcode

**Immediately after register**, the app calls **login** (below) so `loginCount` becomes 1 and `lastAppLoginAt` is set.

---

## 2. Partner login

**Every** returning session:

```http
POST /api/auth/partner/login
Content-Type: application/json
```

```json
{
  "phone": "9876543210",
  "passcode": "4567"
}
```

**Backend must:**

1. Find partner by **`phone`** (exact match on stored string — see phone normalization below).
2. Verify `passcode` against `passcodeHash`.
3. Insert session in `partner_tokens`: `{ token, partnerId, createdAt }`.
4. Update partner: `lastAppLoginAt`, `$inc: { loginCount: 1 }`, `updatedAt`.

**Success `data`:**

```json
{
  "token": "<opaque-uuid>",
  "partnerId": "<partner-uuid>",
  "partner": { "id", "name", "phone", "kycStatus", "lastAppLoginAt", "loginCount", ... }
}
```

**401** if wrong credentials OR partner was created with legacy **`POST /partners/register`** (no `passcodeHash`) — those users cannot log in from the app until admin resets passcode or you migrate them.

---

## 3. Phone number rules (common bug)

The app sends **10-digit** Indian numbers, e.g. `9876543210`.

**Backend should:**

- Store and query **one canonical format** (recommend: strip non-digits, remove leading `91` if 12 digits).
- Apply the **same normalization** on register, login, and `GET /partners?search=`.

If register stores `+91 98765 43210` but login looks up `9876543210`, login and duplicate checks break.

---

## 4. Partner search (duplicate signup)

```http
GET /api/partners?search=9876543210
```

App uses this before signup OTP. Return partners whose **phone** matches (partial search OK if phone field is normalized).

---

## 5. Session / profile

```http
GET /api/auth/partner/me
Authorization: Bearer <token>
```

Return full partner profile (no `passcodeHash`) + optional `rewardBalance`.

Invalid/expired token → **401** (app logs user out).

---

## 6. RFQ (quotation to Dashboard)

```http
POST /api/rfqs
Content-Type: application/json
```

```json
{
  "partnerId": "<from login>",
  "lines": [
    { "productCode": "ASTRAL-CPVC-SDR11-15-MM-5-MTR", "quantity": 2 }
  ],
  "deliveryMode": "storePickup",
  "scheduledAt": "2026-09-25 14:00"
}
```

**Validation:**

- `partnerId` must exist.
- Each `productCode` must exist in **`catalog`** collection (`productCode` field).
- `quantity` > 0.

**On success:** insert RFQ with `status: "pending"`, `grandTotal`, `history: [{ action: "created", ... }]`.

**Admin:** `POST /api/rfqs/{id}/approve` with `{ "approved": true, "specialDiscountPercent": 0 }`  
→ set `rewardPoints`, update `grandTotal`, insert **`reward_ledger`** entry (`type: "earned"`, `requesterId` = `partnerId`, `quotationId` = rfq `id`).

**Partner app reads rewards:**

```http
GET /api/partners/{partnerId}/rewards
```

```json
{
  "success": true,
  "data": {
    "balance": 8,
    "entries": [
      { "id", "requesterId", "quotationId", "points", "type": "earned", "createdAt" }
    ]
  }
}
```

If approve works but app shows **0 points**, check ledger `requesterId` equals **`partnerId`**, not a legacy user id.

---

## 7. Where Dashboard UI reads data

| Screen | API / fields |
| --- | --- |
| **Referral Partners** | `GET /partners` — show `name`, `phone`, `kycStatus`, `registeredVia`, `loginCount`, `lastAppLoginAt`, address/city/pincode |
| **RFQ Management** | `GET /rfqs` — filter `status`, show `partnerId`, lines, `grandTotal` |
| **Partner KYC approve** | `PUT /partners/{id}/kyc` — app may block messaging until `kycStatus === "approved"` (RFQ submit still allowed on current app) |

Ensure **admin Dashboard `API_BASE_URL`** points to the **same** database as the mobile app (`env.ts` → `https://python-api-6aft.onrender.com` or your deployed URL).

---

## 8. End-to-end test script (backend verification)

Replace `BASE` and use a **new** phone for register test.

```bash
BASE="https://python-api-6aft.onrender.com/api"
PHONE="9998887776"
PASS="5678"

# Register
curl -sS -X POST "$BASE/auth/partner/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Partner\",\"phone\":\"$PHONE\",\"passcode\":\"$PASS\",\"address\":\"Test addr\",\"city\":\"Delhi\",\"documents\":[]}"

# Login
curl -sS -X POST "$BASE/auth/partner/login" -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"passcode\":\"$PASS\"}" | tee /tmp/login.json

PARTNER_ID=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['data']['partnerId'])")

# List partners (admin)
curl -sS "$BASE/partners?search=$PHONE"

# RFQ (use a real productCode from GET /catalog)
CODE=$(curl -sS "$BASE/catalog" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0]['productCode'])")
curl -sS -X POST "$BASE/rfqs" -H "Content-Type: application/json" \
  -d "{\"partnerId\":\"$PARTNER_ID\",\"lines\":[{\"productCode\":\"$CODE\",\"quantity\":1}],\"deliveryMode\":\"storePickup\"}"

curl -sS "$BASE/rfqs"
```

---

## 9. Checklist for backend developer

- [ ] Deploy `server.py` that includes **`/auth/partner/register`** and **`/auth/partner/login`** (not only legacy `/partners/register`).
- [ ] Normalize **phone** on write and read (10-digit India).
- [ ] Store **`passcodeHash`** on register; never expose in JSON.
- [ ] On login, update **`lastAppLoginAt`** and **`loginCount`**.
- [ ] Set **`registeredVia: "mobile_app"`** on app register.
- [ ] **`GET /partners?search=`** works for duplicate detection.
- [ ] **`POST /rfqs`** validates `productCode` against catalog.
- [ ] On RFQ approve, write **`reward_ledger`** with `requesterId` = partner `id`.
- [ ] Confirm Render MongoDB is the same instance Dashboard admin uses.
- [ ] CORS / HTTPS: mobile app uses JSON POST from devices (no special headers except Bearer on `/me`).

---

## 10. If “user shows in Dashboard but RFQ / login stats don’t”

| Symptom | Likely cause |
| --- | --- |
| Partner row exists, **Logins = 0**, **Last app login = Never** | User never hit **`/auth/partner/login`** (only legacy register), or wrong API URL on app |
| **401** on login | Partner created without `passcodeHash` (old route) — re-register or admin migration |
| RFQ not in list | **400** validation (bad `productCode`), or RFQ saved to **different DB** than admin UI |
| Rewards 0 after approve | Approve API not run, or ledger `requesterId` ≠ `partnerId` |
| App “can’t connect” | Wrong `API_BASE_URL`, Render asleep, or TLS/firewall |

---

## 11. Optional later (not in app yet)

- Firebase OTP / password reset (app shows “Forgot password” placeholder).
- Push notification on RFQ approved (app polls RFQ list today).

---

*Generated for backend alignment with Shivani Constructions Flutter app — auth, RFQ, and rewards integration.*
