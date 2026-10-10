export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'strength' | 'conditioning'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Gear = 'gym' | 'db' | 'bw'
export type DayType = 'Push' | 'Pull' | 'Legs' | 'Shoulders/Abs' | 'Full Body' | 'Rest/Cardio'
export type CarbDay = 'low' | 'medium' | 'high'
export type Metric = 'workouts' | 'earlyWorkouts' | 'steps' | 'cardioMin' | 'volume'

export interface Profile {
  goal: Goal
  level: Level
  days: number[] // 0=Sun..6=Sat
  style: 'hypertrophy' | 'strength' | 'mixed'
  gear: Gear
  weight: number
  target: number
  time: string // HH:MM
  cardio: boolean
  avoid: string
  reminders: boolean
  wantsCommunity: boolean
  // optional answers used only to suggest crews
  age?: string
  identities?: string[]
  vibe?: string
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
}

export interface SetEntry { weight: string; reps: string; rpe: string }
export interface LogEntry { exId: string; name: string; sets: { weight: number; reps: number; rpe?: number }[]; note: string }
export interface WorkoutLog { date: string; dayType: DayType; short: boolean; entries: LogEntry[]; imported?: boolean; baseline?: boolean; skipped?: boolean; minutes?: number }
export interface CardioLog { date: string; kind: string; minutes: number; note: string }
export interface WeightLog { date: string; lbs: number }
export interface Draft { sets: Record<string, SetEntry[]>; notes: Record<string, string>; rpe?: Record<string, string> }
export interface Message { id: string; community: string; who: string; text: string; ts: number; mine?: boolean }
export type Pose = 'front' | 'side' | 'back' | 'other'
export interface Photo { id: string; date: string; pose: Pose; path?: string }
export type PostKind = 'post' | 'qotd' | 'workout' | 'photo'
export interface CrewPost {
  id: string; crewId: string; userId?: string; name: string; kind: PostKind; text: string
  imagePaths: string[]; imageIds?: string[]
  imagePath?: string; imageId?: string // legacy single-photo posts
  meta?: Record<string, unknown>; ts: number; mine: boolean; likes: number; liked: boolean
}
export interface StepLog { date: string; steps: number }
export interface CustomCommunity { id: string; name: string; time: string; vibe: string; created?: number }

export interface FoodItem { id: string; name: string; serving: string; cal: number; p: number; c: number; f: number; cat: string }
/** A logged food. Macro numbers are already multiplied by qty. */
export interface FoodEntry { id: string; meal: number; name: string; serving: string; qty: number; cal: number; p: number; c: number; f: number }
export interface CustomChallenge { id: string; name: string; emoji: string; metric: Metric; unit: string; start: string; end: string; mine?: boolean }

export interface Settings {
  nutrition: { meals: number; proteinPerLb: number; fatPerLb: number; calorieAdjust: number }
  rest: { small: number; medium: number; large: number; keyBonus: number } // seconds
  autoShare: boolean // post finished workouts to my crew
  rpeEnabled: boolean // ask how hard the last set felt, once per exercise
  maxWorkoutHours: number // ask "still working out?" after this long, auto-end 30 min later
  autoTimer: boolean // start the rest timer when you log a set
  sound: boolean
  vibrate: boolean
}

export interface AppData {
  name: string
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
  meals: Record<string, string[]> // date -> checked meal ids
  messages: Message[]
  custom: CustomCommunity[]
  partner: boolean
  dayOverride: Record<string, DayType> // date -> workout type chosen by the user
  extras: Record<string, string[]> // date -> exercise ids added
  removed: Record<string, string[]> // date -> exercise ids removed
  started: Record<string, number> // date -> start timestamp
  photos: Photo[]
  qotd: Record<string, { answer?: string; skipped?: boolean }> // `${crew}|${date}`
  posts: CrewPost[] // used when running without the cloud backend
  steps: StepLog[]
  challengesJoined: string[] // challenge cohort ids
  handle?: string
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
