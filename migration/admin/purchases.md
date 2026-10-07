# Purchases

Use Purchases to record supplier stock receipts, upload multiple purchase lines from CSV, and review purchase history.

## Record a purchase

1. Select **Record purchase**.
2. Search by product name, product code, or brand and select a product with a product code.
3. Enter quantity, list price, and purchase discount percent.
4. Optionally select a rack and one of its slots. If a rack is selected, choose a slot.
5. Select **Receive** to submit the purchase.

Quantity must be greater than zero. List price and purchase discount must be valid non-negative numbers. A rack requires a slot. The purchase updates stock through the existing purchase API.

## Bulk CSV

Use **Template** for the `purchase-lines-template.csv` header:

`productCode,quantity,listPrice,purchaseDiscount,rackId,rackSlot`

Select **Bulk CSV** to choose a CSV. Each row requires product code, positive quantity, and non-negative list price. Purchase discount is optional and defaults to zero. If rack ID is supplied, rack slot is required. The import reports row validation errors before submitting the batch.

## History, filters, and export

History shows purchase transactions and their product lines. Enter optional From and To dates in `YYYY-MM-DD` format to filter the history. The summary reports filtered transaction count, line count, quantity, and list value. Invalid dates or a start date after the end date show a validation message and disable export.

Use the download icon to export filtered purchase lines as `purchases.csv`, with the same six columns as the template. The template and CSV export do not include transaction IDs or timestamps.
