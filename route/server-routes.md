# Routes in `backend/server.py`

There are no `@app.get` / `@app.post` / `@app.put` / `@app.delete` HTTP routes.
All HTTP endpoints are declared on `api = APIRouter(prefix="/api")` and mounted with `app.include_router(api)` at line 2714.
Effective URLs therefore start with `/api`.

Line numbers point to the decorator.

---

1. **POST** `/api/auth/requester/register` — line **576** — Registers a requester user (name, phone, address).
2. **POST** `/api/auth/admin/register` — line **591** — Registers an admin with a hashed passcode and seeds default money-config.
3. **POST** `/api/auth/admin/login` — line **629** — Checks admin contact/passcode and returns an opaque admin token plus profile fields.
4. **POST** `/api/auth/partner/register` — line **647** — Registers a mobile-app partner with hashed passcode and pending KYC.
5. **POST** `/api/auth/partner/login` — line **675** — Checks partner phone/passcode, records login, and returns a partner token.
6. **GET** `/api/auth/partner/me` — line **704** — Validates the Bearer partner token and returns the partner plus reward balance.
7. **POST** `/api/partners/register` — line **754** — Registers a referral partner with pending KYC (no passcode).
8. **POST** `/api/partners` — line **765** — Creates a partner and immediately marks KYC approved, location verified, and app active.
9. **GET** `/api/partners` — line **776** — Lists partners with optional search / KYC / sales-manager filters, reward balance, RFQ count, and sales performance.
10. **GET** `/api/partners/{partner_id}` — line **794** — Returns one partner with rewards, RFQ stats, sales performance, and purchase history.
11. **PUT** `/api/partners/{partner_id}/kyc` — line **806** — Approves or rejects partner KYC, updates location verification, and appends KYC history.
12. **GET** `/api/team/users` — line **826** — Lists admin / store_manager / staff users (no passcode hashes).
13. **POST** `/api/team/users` — line **832** — Creates a team user with role, permissions, and hashed passcode.
14. **PUT** `/api/team/users/{user_id}` — line **844** — Updates a team user's name, contact, role, active flag, and permissions.
15. **GET** `/api/categories` — line **1018** — Lists categories (optional active-only) with product counts; ensures default categories exist.
16. **POST** `/api/categories` — line **1031** — Creates a category if the name is unique.
17. **PUT** `/api/categories/{category_id}` — line **1044** — Updates a category and, if renamed, updates matching catalog and subcategory records.
18. **DELETE** `/api/categories/{category_id}` — line **1074** — Deletes a category and its subcategories (not catalog products).
19. **POST** `/api/categories/{category_id}/delete-cascade` — line **1084** — After admin passcode check, deletes the category, its subcategories, and catalog products in that category.
20. **GET** `/api/brands` — line **1100** — Lists brands with product counts.
21. **POST** `/api/brands` — line **1116** — Creates a brand with optional logo URL.
22. **PUT** `/api/brands/{brand_id}` — line **1128** — Updates a brand and, if renamed, updates catalog brand names for that brandId.
23. **POST** `/api/brands/{brand_id}/delete-cascade` — line **1149** — After admin passcode check, deletes the brand and catalog products tied to it.
24. **GET** `/api/product-types` — line **1169** — Syncs types from catalog, then lists product types (optional active-only) with product counts.
25. **POST** `/api/product-types` — line **1183** — Creates a product type with optional image URL.
26. **PUT** `/api/product-types/{type_id}` — line **1203** — Updates a product type and, if renamed, updates matching catalog `type` values.
27. **GET** `/api/catalog/tree` — line **1229** — Returns categories with nested product types and counts for partner browse (no mock tiles).
28. **GET** `/api/product-groups` — line **1286** — Lists product groups with product counts.
29. **POST** `/api/product-groups` — line **1296** — Creates a group of at least two valid products and links them on catalog items.
30. **PUT** `/api/product-groups/{group_id}` — line **1311** — Updates group name/membership and refreshes catalog `productGroupIds`.
31. **DELETE** `/api/product-groups/{group_id}` — line **1329** — Deletes a group and pulls its id from catalog items.
32. **POST** `/api/product-groups/{group_id}/delete-cascade` — line **1338** — After admin passcode check, deletes matching catalog products and the group.
33. **GET** `/api/racks` — line **1367** — Lists warehouse racks and slots.
34. **POST** `/api/racks` — line **1373** — Creates a rack with a grid of empty slots.
35. **DELETE** `/api/racks/{rack_id}` — line **1384** — Deletes a rack only if no products are assigned to slots.
36. **PUT** `/api/racks/{rack_id}/assign` — line **1395** — Assigns a product to a slot, clears that product from other racks, and stores rack fields on the catalog item.
37. **GET** `/api/racks/{rack_id}/products` — line **1409** — Lists catalog products assigned to a rack.
38. **GET** `/api/purchases` — line **1440** — Lists purchase transactions newest first.
39. **POST** `/api/purchases` — line **1446** — Validates purchase lines, increments stock, optionally assigns rack slots, and stores the purchase.
40. **POST** `/api/purchases/import` — line **1463** — Same as create purchase (bulk import uses the same handler).
41. **GET** `/api/rfqs` — line **1498** — Lists RFQs with optional partner, status, and search filters.
42. **POST** `/api/rfqs` — line **1508** — Creates a pending RFQ with priced lines and history.
43. **PUT** `/api/rfqs/{rfq_id}` — line **1519** — Updates an RFQ that is not dispatched/cancelled and appends history.
44. **POST** `/api/rfqs/{rfq_id}/approve` — line **1532** — Approves or rejects an RFQ, applies special discount/reward points, and may write the reward ledger.
45. **GET** `/api/partners/{partner_id}/rewards` — line **1553** — Returns reward balance and ledger entries for a partner.
46. **GET** `/api/rfqs/{rfq_id}/history` — line **1559** — Returns the event history of one RFQ.
47. **GET** `/api/dispatches` — line **1583** — Lists dispatch records newest first.
48. **POST** `/api/dispatches` — line **1589** — Creates a dispatch, decreases stock, and optionally marks a source RFQ as dispatched.
49. **GET** `/api/inventory` — line **1615** — Lists catalog stock, reorder levels, valuation, and rack location.
50. **GET** `/api/inventory/low-stock` — line **1624** — Same inventory view filtered to items at or below reorder level.
51. **GET** `/api/inventory/transactions` — line **1630** — Combined purchase (in) and dispatch (out) movement list, newest first.
52. **GET** `/api/subcategories` — line **1654** — Lists subcategories (optional `category_id`) with product counts.
53. **POST** `/api/subcategories` — line **1677** — Creates a subcategory under an existing category.
54. **PUT** `/api/subcategories/{subcategory_id}` — line **1703** — Updates subcategory name and parent category.
55. **DELETE** `/api/subcategories/{subcategory_id}` — line **1728** — Deletes a subcategory only.
56. **POST** `/api/subcategories/{subcategory_id}/delete-cascade` — line **1736** — After admin passcode check, deletes matching catalog products and the subcategory.
57. **POST** `/api/subcategories/import` — line **1761** — Bulk-inserts subcategories after validating category and uniqueness.
58. **GET** `/api/catalog` — line **1792** — Lists/searches catalog products with filters (category, type, brand, group, size, etc.) and normalized pricing/class fields.
59. **POST** `/api/catalog` — line **1882** — Creates a catalog product, resolves brand/taxonomy, upserts pricing, and may create the category/type.
60. **PUT** `/api/catalog/{item_id}` — line **1946** — Updates a catalog product (taxonomy, stock, images, pricing) and upserts pricing history.
61. **PATCH** `/api/catalog/{item_id}/pricing` — line **2020** — Updates MRP, discount, selling price, optional purchase price/stock for one item.
62. **POST** `/api/catalog/pricing-bulk` — line **2051** — Applies the same pricing/stock change to many catalog ids.
63. **DELETE** `/api/catalog/{item_id}` — line **2090** — Deletes one catalog product.
64. **POST** `/api/catalog/{item_id}/delete-secured` — line **2098** — After admin passcode check, deletes one catalog product.
65. **POST** `/api/catalog/purge-by-field` — line **2108** — After admin passcode check, deletes catalog products matching `type`, `productClass`, or `productGroup`.
66. **DELETE** `/api/catalog` — line **2124** — Wipes the catalog tree (catalog plus related taxonomy/rack assignments via `reset_catalog_tree`).
67. **POST** `/api/catalog/wipe-all` — line **2130** — Same wipe as above, but requires admin passcode.
68. **POST** `/api/catalog/import` — line **2138** — Bulk import of catalog rows; can replace existing data and create related taxonomy.
69. **POST** `/api/catalog/import/master` — line **2453** — Runs the master catalog import pipeline.
70. **POST** `/api/catalog/import/pricing` — line **2459** — Imports pricing by product code and records pricing history.
71. **POST** `/api/catalog/import/stock` — line **2499** — Imports stock quantities by product code.
72. **GET** `/api/money-config/{admin_id}` — line **2526** — Returns that admin's money config, creating defaults if missing.
73. **PUT** `/api/money-config/{admin_id}` — line **2545** — Upserts discount, GST, and display flags for an admin.
74. **GET** `/api/dashboard/snapshot` — line **2568** — Aggregates catalog, stock, RFQ, partner, dispatch, top-moving, and slow-moving metrics.
75. **GET** `/api/` — line **2661** — Health check: `{ service: "quotation-mirror", ok: true }`.
76. **GET** `/api/media/proxy` — line **2679** — Fetches an external image after URL/host checks and returns it with cache headers.

---

Lifecycle (not HTTP routes): `@app.on_event("startup")` at line 2725 and `@app.on_event("shutdown")` at line 2732.
