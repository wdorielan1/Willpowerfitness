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
- [ ] After "Join free", a "Check your email" page appears (not an error line) showing the email address
- [ ] The confirmation email arrives with the Will Power layout and subject "Confirm your email to join Will Power"
- [ ] "Send it again" is disabled for about 45 seconds, then sends a new email
- [ ] Tapping the email's button signs you in and starts onboarding

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
- [ ] After finishing, Today says "COMPLETE" with the real finish time (not the planned time)
- [ ] With auto-share on: finishing posts "Finished ..." to the crew once; reopening the workout and tapping Save changes does not post again
- [ ] Deleting the day's workout and finishing a new one posts again
- [ ] Each exercise says "Your goal: N sets of A–B reps", the Reps column header shows the range, and empty rep boxes show the range (e.g. 6–8)
- [ ] With the rest timer showing, open "How hard was your last set?": the RPE buttons scroll up clear of the timer and are easy to tap
- [ ] Week schedule: days before sign-up are not marked missed
- [ ] Sign-up asks for sex (Male, Female, Prefer not to say) on the "Your numbers" step; Next is disabled until one is picked
- [ ] Sign-up lets you pick up to 3 body parts to focus on (a 4th is disabled); picking none still works
- [ ] With focus areas set, today's lifts include extra work for them (e.g. abs or glutes on a push day) and the preview says "Built for your goal ... extra work for ..."
- [ ] Changing sex or focus areas in Settings changes the next workouts and (for sex) the Fuel calorie targets
- [ ] Existing accounts see a "Tune your plan" card on Today until they answer; their calories don't change until they do

- [ ] Tapping a day in "This week" opens a sheet with that day's planned exercises (sets x reps); rest days say Recovery; a finished day shows what you logged
- [ ] Finishing a new workout opens a "Workout complete" sheet (minutes, lb lifted, sets); re-saving a finished workout does not
- [ ] Beating your earlier best on a lift shows it under New personal records with a % gain; a first-ever log is not a PR
- [ ] Volume vs your last session of the same type shows when you have one
- [ ] Share a picture opens the phone share sheet (Instagram works from there); on desktop it downloads the image
- [ ] The card shows time, stats, PRs and streak; adding a place (optional) puts it on the card; nothing uses GPS
- [ ] The crew post for the workout mentions your top PR
- [ ] Settings shows Saving… then ✓ Saved after a change
- [ ] The top bar fills green as sets are logged
- [ ] Stickers: Minimal / Performance / Full recap all show real numbers; Minimal names the lift
- [ ] Add your photo (iPhone camera + library): sticker sits on it; drag, pinch and the size slider work
- [ ] A bright photo switches the sticker to dark text (and a dark photo to white) with a note; tapping White/Dark yourself sticks
- [ ] Copy sticker, then paste into an Instagram Story over a photo AND over a video
- [ ] Share with a photo opens the share sheet with the combined picture (Instagram listed)
- [ ] "No photo? Use a card" still makes the Story/Post card
- [ ] The sheet shows time, lb moved, sets, volume change, streak and top PRs
- [ ] Re-opening a finished workout and tapping Save changes keeps the original duration, even if the timer kept running
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

## Profiles (public pages)
- [ ] (Re-run supabase/schema.sql first. Add the Amplify rewrite rule from docs/SOP.md.) Open https://wilpow.com/u/<your handle> in a private window while signed out: your public profile loads
- [ ] Settings > Public profile: turn it Off, then the signed-out link shows "Profile not found"; turn it On and it loads again
- [ ] Bio saves (160 characters) and shows on the profile
- [ ] Profile shows streak, workouts in 30 days, total, the 12-week calendar and earned badges (locked ones are dimmed only on your own profile)
- [ ] Make a crew post: it appears in the crew feed AND on your profile; delete it and it disappears from both
- [ ] Posts made before turning public on stay crew-only (not on the signed-out page)
- [ ] A post with a photo shows only text and "Shared a photo with the crew" on the public page (photo is not exposed)
- [ ] (Re-run supabase/schema.sql first.) Your profile shows "N followers, N following" under your bio; tapping each opens the Followers or Following tab on Friends
- [ ] Follow someone: their follower count goes up by one (also on their signed-out public page); unfollow and it goes back down
- [ ] Followers and Following counts show on other members' profiles and on the signed-out public page (not tappable there)
- [ ] Another member's profile in the app (Friends > tap a person) shows the same layout with Follow and Share profile
- [ ] The page title and link preview show the person's name
- [ ] The rest of the app still works after the base path change (icons, exercise photos, map, install to home screen)

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
