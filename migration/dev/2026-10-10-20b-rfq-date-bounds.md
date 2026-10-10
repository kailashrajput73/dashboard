# Row 20b: RFQ date bounds

**Planned:** Match current Expo RFQ date filtering when one date value is invalid or the valid range is reversed.

**Built:** RFQ list filtering now applies each valid date boundary independently, without disabling the other valid boundary when validation reports an error. When both valid values are reversed, both bounds are applied and naturally produce no matching requests. Existing validation messages remain visible.

**Old -> new:** `frontend/app/(admin)/rfqs.tsx` -> `web/src/pages/RfqsPage.tsx`.

**How it works:** The existing date parser still returns a timestamp for valid dates and `null` for invalid values. The list filter compares each non-null bound to RFQ creation time regardless of the other date's validation state.

**API calls:** None added or changed; the existing `GET /rfqs` data is filtered client-side.

**Differences from Expo:** None intended for date-filter behavior or validation messages.

**How to test:** See Row 20b in `migration/PENDING.md`. `npm run build` passed. `npm run lint` exited successfully with five existing warnings in `web/src/utils/csv.ts`.

**Left:** Browser verification against representative RFQs is pending.