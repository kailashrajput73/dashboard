# ADMIN UI — bug fix notes

## FIX-02 — Catalog download (test step 28)

**Symptom:** Download button (top right on Products / catalog) — **nothing happens**.

**Likely area:** `frontend/app/(admin)/catalog.tsx` export uses `Linking.openURL(data:text/csv...)` — often broken on Expo web; needs browser download pattern (see `import-templates.ts` web branch).

---

## FIX-05 — Money config (test step 2)

Unused demo feature. Remove from sidebar when ready; optional keep API for later.

**Screen:** `frontend/app/(admin)/money-config.tsx`

---

## FIX-06 — Team (test step 27)

User unsure if list shows old data. Verify: create/edit user, refresh, check another browser; confirm API `GET /team/users` vs UI.

---

## FIX-07 — QR (test step 9)

QR image + download works. **Camera scanner** not implemented — later, not blocker.

**Component:** `frontend/src/components/ProductQr.tsx`

---

## Step 20 — Secured delete

User could not find control. Look for secured delete on **catalog product** (passcode modal) — `deleteCatalogItemSecured` in catalog screen; cascade deletes on category/brand/subcategory/group.
