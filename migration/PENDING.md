# Pending

Things we agreed to do later. Check this file before row 10a and before row 21.
A row stays **Built** in STATUS.md until its tests below are done. Then it becomes Done and its section is deleted from here.

Rule: when 3 or 4 rows are waiting, run their tests in one go. Use `ZZ` names for anything you create. Never delete real data.

---

## Tasks for later

| When | Task |
|---|---|
| Before row 10a | Copy `demo-notes/SHEET-FORMAT.md` into `migration/`. The `demo-notes/` folder is gitignored, so it may only exist on one PC. If it is missing, the agent reads the column rules from the Expo import code instead. Never create a made-up version. |
| Row 21b | Production backend is `backend_refactor/server.py`. Retest login and every screen against it before deploy. |
| Row 21b | The host must send every path to `index.html`, otherwise reloading a page like `/brands` fails. |
| Row 21b | Check that the backend allows requests from the deployed web address (CORS). |
| When deleting `backend/server.py` | Check what the VPS starts (service, start command or Docker file). Change it to `backend_refactor/server.py` and check that `/docs` opens before you `git pull` there. |
| Any time | Run `grep -rn "9876543210" migration/`. It must print nothing (test phone number must not be in the repo). |

## Tests waiting

### Row 8: Product groups (Built)

Use disposable `ZZ` groups and products. Do not delete or alter real catalog data.

1. Open Product Groups. Confirm the group count, search, empty state, and linked product counts. Search by a group name.
2. Create a `ZZ` group with fewer than two products; confirm creation is unavailable. Select two disposable products and create it. Confirm it appears and its product count is two.
3. Edit the `ZZ` group name and product selection. Save and confirm both persist after reloading the page.
4. Expand the group count. Confirm its products match the selected IDs and products associated by case-insensitive group name.
5. Confirm the existing shelf price board appears for the expanded group. Change and save a disposable product price, apply a discount to the group, and confirm products outside the group do not change.
6. Start deleting the `ZZ` group. Confirm the passcode modal requires admin contact and passcode and says it deletes the group and all products in it. Cancel and verify nothing changed.
7. Confirm cascade deletion using valid credentials. Verify only the disposable group/products are removed and the success count is accurate.

### Row 9: racks (Built)

Use disposable `ZZ` racks and products. Do not delete or alter real catalog data.

1. Open Racks and confirm the rack count, loading state, and empty state.
2. Create a `ZZ` rack with 2 rows and 3 columns. Confirm the generated locations are `A1`, `A2`, `A3`, `B1`, `B2`, and `B3`. Confirm the dimensions are shown on the rack.
3. Try a blank name, zero dimension, and fractional dimension. Confirm the page rejects each invalid input. Try dimensions above 26 rows or 100 columns and confirm the API error is shown.
4. Select an empty slot and assign a disposable product. Confirm the slot displays as occupied. Use **Assign product** on the rack and confirm it opens the first empty slot, or the first slot if all are occupied.
5. Select an occupied slot and assign another disposable product. Confirm the displayed assignment refreshes.
6. Try deleting the populated `ZZ` rack. Confirm the API rejects deletion and the rack remains. Delete an empty `ZZ` rack and confirm it disappears without a confirmation dialog.

## Decisions open

- Row 6: Expo's class purge filters the stored product class. A legacy product shown under a class only through name inference may not be deleted by it. Compare with a real example.
- Row 7e: product delete. Expo Web's table has no reachable delete control (only the native branch has one), so none was built. Decide again at row 21a.
