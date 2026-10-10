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
Storage upserts without an UPDATE policy. The crew Storage policies also used
an unqualified `name` in membership subqueries, which resolved to the member
display name instead of `storage.objects.name`; this rejected valid uploads
and photo reads. The policies now qualify the object path. The decode behavior
and real device verification remain separate from this SQL defect. For projects
that already have the full schema, run `supabase/fix-crew-photo-rls.sql` in the
Supabase SQL Editor to repair only the two affected crew-photo policies.

Development checks: `npx tsc --noEmit` and `npm run build`. Mobile Chromium
validation covered multi-file selection, removal, local posting, carousel
navigation, lightbox indexing/swipe, text-only posting, and invalid-image errors
at 390×844. Live Supabase permissions and real iPhone HEIC uploads require a
configured project and device verification.

## Training app layout

Today leads with the next session, one Start/Resume action, the actual weekly
plan, and crew check-ins. Train has a focused session view with large set inputs,
an expandable exercise guide, and notes/swaps/set management in Exercise options.
Tap **Log set** to check a valid set and start rest when automatic rest is enabled;
typing alone does not start a timer. Editing a checked set clears its check.

Set checks are stored in the optional `Draft.completed` field inside the existing
profile data. Older drafts and workouts still load; the session review explicitly
includes valid entered sets that have not been checked. No new database migration
is required for the design changes. Existing crew-photo schema and RLS repairs
still need to be applied to the live project as described above.

Crew leads with real check-ins and the photo feed; questions, leaderboard, and
crew details are secondary expandable sections. Account settings and Siri remain
available through the profile icon. Local mode shows only this device's activity.
