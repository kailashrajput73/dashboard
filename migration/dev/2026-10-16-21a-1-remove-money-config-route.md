# Row 21a-1: Remove stale Money config route

**Planned:** Remove the web-only `/money-config` placeholder route. Money config is skipped because the current Expo menu no longer includes it.

**Built:** Removed the `/money-config` route and its unused `EmptyPage` import from `web/src/App.tsx`.

**Old -> new:** No current Expo screen exists. Removed `web/src/App.tsx:55`.

**How it works:** The React router no longer registers the stale path; other route registrations are unchanged.

**API calls:** None.

**Differences from Expo:** Web no longer exposes a route that is absent from the current Expo app.

**How to test:** Try `/money-config` and confirm no Money config placeholder loads. Open `/dashboard`, `/partners`, and `/settings` directly to confirm adjacent routes still work. Run `cd web && npm run build` and `npm run lint`.

**Left:** Manual browser route check is listed in `migration/PENDING.md` under Row 21a-1.
