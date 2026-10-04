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

### Row 3b: subcategory CSV import (Built)

Run first, in `web/`: `npm run build` and `npm run lint`. The agent could not run them. Both must end with no errors.

Create two categories first: `ZZ CAT A`, `ZZ CAT B`.

1. Template: download it. File name `subcategories-template.csv`, header `name,category`.
2. Import this file:
   ```
   name,category
   ZZ Sub One,ZZ CAT A
   ZZ Sub Two,ZZ CAT A
   ZZ Sub Three,ZZ CAT B
   ZZ Bad Row,NO SUCH CATEGORY
   ZZ Sub One,ZZ CAT A
   ```
   Expect "3 added, 2 skipped". The list refreshes without a reload.
3. Variants that must still import: a file with `;` instead of commas, and a file with the headers `subcategory,category`.
   Do NOT test the header `parent category`: it does not work in Expo either. We copy Expo.
4. Pick an `.xlsx` file. Expect Expo's rejection message.
5. Export: the file `subcategories.csv` has the two columns and every subcategory.
6. Round trip: delete one `ZZ` subcategory, import the exported file, it comes back.
7. The "Import products (batch sheet)" button opens the placeholder page.
8. `git status -s` shows no `package.json` change.

### Row 3c: subcategory shelf price board (Built)

Create disposable `ZZ` catalog products assigned to a subcategory, using at least two product groups and two lengths. Do not change or delete real catalog data.

1. Expand the subcategory's product count. Confirm one board appears per product group, blank groups use `Ungrouped`, and each board groups rows by length, with missing lengths shown as `No length`.
2. Confirm each SKU shows product code, metric and inch size, MRP, Disc %, Sell, and the displayed selling price. Check default values against that product's catalog values.
3. Change MRP and Disc % on one row; confirm Sell recalculates. Change Sell; confirm Disc % recalculates. Save the size and confirm the saved values remain after the page reloads catalog data.
4. Enter a discount on one board and select **Apply to all sizes**. Confirm all products on that board update and products on other boards do not.
5. Try a negative MRP and a negative board discount. Confirm Expo's messages: `MRP must be a number.` and `Enter a discount percent for every size on this board.`
6. Expand a subcategory with no matched products and confirm the linked-product empty message is shown rather than a price board.
7. Temporarily set `SHELF_PRICE_BOARD_ENABLED` to `false` in the web feature flag, confirm the linked-product list is shown instead of the board, then restore it to `true` without committing the temporary change.
8. Confirm the Settings page has no shelf-price-board switch and that Product Groups remains unchanged in this row.
