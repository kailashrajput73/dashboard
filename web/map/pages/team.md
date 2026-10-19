# team

| | |
|---|---|
| **Map ID** | `team` |
| **Route** | `/team` |
| **Source file** | `web/src/pages/TeamPage.tsx` (216 lines) |
| **SOW** | Team |
| **Operator guide** | `migration/admin/team.md` |

## Screen blocks (Header titles)

- **L148** — `Team Management`

## Load / refresh

- **L58** `useEffect` — initial load or subscribe; read lines below for `list*` / `get*` calls.

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L51 | `listTeamUsers` | GET /team/users | `setUsers((await listTeamUsers()) || []);` |
| L60 | `listTeamUsers` | GET /team/users | `void listTeamUsers()` |
| L115 | `updateTeamUser` | PUT /team/users/{id} | `await updateTeamUser(editor.id, payload);` |
| L118 | `createTeamUser` | POST /team/users | `await createTeamUser({ ...payload, passcode });` |
| L132 | `updateTeamUser` | PUT /team/users/{id} | `await updateTeamUser(user.id, {` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L17 | `defaultPermissionsForRole` | Open `web/src/pages/TeamPage.tsx` at this line |
| L21 | `teamErrorMessage` | Open `web/src/pages/TeamPage.tsx` at this line |
| L29 | `SummaryCell` | Open `web/src/pages/TeamPage.tsx` at this line |
| L33 | `TeamPage` | Open `web/src/pages/TeamPage.tsx` at this line |
| L49 | `load (useCallback)` | Open `web/src/pages/TeamPage.tsx` at this line |
| L83 | `openCreate` | Open `web/src/pages/TeamPage.tsx` at this line |
| L94 | `openEdit` | Open `web/src/pages/TeamPage.tsx` at this line |
| L105 | `save` | Open `web/src/pages/TeamPage.tsx` at this line |
| L130 | `toggle` | Open `web/src/pages/TeamPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L148 | `open-add-team-user` | `openCreate` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
