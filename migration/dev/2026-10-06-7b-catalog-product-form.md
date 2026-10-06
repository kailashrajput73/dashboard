# Row 7b: Catalog product form

## Plan

Move Expo's Add/Edit product form into a local web feature component. Preserve the required name/unit/category/brand/rate checks, empty optional code (backend-generated), category-dependent pickers, all field defaults, pricing recalculation, image upload/URL, and API payloads.

## Expo file to web file

- `frontend/app/(admin)/catalog.tsx` -> `web/src/features/catalog/CatalogProductEditor.tsx`: Add/Edit form, validation, dependent category/subcategory/brand pickers, quick category creation, and image controls.
- `frontend/app/(admin)/catalog.tsx` -> `web/src/pages/CatalogPage.tsx`: add/edit actions, data loading for brands/subcategories, and calls to create/update catalog APIs.
- Existing web `UI`, `RemoteImage`, money/pricing/size utilities and API endpoints are reused; no shared component or endpoint changes.

## How it works

The form requires item name, unit, category, brand, and a parseable standard rate. Product code begins blank on create and is sent as `undefined` when left empty; the backend generates it. Category changes clear a subcategory no longer under that category. Subcategory choices are restricted to that category, brand choices include active brands only, and the category picker can create a category. MRP and price-discount edits recalculate selling price; selling price also updates standard rate. Aliases split on commas. Hindi/Gujarati names are sent in `multilingualNames` under `hi`/`gu`.

Create calls `POST /api/catalog`; edit calls `PUT /api/catalog/{id}`. Image uploads become data URLs in the browser, while pasted URLs are saved as entered. The existing backend decides generated product code, QR value, taxonomy, and defaults.

## Differences from Expo

- The form and picker dialogs use web HTML controls and the existing web `AppModal`, `Input`, and `Button`; no shared component was changed.
- Expo Web reads its picked image using the document picker's browser asset. The web uses an `image/*` input and `FileReader` to create the equivalent data URL; its error remains `Could not read selected product image`.
- Product code remains blank until the backend response; the web does not generate it.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7b. `npm run build` and `npm run lint` pass from `web/`.

## Left for later

- 7c row pricing/bulk actions; 7d QR; 7e export and delete decision.