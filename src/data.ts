import type { DayType, Exercise, Goal, Level, Settings } from './types'
import { LIB_ROWS } from './libraryIndex'

export const TAGLINE = 'Wake Up. Show Up. Lift.'

export const GOALS: Record<Goal, string> = {
  fat_loss: 'Fat loss',
  muscle_gain: 'Muscle gain',
  maintenance: 'Maintenance',
  strength: 'Strength',
  conditioning: 'Athletic conditioning',
}
export const LEVELS: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const SPLIT: DayType[] = ['Push', 'Pull', 'Legs', 'Shoulders/Abs', 'Full Body']
export const CARDIO_KINDS = ['Treadmill', 'StairMaster', 'Incline walk', 'Outdoor walk', 'Bike', 'Other']

const e = (
  id: string, name: string, day: DayType, muscle: string, gear: Exercise['gear'],
  reps: [number, number], sets: number, inc: number, rest: number, note: string, key = false,
): Exercise => ({ id, name, day, muscle, gear, reps, sets, inc, rest, note, key })

export const CORE_EXERCISES: Exercise[] = [
  // Push
  e('bench', 'Barbell Bench Press', 'Push', 'Chest', 'gym', [6, 8], 4, 5, 150, 'Shoulder blades pinned, control the way down.', true),
  e('incdb', 'Incline Dumbbell Press', 'Push', 'Upper chest', 'db', [8, 10], 3, 5, 120, '30° bench, full stretch at the bottom.', true),
  e('chestmach', 'Machine Chest Press', 'Push', 'Chest', 'gym', [10, 12], 3, 10, 90, 'Squeeze at lockout.'),
  e('cablefly', 'Cable Fly', 'Push', 'Chest', 'gym', [12, 15], 3, 5, 60, 'Slow stretch, hug the cables together.'),
  e('pushup', 'Push-Up', 'Push', 'Chest', 'bw', [10, 20], 3, 0, 60, 'Body in one line. Add a pause at the bottom.'),
  e('pushdown', 'Triceps Pushdown', 'Push', 'Triceps', 'gym', [10, 12], 3, 5, 60, 'Elbows pinned to your sides.'),
  e('ohtri', 'Overhead Triceps Extension', 'Push', 'Triceps', 'db', [10, 12], 3, 5, 60, 'Deep stretch behind the head.'),
  e('dips', 'Bench Dip', 'Push', 'Triceps', 'bw', [10, 15], 3, 0, 60, 'Keep shoulders down and back.'),
  e('latraise', 'Lateral Raise', 'Push', 'Side delts', 'db', [12, 15], 3, 2.5, 60, 'Lead with the elbows, no swinging.'),
  // Pull
  e('row', 'Barbell Row', 'Pull', 'Back', 'gym', [6, 8], 4, 5, 150, 'Flat back, pull to the lower ribs.', true),
  e('pulldown', 'Lat Pulldown', 'Pull', 'Lats', 'gym', [8, 10], 3, 5, 120, 'Drive elbows down, chest up.', true),
  e('dbrow', 'One-Arm Dumbbell Row', 'Pull', 'Back', 'db', [8, 12], 3, 5, 90, 'Full stretch, no torso twist.', true),
  e('cablerow', 'Seated Cable Row', 'Pull', 'Mid back', 'gym', [10, 12], 3, 5, 90, 'Pause and squeeze each rep.'),
  e('csrow', 'Chest-Supported Row', 'Pull', 'Mid back', 'gym', [10, 12], 3, 5, 90, 'Let the chest take the stress off your lower back.'),
  e('pullup', 'Pull-Up', 'Pull', 'Lats', 'bw', [5, 10], 3, 0, 120, 'Full hang to chin over bar. Use assistance if needed.'),
  e('facepull', 'Face Pull', 'Pull', 'Rear delts', 'gym', [12, 15], 3, 5, 60, 'Pull to forehead, thumbs back.'),
  e('dbcurl', 'Dumbbell Curl', 'Pull', 'Biceps', 'db', [10, 12], 3, 2.5, 60, 'No swinging. Control the lowering.'),
  e('hammer', 'Hammer Curl', 'Pull', 'Biceps', 'db', [10, 12], 3, 2.5, 60, 'Neutral grip, elbows still.'),
  // Legs
  e('squat', 'Back Squat', 'Legs', 'Quads', 'gym', [6, 8], 4, 5, 180, 'Brace hard, hit depth you own.', true),
  e('goblet', 'Goblet Squat', 'Legs', 'Quads', 'db', [10, 12], 4, 5, 120, 'Elbows inside knees at the bottom.', true),
  e('rdl', 'Romanian Deadlift', 'Legs', 'Hamstrings', 'db', [8, 10], 3, 5, 120, 'Hips back, feel the hamstring stretch.', true),
  e('legpress', 'Leg Press', 'Legs', 'Quads', 'gym', [10, 12], 3, 10, 120, 'Do not let the lower back peel off the pad.'),
  e('lunge', 'Walking Lunge', 'Legs', 'Quads/Glutes', 'bw', [10, 12], 3, 5, 90, 'Long step, upright torso.'),
  e('legcurl', 'Leg Curl', 'Legs', 'Hamstrings', 'gym', [10, 12], 3, 5, 60, 'Slow negatives.'),
  e('legext', 'Leg Extension', 'Legs', 'Quads', 'gym', [12, 15], 3, 5, 60, 'Squeeze and hold the top.'),
  e('calf', 'Standing Calf Raise', 'Legs', 'Calves', 'bw', [12, 20], 4, 5, 45, 'Full stretch and a pause at the top.'),
  // Shoulders / Abs
  e('dbpress', 'Seated Dumbbell Shoulder Press', 'Shoulders/Abs', 'Shoulders', 'db', [8, 10], 4, 5, 120, 'Ribs down, press slightly forward.', true),
  e('latraise2', 'Lateral Raise', 'Shoulders/Abs', 'Side delts', 'db', [12, 15], 4, 2.5, 60, 'Light and strict beats heavy and sloppy.', true),
  e('reardelt', 'Rear Delt Fly', 'Shoulders/Abs', 'Rear delts', 'db', [12, 15], 3, 2.5, 60, 'Hinge forward, lead with the elbows.'),
  e('shrug', 'Dumbbell Shrug', 'Shoulders/Abs', 'Traps', 'db', [10, 15], 3, 5, 60, 'Straight up, hold for a beat.'),
  e('cablecrunch', 'Cable Crunch', 'Shoulders/Abs', 'Abs', 'gym', [12, 15], 3, 5, 60, 'Curl the ribs to the hips.'),
  e('legraise', 'Hanging Leg Raise', 'Shoulders/Abs', 'Abs', 'bw', [10, 15], 3, 0, 60, 'No swinging. Tuck the pelvis.'),
  e('plank', 'Plank (reps = 10 sec holds)', 'Shoulders/Abs', 'Abs', 'bw', [4, 6], 3, 0, 45, 'Squeeze glutes, ribs down.'),
  // Full body
  e('deadlift', 'Deadlift', 'Full Body', 'Posterior chain', 'gym', [5, 6], 3, 10, 180, 'Wedge into the bar, push the floor away.', true),
  e('fbdb', 'Dumbbell Thruster', 'Full Body', 'Full body', 'db', [8, 10], 3, 5, 90, 'Squat into a press in one flow.', true),
  e('fbpress', 'Incline Dumbbell Press', 'Full Body', 'Chest', 'db', [8, 10], 3, 5, 90, 'Controlled lowering.', true),
  e('fbrow', 'Chest-Supported Row', 'Full Body', 'Back', 'gym', [10, 12], 3, 5, 90, 'Squeeze the shoulder blades.'),
  e('fbdbrow', 'One-Arm Dumbbell Row', 'Full Body', 'Back', 'db', [10, 12], 3, 5, 90, 'No twisting.'),
  e('fblunge', 'Split Squat', 'Full Body', 'Legs', 'bw', [8, 12], 3, 5, 90, 'Back knee just above the floor.'),
  e('fbpush', 'Push-Up', 'Full Body', 'Chest', 'bw', [10, 20], 3, 0, 60, 'Stop 1–2 reps shy of failure.'),
  e('fbcurl', 'Dumbbell Curl', 'Full Body', 'Arms', 'db', [10, 12], 2, 2.5, 60, 'Superset with triceps work.'),
]

