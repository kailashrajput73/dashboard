# Row 7d: Catalog QR codes

## Plan

Reuse Expo's `qrcode` generator to render each product code as a QR image in the form and web catalog table. Preserve PNG output, size, correction level, download filename, and text.

## Expo file to web file

- `frontend/src/components/ProductQr.tsx` -> `web/src/components/ProductQr.tsx`.
- `frontend/src/types/qrcode.d.ts` -> `web/src/qrcode.d.ts`.
- `frontend/app/(admin)/catalog.tsx` -> `web/src/features/catalog/CatalogProductEditor.tsx` and `web/src/features/catalog/CatalogPricingRow.tsx`: QR appears under the code field and inline in catalog product rows.
- `frontend/package.json` (`qrcode` 1.5.4) -> `web/package.json` and `web/package-lock.json`: exact approved dependency `qrcode@1.5.4`; no other direct dependency was added.

## How it works

The web component trims the value and calls `QRCode.toDataURL` with margin 1, medium correction, and width 96 for inline rows or 180 for the full form code. Inline images display at 56px. The full code shows the **QR code** label, code text, **Generating QR…** state, and **Download QR** button. The download is a PNG named `<code>-qr.png`. The form passes the currently entered product code; the row uses `qrCode || productCode`.

## Differences from Expo

- React Native `Image` is replaced by browser `<img>`.
- Expo's native branch writes to the Expo cache and opens the file URI; the web branch already downloads a data URL through an anchor. The web component uses that browser path.
- Approved bundle-size change from the 7c build: 372.55 kB raw / 109.77 kB gzip to 397.50 kB raw / 119.73 kB gzip, an increase of about 24.95 kB raw / 9.96 kB gzip. The later 7e CSV integration build measured 398.21 / 119.90 kB.

## Test

See `migration/PENDING.md`, **Tests waiting**, Row 7d. Build and lint pass from `web/`.

## Left for later

- No further QR work remains in this row.