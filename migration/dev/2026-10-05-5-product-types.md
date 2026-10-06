# Row 5: Product types

## Plan

Port the standalone Expo Product Types screen, reusing the web photo, image, linked-product, passcode, and basic UI components. Preserve its type-list fallback, search/filters, photo-only editor, status toggle, and passcode-protected product purge. Leave Product Classes for row 6.

## Expo file to web file

- `frontend/app/(admin)/product-types.tsx` -> `web/src/pages/ProductTypesPage.tsx`: type list, search/filter, photo editor, status toggle, linked products, and product purge.
- Existing route in `web/src/App.tsx`: replaced the Product type placeholder with `ProductTypesPage`.
- `frontend/src/components/CoverImageField.tsx`, `RemoteImage.tsx`, `LinkedProducts.tsx`, `PasscodeConfirmModal.tsx`, and `UI.tsx` -> existing web counterparts: reused for photo upload/URL, images, linked products, passcode confirmation, and shared controls.
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts`: reused `listCatalog`, `listProductTypes`, `updateProductType`, and `purgeCatalogByField`.
- `frontend/src/config/env.ts` -> existing `web/src/config/env.ts`: reused `API_BASE_URL` in Expo's missing-types-endpoint message.

## How it works

The screen loads catalog products and product types. If the product-types endpoint is not found, Expo derives active type rows from distinct nonblank catalog `type` values, case-insensitively grouped and name-sorted; photo saves are then blocked with Expo's endpoint guidance. Other API errors are shown. Search and All/Active/Inactive filters operate on type names and active state.

Each row shows the type photo, linked-product count, status, photo action, delete action, and active toggle. Expanded linked products match catalog `type` to the displayed type name case-insensitively. The editor only changes the type photo. A blank image becomes `null` on save. Status changes update the active state.

Deleting from a type row does not delete the type record. It calls `POST /api/catalog/purge-by-field` with `field: "type"` and removes products of that type after admin passcode confirmation. The screen then reloads and shows `Removed X product(s) for <type>.`

## Differences from Expo

- React Native layout primitives and `FlatList` are rendered as HTML with inline styles; the existing web UI kit supplies the same controls.
- The shared web photo field uses a browser image file input and `FileReader` in place of Expo's document picker/file-system helper. It retains URL entry, removal, preview, and the shared error message callback.
- A mount-scoped web effect loads the page data; Expo also reloads on navigation focus. Route remounting performs the corresponding web load.
- API calls, fallback grouping, labels, filters, photo-only editing, status updates, linked-product matching, passcode flow, purge behavior, and visible messages match Expo.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 5. `npm run build` and `npm run lint` pass from `web/`. The browser smoke check loaded the live UPVC type and its product count.

## Left for later

- Row 6: Product Classes will use the Expo CMP-09 shared facet page migrated as a reusable web page.