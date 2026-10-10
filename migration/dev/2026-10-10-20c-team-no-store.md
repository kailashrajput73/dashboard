# Row 20c: Team no-store request

**Planned:** Match Expo FIX-06 by preventing the team user list request from using a browser cache.

**Built:** Added optional `RequestCache` support to the web API client and set `cache: "no-store"` for `GET /team/users` only.

**Old -> new:** `frontend/src/api/client.ts` and `frontend/src/api/endpoints.ts` -> `web/src/api/client.ts` and `web/src/api/endpoints.ts`.

**How it works:** `apiRequest` accepts an optional fetch cache mode and forwards it to `fetch`. The `listTeamUsers` endpoint passes `no-store`; other requests retain their prior behavior.

**API calls:** `GET /team/users`.

**Differences from Expo:** None intended; web now mirrors Expo's cache option.

**How to test:** See Row 20c in `migration/PENDING.md`. `npm run build` passed. `npm run lint` exited successfully with five existing warnings in `web/src/utils/csv.ts`.

**Left:** Browser Network-panel verification is pending.