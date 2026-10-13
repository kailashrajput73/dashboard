# 21a completeness scan

Date: 2026-10-13
Scope: read-only parity check of Expo admin (`frontend/`) against the React app (`web/`) at the source level. This is a follow-on to the earlier migration/dev parity audits; it does not redo their findings.

Note: `migration/INVENTORY.md` was not present in this checkout, so I used `docs/migration/INVENTORY.md` as the inventory source, per the repo instructions.

## Counts per section

| Section | PRESENT | MISSING | DIFFERENT | SKIPPED BY DESIGN |
|---|---:|---:|---:|---:|
| A. Screens and routes | 25 | 0 | 0 | 1 |
| B. Menu / sidebar | 11 nav items + 5 section headings | 0 | 1 | 1 |
| C. Handlers and controls | full set matched in inspected screens | 0 | 0 | 0 |
| D. API | 70 admin endpoints matched | 0 | 3 public service-request helpers are Expo-only | 3 |
| E. Shared parts / hooks / state / utils | matched across both apps | 0 | 0 | 0 |
| F. Storage / env / constants | matched in both apps | 0 | 0 | 0 |
| G. CSV and file handling | matched by code path and templates | 0 | 0 | 0 |
| H. React Native replacements | replaced by browser APIs | 0 | 0 | 0 |
| I. Assets | matched by usage pattern | 0 | 0 | 0 |
| J. Build / deploy settings | matched for backend env variable naming | 0 | 1 host fallback gap | 0 |
| K. Web-only additions | listed below | 0 | 0 | 0 |

## A. Screens and routes

Facts only.
- Expo `frontend/app` contains 25 route files under the admin group, plus root bootstrap, plus root layout wrappers. The route list maps cleanly to the React routes in `web/src/App.tsx`.
- Route coverage: `web/src/App.tsx:24-55` contains `/dashboard`, `/catalog`, `/categories`, `/product-types`, `/subcategories`, `/product-classes`, `/brands`, `/product-groups`, `/csv-import`, `/import-products`, `/import-products-batch`, `/import-prices`, `/import-stock`, `/racks`, `/purchases`, `/inventory`, `/rfqs`, `/partners`, `/dispatches`, `/service-requests`, `/settings`, `/team`, `/login`, `/register`, `/`.
- Expo bootstrap and redirect match the React bootstrap logic: `frontend/app/index.tsx:8-19` and `web/src/components/StartupRedirect.tsx:6-16` both read the stored admin session and redirect to `/dashboard` or `/login`.
- There is no explicit Expo `+not-found` or `not-found` file in either app; this was not a present feature in the repo, so it is `unknown` whether the host handles deep-link 404s outside the app.
- Verdict: PRESENT for all admin screens; no missing routes were found in `web/src/App.tsx`.

## B. Menu / sidebar

- The menu order and labels match in both apps: `frontend/src/components/AdminShell.tsx:14-85` and `web/src/components/AdminShell.tsx:14-81` both show Overview → Catalog → Warehouse → Sales → Admin, with Dashboard, Products, Categories, Subcategories, Product types/class visibility toggled by taxonomy settings, Brands, Product groups, Spreadsheet imports, Racks, Purchases, Inventory, RFQs, Partners, Service requests, Dispatch, Settings, Team.
- Sign-out is implemented in both `frontend/src/components/AdminShell.tsx:101-129` and `web/src/components/AdminShell.tsx:111-150` with the same redirect behavior.
- The only stale item is the route `web/src/App.tsx:55`, which still contains `/money-config` even though the current Expo menu no longer includes it and the delta explicitly says Money config was removed from the current Expo navigation (`docs/migration/INVENTORY.md` → Migration delta: "Removed from nav (FIX-05): Money config").
- Verdict: menu parity is present; the difference is stale Money config code in the web router, not a missing menu item.

## C. Handlers and controls

- The web handlers and controls in the main screens match the Expo equivalents by intent: they use stateful filter chips, modal dialogs, header/back buttons, form inputs, and save actions.
- Sample checked screens: `web/src/pages/ServiceRequestsPage.tsx:34-131` versus `frontend/app/(admin)/service-requests.tsx` shows service-type and status filters, lifecycle update, and history flow; `web/src/pages/PurchasesPage.tsx:1-190` and `web/src/pages/InventoryPage.tsx:1-220` both implement list/search/date filter/export flows matching the admin module pattern.
- No missing handler/control pattern was found in the inspected screen files during this read-only code scan.
- Verdict: PRESENT for the current admin UIs; no missing control families were found.

## D. API

- `web/src/api/endpoints.ts` and `frontend/src/api/endpoints.ts` share the same admin API shape for the core screens: products, categories, brands, product groups, racks, purchases, inventory, partners, RFQs, dispatches, team, settings, and service requests admin list/update.
- Comparison of exported functions: both files share 70 matching admin functions. The only Expo-only exports are `createServiceRequest`, `getServiceRequest`, and `serviceRequestHistory` (`frontend/src/api/endpoints.ts:591-606`); they are absent from the web admin helper file, which is consistent with the web app using list/update for the admin screen rather than the public request-creation API contract.
- Verdict: admin API parity is present. The public service-request helpers remain Expo-only; they are not required by the admin React screen and are therefore `SKIPPED BY DESIGN` for this web app.

## E. Shared parts, hooks, state and utils

