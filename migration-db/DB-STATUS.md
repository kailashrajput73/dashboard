# DB migration status

Every migration chat starts here. Do the first row that is not Done. One row, then stop.

MongoDB stays live and untouched in `backend_refactor/` until a module is
verified Done on Postgres. Nothing is cut over early.

Scope: move the 19 MongoDB collections documented in the baseline
`docs/BACKEND_INVENTORY.md` and `migration-db/BACKEND-FACTS-SUPPLEMENT.md`
into PostgreSQL with real foreign keys and real transactions. The supplement
is authoritative for its listed post-baseline facts. No new business features
here — those (reward redemption, audit log, soft deletes) are listed as
Deferred below.

## How one row works
1. The agent does that one row.
2. In the same row, the agent writes the dev note, sets status to **Built**,
   and stops. The agent never commits.
3. You test it (see the dev note for how).
4. If it's right, change **Built** to **Done** and commit.
5. If it's wrong, tell the agent. Row stays Built.
6. Paste me the "Done" result + commit message, and I give you the next prompt.

Commit message pattern: `dbmigrate(3): taxonomy tables` (row id in brackets).

## Notes the agent writes for every row
- **Dev note** `migration-db/dev/YYYY-MM-DD-NN-name.md`: what this row
  planned, what was built, old Mongo collection(s) → new Postgres table(s),
  which TXN-* (from BACKEND_INVENTORY.md) this row fixes if any, how to test,
  what's left.

Statuses: Not started → Built → Done.

---

| Row | What | Fixes (from inventory) | Status | Notes |
|---|---|---|---|---|
| 0a | Create `migration-db/` tracker folder, this file, `DB-AGENTS.md`. | — | Not started | Done by user; verify-only |
| 0b | Install PostgreSQL locally (Windows and Linux notes); add SQLAlchemy, Alembic, and psycopg dependencies in `backend/requirements.txt` and a throwaway connection test under `backend/`. No tables and no Alembic initialization. | — | done | PostgreSQL 17.11 connectivity verified; see `migration-db/dev/2026-10-08-0b-postgres.md` |
| 0c | **Security patch, independent of DB:** add a shared auth dependency in `backend/` that checks the `Authorization` header on protected routes when copied; leave `backend_refactor/` untouched until cutover. | RSK-02 | Done | See `migration-db/dev/2026-10-09-0c-auth-dependency.md` |
| 0d | **Security patch:** configure one `CORSMiddleware` with a real allow-list in `backend/`; leave `backend_refactor/` untouched until cutover. | RSK-11 | Done | See `migration-db/dev/2026-10-09-0d-cors.md` |
| 1 | Initialize Alembic under `backend/`, using `DATABASE_URL` from `backend/.env`; prepare an empty baseline migration. | — | Done | See `migration-db/dev/2026-10-09-01-alembic-baseline.md` |
| 2 | Core auth tables: `users`, `admin_tokens`, `partners`, `partner_tokens`, `money_config`. Schema only, no data copy yet. | REL-01, REL-02, REL-03 | Done | See `migration-db/dev/2026-10-09-02-auth-schema.md` |
| 3 | Taxonomy tables: `categories`, `subcategories`, `brands`, `product_types`. Foreign keys by id only, not by name. | RSK-06, REL-06, REL-07 | Built | See `migration-db/dev/2026-10-10-03-taxonomy-schema.md` |
| 4 | `product_groups` + join table `product_group_items` (replaces the two-sided `productIds` / `productGroupIds` arrays). | REL-11 | Built | See `migration-db/dev/2026-10-10-04-product-groups-schema.md` |
| 5 | `racks` + `rack_slots` (one row per slot, not a nested array). | REL-12, TXN-15 | Built | See `migration-db/dev/2026-10-10-05-racks-schema.md` |
| 6 | `catalog` (products) table. All taxonomy links are id foreign keys. | RSK-06 | Built | See `migration-db/dev/2026-10-10-06-catalog-schema.md` |
| 7 | `pricing` + `pricing_history`, with `ON DELETE CASCADE` from `catalog.product_code`. | RSK-05, REL-16, REL-17 | Built | See `migration-db/dev/2026-10-10-07-pricing-schema.md` |
| 8 | `purchases` + `purchase_lines`. Add required `partner_id` column (was indexed but never written in Mongo). | RSK-07 | Not started | |
| 9 | `rfqs` + `rfq_lines`. | REL-04, REL-14 | Not started | |
| 10 | `reward_ledger`. | REL-05, REL-19 | Not started | |
| 11 | `dispatches` + `dispatch_lines`. Unique constraint on `source_rfq_id` so a second dispatch against the same RFQ is rejected by the database. | RSK-10, REL-18 | Not started | |
| 12 | Data migration script: copy real Mongo data into rows 2–4 tables (auth + taxonomy). Dry-run then real run, both counted and logged. | — | Not started | |
| 13 | Data migration script: copy catalog + pricing (rows 6–7). Flag and report the 285 orphaned pricing codes found in the inventory instead of silently dropping or keeping them. | RSK-05 | Not started | |
| 14 | Data migration script: copy purchases, rfqs, reward ledger, dispatches (rows 8–11). | — | Not started | |
| 15 | Wrap purchase creation in one Postgres transaction (stock update + purchase row together). | TXN-16 | Not started | |
| 16 | Wrap RFQ approval in one transaction (status update + reward ledger insert together). | TXN-17 | Not started | |
| 17 | Wrap dispatch creation in one transaction (stock decrement + dispatch row + RFQ status update together, using the new unique constraint from row 11). | TXN-18, RSK-10 | Not started | |
| 18 | Implement auth + taxonomy API routes with PostgreSQL reads/writes in `backend/`; run alongside `backend_refactor/` until verified. Keep the Mongo code path intact for rollback. | — | Not started | |
| 19 | Implement catalog + pricing API routes with PostgreSQL reads/writes in `backend/`; run alongside `backend_refactor/` until verified. | — | Not started | |
| 20 | Implement purchases, RFQ, dispatch, and reward-ledger API routes with PostgreSQL reads/writes in `backend/`; run alongside `backend_refactor/` until verified. | — | Not started | |
| 21 | Full side-by-side check of every route against PostgreSQL; list anything missed before cutover. | — | Not started | |
| 22 | After row 21 is Done, decommission `backend_refactor/`, remove its Motor/PyMongo dependency and old-folder usage; optionally rename/swap at deploy. | RSK-04 (avoids repeating it) | Not started | |

## Deferred on purpose (not part of this migration)
Reward point redemption path (RSK-08), generic audit log, soft deletes,
idempotency keys on dispatch/purchase, sharding or load-balancer setup,
`learning_db` cleanup. These are real, worth doing, but separate from
"move the data safely" — raise them again once row 22 is Done.
