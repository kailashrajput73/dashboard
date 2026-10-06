# Partner SOW: admin KYC and management

**Date:** 2026-10-05

## Why

Close the Expo admin gaps in Referral Partner KYC and Management: admins need full partner detail/history, actionable KYC review, direct partner creation, sales-manager filtering, and export of the currently filtered list.

## What changed

- Opening a partner fetches `GET /partners/{id}` and shows business/contact/location details, app/login state, rewards, RFQ count and approved performance, KYC review history, and documents. URL documents open as links; other document values display as text.
- Empty purchase history explains that supplier purchases are not linked to partners and partner activity is tracked through RFQs.
- Pending KYC approval has a location-verified switch (default on). Rejection requires a reason. Review refreshes the detail and filtered list.
- Admins can create partners with profile, manager, and document fields via `POST /partners`. The API auto-approves these rows; this form does not create a `passcodeHash` or set mobile login credentials.
- Sales-manager filter uses `listPartners` with `sales_manager` and combines with search and KYC status.
- CSV export downloads on web and exports the currently filtered list with partner, KYC, login, reward, RFQ, and approved-performance columns.
- Success feedback is inline. API validation errors are surfaced in the error modal.
- Mobile auth/register/login paths, Firebase planning, and backend code were not changed.

## Owner testing

**2026-10-06:** Code merged toward GitHub; **owner has not run this checklist yet.** Verification is deferred to the single end-to-end pass in `migration/bug_fix/OWNER-SIGNOFF.md` (Partners section).

## How to verify

1. Filter by a sales manager while a search term or KYC status is selected; confirm the list reflects all active filters.
2. Create a partner from the admin screen. Confirm the row is approved and its detail shows the automatic approval history entry. Confirm the form does not ask for a mobile passcode; direct-created rows do not have mobile login credentials. The documented mobile register/login contract remains in `docs/PARTNER-API.md`.
3. Open a pending partner, approve once with location verification on and once with it off. Reject another pending partner with a reason and confirm the reason is visible in detail and KYC history.
4. Open partner details and verify documents, reward passbook, RFQ count/performance, login stats, and the empty supplier-purchase explanation.
5. On web, apply search, KYC, and manager filters and export. Confirm the CSV contains only the visible filtered partners and includes the requested performance fields.

## Files

- `frontend/app/(admin)/partners.tsx`
- `frontend/src/api/endpoints.ts`
- `demo-notes/README.md`
- `migration/bug_fix/README.md`
- `migration/bug_fix/OWNER-SIGNOFF.md`