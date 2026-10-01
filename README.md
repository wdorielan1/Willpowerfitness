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

## Beta notes
- Data is stored on-device (localStorage) per account. Community members, counts and leaderboards are **sample data** until a backend exists.
- Google Sign-In: set `VITE_GOOGLE_CLIENT_ID` (see `.env.example`). Without it, a demo Gmail flow is used.
- Sign in with Apple: set `VITE_APPLE_CLIENT_ID` (+ optional `VITE_APPLE_REDIRECT_URI`). Needs an Apple Developer account, a Services ID, and an HTTPS domain. Without it, a demo flow is used.
- Shortcuts use deep links (`/#/go/going`, `complete`, `cardio`, `weight`, `workout`). Signed `.shortcut` downloads need a native/iCloud step.

## Layout
`src/engine.ts` workout generator, progressive overload, streaks, macros · `src/data.ts` exercises + communities · `src/pages/*` screens
