// Exercise photos and how-to steps come from the free-exercise-db project (public domain / Unlicense):
// https://github.com/yuhonas/free-exercise-db
export interface Media { slug: string; name: string; steps: string[]; primary: string[]; secondary: string[]; n: number }

const MAP: Record<string, string> = {
 "bench": "barbell-bench-press---medium-grip",
 "incdb": "incline-dumbbell-press",
 "chestmach": "leverage-chest-press",
 "cablefly": "cable-crossover",
 "pushup": "pushups",
 "pushdown": "triceps-pushdown",
 "ohtri": "dumbbell-one-arm-triceps-extension",
 "dips": "bench-dips",
 "latraise": "side-lateral-raise",
 "latraise2": "side-lateral-raise",
 "row": "bent-over-barbell-row",
 "pulldown": "wide-grip-lat-pulldown",
 "dbrow": "one-arm-dumbbell-row",
 "fbdbrow": "one-arm-dumbbell-row",
 "cablerow": "seated-cable-rows",
 "csrow": "dumbbell-incline-row",
 "fbrow": "dumbbell-incline-row",
 "pullup": "pullups",
 "facepull": "face-pull",
 "dbcurl": "dumbbell-bicep-curl",
 "fbcurl": "dumbbell-bicep-curl",
 "hammer": "hammer-curls",
 "squat": "barbell-full-squat",
 "goblet": "goblet-squat",
 "rdl": "romanian-deadlift",
 "legpress": "leg-press",
 "lunge": "bodyweight-walking-lunge",
 "legcurl": "lying-leg-curls",
 "legext": "leg-extensions",
 "calf": "standing-calf-raises",
 "dbpress": "seated-dumbbell-press",
 "reardelt": "reverse-flyes",
 "shrug": "dumbbell-shrug",
 "cablecrunch": "cable-crunch",
 "legraise": "hanging-leg-raise",
 "plank": "plank",
 "deadlift": "barbell-deadlift",
 "fbdb": "kettlebell-thruster",
 "fbpress": "incline-dumbbell-press",
 "fblunge": "split-squats",
 "fbpush": "pushups"
}

