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
