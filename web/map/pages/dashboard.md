# dashboard

| | |
|---|---|
| **Map ID** | `dashboard` |
| **Route** | `/dashboard` |
| **Source file** | `web/src/pages/DashboardPage.tsx` (187 lines) |
| **SOW** | Dashboard snapshot (not full §9 reports) |
| **Operator guide** | `migration/admin/dashboard.md` |

## Screen blocks (Header titles)

- **L86** — `Overview`

## Load / refresh

- **L37** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L40 | `getAdmin` | (see endpoints.ts) | `const admin = await getAdmin();` |
| L45 | `getDashboardSnapshot` | GET /dashboard/snapshot | `const nextSnapshot = await getDashboardSnapshot();` |
| L49 | `getTaxonomyTabs` | (see endpoints.ts) | `const tabs = await getTaxonomyTabs();` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L23 | `formatQty` | Open `web/src/pages/DashboardPage.tsx` at this line |
| L28 | `DashboardPage` | Open `web/src/pages/DashboardPage.tsx` at this line |
| L154 | `ModuleLink` | Open `web/src/pages/DashboardPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L100 | `panel-pending-rfqs` | `() => navigate("/rfqs")` |
| L109 | `panel-top-moving` | `—` |
| L116 | `panel-slow-moving` | `—` |
| L124 | `snapshot-error` | `—` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
