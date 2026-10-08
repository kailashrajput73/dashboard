# DB migration prompts (copy and paste)

Always put the STOP rule on the first line.

## A. Brief a new agent (no coding)

```
PLANNING CONTEXT ONLY. DO NOT WRITE OR CHANGE ANY CODE.

We are migrating backend storage from MongoDB to PostgreSQL, in
backend_refactor/, on branch db-migration-mongo-to-postgres. MongoDB stays
live and untouched until each module is verified. Read:

  DB-AGENTS.md
  migration-db/DB-STATUS.md
  docs/BACKEND_INVENTORY.md

Reply with 4 lines: how one row works, which row is next, and what you
will NOT do (commit, touch Mongo code, continue to the next row).
Then wait for my instruction.
```

## B. Do one row

```
DO ONLY ROW [X] FROM migration-db/DB-STATUS.md. THEN STOP.

1. Read DB-AGENTS.md, migration-db/DB-STATUS.md, and the relevant COL-*/TXN-*/
   RSK-* entries in docs/BACKEND_INVENTORY.md for this row.
2. Tell me in a few lines what you will build and exactly which inventory
   facts you're using. Wait for my "go".
3. After "go": build it. Do not touch existing Mongo code.
4. Write the dev note. Set the row to Built.
5. Tell me how to test it, and give me a commit message.
6. Do NOT run git commit. STOP.
```

## C. Continue on another machine / new chat

```
DO NOT CODE YET.
Read DB-AGENTS.md and migration-db/DB-STATUS.md. Tell me in 3 lines which
row is the first one not Done. Wait for my instruction.
```

## D. A row looks too big

```
STOP. Do not code. This row looks too big for one go.
Propose a split into smaller rows (a, b, c), each one testable on its own.
Wait for my approval before changing DB-STATUS.md.
```
