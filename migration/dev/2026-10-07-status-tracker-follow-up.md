# Follow-up: STATUS.md tracker cleanup

The migration pages for rows 10a, 10b, 10c, 11, 12, and 13 build successfully. Lint exits 0; its five warnings are in the existing `web/src/utils/csv.ts` helper.

A previous interrupted housekeeping edit left unrelated changes in `migration/STATUS.md`: the original scope and inventory pointer text, row-process wording, and note instructions/separators were partly removed or misplaced while replacing the one-row rule. The named rows are marked Built and have dev-note links.

Before starting another migration batch, restore `migration/STATUS.md` from the current committed version, then reapply only the intended multi-row rule replacement and retain Built statuses/notes for rows 10a–13. Do not alter unrelated rows. Verify with `git diff -- migration/STATUS.md` and `git diff --check`.

No application code or behavior is blocked by this documentation cleanup. The user is committing the current work and asked to pause until they authorize continuing.
