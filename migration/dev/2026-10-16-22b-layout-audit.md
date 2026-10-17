# Row 22b-1: React-vs-Expo layout audit

## Scope

This is a read-only audit of the admin shell and page-level layout parity between the Expo web app and the React web app. No application code was changed in `web/`, `frontend/`, or `backend_refactor/` for this step.

The audit compared the live admin routes at three viewport sizes: 1366x768, 1024x768, and 1920x1080. The checking method used the same route inventory, same seeded ZZ data set, and browser geometry measurements for shell bounds, sidebar bounds, content-pane bounds, scroll sizes, and positioned/interactive element overlaps.

## Built result

The shared shell problem from row 22a was fixed in the React app: the document no longer grows beyond the viewport, the sidebar remains viewport-height, and the main content region owns vertical scrolling. The row 22b-1 audit confirms the shared shell is now aligned with Expo's behavior.

Status recorded in the migration tracker:

- 22b-1: Built
- 22b-2: Not started
- 22b-3: Not started

## Audit verdict

### H1: Document grows past the viewport on admin routes
Verdict: False after row 22a.

Evidence from the browser measurements:

- At 1366x768, `document.width` and `document.height` stay at `1366 x 768` for every admin route.
- The sidebar is `240 x 768` and the content pane is `1126 x 768`.
- `scrollHeight` on the main pane varies by page, but the document stays locked to the viewport.

### H2: The sidebar itself is the wrong size or mis-scrolling
Verdict: False after row 22a.

Evidence:

- `sidebar` remains `240px` wide and `768px` high at the laptop viewport.
- `sidebarMenu` scroll area is bounded by the sidebar width and the menu content area, with internal scrolling rather than document scrolling.
- The menu can scroll inside the bound shell, matching Expo's pattern.

### H3: Fixed-position controls are still overlapping the content shell
Verdict: True for page-specific leftovers.

The clear offender is the subcategories batch-import action. The page keeps a fixed footer/button sitting at `left: 16px`, while the content pane starts at `x = 240`, so the button visually extends underneath the sidebar and is clipped by the shell. The measured bounds show the button spanning across the shell boundary instead of staying inside the content column.

### H4: There is a widespread horizontal-overflow problem on many pages
Verdict: False.

Evidence:

- No route showed document-level horizontal overflow in the post-row-22a measurement set.
- The main pane width remained within the content column at all tested sizes.
- The row 22a shell fix removed the common overflow pattern.

### H5: The root cause is page-local styling rather than the shared shell alone
Verdict: True.

The shell is now aligned with Expo; the remaining issues are content-level absolute or fixed controls that ignore the content column start at `x = 240` and anchor to the viewport edge instead of the page content container.

### H6: Login and register screens are still broken by the shell
Verdict: False.

These screens are intentionally outside the sidebar shell and still center correctly. Their form widths and centers remain stable across 1366x768 and 1920x1080.

## Findings by cause

### Shared shell / root cause

This was the original root cause addressed in 22a:

- The shell used a viewport-based flex layout without an explicit scroll boundary.
- The main content area could let the browser document grow with page content instead of owning its own scroll.
- The menu stack and content pane were not separated tightly enough for an Expo-style layout.

Outcome: the React admin shell now matches Expo's viewport-height behavior and the document no longer expands past the viewport on admin routes.

### Page-specific leftover cause

These are not shared-shell regressions. They are still page-local placement problems:

- Subcategories fixed footer/button anchored to the viewport left edge.
- Product-group action buttons that are visually placed as if they were inside the full viewport instead of the content pane.
- Dispatch-related actions that stay visually pinned to the page edge rather than the content column.

These are not broad shell bugs; they are local layout assumptions that have to be corrected on the affected screens.

## Route-by-route summary

The measured routes stayed within the expected shell geometry at all tested widths. The major difference between Expo and React was no longer in the shell itself but in the remaining page-local fixed-action elements on a small subset of screens.

### No shell problems observed in these routes

- Dashboard
- Catalog
- Categories
- Product types
- Product classes
- Brands
- Product groups
- Racks
- Purchases
- Inventory
- RFQs
- Partners
- Dispatches
- Service requests
- Settings
- Team
- Login
- Register
- Product import screens

### Page-specific outliers still worth fixing later

- Subcategories: fixed footer/button overlaps the shell boundary
- Product groups: action controls can still sit as if they are on the full viewport edge
- Dispatches: fixed or edge-aligned actions need page-specific cleanup

## Measurement evidence summary

Sample values from the browser checks at 1366x768:

- Document size: `1366 x 768` across admin routes
- Sidebar: `240 x 768`
- Content pane: `1126 x 768`
- Sidebar menu: `clientHeight = 634`, `scrollHeight = 821`
- Dashboard content pane: `scrollWidth = 1111`, `scrollHeight = 1700`, `clientHeight = 768`
- Categories content pane: `scrollWidth = 1111`, `scrollHeight = 2807`, `clientHeight = 768`
- Team content pane: `scrollWidth = 1111`, `scrollHeight = 3291`, `clientHeight = 768`

The document does not grow past the viewport; the content pane is the scrolling surface.

## Not checked / not in scope

This audit intentionally did not include a redesign or any functional change. The following are intentionally out of scope for row 22b-1:

- backend changes
- frontend Expo changes
- React app feature work
- new migration rows beyond 22b split
- bug-fix implementation work

## How to test / verify

1. Open the local React app at a normal laptop width and ensure the document height stays constrained to the viewport.
2. Compare the shell across Dashboard, Catalog, Categories, Inventory, RFQs, and Team.
3. Confirm the sidebar scrolls internally while the content pane scrolls independently.
4. Verify Login and Register remain centered without the sidebar shell.
5. Check Subcategories, Product Groups, and Dispatches for left-edge fixed controls that cross the 240px sidebar boundary.

## Final judgment

Row 22b-1 is a successful audit: the shared shell layout mismatch is resolved, and the remaining issues are narrow, page-local UI alignment problems rather than a broad React shell regression. These leftovers should be fixed in 22b-2 and 22b-3, not by reworking the shared shell again.
