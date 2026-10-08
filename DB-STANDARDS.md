# DB-STANDARDS.md — permanent rulebook

This file never gets marked Done. It applies forever, to every table and
every route, not just during the Mongo → PostgreSQL migration.

**Rule for every future prompt, from now on, forever:**
Whenever you ask an agent to add or change anything touching the database
(a new feature, a new table, a new field, a new route) — add this line to
your prompt:

```
Before you say this is done, check it against every item in DB-STANDARDS.md
and tell me which items apply and how you handled each one.
```

That one sentence is what replaces your memory. You never have to remember
the list — the agent re-reads it every time and reports back against it.

---

## The checklist

### 1. Every new table needs
- [ ] A primary key (usually `id`, uuid or auto-increment).
- [ ] `created_at` and `updated_at` timestamp columns.
- [ ] A `deleted_at` (nullable) column instead of ever hard-deleting a row.
      Nothing in this system gets truly deleted — it gets marked deleted and
      hidden from normal views. (Protects you from "oops, undo that.")

### 2. Every relationship between two tables needs
- [ ] A real foreign key column (the other table's id), never a copied
      name or text string.
- [ ] A decision on what happens on delete: usually `ON DELETE RESTRICT`
      (block the delete if something still points to it) for important
      records, or `ON DELETE CASCADE` only where you've deliberately decided
      child rows should disappear with the parent (e.g. RFQ lines when the
      RFQ itself is deleted).
- [ ] An index on that foreign key column. Always. No exceptions.

### 3. Every column you will search, filter, or sort by needs
- [ ] An index. If you'll ever write "find all RFQs where partner = X" or
      "find all products where category = Y," that column needs an index.

### 4. Every column that must never repeat needs
- [ ] A unique constraint at the database level (e.g. partner phone number,
      product code). Don't rely on application code to check "does this
      already exist" — the database should refuse it even if the code has
      a bug.

### 5. Every action that writes to more than one table at once needs
- [ ] To be wrapped in a single transaction: all the writes succeed, or
      all of them roll back. Example: dispatch creation = stock goes down
      + dispatch record is created + RFQ status changes. All three, or
      none of them.

### 6. Every API route that isn't meant to be fully public needs
- [ ] An authentication check confirming who is calling it.
- [ ] A check that this specific user/role is allowed to do this specific
      action (not just "is logged in," but "is logged in AND allowed").

### 7. Every piece of incoming data (a form submit, an API request) needs
- [ ] A validation schema (Pydantic, in your case) defining exactly what
      fields are required, their types, and their limits — before it ever
      touches the database.

### 8. Every create, update, or delete of anything important needs
- [ ] An entry in the audit log: who did it, what table, what row, what
      changed, when. This is what you open in six months when a client asks
      "why did this price change" — not a memory, a record.

---

## How this stays alive after the migration finishes

`DB-STATUS.md` (the row tracker) will eventually say every row is Done, and
that file becomes history — a record of how the migration happened.

**This file (`DB-STANDARDS.md`) keeps working after that.** Every time you
start a new feature request in the future — a new module, a new table, a
new report — you paste the one-line instruction above into your prompt.
The agent checks its own work against this list before telling you it's
finished. You're not trusting your memory, or the agent's memory. You're
trusting a checklist that doesn't forget.

If a new kind of rule comes up later that isn't on this list yet (something
you learn the hard way, or a new pattern the project needs), add it here as
a new numbered item. The list is allowed to grow. It is never allowed to be
skipped.
