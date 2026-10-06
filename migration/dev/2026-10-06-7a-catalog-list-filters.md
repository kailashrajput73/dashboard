# Row 7a: Catalog list, search, and filters

## Plan

Port the Expo web catalog listing to the existing `/catalog` route: load catalog and categories, show category chips and dependent type/class/brand filters, implement Expo search, and render the web table/empty state using existing shared UI and image components.

## Expo file to web file

- `frontend/app/(admin)/catalog.tsx` -> `web/src/pages/CatalogPage.tsx`: list data, search, category/type/class/brand filters, table headings, and empty/loading states.
- Existing `/catalog` route in `web/src/App.tsx`: now renders `CatalogPage`.
- `frontend/src/components/UI.tsx`, `RemoteImage.tsx`, and `frontend/src/utils/inferProductClass`, `size.ts`, `money.ts` -> existing web components/helpers: reused rather than duplicated.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: `listCategories` and `listCatalog`; no API changes.

## How it works

Loads the category list and sorted catalog data. Category chips reset type, class, and brand filters when changed. The filter modal builds type, inferred class, and brand options from catalog rows with Expo's dependency behavior. Search matches item name, product code, brand, and aliases, case-insensitively. The table shows the product, size, inch, length, MRP, discount, selling, and stock values; it displays the filtered and total item counts.

## Differences from Expo

- Expo's web table branch is represented as an HTML horizontally scrollable table-like layout; Expo's native `FlatList`/cards are not used.
- Loading/error and shared control rendering use existing web components and browser markup. Filter/search rules and visible text are carried over.
- Later 7b–7e controls are intentionally not included in this 7a slice.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7a. `npm run build` and `npm run lint` pass from `web/`.

## Left for later

- 7b product form; 7c single/bulk pricing; 7d QR; 7e CSV and secured delete.