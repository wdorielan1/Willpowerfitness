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
- [ ] The home sign up page (Google and email) has no date of birth and no age wording. Right after Join free (or Google) a short second page shows only "Date of birth" with one line under it, "You must be 13 or older. We use this once to check your age and don't keep it.", plus Continue, Log out, Terms and Privacy. No heading, and the age wording shows only once
- [ ] Continue with a blank date asks for it. 13 or older (try a birthday today, 13 years ago) goes on to onboarding and never asks again
- [ ] A date that makes you under 13 (try a birthday tomorrow, 13 years ago): "Will Power is for people 13 and older, so we can't let you use it." Only Log out is left, and reloading still shows it. After logging out, the sign up page on that phone says it can't create an account for a day, and "I already have an account" goes to Log in
- [ ] Same second page after real Google sign in (you land on it after Google sends you back). If you sign up by email and have to confirm by email, you see it after you confirm and log in
- [ ] An account that was never checked (everyone who signed up before this): the next open shows the same second page before anything else; Terms and Privacy open from it; once passed it never comes back
- [ ] (Only after the Google Cloud steps in docs/TODO.md are done and VITE_GOOGLE_BIRTHDAY=1 is set in Amplify.) Sign in with Google using an account that has a birthday with a year: Google's permission screen lists the birthday, and after allowing it you skip the age page and land in onboarding. Nothing about the birthday is saved (check Export my data)
- [ ] (Same setup.) Google account with no birthday or no year, or untick the birthday permission on Google's screen: you get the normal age page. Sign in with email: the normal age page
- [ ] (Same setup.) Normal Google sign in still works for an existing member and shows their name and photo; while VITE_GOOGLE_BIRTHDAY is empty Google asks for no birthday permission at all
- [ ] After the check, look in your account data (Settings > Export my data JSON): it has an ageConfirmed day and no date of birth anywhere

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
- [ ] Today page greeting (top of the page, above This week): "Good morning, <first name>" 5:00 to 11:59, "Good afternoon, ..." 12:00 to 16:59, "Good evening, ..." 17:00 to 21:59, and "Late night workout, <first name>?" 22:00 to 4:59 (try by changing the phone's clock, or just check the one that matches now)
- [ ] Late night after you finished a workout today it says "Nice work, <name>"; late night on a rest day it says "Good night, <name>"; it uses only your first name, capitalised; an account whose name is an email handle with digits gets the greeting with no name and no comma
- [ ] Leave the Today page open across 5:00, 12:00, 17:00 or 22:00: the greeting changes by itself within a minute
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
- [ ] Equipment (Settings > Training > Equipment you use): eight kinds, each Often / Sometimes / Never. A full-gym account starts with barbells, dumbbells, machines and cables on Often, bodyweight and EZ bar on Sometimes, kettlebells and bands on Never, and a line says kettlebells and bands start off
- [ ] Set machines to Never: no machine lifts show in the plan preview, Swap, Add or Search; the equipment filter chips no longer list Machines. Back to recommended brings them back
- [ ] Switch the setup to Dumbbells only: barbells, machines, cables and EZ bar grey out with a note; switch back to Full gym and they work again
- [ ] Set everything to Never: the screen warns there would be no exercises, and the Train preview says to turn more equipment on in Settings
- [ ] Sometimes equipment (bodyweight, EZ bar) shows up about one lift in five: roughly one such accessory in a normal workout, never a whole workout of push-ups. Kettlebell and band moves never show up for a full-gym account until you switch them on
- [ ] The first time you tap Start lifting on a planned workout, a "What do you use?" sheet appears (not at sign-up). Save and update my plan closes it, keeps you on the Train page with a note, and the preview now follows your picks; Skip for now starts the workout; closing it with Close does not start. It never appears again after that
- [ ] The sheet does not appear for saved or build-your-own workouts, and the Save and Skip buttons stay visible at the bottom without scrolling
- [ ] Swap: the list opens on the lift's own muscle, shows 6 best matches first (Best matches first) with a See more button, and nothing off-muscle or on Never equipment comes first. Search shows everything that matches, not just six
- [ ] Add an exercise (warm-up page, review page and the Train preview): opens on the session's own lifts ("Leg lifts" on a legs day, "Push lifts" on a push day) with the best 6 and See more; tapping All still shows the best first
- [ ] The equipment filter in Swap and Add is remembered the next time you open the list (and the chosen chip is visible, not scrolled out of sight)
- [ ] Swipe right to add twice on the same lift: each adds the next best same-muscle lift (not a random one), with no duplicates
- [ ] Export (Settings > Your data): the profile summary has an "Equipment use" line matching your choices
- [ ] Thumbs-down: every exercise page has a thumbs-down button next to the options button. It opens "Not for me?" with Not today and Never show me this, and closing it changes nothing
- [ ] Not today removes the lift for this workout only (with Undo); tomorrow's plan can still include it
- [ ] Never show me this removes it now, shows "Hidden ... You can bring it back in Settings" with Undo, and the other lifts in today's workout do not move or change. It no longer shows in Swap, Add or Search (also its same-name twin, e.g. Incline Dumbbell Press), and it is gone from planned workouts from tomorrow
- [ ] Settings > Training > Hidden exercises lists what you hid, Show again brings one back (it shows in Swap, Add, Search and plans again); "None yet." when empty
- [ ] Remove or swap away the same suggested lift on 3 different days: the next time you pick that kind of session on the Train page, one card asks "Stop suggesting ...?" ("You've skipped it on 3 different days"). Stop suggesting it hides it; Keep it closes the card and it never asks about that lift again. Nothing is hidden unless you tap
- [ ] Finish a planned workout (at least 2 lifts logged): under the recap the finish screen asks "Save this as your Push Day?" (name matches the day: Push Day, Pull Day, Leg Day, Shoulders + Abs Day, Full Body Day). Save it confirms "Saved as your ..."; Not now just closes the card. Nothing saves without a tap
- [ ] It saves only the lifts you logged, in the order you did them; the saved workout also shows as a session button on the Train page (and can be deleted there)
- [ ] Next time you pick that session on the Train page, a card asks "Use your saved Push Day?"; Use it shows exactly those lifts, Not now hides the card for that visit
- [ ] Finish a different workout of the same kind: it asks "Update your Push Day?" instead of making a second copy, and does not ask at all if it matches what is already saved. Not asked for Build your own or saved workouts, or for edits to an already-finished workout
- [ ] Don't ask again turns the save offer off; Settings > Workout > "Offer to save my workout when I finish" turns it back on
- [ ] Swap/Add order: lifts from a saved workout come first, lifts you finish often next, and lifts you keep removing sink. Settings and Privacy say plainly that Will Power quietly learns from what you do, on your own account only

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
- [ ] A video can go with photos: add photos and a video in either order; the composer shows one row with the video first and the photos after it; up to 5 photos with a video (a 6th shows "Choose up to 5 photos with a video"), up to 10 without one
- [ ] Post a video with 3 photos: the feed shows them side by side in one row like Strava (video first, then the photos; with 4 or more tiles it scrolls sideways), never one at a time; with 1 photo the two share the row, with 2 photos three fit across
- [ ] In that row the video square plays by itself, muted and looping, when you scroll to it; tapping it opens the clip full screen with sound and controls (close with the cross, tap outside or Escape) and the small one waits meanwhile; tapping a photo opens the photo viewer with only the photos
- [ ] With two or more video posts on screen only one plays, the one nearest the middle; scroll and the next one takes over; scroll the playing one away and the other starts
- [ ] A post with only a video still shows it full width; older video posts (made before this change) look the same as before
- [ ] An expired video with photos shows a dimmed "Expired" square and the photos stay; the last 7 days show "3d left" on the square
- [ ] Another crew member sees and plays the video; someone outside the crew can't; likes and comments work on it
- [ ] Deleting a video post removes it for everyone and the file is gone from Supabase Storage (crew-photos); a failed post leaves nothing behind in Storage
- [ ] iPhone clips (HEVC) play for you and for a friend on a different phone or computer; note any that don't
- [ ] A friend's public profile shows "Shared a video with the crew" (never the video itself)
- [ ] Picking a video shows "Videos are kept for 60 days, then deleted. The post and its cover photo stay."; the Privacy page mentions it
- [ ] (After deploying the expire-videos function and its daily Cron job) a video post with created_at set to 61 days ago, once the function has run, shows "Video expired" with its cover and text, no player, and the file is gone from Storage > crew-photos; a 59-day-old one is untouched and says "Video expires in 1 day"
- [ ] The Cron job's history shows a successful run each day, and the function's reply is `{"checked":N,"removed":N,"marked":N}` with no error; running it twice in a row removes nothing the second time
- [ ] An expired video post can still be liked, commented on and deleted
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

## Delete my account (needs the delete-account function deployed first; test with a throwaway account only)
- [ ] Settings, at the bottom of Account: a red "Delete my account" link under Log out
- [ ] The sheet lists what goes (profile, workouts, photos, crew posts, comments, likes, follows, notifications, challenges you created), says a crew you started that others are in passes to its longest-standing member, and offers Export your data and a note about Google's connected apps
- [ ] The red button stays off until you type DELETE (any capitals); Cancel closes everything and changes nothing
- [ ] Before the function is deployed: the sheet says "Account deletion isn't switched on yet." and nothing is deleted
- [ ] With a throwaway account that has a progress photo, a crew post with a photo and a comment: delete it. You are signed out and the next screen says "Your account has been deleted." once (OK dismisses it). In Supabase: the user is gone from Authentication > Users, their rows are gone (profiles, crew_posts, comments), and their files are gone from Storage (progress-photos and crew-photos). Logging in again says the email or password is incorrect, and signing up again with that email works
- [ ] Delete a throwaway account that started a crew with another member: the crew is still there and now belongs to the other member. Delete one that started a crew nobody else joined: the crew and its files are gone
- [ ] Other people's posts, comments and photos in a crew you were in are untouched, and your posts and comments disappear from their feeds
- [ ] Sign up as a throwaway with a date of birth under 13: the blocked screen has a Delete my account button and it works the same way; signing up on that phone is still blocked for the day
- [ ] If it fails (for example turn off the phone's connection and try): the sheet shows why and you stay signed in to try again

## Sign-up alert (owner runs supabase/signup-alert.sql first, with their own random ntfy topic)
- [ ] Step 1 of the file: the phone buzzes with "Test alert", and the query under it shows status_code 200
- [ ] If the phone does not buzz: the topic in the ntfy app is not spelled exactly like the one in the SQL (check for a stray space or capital)
- [ ] Step 2: runs without an error. `select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;` lists on_signup_notify
- [ ] Step 3: Authentication > Users > Add user > Create new user: the phone buzzes with "New signup #N (email)", then delete that test user
- [ ] A real sign-up on the app (email, and Google in a private window) still works and buzzes. The message has only the count and "(email)" or "(google)", never a name or email
- [ ] With the topic deliberately mistyped in the function, sign-up still works (the alert just fails quietly and "signup alert failed" appears in Logs > Postgres Logs)

## Forgot password and sign-in codes (needs the Magic Link email template pasted into Supabase first, see docs/EMAIL.md)
- [ ] Log in tab: a small "Forgot password? Email me a code" link under Log in. It is not on the Sign up tab
- [ ] Tap it: the Google button and the password form go away, and you see "Get a sign-in code" with your email. A bad address is refused. "Back to log in" returns to the normal form
- [ ] Enter your own email and tap Email me a code: the email arrives with "Your sign-in code" and a 6-digit code (check spam). The code screen says "If your email has an account, we've sent it a 6-digit code"
- [ ] "Send a new code" is greyed with a countdown (about a minute), then works. "Use a different email" goes back
- [ ] On an iPhone, tapping the code box offers the code from the email above the keyboard. Letters you type are ignored
- [ ] A wrong code says "That code is wrong or has expired" and you can try again. A code that is too short is refused
- [ ] The right code signs you in and shows "Choose a new password". Under 6 characters is refused. Save: you land in the app, then log out and log in with the new password to prove it
- [ ] Do it again and tap "Skip for now": you land in the app and the old password still works. The screen does not come back after a reload
- [ ] Type an email that has no account: the screen looks exactly the same as for a real one, and no code arrives
- [ ] Ask for codes too fast: it says to wait a minute, in plain words
- [ ] Works inside the installed home-screen app on iPhone (the whole reason for a code instead of a link): request the code in the app, read it in Mail, type it back in the app
- [ ] A Google-only account (no password ever set) can use a code too and then set a password
- [ ] A device-only account (no online backend, for example a local test build): the link does not show

## Invite follow-back (needs supabase/invites.sql run first; test with two accounts, Alice who invites and Bob who joins)
- [ ] Friends page: the Invite a friend card says "They'll follow you when they join the free beta, and you'll follow them back." plus "Every share makes a fresh link. The follow back goes to the first person who joins with it." (Before the SQL has run, it only says they'll follow you, and the link has no `inv=`)
- [ ] As Alice, tap Share invite (or Copy link) and send the link to Bob. The link has `inv=` and a long code. Tap Copy link again: it is a different code
- [ ] In a private window (or another phone), open Alice's link and sign up as Bob, finish setup. Bob follows Alice AND Alice follows Bob: Alice's Following and Followers both show Bob, and Bob's show Alice
- [ ] Alice gets a "started following you" notification from Bob, and Bob gets one from Alice
- [ ] Open the same link again and sign up as a third person, Carol: she follows Alice, but Alice does NOT follow her back (the code was used)
- [ ] A link from before this change (no `inv=`) still works: the new person follows the inviter, nothing else
- [ ] Making up a link by hand with Alice's id (`#/join?u=ALICE-ID`) and signing up does NOT make Alice follow the new person
- [ ] Alice can unfollow Bob later, and Bob can unfollow Alice; neither is forced to follow again
- [ ] Delete Bob's account: Alice's followers count drops by one and the code still cannot be used by anyone else
- [ ] Sharing from an iPhone: the share sheet opens straight away when you tap Share invite (no delay or error)

## Smarter workouts step 3: skip check-ins (Train page and the workout screen)
- [ ] Start a Legs (or any) workout. Swipe a lift left, or tap the thumbs-down then "Not today": the note says "Removed ..." with Undo and a small "Not your equipment? Tune it". Tap Tune it: the "What do you use?" screen opens, and Skip for now closes it with nothing changed
- [ ] Skip a second lift in the same workout. If both need a gym (barbell, machine, cable) you see "Skipping a few lifts?" and "Are you at the gym today?" with I'm at home, I'm at the gym, Keep going, and "Don't ask me this again"
- [ ] Tap "I'm at home": the rest of the lifts that need a gym (and that you haven't started) become dumbbell or bodyweight lifts, the note says how many, and a lift you already logged a set on is NOT changed. Tap Undo: it goes back. Swap and Add on that day offer only dumbbell and bodyweight lifts
- [ ] Skip two lifts of the same kind (for example two dumbbell lifts, or two bodyweight lifts): "Want fewer dumbbells?" with "Fewer" and "Never use dumbbells". Never: the rest of today's lifts of that kind are swapped, lifts you already did stay, and after a reload today's list is exactly the same. The next day's plan follows the new choice
- [ ] Skip two lifts with no pattern: "Is your equipment set up right?" with Tune my equipment
- [ ] After the question has shown once, a third skip, or a reload, does not ask again that day
- [ ] Settings > Workout has "Check in when I skip lifts or workouts". Off: no Tune it link and no question. "Don't ask me this again" in the sheet turns it off there too
- [ ] Miss two scheduled workouts in a row (or skip them on purpose in the week card), then open Train: a card "What's in the way?" sits above the session buttons and says "You've missed your last two workouts" (or "...Legs twice")
- [ ] "I don't like the lifts": pick two, tap Stop suggesting 2. They disappear from today's list, and they appear in Settings > Training under Hidden exercises with Show again
- [ ] "Wrong equipment": the equipment screen opens; changing something and saving updates today's list. "No time": Shorter session turns on. "Tired or hurt": Cardio / recovery is picked with a Log cardio button
- [ ] "Not now" quiets it for a week; "Don't ask again" turns it off. A brand-new account, or someone who is training again (latest session done), is never asked
- [ ] On a Shoulders + Abs day with Legs as a focus area (so a leg lift is in the plan): swipe right on the leg lift. You get a shoulders or abs lift, not more leg work. Swipe right on a shoulders lift: you still get another shoulders lift

## Crew shared workout card
- [ ] Finish a workout with "Share finished workouts to my crew" on (Settings > Workout). Open Home and scroll to the feed: your post is a card with a thin orange edge, a chip like PUSH or LEGS, the session as the headline ("Push Day") with the time beside it, three numbers in one strip, and your top three lifts with the weight and reps
- [ ] Set a personal record: the card has an orange NEW PR bar with the lift and weight. With two or more PRs it says "+1 more"
- [ ] A streak of 2 or more days shows a streak pill. On the newest workout posted today, an online crew also shows "3 of 5 crew done today"
- [ ] Older workout posts (from before this change) show the same card without the lift list
- [ ] Like, comment and Delete still work on the card, and a normal text post looks the same as before
- [ ] Settings > Workout > "Show my weights in crew posts": turn it off, finish another workout. The post shows the session, time, exercises, sets and streak, but no lifts, no total weight, and a PR is only the lift's name
- [ ] The manual "share with a picture" from the finish screen still posts, and the card shows above the picture
- [ ] Looks right at 360 and 390 px wide, and the lift names don't squash the weights

## Smarter workouts step 4: Gym or Home, lifts per workout, focus labels
- [ ] Train page: a "Today I'm at  Gym | Home" switch under the heading (not shown if your setup is dumbbells only or bodyweight). It starts on Gym
- [ ] Tap Home: the planned lifts change to dumbbell and bodyweight lifts only (no machines, cables or barbells), and a line says so. Tap Gym: the usual plan is back
- [ ] Leave the app and come back, and the next day: it is still on whatever you picked last
- [ ] Start a Home workout, then open `#/go/gym` (or an Apple Shortcut): your workout's lifts do NOT change, and tomorrow's plan uses Gym
- [ ] Skip two gym lifts after tapping Gym or Home today: the question goes straight to equipment ("Want fewer...?" or "Is your equipment set up right?") and does not ask "Are you at the gym today?". Without choosing anything today it still asks
- [ ] Siri & Shortcuts page: entries for "Arrive at the gym" (says it also sets Gym), "Arrive at home" and "I'm at the gym", each with its link to copy
- [ ] On an iPhone with the Arrive-at-the-gym automation: arriving sets Gym and starts your workout (note whether it opens Safari or the installed app, and whether you are still signed in there)
- [ ] Settings > Training > Lifts per workout: choose 7. Your next workout preview has exactly 7 lifts, including any body-part extra. "Back to usual" returns to your level's number (4, 5 or 6)
- [ ] With Legs chosen as a body part to focus on, open a Shoulders + Abs day: the extra leg lift says "Extra leg work added because Legs is your focus." in the preview and on its page. Swap it and the note goes
- [ ] Brand-new account that trains every day: no "What's in the way?" card on the Train page

## Posting to the crew you choose (question of the day, posts, workouts)
Needs at least 2 crews (join up to 3 on the Crew tab). With one crew there is no chooser anywhere.
- [ ] Join a second, then a third crew. The Crew page (and nowhere else) shows ONE "Question of the day" card whichever crew chip you tap, not one per crew
- [ ] The question card has "Post to" chips with the crew you are looking at ticked. You can tick more than one, but you cannot untick the last one. Answer it: the answer shows in the crews you ticked and not in the others, and the card goes away
- [ ] The share box on Home has the same "Post to" chips (starts on your main crew). Post a text, or a photo, to two crews: it appears in both feeds, and a line says "Posted to ..."
- [ ] If one crew refuses (for example you were removed), your text stays in the box, the message names the crew that missed out, and the chips are set to just that crew. Post again: it only goes there
- [ ] Share workout (share box on Home): pick any finished workout from the list, today's or an earlier one. In the share sheet, "Post to" chips sit right under the numbers; choose crews, optionally add your photo, tap Post to {crew} / Post to 2 crews
- [ ] The shared card shows "From Mon, Oct 12" when you shared an earlier day. Open Share workout again: that workout says "2 of 3" and the crews that have it are ticked and locked, the others are free
- [ ] Delete one of those posts: that crew can be picked again for that workout
- [ ] Progress > Workout history: each finished workout has a share button next to the bin. Tap it: the same share sheet for that day
- [ ] Home or Train, tap a finished day on the week: "Share this workout" opens the same sheet, with the crew chooser and Share to Instagram
- [ ] Settings > Workout > Share finished workouts to my crew: with 2+ crews a "Share to" chooser appears (your main crew picked by default). Pick two, finish a workout: it posts to both, and the finish screen says "Shared to A and B"
- [ ] Leave one of the chosen crews: finishing a workout still goes to the others (or your main crew if none are left)

## Home: hold and drag a workout to another day
- [ ] Home "This week" strip: a hint says "Hold a workout and drag it to another day to move it." (only when something can move)
- [ ] Press and hold Monday's Push for about half a second: it lifts (a little buzz on phones that have one), the other open days get a dashed outline. Drag it onto Wednesday: Wednesday lights up. Let go: Monday and Wednesday have swapped (Monday is Wed's workout, Wednesday is Push). A line says what happened, with Undo
- [ ] Undo puts both days back. The line goes away by itself after a few seconds
- [ ] Drop it on a rest day (Saturday): Push is on Saturday and Monday becomes a rest day
- [ ] Let go over nothing, or back on the same day: nothing changes. A quick swipe over the strip (no hold) scrolls the page and does not lift a day. A normal tap still opens the day
- [ ] Today's session card, the Train page and the Carb calendar all show the moved workouts. The days after carry on as planned (if Thursday was Shoulders it still is)
- [ ] Finish the moved workouts: the rotation continues from where it was (no repeat, no skipped day) and no "What's in the way?" card appears
- [ ] Days you already did (or skipped) cannot be picked up or dropped on. Today cannot move once you have started the workout
- [ ] Tap a day with an unfinished workout: "Move this workout" with a button per day. Tap one: same swap (no dragging needed)
- [ ] Works on an iPhone with a finger, and with a mouse on a computer

## Nutrition: weekly carb calendar
- [ ] Nutrition > Carb calendar opens on "Week" with a Week | Month switch. The week shows 7 rows: day, workout (or Rest day) and Low/Medium/High carb. Today has an orange outline
- [ ] The arrows move a week at a time, "Back to this week" shows when you are away, and it stops about 90 days ahead like the month view
- [ ] Tap a day: its sheet opens. Edit days: pick days (or a date range) in the week list and Apply works; a day you set yourself shows the ring marker
- [ ] Month: the old grid is back. Reload: it remembers the last choice. Switching back to Week lands on this week

## Sign-up: bring your history from ChatGPT or Claude (also Settings > Import history, Body weight, My foods)
- [ ] Sign-up step "Bring your lifting history": a short intro that ends "No AI? Just tap Next.", one card "Do you track your workouts with AI?" with two buttons, Copy and open ChatGPT and Copy and open Claude, and one empty box "Paste the answer here". No wall of prompt text
- [ ] Tap Copy and open ChatGPT: ChatGPT opens in a new tab (try on an iPhone, in Safari and in the installed app) and the card says "Copied. Paste it into the chat..." Paste into the chat: the instructions are there
- [ ] Same with Claude
- [ ] "Show the prompt" reveals the full prompt; "Hide the prompt" hides it; "Copy only (for another AI)" copies it without opening anything
- [ ] If copying is blocked by the browser: the card says it couldn't copy and the prompt is shown to copy by hand
- [ ] Paste a CSV from ChatGPT or Claude into the box: a preview appears (sets, workout days, matched exercises) and the button imports it. Lines with kg: More options > Weights in kg
- [ ] Tapping Next with nothing pasted skips the step without any error
- [ ] Same one-tap button in Settings > Import history (Lifts, Body weight) and Nutrition > My foods > Import

## Crew posts: when it was done, where, and the body-part emoji
- [ ] Every post in the Home feed has a line under the name that says when: a workout says "Finished today at 7:30 AM" (the time it was FINISHED, not when it was posted), other posts say "Today at 8:14 AM", "Yesterday at 6:02 PM", or a full date with the year ("Mon, Oct 12, 2026 at 8:00 AM"). No more "1h"
- [ ] Share an older workout to the crew: the post says "Finished Mon, Oct 12, 2026 at 8:00 AM" (the day it was done) even though you posted it today
- [ ] Settings > Workout > "Where I train (optional)": type a gym or town. Finish a workout with auto-share on: your post's line ends with "· your gym". Clear the box: no place
- [ ] Share a workout with the picture sheet: Place (optional) on, with a name: that post shows the name. Place off: no name. A gym you typed in a share sheet earlier is NOT put on the automatic posts
- [ ] The date, time and place are NOT drawn on the shared picture or card; they only sit above the post. Plain posts (text, photo, question of the day) show the time only, no place
- [ ] Posts from before this change still show a time (when they were posted)
- [ ] Workout cards have a small emoji beside the title: 💪 for Push and Chest + Triceps, 🧗 for Pull and Back + Biceps, 🦵 for Leg Day, 🔥 for Shoulders + Abs, 🏋️ for Full Body and custom workouts. Nothing shows for a session name the app does not know. Looks right at 360 and 390 px wide (placeholders; Codex may change them)
- [ ] The Share a workout list shows the same emoji, and its dates say the year

## Home, Train and Crew after the restructure
- [ ] Home, top to bottom: greeting, This week strip (hold and drag still works), the Nutrition widget, the share box (three crew chips, Add photos, Add video, Share workout), then the feed. No "Your next workout" card and no crew card on Home
- [ ] The Nutrition widget has a small x. Tap it: it goes, with "Nutrition is hidden from Home" and Undo. It stays hidden after a reload; Settings > Home > "Show nutrition on Home" brings it back
- [ ] The feed shows posts from all your crews (with the crew's name under the poster when you are in 2 or more) and the public posts of people you follow ("Following"). A person's posts only reach followers if their profile is public
- [ ] Post one workout or question to two crews: the feed shows ONE card marked with both crews, not two
- [ ] With no crew yet: no share box; the feed says "Your feed starts with a crew" with a Find a crew button
- [ ] A post from someone you follow (not in your crews) shows comments but no heart (likes are crew-only for now)
- [ ] Train: the big "Your next workout" and the session card are at the top, then This week, then the list of workouts. Start workout, Resume, Change workout (scrolls to the list), Share this workout and Undo completion all work from there. On a finished workout, "Undo completion" is under the warm-up/the last page
- [ ] Train, saved workouts: with none saved there is no extra line or heading. With some saved there is a line and "Your saved workouts" under the usual workouts and Build your own, with the saved ones in it. The same in "Change today's workout"
- [ ] Crew page: no share box and no feed. Question of the day, leaderboard, goals and "Training today" (check-in per crew) are still there. Switching crews changes the check-in
- [ ] Crew page tabs: only "Free Challenges" and "Will Power Fantasy Fitness" (green). Tap the green one: a popup "Welcome to Will Power Fantasy Fitness" with "Think fantasy football meets fitness.", the points/join/create/public/solo/crew lines and "Test your Will Power. Earn some points for being fit." Its button opens the free challenges. Nothing in it costs or pays money
- [ ] Friends: the account bubble (top right) has Friends; it opens the Friends page with a Profile link back. The Profile page has a Friends card (followers and following). The bottom Crew tab is NOT lit on the Friends page

## Feed posts as pictures, captions, and the feed switch
- [ ] A workout post with a picture is JUST the picture in the feed: no title, numbers, lifts or colored chip above it. Under the picture there is a like button, then the poster's caption (their name first) if they wrote one
- [ ] The picture is never cropped: a 4:5 card shows whole, a tall story card shows whole (capped to the screen height), a wide photo shows whole. No dark bars beside it
- [ ] Share a workout: the share sheet has a "Caption (optional)" box above the picture options. Write one, post a card: the caption shows under the picture. Leave it empty: no caption line
- [ ] Finish a workout with auto-share on: the post that goes to the crew is a card picture (the style you last chose in Workout cards: Scorecard, Training Receipt or PR Poster). Settings > Show my weights OFF: that post is the plain text card instead, with no weights
- [ ] The post's small line still says "Finished today at ..." with a little emoji in front (picture posts only), and the gym/town if set
- [ ] A photo post with words: the picture comes first and the words are under it. A text-only post is just its words
- [ ] Home feed switch (needs an account online): All, My crews, Following. Following shows posts from people you follow (their public posts, and posts in crews you share). My crews shows only your crews. Your choice is remembered. On a local-mode device there is no switch
- [ ] Following with nobody followed: "Nobody to show yet" with a Find friends button

## Likes and comments popup (needs an account online)
- [ ] Under each post in the feed: a heart and a comment bubble side by side, each with its count. No comment section under the post
- [ ] Tap the heart: it likes or unlikes (the heart fills). Tap the number next to it: a popup "Likes and comments" opens on Likes, listing who liked it
- [ ] Tap the comment bubble (or its number): the same popup opens on Comments, listing each comment with who wrote it and when, a heart on each, and Delete (your own, or any on your post) and Report (others')
- [ ] In the popup, switch between Likes and Comments with the two buttons; each shows its count
- [ ] Write a comment and Send: it appears in the list, the Comments count goes up, and after Close the number under the post is right
- [ ] Tap the heart on a comment, then its count: a second popup lists who liked that comment, on top of the first
- [ ] A post from someone you follow in a crew you are not in has the comment bubble but no heart
- [ ] Profile pages still show the old "Comment" button that opens comments inline (unchanged)
- [ ] A post with comments has a small preview under the caption: the latest two comments (first name in bold, then what they said, long ones cut at two lines), newest last
- [ ] With more than two comments, "View all 5 comments" sits above them; with one or two there is no such link, just the comments
- [ ] Tap the link or either comment: the popup opens on Comments. Post a new comment, Close: the preview now shows it
- [ ] A post with no comments shows no preview, and nothing extra shows when you are not signed in

## Home: suggested athletes and invite friends (right above the feed)
- [ ] Under the share box and above the feed there is a row: "Suggested athletes" (with "Find more"), a scrolling row of cards, and an "Invite friends" card at the end
- [ ] People who already follow you come first, marked "Follows you" with a "Follow back" button; then people in your crews you do not follow, marked "In your crew" with their streak and a "Follow" button
- [ ] Tap Follow: the card turns to "Following" and the person is in your Following list on the Friends page. Tap a card's name or photo: their profile opens
- [ ] Invite friends > Invite: on a phone the share sheet opens with your link; on a computer the link is copied and it says "Invite link copied". The link has your handle, your crew and a code, and when a friend joins with it you follow each other (same as the Friends page)
- [ ] With nobody to suggest (or no account online) the heading is just "Invite friends" and there is only the Invite card
- [ ] Friends page: Share invite and Copy link still work exactly as before

## 10. General
- [ ] Installs as a home-screen app (PWA) and opens full screen
- [ ] Works offline for already-loaded screens without crashing
- [ ] Landing, Privacy and Terms pages load; brand reads "Will Power"
- [ ] No console errors on the main screens
- [ ] Nothing shows fake users, fake counts or fake activity

## Save card goes to your photos (real phones only)
- [ ] iPhone: after finishing a workout, the card button says "Save to photos". Tap it: the share sheet opens with just the picture. Tap Save Image, then open the Photos app: the card is there as a picture, not in Files
- [ ] Android: same button. The share sheet opens with the picture; choose Photos or Gallery. The card shows in the gallery, not only in Downloads
- [ ] If the phone's browser can't share a file, the card appears big with "Press and hold the picture, then choose Add to Photos" (iPhone) or "Download image" (Android). Do that and check it lands in Photos. Done closes it
- [ ] Cancelling the share sheet shows no error
- [ ] On a computer the button still says "Save card" and downloads a PNG
- [ ] "Share card" is unchanged (Instagram and the rest of the share sheet)

## More photos and a video when sharing a workout, and bigger pictures in the feed
- [ ] Share a workout (Home, Share workout): under the caption is "More for your post (optional)" with Add photos and Add video
- [ ] Add two photos: small previews show, each with an X. Remove one. Add a video up to 30 seconds: a preview with its length shows
- [ ] With a video you can add 4 photos in all (the workout card is the fifth picture). Going over says how many more you can add
- [ ] Post it: the post has the workout card, your photos and the video, with your caption. Nothing added still posts just the card
- [ ] A post with more than one picture or video rolls sideways like Strava: the first is big (about 86% of the width) and the edge of the next peeks in, so you can roll through freely without swiping each one all the way. Dots under it show where you are
- [ ] In the share sheet, once you add a photo or video, a row of tiles shows the order of the post with a "Workout card" tile 🔒 first. It says the card is locked to the front
- [ ] Tap Unlock: the card tile gets ‹ › arrows. Slide it later; the order in the sheet changes and so does the post. Lock to front puts it back first
- [ ] Posted with the card locked: the card is the first panel in the feed, then the video, then your photos. Posted unlocked and slid back: it follows your order
- [ ] With nothing added (just the card) there is no lock row
- [ ] In a post with 2 or more pictures every photo fills its panel edge to edge with no bars above, below or beside it (a wide or tall photo is trimmed to the panel shape). Tap a photo to see all of it
- [ ] A single photo still fills the post and shows whole
- [ ] A single video fills the post at its own shape (tall for a phone video held upright, wide for sideways) with no black bars at the sides
- [ ] The video starts by itself without sound as you scroll to it, and tapping it opens it with sound

## Explore: the public feed (needs an account online; run supabase/public-feed.sql first)
- [ ] Owner step: run `supabase/public-feed.sql` in the Supabase SQL editor, then Reload schema. Without it, posts show but other people's pictures and videos stay blank, and Report says "Reporting is not switched on yet."
- [ ] Home feed tabs are Explore, My crews, Following. Explore is the one open on first visit. If you had picked All before, it opens on Explore
- [ ] Explore shows the newest public posts from people on the app, not just your crews. No more than 2 posts from the same person
- [ ] Posts from people with a private profile never show in Explore, and neither do posts made before their profile was public
- [ ] Pictures and videos from strangers' public posts load (after the SQL step). Open a post's pictures and play a video
- [ ] No "Following" label on strangers' posts. Posts from your own crews still show the crew name when you are in more than one
- [ ] Every post that is not yours has a quiet Report button. Tap it, confirm "Report it": you see "Reported. Thank you, we will take a look." The report appears in the post_reports table in Supabase
- [ ] You can comment on a stranger's public post. There is no heart on it (hearts are for crew mates until that is added)
- [ ] My crews shows only your crews' posts. Following shows only the public posts of people you follow
- [ ] Turn your profile private in Settings, post, and check from a second account: your new post is not in Explore. Turn it back on, post: it is
- [ ] With nothing public yet Explore says "Nothing to explore yet."
- [ ] The Privacy page, the Public profile card in Settings and the line on your Profile all say posts show in Explore, including photos and videos

## Before real money (paid challenges)
- [ ] Lawyer signed off on the rules and blocked states
- [ ] Payment processor approved paid-entry contests
- [ ] Official rules and terms accepted before entry
- [ ] Payout review and anti-cheat checks in place