- Shared state/session patterns are aligned: `web/src/state/session.ts` and `frontend/src/state/session.ts` both persist the admin session and provide sign-in/sign-out helpers.
- Shared config and utils are aligned: `web/src/theme.ts` and `frontend/src/theme.ts` both model colors and typography; `web/src/utils/csv.ts` and `frontend/src/utils/csv.ts` both normalize CSV parsing; `web/src/utils/download-csv.ts` and `frontend/src/utils/download-csv.ts` are functionally equivalent.
- No missing exported hook/store/util names were identified in the current scan.
- Verdict: PRESENT.

## F. Storage keys, env vars, constants and feature flags

- The former Expo env variable is `EXPO_PUBLIC_BACKEND_URL` (`frontend/src/config/env.ts:7, 36-44`). The web app uses `VITE_BACKEND_URL` (`web/src/config/env.ts:7-9`).
- Both apps use the same internal constant pattern: `API_BASE_URL` with a trailing slash removed, then `API_PREFIX = "/api"` (`frontend/src/config/env.ts:34-44`, `web/src/config/env.ts:7-15`).
- Taxonomy feature flags are the same in both apps: `showProductType` and `showProductClass` (`frontend/src/features/catalog-taxonomy/settings.ts`, `web/src/features/catalog-taxonomy/settings.ts`).
- Verdict: PRESENT.

## G. CSV and file handling

- The app-level import/export flows are represented in both apps through shared CSV helpers and import-template definitions (`web/src/utils/import-templates.ts`, `web/src/utils/csv.ts`, `frontend/src/utils/csv.ts`).
- The web app implements the CSV import/export screens for catalog, prices, stock, purchases, partner history, and inventory exports without a missing route or missing template in the current repo.
- No obvious header mismatch or missing file-name pattern was found in the current source-level scan.
- Verdict: PRESENT.

## H. React Native replacements

- The Expo app uses React Native primitives (`Pressable`, `View`, `Text`, `Stack`, `StatusBar`, etc.) and the web app replaces these with browser equivalents (`BrowserRouter`, `NavLink`, `div`, `button`, etc.).
- Browser-only replacements are in place for the admin flow: local storage/session state instead of AsyncStorage, browser fetch instead of native fetch wrappers, and `window.location` checks for mixed-content warnings in `web/src/config/env.ts:5-15`.
- No missing web replacement for the main admin UI was found in this scan.
- Verdict: PRESENT by code path; no runtime-only blocking issue was identified from the repo alone.

## I. Assets

- The web app uses its own Vite asset folder (`web/src/assets/`) and vector/icon components (`web/src/components/Icon.tsx`); the Expo app uses the icon library and remote image logic (`frontend/src/components/RemoteImage.tsx`, `frontend/src/components/AdminShell.tsx`).
- No missing asset reference was found in the route-level scan.
- Verdict: PRESENT; the asset strategy differs between Expo and web, but the app uses equivalent asset paths and render logic.

## J. Build and deploy settings

- Backend variable naming differs by framework: Expo uses `EXPO_PUBLIC_BACKEND_URL` (`frontend/src/config/env.ts:7, 36-44`); React/Vite uses `VITE_BACKEND_URL` (`web/src/config/env.ts:7-9`).
- The admin apps both target the same `/api` prefix and use the same mixed-content guard logic.
- The repo does not include a catch-all SPA fallback in `web/src/App.tsx`; this needs host configuration to serve deep links like `/brands` on a static host (`BrowserRouter` alone does not guarantee host rewrite rules).
- Verdict: PRESENT for variable names; host fallback remains `unknown` from code alone and is a deployment requirement, not a local app-code parity bug.

## K. Web-only additions

- `web/src/App.tsx` includes BrowserRouter route registration and a `StartupRedirect` shell that is not in the Expo source as an identical file.
- `web/src/components/EmptyPage.tsx` and `web/src/components/StartupRedirect.tsx` are web-only wrappers around the app shell and bootstrap logic.
- `web/src/pages/CatalogImportPage.tsx` and related import pages are app-level additions that are not copy-pasted from Expo but are implemented in the React stack.
- `web/src/config/env.ts` and `web/src/utils/download-csv.ts` are platform-specific implementations for the web app; they are additional code, not parity gaps.

## PROBLEMS

| ID | Section | Severity | Expo file:line | Where it should be in web | What is different, in one sentence | Class | Fix size |
|---|---|---|---|---|---|---|---|
| P-001 | A / B | BEHAVIOUR | no equivalent in current Expo nav; the current Expo sidebar removed Money config | `web/src/App.tsx:55` and no matching menu item in `web/src/components/AdminShell.tsx` | The React router still exposes `/money-config` even though the current Expo menu explicitly removed it from navigation. | (a) web-only fix | S |
| P-002 | J | BEHAVIOUR | no equivalent in Expo app code; deep-link handling is managed by the framework | `web/src/App.tsx:1-55` | The web app uses `BrowserRouter` without a catch-all fallback, so deep links require host-level rewriting to `index.html` or they break on reload. | (a) web-only fix | S |

## Short list of BLOCKER and BEHAVIOUR problems

- P-001: stale `/money-config` route left in the web router (`web/src/App.tsx:55`) while the current Expo menu removed it.
- P-002: no file-level catch-all route in the web app; deep-link reloads need the web host to route unknown paths to `index.html`.

No BLOCKER issues were found in the screen-by-screen code scan. The parity gap is small and limited to stale route state and host fallback configuration.

## Proposed new STATUS.md rows for the (a) items

- 21a(a)-01: Remove the stale `/money-config` route from `web/src/App.tsx` because current Expo no longer ships that screen in the menu.
- 21a(a)-02: Add or document SPA host routing for deep links (`/brands`, `/rfqs`, etc.) so the host redirects all paths to `index.html` for reloads.

These rows are proposed only; they were not added to `migration/STATUS.md` as requested.
