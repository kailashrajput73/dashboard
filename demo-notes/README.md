# Demo notes (one file per major change)

Use these before a client demo or handoff. Each file is a **single release or feature slice** — add a new dated file when something major ships; do not grow one mega-doc.

| File | What changed |
|------|----------------|
| [2026-09-20-01-split-catalog-imports.md](./2026-09-20-01-split-catalog-imports.md) | Master / price / stock imports |
| [2026-09-20-02-secured-delete-wipe.md](./2026-09-20-02-secured-delete-wipe.md) | Passcode deletes + catalog wipe |
| [2026-09-20-03-rfq-admin-and-catalog-exports.md](./2026-09-20-03-rfq-admin-and-catalog-exports.md) | RFQ edit/scan/dispatch + CSV exports |
| [2026-09-20-04-overview-snapshot.md](./2026-09-20-04-overview-snapshot.md) | Overview KPIs + moving / slow products |
| [2026-09-23-05-mongodb-indexes.md](./2026-09-23-05-mongodb-indexes.md) | MongoDB indexes; catalog Class (`productClass`); Category/Brand photos on edit (not Excel); Manage Catalog Category chips + Filter |
| [2026-09-23-06-database-flow-simple.md](./2026-09-23-06-database-flow-simple.md) | **Database flow (simple)** — send to frontend/UI for design |
| [2026-09-23-06-database-flow-handoff.md](./2026-09-23-06-database-flow-handoff.md) | Database flow (technical) — APIs, collections, diagrams |
| [2026-09-26-07-category-type-photos.md](./2026-09-26-07-category-type-photos.md) | Category + type home photos (not Excel); `GET /catalog/tree`; drop mock app tiles |
| [SHEET-FORMAT.md](./SHEET-FORMAT.md) | **Final master Excel columns** (Type vs class, ROL, image_url) |
| [2026-09-30-08-master-sheet-type-class-rol.md](./2026-09-30-08-master-sheet-type-class-rol.md) | Sheet column fix, ROL import, taxonomy mapping + re-import note |
| [2026-09-30-09-product-form-gaps.md](./2026-09-30-09-product-form-gaps.md) | Product form: save ROL on master import, QR image, subcategory picker, Hindi and Gujarati names |
| [2026-10-05-10-product-sow-export-and-billing-fields.md](./2026-10-05-10-product-sow-export-and-billing-fields.md) | Master-shaped catalog export and product form HSN/GST/package fields |
| [2026-10-05-11-purchase-sow-ux-export-report.md](./2026-10-05-11-purchase-sow-ux-export-report.md) | Purchase web CSV export, searchable record form, bulk feedback, and date-filtered report |
| [2026-10-05-12-partner-sow-admin-kyc-export.md](./2026-10-05-12-partner-sow-admin-kyc-export.md) | Partner admin detail, KYC review, direct create, manager filtering, and CSV export |
| [2026-10-06-13-rfq-admin-sow-gap-closeout.md](./2026-10-06-13-rfq-admin-sow-gap-closeout.md) | RFQ admin list filters, filtered export, searchable create flow, and detail approval/dispatch gap closeout |
| [2026-10-06-14-dispatch-sow-export-retail-rfq-ux.md](./2026-10-06-14-dispatch-sow-export-retail-rfq-ux.md) | Dispatch admin export, filtered report, multi-line retail billing, and RFQ dispatch UX cleanup |
| [2026-10-06-15-inventory-sow-export-ui-polish.md](./2026-10-06-15-inventory-sow-export-ui-polish.md) | Inventory stock cards, low-stock warning hierarchy, export filtered views, and clearer in/out movement UX |
| [2026-10-06-16-team-sow-and-demo-bug-sweep.md](./2026-10-06-16-team-sow-and-demo-bug-sweep.md) | Team SOW polish, teammate admin login, and the final demo bug sweep for rack assign, catalog export, money config, and secured delete discoverability |

**Deploy reminder:** With `USE_CLOUD_PREVIEW = true` in `frontend/src/config/env.ts`, Render must run the same `backend/server.py` as local or new routes fail with 404.

**Mobile / partner app developer:** share [../docs/MOBILE_APP_API_HANDOFF.md](../docs/MOBILE_APP_API_HANDOFF.md) (API shapes + upload → catalog mapping).
