# Row 3a — subcategories

## What this row planned

Move the Expo Subcategories list, parent filter, search, create/edit form, linked-product peek, and passcode-confirmed delete to `/subcategories`. Reuse the row 1c UI and row 2 linked-product and passcode-confirmation parts. Do not add import/export/template controls or shelf price board.

## What was built

- Replaced the `/subcategories` placeholder with the subcategory management screen.
- Preserved API-returned subcategory order; no client sorting was added.
- Added search across subcategory and parent category names, and parent category filter chips.
- Added create/edit using the Expo fields: Subcategory name and Parent category.
- Reused the existing row 2 linked-product count and peek list, and passcode confirmation modal.
- Added cascade delete through the existing endpoint.
- No package changes; no changes to `frontend/` or `backend/`.

## Expo file → web file

| Expo file | Web file | What moved |
|---|---|---|
| `frontend/app/(admin)/subcategories.tsx` | `web/src/pages/SubcategoriesPage.tsx` | List in API order, search, parent filters, create/edit, linked product matching/peek, validation, delete and error messages |
| `frontend/app/(admin)/subcategories.tsx` route | `web/src/App.tsx` | `/subcategories` now renders `SubcategoriesPage` |
| `frontend/src/api/endpoints.ts` | `web/src/api/endpoints.ts` (existing row 1b file) | Existing `listCategories`, `listSubcategories`, `listCatalog`, `createSubcategory`, `updateSubcategory`, and `deleteSubcategoryCascade`, reused unchanged |
| `frontend/src/api/client.ts` | `web/src/api/client.ts` (existing row 1b file) | Existing `ApiError` and request/token behavior, reused unchanged |
| `frontend/src/components/UI.tsx` | `web/src/components/UI.tsx` (existing row 1c file) | Existing `Header`, `Input`, `Chip`, `AppModal`, `Button`, and `ErrorModal`, reused unchanged |
| `frontend/src/components/LinkedProducts.tsx` | `web/src/components/LinkedProducts.tsx` (existing row 2 file) | Existing `CountButton` and `List` exports, reused unchanged |
| `frontend/src/components/PasscodeConfirmModal.tsx` | `web/src/components/PasscodeConfirmModal.tsx` (existing row 2 file) | Existing contact prefill, passcode input, confirm disabled state and callback, reused unchanged |
| `frontend/src/theme.ts` | `web/src/theme.ts` (existing row 1a file) | Existing web theme values, reused unchanged |

## How it works

On mount, the page concurrently loads categories, subcategories, and catalog products using the existing API functions. The category filter chips are “All” followed by every returned category in API order, including inactive categories. Search is case-insensitive and matches the combined subcategory and parent category names. Subcategory rows retain the API order.

Each product count and peek uses Expo's match rule: a matching `subcategoryId` links directly; otherwise, the product must have the same category name and its subcategory name or product type must match the subcategory name, case-insensitively. The count displays the matched product count when nonzero, otherwise the API-provided `productCount`.

Create defaults the parent to the first active category, falling back to the first category if none are active. Edit fills the existing name and parent. Saving requires a nonblank name and a parent ID and uses the exact Expo validation message: “Subcategory name and parent category are required.” The name is trimmed before calling the API.

## Parent category selector

Expo shows active categories only in the “Select parent category” modal. It does not search the list. Choosing a category sets it as the parent and closes the modal. The web version uses the same modal title, active-only options, selected checkmark, no search, and close-after-selection behavior. The parent-filter chips remain separate and include inactive categories.

If there are no categories, the form selector reads “Select category”; opening it shows the titled modal with no options and no added empty-state message. Submitting without a parent uses the same required-field message. If categories exist but none are active, create defaults to the first category as Expo does, while the picker itself still lists active categories only.

## API calls used

- `GET /categories`
- `GET /subcategories`
- `GET /catalog`
- `POST /subcategories`
- `PUT /subcategories/{id}`
- `POST /subcategories/{id}/delete-cascade`

All calls use existing row 1b endpoint wrappers; no API functions or payloads changed.

## Differences from Expo

- React Native layout, `FlatList`, `TouchableOpacity`, and `ActivityIndicator` are rendered with HTML, inline web styles, and the existing web spinner. The rows are rendered in the same order returned by the API.
- Expo Router back navigation uses the browser router's existing navigation callback.
- Expo's horizontal `FlatList` of parent chips is a horizontally scrollable web flex row.
- Expo's parent picker uses touchable options; web uses buttons with the same active-only options, selection check, and close action.
- The screen fetches on mount and after its own create/edit/delete actions. It does not use Expo's `useFocusEffect`.
- The row 2 reusable linked-product and passcode-confirmation components were reused without changes.
- The batch product-import navigation button is not included because its destination belongs to a later import phase and is outside row 3a.

## How to test

From `web/`, run `npm run build`, `npm run lint`, and `npm run dev`; open `/subcategories`.

With the backend running and reachable:

1. Verify rows remain in API order. Search by part of a subcategory name and by part of its parent name.
2. Choose All and each parent filter chip, including an inactive category.
3. Expand a product count and verify linked product details.
4. Create a subcategory and confirm only active categories appear in the parent picker. Edit its name and parent.
5. With no categories, confirm the parent picker is empty and saving without a parent shows the required-fields message.
6. Delete a subcategory, verify the modal text, enter the admin contact and passcode, and confirm the response's removed-product count message.

Build and lint passed. The configured API was unreachable during browser checks, so real list and mutation persistence could not be verified. Verify those actions against the running backend.

## Left for later

- Row 3b: subcategory CSV import, CSV export, and the subcategory template control are not present on this page.
- Row 3c: the shelf price board is not present on this page.
- The Expo batch-product-import navigation target belongs to a later import phase and is not included in row 3a.
- The backend was unreachable in this environment; real API persistence still needs browser testing. No backend change or workaround was made.
