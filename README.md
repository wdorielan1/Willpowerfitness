# Will Power Fitness
**Wake Up. Show Up. Lift.**

An accountability-first fitness community: join a crew by workout time, check in daily, log lifts with progressive-overload recommendations, track progress and nutrition, and wire up Siri / Apple Shortcuts.

Mobile-first, dark, installable PWA (React + TypeScript + Vite).

## Run
```
npm install
npm run dev      # http://localhost:5173 (use your phone on the same network)
npm run build
```

## Backend setup (real shared crews)
1. Create a free project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Authentication → Providers → enable **Google** (needs a Google Cloud OAuth client; redirect URL is shown in Supabase). Add your site URL under Authentication → URL Configuration.
4. Copy the project URL and anon key from Project Settings → API into `.env`:
   `VITE_SUPABASE_URL=...` and `VITE_SUPABASE_ANON_KEY=...`
5. `npm run dev`. Accounts, check-ins, streaks, crews and messages are now shared between real users; personal data (logs, weights, profile) syncs across devices.

Re-run `supabase/schema.sql` whenever it changes (it is safe to run repeatedly); the latest version adds the private `progress-photos` storage bucket used by Progress Photos.

Without these keys the app runs local-only with sample community data.

## Beta notes
- Data is stored on-device (localStorage) per account. Community members, counts and leaderboards are **sample data** until a backend exists.
- Google Sign-In: set `VITE_GOOGLE_CLIENT_ID` (see `.env.example`). Without it, a demo Gmail flow is used.
- Shortcuts use deep links (`/#/go/going`, `complete`, `cardio`, `weight`, `workout`). Signed `.shortcut` downloads need a native/iCloud step.

## Credits
Exercise photos and how-to steps: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense). Stored in `public/ex/` and `src/exerciseMedia.ts`.

## Layout
`src/engine.ts` workout generator, progressive overload, streaks, macros · `src/data.ts` exercises + communities · `src/pages/*` screens

## Crew photo posts

Apply the rerunnable `supabase/schema.sql` before deploying multi-photo posts. It
adds `crew_posts.image_paths text[] not null default '{}'`; older `image_path`
posts still display. The private `crew-photos` bucket uses
`crewId/userId/photoId.jpg`. Uploads use unique UUIDs with `upsert: false`, so
INSERT permission is sufficient; no new Storage UPDATE policy is needed.

Posts accept up to 10 photos, uploaded sequentially after compression to at most
1280px JPEG at quality 0.82. Photo decoding and encoding have timeouts and report
unsupported formats (including HEIC on browsers without a decoder). Failed posts
clean up completed uploads. Deleting posts, including when leaving a crew with
"delete my posts" selected, removes all attached photos before removing rows.

The previous upload code awaited `createImageBitmap` without a timeout and used
Storage upserts without an UPDATE policy. These are code-level failure paths;
confirm the specific device symptom against the live project on a real iPhone.

Development checks: `npx tsc --noEmit` and `npm run build`. Mobile Chromium
validation covered multi-file selection, removal, local posting, carousel
navigation, lightbox indexing/swipe, text-only posting, and invalid-image errors
at 390×844. Live Supabase permissions and real iPhone HEIC uploads require a
configured project and device verification.
