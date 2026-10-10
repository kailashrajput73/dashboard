# Row 10 — reward ledger schema

## Planned and built

Created the PostgreSQL schema for Mongo COL-16 `reward_ledger` in Alembic
revision `0010_reward_ledger_schema`, following `0009_rfqs_schema`. This is
schema-only work: no ledger data copy, routes, RFQ approval writes, or
TXN-17 implementation was added.

| Mongo field | PostgreSQL field | Notes |
|---|---|---|
| `id` | `id` | String primary key. |
| `requesterId` | `requester_id` | Required real FK to `partners.id`, `ON DELETE RESTRICT`. |
| `quotationId` | `quotation_id` | Required real FK to `rfqs.id`, `ON DELETE RESTRICT`. |
| `points` | `points` | Required integer. |
| `type` | `type` | Required text; supports source `earned` and `redeemed` values. |
| `createdAt` | `created_at` | Timestamp with timezone; server default `now()`. |
| — | `updated_at`, `deleted_at` | Standard timestamp columns; `deleted_at` is nullable. |

Partner and RFQ deletion are restricted while ledger history references
them. This preserves financial/reward history and avoids deleting a ledger
entry through a parent cascade.

## Indexes and uniqueness

- `reward_ledger_requester_created` on `requester_id, created_at DESC`
  supports partner history and newest-first ordering.
- `reward_ledger_requester_type` on `requester_id, type` supports the
  earned/redeemed balance aggregates.
- `reward_ledger_quotation_type` on `quotation_id, type` supports the
  per-RFQ earned-row lookup.
- `reward_ledger_one_earned_per_quotation_uq` is a partial unique index on
  `quotation_id` where `type = 'earned' AND deleted_at IS NULL`. It
  strengthens REL-19 from an application-only check to a database
  invariant. Soft-deleted earned entries do not prevent a replacement;
  redeemed rows do not participate.

The unique index does not make RFQ approval atomic. TXN-17, which must
update the RFQ and insert its reward row in one transaction, remains
deferred to row 16.

## Files changed

- `backend/alembic/versions/0010_reward_ledger_schema.py`
- `backend/app/models/__init__.py`
- `backend/tests/test_postgres_schema.py`
- `migration-db/DB-STATUS.md`
- This development note

The full personal execution record is in the gitignored
`migration-db/exec-log/2026-10-10-10-reward-ledger-schema.md`.

## Verification — Windows, macOS, and Linux

Use a disposable PostgreSQL database for `TEST_DATABASE_URL`. Alembic reads
`DATABASE_URL` from `backend/.env`; configure the test variable with the
disposable database URL.

### Windows (PowerShell)

From the repository root:

```powershell
Set-Location backend
$env:TEST_DATABASE_URL = "******HOST:5432/DISPOSABLE_DB"
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

### macOS

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="******HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

### Linux

From the repository root:

```bash
cd backend
export TEST_DATABASE_URL="******HOST:5432/DISPOSABLE_DB"
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/python -m unittest discover -s tests -p 'test_postgres_schema.py' -v
.venv/bin/python -m unittest discover -s tests -v
```

Expected current revision for this row alone is
`0010_reward_ledger_schema (head)`. The schema suite checks FKs, delete
policies, all indexes, one-live-earned-row uniqueness, coexistence of
redeemed rows, and soft-delete replacement behavior. Row 11 will advance
the final head to `0011_dispatches_schema`.

## DB-STANDARDS checklist for this row

1. **Primary key and timestamps — applied.** `reward_ledger` has a string
   primary key, `created_at`, `updated_at`, and nullable `deleted_at`.
2. **Foreign keys, delete policies, and FK indexes — applied.**
   `requester_id` → `partners.id` and `quotation_id` → `rfqs.id` are real
   NOT NULL FKs using RESTRICT. Composite indexes begin with each FK.
3. **Search/filter/sort indexes — applied.** Requester/created time,
   requester/type, and quotation/type paths are indexed.
4. **Never-repeat values — applied.** A partial unique index ensures at
   most one non-deleted earned row per RFQ; the primary key enforces row
   identity.
5. **Multi-table transactions — deferred.** No write behavior was added.
   TXN-17 is deferred to row 16, where RFQ update and ledger insert must
   commit or roll back together.
6. **Protected API routes — not applicable.** No routes were added or
   changed.
7. **Incoming-data validation — not applicable.** No request models or
   API inputs were added.
8. **Audit log — not applicable to schema creation.** Runtime audit log
   behavior remains deferred by the tracker.

## Validation result

At the row-10 boundary, `alembic upgrade head` applied
`0010_reward_ledger_schema` and `alembic current` reported it as head.
Compileall passed. All 8 focused PostgreSQL schema tests passed, including
the partial-index uniqueness test and earned/redeemed balance query.
