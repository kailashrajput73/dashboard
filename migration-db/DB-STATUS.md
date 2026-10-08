# DB migration status

Every migration chat starts here. Do the first row that is not Done. One row, then stop.

MongoDB stays live and untouched in `backend_refactor/` until a module is
verified Done on Postgres. Nothing is cut over early.

Scope: move the 18 collections in `docs/BACKEND_INVENTORY.md` into PostgreSQL
with real foreign keys and real transactions. No new business features here —
those (reward redemption, audit log, soft deletes) are listed as Deferred below.

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
| 0a | Create `migration-db/` tracker folder, this file, `DB-AGENTS.md`. | — | Not started | |
| 0b | Install PostgreSQL locally. Add SQLAlchemy + Alembic + psycopg/asyncpg to `backend_refactor/requirements.txt`. Confirm connection with a throwaway script, no tables yet. | — | Not started | |
| 0c | **Security patch, independent of DB:** add a shared auth dependency that actually checks the `Authorization` header on catalog, RFQ, dispatch, purchase, and wipe routes. | RSK-02 | Not started | |
| 0d | **Security patch:** remove the duplicate `CORSMiddleware`; keep one with a real allow-list, not `*` with credentials. | RSK-11 | Not started | |
| 1 | Alembic initialized against the new Postgres DB. Folder structure for migrations ready. Empty baseline migration committed. | — | Not started | |
| 2 | Core auth tables: `users`, `admin_tokens`, `partners`, `partner_tokens`, `money_config`. Schema only, no data copy yet. | REL-01, REL-02, REL-03 | Not started | |
| 3 | Taxonomy tables: `categories`, `subcategories`, `brands`, `product_types`. Foreign keys by id only, not by name. | RSK-06, REL-06, REL-07 | Not started | |
| 4 | `product_groups` + join table `product_group_items` (replaces the two-sided `productIds` / `productGroupIds` arrays). | REL-11 | Not started | |
| 5 | `racks` + `rack_slots` (one row per slot, not a nested array). | REL-12, TXN-15 | Not started | |
| 6 | `catalog` (products) table. All taxonomy links are id foreign keys. | RSK-06 | Not started | |
| 7 | `pricing` + `pricing_history`, with `ON DELETE CASCADE` from `catalog.product_code`. | RSK-05, REL-16, REL-17 | Not started | |
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
| 18 | Switch API routes to read/write Postgres for auth + taxonomy modules. Mongo code path kept but unused, for rollback safety. | — | Not started | |
| 19 | Switch API routes for catalog + pricing. | — | Not started | |
| 20 | Switch API routes for purchases, RFQ, dispatch, reward ledger. | — | Not started | |
| 21 | Full side-by-side check: every route tested against Postgres. List anything missed. | — | Not started | |
| 22 | Remove Mongo code, Motor/PyMongo dependency, and old collections, only after row 21 is Done. | RSK-04 (avoids repeating it) | Not started | |

## Deferred on purpose (not part of this migration)
Reward point redemption path (RSK-08), generic audit log, soft deletes,
idempotency keys on dispatch/purchase, sharding or load-balancer setup,
`learning_db` cleanup. These are real, worth doing, but separate from
"move the data safely" — raise them again once row 22 is Done.
