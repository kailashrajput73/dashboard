# Read-only Expo/Web sync audit

**Date:** 2026-10-07  
**Scope:** Compare current Expo (`frontend/`) against the React app (`web/`) for the requested migration rows. No application code or `migration/STATUS.md` was changed.

## Source and branch delta

Requested command: `git diff --stat 252631c..HEAD -- frontend`

```text
frontend/README.md                        |  50 ---
frontend/app/(admin)/catalog.tsx          |  75 +++-
frontend/app/(admin)/dashboard.tsx        |   7 -
frontend/app/(admin)/dispatches.tsx       | 567 ++++++++++++++++++++++++++++--
frontend/app/(admin)/inventory.tsx        | 416 +++++++++++++++++++++-
frontend/app/(admin)/money-config.tsx     | 232 ------------
frontend/app/(admin)/partners.tsx         | 470 ++++++++++++++++++++++++-
frontend/app/(admin)/purchases.tsx        | 474 +++++++++++++++++++++++--
frontend/app/(admin)/rfqs.tsx             | 440 +++++++++++++++++------
frontend/app/(admin)/service-requests.tsx | 285 +++++++++++++++
frontend/app/(admin)/team.tsx             | 304 +++++++++++++++-
frontend/src/api/client.ts                |   4 +-
frontend/src/api/endpoints.ts             | 117 +++++-
frontend/src/components/AdminShell.tsx    |   2 +-
14 files changed, 2960 insertions(+), 483 deletions(-)
```

The requested `migration/INVENTORY.md` is the 2026-10-01 baseline; its Migration delta is in [docs/migration/INVENTORY.md](../../docs/migration/INVENTORY.md). The requested [migration/SHEET-FORMAT.md](../SHEET-FORMAT.md) does not exist in this checkout. The available spec is [demo-notes/SHEET-FORMAT.md](../../demo-notes/SHEET-FORMAT.md), which I used for the header comparison. [migration/bug_fix/HANDOFF-READY.md](../bug_fix/HANDOFF-READY.md) says Service requests is now in scope.

## Row comparisons

### 1d menu

- Current Expo `AdminShell.tsx` adds **Service requests** and removes **Money config** from Sales.
- Web `AdminShell.tsx` still shows **Money config** and does not show **Service requests**. Web `App.tsx` has a Money config placeholder route and no Service requests route.

### 7a–7e catalog

- Web and Expo both have category/type/class/brand filters, product search, editable pricing rows, bulk discount/stock actions, and product QR.
- Expo's form now has **HSN Code**, **GST (%)**, **Pack Size**, and **MRP per pack** under Billing and pack details. The web `CatalogProductEditor` has none of those four fields.
- Expo's catalog export now uses the 19-column master-sheet header: `Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url`.
- Web still exports 13 columns: `productCode, name, category, type, subcategory, class, brand, unit, mrp, sellingPrice, discount, stock, imageUrl`. Web writes `(url)` rather than the actual image URL; Expo writes an HTTP(S) image URL when present.
- Expo has regular and secured catalog deletion (`DELETE /catalog/{id}` and `POST /catalog/{id}/delete-secured`). Web `CatalogPage` has no delete action or secured-delete API call.
- The shared list/create/update/pricing API calls are present in both; no missing type/class/brand/category filters were found in web.

### 9 racks

- Web and Expo both expose rack create, grid slots, product assignment, and rack delete, using `GET /racks`, `POST /racks`, `PUT /racks/{id}/assign`, `DELETE /racks/{id}`, and `GET /catalog`.
- No additional rack fields, filters, or exports were found in current Expo compared with web. The inventory delta notes a backend rack-assignment fix and updated Expo error handling; the web screen also surfaces API errors. No rack CSV export exists in either screen.

### 10a–10c imports

- The Expo import screens, shared import component, parser, and template files are absent from the `252631c..HEAD` frontend diff; no post-audit change was found in those files.
- Master header comparison: `demo-notes/SHEET-FORMAT.md`, Expo `MASTER_TEMPLATE_HEADERS`, and web `MASTER_TEMPLATE_HEADERS` have the same 19 exact names in the same order.
- The web import hub links to `/import-products`, `/import-prices`, and `/import-stock`, but `web/src/App.tsx` does not register those routes. Its only import-specific route is `/import-products-batch`, which renders an EmptyPage. `CatalogSpreadsheetImport` exists but is not mounted by `App.tsx`. The tracker still marks 10a–10c Not started.