/** The bigger library (free-exercise-db): sensible defaults here, then tuned to level and goal when a workout is built. */
const LOWER = ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hips']
const libExercise = ([id, name, muscle, day, gear, equip, lvl, compound, mobility]: (typeof LIB_ROWS)[number]): Exercise => {
  const lower = LOWER.includes(muscle)
  const bw = gear === 'bw'
  const reps: [number, number] = mobility ? [1, 1] : muscle === 'Abs' ? [12, 20] : bw ? [10, 20] : compound ? [6, 10] : [10, 15]
  return {
    id, name, day: day as DayType, muscle, gear: gear as Exercise['gear'], reps,
    sets: mobility ? 1 : compound ? 3 : 3, inc: bw || mobility ? 0 : lower && compound ? 10 : compound ? 5 : 2.5,
    rest: mobility ? 0 : compound ? (lower ? 120 : 90) : 60,
    note: mobility ? 'Move slowly. Stop at a comfortable stretch, never pain.' : `${equip === 'body only' ? 'Bodyweight' : equip.replace(/^./, (c) => c.toUpperCase())}. Control the lowering, full range of motion.`,
    lib: true, lvl: lvl as 0 | 1 | 2, compound: !!compound, mobility: !!mobility, equip,
  }
}
export const LIB_EXERCISES: Exercise[] = LIB_ROWS.map(libExercise)
export const EXERCISES: Exercise[] = [...CORE_EXERCISES, ...LIB_EXERCISES]

