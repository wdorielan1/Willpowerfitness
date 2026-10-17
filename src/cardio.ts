import { addDays, fromISO } from './engine'
import { sportOf } from './sports'
import type { ActivityNotice, AppData, CardioActive, CardioGoal, CardioLog } from './types'

export type CardioField = 'speed' | 'incline' | 'level' | 'miles'
export interface Machine { id: string; modes?: string[]; fields: CardioField[] }

/** The treadmill is one machine; how you used it is the mode. */
export const TREADMILL_MODES = ['Walk', 'Incline', 'Run', 'Sprints']
export const MACHINES: Machine[] = [
  { id: 'Treadmill', modes: TREADMILL_MODES, fields: ['speed', 'incline', 'miles'] },
  { id: 'StairMaster', fields: ['level'] },
  { id: 'Elliptical', fields: ['level', 'miles'] },
  { id: 'Outdoor walk', fields: ['miles'] },
  { id: 'Bike', fields: ['level', 'miles'] },
  { id: 'Other', fields: ['miles'] },
]
export const DEFAULT_MACHINE = 'Treadmill'
export const DEFAULT_MODE = 'Incline'
export const GOAL_DAY_MINUTES = [20, 30, 45, 60]
export const GOAL_MILES = [5, 10, 15, 20]

/**
 * What a session can record. A sport has no machine settings (only miles, where distance is worth logging), and sessions logged before
 * the machines changed keep their old kind (like "Incline walk"), which has miles only.
 */
export function machineOf(kind: string): Machine {
  const machine = MACHINES.find((m) => m.id === kind)
  if (machine) return machine
  const sport = sportOf(kind)
  return { id: kind, fields: sport ? (sport.miles ? ['miles'] : []) : ['miles'] }
}

/** The activity a session adds to a profile: a machine or one of the activities ("Other" adds nothing). Older kinds map to their machine. */
export function activityBadge(kind: string): string | null {
  if (kind === 'Incline walk') return 'Treadmill'
  if (kind === 'Other') return null
  return MACHINES.some((m) => m.id === kind) || sportOf(kind) ? kind : null
}

/** An activity badge (the small oval on the profile) is earned after this many sessions of it. */
export const ACTIVITY_BADGE_AT = 5

/** Sessions logged per activity, with when the latest was. */
function activityTally(d: AppData) {
  const seen = new Map<string, { n: number; last: number }>()
  d.cardio.forEach((c, i) => {
    const name = activityBadge(c.kind)
    if (!name) return
    const cur = seen.get(name)
    seen.set(name, { n: (cur?.n ?? 0) + 1, last: Math.max(cur?.last ?? 0, Date.parse(c.date) * 1000 + i) })
  })
  return seen
}
export const activityCount = (d: AppData, name: string) => activityTally(d).get(name)?.n ?? 0

/** The activities they have done 5 times or more (the badges on their profile), the ones they do most first. Nothing is listed before then. */
export function activitiesDone(d: AppData): string[] {
  return [...activityTally(d).entries()].filter(([, v]) => v.n >= ACTIVITY_BADGE_AT).sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last).map(([name]) => name)
}

/**
 * After a session of this kind is saved: a note on the first session of an activity ("do it 4 more times for the badge") and a note when
 * the 5th earns the badge. Only for the activity just logged, once each, so older sessions don't make a burst of notes.
 */
export function withActivityNotice(d: AppData, kind: string, now = Date.now()): AppData {
  const name = activityBadge(kind)
  if (!name) return d
  const n = activityCount(d, name)
  const have = (k: ActivityNotice['kind']) => (d.notices ?? []).some((x) => x.activity === name && x.kind === k)
  const add: ActivityNotice[] = []
  if (n === 1 && !have('start')) add.push({ id: `n${now}s${name}`, kind: 'start', activity: name, ts: now })
  if (n >= ACTIVITY_BADGE_AT && !have('badge')) add.push({ id: `n${now}b${name}`, kind: 'badge', activity: name, ts: now })
  return add.length ? { ...d, notices: [...add, ...(d.notices ?? [])].slice(0, 60) } : d
}

/** The name a suggested crew starts with: "Tennis crew" (brackets dropped). */
export const crewNameFor = (activity: string) => `${activity.replace(/\s*\(.*\)/, '')} crew`

/**
 * A sport they have done 5 times or more that no crew is named for yet (and they have not waved off): the Crew page suggests starting one.
 * Machines and the "Other" group make no sense as a crew, so only the sports count.
 */
export function crewOffer(d: AppData, crews: { name: string }[]): string | null {
  const dismissed = d.crewOfferDismissed ?? []
  for (const name of activitiesDone(d)) {
    const sport = sportOf(name)
    if (!sport || sport.cat === 'Other' || dismissed.includes(name)) continue
    const base = name.replace(/\s*\(.*\)/, '').toLowerCase()
    if (crews.some((c) => c.name.toLowerCase().includes(base))) continue
    return name
  }
  return null
}

