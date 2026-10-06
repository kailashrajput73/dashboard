# Row 7c: Catalog pricing

## Plan

Port Expo Web's inline pricing and stock table: editable MRP, discount, selling price, and quantity per row, plus bulk discount/stock controls scoped to currently listed products. Reuse the existing web pricing API helpers and formulas.

## Expo file to web file

- `frontend/app/(admin)/catalog.tsx` (`PricingRow`, `applyListed`) -> `web/src/features/catalog/CatalogPricingRow.tsx` and `web/src/pages/CatalogPage.tsx`.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: reused `updateCatalogPricing` and `applyCatalogPricingBulk`, including their endpoint fallbacks.
- `frontend/src/utils/pricing.ts` -> existing `web/src/utils/pricing.ts`: reused MRP/discount/selling calculations.

## How it works

MRP or discount edits recalculate selling price. Editing selling price recalculates discount when MRP is positive. Save validates all four numeric fields and reports Expo's exact validation message. Single-row saves call `PATCH /api/catalog/{id}/pricing` through the existing wrapper; if its server fallback is needed, the wrapper uses `PUT /api/catalog/{id}`. Bulk discount and stock call `POST /api/catalog/pricing-bulk` through the existing helper and fall back per product when applicable.

Bulk discount and bulk stock apply to the **currently listed products** (after search and filters), exactly as Expo does; each action can therefore change many products at once. Nonzero skipped counts show Expo's `Updated X, skipped Y.` message.

## Differences from Expo

- Expo Web's table is represented with HTML/CSS and browser number-input modes; formulas, validation, test identifiers, button text, API helpers, and current-filter scope are retained.
- The row editor is an isolated `CatalogPricingRow` component. No shared component or API helper was modified.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7c. `npm run build` and `npm run lint` pass from `web/`.

## Left for later

- 7d QR; 7e short CSV and the web-only delete decision.