export const WARMUP: Record<DayType, string[]> = {
  Push: ['5 min easy bike or incline walk', 'Arm circles + band pull-aparts × 15', '2 ramp-up sets of your first press (50% × 8, 70% × 4)'],
  Pull: ['5 min easy row or incline walk', 'Scap pull-ups / dead hangs × 2', '2 ramp-up sets of your first pull (50% × 8, 70% × 4)'],
  Legs: ['5 min bike', 'Bodyweight squats × 15 + hip openers', '2–3 ramp-up sets of your first lift (40% × 8, 60% × 5, 80% × 2)'],
  'Shoulders/Abs': ['5 min easy cardio', 'Band dislocates × 10 + external rotations × 15', '1–2 light sets of your first press'],
  'Full Body': ['5 min easy cardio', 'World\'s greatest stretch × 5/side', '2–3 ramp-up sets of your first lift'],
  'Rest/Cardio': ['Take it easy — this is a recovery day.'],
}

export type CrewCat = 'time' | 'goal' | 'life' | 'work' | 'age' | 'fan' | 'interest'
export const CAT_LABEL: Record<CrewCat, string> = { time: 'Time of day', goal: 'Goals', life: 'Parents & life', work: 'Work & jobs', age: 'Age', fan: 'Fans & teams', interest: 'Interests & community' }

export interface CommunityDef {
  id: string
  name: string
  time: string
  members: number
  rate: number // typical completion rate
  vibe: string
  blurb: string
  cat?: CrewCat
  tags?: string[] // identities this crew is for (see IDENTITIES)
  ages?: string[]
  goals?: Goal[]
  level?: Level
  vibes?: string[] // see VIBES
}