/** Sports they have logged at least twice, most recent first, so the ones they play show in the machine row without searching. */
export function recentSports(d: AppData, max = 2): string[] {
  const seen = new Map<string, { n: number; last: number }>()
  d.cardio.forEach((c, i) => { if (sportOf(c.kind)) { const cur = seen.get(c.kind); seen.set(c.kind, { n: (cur?.n ?? 0) + 1, last: Math.max(cur?.last ?? 0, Date.parse(c.date) * 1000 + i) }) } })
  return [...seen.entries()].filter(([, v]) => v.n >= 2).sort((a, b) => b[1].last - a[1].last).slice(0, max).map(([name]) => name)
}

/** A lifting workout that was started today and not finished. Cardio and lifting can't be timed at the same time. */
export const workoutRunning = (d: AppData, today: string) =>
  !!d.started[today] && !d.checkins[today]?.done && !d.logs.some((l) => l.date === today && !l.baseline)
export const cardioName = (c: Pick<CardioLog, 'kind' | 'mode'>) => (c.mode ? `${c.kind} · ${c.mode}` : c.kind)
export const newCardioId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Logs from before ids existed are matched by what they hold. */
export const sameLog = (a: CardioLog, b: CardioLog) =>
  a.id || b.id ? a.id === b.id : a.date === b.date && a.kind === b.kind && a.minutes === b.minutes && a.note === b.note && (a.mode ?? '') === (b.mode ?? '')

/** What a shared session is called: "Tennis", or "Treadmill run" for a machine with a mode. */
export const shareTitle = (c: Pick<CardioLog, 'kind' | 'mode'>) => (c.mode ? `${c.kind} ${c.mode.toLowerCase()}` : c.kind)
/** A key for a session, to remember which crews it was shared with (older sessions have no id). */
export const cardioKey = (c: CardioLog) => c.id ?? `${c.date}|${c.kind}|${c.minutes}|${c.note}`

export const UNIT_LABEL: Record<CardioField, string> = { speed: 'Speed (mph)', incline: 'Incline (%)', level: 'Level', miles: 'Miles' }

/** A cardio timer that has run this many hours asks "Still doing cardio?" (longer than the workout one: a round of golf takes hours). */
export const CARDIO_ASK_HOURS = 4
/** If nobody answers within this many minutes, the timer is paused where the question came up, not discarded. */
export const CARDIO_GRACE_MIN = 30

/** How long a running timer has gone, not counting time it was paused. */
export const elapsedMs = (a: CardioActive, now = Date.now()) => Math.max(0, (a.pausedAt ?? now) - a.startedAt - a.pausedMs)

export function clockText(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`
}

/** Monday of the week that holds this date. */
export const weekStartOf = (date: string) => addDays(date, -((fromISO(date).getDay() + 6) % 7))

export interface GoalProgress { done: number; target: number; unit: 'days' | 'miles'; reached: boolean; line: string }

/** This week (Monday to Sunday) against the goal. Days count when the day's cardio adds up to the minutes they chose. */
export function goalProgress(d: AppData, goal: CardioGoal, today: string): GoalProgress {
  const start = weekStartOf(today)
  const week = d.cardio.filter((c) => c.date >= start && c.date <= today)
  if (goal.kind === 'days') {
    const perDay = new Map<string, number>()
    for (const c of week) perDay.set(c.date, (perDay.get(c.date) ?? 0) + c.minutes)
    const done = [...perDay.values()].filter((m) => m >= goal.minutes).length
    return { done, target: goal.days, unit: 'days', reached: done >= goal.days, line: `${done} of ${goal.days} ${goal.days === 1 ? 'day' : 'days'} this week · ${goal.minutes}+ min each` }
  }
  const done = Math.round(week.reduce((a, c) => a + (c.miles ?? 0), 0) * 10) / 10
  return { done, target: goal.miles, unit: 'miles', reached: done >= goal.miles, line: `${done} of ${goal.miles} miles this week` }
}

export const goalText = (g: CardioGoal) => (g.kind === 'days' ? `${g.days} ${g.days === 1 ? 'day' : 'days'} a week, ${g.minutes}+ min each` : `${g.miles} miles a week`)

/** Cardio this week (Monday to today): minutes and sessions. */
export function weekCardio(d: AppData, today: string) {
  const start = weekStartOf(today)
  const week = d.cardio.filter((c) => c.date >= start && c.date <= today)
  return { minutes: week.reduce((a, c) => a + c.minutes, 0), sessions: week.length }
}

/** The goal is offered after a couple of cardio sessions, once, and never at sign-up. */
export const shouldOfferGoal = (d: AppData) => !d.cardioGoal && !d.cardioGoalAsked && d.cardio.length >= 2

export const SESSION_NOTE = (minutes: number) => `A cardio session of ${minutes} minutes or more counts as a workout day for your streak.`
