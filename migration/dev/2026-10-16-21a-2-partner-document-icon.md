# Row 21a-2: Partner document external-link icon

**Planned:** Match Expo's `open-outline` icon beside external partner document links.

**Built:** Registered the existing Ionicons `open-outline.svg` asset in `web/src/components/Icon.tsx` and rendered it beside HTTP(S) document links in `web/src/pages/PartnersPage.tsx`. No package was added.

**Old -> new:** `frontend/app/(admin)/partners.tsx:376-379` -> `web/src/components/Icon.tsx` and `web/src/pages/PartnersPage.tsx:399-400`.

**How it works:** Only external HTTP(S) documents use the icon and anchor; local/non-URL document text remains unchanged.

**API calls:** None.

**Differences from Expo:** The web link now has the same external-link visual cue as Expo.

**How to test:** Open a partner with an HTTP(S) document and confirm the `open-outline` icon appears beside the link and it opens in a new tab. Confirm non-URL document text has no icon and is not clickable. Run `cd web && npm run build` and `npm run lint`.

**Left:** Manual browser check is listed in `migration/PENDING.md` under Row 21a-2.
