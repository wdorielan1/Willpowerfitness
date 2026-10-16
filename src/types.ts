export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'strength' | 'conditioning'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Gear = 'gym' | 'db' | 'bw'
/** The kinds of equipment a person can say how often they use. */
export type EquipKind = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'ezbar' | 'kettlebells' | 'bands'
export type EquipUse = 'often' | 'sometimes' | 'never'
export type DayType = 'Push' | 'Pull' | 'Legs' | 'Shoulders/Abs' | 'Full Body' | 'Rest/Cardio'
export type WorkoutFocus = 'chest-triceps' | 'back-biceps' | 'custom'
export type CarbDay = 'low' | 'medium' | 'high'
export type Metric = 'workouts' | 'earlyWorkouts' | 'steps' | 'cardioMin' | 'volume'

export type BodyArea = 'chest' | 'back' | 'shoulders' | 'arms' | 'abs' | 'glutes' | 'legs'
export type Sex = 'male' | 'female' | 'other'

export interface Profile {
  goal: Goal
  level: Level
  days: number[] // 0=Sun..6=Sat
  style: 'hypertrophy' | 'strength' | 'mixed'
  gear: Gear
  /** How often they use each kind of equipment. Anything they haven't picked follows the recommended default for their gear. */
  equip?: Partial<Record<EquipKind, EquipUse>>
  /** Lifts in a workout, 4 to 8. Unset keeps the usual count for their level (beginner 4, intermediate 5, advanced 6). */
  lifts?: number
  /** Set when equipment is changed in the middle of a workout: today's plan keeps `equipWas` so nothing already done disappears, and the new choices apply from tomorrow. */
  equipWas?: Partial<Record<EquipKind, EquipUse>>
  equipSince?: string
  /** Lifts they chose "Never show me this" for, each with the day they said it. Hidden from Swap, Add and search straight away, and from planned workouts from the next day. */
  hidden?: Record<string, string>
  /** Lifts they were asked "Stop suggesting this?" about and said to keep. */
  kept?: string[]
  weight: number
  target: number
  time: string // HH:MM
  cardio: boolean
  avoid: string
  reminders: boolean
  wantsCommunity: boolean
  /** Used to size calorie targets. 'other' means prefer not to say. */
  sex?: Sex
  /** Up to 3 body parts to emphasise in suggested workouts. Empty means balanced. */
  focus?: BodyArea[]
  // optional answers used only to suggest crews
  age?: string
  identities?: string[]
  vibe?: string
  /** general area (town level, rounded to about a mile). Private to you; used to suggest crews near you. */
  area?: { name: string; lat: number; lng: number }
}

export interface Exercise {
  id: string
  name: string
  day: DayType
  muscle: string
  key?: boolean
  gear: Gear // minimum equipment
  reps: [number, number]
  sets: number
  inc: number // lb jump when progressing
  rest: number // seconds
  note: string
  // set for the bigger exercise library (see libraryIndex.ts)
  lib?: boolean; lvl?: 0 | 1 | 2; compound?: boolean; mobility?: boolean; equip?: string
}

export interface SetEntry { weight: string; reps: string; rpe: string }
export interface LogEntry { exId: string; name: string; sets: { weight: number; reps: number; rpe?: number }[]; note: string }
export interface WorkoutLog { date: string; dayType: DayType; short: boolean; entries: LogEntry[]; imported?: boolean; baseline?: boolean; skipped?: boolean; minutes?: number; finishedAt?: number; rotationDay?: DayType }
export interface CardioLog { date: string; kind: string; minutes: number; note: string }
export interface WeightLog { date: string; lbs: number }
export interface Draft { sets: Record<string, SetEntry[]>; notes: Record<string, string>; rpe?: Record<string, string>; completed?: Record<string, boolean[]>; touched?: Record<string, boolean[]> /* sets whose reps the user typed */ }
export interface Message { id: string; community: string; who: string; text: string; ts: number; mine?: boolean }
export type Pose = 'front' | 'side' | 'back' | 'other'
export interface Photo { id: string; date: string; pose: Pose; path?: string }
export type PostKind = 'post' | 'qotd' | 'workout' | 'photo' | 'video'
/** A short clip on a crew post, kept in the post's meta. Cloud posts have a storage path, on-device ones an id. */
export interface VideoMeta { path?: string; id?: string; type: string; seconds: number; size: number; expired?: boolean /* the file was deleted after 60 days */; cover?: boolean /* the post's first picture is this clip's cover frame (older posts: it is when the post has any picture) */ }
export interface CrewPost {
  id: string; crewId: string; userId?: string; name: string; kind: PostKind; text: string
  imagePaths: string[]; imageIds?: string[]
  imagePath?: string; imageId?: string // legacy single-photo posts
  meta?: Record<string, unknown>; ts: number; mine: boolean; likes: number; liked: boolean; isPublic?: boolean; comments?: number
}
export interface StepLog { date: string; steps: number }
export interface CustomCommunity { id: string; name: string; time: string; vibe: string; cat?: string; place?: string; lat?: number; lng?: number; created?: number }

export interface FoodItem { id: string; name: string; serving: string; cal: number; p: number; c: number; f: number; cat: string }
/** A logged food. Macro numbers are already multiplied by qty. */
export interface FoodEntry { id: string; meal: number; name: string; serving: string; qty: number; cal: number; p: number; c: number; f: number }
export interface CustomChallenge { id: string; name: string; emoji: string; metric: Metric; unit: string; start: string; end: string; mine?: boolean }

