# Row 5 — racks and rack slots schema

## Planned and built

Create the PostgreSQL schema for Mongo rack layout data without copying any Mongo documents. Alembic revision `0005_racks_schema` follows `0004_product_groups_schema` and introduces the row-5 rack tables while leaving row 6 catalog work untouched.

| Mongo collection / field | PostgreSQL table / field | Notes |
|---|---|---|
| `racks` | `racks` | `id` remains a string UUID, `name` is required, `rows` maps to `row_count`, `columns` maps to `column_count`, and the timestamps follow the migration standard. `name` is unique and indexed for sort/search. |
| `slots[]` | `rack_slots` | The nested slot list is flattened to one row per slot. Each slot has `rack_id` (FK to `racks.id`), `slot_code` (slot identifier within a rack), and nullable `product_id` for future catalog linkage. `UNIQUE(rack_id, slot_code)` prevents duplicate slot codes in the same rack. A partial unique index on non-null `product_id` reflects the “one product in one slot” assignment rule without implementing the transaction logic itself. |

This row intentionally does not implement the later transaction logic for rack assignment; it only creates the correct schema constraints so those writes can be added safely later.

## Relationships and standards alignment

- REL-12: rack layout is flattened from a nested Mongo array into a proper relational schema.
- TXN-15: the row does not implement a transaction, only the schema guard rails needed for later assignment logic.
- The row-5 tables follow the same `gen_random_uuid()::text` ID pattern as earlier rows and include `created_at`, `updated_at`, and nullable `deleted_at`.
- Delete policy decision: `rack_slots.rack_id` uses `ON DELETE CASCADE`, matching the ownership relationship where a slot disappears when the rack is removed.

## Slot grid generation rules for later data migration

For later data migration rows, the rack grid is derived from the row and column counts in `racks`:

- `row_count` and `column_count` specify the total grid dimensions.
- `slot_code` should be generated in a deterministic, stable pattern such as `R1C1`, `R1C2`, …, `R{row_count}C{column_count}`.
- The same per-rack slot code generation should be reused during any data-copy step so the unique pair `(rack_id, slot_code)` remains stable across imports.

## Files touched

- `backend/alembic/versions/0005_racks_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The execution log is `migration-db/exec-log/2026-10-10-05-racks-schema.md`; that directory is gitignored.

## Verification — local Postgres + Alembic

From the repository root with PostgreSQL running and `backend/.env` configured:

```powershell
Set-Location backend
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
```

For macOS/Linux, use the equivalent venv paths under `backend/.venv/bin/`.

The expected head revision is `0005_racks_schema`, and the public schema should include the rows 2–5 tables with the rack-slot uniqueness and index constraints present.

## DB-STANDARDS checklist for this row

1. **Every new table — applied.** `racks` and `rack_slots` each have a primary key, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Every relationship — applied.** `rack_slots.rack_id` is a real FK to `racks.id`, indexed, and uses `ON DELETE CASCADE` with an explicit decision documented.
3. **Search/filter/sort indexes — applied.** `racks.name`, `rack_slots.rack_id`, and `rack_slots.product_id` are indexed for access patterns and uniqueness checks.
4. **Never-repeat values — applied.** `racks.name` is unique, and `(rack_id, slot_code)` is unique within a rack; a partial unique index also prevents duplicate non-null product assignments.
5. **Multi-table writes — not applicable to this schema-only row.** No transactional writes or app routes were introduced.
6. **Protected API routes — not applicable to this row.** No route logic was added or changed.
7. **Incoming-data validation — not applicable to this row.** No request schema or payload validation was created.
8. **Audit log — deferred by the migration tracker.**

## Validation result

The row-5 migration was validated using the local PostgreSQL database and the project schema test suite. The migration chain reaches the row-5 objects without introducing drift beyond the expected schema set, and row 6 remains intentionally untouched per the stop boundary.
