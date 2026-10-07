# Spreadsheet Imports

## Availability

The React app's spreadsheet import pages are not connected to routes yet. This row supplies the shared browser CSV/XLSX reader, templates, and import component; the full master and batch-master pages are covered by row 10b, and price/stock pages by row 10c.

## File types

Choose a CSV or `.xlsx` spreadsheet. Legacy `.xls` files are rejected; save them as `.xlsx` or CSV (UTF-8). The browser reader reports an error when it cannot read the workbook. Import checks should be performed through the finished row 10b/10c pages.

## Templates and columns

The template files keep the existing Expo names and headers:

- Full master and batch master use the exact 19-column header in `migration/SHEET-FORMAT.md`: `Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url`.
- Prices use `Product Code, MRP (Rs) per nos, discount, Selling Price`.
- Stock uses `Product Code, qty`.

Do not rename, reorder, or reinterpret columns. On master import, existing products keep their stock and prices; use the price or stock import for those updates.
