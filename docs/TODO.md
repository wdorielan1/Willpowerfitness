# Will Power: To-do list

Parked ideas and open items. Move things up as priorities change. Keep secrets out of this file.

## Setup items (owner)
- [ ] Add `wilpow.com` in Amplify (Route 53 is easiest), wait for "Available", test on a phone.
- [ ] Update link-preview tags in `index.html` (`og:url`, `og:image`, `twitter:image`) to the live domain.
- [ ] Supabase: re-run the latest `supabase/schema.sql`, then `notify pgrst, 'reload schema';` (adds crew type, map location columns, wait list, reports, leave-a-challenge permission).
- [ ] Google Cloud consent screen: app name "Will Power", logo, privacy and terms links on the new domain.
- [ ] Set an AWS Budget alert and a Supabase usage alert.
- [ ] Netlify: builds are stopped. Delete the old site only after the domain has moved. Keep DNS until then.
- [ ] Redirect `willpowerfitclub.com` to the new domain once it is live.
- [ ] Move Supabase to the Pro plan once there are a few hundred real users.

## On hold (decided to wait)
- [ ] **Starter / baseline crews**: real crews run by a Will Power team account (never fake members). Waiting on: which local areas to start with (e.g. Woodbridge), and creating the team account. Starter crews would be exempt from the 35-day auto-archive.
- [ ] **Member-count fix** (onboarding showed placeholder numbers like "184 members"). Saved on local branch `backup/member-count-fix`, commit `8fa1172`. Re-apply when ready. Note: placeholder counts are still visible in the live sign-up suggestions until then.

## Next features (suggested order)
1. [ ] **Real-phone testing pass** on the live app. Collect bugs before adding more.
2. [ ] **Distance and sport challenges**: sport picker (run, ride, walk, swim), distance and time, manual logging first.
3. [ ] **Founding-crew look**: small crews say "Founding crew, be one of the first" instead of low numbers. Real counts only.
4. [ ] **Food search for Fuel**: USDA FoodData Central, then barcode scanning with Open Food Facts. Keep carb days and the meal builder.
5. [ ] **Stretching and warm-up / cool-down** with hold timers (123 stretches were left out of the library on purpose).
6. [ ] **Thumbs up / down on exercises** (down = never again, up = keep in the mix).
7. [ ] **Progress insights**: charts per exercise, personal records, weekly streaks.
8. [ ] **Crew map follow-ups**: marker clustering when there are many pins, "Follow me" mode with a direction cone (optional), report review screen.
9. [ ] **Challenge creators can delete their own challenge.**

## Bigger projects
- [ ] **AI coach (OpenAI)**: Supabase Edge Function holds the key. Per-user daily limits and a usage table. Spending cap in OpenAI.
- [ ] **Strava import**: needs a Strava developer app and approval. First read Strava's current API agreement, especially the rules on showing one member's data to others (leaderboards) and the ban on AI training. Email their API team before building leaderboards on it.
- [ ] **iPhone app** (Capacitor wrapper): Apple Developer account ($99/yr), Mac with Xcode, App Store review. Then Apple Health (also brings in MyFitnessPal data), push notifications, and later a Record button with background GPS if members ask.
- [ ] **Brand positioning**: lifting stays the core; run, bike and walk live in challenges and crews. Consider softening the tagline later.
- [ ] **Free challenge credits (later)**: earn a free challenge credit by completing a set number of workouts, or at milestones (e.g. after N challenges). Not a refund; separate from prizes.
- [ ] **Paid challenges (after legal review)**: see the pot design in the Will Power Challenges & Monetization doc. Decided: no refunds, prize pool grows with sign-ups in round numbers, Will Power keeps about 15 to 25%. Needs lawyer and payment-processor sign-off first.
- [ ] **Free challenge rules** (`docs/FREE-CHALLENGES.md`): draft v1 is only a starting point. Each challenge will get its own rules, so decide what a "rule set" looks like per challenge before building: day goal (16 of 30?), points and daily cap, rest day, divisions, round start dates. Then build as free challenges only.
- [ ] **Lock divisions (later, only if sandbagging becomes a problem)**: advanced and intermediate members can't join Beginner challenges. For now divisions stay open so we don't turn anyone away. When it's time: place by logged history and imported history, allow moving up but never down, lock the choice during a round, promote repeat winners, and review top finishers before any payout.
- [ ] **Rest timer sound on silent mode**: the sound only plays when the phone isn't on silent. Discuss options (vibration, a notification, a native app later). iPhone web apps generally can't play audio over the silent switch.
- [ ] **Year-end recap (like a "wrapped")**: a shareable recap at the end of the year built from your own feed and activity: workouts, streaks, top lifts and PRs, challenges, crews, posts and highlights. Decide what it includes and what is private before building.
- [ ] **Google Search Console: "Page with redirect"** (email, Oct 2026): some URLs aren't indexed because they redirect. Usually harmless (old domain or http/www redirects). Open Search Console > Indexing > Pages, check which URLs are listed, and confirm the main wilpow.com page is indexed. Also: switch the og:url / og:image tags in `index.html` from willpowerfitclub.com to wilpow.com, add `robots.txt` and a sitemap, and note that the app uses `#/` routes, which Google ignores (only the home page can be indexed; consider real paths for Landing, Privacy and Terms if search traffic matters).
- [ ] **Email service (follows and sign-in)**: set up a transactional email service (for example Resend) with wilpow.com verified (SPF/DKIM DNS records). Use it for (1) follow notifications ("Alex started following you", one email per pair, daily cap per sender, opt-out toggle in Settings, never show anyone's email address) and (2) Supabase sign-in/confirmation emails via custom SMTP so they come from wilpow.com instead of Supabase. Key stored as a Supabase secret, not in the app. Start with an in-app dot on the Friends tab, which needs no email.
- [ ] **Message feature (direct messages)**: one-to-one messages between friends (mutual follows first). Decide: who can message whom (friends only by default), block and report, message notifications (in-app dot first, email/push later), retention, and what the Privacy page must say. Reuse the crew chat pattern in Supabase with row-level security so only the two people can read a thread.
- [ ] **Profile redesign**: public profile page with bio, streak strip, consistency calendar, badges, highlights, crews and posts; Follow and Cheer for visitors; per-section and per-post visibility (crew-only by default). Build order: header + calendar + crews, then badges + Follow/Cheer, then posts with visibility.

## Notes
- MyFitnessPal has no self-serve API (partner program only). Route: Apple Health / Health Connect, or CSV import.
- Never show fake users, fake posts or inflated counts as real. A labelled demo mode (screenshots and testing only) is fine.
- Location: only a town-level pin, rounded to about a mile. Never a home address. Route start and end points stay hidden if routes are ever shown.
