# Post-row 21 Alembic revision length fix

## Scope

Fix the PostgreSQL `alembic_version.version_num` width issue only. PostgreSQL
limits the version value to 32 characters; revision `0016` had a 33-character
ID. No Layer 2 or row 22 work was performed.

## Built

- Renamed the migration file to
  `backend/alembic/versions/0016_pg_group_name_uq.py` and shortened its
  revision ID to `0016_pg_group_name_uq` (21 characters).
- Updated migration `0017_rack_name_ci_unique`'s `down_revision` and header
  metadata to reference the shortened `0016` ID.
- Audited the whole migration chain. Revision lengths are all at most 32:
  `0015_optional_purchase_partner` is 30, `0016_pg_group_name_uq` is 21,
  `0017_rack_name_ci_unique` is 24, and `0018_service_requests_schema` is
  28. Earlier revisions are within the same limit.
- Updated the Layer 1C dev note's reference to the renamed migration file.
  There were no test references to the old revision ID. Historical
  execution logs retain their original record of the earlier filename/ID.
- No database column was widened. No schema operation was added or changed
  beyond the already-defined `0016`–`0018` migrations.

## Files

- Renamed `backend/alembic/versions/0016_product_group_name_ci_unique.py`
  to `backend/alembic/versions/0016_pg_group_name_uq.py`
- `backend/alembic/versions/0017_rack_name_ci_unique.py`
- `migration-db/dev/2026-10-13-post21-L1c-product-groups.md`

## Recovery guidance

The database was at `0015_optional_purchase_partner` before the fixed
upgrade. PostgreSQL reported transactional DDL; after updating the migration
chain, `alembic upgrade head` applied 0016, 0017, and 0018 successfully, and
the version table is now at `0018_service_requests_schema`.

For a database where the earlier failed update left it behind, rerun
`alembic current` followed by `alembic upgrade head`; the old 33-character
revision could not be stored in the unchanged 32-character column. If
`alembic current` reports an unknown or otherwise inconsistent revision,
back up the database and inspect `SELECT version_num FROM alembic_version;`
and the actual schema before changing the marker. Only if the database's
schema is verified to include the complete 0016 changes should an operator
use `alembic stamp 0016_pg_group_name_uq`; otherwise restore/correct the
schema first. Do not widen the column or manually rewrite the marker to hide
an incomplete migration.

## Verification

- `alembic upgrade head` completed successfully, advancing from
  `0015_optional_purchase_partner` through
  `0016_pg_group_name_uq`,
  `0017_rack_name_ci_unique`, and
  `0018_service_requests_schema`.
- `alembic current` reports `0018_service_requests_schema (head)`.
- Inspected all 18 Alembic revisions using Alembic's `ScriptDirectory`;
  every ID is at most 32 characters.
- Queried the database's `alembic_version.version_num`; it is
  `0018_service_requests_schema`, length 28.
- No database/API test suite was needed for this metadata-only correction.

Layer 2 and row 22 have not been started.