export const AGES = ['18–24', '25–34', '35–44', '45–54', '55+']
export const IDENTITIES: { id: string; label: string; reason: string }[] = [
  { id: 'mom', label: 'Mom', reason: 'For moms' },
  { id: 'dad', label: 'Dad', reason: 'For dads' },
  { id: 'student', label: 'Student', reason: 'For students' },
  { id: 'desk', label: 'Desk / office job', reason: 'Built around desk jobs' },
  { id: 'shift', label: 'Shift worker', reason: 'For shift workers' },
  { id: 'health', label: 'Healthcare', reason: 'For healthcare workers' },
  { id: 'edu', label: 'Teacher / school staff', reason: 'For school staff' },
  { id: 'responder', label: 'First responder / military', reason: 'For first responders & military' },
  { id: 'athlete', label: 'Athlete / team sport', reason: 'For athletes' },
  { id: 'fan', label: 'Sports fan', reason: 'For sports fans' },
  { id: 'faith', label: 'Faith / church', reason: 'Faith-based' },
  { id: 'runner', label: 'Runner', reason: 'For runners' },
  { id: 'outdoors', label: 'Outdoors / hiking', reason: 'For people who love the outdoors' },
  { id: 'gamer', label: 'Gamer', reason: 'For gamers' },
]
export const VIBES = [
  { id: 'quiet', label: 'Quiet grind' },
  { id: 'social', label: 'Social & chatty' },
  { id: 'competitive', label: 'Competitive' },
  { id: 'chill', label: 'Chill & supportive' },
]

