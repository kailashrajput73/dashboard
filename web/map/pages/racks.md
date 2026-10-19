# racks

| | |
|---|---|
| **Map ID** | `racks` |
| **Route** | `/racks` |
| **Source file** | `web/src/pages/RacksPage.tsx` (427 lines) |
| **SOW** | Rack §6 |
| **Operator guide** | `migration/admin/racks.md` |

## Load / refresh

- **L47** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L35 | `listRacks` | GET /racks | `listRacks(),` |
| L36 | `listCatalog` | GET /catalog | `listCatalog(),` |
| L49 | `listRacks` | GET /racks | `void Promise.all([listRacks(), listCatalog()])` |
| L49 | `listCatalog` | GET /catalog | `void Promise.all([listRacks(), listCatalog()])` |
| L85 | `createRack` | POST /racks | `await createRack({` |
| L106 | `assignRackSlot` | PUT /racks/{id}/assign | `await assignRackSlot(selected.id, { productId, slotCode: slot });` |
| L121 | `deleteRack` | DELETE /racks/{id} | `await deleteRack(rack.id);` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L17 | `RacksPage` | Open `web/src/pages/RacksPage.tsx` at this line |
| L32 | `load (useCallback)` | Open `web/src/pages/RacksPage.tsx` at this line |
| L70 | `saveRack` | Open `web/src/pages/RacksPage.tsx` at this line |
| L102 | `assign` | Open `web/src/pages/RacksPage.tsx` at this line |
| L119 | `removeRack` | Open `web/src/pages/RacksPage.tsx` at this line |
| L132 | `openAssignment` | Open `web/src/pages/RacksPage.tsx` at this line |
| L370 | `slotStyle` | Open `web/src/pages/RacksPage.tsx` at this line |
| L408 | `productStyle` | Open `web/src/pages/RacksPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L146 | `open-add-rack` | `() => setCreateOpen(true)` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
