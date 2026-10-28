# Electrical v1 — product master sheet

Template id: `electrical_v1`

## Required columns (single header row)

Same order as the in-app download template:

Category, Type, Sub-Category, **Colours**, **Compound**, Conductor/Core/Pair, Brand, HSN Code, GST, UoM, product_family, Product Name (optional), Size (mm,cm,in), Length, Product Code, MRP (Rs) per nos, discount, Selling Price, Pack Size, MRP Pkg, ROL, status

## Safetech / two-row header (Excel)

Some workbooks (e.g. Safetech price list) put **Category / Type / Sub-Category** on row 1, leave columns D–E blank on row 1, put **Conductor/Core/Pair** on row 1 column F, then on **row 2** put **Colours**, **Compound**, and repeat **Conductor/Core/Pair** under D–F.

The web importer merges row 2 into blank header cells on row 1 before validation, so **Red**, **FR-LSH LF**, and **Class-5** data rows map correctly.

## Not pipes & fittings

Do not use pipe **`class`**. Electrical families are keyed by category, type, sub-category, **colours**, **compound**, conductor/core/pair, brand, and `product_family`.

## API

- `POST /api/catalog/import/electrical/validate`
- `POST /api/catalog/import/electrical`
- `GET /api/catalog/import/electrical/images/filter-options` (cascade: sub-category → colours → compound → brand → product_family)
- `POST /api/catalog/import/electrical/images` (one URL per family)

## Database

Migration `0021_product_families_colours_compound` adds nullable `product_families.colours` and `product_families.compound`. Conductor remains in `product_families.product_class` (same slot as pipe class, scoped by electrical category).
