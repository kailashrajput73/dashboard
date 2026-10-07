# Spreadsheet Imports

## Availability

The full master import is available from Spreadsheet imports. The batch master import is available from Subcategories → Import products (batch sheet). Prices and stock imports are covered by row 10c.

## File types

Choose a CSV or `.xlsx` spreadsheet. Legacy `.xls` files are rejected; save them as `.xlsx` or CSV (UTF-8). The browser reader reports an error when it cannot read the workbook. Import checks should be performed through the finished row 10b/10c pages.

## Templates and columns

The template files keep the existing Expo names and headers:

- Full master and batch master use the exact 19-column header in `migration/SHEET-FORMAT.md`: `Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url`.
- Prices use `Product Code, MRP (Rs) per nos, discount, Selling Price`.
- Stock uses `Product Code, qty`.

Do not rename, reorder, or reinterpret columns. On master import, existing products keep their stock and prices; use the price or stock import for those updates.

## Prices

Open **Prices & discount** from Spreadsheet imports. The template columns are `Product Code, MRP (Rs) per nos, discount, Selling Price`. Product Code is required. The importer also accepts the same full client master sheet and uses only its price fields. A decimal discount such as `0.49` means 49%. If Selling Price is blank, it is calculated from MRP and discount. Price updates are sent to the existing price-import API.

## Stock quantities

Open **Stock quantities** from Spreadsheet imports. The template columns are `Product Code, qty`; `stock_qty` is also accepted. This import sets the absolute on-hand quantity, so use Purchases for incoming supplier goods. Stock updates are sent to the existing stock-import API.
