# Row 20e: Partner KYC-history CSV export

**Planned:** Export KYC history from the Partners screen, one row for each history entry and using existing partner/history data only.

**Built:** Added a KYC-history download action. It exports the currently filtered partner list's embedded history, with no per-partner detail requests. The file is `partners-kyc-history.csv`; data cells use the existing quoting helper and the file has a UTF-8 BOM.

**Old -> new:** `frontend/app/(admin)/partners.tsx` -> `web/src/pages/PartnersPage.tsx`.

**How it works:** `listPartners` returns full partner records, including each record's `kycHistory`. The export flattens the currently loaded partner/history entries. Partners with no entries contribute no rows.

**API calls:** Existing `GET /partners` only; no new endpoint or per-partner requests.

**CSV columns, in order:** `partnerId,partnerName,status,reviewedBy,reviewedAt,rejectionReason,locationVerified`.

**Differences from Expo:** Current Expo displays KYC history in partner details but has no KYC-history export. The new export is the requested SOW gap and uses the already loaded filtered partner data.

**How to test:** See Row 20e in `migration/PENDING.md`. `npm run build` passed. `npm run lint` exited successfully with five existing warnings in `web/src/utils/csv.ts`.

**Left:** Browser export verification using disposable partner history is pending.