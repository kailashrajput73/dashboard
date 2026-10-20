# DB-AGENTS.md

Project: PostgreSQL API in `backend/` (Mongo mirror removed — row 22).
Read **`migration-db/ACTIVE-STACK.md`** first.
Reference facts: `docs/BACKEND_INVENTORY.md` (historical Mongo COL-*/RTE-*),
`migration-db/BACKEND-FACTS-SUPPLEMENT.md` where listed.

## Start of every chat
1. Read `migration-db/DB-STATUS.md`, `migration-db/ACTIVE-STACK.md`, AND
   `DB-STANDARDS.md` first.
2. **Drift check:** compare `backend/app/` routes and models to
   `docs/BACKEND_INVENTORY.md` + supplement. The Mongo tree
   `backend_refactor/` is **gone**; do not search for it.
3. Do ONLY the row the user names. If none is named, ask. Do not start on
   your own.
4. `DB-STANDARDS.md` applies to every row and to every future database
   change after this migration ends. It is never optional and never
   finishes — treat it as a permanent checklist, not a migration step.

## Rules
- One row, then STOP. Never continue to the next row.
- Row 22 removed `backend_refactor/`. All API work is in `backend/` only.
- Every multi-step write listed as TXN-* in BACKEND_INVENTORY.md must become
  ONE Postgres transaction (all steps succeed, or none do). This is the main
  point of this migration — do not simplify it away to save time.
- Every foreign key is a real id reference (uuid/int), never a copied name
  string (this fixes RSK-06). If a Mongo field links by name only, add the
  id-based column and keep the name as a display copy at most.
- Do not guess a field name, type, or default. Check BACKEND_INVENTORY.md.
  If still unclear, write "unknown" and ask.
- NEVER run `git commit`, `git push`, or `git merge`. The user does that.
- Do not edit `web/` or `customerapp/` unless the user names a web/customer row.
  (Exception: append to `docs/BACKEND_INVENTORY.md` when drift check requires.)
- All API code lives in `backend/`. Admin UI is `web/`.
- Do not change any API route path, request body, or response JSON shape
  without user approval. `web/` depends on the existing `/api` contract.

## When a row is built
1. Write a dev note in `migration-db/dev/YYYY-MM-DD-NN-name.md`: what this
   row planned, what was built, which tables/files touched, how it differs
   from the Mongo version, how to test it side by side with Mongo, what is
   left.
2. Write a full execution log in `migration-db/exec-log/YYYY-MM-DD-NN-name.md`
   (one new file per row, never overwritten, never summarized down). This
   is for the user's own personal reading only — not for any future agent
   and not part of the tracked project history. Record everything that
   actually happened, in order: every command run, every file created or
   edited, every decision made and why, every error hit and how it was
   resolved, exact before/after for anything risky. Be exhaustive here —
   this file's whole purpose is "what truly happened, start to end," not a
   clean summary.
3. Go through `DB-STANDARDS.md` item by item and state which items applied
   to this row and exactly how each one was handled (or state "not
   applicable" and why). This is not optional and is not skipped even for
   small rows.
4. Set the row to **Built** in `DB-STATUS.md`. Never set Done; the user does
   that after testing.
5. Tell the user: what was built, the standards check from step 3, exactly
   how to test it, and a commit message like `dbmigrate(3): taxonomy tables`.
6. STOP.


## Personal execution log (`migration-db/exec-log/`)
This folder is listed in `.gitignore` — it never gets committed and no
future agent reads it. It exists only so the user has a complete personal
record of everything that was actually done, independent of the shorter
dev notes meant for tracking the project.
