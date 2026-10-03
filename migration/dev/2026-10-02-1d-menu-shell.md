# Row 1d — menu shell and placeholder pages

## What this row planned

Port the Expo web admin sidebar, browser routes for its 18 menu items, and a shared empty placeholder page. Keep the taxonomy menu setting behavior; do not add authentication, route protection, role filtering, login, or redirects.

## What was built

- Added the web sidebar with Expo section names, item names, icons, order, active/hover/pressed styling, company subtitle, and sign-out action.
- Added a route for each menu URL. Each renders the shared `EmptyPage` component.
- Added the shared taxonomy settings adapter using the existing Expo localStorage keys and defaults.
- `/` and `/login` render the same shared placeholder component without the sidebar; there is no login or redirect behavior.
- Added `react-router-dom` pinned to `7.18.4`, the only dependency added in this row.
- Kept `web/src/DevPreview.tsx`; it is no longer imported by `App.tsx` and is not reachable as an application page. It can be restored by importing/rendering it from `App.tsx` during development, then row 1e removes it.

## Expo file → web file

| Expo file | Web file | What moved |
|---|---|---|
| `frontend/src/components/AdminShell.tsx` | `web/src/components/AdminShell.tsx` | Sections, exact menu items/order/URLs, icons, active state, company subtitle, sign-out |
| `frontend/app/(admin)/_layout.tsx` | `web/src/App.tsx` | Route composition and the shared menu shell |
| Expo Router route files under `frontend/app/`, mapped in `migration/INVENTORY.md` | `web/src/App.tsx` | Browser URL-to-placeholder route list |
| `frontend/src/features/catalog-taxonomy/settings.ts` | `web/src/features/catalog-taxonomy/settings.ts` | Same persisted taxonomy flags and defaults |
| `frontend/src/state/session.ts` | `web/src/state/session.ts` (existing row 1b file) | Existing `getAdmin` and `fullSignOut`, reused unchanged |
| `frontend/src/components/UI.tsx` | `web/src/components/EmptyPage.tsx` and `web/src/components/AdminShell.tsx` | Existing `Card`/`Icon` components reused for placeholder and menu |
| No Expo source; shared placeholder for every menu page | `web/src/components/EmptyPage.tsx` | Shared page title and “not migrated yet” message |
| No Expo source; web-only router dependency | `web/package.json`, `web/package-lock.json` | Exact-pinned `react-router-dom@7.18.4` |
| No Expo stylesheet; styles mirror `AdminShell.tsx` | `web/src/index.css` | Sidebar, section, link, active, hover, pressed, and layout styles |
| `web/src/DevPreview.tsx` (temporary row 1c preview) | `web/src/DevPreview.tsx` | Retained, but no longer rendered or routed |

## Menu order and routes

The definitions were checked again against `frontend/src/components/AdminShell.tsx`:

1. **Overview** — Dashboard `/dashboard`
2. **Catalog** — Products `/catalog`
3. Categories `/categories`
4. Product type `/product-types`
5. Subcategories `/subcategories`
6. Product class `/product-classes`
7. Brands `/brands`
8. Product groups `/product-groups`
9. Spreadsheet imports `/csv-import`
10. **Warehouse** — Racks `/racks`
11. Purchases `/purchases`
12. Inventory `/inventory`
13. **Sales** — RFQs `/rfqs`
14. Partners `/partners`
15. Dispatch `/dispatches`
16. Money config `/money-config`
17. **Admin** — Settings `/settings`
18. Team `/team`

Sign out is the separate action below the menu. It calls `fullSignOut()` and navigates to `/login` with replace semantics, matching Expo's session clearing and replace behavior.

## Settings, roles, and page URLs

Product type and Product class are shown by default. The menu reads the same keys, `settings:showProductType` and `settings:showProductClass`, using the same `true` defaults as Expo. A stored `false` hides its item. There are no role checks or route-protection checks, matching Expo's menu behavior.

The `/` and `/login` URLs explicitly requested for this row both use the shared placeholder, with the corresponding title, and neither displays the sidebar. No redirect or login form was added. The inventory lists no Expo not-found page or not-found route, so no custom not-found page or catch-all route was added. `/register` is not a menu URL and is not added here.

## Responsive behavior

`AdminShell.tsx` has no viewport breakpoints, media queries, collapsed-sidebar mode, or alternate mobile menu. On web it renders a fixed-width 240px sidebar beside a flexible main area. The web shell preserves that behavior and width at all viewport sizes; it does not add a responsive breakpoint Expo does not have.

## API calls used

None. The sidebar reads the saved admin company name and taxonomy settings from browser storage. Sign out uses the row 1b session helper.

## Differences from Expo

- Expo Router `Stack`, `Slot`, `usePathname`, and `useRouter` are replaced by `react-router-dom` `BrowserRouter`, `Routes`, `Route`, `NavLink`, `Outlet`, and `useNavigate`.
- Expo Native `View`, `Text`, `Pressable`, and `ScrollView` are replaced by semantic HTML and CSS. Existing web `Icon` and `Card` components are reused.
- Placeholder pages are a single web component with the page title and “This page is not migrated yet.” message. Expo has no analogous generic placeholder page.
- Expo's auth routes bypass the sidebar. `/login` and `/` therefore show the shared placeholder without the menu; no auth behavior is implemented.
- Sign-out uses the existing row 1b `fullSignOut` helper and browser navigation to `/login`; router replace is used instead of Expo's `router.replace`.
- There is no custom not-found implementation in the inventory and no catch-all route was added.
- The fixed 240px sidebar remains fixed at all viewport widths because Expo has no breakpoint/collapse behavior.
- `DevPreview.tsx` remains on disk but App no longer renders it. The preview cannot be reached through a route or visible UI; it can only be displayed again by temporarily rendering it from `App.tsx`.
- No endpoint functions or backend APIs are used or changed.

## How to test

From `web/`, run:

```text
npm run build
npm run lint
npm run dev
```

Open `/dashboard`, click each menu item, and verify the page title, current active link, exact section names and order. Also directly open `/brands` and reload; the development server should serve the SPA route. Open `/` and `/login` and confirm each shows only its placeholder, with no redirect or sidebar.

To check the persisted taxonomy visibility, set `settings:showProductType` or `settings:showProductClass` to the JSON string `false` in browser `localStorage`, reload a menu URL, and verify the corresponding item is absent. Restore each key to `true` afterward. Click Sign out and verify the session keys are cleared and the browser navigates to `/login`.

Build and lint pass. Browser checks confirmed all 18 menu URL/title pairs, direct `/brands` loading, both placeholders, conditional taxonomy visibility, and sign-out clearing the session and navigating to `/login`.

## Left for later

When we deploy (row 21b), the host must send every path to index.html, otherwise a page reload on /brands fails.
