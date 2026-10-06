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

Rebuilt from the dev notes. The original list was lost.

### Row 7a: catalog list, search, and filters (Built)

1. Open Manage Catalog. Confirm the product list, loading/error state, filtered and total item counts, and product columns for product, size, inch, length, MRP, discount, selling price, and stock.
2. Search by product name, product code, brand, and alias. Confirm matching is case-insensitive and the list/counts update.
3. Select a category chip. Confirm the list is filtered to that category and any selected type, class, and brand filters are cleared.
4. Open **Filter**. Confirm type choices depend on category, class choices depend on type, and brand choices depend on type and class. Apply filters and confirm the list updates; clear type, class, and brand and confirm those filters are removed.
5. Confirm the empty state appears when no products match.

### Row 7b: catalog product form (Built)

1. Add a product with the required name, unit, category, brand, and standard rate. Leave product code blank; confirm the saved product receives its code from the backend.
2. Try a nonnumeric standard rate and confirm `Please enter a valid rate.`. Confirm the form requires name, unit, category, and brand.
3. Change category and confirm a subcategory outside that category is cleared. Confirm the subcategory picker only lists matching subcategories, the brand picker lists active brands, and the category picker can create a category.
4. Enter optional size, length, aliases, Hindi and Gujarati names, display sequence, ROL, regular discount, purchase price, stock, and pricing fields. Confirm aliases split on commas and saved Hindi/Gujarati values use their respective language fields.
5. Upload a product image and save; edit the product using an image URL and save. Confirm the image is reflected in the form/product.
6. Change MRP and price discount and confirm selling price recalculates; change selling price and confirm standard rate follows it. Save, then edit an existing product and confirm its changes persist.

### Row 7c: catalog pricing (Built)

1. Change MRP or discount on a product row and confirm selling price recalculates. Change selling price with positive MRP and confirm discount recalculates.
2. Save a row with valid MRP, discount, selling price, and stock; confirm the values persist. Enter invalid values and confirm `Enter valid MRP, discount, selling price, and stock.`
3. Filter or search the catalog, note the listed-product count, apply a bulk discount, and confirm only currently listed products change. Repeat with **Set stock**.
4. Submit a blank bulk discount and confirm `Enter a discount % to apply to the listed products.` Submit blank bulk stock and confirm `Enter a stock quantity to apply to the listed products.`
5. When a bulk update skips products, confirm the result reports updated and skipped counts.

### Row 7d: catalog QR codes (Built)

1. Confirm a product QR appears in the form and beside its catalog row, generated from the product code (or the row's QR code when present).
2. In the form, confirm the QR uses the entered product code and displays the code text. Select **Download QR** and confirm a PNG named `<product-code>-qr.png` downloads.

### Row 7e: catalog CSV and delete decision (Built)

1. Search or filter the catalog, then download `catalog.csv`. Confirm it contains only the currently listed products and the header is `productCode,name,category,type,subcategory,class,brand,unit,mrp,sellingPrice,discount,stock,imageUrl`.
2. Confirm every data cell is quoted, embedded quotes are doubled, rows use line feeds, there is no BOM or trailing newline, and an image URL is represented as `(url)` (otherwise the field is empty).
3. Confirm the web export downloads through the browser and does not invoke a product delete API. Product deletion remains decision needed because Expo Web does not expose its native delete control.

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
