# RFQ admin flow + master-data CSV gaps

**Date:** 2026-09-20 (after commits `7930fa4`, `8ecc5b2`)  
**Scope:** Admin panel only — not partner app, not analytics dashboard.

## RFQ — what to demo (end-to-end on admin)

1. **List** with filters: All, Pending, Approved, Rejected, **Dispatched**.
2. **Search** by partner id, product code, or product name.
3. **Export** (download icon) — CSV of all visible RFQs and lines.
4. **Create RFQ (manual)** — for testing when partner app is not wired; uses partner id + product + qty.
5. **Pending RFQ** — open row → special discount % → pickup/delivery + schedule → **Approve** (rewards calculated server-side) or **Reject**.
6. **Approved RFQ (shop counter)** — open row → **edit lines**:
   - Change qty, remove line.
   - **Scan or type product code** (same as QR payload) → Add product → **Save line changes** (`PUT /api/rfqs/{id}`).
7. **Dispatch** — from approved RFQ detail → **Dispatch & deduct stock** (creates dispatch, marks RFQ `dispatched`, reduces stock).

Partner mobile create + push notifications remain **out of scope** for this repo.

## Master-data gaps closed (same release)

| Module | Added |
|--------|--------|
| **Subcategories** | CSV **import** (name + category columns) alongside existing export |
| **Catalog** | CSV **export** of filtered list (download on catalog header) |
| **Purchases** | CSV **export** of purchase history |

Category, brand, product groups unchanged (already complete for your scope).

## Backend note

- RFQ line save recalculates **`grandTotal`** on `PUT /rfqs/{id}`.
- Deploy `server.py` to Render when using cloud API.

## Files touched

`frontend/app/(admin)/rfqs.tsx`, `catalog.tsx`, `purchases.tsx`, `subcategories.tsx`, `backend/server.py` (RFQ update).
