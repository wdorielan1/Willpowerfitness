import { EXERCISES, SPLIT } from './data'
import { EQUIP_KINDS, equipKind, equipUse, gearRank } from './equipment'
import type { BodyArea, AppData, CarbDay, DayType, EquipKind, EquipUse, Exercise, Gear, Goal, Level, Profile, SetEntry, Settings, WorkoutFocus, WorkoutLog } from './types'

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
const available = (ex: Exercise, gear: Gear) => gearRank[ex.gear] <= gearRank[gear]
/** A few lifts exist under the same name (a full-body variant), so hiding one hides its twins too. */
const hiddenNames = new WeakMap<object, Set<string>>()
export function isHidden(ex: Exercise, p: Pick<Profile, 'hidden'>) {
  if (!p.hidden) return false
  if (p.hidden[ex.id]) return true
  let names = hiddenNames.get(p.hidden)
  if (!names) { names = new Set(Object.keys(p.hidden).map((id) => EXERCISES.find((e) => e.id === id)?.name.toLowerCase()).filter((n): n is string => !!n)); hiddenNames.set(p.hidden, names) }
  return names.has(ex.name.toLowerCase())
}
/** Within their gear, not hidden, and not on a kind of equipment they said they never use (stretches don't need equipment). */
const allowed = (ex: Exercise, p: Profile) => available(ex, p.gear) && !isHidden(ex, p) && (!!ex.mobility || equipUse(p, ex) !== 'never')

/**
 * The profile a plan for `date` is built from. A lift hidden today (or later) still counts as planned today, so hiding
 * one in the middle of a workout never reshuffles the other lifts; it is just removed for the day.
 */
const planProfile = (p: Profile, date: string, at: 'gym' | 'home' = 'gym'): Profile => {
  // equipment changed in the middle of today's workout: today keeps the old choices, so a lift already done can't drop out of the plan
  const q0 = p.equipSince === date ? { ...p, equip: p.equipWas } : p
  const q = at === 'home' ? homeProfile(q0) : q0
  if (!q.hidden) return q
  const before = Object.fromEntries(Object.entries(q.hidden).filter(([, since]) => since < date))
  return Object.keys(before).length === Object.keys(q.hidden).length ? q : { ...q, hidden: before }
}

/**
 * On how many different days in the last two months a lift the app suggested was removed or swapped away,
 * counting up to the day before `before`. Lifts they said to keep don't count. This is read from what they already did
 * (the removed and swapped records), so nothing extra is stored.
 */
export function skipCounts(d: AppData, before: string, days = 60): Record<string, number> {
  const from = addDays(before, -days)
  const kept = new Set(d.profile?.kept ?? [])
  const seen: Record<string, Set<string>> = {}
  const mark = (id: string, date: string) => { if (date >= from && date < before && !kept.has(id) && !d.atHome?.[date]) (seen[id] ??= new Set()).add(date) } // a day at home swaps gym lifts out because of where they were, not what they like
  for (const [date, ids] of Object.entries(d.removed ?? {})) for (const id of ids) mark(id, date)
  for (const [key, to] of Object.entries(d.swaps ?? {})) { const [date, id] = key.split('|'); if (to !== id) mark(id, date) }
  return Object.fromEntries(Object.entries(seen).map(([id, dates]) => [id, dates.size]))
}
/** The planned lifts they removed or swapped away on `date` (original ids). This is what "skipped" means in the middle of a workout. */
export function skippedOn(d: AppData, date: string): string[] {
  const out = new Set<string>(d.removed?.[date] ?? [])
  for (const [key, to] of Object.entries(d.swaps ?? {})) { const [day, id] = key.split('|'); if (day === date && to !== id) out.add(id) }
  return [...out]
}

export type SkipRead = { kind: 'where' } | { kind: 'equip'; equip: EquipKind } | { kind: 'mixed' }
/**
 * What the lifts skipped in one workout say. Two that need a gym, for someone who set up a full gym: "are you at the gym today?"
 * (once they say they are, `atGym`, the same lifts are read again as a matter of equipment). Two of one kind of equipment: do they
 * use it? Otherwise there is no pattern, so the answer is to look at their equipment.
 */
