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

## Layout
`src/engine.ts` workout generator, progressive overload, streaks, macros · `src/data.ts` exercises + communities · `src/pages/*` screens
