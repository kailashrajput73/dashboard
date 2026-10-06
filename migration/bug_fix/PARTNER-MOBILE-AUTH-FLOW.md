# Partner mobile app — auth, Firebase, and data flow (prep)

**Status:** Planning only — **no Firebase in backend yet**  
**Updated:** 2026-10-05  
**Audience:** You, mobile app developer, future agent chats  
**Live contract today:** `docs/PARTNER-API.md` (phone + passcode + API bearer token)

---

## Two different “users” (do not mix them)

| Who | Login today | Where data lives |
|-----|-------------|------------------|
| **Admin / staff** | `POST /auth/admin/login` (contact + passcode) | `users` collection |
| **Referral partner (mobile app)** | `POST /auth/partner/login` (phone + passcode) | `partners` + `partner_tokens` |

Firebase (when you add it) applies to the **partner mobile app**, not the Expo admin panel. Admin can stay on passcode until you decide otherwise.

---

## How it works **today** (before Firebase)

```text
Mobile app                          API (backend_refactor)              MongoDB
──────────                          ─────────────────────              ───────
User enters phone + passcode  →     POST /auth/partner/login     →     partners (passcodeHash)
                                    creates row in partner_tokens       partner_tokens (token → partnerId)
App stores token + partnerId  →     GET /auth/partner/me         →     same partner row + rewardBalance

Browse (no extra auth on most reads):
  GET /catalog/tree, GET /catalog, filters…

Submit cart as RFQ (recommended: only if kycStatus === "approved"):
  POST /rfqs  { partnerId, lines, deliveryMode, … }

Admin:
  Referral Partners screen → PUT /partners/{id}/kyc → appActive, kycStatus
```

**Important:** The API does **not** see Firebase OTP. Flutter mock OTP `123456` is phone-only UI today. Identity on the server is **canonical phone + passcode**.

Register path: `POST /auth/partner/register` (name, phone, passcode, optional address/business fields) → `kycStatus: pending`, `appActive: false`.

---

## How it should work **with Firebase** (target — not built yet)

Firebase answers: “Is this person allowed to use the app?” (phone/email/Google, etc.)  
Your API answers: “Who is this **partner** in our business DB, what can they do (KYC tier), cart, RFQ, rewards?”

### Recommended link between Firebase and Mongo

1. User signs in with **Firebase Auth** on the device → app gets a **Firebase ID token** (and usually `uid`, phone, email).
2. App calls a **future** backend endpoint (name TBD, e.g. `POST /auth/partner/firebase/session`):
   - App sends `Authorization: Bearer <firebase_id_token>` (or token in body once).
   - Backend **verifies token with Firebase Admin SDK** (server-side only — not in repo until you add it).
   - Backend finds or creates `partners` row:
     - **Match key:** `firebaseUid` (new field) and/or canonical `phone` from Firebase.
   - Backend returns the **same shape as today:** `{ token, partnerId, partner }` using existing `partner_tokens` (or JWT later).

Until that endpoint exists, mobile dev should keep **phone + passcode** against `docs/PARTNER-API.md`.

### Fields to add on `partners` when Firebase lands (backend task later)

| Field | Purpose |
|-------|---------|
| `firebaseUid` | Stable link Firebase ↔ Mongo partner |
| `email` | From Firebase if used |
| `profileType` | e.g. `individual` \| `business` |
| `pan` | KYC / billing |
| `gstin` | Business GST (admin `users` already have gstin; partners do not yet) |
| `profileComplete` | bool or `%` for app gating |
| `kycDocuments` | URLs or storage refs (today: `documents: string[]`) |

Do **not** implement these until Firebase project + mobile SDK are chosen; this list is so you do not forget.

---

## Progressive access (your product idea)

Normal flow: user can **look around** before admin approves KYC. Stricter actions ask for **profile / KYC** data.

Suggested tiers (app enforces; API should eventually enforce on sensitive routes):

| Tier | Login | Catalog / prices | Cart | RFQ `POST /rfqs` | Rewards |
|------|--------|------------------|------|------------------|---------|
| **Guest** (optional) | None or Firebase anonymous | Limited browse (you choose: categories only, or hide `sellingPrice`) | No | No | No |
| **Signed in, minimal** | Firebase + API token, `kycStatus: pending` | Full `GET /catalog` | Yes (local cart) | **Block** until profile + KYC rules met | Read-only maybe |
| **Profile complete, KYC pending** | Same | Full | Yes | **Block** or “submit for review” only — **today API allows POST**; app should block until `approved` (see PARTNER-API) | No earn until approve |
| **KYC approved** | Same, `appActive: true` | Full | Yes | **Allow** `POST /rfqs` | Yes after admin approve RFQ |

