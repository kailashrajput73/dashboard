# Agent workflow — one bug at a time

**Owner tests after each fix.** Agent does **not** start the next item until the owner says **“next”** or names the next FIX id.

---

## Out of scope (do not change now)

All **spreadsheet / upload** behavior is **accepted as-is**:

- Master, prices, stock, subcategory imports — **working for sign-off**
- Master **not** updating discount/stock on existing SKUs — **by design**
- FIX-03, FIX-04, FIX-11 — **deferred** (no code unless owner reopens)
- Import policy / “one sheet does everything” — **deferred**

Backend: **`backend_refactor/`** only. Do not restore `backend/server.py`.

---

## Active queue (in order)

| Order | ID | What | Owner checks after |
|-------|-----|------|---------------------|
| 1 | **FIX-01** | Rack: assign product to slot → API error | Create rack → assign product → no error; slot shows on product |
| 2 | **FIX-02** | Catalog: download button does nothing (web) | Products screen → download → CSV file saves |
| 3 | **FIX-06** | Team list may be stale | Add/edit user → refresh → data matches |
| 4 | **FIX-05** | Remove unused **Money config** from admin menu (optional cleanup) | Sidebar no money config; rest still works |
| 5 | **FIX-07** | QR **camera** scan (optional, later) | Skip unless owner asks |
| 6 | **FIX-10** | Security: wipe / destructive UI before go-live | Discuss only until owner says go-live |

**Not in this queue (other chats):** FIX-08 partner UX design, FIX-09 mobile API (dev in progress), step 20 secured-delete “find in UI”.

---

## Rules for every fix chat

1. Read `migration/bug_fix/README.md` and **only** the detail file for that FIX (e.g. `BACKEND.md` for FIX-01).
2. Implement **one** FIX id from the queue above.
3. **Do not** commit unless the owner says **commit**.
4. **Stop** and list: what changed, how to test, files touched.
5. Wait for owner **pass / fail** before any other FIX.

---

## Copy-paste prompts (new chat each time)

### Chat title: `bug fix FIX-01 rack assign`

```text
Read migration/bug_fix/AGENT-WORKFLOW.md and BACKEND.md.
Fix only FIX-01 (rack assign API error). Backend: backend_refactor/.
Do not touch imports or upload logic. One fix, then stop. No commit unless I say commit.
```

### Chat title: `bug fix FIX-02 catalog download`

```text
Read migration/bug_fix/AGENT-WORKFLOW.md and ADMIN-UI.md.
Fix only FIX-02 (catalog download on Expo web). One fix, then stop. No commit unless I say commit.
```

### Chat title: `bug fix FIX-06 team list`

```text
Read migration/bug_fix/AGENT-WORKFLOW.md and ADMIN-UI.md.
Fix only FIX-06 (team list stale/wrong data). One fix, then stop. No commit unless I say commit.
```

### Chat title: `bug fix FIX-05 remove money config`

```text
Read migration/bug_fix/AGENT-WORKFLOW.md and ADMIN-UI.md.
Fix only FIX-05: hide/remove Money config from admin UI (unused). Do not remove API unless needed. One fix, then stop. No commit unless I say commit.
```

---

## Owner checklist (you)

After each agent turn:

- [ ] Test only what that FIX describes
- [ ] Reply **pass** or **fail** + what you saw
- [ ] If pass and you want git: say **commit** (or commit yourself)
- [ ] Open **next** chat with the next prompt from the table

Start with **FIX-01** when ready.