export function readSkips(skipped: Exercise[], p: Profile, atGym = false): SkipRead {
  if (!atGym && p.gear === 'gym' && skipped.filter((x) => x.gear === 'gym').length >= 2) return { kind: 'where' }
  const counts = new Map<EquipKind, number>()
  for (const x of skipped) counts.set(equipKind(x), (counts.get(equipKind(x)) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top && top[1] >= 2 ? { kind: 'equip', equip: top[0] } : { kind: 'mixed' }
}
export const kindLabel = (k: EquipKind) => (EQUIP_KINDS.find((x) => x.id === k)?.label ?? k).toLowerCase()
/** One step less often: Often becomes Sometimes, Sometimes becomes Never. */
export const stepDown = (u: EquipUse): EquipUse => (u === 'often' ? 'sometimes' : 'never')
/** The same person at home: no gym equipment, so dumbbells and bodyweight (kettlebells and bands stay as they chose). */
export const homeProfile = (p: Profile): Profile => (p.gear === 'gym' ? { ...p, gear: 'db' } : p)
/**
 * Where a day's plan is built for: the place stamped when that day's workout started, otherwise their last choice (from today on;
 * earlier days have no say, so history never changes). Someone set up for dumbbells or bodyweight is never "at a gym".
 */
export const placeFor = (d: AppData, date: string): 'gym' | 'home' =>
  d.profile?.gear !== 'gym' ? 'gym' : d.planPlace?.[date] ?? (date >= todayISO() ? d.place?.at : undefined) ?? 'gym'
/**
 * Saves where they say they train. If that day's workout is already under way, today's plan is stamped with the place it was built
 * for first, so the new choice only applies from the next plan and can't reshuffle lifts they have already worked on.
 */
export const withPlace = (d: AppData, at: 'gym' | 'home', date: string): AppData => ({
  ...d, place: { at, date },
  ...((d.started?.[date] || d.drafts?.[date]) && !d.planPlace?.[date] ? { planPlace: { ...d.planPlace, [date]: placeFor(d, date) } } : {}),
})
/** The profile Swap, Add and the plan use for a day: at home means no gym equipment. */
export const profileFor = (d: AppData, date: string): Profile => (placeFor(d, date) === 'home' ? homeProfile(d.profile!) : d.profile!)

const avoided = (ex: Exercise, avoid: string) => {
  const words = avoid.toLowerCase().split(/[,;\n]/).map((w) => w.trim()).filter((w) => w.length > 2)
  const hay = `${ex.name} ${ex.muscle}`.toLowerCase()
  return words.some((w) => hay.includes(w))
}
const LEVEL_NUM: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 }
const levelOk = (x: Exercise, p: Profile) => !x.lib || (x.lvl ?? 0) <= LEVEL_NUM[p.level]
/** Muscles a day is mainly about: its key lifts come from these first. */
const DAY_MUSCLES: Partial<Record<DayType, string[]>> = {
  Push: ['Chest', 'Upper chest'], Pull: ['Lats', 'Mid back', 'Back'], Legs: ['Quads', 'Hamstrings', 'Glutes', 'Legs'], 'Shoulders/Abs': ['Shoulders', 'Side delts'],
}
const MUST_HAVE: Partial<Record<DayType, string[]>> = { Push: ['Triceps'], Pull: ['Biceps'], Legs: ['Hamstrings'], 'Shoulders/Abs': ['Abs'] }

/** Body parts someone can ask to emphasise, and which exercise muscle labels count toward each. */
export const BODY_AREAS: { id: BodyArea; label: string; match: RegExp }[] = [
  { id: 'chest', label: 'Chest', match: /chest/i },
  { id: 'back', label: 'Back', match: /lats|back|traps/i },
  { id: 'shoulders', label: 'Shoulders', match: /shoulders|delts/i },
  { id: 'arms', label: 'Arms', match: /biceps|triceps|forearms|arms/i },
  { id: 'abs', label: 'Abs', match: /abs|core/i },
  { id: 'glutes', label: 'Glutes', match: /glutes|hips|posterior/i },
  { id: 'legs', label: 'Legs', match: /quads|hamstrings|calves|legs/i },
]
export const MAX_FOCUS = 3
const focusAreas = (p: Profile) => BODY_AREAS.filter((a) => p.focus?.includes(a.id))
/** Does this exercise work a body part the person asked to emphasise? */
export const inFocus = (x: Exercise, p: Profile) => focusAreas(p).some((a) => a.match.test(x.muscle))

/** How well a library exercise suits your goal and level (higher goes earlier). */
function affinity(x: Exercise, p: Profile): number {
  const eq = x.equip ?? ''
  let s = 0
  if (p.goal === 'strength') { if (x.compound) s += 3; if (eq === 'barbell') s += 2 }
  else if (p.goal === 'muscle_gain') { if (eq === 'cable' || eq === 'machine' || eq === 'dumbbell') s += 1; if (x.compound) s += 1 }
  else if (p.goal === 'fat_loss') { if (x.compound) s += 3; if (eq === 'kettlebells' || eq === 'body only') s += 1 }
  else if (p.goal === 'conditioning') { if (eq === 'kettlebells' || eq === 'body only' || eq === 'bands') s += 3; if (x.compound) s += 2 }
  else if (x.compound) s += 1
  if (p.level === 'beginner') { if (eq === 'machine' || eq === 'body only') s += 1; if (eq === 'barbell') s -= 1 }
  if (p.level === 'advanced' && x.lvl === 2) s += 1
  return s
}

/** Exercises that fit this day, your equipment (of the given kinds of use), your level and your exclusions. Hand-tuned ones come first, then the library. */
function dayPool(day: DayType, p: Profile, uses: EquipUse[]): Exercise[] {
  const fits = (x: Exercise) => !x.mobility && allowed(x, p) && uses.includes(equipUse(p, x)) && !avoided(x, p.avoid)
  const core = EXERCISES.filter((x) => !x.lib && x.day === day && fits(x))
  const lib = EXERCISES.filter((x) => x.lib && fits(x) && levelOk(x, p) && (day === 'Full Body' ? x.compound && x.day !== 'Shoulders/Abs' && x.day !== 'Full Body' : x.day === day))
    .sort((a, b) => affinity(b, p) - affinity(a, p) || hash(a.id) - hash(b.id))
  return [...core, ...lib]
}

/** What a workout is built from: the equipment they use often. Only when that leaves too little does equipment marked "sometimes" fill in. */
function candidates(day: DayType, p: Profile): Exercise[] {
  const often = dayPool(day, p, ['often'])
  if (often.length >= 3) return often
  const more = dayPool(day, p, ['often', 'sometimes'])
  if (more.length >= 3) return more
  return EXERCISES.filter((x) => !x.mobility && x.day === day && allowed(x, p))
}

/**
 * Equipment marked "sometimes" fills about one lift in five: here and there one accessory is swapped for a lift on
 * that equipment that trains the same muscle, and which one rotates with the accessory schedule.
 */
function withSometimes(keys: Exercise[], accessories: Exercise[], day: DayType, p: Profile, period: number, muscles: string[] | null): Exercise[] {
  const total = keys.length + accessories.length
  const room = Math.round(total / 5) - [...keys, ...accessories].filter((x) => equipUse(p, x) === 'sometimes').length
  if (room <= 0 || !accessories.length) return accessories
  const chosen = new Set([...keys, ...accessories].map((x) => x.id))
  const taken = namesOf([...chosen])
  const pool = dayPool(day, p, ['sometimes']).filter((x) => !chosen.has(x.id) && !taken.has(x.name.toLowerCase()) && (!muscles || muscles.includes(x.muscle)))
  const out = [...accessories]
  for (let n = 0; n < room; n++) {
    const slots = out.map((a, i) => i).filter((i) => equipUse(p, out[i]) !== 'sometimes' && pool.some((x) => x.muscle === out[i].muscle))
    if (!slots.length) break
    const slot = slots[(period + n + hash(day)) % slots.length]
    const same = pool.filter((x) => x.muscle === out[slot].muscle)
    const lighter = same.filter((x) => !x.compound)
    const pick = (lighter.length ? lighter : same)[(period + n) % (lighter.length ? lighter : same).length]
    out[slot] = pick
    pool.splice(pool.indexOf(pick), 1)
  }
  return out
}

/** Week number since you started training, turned into rotation steps. Key lifts change every 4 weeks; accessories on your setting. */
function rotationFor(date: string, d: AppData) {
  const mode = d.settings?.rotation ?? 'biweekly'
  const first = d.logs.filter((l) => !l.baseline && !l.imported && l.dayType !== 'Rest/Cardio').map((l) => l.date).sort()[0] ?? date
  const weeks = Math.max(0, Math.floor((fromISO(date).getTime() - fromISO(first).getTime()) / 86400000 / 7))
  if (mode === 'never') return { block: 0, period: 0 }
  const every = mode === 'weekly' ? 1 : mode === 'monthly' ? 4 : 2
  return { block: Math.floor(weeks / 4), period: Math.floor(weeks / every) }
}

/** Interleave exercises by muscle so neighbours work different muscles. */
function interleave(list: Exercise[]): Exercise[] {
  const groups = new Map<string, Exercise[]>()
  for (const x of list) groups.set(x.muscle, [...(groups.get(x.muscle) ?? []), x])
  const out: Exercise[] = []
  for (let i = 0; out.length < list.length; i++) for (const g of groups.values()) if (g[i]) out.push(g[i])
  return out
}

function pickKeys(all: Exercise[], day: DayType, block: number, focused: string[] | null): Exercise[] {
  const main = focused ?? DAY_MUSCLES[day]
  const isKey = (x: Exercise) => x.key || (x.lib && x.compound)
  const first = all.filter((x) => isKey(x) && (!main || main.includes(x.muscle) || day === 'Full Body'))
  const others = all.filter((x) => isKey(x) && !first.includes(x))
  // hand-tuned key lifts first; library lifts follow, alternating muscles
  const core = first.filter((x) => !x.lib), lib = first.filter((x) => x.lib)
  const pool = [...core, ...(day === 'Full Body' ? interleaveByDay(lib) : lib), ...others]
  if (!pool.length) return all.filter((x) => x.key).slice(0, 2)
  const out: Exercise[] = []
  for (let i = 0; i < 2 && out.length < Math.min(2, pool.length); i++) {
    const c = pool[(block * 2 + i) % pool.length]
    if (!out.includes(c)) out.push(c)
  }
  return out
}
function interleaveByDay(list: Exercise[]): Exercise[] {
  const by: Record<string, Exercise[]> = {}
  for (const x of list) (by[x.day] ??= []).push(x)
  const out: Exercise[] = []
  const lists = Object.values(by)
  for (let i = 0; out.length < list.length; i++) for (const g of lists) if (g[i]) out.push(g[i])
  return out
}

function pickAccessories(rest: Exercise[], mustHave: string[], period: number, n: number): Exercise[] {
  const groups = new Map<string, Exercise[]>()
  for (const x of rest) groups.set(x.muscle, [...(groups.get(x.muscle) ?? []), x])
  const out: Exercise[] = []
  const take = (list: Exercise[], k: number) => { const x = list[(period + k) % list.length]; if (x && !out.includes(x)) out.push(x) }
  mustHave.forEach((m, i) => { const g = groups.get(m); if (g && out.length < n) take(g, i) })
  const order = [...groups.keys()].filter((m) => !mustHave.includes(m))
  for (let k = 0; out.length < Math.min(n, rest.length) && k < order.length + n; k++) {
    const m = order[(period + k) % Math.max(1, order.length)]
    const g = groups.get(m)
    if (g) take(g, k)
  }
  return out
}

/** Library exercises get sets, reps and rest that suit your goal. Hand-tuned ones keep their own numbers. */
function tune(ex: Exercise, p: Profile): Exercise {
  if (!ex.lib || ex.mobility) return ex
  const comp = !!ex.compound, bw = ex.gear === 'bw' || ex.muscle === 'Abs'
  let reps = ex.reps, sets = ex.sets, rest = ex.rest
  if (p.goal === 'strength') { reps = comp && !bw ? [3, 6] : bw ? [8, 15] : [8, 12]; if (comp && !bw) { sets = 4; rest = 180 } }
  else if (p.goal === 'fat_loss') { reps = comp ? [8, 12] : [12, 20]; rest = comp ? 75 : 45 }
  else if (p.goal === 'conditioning') { reps = [12, 20]; rest = 45 }
  else if (p.goal === 'maintenance') { reps = comp ? [8, 12] : [10, 15] }
  return reps === ex.reps && sets === ex.sets && rest === ex.rest ? ex : { ...ex, reps, sets, rest }
}

export function isTrainingDay(date: string, p: Profile) {
  return p.days.includes(fromISO(date).getDay())
}

/** Next day in the Push/Pull/Legs/Shoulders/Full Body rotation, based on the last logged session. */
export function dayTypeFor(date: string, p: Profile, logs: WorkoutLog[]): DayType {
  if (!isTrainingDay(date, p)) return 'Rest/Cardio'
  const done = logs.filter((l) => l.date === date && l.dayType !== 'Rest/Cardio' && !l.baseline)
  if (done.length) return done[done.length - 1].dayType
  const prior = [...logs].filter((l) => l.date < date && (l.rotationDay ?? l.dayType) !== 'Rest/Cardio' && !l.baseline).sort((a, b) => a.date.localeCompare(b.date))
  const last = prior[prior.length - 1]
  if (!last) return SPLIT[0]
  return SPLIT[(SPLIT.indexOf(last.rotationDay ?? last.dayType) + 1) % SPLIT.length]
}

/** Today's workout type, honouring a manual switch. */
export const dayFor = (date: string, d: AppData): DayType =>
  d.dayOverride?.[date] ?? dayTypeFor(date, d.profile!, d.logs)

export interface PlannedExercise { ex: Exercise; sets: number; swapped: boolean; orig: string; /** why this lift is here when a focus area put it there */ focus?: string }

/** The usual number of lifts in a workout for each level. */
export const DEFAULT_LIFTS: Record<Level, number> = { beginner: 4, intermediate: 5, advanced: 6 }
export const MIN_LIFTS = 4, MAX_LIFTS = 8
const NOUN: Record<string, string> = { Legs: 'leg', Chest: 'chest', Back: 'back', Shoulders: 'shoulder', Arms: 'arm', Abs: 'ab', Glutes: 'glute' }

export const workoutName = (day: DayType, focus?: WorkoutFocus) =>
  day === 'Push' && focus === 'chest-triceps' ? 'Chest + Triceps' : day === 'Pull' && focus === 'back-biceps' ? 'Back + Biceps' : focus === 'custom' ? 'Custom workout' : day === 'Shoulders/Abs' ? 'Shoulders + Abs' : day === 'Rest/Cardio' ? 'Cardio' : day

export function generateWorkout(date: string, d: AppData, short: boolean, forceDay?: DayType, forceFocus?: WorkoutFocus) {
  const p = planProfile(d.profile!, date, placeFor(d, date))
  const day = forceDay ?? dayFor(date, d)
  if (day === 'Rest/Cardio') return { day, items: [] as PlannedExercise[] }
  const focus = forceDay === undefined ? d.workoutFocus?.[date] : forceFocus
  const focusedMuscles = day === 'Push' && focus === 'chest-triceps' ? ['Chest', 'Upper chest', 'Triceps']
    : day === 'Pull' && focus === 'back-biceps' ? ['Back', 'Lats', 'Mid back', 'Biceps'] : null
  // lifts they have turned away on two or more earlier days go to the back of the line (still there if nothing else fits, never hidden)
  const skips = skipCounts(d, date)
  const pool = focusedMuscles
    ? candidates(day, p).filter((x) => focusedMuscles.includes(x.muscle))
    : candidates(day, p)
  const all = [...pool.filter((x) => (skips[x.id] ?? 0) < 2), ...pool.filter((x) => (skips[x.id] ?? 0) >= 2)]
  const { block, period } = rotationFor(date, d)
  // muscles the person asked to emphasise that today's session can train, so their accessories come first
  const focusToday = [...new Set(all.filter((x) => !x.key && inFocus(x, p)).map((x) => x.muscle))].slice(0, 2)
  const baseMust = focusedMuscles ? [focusedMuscles[focusedMuscles.length - 1]] : MUST_HAVE[day] ?? []
  const mustHave = [...new Set([...focusToday, ...baseMust])]
  const wantsFocus = focusAreas(p).length > 0
  const keys = pickKeys(all, day, block, focusedMuscles)
  // their own count (4 to 8) is the whole workout, so a focus extra takes a spot instead of adding one; without it the usual counts apply
  const wanted = p.lifts ? Math.min(MAX_LIFTS, Math.max(MIN_LIFTS, Math.round(p.lifts))) : null
  const nAcc = wanted && !short ? Math.max(1, wanted - keys.length) : (short ? 1 : p.level === 'beginner' ? 2 : p.level === 'advanced' ? 4 : 3) + (wantsFocus && !short && focusToday.length ? 1 : 0)
  const why = new Map<string, string>() // lifts a focus area put in the workout, and why
  // accessories prefer single-joint and bodyweight work, so they add to the main lifts instead of repeating them
  const leftover = all.filter((x) => !keys.includes(x) && !x.key)
  const lighter = leftover.filter((x) => !x.lib || !x.compound)
  const accessories = withSometimes(keys, pickAccessories(lighter.length > nAcc ? lighter : leftover, mustHave, period, nAcc), day, p, period, focusedMuscles)
  // a focus body part that today's session doesn't train yet gets one add-on exercise (rotating by week), e.g. abs or glutes on a push day
  if (wantsFocus && !short && !focusedMuscles && day !== 'Full Body') {
    const chosen = [...keys, ...accessories]
    const unmet = focusAreas(p).filter((a) => !chosen.some((x) => a.match.test(x.muscle)))
    if (unmet.length) {
      const area = unmet[(period + hash(day)) % unmet.length]
      const fits = (x: Exercise) => !x.mobility && allowed(x, p) && !avoided(x, p.avoid) && levelOk(x, p) && x.day !== 'Full Body' && area.match.test(x.muscle) && !chosen.includes(x)
      const often = (x: Exercise) => Number(equipUse(p, x) !== 'often')
      const pool = EXERCISES.filter(fits).sort((a2, b2) => often(a2) - often(b2) || Number(!!a2.compound) - Number(!!b2.compound) || affinity(b2, p) - affinity(a2, p) || hash(a2.id) - hash(b2.id))
      const pickOne = pool.length ? pool[(period + hash(day)) % Math.min(pool.length, 8)] : undefined
      if (pickOne) {
        if (wanted && !short) accessories.pop()
        accessories.push(pickOne)
        why.set(pickOne.id, `Extra ${NOUN[area.label] ?? area.label.toLowerCase()} work added because ${area.label} is your focus.`)
      }
    }
  }
  const strengthBias = p.style === 'strength' || p.goal === 'strength'
  const removed = d.removed?.[date] ?? []
  const build = (ex0: Exercise) => {
    const swap = d.swaps[`${date}|${ex0.id}`]
    const ex = tune(swap ? EXERCISES.find((x) => x.id === swap) ?? ex0 : ex0, p)
    let sets = ex.sets + (strengthBias && ex.key ? 1 : 0) + (!ex.key && inFocus(ex, p) && p.level !== 'beginner' ? 1 : 0) - (p.level === 'beginner' ? 1 : 0)
    if (short) sets -= 1
    const area = !ex.key && p.level !== 'beginner' ? focusAreas(p).find((a) => a.match.test(ex.muscle)) : undefined
    const note = ex.id === ex0.id ? why.get(ex0.id) ?? (area ? `One extra set because ${area.label} is your focus.` : undefined) : undefined
    return { ex, sets: Math.max(2, sets), swapped: ex.id !== ex0.id, orig: ex0.id, ...(note ? { focus: note } : {}) }
  }
  const customIds = focus === 'custom' ? (d.customSession?.[date] ?? []) : null
  const picked = customIds ? customIds.map((id) => EXERCISES.find((x) => x.id === id)).filter((x): x is Exercise => !!x && !isHidden(x, p)) : null
  const base = (picked ?? [...keys, ...accessories]).map(build).filter((i) => !removed.includes(i.orig) && !removed.includes(i.ex.id))
  const extras = (d.extras?.[date] ?? [])
    .map((id) => EXERCISES.find((x) => x.id === id))
    .filter((x): x is Exercise => !!x && !base.some((i) => i.ex.id === x.id))
    .map((ex) => { const t = tune(ex, p); return { ex: t, sets: t.sets, swapped: false, orig: ex.id } })
  return { day, items: [...base, ...extras] as PlannedExercise[] }
}

/** A few lifts exist twice under one name (a full-body variant), so never offer a lift that shares a name with one already in the workout. */
const namesOf = (ids: string[]) => new Set(ids.map((id) => EXERCISES.find((e) => e.id === id)?.name.toLowerCase()))

/** What someone has done, saved and turned away before, so lists can put familiar lifts first. */
export interface History { logs: WorkoutLog[]; saved?: { ids: string[] }[]; today?: string; skips?: Record<string, number> }
export const historyOf = (d: AppData): History => ({ logs: d.logs, saved: d.myWorkouts, skips: skipCounts(d, addDays(todayISO(), 1)) })

/** How many days a lift was logged on and how long ago the last one was, and which lifts are in a saved workout. */
function usage(h: History) {
  const today = h.today ?? todayISO()
  const done = new Map<string, { days: number; ago: number }>()
  for (const l of h.logs) {
    if (l.skipped) continue
    const ago = Math.max(0, Math.round((fromISO(today).getTime() - fromISO(l.date).getTime()) / 86400000))
    for (const e of l.entries) {
      if (!e.sets.length) continue
      const was = done.get(e.exId)
      done.set(e.exId, { days: (was?.days ?? 0) + 1, ago: Math.min(was?.ago ?? Infinity, ago) })
    }
  }
  const saved = new Set((h.saved ?? []).flatMap((w) => w.ids))
  return { done, saved }
}

/**
 * Best first. In order of weight: the lift fits what you are doing (the muscle you are swapping, or today's session),
 * then equipment you use often (sometimes counts a little), then the hand-tuned basics, then what you do: lifts in a
 * workout you saved count most, then lifts you finish (more the more often, and the longer since the last one the
 * better), and lifts you keep turning away count against. Lifts above your level and ones that suit your goal nudge
 * the order. `fit` is how well a lift matches the spot, worth the most.
 */
function ranked(list: Exercise[], p: Profile, h: History, fit: (x: Exercise) => number): Exercise[] {
  const { done, saved } = usage(h)
  const score = (x: Exercise) => {
    let s = fit(x)
    s += equipUse(p, x) === 'often' ? 200 : 50
    if (!x.lib) s += 60
    const did = done.get(x.id)
    s += did ? 40 + Math.min(did.days, 5) * 6 + Math.min(did.ago, 30) / 30 * 20 : 12
    if (saved.has(x.id)) s += 80
    s -= 70 * Math.min(h.skips?.[x.id] ?? 0, 3)
    if (x.lib && (x.lvl ?? 0) > LEVEL_NUM[p.level]) s -= 150
    return s + affinity(x, p) * 5
  }
  const scores = new Map(list.map((x) => [x.id, score(x)]))
  return [...list].sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.name.localeCompare(b.name))
}

