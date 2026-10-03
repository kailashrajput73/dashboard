# BACKEND — bug fix notes

## FIX-01 — Rack assign (test step 12)

**Symptom:** Rack created successfully; assigning a product to a slot returns a **server API error**.

**Where to look:** `backend_refactor` — racks router/service (`PUT /api/racks/{rack_id}/assign`), catalog `rackId` / `rackSlot` fields.

**Repro:** Create rack → pick product → assign slot → note exact error message and response body from browser network tab.

**Not fixed by:** deleting `backend/server.py`.
