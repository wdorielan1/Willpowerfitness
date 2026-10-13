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
- [ ] Each exercise says "Your goal: N sets of A–B reps", the Reps column header shows the range, and every set's reps start filled with the top of the range (e.g. 8 for 6–8)
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
- [ ] During a workout, Change workout lists Build your own; picking exercises and Start lifting switches to a Custom workout with exactly those
- [ ] After finishing, Today shows a Share this workout button; it opens the sticker screen with the right numbers
- [ ] A workout finished before the sticker update can still be shared from Today
- [ ] Reopening a finished workout shows Share this workout near the bottom of the review page
- [ ] Re-opening a finished workout and tapping Save changes keeps the original duration, even if the timer kept running
- [ ] Undo completion on Today asks first (Yes, undo it / Cancel); Cancel keeps the workout complete; confirming keeps your logged sets
- [ ] Train: pick a made workout (not Build your own), press and hold a lift for a moment: it lifts off the list; drag up or down and the others make room; let go and the order sticks
- [ ] The same press-and-hold drag works on Today's lifts (warm-up page) and the lifts list on the review page; a quick tap still opens the exercise and a normal scroll still scrolls
- [ ] The new order is remembered for the day and Start lifting uses it; Build your own still has its up and down arrows only
- [ ] Rest timer starts at 1:00 for every lift, big or small (new account); an account still on the old default also moves to 1:00; a custom time you set earlier is left alone; Settings > Rest timer has a "1 minute" preset
- [ ] Type a weight on set 1: the sets after it fill with the same weight; change set 3 on its own and set 4 follows it but set 2 stays
- [ ] Every set's reps start at the top of the range; none of the prefilled sets are saved unless you log them (finish with one exercise logged: only those sets appear in the review and history)
- [ ] Swipe a set right to log it (green "Log set" shows, the check mark still works, rest timer starts); a short nudge or an up/down scroll does nothing
- [ ] Swipe a set left to delete it (red "Delete" shows); a "Set N deleted · Undo" line appears for a few seconds and Undo brings it back; Manage sets in the options menu still deletes too
- [ ] Logging the last set (swipe, check or footer button) logs the sets before it too, filling any blank weight or reps from it
- [ ] The first time you reach the sets, a looping demo shows a row swiping right (green) then left (red); it goes away after you swipe a set or tap Got it, and a one-line hint stays
- [ ] Swiping a set never flips to another exercise
- [ ] Today's lifts (warm-up page): swipe a lift left and it is removed right away with a "Removed ... Undo" line; Undo puts it back in the same spot
- [ ] Swipe a lift right: a green "Add new" panel shows; the lift stays and a new one (same muscle) appears right after it with "Added ... after ... Undo"; Undo removes it again
- [ ] A new lift never has the same name as one already in the workout; Swap and Add exercise lists don't show same-named lifts either
- [ ] The same swipes work on the lifts list on the review page; press-and-hold drag and a quick tap still work on those rows, and a swipe never flips the page
- [ ] Removed or added lifts carry into the exercise pages (progress bar segments match the list) and the finished log

## Comments (needs supabase/comments.sql run first)
- [ ] Under each crew post there is a Comment button; tapping it opens the thread, typing and Send adds a comment with your first name
- [ ] A second account (not in the crew) CANNOT see or comment on a crew-only post
- [ ] A second account CAN see and comment on a post you made public, from your profile
- [ ] You can delete your own comment; as the post owner you can delete anyone's comment on your post; you cannot delete others' comments on other people's posts
- [ ] Report on someone else's comment shows a thank-you; the row appears in the comment_reports table in Supabase
- [ ] Signed out, open your public /u/ page: comments on public posts are readable, with a link to log in or join
- [ ] The comment count updates on the post, and a comment from another phone appears within about 15 seconds
- [ ] Typing 31 comments within an hour is stopped with a friendly message

## Likes (needs supabase/comment-likes.sql run first)
- [ ] Under a crew post with likes, the number reads N likes; tapping it lists who liked it (names and pictures)
- [ ] Tapping the heart still likes and unlikes the post
- [ ] Every comment has a heart; tapping it likes (orange) and unlikes, and the count updates straight away
- [ ] Tapping a comment's count lists who liked that comment
- [ ] A second account (not in the crew) can like a comment on a public post but cannot see or like comments on a crew-only post
- [ ] A person who left the crew shows as Former member in the post likes list

## Notifications (needs supabase/notifications.sql run first)
- [ ] A bell sits next to the profile button in the header; it shows a number when something is new
- [ ] Another account commenting on your post, liking it, or following you adds a notification (within about 30 seconds, or when you reopen the app)
- [ ] Your own likes, comments and follows never notify you
- [ ] Liking, unliking and liking again only notifies once
- [ ] Opening Notifications shows the new ones highlighted with a dot, then clears the number on the bell
- [ ] Tapping a follow opens that person's profile; tapping a comment or like opens your profile
- [ ] With no notifications the page says nothing yet, with no errors