/** Alternatives for an exercise, best first: the same muscle, then anything else from the same day, all within your equipment. */
export function swapOptions(ex: Exercise, current: string[], p: Profile, h: History = { logs: [] }) {
  const taken = namesOf(current)
  const ok = (x: Exercise) => x.id !== ex.id && !x.mobility && !current.includes(x.id) && !taken.has(x.name.toLowerCase()) && allowed(x, p) && !avoided(x, p.avoid)
  const muscle = ex.muscle.split('/')[0]
  const pool = EXERCISES.filter((x) => ok(x) && (x.muscle.split('/')[0] === muscle || x.day === ex.day))
  const heavy = (x: Exercise) => x.compound ?? !!x.key // hand-tuned lifts mark their main lifts with key instead
  return ranked(pool, p, h, (x) => (x.muscle.split('/')[0] === muscle ? 1000 : 400) + (heavy(x) === heavy(ex) ? 30 : 0))
}

/**
 * The lift a right swipe adds after `ex`: more of the same muscle. The exception is a lift that is only in the workout as an extra
 * for a focus area (leg work on a shoulders and abs day): swiping on that must not pull in more of that muscle, so it adds the best
 * fit for the session itself instead.
 */
export function addAfterPick(ex: Exercise, current: string[], p: Profile, h: History, day: DayType): Exercise | undefined {
  const offSession = day !== 'Full Body' && day !== 'Rest/Cardio' && ex.day !== day
  return offSession ? addableExercises(current, p, h, day).find((x) => !x.mobility) : swapOptions(ex, current, p, h)[0]
}

