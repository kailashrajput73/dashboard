# Row 1c — basic UI components

## What this row planned

Move the Expo basic UI kit to `web/`: Button, Input, Card, Chip, Header, EmptyState, AppModal, ErrorModal, and Ionicons, matching Expo's props and browser presentation without adding unrelated UI parts.

## What was built

- Added the reusable web UI kit in `web/src/components/UI.tsx`.
- Added an icon component in `web/src/components/Icon.tsx`.
- Added a temporary component gallery in `web/src/DevPreview.tsx` and temporarily rendered it from `web/src/App.tsx`.
- Reused `web/src/theme.ts` and inline styles, following row 1a. `web/src/index.css` contains only the browser-specific icon, placeholder, and spinner rules.
- Added the single direct dependency `ionicons` pinned to `7.4.0`. No other direct dependency or package manifest change was made.
- Row 1e must also remove `web/src/DevPreview.tsx` and restore `App.tsx`.

## Expo file → web file

| Expo file | Web file | Part |
|---|---|---|
| `frontend/src/components/UI.tsx` | `web/src/components/UI.tsx` | Button, Input, Card, Chip, Header, EmptyState, AppModal, ErrorModal |
| `frontend/src/components/UI.tsx` and `@expo/vector-icons` Ionicons names | `web/src/components/Icon.tsx` | Icon rendering for the exact source-used names |
| `frontend/src/theme.ts` | `web/src/theme.ts` (existing row 1a file) | Existing colors, radii, spacing, and font tokens; reused without changes |
| No Expo source; temporary test fixture | `web/src/DevPreview.tsx` | Temporary preview of every component and supported icon |
| Existing starter entry `web/src/App.tsx` | `web/src/App.tsx` | Temporarily renders the component preview |
| No Expo stylesheet; browser styling for the port | `web/src/index.css` | Icon SVG appearance, placeholder color, and loading spinner animation |

## Icons

The Expo source scan found these 47 names:

`add`, `add-circle`, `bar-chart-outline`, `barcode-outline`, `cart-outline`, `cash-outline`, `checkmark`, `checkmark-circle`, `checkmark-circle-outline`, `chevron-back`, `chevron-down`, `chevron-forward`, `chevron-up`, `close`, `close-circle`, `cloud-upload-outline`, `create-outline`, `cube`, `cube-outline`, `document-outline`, `document-text-outline`, `download-outline`, `ellipsis-vertical`, `filter-outline`, `funnel-outline`, `git-branch-outline`, `grid-outline`, `image-outline`, `layers-outline`, `list-outline`, `log-in-outline`, `log-out-outline`, `options-outline`, `pause-circle-outline`, `people-outline`, `play-circle-outline`, `pricetag-outline`, `pricetags-outline`, `receipt-outline`, `ribbon-outline`, `send-outline`, `settings-outline`, `shield-outline`, `swap-horizontal-outline`, `time-outline`, `trash-outline`, `warning-outline`.

All 47 names were checked against the pinned Ionicons 7.4.0 exports and their individual SVG files. Missing names: none. `Icon.tsx` imports only those individual SVG files with Vite's `?raw` handling; it does not import the all-icons index or load a font.

## Input keyboard mapping

- Expo `default` → HTML `type="text"`; no `inputMode`.
- Expo `numeric` → HTML `type="text"`, `inputMode="numeric"`.
- Expo `phone-pad` → HTML `type="tel"`, `inputMode="tel"`.
- Expo `decimal-pad` → HTML `type="text"`, `inputMode="decimal"`.
- Expo `email-address` → HTML `type="email"`, `inputMode="email"`.
- `secureTextEntry` → HTML `type="password"` (overrides the keyboard-derived type).
- Expo `multiline` → `<textarea>`; Ctrl+Enter / Cmd+Enter calls `onSubmitEditing`.

## How it works

The components preserve Expo names and behavior-oriented props, including `testID`, variant/size/loading/disabled/full-width button behavior, controlled input callbacks, style overrides, error text, chip selection, optional header callback/right content, optional empty-state CTA, and modal close callbacks. The Header back control calls only `onBack`; it imports no router.

Inline React styles use the existing web theme tokens, matching row 1a's approach. The Ionicons component decodes only the imported package SVG definitions and applies the requested size and color.

## API calls used

None.

## Differences from Expo

- React Native `View`, `Text`, `Pressable`, `TextInput`, `Modal`, `ScrollView`, `StyleSheet`, and `ActivityIndicator` were replaced with semantic HTML elements, inline CSS properties, React handlers, and a CSS spinner.
- Expo's UI kit has a generic `AppModal` and an `ErrorModal`, but no separate message-only popup component; the generic modal remains available for message content.
- `style` and `inputStyle` use `React.CSSProperties` instead of React Native style types. `testID` maps to `data-testid`.
- Input keyboard hints map to HTML `type` / `inputMode` as listed above. `editable={false}` maps to `readOnly`.
- On the web, Header renders the optional back button and invokes its plain `onBack` callback. Expo's `UI.tsx` hides the back button when `isWeb` is true; the web component makes this callback usable without introducing a router, as required for the migration.
- AppModal is a fixed, centered web overlay rather than React Native `Modal`. It closes on backdrop mouse-down, the close button, or Escape. The native-only bottom-sheet grabber is not shown.
- Only the Ionicons names referenced by the current Expo app are bundled. Expo's font-loading hook and `@expo/vector-icons` are not used in `web/`.
- The dev preview is temporary and changes the content rendered by `App.tsx`; row 1e removes `DevPreview.tsx` and restores `App.tsx`.

## Build size

Row 1b's Vite build JavaScript bundle was 221.12 kB (69.32 kB gzip). This row's build is 255.88 kB (78.00 kB gzip): an increase of **34.76 kB raw / 8.68 kB gzip**. This includes the UI code, the 47 bundled icons, and temporary preview. The CSS bundle is 0.43 kB (0.27 kB gzip).

## How to test

From `web/`, run `npm run build` and `npm run lint`. Both completed successfully for this row.

Run `npm run dev` and open the app. The temporary preview displays:

- Button variants, sizes, loading and disabled states.
- Text, numeric, phone, decimal, email, password, multiline, error, and focus input states.
- Selectable chips, Card, Header and its back callback counter, EmptyState and CTA.
- AppModal close button, backdrop and Escape behavior, and ErrorModal dismissal.
- All 47 bundled icons and their Expo names.

Browser verification confirmed the back callback, numeric `inputMode`, modal open/Escape close, error-modal open/dismiss, and icon rendering.

## Left for later

The preview remains in place only until row 1e. No navigation, menu shell, login, or additional design parts were added.
