# PARTNER — flow & API (later)

## FIX-08 — Admin partners (test steps 18–19)

List and KYC work on refactor VPS. **Open design topic:** partner registers/logs in on mobile app → KYC pending → admin approves → app active → RFQ. Document end-to-end when mobile UX is defined.

**Admin screen:** `frontend/app/(admin)/partners.tsx`  
**Docs:** `docs/PARTNER_APP_INTEGRATION.md`, `docs/MOBILE_APP_API_HANDOFF.md` (may be gitignored on some clones — copy from home if missing).

---

## FIX-09 — Partner API checks (steps 29–31)

Pending while frontend/mobile developer works in progress. When ready, verify on **same VPS refactor URL**:

| # | Endpoint | Purpose |
|---|----------|---------|
| 29 | `POST /api/auth/partner/login` | Token + partnerId |
| 30 | `GET /api/catalog` or `/api/catalog/tree` | Browse |
| 31 | `POST /api/rfqs` | Creates pending RFQ visible in admin |
