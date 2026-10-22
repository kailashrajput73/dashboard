# Product management: paging, read-only list, export modes (2026-10-22)

## Listing

- Server-paged `GET /catalog?page&limit&sort` (default sort `updated_desc`).
- Read-only row: image, name, subcategory/class/type chips, size, MRP/disc/sell/stock text; Edit/Delete only (no inline pricing, no QR).
- Pagination: 25/50/100, Previous/Next.
- `GET /catalog/filter-options` for facet dropdowns without loading full catalog.

## Export

- Export menu: full catalog | filter session | pick rows.
- Modes 2/3: checkboxes + floating **Download**; conflict dialog if filters + selection.

## Pipes family images download

- Subcategory required; only families **missing** `image_url`.
- CSV columns: brand, product_family, type, class, image_url.
