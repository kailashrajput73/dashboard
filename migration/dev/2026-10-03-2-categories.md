# Row 2 — categories

## What this row planned

Move the Expo Categories screen to `/categories`: list, search, active filter, create, edit, photo, activate/deactivate, linked product peek, and passcode-confirmed cascade delete. Build the photo-field and linked-product helpers required by this screen. Preserve Expo API calls and behavior.

## What was built

- Replaced the `/categories` placeholder with the category management screen.
- Added categories and matching catalog products loading, case-insensitive name search, and All / Active / Inactive filters.
- Added create/edit with category name and photo URL or uploaded image data URL.
- Added category active/inactive toggle.
- Added product count and expandable product peek list.
- Added passcode-confirmed cascade delete with the existing endpoint and deleted-product count message.
- Added web versions of the photo, remote image, linked-products, and passcode confirmation pieces used by this screen.
- No package or backend changes.

## Expo file → web file

| Expo file | Web file | What moved |
|---|---|---|
| `frontend/app/(admin)/categories.tsx` | `web/src/pages/CategoriesPage.tsx` | Category list, search/filter, create/edit, activation, linked products, cascade delete, errors and API calls |
| `frontend/app/(admin)/categories.tsx` route | `web/src/App.tsx` | Replaced the `/categories` placeholder with `CategoriesPage` |
| `frontend/src/components/CoverImageField.tsx` | `web/src/components/CoverImageField.tsx` | Photo preview, upload/replace/remove, URL field |
| `frontend/src/utils/pick-image.ts` | `web/src/components/CoverImageField.tsx` | Browser file input and `FileReader` conversion to a data URL; Expo native document-picker branch is not needed on web |
| `frontend/src/components/RemoteImage.tsx` | `web/src/components/RemoteImage.tsx` | Direct image, CDN, then API proxy fallback and placeholder |
| `frontend/src/components/LinkedProducts.tsx` | `web/src/components/LinkedProducts.tsx` | Product-count toggle and expandable product detail list |
| `frontend/src/components/PasscodeConfirmModal.tsx` | `web/src/components/PasscodeConfirmModal.tsx` | Admin contact prefill, passcode field, confirmation button and validation |
| `frontend/src/utils/money.ts` | `web/src/utils/money.ts` | Existing locale-aware price formatting used in product peek |
| `frontend/src/utils/size.ts` | `web/src/utils/size.ts` | Existing size labels used in product peek |
| `frontend/src/components/UI.tsx` | `web/src/components/UI.tsx` (existing row 1c file) | Existing Header, Input, Chip, Button, AppModal and ErrorModal reused unchanged |
| `frontend/src/components/UI.tsx` / `@expo/vector-icons` | `web/src/components/Icon.tsx` (existing row 1c file) | Existing web Ionicons reused; no new icon or dependency |
| `frontend/src/api/endpoints.ts` | `web/src/api/endpoints.ts` (existing row 1b file) | Existing `listCategories`, `createCategory`, `updateCategory`, `deleteCategoryCascade`, and `listCatalog` reused unchanged |
| `frontend/src/api/client.ts` | `web/src/api/client.ts` (existing row 1b file) | Existing request/token/error handling reused unchanged |
| `frontend/src/state/session.ts` | `web/src/state/session.ts` (existing row 1b file) | Existing `getAdmin` reused unchanged for destructive-action contact prefill |
| `frontend/src/theme.ts` | `web/src/theme.ts` (existing row 1a file) | Existing theme values reused unchanged |

## How it works

On mount, the page loads `GET /categories` and `GET /catalog` concurrently. Product counts and peeks match catalog items to a category by case-insensitive category-name equality, as in Expo. Search trims and lowercases the query; the status chips filter the loaded category list.

Create calls `POST /categories`; edit and status changes call `PUT /categories/{id}`. Category photo uploads are read locally by `FileReader` and sent as the same data URL string the Expo web picker uses; pasted URLs are sent as URLs. Deletion opens the contact/passcode confirmation modal and calls `POST /categories/{id}/delete-cascade`. Its response count is shown in the existing message modal.

## API calls used

- `GET /categories`
- `GET /catalog`
- `POST /categories`
- `PUT /categories/{id}`
- `POST /categories/{id}/delete-cascade`

All are existing endpoint functions in the row 1b API module. No endpoint or payload changes were made.

## Differences from Expo

- React Native views, text, touchables, `FlatList`, and activity indicator are replaced with semantic HTML, existing shared web UI components, inline styles, and the web spinner.
- Expo Router's back action is implemented by the existing web router's history navigation callback.
- The Expo native document picker branch is replaced by the browser file input and `FileReader`; the browser still accepts one image and produces a data URL. File-read failures are shown in the screen's existing error modal.
- `RemoteImage` uses `<img>` on web. It preserves the Expo web order: direct URL, `wsrv.nl` image CDN, API media proxy, then placeholder.
- `useFocusEffect` has no direct web equivalent here. The web screen loads once when mounted and reloads after its own mutations; leaving and returning to the route remounts it and reloads.
- The product peek size and money formatters are copied to web-local utility files because those Expo utilities were not previously present in `web/`.
- Native safe-area and platform-specific layout behavior are not applicable to the web shell.

## How to test

From `web/`, run `npm run build`, `npm run lint`, and `npm run dev`, then open `/categories`.

With the backend running and reachable:

1. Verify the category list and product counts load. Search by part of a category name; try All, Active, and Inactive.
2. Expand a product count and verify the peek shows its image, name, code/brand, size, and price.
3. Create a category with a photo selected from disk, then create or edit one with a picture URL. Verify the saved list/photo after reload.
4. Toggle a category active/inactive and verify its status and filter membership update.
5. Open delete, verify contact prefill, enter the required passcode, and confirm the category/subcategory/product cascade. Verify the returned removed-product count message.

Build and lint passed. Browser checks used intercepted API responses (not the real backend) and verified search, active filtering, linked-product expansion, file-to-data-URL selection and request payload, create, active toggle, and cascade-delete request/confirmation behavior. Real API persistence and backend reachability remain for testing against the running service.

## Left for later

The browser session used for this migration previously reported a refused API connection during row 1e. Categories should be tested against a running/reachable backend. If the browser reports CORS or mixed-content errors, leave the backend unchanged and handle deployment/network configuration separately.
