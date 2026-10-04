# Row 3c: Subcategory shelf price board

## Planned and built

Moved Expo's optional shelf price board into the React web Subcategories screen. It appears when a user expands a subcategory with matched products and the feature flag is enabled. Product Groups remain unchanged; the board is a reusable web feature for that later row. No packages were added, and `frontend/` and `backend/` were not changed.

## Expo file to web file

- `frontend/src/features/shelf-price-board/ShelfPriceBoard.tsx` -> `web/src/features/shelf-price-board/ShelfPriceBoard.tsx`: price board layout, grouped SKU rows, local edits, single-size save, and bulk discount.
- `frontend/src/features/shelf-price-board/enabled.ts` and `index.ts` -> `web/src/features/shelf-price-board/enabled.ts` and `index.ts`: static feature flag and reusable exports.
- `frontend/app/(admin)/subcategories.tsx` -> `web/src/pages/SubcategoriesPage.tsx`: matched products are grouped by product group (or `Ungrouped`) and rendered as a board under each expanded subcategory.
- `frontend/src/utils/size.ts`, `money.ts`, and `pricing.ts` -> existing `web/src/utils/size.ts`, `money.ts`, and `pricing.ts`: reused for size labels, money formatting, and MRP/discount math.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: reused the web wrappers for individual and bulk catalog pricing.

## How it works

The screen matches catalog items to a subcategory by `subcategoryId`, or by matching category and subcategory/type names, just as Expo does. On expansion, matched items are grouped by product group (blank groups become `Ungrouped`). Each board then groups SKUs by length (blank lengths become `No length`). The board retains Expo's MRP, Disc %, Sell, product-code and size fields, displayed selling price, default values, recalculation rules, button labels, and validation/error messages.

Saving a size uses `PATCH /api/catalog/{id}/pricing` through the existing web API helper, which falls back to `PUT /api/catalog/{id}`. Applying a discount calls `POST /api/catalog/pricing-bulk` through the existing helper, which falls back to saving each item individually. After a successful change, the Subcategories page reloads its catalog data so the board reflects the saved values.

The web flag is `SHELF_PRICE_BOARD_ENABLED`, a source-code constant set to `true`, matching Expo. It is not a persisted setting; Settings has no switch for it. When disabled or when a subcategory has no matched products, the existing linked-product list remains in place. Product Groups can import the feature in row 8; that integration is not part of this row.

## Differences from Expo

- React Native `View`, `Text`, `StyleSheet`, `ActivityIndicator`, and input controls are replaced by semantic HTML, inline React styles, the web UI kit, and its spinner.
- Catalog API data, pricing endpoints and fallback behavior, calculations, control text, grouping rules, and visibility rules are reused without backend changes.
- The board is placed inside the existing web subcategory card/expanded content. No Settings switch was added because Expo's flag is only a static code constant.
- The current shared web AdminShell keeps its desktop-width sidebar on narrow viewports, leaving too little room for page content at 390px. This pre-existing shell behavior is outside row 3c and was not changed; test the board at desktop width.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 3c. The web production build and lint both pass.

## Left for later

- Row 8: render this reusable board for Product Groups. The component and flag are exported for that use, but the Product Groups screen was not changed.