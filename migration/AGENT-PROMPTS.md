# Prompts (copy and paste)

Always put the STOP rule on the first line. It stops the agent running ahead.

## A. Brief a new agent or another AI (no coding)

```
PLANNING CONTEXT ONLY. DO NOT WRITE OR CHANGE ANY CODE.

We are migrating our admin app from React Native (Expo, running on web)
to React web (Vite, in web/), on branch web-migration-reactnative-to-react.
We move only what the Expo app already does. Read:

  AGENTS.md
  migration/STATUS.md
  migration/SOW-STATUS.md
  migration/INVENTORY.md

Reply with 4 lines: how one row works, which row is next, and what you
will NOT do (commit, add features, continue to the next row).
Then wait for my instruction.
```

## B. Do one row

```
DO ONLY ROW 2 FROM migration/STATUS.md. THEN STOP.

1. Read AGENTS.md, migration/STATUS.md and the row's screen in
   migration/INVENTORY.md.
2. Tell me in a few lines what you will build and which Expo files you
   will copy from. Wait for my "go".
3. After "go": build it in web/, matching the Expo screen.
4. Write the dev note and the admin note. Set the row to Built.
5. Tell me how to test, and give me a commit message.
6. Do NOT run git commit. STOP.
```

## C. Continue on the other PC

```
DO NOT CODE YET.
Read AGENTS.md and migration/STATUS.md. Tell me in 3 lines which row is
the first one not Done. Wait for my instruction.
```

## D. A row looks too big

```
STOP. Do not code. This row looks too big for one go.
Propose a split into smaller rows (a, b, c), each one testable on its
own. Wait for my approval before changing STATUS.md.
```
