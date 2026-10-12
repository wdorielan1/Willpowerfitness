# Will Power: testing checklist

Run this on a real phone (and once on desktop) against the testing build before anything goes to the live branch.
Mark each box, note the date and build, and write down anything that fails.

Build: ________  Date: ________  Device: ________  Tester: ________

## 1. Sign-in and account
- [ ] Sign up with email and password
- [ ] Sign in with Google
- [ ] Log out and back in: data is still there
- [ ] Open the app on a second device: same account, same data
- [ ] No yellow "could not sync" banner after a few actions

## 2. Onboarding
- [ ] Every step can be completed and skipped where optional
- [ ] "Where do you train?" area picker saves a town-level pin
- [ ] Crew suggestions show no fake member counts
- [ ] "Bring your lifting history" step (4 of 6) can be skipped with nothing pasted
- [ ] Paste a CSV from ChatGPT: the preview shows matched exercises and set counts
- [ ] Paste a CSV from Claude: same result
- [ ] Paste plain notes (e.g. "Bench press: 185x8, 185x8"): sets are found
- [ ] Upload a .csv file: it fills the box
- [ ] "Use these N sets", then Remove: the import is undone
- [ ] After "Start showing up", the imported workouts appear in Progress and today's weights start from them
- [ ] The same import still works later from the Import page

## 3. Today and workouts
- [ ] Today's session loads for your split, level and goal
- [ ] Start a workout, log sets, finish, see it in Progress
- [ ] Add, Swap and remove (x) an exercise; search works
- [ ] Build your own workout; save it; reuse it
- [ ] Rest timer works; screen stays readable at phone size
- [ ] Week schedule: days before sign-up are not marked missed

## 4. Fuel (nutrition)
- [ ] Build a meal and calculate portions
- [ ] Save a meal; it appears in the plan
- [ ] Daily totals and the Fuel goal update
- [ ] AI export gives a usable text/file
- [ ] Add food: type a food, tap "Search online": results appear with calories and macros
- [ ] Add an online result: it is logged with the right numbers
- [ ] Build meal: online results can be selected and portioned
- [ ] Packaged food (e.g. a brand yogurt) shows a sensible serving size
- [ ] Offline or blocked network: a clear message, nothing breaks
- [ ] Whole-food results appear only after VITE_USDA_API_KEY is set in Amplify
- [ ] Scan a barcode (Android Chrome): camera opens, a packaged food is recognised, the card shows calories and macros
- [ ] Scan a barcode (iPhone Safari and the home-screen app): same result; note how long it takes and in what light
- [ ] Camera permission denied: a clear message, and typing the barcode number still works
- [ ] A barcode not in the database: "No product found" message
- [ ] Closing the scanner turns the camera light off

## 5. Progress and photos
- [ ] Weight, steps and cardio can be logged
- [ ] Charts and personal records update
- [ ] Add a progress photo; it uploads; tap to open the lightbox; delete it
- [ ] Import history (CSV/AI text) previews before saving

## 6. Crews
- [ ] Join and leave a crew
- [ ] Start a new crew with a category and place
- [ ] Post text and photos; like; delete own post
- [ ] Question of the day: one per day, hides after answering, returns if the answer is deleted
- [ ] Crew check-in and chat work
- [ ] Report a crew

## 7. Crew map
- [ ] Map tiles load
- [ ] Place search finds a town
- [ ] "Locate me" shows a blue dot; nothing exact is saved
- [ ] Nearby crews list and wait list work

## 8. Challenges
- [ ] Join a challenge; score updates after a workout
- [ ] Leave a challenge
- [ ] Create a challenge; share its ?join link; a second account joins
- [ ] Leaderboard order is correct

### Free challenge rules (once built, see docs/FREE-CHALLENGES.md)
- [ ] The challenge shows its type and rules in plain words before you join
- [ ] Show Up: a day counts only with a check-in plus a finished workout
- [ ] Show Up: progress shows days done, days left, days still needed
- [ ] Points: scores match the point table; the daily cap holds at 30
- [ ] Imported or edited past logs never add points
- [ ] Divisions: join picks one; a division with fewer than 5 players merges
- [ ] Ties break in the documented order
- [ ] Leave removes you from the leaderboard
- [ ] Report a result works

## 9. Friends and profile
- [ ] Find friends; follow and unfollow
- [ ] Profile and Settings changes save
- [ ] Delete account / export data works
- [ ] (Re-run supabase/schema.sql first.) Friends tab: members of your crews appear under "People in your crews" with Follow
- [ ] Follow someone: they see you under "Follow you" with Follow back; after they follow back you both appear under Friends
- [ ] Friends tabs show counts: Followers (everyone who follows you), Following (everyone you follow), Find people
- [ ] A person who follows you and you follow back shows a "Friends" tag in both Followers and Following
- [ ] Followers: someone you don't follow back has a Follow back button; Following: Unfollow works and the count drops
- [ ] Tap a person: friend profile shows name, handle, streak, crews; joining one of their crews works
- [ ] Invite link: a new account that joins through it follows the inviter automatically (inviter sees them under "Follow you")
- [ ] Search finds people by name and by handle (only those with "find me" on)
- [ ] A suggested handle is pre-filled; Save makes you searchable and the invite link carries it
- [ ] Unfollow moves a friend to "Follow you"; nothing shows people you never connected with
- [ ] Sign in with Google: your Google photo shows on Profile, and friends see it on their Friends list and your friend profile
- [ ] Sign in with email: a letter avatar shows (no broken image)
- [ ] Profile > Add photo / Change photo: pick a photo; it shows as a round picture; Remove photo goes back to the Google photo or a letter
- [ ] After changing the photo, your picture shows on your posts, in the crew "Training today" list and on Today's crew card
- [ ] A second account sees your new photo next to your posts and check-ins (re-run supabase/schema.sql first; may take a refresh)
- [ ] A very large or odd photo (phone camera, HEIC) is shrunk and works, or shows a clear error
- [ ] After logging in, every account has a row in public_profiles (handle set, searchable off)
- [ ] A new account's handle is the first part of their email (letters and numbers), and a name/handle search finds them by default
- [ ] Two people with the same email start get different handles (the second gets digits added)
- [ ] The Friends tab toggle shows On for new accounts, and turning it off hides them from search

## 10. General
- [ ] Installs as a home-screen app (PWA) and opens full screen
- [ ] Works offline for already-loaded screens without crashing
- [ ] Landing, Privacy and Terms pages load; brand reads "Will Power"
- [ ] No console errors on the main screens
- [ ] Nothing shows fake users, fake counts or fake activity

## Before real money (paid challenges)
- [ ] Lawyer signed off on the rules and blocked states
- [ ] Payment processor approved paid-entry contests
- [ ] Official rules and terms accepted before entry
- [ ] Payout review and anti-cheat checks in place
