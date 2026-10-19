# login

| | |
|---|---|
| **Map ID** | `login` |
| **Route** | `/login` |
| **Source file** | `web/src/pages/LoginPage.tsx` (129 lines) |
| **SOW** | Auth |
| **Operator guide** | `migration/admin/login.md` |

## Load / refresh

- No `useEffect` in this file (may delegate to a feature component).

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L30 | `loginAdmin` | POST /auth/admin/login | `const admin = await loginAdmin({` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L9 | `LoginPage` | Open `web/src/pages/LoginPage.tsx` at this line |
| L17 | `validate` | Open `web/src/pages/LoginPage.tsx` at this line |
| L25 | `submit` | Open `web/src/pages/LoginPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L111 | `go-to-admin-register` | `—` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
