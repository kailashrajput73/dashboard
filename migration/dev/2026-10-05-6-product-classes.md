# Row 6: Product classes

## Plan

Port Expo's CMP-09 catalog facet page as a reusable web component, then use a thin Product Classes page wrapper with Expo's class inference, linked-product matching, search, and passcode-protected purge. Product Types is a separate Expo screen and does not use CMP-09.

## Expo file to web file

- `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx` -> `web/src/features/catalog-taxonomy/CatalogFacetPage.tsx`: shared facet list, count expansion, search, and purge modal.
- `frontend/app/(admin)/product-classes.tsx` -> `web/src/pages/ProductClassesPage.tsx`: thin page wrapper configuring the shared facet component for `productClass`.
- `frontend/src/utils/csv.ts` (`inferProductClass`) -> `web/src/utils/infer-product-class.ts`: the class inference rule used when an explicit productClass is missing.
- `frontend/src/features/catalog-taxonomy/CatalogFacetPage.tsx` (`groupCatalogFacet`) -> `web/src/features/catalog-taxonomy/group-catalog-facet.ts`: case-insensitive grouping and sorted facets.
- Existing route in `web/src/App.tsx`: replaced the Product class placeholder with `ProductClassesPage`.
- `frontend/src/components/LinkedProducts.tsx`, `PasscodeConfirmModal.tsx`, and `UI.tsx` -> existing web counterparts: reused count/list, passcode confirmation, header/input, and error UI.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: reused `listCatalog` and `purgeCatalogByField`; no API changes.

## How it works

The page loads catalog products and groups facets by the configured `valueOf` value, falling back to `inferProductClass`, trimming values, grouping case-insensitively, and sorting by display name. The Product Classes wrapper reads explicit `productClass`. Inference preserves Expo's supported patterns from product `name` and `productName`: SDR 13.5, SDR 11, Schedule/Sch 80, and Schedule/Sch 40; inferred labels normalize to `SDR13.5`, `SDR11`, `Sch 80`, or `Sch 40`.

Search filters facet names; the subtitle shows the filtered count against the total. Expanding a facet displays matched products and their count. Deleting calls `POST /api/catalog/purge-by-field` with `field: "productClass"`, the facet name, contact number, and passcode. It removes products whose stored `productClass` matches the value case-insensitively, reloads the catalog, and shows `Removed X product(s) for <class>.` The confirmation text is `Removes every product with this value. Requires admin passcode.`

## Differences from Expo

- React Native layout and `FlatList` are rendered as HTML with inline styles. Shared web count/list, passcode, input, and error components are reused; no existing shared component was changed.
- The inference helper lives in its own small web utility rather than adding code to the shared CSV reader; row 3b behavior remains unchanged.
- The screen loads when its web route mounts; Expo also reloads on navigation focus.
- API calls, facet grouping, sorting, filtering, inferred values, linked products, confirmation copy, purge field, and success/error messages follow Expo.
- As in Expo, the purge API filters stored `productClass` values. A legacy product visible only because its name inferred a class but with no stored class value may not be removed by that purge.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 6. `npm run build` and `npm run lint` pass from `web/`. The browser smoke check loaded two live class facets and their catalog counts without API/CORS errors.

## Left for later

- Product Types remains its separate row 5 page; it does not reuse CMP-09 in Expo.