import type { DayType, Exercise, Goal, Level } from './types'

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

export const EXERCISES: Exercise[] = [
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

export const WARMUP: Record<DayType, string[]> = {
  Push: ['5 min easy bike or incline walk', 'Arm circles + band pull-aparts × 15', '2 ramp-up sets of your first press (50% × 8, 70% × 4)'],
  Pull: ['5 min easy row or incline walk', 'Scap pull-ups / dead hangs × 2', '2 ramp-up sets of your first pull (50% × 8, 70% × 4)'],
  Legs: ['5 min bike', 'Bodyweight squats × 15 + hip openers', '2–3 ramp-up sets of your first lift (40% × 8, 60% × 5, 80% × 2)'],
  'Shoulders/Abs': ['5 min easy cardio', 'Band dislocates × 10 + external rotations × 15', '1–2 light sets of your first press'],
  'Full Body': ['5 min easy cardio', 'World\'s greatest stretch × 5/side', '2–3 ramp-up sets of your first lift'],
  'Rest/Cardio': ['Take it easy — this is a recovery day.'],
}

export interface CommunityDef {
  id: string
  name: string
  time: string
  members: number
  rate: number // typical completion rate
  vibe: string
  blurb: string
}

export const COMMUNITIES: CommunityDef[] = [
  { id: '5am', name: '5 AM Club', time: '05:00', members: 312, rate: 0.84, vibe: 'Silent grind. Early wins.', blurb: 'Alarm goes off, you go. No negotiating.' },
  { id: 'morning', name: 'Morning Lifters', time: '07:00', members: 486, rate: 0.77, vibe: 'Coffee, music, heavy weight.', blurb: 'Train before the day gets a vote.' },
  { id: 'lunch', name: 'Lunch Break Crew', time: '12:00', members: 204, rate: 0.69, vibe: 'In, out, 45 minutes.', blurb: 'Efficient sessions for packed calendars.' },
  { id: 'afterwork', name: 'After Work Lifters', time: '17:30', members: 529, rate: 0.72, vibe: 'Leave work at the door.', blurb: 'Turn a long day into a strong one.' },
  { id: 'fatloss', name: 'Fat Loss Accountability', time: '06:00', members: 391, rate: 0.74, vibe: 'Consistency over perfection.', blurb: 'Lift, walk, and hit your numbers together.' },
  { id: 'strength', name: 'Strength Builders', time: '18:00', members: 268, rate: 0.8, vibe: 'Add weight to the bar.', blurb: 'Progressive overload people who log every set.' },
  { id: 'beginner', name: 'Beginner Gym Crew', time: '19:00', members: 347, rate: 0.66, vibe: 'Everyone started here.', blurb: 'No judgement. Learn the lifts with friends.' },
  { id: 't5', name: '5 AM Group', time: '05:00', members: 142, rate: 0.82, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 5:00 AM.' },
  { id: 't6', name: '6 AM Group', time: '06:00', members: 233, rate: 0.79, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 6:00 AM.' },
  { id: 't12', name: '12 PM Group', time: '12:00', members: 118, rate: 0.7, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 12:00 PM.' },
  { id: 't530', name: '5:30 PM Group', time: '17:30', members: 201, rate: 0.73, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 5:30 PM.' },
  { id: 't7', name: '7 PM Group', time: '19:00', members: 176, rate: 0.68, vibe: 'Time-based crew', blurb: 'Everyone in this crew trains at 7:00 PM.' },
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
