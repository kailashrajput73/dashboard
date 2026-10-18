# RFQs

Use RFQs to review quotation requests from partners and export the currently filtered list.

## Find requests

- Search by partner name, phone, business name, RFQ ID, product name, or product code.
- Select a status tab: All, Pending, Approved, Rejected, or Dispatched. Counts show the number in each status.
- Filter by partner, category, product, or sales manager when those options are available. Category choices come from catalog products on RFQ lines; selecting a category narrows the product choices. Category and product selections combine with the other filters.
- Enter From and To dates in `YYYY-MM-DD` format to limit requests by creation date. Each valid bound applies independently; if both valid dates are reversed, both bounds apply and no request can match. The screen reports invalid date input and reversed ranges.
- The summary shows RFQ count, line count, total quantity, and total value for the current filters.

## Export

Select the download icon to export the filtered requests as a CSV. Each product line is a row. The file contains RFQ and partner identifiers, status, product and quantity, prices and totals, discount, reward points, delivery details, and dates.

There are no destructive actions on this list view. RFQ creation and review actions are documented as they are migrated.

## Create and edit

Select the plus icon to create an RFQ. Search for a partner by name, phone, business name, or ID, then choose one. Search the catalog by product name or code and select a product with a product code. Enter a positive quantity, choose Store pickup or Home delivery, and optionally enter the pickup/delivery date and time. Submit to create the request.

Open a request to review its product lines. Before it is dispatched or cancelled, change quantities, remove lines, or add a catalog product by typing or scanning its product code. Adding a product already on the RFQ increments its quantity. Update delivery mode or schedule if needed, then select Save changes.

Invalid or empty line lists and non-positive quantities cannot be saved. Creating or editing changes the RFQ in the system; review the selected partner, products, quantities, and delivery details before saving.

## Review, decide, and dispatch

Open a pending RFQ to see its history. Enter a special discount percentage and choose Approve + reward or Reject. The screen shows an estimated reward after discount; the final reward is recorded by the approval workflow.

For an approved RFQ, check the stock message before dispatching. Dispatch is available only when every product is in the catalog and its available stock covers the requested quantity. Select Dispatch & deduct stock to create the dispatch and reduce stock.

Approval or rejection changes the RFQ status. Dispatch reduces stock, moves the RFQ to Dispatched, and prevents further RFQ edits; these actions cannot be undone from the RFQ screen.
