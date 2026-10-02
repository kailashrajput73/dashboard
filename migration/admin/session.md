# Admin session

Row 1b adds session and API support only; it does not add a login screen. The web app will use these helpers when the login flow is migrated.

The saved admin session and its bearer token are stored in this browser's `localStorage`, under `session:admin` and `session:admin:token`. They are scoped to the current browser profile and are not encrypted by the browser storage adapter. On a shared computer, sign out when finished and close the browser session.