## 4. Fuel (nutrition)
- [ ] Build a meal and calculate portions
- [ ] Save a meal; it appears in the plan
- [ ] Daily totals and the Fuel goal update
- [ ] AI export gives a usable text/file
- [ ] Export page (Progress > Export): pick a time period and tick or untick sections, and the Preview summary text changes to match
- [ ] Copy summary shows "Summary copied."; turning on Coaching questions adds the coaching prompt before the summary and the message says so; Download text saves the same text
- [ ] Download files: Workout sets (CSV) and App data (JSON) both download; the note says they cover all dates, not just the chosen period
- [ ] "Before sharing" says the JSON can include your profile photo, saved area and notes, and it is right (check the file); the page fits a small phone with no sideways scroll
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
- [ ] Nutrition has two tabs, Today's meals and My foods; the calorie and macro bars stay at the top on both
- [ ] My foods > Import from ChatGPT shows a prompt; pasting a CSV or a markdown table previews a table (food, serving, kcal, P, C, F) and Add N foods saves them
- [ ] Each My foods row has Add: it logs one serving to the meal picked in Add to; tapping again adds another serving to the same meal row (no duplicate rows); the bars at the top update
- [ ] My foods search, remove (asks Remove?), and Add one food yourself all work; saved foods also appear in Add food under My foods
- [ ] The My foods table fits at phone width with the Add button fully visible
- [ ] Each meal card shows protein, carbs and fat in both the Target line and the Logged total (not just calories and protein)

## 5. Progress and photos
- [ ] Weight, steps and cardio can be logged
- [ ] Charts and personal records update
- [ ] Add a progress photo; it uploads; tap to open the lightbox; delete it
- [ ] Import history (CSV/AI text) previews before saving
- [ ] A 7D / 30D / 90D / 6M / 1Y / All selector at the top of Progress changes the summary, weekly chart, strength and weight trends, workout history and cardio list together
- [ ] Longer ranges show About N workouts a week; the weekly chart gets more bars; history and cardio have Show more
- [ ] The chosen range is remembered the next time you open Progress
- [ ] A range with nothing in it says so and suggests a longer range
- [ ] Import > Body weight shows a ChatGPT prompt for daily weigh-ins; pasting a date,weight CSV previews a graph with the 7-day average, counts, range and any skipped lines
- [ ] Importing adds the weigh-ins and keeps your own number on days you had already logged; the result links to Progress
- [ ] Progress body weight is a line graph with daily readings and a 7-day average line; the change line says (7-day averages) with lots of data
- [ ] Share on the body weight (and strength) graph opens Share your progress: a transparent graph sticker you can copy into Instagram, or lay over your own photo (drag, pinch, size slider, white or dark text) and share
- [ ] Sharing the body weight graph: Hide my weight is on by default and the sticker shows only the line, the change (like -12.5 lb) and the dates; turning it off adds the starting and current weight; the choice is remembered

## 6. Crews
- [ ] Join and leave a crew
- [ ] Start a new crew with a category and place
- [ ] Post text and photos; like; delete own post
- [ ] Question of the day: one per day, hides after answering, returns if the answer is deleted
- [ ] Crew check-in and chat work
- [ ] Report a crew
- [ ] The crew page has the Share something with your crew... box right under the Feed / Challenges / Friends tabs, styled like an input; posting there shows the post in the feed below and the box clears
- [ ] Share workout (crew page) opens the share screen: Card, or My photo + sticker (add a photo, drag and resize the sticker); Post to crew posts the picture with the workout line
- [ ] After posting, the Share workout button stays pressable; inside, Post to crew is grayed out (Posted to your crew today) while Copy sticker and Share to Instagram still work; a message confirms the post
- [ ] Deleting that workout post makes Post to crew available again
- [ ] Post photos sit side by side like Strava: 1 photo fills the post, 2 share it, 3 fit across, 4 or more scroll sideways with the next one peeking; tapping a photo opens it full screen

- [ ] (Run supabase/crew-videos.sql first) The crew composer has Add video next to Add photos; pick a short clip from the iPhone library and from Android: a cover frame with the length shows, with an x to remove it
- [ ] Post the clip: scroll the feed to it and it starts by itself, without sound, and loops; the clip doesn't download before you reach it
- [ ] Scroll past it and it pauses; scroll back and it resumes; with two clips on screen only one plays at a time
- [ ] Tap the playing clip: sound comes on, the controls appear (pause, scrub, full screen) and it keeps playing; a "Tap for sound" pill shows before that
- [ ] iPhone Low Power Mode (or Settings > Accessibility > Motion > Reduce Motion): clips don't autoplay and show a play button instead; tapping it plays with sound
- [ ] A clip longer than 30 seconds, a file over 45 MB and a non-video each show a clear message and nothing is posted
- [ ] A video and photos can't be mixed in one post (Add photos / Add video grey out once the other is chosen)
- [ ] Another crew member sees and plays the video; someone outside the crew can't; likes and comments work on it
- [ ] Deleting a video post removes it for everyone and the file is gone from Supabase Storage (crew-photos); a failed post leaves nothing behind in Storage
- [ ] iPhone clips (HEVC) play for you and for a friend on a different phone or computer; note any that don't
- [ ] A friend's public profile shows "Shared a video with the crew" (never the video itself)
- [ ] While a clip uploads the Post button shows a live percentage ("Uploading video 67% of 24 MB") and finishes without freezing, on Wi-Fi and on mobile data
- [ ] A clip the phone can't preview still posts: the feed shows a plain tile with a play button and no length (note which clips these are)
- [ ] If an upload is refused you get a plain sentence with the reason in brackets (too big for storage / videos not switched on: run crew-videos.sql / not in the crew), the video stays picked, and nothing half-posted is left in Storage

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
- [ ] A magnifier icon sits next to the bell in the header and opens search with the keyboard ready
- [ ] Typing a friend's name or @handle finds them: people you follow or who follow you (even with discovery off), crew mates, and anyone discoverable; tapping opens their profile
- [ ] Search also finds pages and actions (e.g. weight, macros, settings), crews, challenges, foods (including My foods), exercises (tap for a photo and steps) and your past workouts; each group shows 5 with Show all
- [ ] A search with no matches says so; Clear and the back arrow work; search links like #/search?q=crew prefill the box

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
