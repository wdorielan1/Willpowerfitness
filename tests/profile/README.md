# Profile browser checks

Start Vite without Supabase environment variables (`npm run dev`), then run `node scripts/profile-check.mjs`. Set `PLAYWRIGHT_MODULE` and `CHROME_PATH` if Playwright/Chromium are installed outside the project. `PROFILE_BASE_URL` defaults to `http://127.0.0.1:5173`; `PROFILE_OUTPUT` chooses the screenshot directory.

The development fixture at `/tests/profile/` uses invented profiles and a bundled image stored in local IndexedDB. It never authenticates or writes to a backend. The owner fixture seeds a separate test account in local storage, so use a fresh browser context.

Checks cover the actual owner profile, the shared public layout without a router, responsive layouts at 320/390/430/768px, all four tabs, keyboard navigation, full post previews and focus restoration, missing photos, expired videos, loading/empty/retry states, editing/friends/account links, historical stats, and privacy for lift-volume totals. Query parameters `?owner`, `?public`, `?long`, `?empty`, `?loading`, `?error`, and `?legacy` expose individual states for visual inspection.

The grid uses users’ existing photos. Text and workouts without images receive a graphic fallback. Older published profiles display unavailable time/volume as a dash until their owner signs in and publishes fresh stats. Storage authorization stays unchanged; inaccessible photos receive a fallback. Public profile URLs request public posts only.
