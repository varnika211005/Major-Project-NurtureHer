# Progressive Web App (PWA) — NurtureHer AI

NurtureHer AI ships as an installable Progressive Web App so the interface can
load on a phone or desktop even with a poor connection. This document explains
what is cached, how registration works, and how to verify it.

## What works offline

- The **application shell**: HTML, CSS, JavaScript bundles, fonts and the logo.
- **SPA navigation** between routes (network-first, falling back to the cached
  shell when the device is offline).
- The **offline banner** appears automatically when the browser reports no
  connectivity, and a short "Back online" confirmation appears afterwards.

## What does **not** work offline (by design)

NurtureHer never fabricates or serves stale clinical data. The following always
require a live connection and show their own error/empty states when offline:

- Sign in / registration and any authenticated request
- Health records, dashboards and insights
- The AI coach / chat
- HerReach facility search
- Predictions (PCOS / PPD) and analytics

The service worker explicitly ignores every request to `/api/` and any
cross-origin URL, so API responses are never cached.

## How it is implemented

- `public/manifest.webmanifest` — app metadata and icons.
- `public/sw.js` — hand-written service worker (no runtime dependency).
- `vite.config.ts` — the `nurtureher-pwa-precache` plugin emits
  `dist/sw-precache.js` at build time with a versioned list of every hashed
  build asset. `sw.js` loads it via `importScripts`.
- `src/pwa.ts` — registers `/sw.js` **only in production**
  (`import.meta.env.PROD`), and adopts a new worker on the next load via
  `SKIP_WAITING` + a one-time reload.
- `src/layout/OfflineBanner.tsx` — connectivity UI in the app shell.

Icons are generated from the approved emblem (mother/baby, heart, lotus) saved in `frontend/public/nurtureher-icon.png`, producing favicons (16/32/48 + ICO), PWA icons (192/512 any and 512 maskable), and an Apple touch icon (180). The full wordmark `frontend/public/nurtureher-logo.png` remains unchanged for the website header.
`icon-512.png` and `apple-touch-icon.png`.

## Build and verify

```bash
cd frontend
npm run build          # emits dist/sw.js, dist/sw-precache.js, dist/manifest.webmanifest
npm run preview        # serves the production build at http://localhost:4173
```

Verification checklist:

1. Open `http://localhost:4173/` in Chrome DevTools → **Application →
   Service Workers** and confirm `/sw.js` is **activated** and controlling the
   page.
2. **Application → Manifest** shows the NurtureHer name and icons.
3. **Application → Cache Storage** contains `nurtureher-shell-<version>`.
4. Toggle **Network → Offline**, then reload: the shell still renders and the
   offline banner is displayed. Feature data remains unavailable (expected).

> Note: the backend only allows CORS from `http://localhost:5173`. To exercise
> authenticated flows against the preview server, either add the preview origin
> to the backend CORS allow-list or launch Chrome with
> `--disable-web-security` for local testing only.

## Installing

On a supported browser, use the browser's install prompt (address-bar install
icon on desktop, or "Add to Home Screen" on mobile). The app then launches in
`standalone` display mode using the icons from the manifest.
