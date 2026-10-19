# Web UI map index

Open **`pages/<file>`** for line-level detail. **SOW** = contract module (see `Sow/SOW.pdf`).

| Route | Map file | Source | One-line purpose |
|-------|----------|--------|------------------|
| `/` | — | `StartupRedirect.tsx` | Session check → `/dashboard` or `/login` |
| `/login` | [pages/login.md](pages/login.md) | `LoginPage.tsx` | Admin passcode login |
| `/register` | [pages/register.md](pages/register.md) | `RegisterPage.tsx` | Create admin company + login |
| `/dashboard` | [pages/dashboard.md](pages/dashboard.md) | `DashboardPage.tsx` | Ops snapshot + shortcuts (not full analytics) |
| `/catalog` | [pages/catalog.md](pages/catalog.md) | `CatalogPage.tsx` | Product list, filters, form, bulk price/stock, export |
| `/categories` | [pages/categories.md](pages/categories.md) | `CategoriesPage.tsx` | Category CRUD, photo, cascade delete |
| `/subcategories` | [pages/subcategories.md](pages/subcategories.md) | `SubcategoriesPage.tsx` | Subcategory CRUD, CSV, shelf price board |
| `/product-types` | [pages/product-types.md](pages/product-types.md) | `ProductTypesPage.tsx` | Type photos, toggle, purge by type |
| `/product-classes` | [pages/product-classes.md](pages/product-classes.md) + [features/catalog-facet-page.md](features/catalog-facet-page.md) | `ProductClassesPage.tsx` → **facet UI** | Class list from **full catalog** + expand/peek/purge |
| `/brands` | [pages/brands.md](pages/brands.md) | `BrandsPage.tsx` | Brand CRUD, logo, cascade delete |
| `/product-groups` | [pages/product-groups.md](pages/product-groups.md) | `ProductGroupsPage.tsx` | Groups (2+ products), shelf board, cascade delete |
| `/csv-import` | [pages/spreadsheet-imports.md](pages/spreadsheet-imports.md) | `SpreadsheetImportsPage.tsx` | Hub links to 4 import routes |
| `/import-products` | [pages/catalog-import.md](pages/catalog-import.md) | `CatalogImportPage.tsx` | Full master sheet import |
| `/import-products-batch` | [pages/catalog-import.md](pages/catalog-import.md) | `CatalogImportPage.tsx` | Batch master import |
| `/import-prices` | [pages/catalog-import.md](pages/catalog-import.md) | `CatalogImportPage.tsx` | Prices/discount sheet |
| `/import-stock` | [pages/catalog-import.md](pages/catalog-import.md) | `CatalogImportPage.tsx` | Stock qty sheet |
| `/racks` | [pages/racks.md](pages/racks.md) | `RacksPage.tsx` | Rack grid, assign product to slot |
| `/purchases` | [pages/purchases.md](pages/purchases.md) | `PurchasesPage.tsx` | Stock-in, bulk CSV, filtered export |
| `/inventory` | [pages/inventory.md](pages/inventory.md) | `InventoryPage.tsx` | Stock cards, low stock, moves, export |
| `/rfqs` | [pages/rfqs.md](pages/rfqs.md) | `RfqsPage.tsx` | RFQ list, filters, approve, edit, dispatch |
| `/partners` | [pages/partners.md](pages/partners.md) | `PartnersPage.tsx` | KYC, create partner, exports |
| `/dispatches` | [pages/dispatches.md](pages/dispatches.md) | `DispatchesPage.tsx` | Dispatch history, retail cart, RFQ dispatch |
| `/service-requests` | [pages/service-requests.md](pages/service-requests.md) | `ServiceRequestsPage.tsx` | Plumber/electrician admin lifecycle |
| `/settings` | [pages/settings.md](pages/settings.md) | `SettingsPage.tsx` | Taxonomy tab visibility, catalog wipe |
| `/team` | [pages/team.md](pages/team.md) | `TeamPage.tsx` | Team users, roles, active flag |

## Shared (not routes)

| Map | File |
|-----|------|
| Shell, sidebar, session | [shared-shell-and-components.md](shared-shell-and-components.md) |
| Facet list + peek + purge | [features/catalog-facet-page.md](features/catalog-facet-page.md) |
| Linked product count/list | `web/src/components/LinkedProducts.tsx` (see shared doc) |
| Shelf price board | `web/src/features/shelf-price-board/ShelfPriceBoard.tsx` |
| Spreadsheet import UI | `web/src/features/catalog-import/CatalogSpreadsheetImport.tsx` |
| Passcode destructive actions | `web/src/components/PasscodeConfirmModal.tsx` |

## Likely “REVIEW” areas (from your notes)

| Area | Map refs | Why |
|------|----------|-----|
| Ungrouped product peek lists | `catalog-facet-page` **facet.peek**, category/brand/group **ProductCountButton** | Loads many SKUs inline — poor at 1000+ products |
| Helper / demo copy | Search maps for `emptyText`, subtitle strings in page TSX | Clutter for client demo |
| Product class / type purge | **facet.purge-confirm**, product-types purge | Destructive; keep or gate |
