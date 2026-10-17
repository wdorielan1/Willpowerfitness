# Sticker browser verification

This dev-only route renders the production `DoneSheet` with an invented workout history passed through production `summarize()`. It never reads or changes the app's saved workouts, never authenticates, and is not an entry point in the production Vite build.

Start Vite, then run:

```sh
node scripts/share-sticker-check.mjs
```

Alternatively, open `/tests/share-sticker/` in the running browser and press **Run checks** for the 32 renderer/photo/clipboard checks. **Light photo** and **Dark photo** load local test images into the production file input.

The script uses an installed Playwright package (with a bundled Codex fallback) and a local Chrome executable. Set `PLAYWRIGHT_MODULE` to the absolute path to Playwright's `index.mjs` and `CHROME_PATH` if they differ from the bundled Codex runtime / macOS Chrome defaults. `SHARE_STICKER_BASE_URL` defaults to `http://127.0.0.1:5173`; `SHARE_STICKER_OUTPUT` selects the screenshot/report directory.

Coverage includes transparent alpha bounds, all PR rows and long names, negative volume changes, 12 combinations of style/text/photo tone, no PR, Story/Post sizing, mouse drag, touch pinch, slider and keyboard bounds, preference retention, local-photo privacy, image downscaling and eight EXIF orientations, clipboard and share fallbacks (including cancellation), and the 390px sheet.

The photo fixtures are generated in memory from an existing local exercise photograph with light/dark exposure overlays. No user photo or test photo is uploaded. Clipboard and share APIs are mocked to avoid altering the system clipboard, opening native share sheets, or sharing anything externally.

Desktop Chromium results do not verify real iPhone Safari memory behavior, clipboard user activation, or Instagram paste behavior. Those still need manual device checks.
