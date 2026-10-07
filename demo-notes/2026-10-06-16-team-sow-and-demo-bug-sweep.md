# Team SOW + demo bug sweep (handoff prep)

Date: 2026-10-06

## Scope shipped in this pass

- Team Management screen refreshed to match the admin card layout and support search, role filters, active/inactive status, default permissions, and immediate list refresh after create/edit/toggle.
- Teammate admin login now works through the same Expo admin admin login route using contact number + passcode for team accounts created in Team Management.
- Rack assignment bug fixed on the backend for product-id resolution and slot updates.
- Catalog CSV export remains web-safe with browser download behavior instead of URL opening.
- Money config item removed from the AdminShell nav so the old demo screen is no longer surfaced.
- Secured delete flow remains discoverable in the product action flow and is documented as a passcode-confirmed delete path.

## Files touched

- `frontend/app/(admin)/team.tsx`
- `backend_refactor/services/auth_service.py`
- `backend_refactor/services/product_groups_racks_service.py`
- `backend_refactor/utils.py`
- `frontend/app/(admin)/catalog.tsx`
- `frontend/app/(admin)/dashboard.tsx`
- `migration/bug_fix/README.md`
- `migration/bug_fix/OWNER-SIGNOFF.md`
- `demo-notes/README.md`

## Root cause fixes

### Team login

The admin login route was hard-coded to only look up `role: "admin"` in the `users` collection. That blocked staff or store_manager accounts created on the Team screen from logging in with their contact number + passcode. The login path now accepts the same team roles used by Team Management, rejects inactive accounts with a clear 401, and returns the user role in the session payload.

### Rack assignment

The rack assignment path was too strict about the product identifier and could fail when the client passed a product code or when the rack slot update was not matched precisely. The service now resolves the catalog item by either stable catalog `id` or `productCode`, updates the matching slot safely, and clears the prior assignment on other racks while keeping the response wrapped in the standard envelope.

### Team UX

The Team list was reworked to keep the latest data after create/edit/toggle using the existing `load()` pattern, add a visible active/inactive badge, and surface default permissions per role in the editor so the owner can validate the flow quickly.

## Owner verification steps

### Team

1. Open Team Management.
2. Create a team user with a valid 4-character passcode.
3. Confirm the new user appears immediately in the list without restarting the app.
4. Edit the user role and toggled active state, then confirm the list refreshes.
5. Search by name/contact and filter by role to confirm the list behaves correctly.
6. Log out of the admin app and sign back in with the new teammate contact + passcode.
7. Confirm inactive users are rejected with a clear 401 message.

### Rack assign

1. Create a rack with rows/columns.
2. Open a slot and assign a catalog product.
3. Confirm the slot shows the assignment and the product is linked to the rack + slot.
4. Verify the server returns a clear success response rather than a generic API error.

### Catalog export

1. Open the Catalog screen.
2. Click the export icon in the top-right.
3. Confirm the CSV downloads in the browser instead of opening a data URL.

### Secured delete

1. Open a product action sheet.
2. Confirm the secured delete / passcode path is available and discoverable from the admin product screen.
3. Run one safe test delete in a disposable or staging dataset only.

## Guardrails

- No import rules were changed in this pass; FIX-03 / FIX-04 / FIX-11 remain deferred by policy.
- Partner mobile auth and mobile API work remain out of scope for this change set.
- No commit is required here; this is handoff-ready for owner testing in one pass.
