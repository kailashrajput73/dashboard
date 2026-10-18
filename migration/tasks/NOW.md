# NOW (live handoff)

The agent working right now keeps this file up to date. A new agent starts here.
`STATUS.md` says what is Done, Built or Not started. This file says what is happening **this minute**.
Overwrite it. Do not let it grow past one screen.

## Current task
Row 22c-A: responsive shell and page containers (not started)

## Task file
`migration/tasks/22c-A.md` (the full instructions live there, not in the chat)

## Done so far
- nothing yet

## Files changed so far (uncommitted)
- none

## Next action
Read `migration/tasks/22c-A.md` and start at STEP 0.

## Blockers and decisions
- The Linux PC has no MongoDB, so no real backend. Use MODE B (mock API in the browser tool), as described in the task file.
- Do not install a database. Do not touch frontend/ or backend/.

## How to resume if the previous agent stopped
1. Read `AGENTS.md`, then this file, then the task file.
2. Run `git status -s` and `git diff --stat` to see what was already changed.
3. Do not redo anything listed under "Done so far". Continue at "Next action".

## Last updated
(the agent writes the date, and what it was doing, every time it updates this file)
