# Owner sign-off — one pass at the end

**Updated:** 2026-10-06

## Policy

The owner **does not** run smoke tests after every agent chat. Agents should still write **how to verify** in demo notes and stop with a short test list.

The owner will **open the admin app once** (or one dedicated session) and walk through the checklist below before client demo or go-live.

Until that pass, treat modules as **code complete — owner verify pending**.

---

## SOW module tracker (Expo admin)

| Module | Agent / code status | Owner verified |
|--------|----------------------|----------------|
| Category, Subcategory, Brand, Product group, Rack, Stock | Done (earlier) | ☐ final pass |
| Product | Export + billing fields implemented (2026-10-05) | ☐ final pass |
| Purchase | UX + export + report MVP (2026-10-05) | ☐ final pass |
| Partners (KYC + list) | Code complete (2026-10-05); **not tested by owner yet** (commit without smoke test) | ☐ |
| RFQ | Code complete (2026-10-06); **not tested by owner yet** (commit without smoke test) | ☐ |
| Dispatch | Code complete (2026-10-06); **not tested by owner yet** (commit without smoke test) | ☐ |
| Inventory / Stock | Code complete (2026-10-06); **not tested by owner yet** (commit without smoke test) | ☐ |
| Team | Code complete (FIX-06 + teammate admin login) | ☐ final pass |
| Dashboard & reports | Snapshot only | ☐ final pass |
| Plumber / electrician | Not started | — |

---

## One-session checklist (when you test)

Use VPS **refactor** API URL. Tick when done.

### Product
- [ ] Catalog export → 19-column master CSV; no stock column
- [ ] Edit HSN, GST, pack, MRP/pkg → save → reopen

### Purchase
- [ ] Export CSV on **web** downloads; date filter works
- [ ] Record purchase (search product, optional rack) → stock increases
- [ ] Bulk CSV success = inline message, not error modal

### Partners (code shipped; owner not tested yet — do in final pass)
- [ ] Filter by sales manager; confirm it combines with search and KYC status
- [ ] Create partner from admin; confirm approved status and automatic KYC history entry
- [ ] Reject a pending partner with a reason; confirm reason in detail/history
- [ ] Export on web; confirm CSV contains only the filtered partner list
- [ ] Confirm mobile auth paths remain as documented in `docs/PARTNER-API.md`

### RFQ (code shipped; owner not tested yet — do in final pass)
- [ ] Combine status + partner + manager + date filters + search; list matches
- [ ] Web export → CSV only for filtered rows; BOM opens in Excel
- [ ] Create RFQ via partner + product search
- [ ] Pending: discount → see estimated reward → approve; history readable
- [ ] Approved: edit lines → dispatch → stock down (same path as before)

### Dispatch (code shipped; owner not tested yet — do in final pass)
- [ ] Export CSV on web downloads one row per dispatch line for the currently filtered rows only
- [ ] Retail billing: search product by name/code/brand, add multiple lines, edit qty, remove lines, and bill one dispatch with the cart
- [ ] RFQ dispatch from both the RFQ detail and the dispatch screen; confirm the RFQ moves to dispatched and disappears from approved list
- [ ] Stock is reduced on both retail dispatch and RFQ dispatch, with insufficient-stock warnings blocking the submit button
- [ ] Filter chips + date range + search combine correctly and the report summary matches the visible rows

### Inventory / Stock (code shipped; owner not tested yet — do in final pass)
- [ ] Current stock and low-stock tabs render readable product cards with clean qty and valuation hierarchy
- [ ] Low-stock badge/alert is obvious when stock is at or below reorder level, and the summary reflects the filtered list
- [ ] Stock in/out tab shows clear IN/OUT direction and the date range filter works with the search
- [ ] Web export matches the active tab: stock/low exports filtered product rows; stock moves exports filtered movement rows only
- [ ] CSV opening is BOM-safe and no export dumps the full catalog while a filter is active

### Sales path (legacy smoke — optional if RFQ section above passes)
- [ ] RFQ approve → edit lines → dispatch → stock down

### Team verify list (do in the same pass)
- [ ] Create a new team user (store_manager or staff) from the Team screen
- [ ] Confirm the new user appears immediately in the list after save and after reload
- [ ] Edit the user role and active/inactive status; confirm both save and list refresh
- [ ] Search and filter by role returns the expected user rows
- [ ] Log out and sign back in to the Expo admin app using that contact number + passcode
- [ ] Confirm an inactive team user gets a clear 401 and cannot log in

### Demo-critical bugs (fix before demo if still broken)
- [ ] FIX-01 rack assign
- [ ] FIX-02 catalog download (should be fixed in code — confirm on web)
- [ ] Team default login flow: new store_manager can log in with contact + passcode
- [ ] FIX-06 list refresh after create/edit/toggle

> Expo admin SOW modules are code-complete; the owner still needs one single-pass verification session.

---

## For agents

Do not block on owner testing. Do not skip verification steps in documentation. Update this file’s module row only when the owner confirms **Owner verified** for that module.
