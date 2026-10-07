# Inventory

Inventory has three views: **Current stock**, **Low stock**, and **Stock in/out**. Search matches product name, code, category, and brand for stock rows; movement search matches product name, code, and reference ID.

## Stock views

Each row shows product name/code, category and brand when present, rack and slot when assigned, current quantity, and reorder level. Valuation and unit cost are shown when returned by the API. Rows at or below their reorder level are marked **Low stock**.

The report summary follows the selected view and search. Current stock and Low stock summarize products, units, valuation, and low-stock count.

## Stock movements

Choose **Stock in/out** to review incoming and outgoing stock movements. Optional From and To dates use `YYYY-MM-DD`. Invalid dates or a start date after the end date show a validation message. Search also matches movement reference IDs. The summary reports movement lines and incoming, outgoing, and net quantities.

## Export

Use the download icon to export the visible filtered view. Current stock and Low stock export product code, name, category, brand, stock, reorder level, unit cost, valuation, rack name, and rack slot. Stock in/out exports type, product code/name, quantity, reference ID, and timestamp. Exports include a UTF-8 BOM and the date in the filename.
