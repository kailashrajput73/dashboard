# AGENTS.md

Project: migrating the admin app from React Native (Expo, on web) to React web (Vite, in `web/`).
Branch: `web-migration-reactnative-to-react` only.

## Start of every chat
1. Read `migration/STATUS.md`, then `migration/SOW-STATUS.md`.
2. Do ONLY the row the user names. If none is named, ask. Do not start migrating on your own.

## Rules
- One row, then STOP. Never continue to the next row.
- Move what the Expo app already does. No new features, no rule changes, no API changes.
- Do not touch the backend. Keep Expo in `frontend/` working.
- Find the old code through `migration/INVENTORY.md`.
- Do not guess. Write "unknown" and ask.
- NEVER run `git commit`, `git push`, or `git merge`. The user does that.

## When the row is built
1. Write the dev note in `migration/dev/` and the admin note in `migration/admin/` (what is in each is described in STATUS.md).
2. Set the row to **Built** in `migration/STATUS.md`. Never set Done; the user does that after testing.
3. Tell the user: what was built, which files changed, how to test it, and a commit message like `migrate(2): categories`.
4. STOP.
