# Workout card browser checks

Start Vite with `npm run dev`, then run `node scripts/workout-card-check.mjs` with Playwright installed. Set `PLAYWRIGHT_MODULE` to an existing Playwright `index.mjs` and `CHROME_PATH` to a Chrome/Chromium executable if necessary. `WORKOUT_CARD_OUTPUT` selects the screenshot directory; `SHARE_STICKER_BASE_URL` defaults to `http://127.0.0.1:5173`.

The dev-only `/tests/workout-cards/` harness uses invented workout history. Native sharing and crew posting are mocked; it never writes real posts or user data. `?no-pr` exercises the empty PR state; `?crew` shows crew posting; `?crew&fail` simulates a posting error.

Checks cover all four styles in 1080×1920 Story and 1080×1350 Post formats, receipt totals, PR percentage/baseline consistency, positive/zero/negative/missing volume comparisons, long receipts, photo replacement/removal, download and share actions, crew posting/errors, and 320px/390px layouts. Rendered PNGs and a gallery screenshot are saved for visual inspection.

Run `scripts/share-sticker-check.mjs` as well when changing the shared image hook or sticker/photo controls. Native iPhone/Instagram handoff still requires a real-device check; browser mocks verify the exported files and API calls.

Card headings use the bundled Barlow Condensed font under the SIL Open Font License in `public/fonts/BarlowCondensed-OFL.txt`. System fonts remain a fallback if loading fails.
