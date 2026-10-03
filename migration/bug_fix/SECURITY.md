# SECURITY — before production

## FIX-10 — Destructive actions (test step 21)

**Catalog wipe** in Settings was used on **non-live test data**. Before go-live:

- Hide or restrict wipe / cascade deletes
- Ensure passcode modals on all destructive paths
- No public admin URL without HTTPS

**Settings:** `frontend/app/(admin)/settings.tsx` → `POST /api/catalog/wipe-all`

Do not run wipe on production Mongo without backup.