/** Every exercise you could add to today's workout. Give it your history and the session's day to get the best fits first. */
export function addableExercises(current: string[], p: Profile, h?: History, day?: DayType) {
  const taken = namesOf(current)
  const list = EXERCISES.filter((x) => !current.includes(x.id) && !taken.has(x.name.toLowerCase()) && allowed(x, p) && !avoided(x, p.avoid))
  if (!h) return list
  const fit = (x: Exercise) => (!day || day === 'Rest/Cardio' ? 0 : day === 'Full Body' ? (x.compound && !x.mobility ? 600 : 0) : x.day === day ? 1000 : 0) + (x.mobility ? -2000 : 0)
  return ranked(list, p, h, fit)
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

/** Fresh sets for an exercise: the same weight on every set and the top of the rep range, ready to be logged. */
export const emptySets = (n: number, weight: number | null, reps = ''): SetEntry[] =>
  Array.from({ length: n }, () => ({ weight: weight == null ? '' : String(weight), reps, rpe: '' }))

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
/** Daily targets for a low, medium and high carb day. Protein and fat follow your settings, carbs fill the rest. */
export function macroPlan(p: Profile, n: Settings['nutrition'] = { meals: 4, proteinPerLb: 1, fatPerLb: 0.35, calorieAdjust: 0 }): Record<CarbDay, Macros> {
  // rough maintenance calories per lb; people who haven't said (older accounts) keep the previous number
  const maint = p.weight * (p.sex === 'female' ? 13.5 : p.sex === 'other' ? 14.25 : 15)
  const adj: Record<Goal, number> = { fat_loss: -0.2, muscle_gain: 0.1, maintenance: 0, strength: 0.05, conditioning: 0 }
  const base = maint * (1 + adj[p.goal]) + n.calorieAdjust
  const protein = Math.round((p.goal === 'fat_loss' ? Math.min(p.weight, p.target || p.weight) : p.weight) * n.proteinPerLb)
  const fat = Math.round(p.weight * n.fatPerLb)
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

// ---------- rest timing: bigger muscles and heavy main lifts get longer rests ----------
export type MuscleSize = 'small' | 'medium' | 'large'
const SIZE: Record<string, MuscleSize> = {
  Chest: 'large', 'Upper chest': 'large', Back: 'large', Lats: 'large', Quads: 'large', Hamstrings: 'large',
  'Quads/Glutes': 'large', 'Posterior chain': 'large', 'Full body': 'large', Legs: 'large',
  Shoulders: 'medium', 'Mid back': 'medium', Traps: 'medium',
  Triceps: 'small', Biceps: 'small', 'Side delts': 'small', 'Rear delts': 'small', Calves: 'small', Abs: 'small', Arms: 'small', Forearms: 'small', Neck: 'small', Hips: 'medium', 'Lower back': 'medium', Glutes: 'large',
}
export const muscleSize = (muscle: string): MuscleSize => SIZE[muscle] ?? 'medium'
export function restFor(ex: Exercise, s: Settings['rest']): number {
  const size = muscleSize(ex.muscle)
  return s[size] + (ex.key && size !== 'small' ? s.keyBonus : 0)
}
export const fmtRest = (sec: number) => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`)

// ---------- weekly lifting schedule ----------
export type DayStatus = 'done' | 'missed' | 'skipped' | 'today' | 'upcoming' | 'rest'
export interface WeekDay { date: string; label: string; planned: DayType; status: DayStatus; logged?: WorkoutLog }

/** Monday to Sunday of this week: what you planned, what you did, and what you missed.
 *  A missed workout does not move your split forward, so it comes back as the next one on your plan. */
export function weekSchedule(d: AppData, today = todayISO()): WeekDay[] {
  const p = d.profile!
  const start = addDays(today, -((fromISO(today).getDay() + 6) % 7))
  const before = [...d.logs].filter((l) => l.date < start && !l.baseline && (l.rotationDay ?? l.dayType) !== 'Rest/Cardio').sort((a, b) => b.date.localeCompare(a.date))[0]
  let cursor: DayType | null = before ? before.rotationDay ?? before.dayType : null
  const next = () => SPLIT[cursor ? (SPLIT.indexOf(cursor) + 1) % SPLIT.length : 0]
  // days before your first activity were never "missed" (new users start fresh)
  const origin = [...d.logs.map((l) => l.date), ...Object.keys(d.checkins)].sort()[0] ?? today
  const out: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i)
    const label = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]
    const log = d.logs.find((l) => l.date === date && !l.baseline && l.dayType !== 'Rest/Cardio')
    if (log) { out.push({ date, label, planned: log.dayType, status: log.skipped ? 'skipped' : 'done', logged: log }); if ((log.rotationDay ?? log.dayType) !== 'Rest/Cardio') cursor = log.rotationDay ?? log.dayType; continue }
    // a workout the person moved here (or chose for today) wins over the rotation, from today on
    const moved = date >= today ? d.dayOverride[date] : undefined
    const training = isTrainingDay(date, p)
    if ((!training && !moved) || date < origin) { out.push({ date, label, planned: 'Rest/Cardio', status: 'rest' }); continue }
    const natural = training ? next() : null // what the rotation would give; moving a workout never changes where the rotation is up to
    const planned = moved ?? natural!
    if (date < today) out.push({ date, label, planned, status: 'missed' }) // rotation stays put, so this comes back
    else {
      out.push({ date, label, planned, status: planned === 'Rest/Cardio' ? 'rest' : date === today ? 'today' : 'upcoming' })
      if (natural) cursor = natural
    }
  }
  return out
}

/** Strip everything chosen just for one day (the day's lifts, order, swaps and any sets typed in) so a different workout starts clean. */
export function clearDayChoices(d: AppData, date: string): AppData {
  const drop = <T,>(o: Record<string, T> | undefined): Record<string, T> => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== date && !k.startsWith(`${date}|`)))
  return { ...d, exOrder: drop(d.exOrder), customSession: drop(d.customSession), workoutFocus: drop(d.workoutFocus), extras: drop(d.extras), removed: drop(d.removed), swaps: drop(d.swaps), drafts: drop(d.drafts) }
}

/**
 * Which days of this week's plan can be moved, and which can take a moved workout: only days that have not happened yet
 * (today included, unless today's workout is already underway). A rest day can take a workout.
 */
export function moveRules(d: AppData, today = todayISO(), week: WeekDay[] = weekSchedule(d, today)): { from: Set<string>; to: Set<string> } {
  const underway = !!d.started?.[today] || Object.keys(d.drafts?.[today]?.sets ?? {}).length > 0
  const open = (w: WeekDay) => w.date >= today && !(w.date === today && underway)
  return {
    from: new Set(week.filter((w) => open(w) && (w.status === 'today' || w.status === 'upcoming') && w.planned !== 'Rest/Cardio').map((w) => w.date)),
    to: new Set(week.filter((w) => open(w) && (w.status === 'today' || w.status === 'upcoming' || w.status === 'rest')).map((w) => w.date)),
  }
}

/**
 * Move a workout to another day of this week by swapping the two days: Monday's Push to Wednesday puts Wednesday's workout on
 * Monday (or a rest day, if that is what Wednesday was). Where the rotation is up to does not change, so the days after carry on
 * as planned. Does nothing if either day cannot be moved (see moveRules).
 */
export function moveWorkout(d: AppData, from: string, to: string, today = todayISO()): AppData {
  const week = weekSchedule(d, today)
  const a = week.find((w) => w.date === from), b = week.find((w) => w.date === to)
  const rules = moveRules(d, today, week)
  if (!a || !b || from === to || !rules.from.has(from) || !rules.to.has(to)) return d
  // what the rotation alone would give each day, so a day put back to normal leaves no override behind
  const natural = Object.fromEntries(weekSchedule({ ...d, dayOverride: {} }, today).map((w) => [w.date, w.planned]))
  const dayOverride: Record<string, DayType> = { ...d.dayOverride, [from]: b.planned, [to]: a.planned }
  for (const date of [from, to]) if (dayOverride[date] === natural[date]) delete dayOverride[date]
  let out: AppData = { ...d, dayOverride }
  for (const date of [from, to]) if (date === today) out = clearDayChoices(out, today)
  return out
}

/**
 * Whole workouts that did not happen, for the "what's in the way?" check-in: their most recent scheduled session was missed (or
 * skipped on purpose) and so was the one before it, or one more of the same kind (say Legs twice) in the last four weeks. Read from
 * what is already stored. Days before someone's first activity never count.
 */
export function missedCheckIn(d: AppData, today = todayISO()): { reason: 'row' | 'type'; day: DayType; latest: string } | null {
  if (!d.profile) return null
  // a new account has no first day yet, so nothing can have been missed (weekSchedule would treat each earlier Sunday as its own first day)
  if (![...d.logs.map((l) => l.date), ...Object.keys(d.checkins)].length) return null
  const sessions: WeekDay[] = []
  const monday = addDays(today, -((fromISO(today).getDay() + 6) % 7))
  for (let k = 0; k < 4; k++) {
    // an earlier week is read as of its Sunday, so Monday to Saturday are settled; its Sunday counts too once it is past
    for (const day of weekSchedule(d, k === 0 ? today : addDays(monday, -7 * k + 6))) {
      const status = day.status === 'today' && day.date < today ? 'missed' : day.status
      if (day.date < today && (status === 'done' || status === 'missed' || status === 'skipped')) sessions.push({ ...day, status })
    }
  }
  sessions.sort((a, b) => b.date.localeCompare(a.date))
  const gone = (s: WeekDay) => s.status !== 'done'
  // someone who is training again is not stuck: it only counts while their most recent scheduled session was missed
  if (!sessions.length || !gone(sessions[0])) return null
  if (sessions.length >= 2 && gone(sessions[1])) return { reason: 'row', day: sessions[0].planned, latest: sessions[0].date }
  const same = sessions.filter((s) => gone(s) && s.planned === sessions[0].planned)
  return same.length >= 2 ? { reason: 'type', day: sessions[0].planned, latest: sessions[0].date } : null
}

// ---------- carb-day calendar ----------
/** The workout type planned for each of the next n days (today included), assuming you complete each one. */
export function projectDays(d: AppData, today = todayISO(), n = 60): Record<string, DayType> {
  const p = d.profile!
  const previous = [...d.logs].filter((l) => l.date <= today && !l.baseline && (l.rotationDay ?? l.dayType) !== 'Rest/Cardio').sort((a, b) => b.date.localeCompare(a.date))[0]
  let cursor: DayType | null = previous ? previous.rotationDay ?? previous.dayType : null
  const out: Record<string, DayType> = {}
  for (let i = 0; i <= n; i++) {
    const date = addDays(today, i)
    const log = d.logs.find((l) => l.date === date && !l.baseline && l.dayType !== 'Rest/Cardio')
    if (log) { out[date] = log.dayType; if ((log.rotationDay ?? log.dayType) !== 'Rest/Cardio') cursor = log.rotationDay ?? log.dayType; continue }
    const moved = d.dayOverride[date] // a workout moved here, or chosen for today
    const training = isTrainingDay(date, p)
    if (!training && !moved) { out[date] = 'Rest/Cardio'; continue }
    const natural = training ? SPLIT[cursor ? (SPLIT.indexOf(cursor) + 1) % SPLIT.length : 0] : null
    out[date] = moved ?? natural!
    if (natural) cursor = natural
  }
  return out
}

/** Planned carb day for any date: follows the workout you have (or will have) unless you set it yourself. */
export function carbPlanFor(date: string, d: AppData, today = todayISO(), proj?: Record<string, DayType>): { carb: CarbDay; day: DayType; manual: boolean } {
  const day: DayType = date < today ? dayFor(date, d) : (proj ?? projectDays(d, today))[date] ?? 'Rest/Cardio'
  const manual = d.carbOverride[date]
  return { carb: manual ?? carbDayFor(day), day, manual: !!manual }
}