**When to collect PAN, address, business, GSTIN**

| Moment | Collect (suggested) |
|--------|---------------------|
| First open after Firebase | Name, mobile (from Firebase), optional display name |
| Profile screen anytime | Address, pincode, city, area, `businessName`, `profileType` |
| First **checkout / RFQ / pay** | PAN, GSTIN (if business), upload documents → `documents[]` |
| Admin | Approve/reject KYC; optional location verified |

**Backend today:** `PartnerIn` / register already accept `address`, `businessName`, `pincode`, `city`, `area`, `salesManager`, `documents`.  
**Missing today:** `PATCH /partners/{id}/profile` for app to update after register (only admin KYC PUT exists). **Future agent:** add partner-self `PUT /partners/me` with bearer token when mobile needs profile edits without re-register.

---

## APIs mobile dev needs **now** (no Firebase)

Public or low-friction reads (no partner token):

- `GET /catalog/tree`, `GET /catalog` (+ query filters)
- `GET /categories`, `/brands`, `/subcategories`, etc. (see PARTNER-API)

Partner auth:

- `GET /partners?search=<phone>` — duplicate check before signup
- `POST /auth/partner/register`
- `POST /auth/partner/login`
- `GET /auth/partner/me`

After login (bearer token):

- `GET /rfqs?partner_id=`
- `POST /rfqs` (gate in app until KYC approved)
- `GET /partners/{partnerId}/rewards`
- `GET /rfqs/{id}/history`

**Do not expose admin routes** on the app (imports, approve, dispatch, wipe) — table in PARTNER-API.

---

## APIs to plan **when Firebase is ready** (not implemented)

| Endpoint | Role |
|----------|------|
| `POST /auth/partner/firebase/session` (name TBD) | Verify Firebase ID token → issue API `partner_tokens` + `partnerId` |
| `PUT /auth/partner/me` or `PATCH /partners/me` | Update profile / PAN / GSTIN / documents with bearer token |
| Optional `GET /config/partner-app` | Feature flags: guest browse, required fields before RFQ |

Mobile dev checklist before switching auth:

1. Firebase project ID + which providers (phone, Google, …).
2. Whether passcode stays as **second factor** or is removed after Firebase.
3. Canonical phone rules (already in PARTNER-API: 10 digits, strip `+91`).
4. Same `EXPO_PUBLIC_BACKEND_URL` / API base as admin VPS refactor.

---

## Admin panel (this repo) vs mobile

| Event | Admin sees |
|-------|------------|
| Register (mobile or future Firebase sync) | New row, `kycStatus: pending`, `registeredVia: mobile_app` |
| Login | `lastAppLoginAt`, `loginCount++` |
| Profile/KYC docs (future) | Documents count, history (UI gaps — separate SOW chat) |
| RFQ submitted | RFQ Management `pending` |
| KYC approve | `appActive: true` — app may enable RFQ |
| RFQ approve | Rewards ledger |

Partner **purchase history** on `GET /partners/{id}` is empty in practice because stock-in purchases do not set `partnerId` on purchase rows — partner “sales” = **RFQs**, not supplier purchases.

---

## Related files

| File | Use |
|------|-----|
| `docs/PARTNER-API.md` | Current mobile contract |
| `migration/bug_fix/PARTNER.md` | FIX-08 / FIX-09 backlog |
| `migration/bug_fix/OWNER-SIGNOFF.md` | Your one end-to-end test pass |
| `backend_refactor/services/auth_service.py` | Partner register/login/me |
| `backend_refactor/services/partners_team_service.py` | Admin list, KYC review, `POST /partners` direct create |

---

## When you get Firebase credentials

Add a short note here (no secrets in git):

- Firebase project name: _TBD_
- Auth providers enabled: _TBD_
- Mobile package/bundle id: _TBD_
- Backend verify: Admin SDK service account stored on **VPS env only** (_not_ in repo)

Then open a chat: **“Partner Firebase session endpoint”** with link to this file.
