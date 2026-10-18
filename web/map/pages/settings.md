# settings

| | |
|---|---|
| **Map ID** | `settings` |
| **Route** | `/settings` |
| **Source file** | `web/src/pages/SettingsPage.tsx` (124 lines) |
| **SOW** | Admin utility |
| **Operator guide** | `migration/admin/settings.md` |

## Screen blocks (Header titles)

- **L49** — `Catalog tabs and temporary maintenance`

## Load / refresh

- **L19** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L21 | `getTaxonomyTabs` | (see endpoints.ts) | `void getTaxonomyTabs().then((nextTabs) => {` |
| L37 | `wipeCatalogAll` | POST /catalog/wipe-all | `const result = await wipeCatalogAll(credentials);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L11 | `SettingsPage` | Open `web/src/pages/SettingsPage.tsx` at this line |
| L27 | `toggle` | Open `web/src/pages/SettingsPage.tsx` at this line |
| L33 | `runWipe` | Open `web/src/pages/SettingsPage.tsx` at this line |
| L96 | `ToggleRow` | Open `web/src/pages/SettingsPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
