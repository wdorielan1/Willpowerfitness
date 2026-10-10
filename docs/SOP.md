# Will Power Fitness: Operations Manual (SOP)

Keep this file in the repo (`docs/SOP.md`). It records how the app is hosted, deployed and fixed. **Never put secret keys in this file.**

## 1. How the pieces fit
| Piece | Where | What it does |
|---|---|---|
| Code | GitHub: `wdorielan1/Willpowerfitness` | Source of truth. Branch in use: `claude/vigilant-galileo-ttnshi` (later: `main`). |
| Hosting | AWS Amplify Hosting | Builds and serves the app. Auto-deploys on every push to the connected branch. |
| Backend | Supabase (project `fbwufmdfhcexjxfgiqnh`) | Login, database, crews, posts, challenges, photo storage. |
| Domain | Registered at Namecheap; DNS managed in Netlify DNS | `willpowerfitclub.com` points at Amplify. |
| Netlify site | Netlify | Old host. Builds are stopped. Keep it only for DNS. |

## 2. Deploy a change
1. Push code to the connected GitHub branch.
2. Amplify console shows the build (about 2 minutes). Green = live.
3. If the build fails, open the build log in Amplify and fix the first error shown.

Local check before pushing: `npx tsc --noEmit` then `npm run build`.

## 3. Amplify settings
- Build command: `npm run build`. Output directory: `dist`.
- Environment variables (Amplify → Hosting → Environment variables):
  - `VITE_SUPABASE_URL` = `https://fbwufmdfhcexjxfgiqnh.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = the **publishable** key (Supabase → Project Settings → API Keys, starts `sb_publishable_`).
- Never use the secret or `service_role` key in the app or in Amplify front-end variables.
- After changing a variable, redeploy (Amplify → Redeploy this version).

## 4. Supabase
- **Schema**: `supabase/schema.sql` is re-runnable. To apply: SQL Editor → paste the whole file → Run. Then run `notify pgrst, 'reload schema';`.
- Copy the raw file from the same branch that is deployed. An old copy causes "table not found in schema cache" and "Bucket not found".
- Auth redirect URLs (Authentication → URL Configuration): include `https://willpowerfitclub.com` and the `*.amplifyapp.com` URL.
- Storage buckets: `progress-photos` and `crew-photos` (both private).
- Quick check that the schema is in place:
  ```sql
  select to_regclass('public.crew_posts') as posts,
         to_regclass('public.custom_challenges') as challenges,
         (select count(*) from storage.buckets where id = 'crew-photos') as crew_bucket;
  ```
- Photo posts fail with "row-level security" or hang: re-run `supabase/fix-crew-photo-rls.sql`, plus
  `alter table public.crew_posts add column if not exists image_paths text[] not null default '{}';`

## 5. Domain and DNS
- Registrar: Namecheap, nameservers set to Netlify DNS (`dns1-4.p02.nsone.net`).
- Records live in Netlify → Domains → willpowerfitclub.com → DNS records.
- To point the domain at Amplify: Amplify → Custom domains → Add domain → manual DNS. Add the records Amplify gives (validation CNAME, `www` CNAME, and an ALIAS for the root) in Netlify DNS. Delete old records pointing to the Netlify site.
- Do not delete the Netlify DNS zone. If the zone is deleted the domain stops working.
- Before moving DNS, note down any MX/TXT records (email) so they can be kept.

## 6. Netlify (kept for DNS only)
- Stop builds: Site configuration → Build & deploy → Continuous deployment → Build settings → Stop builds.
- Do not delete the site until the domain shows Available in Amplify and has been tested for a few days.

## 7. Costs (verify current pricing on the AWS and OpenAI pricing pages)
- Amplify: about $0.01 per build minute, about $0.15 per GB served, free tier for the first 12 months. Early months are expected to be $0 to $5.
- Lambda: about $0.20 per million requests, with an always-free allowance. Not used yet.
- Set an AWS Budget alert (Billing → Budgets) so a surprise cannot happen.

## 8. Adding AI later (OpenAI)
- The OpenAI key must never be in the front end. Put it in a backend function: a Supabase Edge Function (simplest) or AWS Lambda.
- The function must check the user's Supabase login, enforce a per-user limit, and log token usage in a Supabase table.
- Set a spending cap in the OpenAI dashboard before launch.

## 9. Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| Blank page or cannot connect | Missing or wrong Supabase variables in Amplify | Check section 3, redeploy |
| Google/email login fails on a new URL | URL not in Supabase redirect list | Add it (section 4) |
| "Could not find the table ... schema cache" | Schema not run, or cache stale | Run `schema.sql`, then `notify pgrst, 'reload schema';` |
| "Bucket not found" | Storage part of schema not run | Run `schema.sql` |
| Photo post hangs or RLS error | Old storage policies | Run `supabase/fix-crew-photo-rls.sql` |
| Posting says membership error | Missing crew membership row | Reopen the app, rejoin the crew |
| Domain shows old site | DNS still points at Netlify | Update records (section 5) |
| Amplify build fails | Code or type error | Read the build log, run `npm run build` locally |

## 10. Exercise library
- 41 hand-tuned exercises live in `src/data.ts`. About 520 more come from the free-exercise-db project (public domain) via `src/libraryIndex.ts` (small index in the app), `public/lib/steps.json` (how-to steps, loaded on demand) and `public/ex/*.jpg` (photos, shrunk for phones).
- To rebuild: download `exercises.json` from the free-exercise-db repo, run `python3 -I scripts/build-library.py exercises.json`, then `scripts/fetch-library-images.sh`.
- Workouts are built from your goal, level and equipment. Main lifts change every 4 weeks, accessories on the Settings rotation (weekly, every 2 weeks, monthly, never). Logic is in `src/engine.ts` (`candidates`, `pickKeys`, `pickAccessories`, `tune`).
- Stretching exercises were left out because the set logger counts reps, not hold times.

## 11. App notes
- Brand: the app is called **Will Power**. The domain `wilpow.com` is the web address. The link-preview tags in `index.html` (`og:url`, `og:image`, `twitter:image`) still point at `willpowerfitclub.com`; update them to the live domain once it is attached in Amplify.
- Two modes: cloud (Supabase keys present) and local (no keys, data stays on the device).
- Sign in with Apple is intentionally not included (needs a paid Apple Developer account).
- Crews with no activity for 35 days are archived (data kept). Users can join at most 3 crews.
