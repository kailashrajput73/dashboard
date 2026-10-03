# Row 1e — startup redirect and admin login

## What this row planned

Port Expo's saved-session startup redirect and admin sign-in to the web app. Preserve its field labels, messages, endpoint, saved session, redirects, and Register link destination. Remove the row 1c development preview and restore the application entry.

## What was built

- `/` checks the saved admin session. It shows the Expo loading text while checking, then replaces the URL with `/dashboard` when a session exists or `/login` when it does not.
- `/login` has the Expo contact/passcode fields, copy, validation, sign-in action, login request, session save, dashboard redirect, Register link, and error modal.
- `/register` is the existing shared placeholder, reached by the unchanged Register link text.
- Removed `web/src/DevPreview.tsx`; restored `web/src/App.tsx` to application routes. A source search confirmed no remaining `DevPreview` imports or references.
- No real credentials, token values, or backend URL value are included in this note.

## Expo file → web file

| Expo file | Web file | What moved |
|---|---|---|
| `frontend/app/index.tsx` | `web/src/components/StartupRedirect.tsx` and `web/src/App.tsx` | Loading state, `getAdmin()` check, replace to dashboard or login |
| `frontend/app/(admin)/login.tsx` | `web/src/pages/LoginPage.tsx` | Login fields and copy, validation, API request, session persistence, error display, Register link, success redirect |
| `frontend/src/api/endpoints.ts` | `web/src/api/endpoints.ts` (existing row 1b file) | Existing `loginAdmin` wrapper for `POST /auth/admin/login`, reused unchanged |
| `frontend/src/state/session.ts` | `web/src/state/session.ts` (existing row 1b file) | Existing `getAdmin` and `saveAdmin`, reused unchanged |
| `frontend/src/api/client.ts` | `web/src/api/client.ts` (existing row 1b file) | Existing network and API error handling, reused unchanged |
| `frontend/src/components/UI.tsx` | `web/src/components/UI.tsx` (existing row 1c file) | Existing `Input`, `Button`, `Card`, `ErrorModal`, and `Icon`, reused unchanged |
| `frontend/src/theme.ts` | `web/src/theme.ts` (existing row 1a file) | Existing web theme tokens, reused unchanged |
| `frontend/app/(admin)/register.tsx` route target | `web/src/App.tsx` and `web/src/components/EmptyPage.tsx` (existing row 1d files) | `/register` remains the shared placeholder until row 20 |
| `web/src/DevPreview.tsx` (temporary row 1c file) | Removed | No remaining source import/reference |
| Existing temporary router entry | `web/src/App.tsx` | Restored startup, login, Register placeholder, and row 1d application routes |
| No Expo source; browser-specific styling | `web/src/index.css` | Startup spinner and centered login layout |

## How it works

Startup calls the row 1b `getAdmin()` helper and replaces the URL with `/dashboard` for a saved session or `/login` otherwise. The login handler applies the Expo trim-and-required checks, calls `loginAdmin` with the trimmed contact number and passcode, saves the returned `AdminSession` via `saveAdmin`, then replaces the route with `/dashboard`.

The login link text remains “First time here? Create an admin account” and points to `/register`. That route uses the row 1d shared placeholder, not a registration form.

## API calls used

`POST /auth/admin/login`, through the existing `loginAdmin` wrapper. It uses the existing API client, which handles the bearer token setting and API/network errors. No backend code or API behavior was changed.

## Differences from Expo

- React Native `View`, `Text`, `ScrollView`, `KeyboardAvoidingView`, `SafeAreaView`, and Expo Router are replaced by semantic HTML, existing shared web components, CSS, and `react-router-dom`.
- Expo Router's grouped dashboard route is `/dashboard` in the browser. Both successful login and startup use replace navigation to `/dashboard`.
- The Register route is a shared placeholder because registration itself belongs to row 20.
- Expo's iOS keyboard-avoidance behavior is not used on a browser.
- The browser uses the existing row 1b `VITE_BACKEND_URL` configuration. No backend URL value is recorded here.
- Browser API reachability could not be verified: the credential-free login request failed with `net::ERR_CONNECTION_REFUSED`. The API client's exact message, with its backend origin redacted to avoid recording the URL value, was: `Cannot reach API at [backend URL redacted]/api/auth/admin/login (Failed to fetch). Check VPS is up, firewall allows port 80/443, VITE_BACKEND_URL in web/.env, and restart the Vite dev server.`
- Removed stale merge-conflict marker lines from `web/src/index.css`, retaining the row 1c and 1d styles. They otherwise appeared as invalid CSS text.
- `DevPreview.tsx` was deleted as requested; the app entry now renders the startup/login/routes rather than a development preview.

## How to test

From `web/`, run `npm run build`, `npm run lint`, and `npm run dev`.

- Open `/` with no saved session; verify the loading text appears and the app replaces the URL with `/login`.
- Sign in with contact and passcode values entered locally in the browser. Verify successful sign-in saves the session and opens `/dashboard`.
- Click Sign out; verify it clears the session and token and opens the real `/login` screen.
- Open `/login`, submit both fields empty, and verify “Contact number required” and “Passcode required.”
- Follow “First time here? Create an admin account”; verify `/register` shows the shared placeholder.
- For server errors, dismiss the error modal after reading the message. Do not put actual credentials in logs or notes.

Build and lint passed. Browser checks confirmed startup to login without a session and dashboard with a saved session, both required-field messages, the Register placeholder, and Sign out clearing the session and token and landing on the real login screen. Successful authentication was not tested because the configured API connection was refused.

## Left for later

The browser login call failed with `net::ERR_CONNECTION_REFUSED`. The API client reported: `Cannot reach API at [backend URL redacted]/api/auth/admin/login (Failed to fetch). Check VPS is up, firewall allows port 80/443, VITE_BACKEND_URL in web/.env, and restart the Vite dev server.`

The API needs to be running and reachable from this browser at the origin configured for `VITE_BACKEND_URL`; the server/firewall must allow that connection. CORS was not reached/verified because the connection was refused. Do not add a proxy or change the backend for this migration. To complete a real login test, provide the intended backend origin for `web/.env` if the current configuration is wrong, or make the backend reachable at its configured origin; enter valid credentials locally in the browser only.
