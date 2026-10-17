import { addDays, fromISO } from './engine'
import { sportOf } from './sports'
import type { AppData, CardioActive, CardioGoal, CardioLog } from './types'

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

export const UNIT_LABEL: Record<CardioField, string> = { speed: 'Speed (mph)', incline: 'Incline (%)', level: 'Level', miles: 'Miles' }

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
