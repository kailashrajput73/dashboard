# Row 1a — Vite app and theme

## What this row planned

A Vite + React + TypeScript app in `web/`, the backend URL setting, and the Expo colours and theme. Expo keeps running. No screens.

## What was built

- `frontend/src/theme.ts` → `web/src/theme.ts` (`colors`, `radii`, `spacing`, `font`). `isWeb` and `pointer` were not copied.
- `web/src/config/env.ts` reads `VITE_BACKEND_URL`.
- `web/.env` holds that value, copied from `EXPO_PUBLIC_BACKEND_URL` in `frontend/.env`. It is gitignored.
- `web/.env.example` has the name only, no value.
- `web/src/App.tsx` is one blank page: slate background, white card, indigo title. It says whether the backend URL is set. It does not show the URL and does not call the API.
- `.gitignore` gained `!.env.example` so the example file can be committed. `web/.env` still matches `*.env`.

## How it works

`npm run dev` in `web/` serves port 5173. Vite exposes only names that start with `VITE_`.

## API calls

None.

## What differs from Expo

The Expo app still uses `EXPO_PUBLIC_BACKEND_URL` and React Native theme objects. This app does not share that session or those screens.

## How to test

From `web/`: `npm install` (already done once), then `npm run dev`. Open http://localhost:5173. The page background is `#F8FAFC`, the card is white, the title is `#1E3A8A`, and the second line says the backend URL is set. `npm run build` already succeeded.

## What is left

Rows 1b onward. No sidebar, login, or module screens.
