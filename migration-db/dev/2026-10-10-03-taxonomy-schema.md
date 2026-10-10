# Row 3 — taxonomy schema

## Planned and built

Create PostgreSQL schema only for the Mongo taxonomy collections that feed the catalog tree and product classification. No data copy occurs in this row, and no Mongo code is changed. Alembic revision `0003_taxonomy_schema` follows `0002_core_auth_schema`.

| Mongo collection | PostgreSQL table | Field mapping / notes |
|---|---|---|
| `categories` | `categories` | `id` stays a string UUID. Name-based taxonomy rows are enforced with `UNIQUE(name)`. `isDefault` → `is_default`, `isActive` → `is_active`, `productCount` → `product_count`, `imageUrl` → `image_url`. `name` is non-null and indexed for sort/search. |
| `subcategories` | `subcategories` | `id` stays a string UUID. `categoryId` → `category_id`, a real FK to `categories.id` with `ON DELETE RESTRICT`. `name` remains non-null and unique per parent category (`UNIQUE(category_id, name)`). `category_id` and the parent/name sort path are indexed. |
| `brands` | `brands` | `id` stays a string UUID. `name` is non-null and unique. `isActive` → `is_active`, `productCount` → `product_count`, `logoUrl` → `logo_url`. Name is indexed for alphabetical sort. |
| `product_types` | `product_types` | `id` stays a string UUID. `name` is non-null and unique. `isActive` → `is_active`, `imageUrl` → `image_url`, `productCount` → `product_count`. Name is indexed for alphabetical sort. |

All four tables follow the migration pattern already established in row 2: string `id` PKs, `created_at` and `updated_at` as `timestamptz` with `now()` defaults, and nullable `deleted_at`. The schema stays strictly row-3-only; catalog and pricing tables remain for later rows.

## Relationships and standards alignment

- REL-06: `subcategories.category_id` → `categories.id`, one-to-many; indexed FK.
- REL-07: taxonomy rows are related by id, not by copying names into foreign-key text columns.
- RSK-06: taxonomy entries are not allowed to silently drift into duplicate names or broken parent references. The database enforces name uniqueness and child-to-parent foreign keys.
- The row 3 tables keep the same ID convention as rows 0b–2: PostgreSQL supplies string UUID keys using `gen_random_uuid()::text`, and later data migration rows preserve the source Mongo string IDs without rewriting them.

## Files touched

- `backend/alembic/versions/0003_taxonomy_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The execution log is `migration-db/exec-log/2026-10-10-03-taxonomy-schema.md`; that directory is gitignored.

## Verification — local Postgres + Alembic

From the repository root with PostgreSQL running and `backend/.env` configured:

```powershell
Set-Location backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
psql -U quotation_app -h 127.0.0.1 -p 5432 -d quotation_db_pg -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
```

The expected revision is `0003_taxonomy_schema (head)`, and the public tables should include the row-2 auth tables plus `brands`, `categories`, `product_types`, and `subcategories`.

## DB-STANDARDS checklist for this row

1. **Every new table — applied.** Each taxonomy table has a primary key, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Every relationship — applied.** `subcategories.category_id` is a real FK to `categories.id` with `ON DELETE RESTRICT` and an index.
3. **Search/filter/sort indexes — applied.** Name columns and category-based parent lookups are indexed for sort/search access patterns.
4. **Never-repeat values — applied.** `categories.name`, `subcategories(category_id, name)`, `brands.name`, and `product_types.name` are unique at the database level.
5. **Multi-table writes — not applicable to this schema-only row.** No app routes or transactional writes were introduced.
6. **Protected API routes — not applicable to this row.** No routes were added or changed.
7. **Incoming-data validation — not applicable to this row.** No request schema was created or changed.
8. **Audit log — deferred by the migration tracker.**

## Validation result

The migration was validated with the project’s PostgreSQL schema tests and the live local database. `alembic upgrade head` resolves to `0003_taxonomy_schema (head)`, and the live schema includes the expected taxonomy tables with the correct uniqueness constraints and foreign keys.
