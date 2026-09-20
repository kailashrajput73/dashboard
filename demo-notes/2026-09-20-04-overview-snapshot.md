# Overview operations snapshot

**Date:** 2026-09-20  
**Why:** Demo-ready home screen — live pulse without full analytics phase.

## What to show on login (Overview)

**Operations snapshot** (one API call: `GET /api/dashboard/snapshot`):

| Tile | Meaning |
|------|---------|
| SKUs | Product count |
| Units in stock | Sum of catalog `stock` |
| Low stock (ROL) | Count at or below reorder level |
| RFQ pending / approved / dispatched | Status counts |
| Partners (KYC OK) | `approved / total` partner records |
| Dispatch value (7d) | Sum of dispatch line qty × price last 7 days; **—** if no dispatches |

**Panels:**

- **Needs review** — up to 5 pending RFQs (tap → RFQ screen).
- **Moving fast (30d)** — top 5 products by dispatch qty.
- **In stock, not moving (30d)** — stocked SKUs with zero dispatch qty in window (top 5 by stock).

Tiles are **tappable** and jump to the relevant module.

## What to tell client

> “This is an **operations snapshot** from real RFQ, stock, partner, and dispatch data. Full monthly reports and partner-app analytics are a later phase.”

## Deploy

Render must include `GET /dashboard/snapshot` in `server.py` or Overview shows the fallback error line.

## Files

`backend/server.py`, `frontend/app/(admin)/dashboard.tsx`, `frontend/src/api/endpoints.ts`