export type StickerStyle = 'minimal' | 'performance' | 'full'
export type StickerTextColor = 'white' | 'dark'
/** Sticker center and width as fractions of the output frame. Photos are never stored. */
export interface StickerPlacement { x: number; y: number; scale: number }

export interface Settings {
  nutrition: { meals: number; proteinPerLb: number; fatPerLb: number; calorieAdjust: number }
  rest: { small: number; medium: number; large: number; keyBonus: number } // seconds
  rotation: 'weekly' | 'biweekly' | 'monthly' | 'never' // how often accessory exercises change (main lifts change every 4 weeks)
  autoShare: boolean // post finished workouts to my crew
  equipAsked?: number // when we first asked what equipment they use (so it only pops up once)
  askSave?: boolean // offer to save a finished workout as "your Leg Day" (on unless they said don't ask again)
  askSkips?: boolean // check in after skipped lifts or missed workouts (on unless they said don't ask again)
  shareCrews?: string[] // which crews a finished workout is posted to automatically (unset: just my main crew)
  shareLifts?: boolean // show weights in crew posts: the top lifts, total weight and the PR's weight (on unless they turned it off)
  gymName?: string // optional place shown on share pictures (never live location)
  shareFormat?: 'story' | 'post' // last share picture size
  shareHideWeight?: boolean // body weight graph sticker: leave out the actual weights (default on)
  shareStickerStyle?: StickerStyle
  shareStickerTextColor?: StickerTextColor
  shareStickerPlacement?: StickerPlacement
  rpeEnabled: boolean // ask how hard the last set felt, once per exercise
  maxWorkoutHours: number // ask "still working out?" after this long, auto-end 30 min later
  autoTimer: boolean // start the rest timer when you log a set
  sound: boolean
  vibrate: boolean
}

export interface AppData {
  name: string
  /** The day they confirmed they are 13 or older. Their date of birth is never saved. */
  ageConfirmed?: string
  profile: Profile | null
  joined: string[]
  primary: string | null
  checkins: Record<string, { going?: boolean; done?: boolean }>
  logs: WorkoutLog[]
  cardio: CardioLog[]
  weights: WeightLog[]
  swaps: Record<string, string> // `${date}|${exId}` -> replacement exId
  short: Record<string, boolean>
  drafts: Record<string, Draft>
  /** Days whose finished workout was already shared to the crew, so saving changes doesn't post again. */
  workoutPosted?: Record<string, boolean>
  /** today's exercise order after you drag lifts around (original exercise ids, by date) */
  exOrder?: Record<string, string[]>
  meals: Record<string, string[]> // date -> checked meal ids
  messages: Message[]
  custom: CustomCommunity[]
  partner: boolean
  dayOverride: Record<string, DayType> // date -> workout type chosen by the user
  customSession?: Record<string, string[]> // date -> exercise ids picked in Build your own
  myWorkouts?: { id: string; name: string; ids: string[]; day?: DayType; focus?: WorkoutFocus }[] // saved workouts: Build your own, or "your Leg Day" saved after a finish (those carry the day they belong to)
  workoutFocus?: Record<string, WorkoutFocus> // date -> focused alternative for this session
  extras: Record<string, string[]> // date -> exercise ids added
  removed: Record<string, string[]> // date -> exercise ids removed
  skipAsked?: string // the day we last asked about skipped lifts mid-workout (at most once a day)
  missedAsked?: string // the day we last asked "what's in the way?" after missed workouts (not again for a week)
  /** Where they said they train: the last choice and the day they made it. Home swaps in dumbbell and bodyweight lifts. The app never knows where they actually are. */
  place?: { at: 'gym' | 'home'; date: string }
  /** The place a day's plan was built for, stamped when that day's workout starts so a later change can't reshuffle lifts already done. */
  planPlace?: Record<string, 'gym' | 'home'>
  atHome?: Record<string, boolean> // days they said they were at home: Swap and Add use dumbbell and bodyweight lifts that day, and swaps made because of it are not counted as lifts they turned away
  started: Record<string, number> // date -> start timestamp
  photos: Photo[]
  qotd: Record<string, { answer?: string; skipped?: boolean; crews?: string[] }> // by date; older entries were `${crew}|${date}`. `crews` is where the answer went
  posts: CrewPost[] // used when running without the cloud backend
  steps: StepLog[]
  challengesJoined: string[] // challenge cohort ids
  handle?: string
  /** Public profile page (anyone with the link). Off for existing members until they choose. */
  profilePublic?: boolean
  bio?: string
  /** Profile photo they uploaded (small square JPEG as a data URL). Wins over the Google photo. */
  avatar?: string
  findByHandle?: boolean
  findByEmail?: boolean
  foodLog: Record<string, FoodEntry[]>
  customFoods: FoodItem[]
  carbOverride: Record<string, CarbDay>
  customChallenges: CustomChallenge[]
  /** saved meals from the meal builder, keyed `${carb}:${meals}:${mealIndex}` */
  mealPlan: Record<string, { item: FoodItem; qty: number }[]>
  settings: Settings
  extendHours: Record<string, number> // date -> extra hours the user said to keep going
  ts?: number // last local change, used to pick the newest copy when syncing
}