const MEDIA: Record<string, Omit<Media, "slug">> = {
 "incline-dumbbell-press": {
  "name": "Incline Dumbbell Press",
  "steps": [
   "Lie back on an incline bench with a dumbbell in each hand atop your thighs. The palms of your hands will be facing each other.",
   "Then, using your thighs to help push the dumbbells up, lift the dumbbells one at a time so that you can hold them at shoulder width.",
   "Once you have the dumbbells raised to shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.",
   "Be sure to keep full control of the dumbbells at all times. Then breathe out and push the dumbbells up with your chest.",
   "Lock your arms at the top, hold for a second, and then start slowly lowering the weight. Tip Ideally, lowering the weights should take about twice as long as raising them.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the dumbbells back on your thighs and then on the floor. This is the safest manner to release the dumbbells."
  ],
  "primary": [
   "Chest"
  ],
  "secondary": [
   "Shoulders",
   "Triceps"
  ],
  "n": 2
 },
 "one-arm-dumbbell-row": {
  "name": "One-Arm Dumbbell Row",
  "steps": [
   "Choose a flat bench and place a dumbbell on each side of it.",
   "Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support.",
   "Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position.",
   "Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso stationary. Breathe out as you perform this step. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. Also, make sure that the force is performed with the back muscles and not the arms. Finally, the upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the dumbbell; therefore do not try to pull the dumbbell up using the forearms.",
   "Lower the resistance straight down to the starting position. Breathe in as you perform this step.",
   "Repeat the movement for the specified amount of repetitions.",
   "Switch sides and repeat again with the other arm."
  ],
  "primary": [
   "Middle back"
  ],
  "secondary": [
   "Biceps",
   "Lats",
   "Shoulders"
  ],
  "n": 2
 },
 "hanging-leg-raise": {
  "name": "Hanging Leg Raise",
  "steps": [
   "Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position.",
   "Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so.",
   "Go back slowly to the starting position as you breathe in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Abdominals"
  ],
  "secondary": [],
  "n": 2
 },
 "reverse-flyes": {
  "name": "Reverse Flyes",
  "steps": [
   "To begin, lie down on an incline bench with the chest and stomach pressing against the incline. Have the dumbbells in each hand with the palms facing each other (neutral grip).",
   "Extend the arms in front of you so that they are perpendicular to the angle of the bench. The legs should be stationary while applying pressure with the ball of your toes. This is the starting position.",
   "Maintaining the slight bend of the elbows, move the weights out and away from each other (to the side) in an arc motion while exhaling. Tip: Try to squeeze your shoulder blades together to get the best results from this exercise.",
   "The arms should be elevated until they are parallel to the floor.",
   "Feel the contraction and slowly lower the weights back down to the starting position while inhaling.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Shoulders"
  ],
  "secondary": [],
  "n": 2
 },
 "leg-press": {
  "name": "Leg Press",
  "steps": [
   "Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section).",
   "Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should make a perfect 90-degree angle. This will be your starting position.",
   "As you inhale, slowly lower the platform until your upper and lower legs make a 90-degree angle.",
   "Pushing mainly with the heels of your feet and using the quadriceps go back to the starting position as you exhale.",
   "Repeat for the recommended amount of repetitions and ensure to lock the safety pins properly once you are done. You do not want that platform falling on you fully loaded."
  ],
  "primary": [
   "Quadriceps"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Hamstrings"
  ],
  "n": 2
 },
 "goblet-squat": {
  "name": "Goblet Squat",
  "steps": [
   "Stand holding a light kettlebell by the horns close to your chest. This will be your starting position.",
   "Squat down between your legs until your hamstrings are on your calves. Keep your chest and head up and your back straight.",
   "At the bottom position, pause and use your elbows to push your knees out. Return to the starting position, and repeat for 10-20 repetitions."
  ],
  "primary": [
   "Quadriceps"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Hamstrings",
   "Shoulders"
  ],
  "n": 2
 },
 "bodyweight-walking-lunge": {
  "name": "Bodyweight Walking Lunge",
  "steps": [
   "Begin standing with your feet shoulder width apart and your hands on your hips.",
   "Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.",
   "Drive through the heel of your lead foot and extend both knees to raise yourself back up.",
   "Step forward with your rear foot, repeating the lunge on the opposite leg."
  ],
  "primary": [
   "Quadriceps"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Hamstrings"
  ],
  "n": 2
 },
 "dumbbell-shrug": {
  "name": "Dumbbell Shrug",
  "steps": [
   "Stand erect with a dumbbell on each hand (palms facing your torso), arms extended on the sides.",
   "Lift the dumbbells by elevating the shoulders as high as possible while you exhale. Hold the contraction at the top for a second. Tip: The arms should remain extended at all times. Refrain from using the biceps to help lift the dumbbells. Only the shoulders should be moving up and down.",
   "Lower the dumbbells back to the original position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Traps"
  ],
  "secondary": [],
  "n": 2
 },
 "dumbbell-one-arm-triceps-extension": {
  "name": "Dumbbell One-Arm Triceps Extension",
  "steps": [
   "Grab a dumbbell and either sit on a military press bench or a utility bench that has a back support on it as you place the dumbbells upright on top of your thighs or stand up straight.",
   "Clean the dumbbell up to bring it to shoulder height and then extend the arm over your head so that the whole arm is perpendicular to the floor and next to your head. The dumbbell should be on top of you. The other hand can be kept fully extended to the side, by the waist, supporting the upper arm that has the dumbbell or grabbing a fixed surface.",
   "Rotate the wrist so that the palm of your hand is facing forward and the pinkie is facing the ceiling. This will be your starting position.",
   "Slowly lower the dumbbell behind your head as you hold the upper arm stationary. Inhale as you perform this movement and pause when your triceps are fully stretched.",
   "Return to the starting position by flexing your triceps as you breathe out. Tip: It is imperative that only the forearm moves. The upper arm should remain at all times stationary next to your head.",
   "Repeat for the recommended amount of repetitions and switch arms."
  ],
  "primary": [
   "Triceps"
  ],
  "secondary": [],
  "n": 2
 },
 "romanian-deadlift": {
  "name": "Romanian Deadlift",
  "steps": [
   "Put a barbell in front of you on the ground and grab it using a pronated (palms facing down) grip that a little wider than shoulder width. Tip: Depending on the weight used, you may need wrist wraps to perform the exercise and also a raised platform in order to allow for better range of motion.",
   "Bend the knees slightly and keep the shins vertical, hips back and back straight. This will be your starting position.",
   "Keeping your back and arms completely straight at all times, use your hips to lift the bar as you exhale. Tip: The movement should not be fast but steady and under control.",
   "Once you are standing completely straight up, lower the bar by pushing the hips back, only slightly bending the knees, unlike when squatting. Tip: Take a deep breath at the start of the movement and keep your chest up. Hold your breath as you lower and exhale as you complete the movement.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Hamstrings"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Lower back"
  ],
  "n": 2
 },
 "bent-over-barbell-row": {
  "name": "Bent Over Barbell Row",
  "steps": [
   "Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position.",
   "Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze the back muscles and hold for a brief pause.",
   "Then inhale and slowly lower the barbell back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Middle back"
  ],
  "secondary": [
   "Biceps",
   "Lats",
   "Shoulders"
  ],
  "n": 2
 },
 "dumbbell-incline-row": {
  "name": "Dumbbell Incline Row",
  "steps": [
   "Using a neutral grip, lean into an incline bench.",
   "Take a dumbbell in each hand with a neutral grip, beginning with the arms straight. This will be your starting position.",
   "Retract the shoulder blades and flex the elbows to row the dumbbells to your side.",
   "Pause at the top of the motion, and then return to the starting position."
  ],
  "primary": [
   "Middle back"
  ],
  "secondary": [
   "Biceps",
   "Forearms",
   "Lats",
   "Shoulders"
  ],
  "n": 2
 },
 "lying-leg-curls": {
  "name": "Lying Leg Curls",
  "steps": [
   "Adjust the machine lever to fit your height and lie face down on the leg curl machine with the pad of the lever on the back of your legs (just a few inches under the calves). Tip: Preferably use a leg curl machine that is angled as opposed to flat since an angled position is more favorable for hamstrings recruitment.",
   "Keeping the torso flat on the bench, ensure your legs are fully stretched and grab the side handles of the machine. Position your toes straight (or you can also use any of the other two stances described on the foot positioning section). This will be your starting position.",
   "As you exhale, curl your legs up as far as possible without lifting the upper legs from the pad. Once you hit the fully contracted position, hold it for a second.",
   "As you inhale, bring the legs back to the initial position. Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Hamstrings"
  ],
  "secondary": [],
  "n": 2
 },
 "barbell-full-squat": {
  "name": "Barbell Full Squat",
  "steps": [
   "This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack just above shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.",
   "Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.",
   "Step away from the rack and position your legs using a shoulder-width medium stance with the toes slightly pointed out. Keep your head up at all times and maintain a straight back. This will be your starting position.",
   "Begin to slowly lower the bar by bending the knees and sitting back with your hips as you maintain a straight posture with the head up. Continue down until your hamstrings are on your calves. Inhale as you perform this portion of the movement.",
   "Begin to raise the bar as you exhale by pushing the floor with the heel or middle of your foot as you straighten the legs and extend the hips to go back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Quadriceps"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Hamstrings",
   "Lower back"
  ],
  "n": 2
 },
 "leverage-chest-press": {
  "name": "Leverage Chest Press",
  "steps": [
   "Load an appropriate weight onto the pins and adjust the seat for your height. The handles should be near the bottom or middle of the pectorals at the beginning of the motion.",
   "Your chest and head should be up and your shoulder blades retracted. This will be your starting position.",
   "Press the handles forward by extending through the elbow.",
   "After a brief pause at the top, return the weight just above the start position, keeping tension on the muscles by not returning the weight to the stops until the set is complete."
  ],
  "primary": [
   "Chest"
  ],
  "secondary": [
   "Shoulders",
   "Triceps"
  ],
  "n": 2
 },
 "triceps-pushdown": {
  "name": "Triceps Pushdown",
  "steps": [
   "Attach a straight or angled bar to a high pulley and grab with an overhand grip (palms facing down) at shoulder width.",
   "Standing upright with the torso straight and a very small inclination forward, bring the upper arms close to your body and perpendicular to the floor. The forearms should be pointing up towards the pulley as they hold the bar. This is your starting position.",
   "Using the triceps, bring the bar down until it touches the front of your thighs and the arms are fully extended perpendicular to the floor. The upper arms should always remain stationary next to your torso and only the forearms should move. Exhale as you perform this movement.",
   "After a second hold at the contracted position, bring the bar slowly up to the starting point. Breathe in as you perform this step.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Triceps"
  ],
  "secondary": [],
  "n": 2
 },
 "leg-extensions": {
  "name": "Leg Extensions",
  "steps": [
   "For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, either look for another machine or just make sure that when you start executing the exercise you stop going down once you hit the 90-degree angle.",
   "Using your quadriceps, extend your legs to the maximum as you exhale. Ensure that the rest of the body remains stationary on the seat. Pause a second on the contracted position.",
   "Slowly lower the weight back to the original position as you inhale, ensuring that you do not go past the 90-degree angle limit.",
   "Repeat for the recommended amount of times."
  ],
  "primary": [
   "Quadriceps"
  ],
  "secondary": [],
  "n": 2
 },
 "barbell-bench-press---medium-grip": {
  "name": "Barbell Bench Press - Medium Grip",
  "steps": [
   "Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position.",
   "From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest.",
   "After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top of the motion, hold for a second and then start coming down slowly again. Tip: Ideally, lowering the weight should take about twice as long as raising it.",
   "Repeat the movement for the prescribed amount of repetitions.",
   "When you are done, place the bar back in the rack."
  ],
  "primary": [
   "Chest"
  ],
  "secondary": [
   "Shoulders",
   "Triceps"
  ],
  "n": 2
 },
 "wide-grip-lat-pulldown": {
  "name": "Wide-Grip Lat Pulldown",
  "steps": [
   "Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar.",
   "Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
   "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
   "As you breathe out, bring the bar down until it touches your upper chest by drawing the shoulders and the upper arms down and back. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary and only the arms should move. The forearms should do no other work except for holding the bar; therefore do not try to pull down the bar using the forearms.",
   "After a second at the contracted position squeezing your shoulder blades together, slowly raise the bar back to the starting position when your arms are fully extended and the lats are fully stretched. Inhale during this portion of the movement.",
   "Repeat this motion for the prescribed amount of repetitions."
  ],
  "primary": [
   "Lats"
  ],
  "secondary": [
   "Biceps",
   "Middle back",
   "Shoulders"
  ],
  "n": 2
 },
 "kettlebell-thruster": {
  "name": "Kettlebell Thruster",
  "steps": [
   "Clean two kettlebells to your shoulders. Clean the kettlebells to your shoulders by extending through the legs and hips as you pull the kettlebells towards your shoulders. Rotate your wrists as you do so. This will be your starting position.",
   "Begin to squat by flexing your hips and knees, lowering your hips between your legs. Maintain an upright, straight back as you descend as low as you can.",
   "At the bottom, reverse direction and squat by extending your knees and hips, driving through your heels. As you do so, press both kettlebells overhead by extending your arms straight up, using the momentum from the squat to help drive the weights upward.",
   "As you begin the next repetition, return the weights to the shoulders."
  ],
  "primary": [
   "Shoulders"
  ],
  "secondary": [
   "Quadriceps",
   "Triceps"
  ],
  "n": 2
 },
 "split-squats": {
  "name": "Split Squats",
  "steps": [
   "Being in a standing position. Jump into a split leg position, with one leg forward and one leg back, flexing the knees and lowering your hips slightly as you do so.",
   "As you descend, immediately reverse direction, standing back up and jumping, reversing the position of your legs. Repeat 5-10 times on each leg."
  ],
  "primary": [
   "Hamstrings"
  ],
  "secondary": [
   "Calves",
   "Glutes",
   "Quadriceps"
  ],
  "n": 2
 },
 "bench-dips": {
  "name": "Bench Dips",
  "steps": [
   "For this exercise you will need to place a bench behind your back. With the bench perpendicular to your body, and while looking away from it, hold on to the bench on its edge with the hands fully extended, separated at shoulder width. The legs will be extended forward, bent at the waist and perpendicular to your torso. This will be your starting position.",
   "Slowly lower your body as you inhale by bending at the elbows until you lower yourself far enough to where there is an angle slightly smaller than 90 degrees between the upper arm and the forearm. Tip: Keep the elbows as close as possible throughout the movement. Forearms should always be pointing down.",
   "Using your triceps to bring your torso up again, lift yourself back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Triceps"
  ],
  "secondary": [
   "Chest",
   "Shoulders"
  ],
  "n": 2
 },
 "seated-cable-rows": {
  "name": "Seated Cable Rows",
  "steps": [
   "For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked.",
   "Lean over as you keep the natural alignment of your back and grab the V-bar handles.",
   "With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest should be sticking out. You should be feeling a nice stretch on your lats as you hold the bar in front of you. This is the starting position of the exercise.",
   "Keeping the torso stationary, pull the handles back towards your torso while keeping the arms close to it until you touch the abdominals. Breathe out as you perform that movement. At that point you should be squeezing your back muscles hard. Hold that contraction for a second and slowly go back to the original position while breathing in.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Middle back"
  ],
  "secondary": [
   "Biceps",
   "Lats",
   "Shoulders"
  ],
  "n": 2
 },
 "cable-crunch": {
  "name": "Cable Crunch",
  "steps": [
   "Kneel below a high pulley that contains a rope attachment.",
   "Grasp cable rope attachment and lower the rope until your hands are placed next to your face.",
   "Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position.",
   "With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second.",
   "Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs throughout the movement. Also, do not choose a weight so heavy that the lower back handles the brunt of the work.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Abdominals"
  ],
  "secondary": [],
  "n": 2
 },
 "dumbbell-bicep-curl": {
  "name": "Dumbbell Bicep Curl",
  "steps": [
   "Stand up straight with a dumbbell in each hand at arm's length. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward. This will be your starting position.",
   "Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a brief pause as you squeeze your biceps.",
   "Then, inhale and slowly begin to lower the dumbbells back to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Biceps"
  ],
  "secondary": [
   "Forearms"
  ],
  "n": 2
 },
 "seated-dumbbell-press": {
  "name": "Seated Dumbbell Press",
  "steps": [
   "Grab a couple of dumbbells and sit on a military press bench or a utility bench that has a back support on it as you place the dumbbells upright on top of your thighs.",
   "Clean the dumbbells up one at a time by using your thighs to bring the dumbbells up to shoulder height at each side.",
   "Rotate the wrists so that the palms of your hands are facing forward. This is your starting position.",
   "As you exhale, push the dumbbells up until they touch at the top.",
   "After a second pause, slowly come down back to the starting position as you inhale.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Shoulders"
  ],
  "secondary": [
   "Triceps"
  ],
  "n": 2
 },
 "cable-crossover": {
  "name": "Cable Crossover",
  "steps": [
   "To get yourself into the starting position, place the pulleys on a high position (above your head), select the resistance to be used and hold the pulleys in each hand.",
   "Step forward in front of an imaginary straight line between both pulleys while pulling your arms together in front of you. Your torso should have a small forward bend from the waist. This will be your starting position.",
   "With a slight bend on your elbows in order to prevent stress at the biceps tendon, extend your arms to the side (straight out at both sides) in a wide arc until you feel a stretch on your chest. Breathe in as you perform this portion of the movement. Tip: Keep in mind that throughout the movement, the arms and torso should remain stationary; the movement should only occur at the shoulder joint.",
   "Return your arms back to the starting position as you breathe out. Make sure to use the same arc of motion used to lower the weights.",
   "Hold for a second at the starting position and repeat the movement for the prescribed amount of repetitions."
  ],
  "primary": [
   "Chest"
  ],
  "secondary": [
   "Shoulders"
  ],
  "n": 2
 },
 "pullups": {
  "name": "Pullups",
  "steps": [
   "Grab the pull-up bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than your shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width.",
   "As you have both arms extended in front of you holding the bar at the chosen grip width, bring your torso back around 30 degrees or so while creating a curvature on your lower back and sticking your chest out. This is your starting position.",
   "Pull your torso up until the bar touches your upper chest by drawing the shoulders and the upper arms down and back. Exhale as you perform this portion of the movement. Tip: Concentrate on squeezing the back muscles once you reach the full contracted position. The upper torso should remain stationary as it moves through space and only the arms should move. The forearms should do no other work other than hold the bar.",
   "After a second on the contracted position, start to inhale and slowly lower your torso back to the starting position when your arms are fully extended and the lats are fully stretched.",
   "Repeat this motion for the prescribed amount of repetitions."
  ],
  "primary": [
   "Lats"
  ],
  "secondary": [
   "Biceps",
   "Middle back"
  ],
  "n": 2
 },
 "plank": {
  "name": "Plank",
  "steps": [
   "Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.",
   "Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised."
  ],
  "primary": [
   "Abdominals"
  ],
  "secondary": [],
  "n": 2
 },
 "pushups": {
  "name": "Pushups",
  "steps": [
   "Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length.",
   "Next, lower yourself downward until your chest almost touches the floor as you inhale.",
   "Now breathe out and press your upper body back up to the starting position while squeezing your chest.",
   "After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed."
  ],
  "primary": [
   "Chest"
  ],
  "secondary": [
   "Shoulders",
   "Triceps"
  ],
  "n": 2
 },
 "standing-calf-raises": {
  "name": "Standing Calf Raises",
  "steps": [
   "Adjust the padded lever of the calf raise machine to fit your height.",
   "Place your shoulders under the pads provided and position your toes facing forward (or using any of the two other positions described at the beginning of the chapter). The balls of your feet should be secured on top of the calf block with the heels extending off it. Push the lever up by extending your hips and knees until your torso is standing erect. The knees should be kept with a slight bend; never locked. Toes should be facing forward, outwards or inwards as described at the beginning of the chapter. This will be your starting position.",
   "Raise your heels as you breathe out by extending your ankles as high as possible and flexing your calf. Ensure that the knee is kept stationary at all times. There should be no bending at any time. Hold the contracted position by a second before you start to go back down.",
   "Go back slowly to the starting position as you breathe in by lowering your heels as you bend the ankles until calves are stretched.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Calves"
  ],
  "secondary": [],
  "n": 2
 },
 "side-lateral-raise": {
  "name": "Side Lateral Raise",
  "steps": [
   "Pick a couple of dumbbells and stand with a straight torso and the dumbbells by your side at arms length with the palms of the hand facing you. This will be your starting position.",
   "While maintaining the torso in a stationary position (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top.",
   "Lower the dumbbells back down slowly to the starting position as you inhale.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Shoulders"
  ],
  "secondary": [],
  "n": 2
 },
 "face-pull": {
  "name": "Face Pull",
  "steps": [
   "Facing a high pulley with a rope or dual handles attached, pull the weight directly towards your face, separating your hands as you do so. Keep your upper arms parallel to the ground."
  ],
  "primary": [
   "Shoulders"
  ],
  "secondary": [
   "Middle back"
  ],
  "n": 2
 },
 "barbell-deadlift": {
  "name": "Barbell Deadlift",
  "steps": [
   "Stand in front of a loaded barbell.",
   "While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps.",
   "While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how the soldiers in the military look when they are in standing in attention.",
   "Go back to the starting position by bending at the knees while simultaneously leaning the torso forward at the waist while keeping the back straight. When the weights on the bar touch the floor you are back at the starting position and ready to perform another repetition.",
   "Perform the amount of repetitions prescribed in the program."
  ],
  "primary": [
   "Lower back"
  ],
  "secondary": [
   "Calves",
   "Forearms",
   "Glutes",
   "Hamstrings",
   "Lats",
   "Middle back",
   "Quadriceps",
   "Traps"
  ],
  "n": 2
 },
 "hammer-curls": {
  "name": "Hammer Curls",
  "steps": [
   "Stand up with your torso upright and a dumbbell on each hand being held at arms length. The elbows should be close to the torso.",
   "The palms of the hands should be facing your torso. This will be your starting position.",
   "Now, while holding your upper arm stationary, exhale and curl the weight forward while contracting the biceps. Continue to raise the weight until the biceps are fully contracted and the dumbbell is at shoulder level. Hold the contracted position for a brief moment as you squeeze the biceps. Tip: Focus on keeping the elbow stationary and only moving your forearm.",
   "After the brief pause, inhale and slowly begin the lower the dumbbells back down to the starting position.",
   "Repeat for the recommended amount of repetitions."
  ],
  "primary": [
   "Biceps"
  ],
  "secondary": [],
  "n": 2
 }
}

