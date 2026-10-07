# Product master sheet — final column layout (2026-09-30)

Use this for **full master** and **batch master** imports. Download template from admin: **Spreadsheet imports → Download empty template**.

## Header row (exact names)

```text
Category, Type, Sub-Category, class, Brand, Product Name, Size (cm), Length, Product Code, HSN Code, GST, UoM, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, image_url
```

## Meaning (API / mobile — not UI layout)

| Column | Stored as | Used for |
|--------|-----------|----------|
| Category | `category` | Top level (e.g. PIPES) |
| **Type** | **`type`** | Material: **UPVC, CPVC, PVC** — partner app “product type” filters |
| Sub-Category | `subcategory` | Line under category (e.g. UPVC) |
| **class** | **`productClass`** | **Sch 40, SDR11** — partner “class” filters |
| Brand | `brand` | |
| Product Name | `name`, `productName` | |
| Product Code | `productCode`, **`qrCode`** | Scan / QR |
| ROL | **`reorderLevel`** | Low-stock threshold (inventory; alerts later) |
| image_url | **`imageUrl`** | Partner app reads from `GET /api/catalog` |
| MRP / discount / Selling Price | pricing fields | On **new** rows from master; use **Prices import** for updates |

**Do not** put Sch 40 in the **Type** column — that breaks admin type tabs and mobile hierarchy. Use the **class** column.

## What master import does *not* change on existing SKUs

- **Stock** — use Purchases or Stock import  
- **Prices** on existing codes — use Prices import (unless product is new)

## Legacy mistake (fixed in importer)

Old sheets had **Sub-Category = UPVC** and **Type = Sch 40**. Importers still accept that **only if `class` is empty**. New sheets must use **Type + class** as above.

## Partner mobile

Dashboard only **uploads + API**. App team builds category/type/class UI from JSON fields on each product.
