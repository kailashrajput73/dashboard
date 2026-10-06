# Row 8: Product groups

## Plan

Move Expo's product group list, create/edit, two-product minimum, secured cascade delete, and shelf price board hookup into the web app. Reuse the existing web API helpers, passcode modal, and `ShelfPriceBoard`; do not change the shared board or backend.

## Built

Added the Product Groups page to the existing web route. It loads groups and catalog products, supports group search and linked product expansion, and creates or edits groups from a searchable product selection. Saving requires a name and at least two selected products. Deletion uses the existing passcode-confirmation flow and cascade endpoint. Expanded groups render the existing `ShelfPriceBoard` when enabled and the existing linked-product list when disabled.

## Expo file to web file

- `frontend/app/(admin)/product-groups.tsx` -> `web/src/pages/ProductGroupsPage.tsx`
- `frontend/src/api/endpoints.ts` -> existing `web/src/api/endpoints.ts` wrappers for groups, catalog, and cascade deletion; no API wrapper changes.
- `frontend/src/features/shelf-price-board/ShelfPriceBoard.tsx` -> existing shared `web/src/features/shelf-price-board/ShelfPriceBoard.tsx`; imported and reused without changes.
- `frontend/src/components/PasscodeConfirmModal.tsx` -> existing shared `web/src/components/PasscodeConfirmModal.tsx`; reused without changes.
- Route registered in `web/src/App.tsx`.

## API calls

Uses `GET /product-groups`, `GET /catalog`, `POST /product-groups`, `PUT /product-groups/{id}`, and `POST /product-groups/{id}/delete-cascade`. The reused board uses the existing catalog pricing endpoints.

## Differences from Expo

- React Native controls and layout are replaced with the web UI kit, semantic HTML, and inline styles.
- Group editing uses a bounded, scrollable product list in the web modal. Route navigation uses the web router.
- The existing web AdminShell controls the page width. No shared component, endpoint wrapper, or backend behavior was changed.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 8. `npm run build` and `npm run lint` both pass in `web/`.

## Left for later

Browser verification with disposable test data is pending.