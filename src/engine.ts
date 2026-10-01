import { EXERCISES, SPLIT } from './data'
import type { AppData, CarbDay, DayType, Exercise, Gear, Goal, Profile, SetEntry, WorkoutLog } from './types'

// ---------- dates ----------
export const iso = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
export const todayISO = () => iso(new Date())
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
}

export function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ---------- workout selection ----------
const gearRank: Record<Gear, number> = { gym: 2, db: 1, bw: 0 }
const available = (ex: Exercise, gear: Gear) => gearRank[ex.gear] <= gearRank[gear]
const avoided = (ex: Exercise, avoid: string) => {
  const words = avoid.toLowerCase().split(/[,;\n]/).map((w) => w.trim()).filter((w) => w.length > 2)
  const hay = `${ex.name} ${ex.muscle}`.toLowerCase()
  return words.some((w) => hay.includes(w))
}
const pool = (day: DayType, p: Profile) => {
  const base = EXERCISES.filter((x) => x.day === day && available(x, p.gear) && !avoided(x, p.avoid))
  return base.length >= 3 ? base : EXERCISES.filter((x) => x.day === day && available(x, p.gear))
}

export function isTrainingDay(date: string, p: Profile) {
  return p.days.includes(fromISO(date).getDay())
}

/** Next day in the Push/Pull/Legs/Shoulders/Full Body rotation, based on the last logged session. */
export function dayTypeFor(date: string, p: Profile, logs: WorkoutLog[]): DayType {
  if (!isTrainingDay(date, p)) return 'Rest/Cardio'
  const done = logs.filter((l) => l.date === date && l.dayType !== 'Rest/Cardio')
  if (done.length) return done[done.length - 1].dayType
  const prior = [...logs].filter((l) => l.date < date && l.dayType !== 'Rest/Cardio').sort((a, b) => a.date.localeCompare(b.date))
  const last = prior[prior.length - 1]
  if (!last) return SPLIT[0]
  return SPLIT[(SPLIT.indexOf(last.dayType) + 1) % SPLIT.length]
}

export interface PlannedExercise { ex: Exercise; sets: number; swapped: boolean }

export function generateWorkout(date: string, d: AppData, short: boolean) {
  const p = d.profile!
  const day = dayTypeFor(date, p, d.logs)
  if (day === 'Rest/Cardio') return { day, items: [] as PlannedExercise[] }
  const all = pool(day, p)
  const keys = all.filter((x) => x.key).slice(0, 2)
  const rest = all.filter((x) => !keys.includes(x))
  // rotate accessories week to week; key lifts stay fixed so progress is trackable
  const week = Math.floor(fromISO(date).getTime() / 86400000 / 7)
  const nAcc = short ? 1 : p.level === 'beginner' ? 2 : p.level === 'advanced' ? 4 : 3
  const accessories: Exercise[] = []
  for (let i = 0; i < Math.min(nAcc, rest.length); i++) accessories.push(rest[(week + i) % rest.length])
  const strengthBias = p.style === 'strength' || p.goal === 'strength'
  const items = [...keys, ...accessories].map((ex0) => {
    const swap = d.swaps[`${date}|${ex0.id}`]
    const ex = swap ? EXERCISES.find((x) => x.id === swap) ?? ex0 : ex0
    let sets = ex.sets + (strengthBias && ex.key ? 1 : 0) - (p.level === 'beginner' ? 1 : 0)
    if (short) sets -= 1
    return { ex, sets: Math.max(2, sets), swapped: ex.id !== ex0.id }
  })
  return { day, items }
}

export function swapOptions(ex: Exercise, current: string[], p: Profile) {
  return EXERCISES.filter((x) => x.day === ex.day && x.id !== ex.id && !current.includes(x.id) && available(x, p.gear) && !avoided(x, p.avoid))
}

export function cardioFinisher(p: Profile, day: DayType) {
  if (!p.cardio) return null
  if (day === 'Rest/Cardio') return p.goal === 'fat_loss' ? '30–40 min incline walk (3.0 mph, 10–12%) or bike' : '20–30 min easy cardio — walk, bike, or StairMaster'
  const mins = p.goal === 'fat_loss' ? '15–20' : p.goal === 'conditioning' ? '12–15' : '8–12'
  return `${mins} min incline walk or StairMaster at a steady, conversational pace`
}

// ---------- progressive overload ----------
export interface Recommendation {
  last: { date: string; sets: { weight: number; reps: number; rpe?: number }[] } | null
  action: 'add_weight' | 'add_reps' | 'repeat' | 'start'
  weight: number | null
  text: string
}

export function lastLift(exId: string, logs: WorkoutLog[], before?: string) {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  for (const l of sorted) {
    if (before && l.date >= before) continue
    const en = l.entries.find((x) => x.exId === exId && x.sets.length)
    if (en) return { date: l.date, sets: en.sets }
  }
  return null
}

