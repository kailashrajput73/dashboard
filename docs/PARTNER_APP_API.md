# Partner mobile app API (`/api/app/*`)

Firebase phone OTP on the device; the API verifies the **Firebase ID token** (or dev token locally) and manages the `partners` row used by the admin **Referral Partners** screen.

**Stack:** FastAPI + PostgreSQL (`backend/`).  
**Envelope:** `{ "success": true, "data": {}, "error": null }` — on failure `success` is false and `error` is a string.

---

## Environment (server)

| Variable | Values | Purpose |
| --- | --- | --- |
| `AUTH_MODE` | `firebase` \| `dev` | Token verification mode |
| `ENV` | `development`, `production`, … | With `AUTH_MODE=dev`, **`production` refuses to start** |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | filesystem path | Required when `AUTH_MODE=firebase` (service account JSON from Firebase Console) |

**Never commit** the service account file. Add it on the VPS and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it.

---

## Authentication header

All `/api/app/*` routes require:

```http
Authorization: Bearer <token>
```

| Mode | Token |
| --- | --- |
| **Production** (`AUTH_MODE=firebase`) | Firebase **ID token** from the Flutter SDK after phone sign-in |
| **Local dev** (`AUTH_MODE=dev`) | `Bearer dev:<phone>` — e.g. `Bearer dev:9876543210` or `Bearer dev:+919876543210` |

Phone in the token is normalized to **10-digit India mobile** for storage and matching. **`uid` and phone come only from the verified token**, never from the JSON body.

Responses **never** include `passcodeHash` or `firebaseUid`.

---

## App flow

1. User completes **Firebase phone auth** in Flutter → obtain ID token.
2. `POST /api/app/session` — create or link partner, bump login stats.
3. `GET /api/app/me` — refresh profile on app open (no push).
4. `PUT /api/app/profile` — name, business, address fields.
5. `POST /api/app/kyc` — PAN + optional Aadhaar last 4 + document URLs.
6. Admin approves in dashboard → `PUT /api/partners/{id}/kyc` (existing admin API).
7. `GET /api/app/me` again → `kycStatus: "approved"`, `appActive: true`.

---

## Endpoints

### `POST /api/app/session`

Idempotent. Finds partner by `firebase_uid`, else by normalized phone (links legacy passcode partners), else creates:

- `kycStatus: "pending"`, `kycSubmitted: false`, `registeredVia: "firebase"`, `appActive: false`
- Updates `lastAppLoginAt`, increments `loginCount`

**Response `data`:** partner profile (same shape as `/me`).

---

### `GET /api/app/me`

Current partner profile including `kycStatus`, `kycSubmitted`, `rejectionReason`, `appActive`, `documents`, PAN fields after KYC.

**401** — invalid/missing token (envelope).  
**404** — no partner row yet (call `/session` first).

---

### `PUT /api/app/profile`

Body (all optional; unknown fields ignored):

```json
{
  "name": "Rajesh Kumar",
  "businessName": "RK Plumbing",
  "address": "12 Market Road",
  "pincode": "380001",
  "city": "Ahmedabad",
  "area": "Navrangpura"
}
```

Cannot change `phone`, `kycStatus`, `rewardPoints`, etc.

---

### `POST /api/app/kyc`

```json
{
  "panNumber": "ABCDE1234F",
  "aadhaarLast4": "1234",
  "documents": ["https://storage.example/kyc.pdf"],
  "kycMethod": "manual"
}
```

- PAN: `^[A-Z]{5}[0-9]{4}[A-Z]$` (uppercased server-side)
- `aadhaarLast4`: optional, exactly 4 digits — **full Aadhaar is never stored**
- `documents`: max 5 URL strings

Allowed when `kycStatus` is `pending` and `kycSubmitted == false`, or when `kycStatus` is `rejected` (resubmit). Sets `kycSubmitted: true`, `kycStatus: "pending"`, clears `rejectionReason`.

**400** — invalid PAN or wrong state (e.g. second submit while already submitted pending).

---

## Error codes (representative)

| HTTP | `error` | When |
| --- | --- | --- |
| 401 | `Invalid or missing token` | Bad/missing Bearer |
| 403 | `KYC_NOT_APPROVED` | Reserved dependency for future gated routes (not on catalog/cart in this round) |
| 404 | `Partner not found` | `/me` before session |
| 409 | `Partner phone is linked to another account` | Phone owned by another Firebase uid |

---

## Local curl (dev mode)

```bash
# Session + profile
curl -s -X POST http://127.0.0.1:8001/api/app/session \
  -H "Authorization: Bearer dev:9876543210"

curl -s http://127.0.0.1:8001/api/app/me \
  -H "Authorization: Bearer dev:9876543210"

curl -s -X PUT http://127.0.0.1:8001/api/app/profile \
  -H "Authorization: Bearer dev:9876543210" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev Partner","businessName":"Test Shop"}'

curl -s -X POST http://127.0.0.1:8001/api/app/kyc \
  -H "Authorization: Bearer dev:9876543210" \
  -H "Content-Type: application/json" \
  -d '{"panNumber":"ABCDE1234F","documents":[]}'
```

Ensure `backend/.env` has `AUTH_MODE=dev` and `ENV=development`.

---

## Admin visibility

No admin UI changes. Firebase partners appear on `GET /api/partners` like any other partner. Approve with existing `PUT /api/partners/{id}/kyc`.

Legacy **passcode** routes (`POST /api/auth/partner/register`, `login`, `GET /api/auth/partner/me`) remain unchanged.
