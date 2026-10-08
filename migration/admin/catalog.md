# Catalog

Use **Manage Catalog** to search, filter, view, and maintain products.

## Find products

- Search by product name, product code, brand, or alias.
- Select a category chip to filter by category. Changing category clears the type, class, and brand filters.
- Select **Filter** to choose a product type, product class, or brand. The class options follow the selected type; brand options follow the selected type and class. Select **Apply filters** to apply the choices or **Clear type, class, and brand** to clear them.

Rows show the product, size, MRP, discount, selling price, and stock. More catalog actions are documented here as rows 7b–7e are built.

## Add or edit a product

- Select **Add item** or the row's edit icon. Enter **Item Name**, **Unit**, **Category**, **Brand**, and **Standard rate (same as selling)**; these are required. If the rate is not a number, the form shows `Please enter a valid rate.` The form also requires name, unit, category, and brand.
- **Product code (optional)** may be left blank. The backend generates a code when the product is saved; the browser does not generate it.
- Choose a category in the picker. It also lets you create a category. Changing category clears a subcategory that does not belong to it. The subcategory picker lists only subcategories under the chosen category. The Brand picker lists active brands.
- Optional product details include size in mm, size in inches, length, aliases (separated by commas), Hindi and Gujarati names, display sequence, reorder level (ROL), regular discount, and product image. For an image, upload a file or paste an image URL.
- Optional pricing and stock fields are MRP, price discount (%), selling price, purchase price, and stock quantity. Changing MRP or price discount recalculates selling price; standard rate follows the selling price.
- Optional billing and pack fields are HSN Code, GST (%), Pack Size, and MRP per pack.
- Select **Add Item** or **Save Changes**. A save failure is shown in the error dialog.

## Change pricing and stock

- Change MRP or Discount % in a product row; selling price recalculates. Changing selling price recalculates Discount % when MRP is greater than zero. Select **Save** for that row. Invalid row values show `Enter valid MRP, discount, selling price, and stock.`
- **Apply discount** and **Set stock** affect all products currently listed after search and filters. Check the listed-product count before using either control: each bulk action can change many products at once.
- A blank bulk discount shows `Enter a discount % to apply to the listed products.` A blank bulk stock value shows `Enter a stock quantity to apply to the listed products.` The result reports updated and skipped products when any were skipped.

## QR codes and export

- A QR is generated from the product code. It appears in the product form and beside each product row. In the form, select **Download QR** to save `<product-code>-qr.png`.
- Select the download icon in Manage Catalog to download `catalog.csv`. It contains the 19-column master-sheet export for only the products currently shown after search and filters, including HTTP(S) image URLs when available.
- Select the delete icon on a product row and confirm with the admin contact and passcode. Deletion is permanent; it removes the selected product. Verify the product before confirming.