# Row 0b — inventory and agent rules

## What this row planned

Put `AGENTS.md` and `migration/INVENTORY.md` in the repo so the next PC can see the rules and the Expo screen map. `demo-notes/` stays gitignored.

## What was checked

These files are on disk and are not ignored:

- `AGENTS.md`
- `migration/STATUS.md`
- `migration/INVENTORY.md`

`git check-ignore -v` on those three paths printed nothing.

No screen was built. No API calls. Expo was not changed.

## .gitignore change

The only diff in `.gitignore` is a newline at the end of the file. `demo-notes/` and `docs/` are still ignored.

## What is left

SHEET-FORMAT.md not copied yet. Needed before row 10a.
