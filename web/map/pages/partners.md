# partners

| | |
|---|---|
| **Map ID** | `partners` |
| **Route** | `/partners` |
| **Source file** | `web/src/pages/PartnersPage.tsx` (486 lines) |
| **SOW** | Partner §8–9 |
| **Operator guide** | `migration/admin/partners.md` |

## Load / refresh

- **L138** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.
- **L158** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L116 | `listPartners` | GET /partners | `return listPartners({` |
| L134 | `listPartners` | GET /partners | `const allPartners = await listPartners();` |
| L179 | `getPartner` | GET /partners/{id} | `getPartner(partner.id),` |
| L180 | `getPartnerRewards` | GET /partners/{id}/rewards | `getPartnerRewards(partner.id),` |
| L192 | `getPartner` | GET /partners/{id} | `const details = await getPartner(partnerId);` |
| L195 | `getPartnerRewards` | GET /partners/{id}/rewards | `setWallet(await getPartnerRewards(partnerId));` |
| L229 | `createPartner` | (see endpoints.ts) | `async function createPartner() {` |
| L249 | `createPartnerAdmin` | POST /partners | `const created = await createPartnerAdmin(body);` |
| L322 | `updateCreateField` | (see endpoints.ts) | `updateCreateField(key, value);` |
| L443 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-name" label="Name *" value={createForm.name} onChangeText={(value) => ` |
| L444 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-phone" label="Phone *" value={createForm.phone} onChangeText={(value) ` |
| L445 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-address" label="Address" value={createForm.address} onChangeText={(val` |
| L446 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-business" label="Business name" value={createForm.businessName} onChan` |
| L448 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-pincode" label="Pincode" value={createForm.pincode} onChangeText={(val` |
| L449 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-city" label="City" value={createForm.city} onChangeText={(value) => up` |
| L452 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-area" label="Area" value={createForm.area} onChangeText={(value) => up` |
| L453 | `updateCreateFieldFromInput` | (see endpoints.ts) | `<Input testID="create-partner-manager" label="Sales manager" value={createForm.salesManager} onChang` |
| L457 | `createPartner` | (see endpoints.ts) | `<Button testID="save-partner" title="Create partner" onPress={() => void createPartner()} loading={s` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L54 | `emptyPartnerForm` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L68 | `errorMessage` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L75 | `csvCell` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L80 | `statusStyle` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L86 | `detailLine` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L90 | `PartnersPage` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L123 | `load (useCallback)` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L133 | `fetchManagerOptions (useCallback)` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L172 | `openPartner` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L191 | `refreshSelected` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L201 | `review` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L225 | `updateCreateField` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L229 | `createPartner` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L268 | `exportPartnersCsv` | Open `web/src/pages/PartnersPage.tsx` at this line |
| L300 | `exportKycHistoryCsv` | Open `web/src/pages/PartnersPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L333 | `export-partner-kyc-history` | `exportKycHistoryCsv` |
| L336 | `export-partners` | `exportKycHistoryCsv` |
| L339 | `add-partner` | `() => void exportPartnersCsv()` |
| L354 | `partner-success` | `() => setManagerFilter("")` |
| L419 | `partner-location-verified` | `() => void review(true)` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
