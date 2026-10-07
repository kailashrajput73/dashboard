# Start here at the office

This folder was written on the **home PC** after VPS **backend_refactor** testing. It is **not** stored in Cursor cloud chat — it lives in the repo.

## Copy-paste for a new Cursor chat

```text
Read migration/bug_fix/AGENT-WORKFLOW.md first, then README.md.

Fix ONLY the FIX id I give you (one at a time). Do not change imports/uploads.
Backend: backend_refactor/. Stop after one fix; I test; then I say next or commit.
```

## Get this folder on the office PC

1. `git pull` on your working branch (folder path: `migration/bug_fix/`).
2. If the folder is missing, home PC may not have **committed/pushed** yet — ask to push or copy `migration/bug_fix/` via USB/cloud.

## What was already verified (home)

Login, imports (master/prices/stock/subcategory), ROL behavior, product form + QR download, RFQ → approve → dispatch → retail, dashboard lists. See README table for failures (rack assign, catalog download, prices 49% to confirm).
