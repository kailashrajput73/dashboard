# Row 1b — storage, session, and API client

## What this row planned

Port the Expo storage adapter, admin session helpers, API client, and every endpoint function into `web/`, retaining the existing keys and API behavior.

## What was built

- Browser storage backed by `localStorage`, with the same JSON serialization, async method signatures, fallbacks, warning behavior, and method names as the Expo web adapter.
- Session helpers with the same `session:admin` session key and `session:admin:token` token key.
- The API client and all endpoint functions, including functions that currently have no UI caller.
- `API_PREFIX` and the mixed-content check in the Vite config module, using the existing `VITE_BACKEND_URL`.
- No screen, permanent debug UI, or new dependency.

## Expo file → web file

| Expo file | Web file |
|---|---|
| `frontend/src/utils/storage/index.web.ts` | `web/src/utils/storage/index.ts` |
| `frontend/src/utils/storage/storage-base.ts` | `web/src/utils/storage/storage-base.ts` |
| `frontend/src/state/session.ts` | `web/src/state/session.ts` |
| `frontend/src/api/client.ts` | `web/src/api/client.ts` |
| `frontend/src/api/endpoints.ts` | `web/src/api/endpoints.ts` |
| `frontend/src/utils/pricing.ts` | `web/src/utils/pricing.ts` |
| `frontend/src/config/env.ts` | `web/src/config/env.ts` |

The API endpoints, pricing helper, and storage base were copied byte-for-byte initially. The `frontend/src/utils/storage/index.ts` native adapter was not used; the source for the browser port is `index.web.ts`.

## How it works

Storage values continue to be JSON-serialized. `secureGet`, `secureSet`, and `secureRemove` use the same browser storage as the ordinary methods because browsers have no Keychain. Session save and clear also write/remove the token using the existing token key. The API client reads that token and attaches the bearer authorization header as before.

Requests continue to use the `/api` prefix, preserve the `{ success, data, error }` envelope handling, and use the existing endpoint methods and request bodies. The base URL is read from `VITE_BACKEND_URL` by the existing web environment module.

## API calls used

No backend call was made during validation. All endpoint functions from `frontend/src/api/endpoints.ts` remain present in `web/src/api/endpoints.ts`; no endpoint path, method, request body, or endpoint behavior was intentionally changed.

## Differences from Expo

- Browser storage uses `localStorage` in place of the AsyncStorage web shim. The browser `secure*` methods therefore are not encrypted storage; they use the same `localStorage` as the other keys. Existing storage keys and JSON encoding are unchanged.
- Expo path-alias imports were changed to relative imports in the web session and API client modules.
- `web/src/config/env.ts` already read `VITE_BACKEND_URL`; it now also exports the `/api` prefix and mixed-content predicate required by the copied client. The predicate retains the Expo condition: HTTPS page plus an HTTP API URL.
- Network error wording only was updated for web configuration:
  - `HTTPS admin pages cannot call HTTP APIs` → `HTTPS web pages cannot call HTTP APIs`.
  - `EXPO_PUBLIC_BACKEND_URL` → `VITE_BACKEND_URL` in the mixed-content instruction.
  - `URL in env.ts / EXPO_PUBLIC_BACKEND_URL, and restart Expo with --clear` → `VITE_BACKEND_URL in web/.env, and restart the Vite dev server`.
- Storage adapter comments were updated to describe the browser adapter, its relative import example, and `localStorage` instead of the AsyncStorage shim.
- The copied endpoint source referenced `Brand` in three endpoint signatures but did not declare that type. `web/src/api/endpoints.ts` now declares `Brand` with the fields consumed by the existing Expo screens (`id`, `name`, `isActive`, and optional `logoUrl`). The endpoint functions themselves are unchanged.
- The web TypeScript configuration requires type-only imports under `verbatimModuleSyntax`; the storage adapter uses type-only imports and exports its existing compile-time guard type so the web build accepts it. This has no runtime effect.

## How to test

From `web/`, run `npm run build`. This runs the TypeScript project build and Vite production build. Row 1b validation passed with `npm.cmd run build` and Oxlint on all row 1b files.

For a browser storage/session round trip, start `npm run dev`, open the app, and run this in the browser console. It checks storage serialization and session/token persistence, then removes the temporary data:

```js
(async () => {
  const { storage } = await import("/src/utils/storage/index.ts");
  const { saveAdmin, getAdmin, clearAdmin } = await import("/src/state/session.ts");
  const key = "migration:1b:test";
  const admin = {
    token: "test-token",
    adminId: "test-admin",
    companyName: "Test",
    contactNumber: "000",
    gstin: "",
  };

  try {
    if (!(await storage.setItem(key, "ok"))) throw new Error("storage write failed");
    if ((await storage.getItem(key, null)) !== "ok") throw new Error("storage read failed");
    await saveAdmin(admin);
    if (JSON.stringify(await getAdmin()) !== JSON.stringify(admin)) {
      throw new Error("session round trip failed");
    }
    if (localStorage.getItem("session:admin:token") === null) {
      throw new Error("token was not persisted");
    }
    console.log("row 1b storage/session check passed");
  } finally {
    await storage.removeItem(key);
    await clearAdmin();
  }
})();
```

No debug screen or permanent test data was added. The browser storage/session check passed during implementation.

## Left for later

- The backend was not changed. Whether it allows requests from the web app through CORS is unknown; verify when a migrated screen makes a backend call. If blocked, configure CORS separately without changing backend behavior as part of this row.
- Admin login and screen behavior are not part of this row.
