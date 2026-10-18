# register

| | |
|---|---|
| **Map ID** | `register` |
| **Route** | `/register` |
| **Source file** | `web/src/pages/RegisterPage.tsx` (74 lines) |
| **SOW** | Auth |
| **Operator guide** | `migration/admin/register.md` |

## Load / refresh

- No `useEffect` in this file (may delegate to a feature component).

## API calls in this file

| Line | Function | HTTP | Code line (trimmed) |
|------|----------|------|---------------------|
| L34 | `registerAdmin` | POST /auth/admin/register | `await registerAdmin({` |
| L40 | `loginAdmin` | POST /auth/admin/login | `const admin = await loginAdmin({ contactNumber: contact.trim(), passcode: passcode.trim() });` |

## Functions in this file (jump by line)

| Line | Function | What to do here |
|------|----------|-----------------|
| L9 | `RegisterPage` | Open `web/src/pages/RegisterPage.tsx` at this line |
| L19 | `validate` | Open `web/src/pages/RegisterPage.tsx` at this line |
| L29 | `submit` | Open `web/src/pages/RegisterPage.tsx` at this line |

## Controls: testID → handler line

| Line | testID | Handler |
|------|--------|--------|
| L67 | `go-to-admin-login` | `() => void submit()` |

## Your tags (you fill in)

| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |
|----------------|-----------------------------------|-------|
| | | |

_Regenerate: `node web/map/tools/generate-page-maps.mjs`. Line numbers drift when code changes._