export function recommend(ex: Exercise, logs: WorkoutLog[], before?: string): Recommendation {
  const last = lastLift(ex.id, logs, before)
  if (!last) return { last, action: 'start', weight: null, text: `Pick a weight you can do for ${ex.reps[0]}–${ex.reps[1]} clean reps with 2 in the tank.` }
  const top = Math.max(...last.sets.map((s) => s.weight))
  const working = last.sets.filter((s) => s.weight >= top * 0.9)
  const hitTop = working.every((s) => s.reps >= ex.reps[1])
  const missed = working.some((s) => s.reps < ex.reps[0])
  const rpes = working.map((s) => s.rpe).filter((r): r is number => typeof r === 'number')
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 8
  if (hitTop && avgRpe <= 9.5) {
    return { last, action: 'add_weight', weight: top + (ex.inc || 0), text: ex.inc ? `You hit ${ex.reps[1]} reps on every set. Add ${ex.inc} lb.` : `You hit ${ex.reps[1]} reps. Add reps, a pause, or a slower lowering.` }
  }
  if (missed) return { last, action: 'repeat', weight: top, text: `You missed the bottom of the range last time. Repeat ${top} lb and own every rep.` }
  return { last, action: 'add_reps', weight: top, text: `Stay at ${top} lb and push for ${ex.reps[1]} reps on every set before adding weight.` }
}

export const emptySets = (n: number, weight: number | null): SetEntry[] =>
  Array.from({ length: n }, () => ({ weight: weight == null ? '' : String(weight), reps: '', rpe: '' }))

export const e1rm = (w: number, r: number) => Math.round(w * (1 + r / 30))

// ---------- streaks / completion ----------
export function streak(d: AppData, today = todayISO()) {
  const p = d.profile
  if (!p) return 0
  let n = 0
  let cur = today
  for (let i = 0; i < 400; i++) {
    const done = !!d.checkins[cur]?.done
    if (done) n++
    else if (cur !== today && isTrainingDay(cur, p)) break
    cur = addDays(cur, -1)
  }
  return n
}

export function weekCounts(d: AppData, weeks = 8, today = todayISO()) {
  const out: { label: string; count: number }[] = []
  const t = fromISO(today)
  const startOfWeek = addDays(today, -t.getDay())
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(startOfWeek, -7 * w)
    let count = 0
    for (let i = 0; i < 7; i++) if (d.checkins[addDays(start, i)]?.done) count++
    out.push({ label: start.slice(5), count })
  }
  return out
}

// ---------- community (demo data is seeded + deterministic) ----------
export function groupStats(id: string, rate: number, members: number, date: string, mineDone: boolean) {
  const jitter = ((hash(id + date) % 100) / 100 - 0.5) * 0.12
  const pct = Math.min(0.98, Math.max(0.3, rate + jitter))
  const done = Math.round(members * pct) + (mineDone ? 1 : 0)
  return { pct: Math.round((done / (members + 1)) * 100), done, members: members + 1 }
}

// ---------- nutrition ----------
export interface Macros { cal: number; p: number; c: number; f: number }
export function macroPlan(p: Profile): Record<CarbDay, Macros> {
  const maint = p.weight * 15
  const adj: Record<Goal, number> = { fat_loss: -0.2, muscle_gain: 0.1, maintenance: 0, strength: 0.05, conditioning: 0 }
  const base = maint * (1 + adj[p.goal])
  const protein = Math.round(Math.max(p.weight, p.goal === 'fat_loss' ? p.target : p.weight) * 1)
  const fat = Math.round(p.weight * 0.35)
  const mk = (mult: number, fatMult: number): Macros => {
    const cal = Math.round(base * mult)
    const f = Math.round(fat * fatMult)
    const c = Math.max(40, Math.round((cal - protein * 4 - f * 9) / 4))
    return { cal: protein * 4 + f * 9 + c * 4, p: protein, c, f }
  }
  return { low: mk(0.92, 1.25), medium: mk(1, 1), high: mk(1.1, 0.8) }
}
export const carbDayFor = (day: DayType): CarbDay => (day === 'Legs' || day === 'Full Body' ? 'high' : day === 'Rest/Cardio' ? 'low' : 'medium')

export const MEALS: Record<CarbDay, { id: string; name: string; example: string }[]> = {
  low: [
    { id: 'b', name: 'Breakfast', example: '3-egg scramble, turkey sausage, spinach, avocado' },
    { id: 'l', name: 'Lunch', example: 'Chicken salad bowl, olive oil, feta, berries' },
    { id: 's', name: 'Snack', example: 'Greek yogurt + almonds' },
    { id: 'd', name: 'Dinner', example: 'Salmon, roasted broccoli, big side salad' },
  ],
  medium: [
    { id: 'b', name: 'Breakfast', example: 'Oatmeal, whey protein, banana, peanut butter' },
    { id: 'l', name: 'Lunch', example: 'Chicken, rice, mixed veggies' },
    { id: 's', name: 'Snack', example: 'Protein shake + apple' },
    { id: 'd', name: 'Dinner', example: 'Lean beef, potatoes, green beans' },
  ],
  high: [
    { id: 'b', name: 'Breakfast', example: 'Egg-white omelet, 2 toast, fruit, oats' },
    { id: 'l', name: 'Pre-workout', example: 'Rice cakes, honey, banana, whey' },
    { id: 's', name: 'Post-workout', example: 'Chicken, white rice, veggies' },
    { id: 'd', name: 'Dinner', example: 'Turkey pasta bowl, olive oil, side salad' },
  ],
}
