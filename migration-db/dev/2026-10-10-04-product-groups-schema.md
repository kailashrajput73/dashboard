# Row 4 — product groups schema

## Planned and built

Create the PostgreSQL schema for Mongo product-group membership data without copying any Mongo documents. Alembic revision `0004_product_groups_schema` follows `0003_taxonomy_schema` and introduces the row-4 group tables while keeping the later catalog table for row 6.

| Mongo collection / field | PostgreSQL table / field | Notes |
|---|---|---|
| `productGroups` | `product_groups` | `id` remains a string UUID, `name` is required, `productCount` maps to `product_count`, and `created_at`, `updated_at`, `deleted_at` follow the migration standard. `name` is unique and indexed for sort/search. |
| `productIds[]` on a product group + `productGroupIds[]` on a catalog row | `product_group_items` | Flattened into a join table with `(product_group_id, product_id)` as the natural key. This keeps the many-to-many relationship explicit and indexable. `product_group_id` has a real FK to `product_groups.id` with `ON DELETE CASCADE`; `product_id` is stored as a string ID for the future `catalog.id` row-6 table. |

This row intentionally does not add a catalog FK yet because the catalog table is not created until row 6. Instead, it stores the string product ID and documents the future FK in the dev note, which matches the row-4 requirement to keep the deliverable complete while deferring the catalog relation to row 6.

## Relationships and standards alignment

- REL-11: product groups are represented as a many-to-many link table instead of duplicated arrays.
- RSK-06: taxonomy and catalog references use ids, not duplicated names; this row stores only the product id and leaves the actual catalog FK to row 6.
- The row-4 tables follow the same `gen_random_uuid()::text` ID pattern as earlier rows and include `created_at`, `updated_at`, and nullable `deleted_at`.
- Delete policy decision: `product_group_items.product_group_id` uses `ON DELETE CASCADE` because the join rows are subordinate to the owning product group and should disappear with the group.

## Files touched

- `backend/alembic/versions/0004_product_groups_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The execution log is `migration-db/exec-log/2026-10-10-04-product-groups-schema.md`; that directory is gitignored.

## Verification — local Postgres + Alembic

From the repository root with PostgreSQL running and `backend/.env` configured:

```powershell
Set-Location backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
```

For macOS/Linux, use the same commands with the venv path equivalent to `backend/.venv/bin/alembic` and `backend/.venv/bin/python`.

The expected head revision is `0005_racks_schema` once row 5 is fully applied, and the public schema should include the row-2, row-3, and row-4 tables plus the row-5 tables after the row-5 migration is run.

## DB-STANDARDS checklist for this row

1. **Every new table — applied.** `product_groups` and `product_group_items` each have a primary key, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Every relationship — applied.** `product_group_items.product_group_id` is a real FK to `product_groups.id`, indexed, and uses `ON DELETE CASCADE` with an explicit decision documented.
3. **Search/filter/sort indexes — applied.** `product_groups.name` and the reverse lookup `product_group_items.product_id` are indexed for group and membership access patterns.
4. **Never-repeat values — applied.** `product_groups.name` is unique at the database level.
5. **Multi-table writes — not applicable to this schema-only row.** No transactional writes or routes were introduced.
6. **Protected API routes — not applicable to this row.** No route logic was added or changed.
7. **Incoming-data validation — not applicable to this row.** No request schema or payload validation was created.
8. **Audit log — deferred by the migration tracker.**

## Validation result

The row-4 migration was validated using the local PostgreSQL database and the project schema test suite. The migration chain reaches the row-4 objects without introducing drift into the expected schema set, and the row-5 migration remains the stopping point as requested.
