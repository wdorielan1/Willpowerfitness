export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'strength' | 'conditioning'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Gear = 'gym' | 'db' | 'bw'
export type DayType = 'Push' | 'Pull' | 'Legs' | 'Shoulders/Abs' | 'Full Body' | 'Rest/Cardio'
export type CarbDay = 'low' | 'medium' | 'high'

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
export interface WorkoutLog { date: string; dayType: DayType; short: boolean; entries: LogEntry[] }
export interface CardioLog { date: string; kind: string; minutes: number; note: string }
export interface WeightLog { date: string; lbs: number }
export interface Draft { sets: Record<string, SetEntry[]>; notes: Record<string, string> }
export interface Message { id: string; community: string; who: string; text: string; ts: number; mine?: boolean }
export interface CustomCommunity { id: string; name: string; time: string; vibe: string }

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
}
