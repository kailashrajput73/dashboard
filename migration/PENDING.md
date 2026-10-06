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

### Row 4: brands (Built)

Use only disposable test data with names beginning `ZZ`. Do not delete or alter real brands or products.

1. Create a `ZZ` brand with a logo file, then create another with a picture URL. Confirm thumbnails appear in the list. Remove or replace a logo through edit.
2. Search for each brand and check **All**, **Active**, and **Inactive** filters. Toggle a `ZZ` brand inactive and active; confirm its status and filter membership update.
3. Link disposable catalog products to a `ZZ` brand. Confirm the count and expanded linked list include products matched by brand ID and by case-insensitive brand name.
4. Edit a `ZZ` brand name. Confirm the page only sends the brand update and the backend updates linked products' brand text; reload and verify the linked count/list remain correct.
5. Try saving a blank brand name and confirm `Brand name is required.`. Try a duplicate name and confirm the API error is shown.
6. Start delete on a disposable `ZZ` brand. Confirm the dialog says `Deletes this brand and every product linked to it.`, pre-fills the signed-in admin contact, and requires the passcode. Cancel and confirm nothing was removed.
7. Delete the disposable brand with valid credentials. Confirm only that brand and its linked test products are removed, and the success message reports the product count. Never use a real brand for this check.

### Row 5: product types (Built)

Use disposable products with a `ZZ` Type value. Do not change or purge real products.

1. Open Product type and confirm the list, product counts, and **All**, **Active**, and **Inactive** filters. Search for `ZZ` and confirm the matching type rows.
2. On a disposable type, upload a logo file, then edit it to use a URL. Remove or replace the photo and save; confirm the image updates and the type name does not change.
3. Toggle a `ZZ` type inactive and active. Confirm its status and filter membership update.
4. Expand a `ZZ` type's product count and confirm the linked product list and count match products whose Type equals that type, case-insensitively.
5. Start deleting a `ZZ` type's products. Confirm the dialog requires the admin passcode and says `Removes every product with this type. Requires admin passcode.` Cancel once and confirm nothing changes. Then confirm using a valid passcode and verify only disposable products of that type are removed, the type remains, and the success count is correct.
6. Confirm a blank name editor/create action is not present; Product Types only has photo editing, matching Expo.

### Row 6: product classes (Built)

Use disposable catalog products with `ZZ` names/classes. Do not delete or alter real products.

1. Open Product class and confirm the list is sorted, class names group case-insensitively, and the subtitle reports filtered and total facet counts.
2. Confirm products with explicit `productClass` values appear under that class. Add disposable products without an explicit class whose names contain `SDR 13.5`, `SDR 11`, `Sch 80`, and `Sch 40`; confirm Expo's inferred labels and counts.
3. Search for a `ZZ` class, expand its count, and confirm the linked product list contains only products matched to that class.
4. Search for a value with no matches and confirm `No product classes yet. Import a sheet with a Class column (SDR11, Sch 40).`
5. Start delete for a disposable class. Confirm the title, message `Removes every product with this value. Requires admin passcode.`, prefilled admin contact, and passcode requirement. Cancel and confirm nothing changes.
6. Confirm deletion for the disposable class with a valid passcode. Verify only test products with the stored matching `productClass` are removed and the message reports the count. Do not use a real class.
7. Confirm the Product type page remains available and Product Groups was not changed in this group.