// ---- the bigger library: photos are bundled, how-to steps load on demand the first time they are needed ----
import { useSyncExternalStore } from 'react'
import { LIB_ROWS } from './libraryIndex'

const LIB_N: Record<string, { name: string; n: number }> = Object.fromEntries(LIB_ROWS.map((r) => [r[0], { name: r[1], n: r[9] }]))
type StepRow = { name: string; steps: string[]; primary: string[]; secondary: string[]; n: number }
let steps: Record<string, StepRow> | null = null
let loading = false
let version = 0
const listeners = new Set<() => void>()
function loadSteps() {
  if (steps || loading) return
  loading = true
  fetch(`${import.meta.env.BASE_URL}lib/steps.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: Record<string, StepRow>) => { steps = j; version++; listeners.forEach((l) => l()) })
    .catch(() => { loading = false }) // try again next time it is needed
}
/** Re-renders a component once the how-to steps for library exercises have loaded. */
export const useMediaVersion = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => version)

export const mediaFor = (exerciseId: string): Media | null => {
  const slug = MAP[exerciseId]
  if (slug && MEDIA[slug]) return { slug, ...MEDIA[slug] }
  const lib = LIB_N[exerciseId]
  if (!lib) return null
  loadSteps()
  const row = steps?.[exerciseId]
  return { slug: exerciseId, name: lib.name, steps: row?.steps ?? [], primary: row?.primary ?? [], secondary: row?.secondary ?? [], n: lib.n }
}
export const imgUrl = (slug: string, i: number) => `${import.meta.env.BASE_URL}ex/${slug}-${i}.jpg`