### 11 purchases

- The web `/purchases` route renders an EmptyPage; it has no purchase API calls, entry form, filters, or export.
- Current Expo has From/To date filters, a report summary (transactions, lines, quantity, list value), searchable product selection by name/code/brand, rack and slot selection, plus **Template**, **Bulk CSV**, and **Record purchase** buttons.
- Expo purchase export now uses `productCode,quantity,listPrice,purchaseDiscount,rackId,rackSlot` and exports the date-filtered lines. The earlier Expo export header was `purchaseId,createdAt,productCode,productName,quantity,listPrice,purchaseDiscount`.
- Expo calls `GET /catalog`, `GET /racks`, `GET /purchases`, and `POST /purchases`; none is called by the web placeholder.

### 12 inventory

- The web `/inventory` route renders an EmptyPage; it has no inventory API calls, filters, or export.
- Current Expo has search; **Current stock**, **Low stock**, and **Stock in/out** tabs; From/To date filters on movements; report summaries including units, valuation, low-stock count, and movement in/out/net; and an export button for the active view.
- Expo stock export columns: `productCode,name,category,brand,stock,reorderLevel,unitCost,valuation,rackName,rackSlot`. Movement export columns: `type,productCode,productName,quantity,referenceId,at`.
- Expo calls `GET /inventory`, `GET /inventory/low-stock`, and `GET /inventory/transactions`; none is called by the web placeholder.

### 13 partners

- The web `/partners` route renders an EmptyPage; it has no partner API calls, filters, create/KYC workflow, or export.
- Current Expo has search, status filters (**all/pending/approved/rejected**), a sales-manager filter, **Add partner**, KYC history, required rejection reason, rewards/history detail, and filtered CSV export.
- Expo admin-create fields are name, phone, address, business name, pincode, city, area, sales manager, and documents. Its 20 CSV columns are `id,name,phone,businessName,address,pincode,city,area,salesManager,kycStatus,appActive,locationVerified,rewardBalance,rfqCount,approvedRfqCount,approvedRfqValue,registeredVia,lastAppLoginAt,loginCount,createdAt`.
- Expo list calls accept `search`, `kyc_status`, and `sales_manager`; Expo also calls partner detail, create, KYC review, and rewards APIs. The web placeholder calls none.

## Service requests and Money config

- SCR-29 exists in current Expo at `frontend/app/(admin)/service-requests.tsx`; it has search, status and service-type filters, lifecycle update fields, and history. Current Expo `AdminShell.tsx` includes its navigation item.
- Money config is gone from the current Expo sidebar and its screen file is deleted in this branch diff. It is not gone from the React sidebar: web still lists the link and has a placeholder route.

## Proposed tracker changes (not applied)

| Proposed row action | Size | Evidence / scope |
|---|---:|---|
| Update 1d: sync web menu; remove Money config and add Service requests navigation when its screen is ported | S | Expo sidebar changed; web sidebar is stale. |
| Add catalog sync follow-up to 7b/7e: billing fields, master-shaped export, image URL, secured deletion | M | Web form/export/delete differ from current Expo; filters, pricing, and QR are already present. |
| Add racks sync verification to row 9 | S | Controls and API calls match; verify assignment behavior against the post-audit backend fix. |
| Keep 10a–10c Not started; no Expo import/template delta | M | Header matches, but web importer routes are unregistered and the batch route is a placeholder. |
| Keep row 11 Purchases Not started; port current date/report UX, searchable picker, rack/slot, and export | M | Web route is a placeholder. |
| Keep row 12 Inventory Not started; port current tabs, movement date filter, summaries, and exports | M | Web route is a placeholder. |
| Keep row 13 Partners Not started; port filters, admin create, KYC history, rewards, and export | L | Web route is a placeholder. |
| Add SCR-29 Service requests after Dispatch and before Dashboard in the phase order | M | Current Expo screen exists; web has no route or screen. |
| Mark row 17 Money config skipped for React migration (tracker-only decision) | S | FIX-05 removed it from current Expo navigation; migration delta says not to port unless reopened. |