export const COMMUNITIES: CommunityDef[] = [
  { id: '5am', name: '5 AM Club', time: '05:00', members: 312, rate: 0.84, vibe: 'Silent grind. Early wins.', blurb: 'Alarm goes off, you go. No negotiating.', cat: 'time', vibes: ['quiet', 'competitive'] },
  { id: 'morning', name: 'Morning Lifters', time: '07:00', members: 486, rate: 0.77, vibe: 'Coffee, music, heavy weight.', blurb: 'Train before the day gets a vote.', cat: 'time', vibes: ['social'] },
  { id: 'lunch', name: 'Lunch Break Crew', time: '12:00', members: 204, rate: 0.69, vibe: 'In, out, 45 minutes.', blurb: 'Efficient sessions for packed calendars.', cat: 'time', tags: ['desk'], vibes: ['quiet'] },
  { id: 'afterwork', name: 'After Work Lifters', time: '17:30', members: 529, rate: 0.72, vibe: 'Leave work at the door.', blurb: 'Turn a long day into a strong one.', cat: 'time', tags: ['desk'], vibes: ['social'] },
  { id: 'fatloss', name: 'Fat Loss Accountability', time: '06:00', members: 391, rate: 0.74, vibe: 'Consistency over perfection.', blurb: 'Lift, walk, and hit your numbers together.', cat: 'goal', goals: ['fat_loss'], vibes: ['chill', 'social'] },
  { id: 'strength', name: 'Strength Builders', time: '18:00', members: 268, rate: 0.8, vibe: 'Add weight to the bar.', blurb: 'Progressive overload people who log every set.', cat: 'goal', goals: ['strength', 'muscle_gain'], vibes: ['competitive', 'quiet'] },
  { id: 'beginner', name: 'Beginner Gym Crew', time: '19:00', members: 347, rate: 0.66, vibe: 'Everyone started here.', blurb: 'No judgement. Learn the lifts with friends.', cat: 'goal', level: 'beginner', vibes: ['chill'] },
  // ---- more ways to find your people (shown as suggestions, not all at once) ----
  { id: 'moms', name: 'Moms Who Lift', time: '09:00', members: 184, rate: 0.76, vibe: 'Strong moms. Kids optional.', blurb: 'Fit training in around school runs and nap time. Zero guilt.', cat: 'life', tags: ['mom'], vibes: ['chill', 'social'] },
  { id: 'dads', name: 'Dads Who Lift', time: '05:30', members: 203, rate: 0.78, vibe: 'Be the strong one at home.', blurb: 'Early sessions before the family wakes up.', cat: 'life', tags: ['dad'], vibes: ['quiet', 'competitive'] },
  { id: 'night', name: 'After Bedtime Crew', time: '20:30', members: 119, rate: 0.7, vibe: 'Kids down, weights up.', blurb: 'For parents who train once the house is quiet.', cat: 'life', tags: ['mom', 'dad'], vibes: ['chill'] },
  { id: 'students', name: 'Student Lifters', time: '16:00', members: 226, rate: 0.72, vibe: 'Between classes and cramming.', blurb: 'Consistent training on a student schedule and a student budget.', cat: 'life', tags: ['student'], ages: ['18–24'], vibes: ['social'] },
  { id: 'shift', name: 'Shift Workers Crew', time: '14:00', members: 141, rate: 0.69, vibe: 'Your clock is different. Your crew gets it.', blurb: 'Nights, rotating shifts, odd hours. Train when you can and stay accountable.', cat: 'work', tags: ['shift'], vibes: ['chill'] },
  { id: 'health', name: 'Healthcare Heroes', time: '06:30', members: 167, rate: 0.71, vibe: 'You take care of everyone else.', blurb: 'Nurses, techs, doctors, and care teams taking care of themselves.', cat: 'work', tags: ['health', 'shift'], vibes: ['chill', 'social'] },
  { id: 'edu', name: 'Teachers & School Staff', time: '16:30', members: 132, rate: 0.73, vibe: 'Grade papers later. Lift first.', blurb: 'Educators and school staff training after the bell.', cat: 'work', tags: ['edu'], vibes: ['social', 'chill'] },
  { id: 'responders', name: 'First Responders & Military', time: '05:30', members: 158, rate: 0.82, vibe: 'Discipline is the standard.', blurb: 'Police, fire, EMS, and service members holding each other to it.', cat: 'work', tags: ['responder'], vibes: ['competitive', 'quiet'] },
  { id: 'athletes', name: 'Athletes & Team Sport', time: '17:00', members: 174, rate: 0.77, vibe: 'Off-season is on-season.', blurb: 'Strength and conditioning for people who play.', cat: 'goal', tags: ['athlete'], goals: ['conditioning'], vibes: ['competitive'] },
  { id: 'giants', name: 'Giants Fans', time: '18:00', members: 96, rate: 0.7, vibe: 'Big Blue, big lifts.', blurb: 'Talk Sundays, train the rest of the week. Fans keep each other going.', cat: 'fan', tags: ['fan'], vibes: ['social'] },
  { id: 'jets', name: 'Jets Fans', time: '18:00', members: 71, rate: 0.68, vibe: 'Pain loves company. So do PRs.', blurb: 'Suffer on Sundays, win in the gym.', cat: 'fan', tags: ['fan'], vibes: ['social', 'chill'] },
  { id: 'cowboys', name: 'Cowboys Fans', time: '18:00', members: 104, rate: 0.7, vibe: 'America’s team, America’s gym.', blurb: 'Fans who lift. Game-day talk included.', cat: 'fan', tags: ['fan'], vibes: ['social', 'competitive'] },
  { id: 'eagles', name: 'Eagles Fans', time: '18:00', members: 112, rate: 0.72, vibe: 'Fly together.', blurb: 'Philly energy. Lift like it is fourth and one.', cat: 'fan', tags: ['fan'], vibes: ['competitive', 'social'] },
  { id: 'patriots', name: 'Patriots Fans', time: '18:00', members: 64, rate: 0.69, vibe: 'Do your job.', blurb: 'Fans who show up every day, game day or not.', cat: 'fan', tags: ['fan'], vibes: ['quiet', 'competitive'] },
  { id: 'packers', name: 'Packers Fans', time: '18:00', members: 58, rate: 0.7, vibe: 'Cold weather, warm crew.', blurb: 'Cheeseheads who lift. Show up and stay strong.', cat: 'fan', tags: ['fan'], vibes: ['chill', 'social'] },
  { id: 'runners', name: 'Runners Who Lift', time: '06:00', members: 133, rate: 0.75, vibe: 'Miles and plates.', blurb: 'Runners adding strength so they stay fast and healthy.', cat: 'interest', tags: ['runner'], goals: ['conditioning'], vibes: ['social', 'chill'] },
  { id: 'faith', name: 'Faith & Fitness', time: '06:00', members: 119, rate: 0.77, vibe: 'Strong body, strong faith.', blurb: 'Train with people who share your faith and keep each other encouraged.', cat: 'interest', tags: ['faith'], vibes: ['chill', 'social'] },
  { id: 'outdoors', name: 'Outdoors & Hikers', time: '07:00', members: 88, rate: 0.7, vibe: 'Train for the trail.', blurb: 'Strength for hiking, camping and anything outside.', cat: 'interest', tags: ['outdoors'], vibes: ['chill', 'social'] },
  { id: 'gamers', name: 'Gamers Who Lift', time: '19:00', members: 92, rate: 0.68, vibe: 'Level up IRL.', blurb: 'Close the console, open the gym, keep each other honest.', cat: 'interest', tags: ['gamer'], vibes: ['chill', 'quiet'] },
  { id: 'age18', name: 'Under 25 Crew', time: '18:00', members: 212, rate: 0.74, vibe: 'Build the habit early.', blurb: 'Young lifters building a strong foundation.', cat: 'age', ages: ['18–24'], vibes: ['social', 'competitive'] },
  { id: 'age25', name: '25–34 Crew', time: '06:00', members: 238, rate: 0.75, vibe: 'Career, life, and lifting.', blurb: 'Balancing a busy decade without losing the gym.', cat: 'age', ages: ['25–34'], vibes: ['social'] },
  { id: 'age35', name: '35–44 Crew', time: '05:30', members: 196, rate: 0.77, vibe: 'Stronger than you were at 25.', blurb: 'Prime years. Smart training that lasts.', cat: 'age', ages: ['35–44'], vibes: ['quiet', 'chill'] },
  { id: 'age45', name: '45–54 Strong', time: '06:30', members: 151, rate: 0.79, vibe: 'Strength, joints, longevity.', blurb: 'Train hard and train smart for the long game.', cat: 'age', ages: ['45–54'], vibes: ['chill'] },
  { id: 'age55', name: '55+ Strong', time: '07:30', members: 128, rate: 0.8, vibe: 'Never too late. Never done.', blurb: 'Build strength and keep your independence for decades.', cat: 'age', ages: ['55+'], vibes: ['chill', 'social'] },
  { id: 't5', name: '5 AM Group', time: '05:00', members: 142, rate: 0.82, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 5:00 AM.', cat: 'time' },
  { id: 't6', name: '6 AM Group', time: '06:00', members: 233, rate: 0.79, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 6:00 AM.', cat: 'time' },
  { id: 't12', name: '12 PM Group', time: '12:00', members: 118, rate: 0.7, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 12:00 PM.', cat: 'time' },
  { id: 't530', name: '5:30 PM Group', time: '17:30', members: 201, rate: 0.73, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 5:30 PM.', cat: 'time' },
  { id: 't7', name: '7 PM Group', time: '19:00', members: 176, rate: 0.68, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 7:00 PM.', cat: 'time' },
]

export const NAMES = ['Marcus T.', 'Priya S.', 'Devon R.', 'Jess L.', 'Tyrell W.', 'Ana M.', 'Colby H.', 'Rae K.', 'Jordan P.', 'Sam B.', 'Luis G.', 'Nia C.', 'Hank D.', 'Mei Z.', 'Omar F.', 'Brit A.', 'Kofi N.', 'Tess V.']

export const ENCOURAGEMENTS = [
  'Bar is loaded. Your move.',
  'Nobody ever regretted a workout. Go.',
  'Show up tired. Leave proud.',
  'The crew is already in. Get in here.',
  'Motivation is a visitor. Discipline lives here.',
  'One more day on the streak. Take it.',
]

export const DEFAULT_SETTINGS: Settings = {
  nutrition: { meals: 4, proteinPerLb: 1, fatPerLb: 0.35, calorieAdjust: 0 },
  rest: { small: 45, medium: 75, large: 120, keyBonus: 30 },
  rotation: 'biweekly',
  autoShare: false,
  rpeEnabled: true,
  maxWorkoutHours: 5,
  autoTimer: true,
  sound: true,
  vibrate: true,
}
export const REST_PRESETS: { id: string; label: string; hint: string; rest: Settings['rest'] }[] = [
  { id: 'quick', label: 'Quick', hint: '30–60 s, short on time', rest: { small: 30, medium: 45, large: 60, keyBonus: 0 } },
  { id: 'balanced', label: 'Balanced', hint: 'Recommended', rest: { small: 45, medium: 75, large: 120, keyBonus: 30 } },
  { id: 'strength', label: 'Strength', hint: 'Longer rests for heavy lifting', rest: { small: 60, medium: 105, large: 150, keyBonus: 60 } },
]
