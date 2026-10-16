import { e1rm } from './engine'
import { prLine, type WorkoutSummary } from './shareCard'
import type { AppData, CrewPost, DayType, LogEntry, WorkoutLog } from './types'

/** Whether a workout of that day has gone to that crew. Your main crew uses the bare date (as it always has), the others `date|crew`. */
export const postedKey = (date: string, crewId: string, primary: string | null) => (crewId === primary ? date : `${date}|${crewId}`)

/** The crews a finished workout is posted to by itself: the ones chosen in Settings that you are still in, else your main crew. */
export function autoShareCrews(d: Pick<AppData, 'joined' | 'primary' | 'settings'>): string[] {
  const picked = (d.settings.shareCrews ?? []).filter((id) => d.joined.includes(id))
  return picked.length ? picked : d.primary ? [d.primary] : []
}

/** Workouts you can share: real sessions with sets, newest first. */
export const shareableLogs = (logs: WorkoutLog[]) => logs.filter((l) => !l.baseline && !l.skipped && !l.imported && l.entries.some((e) => e.sets.length)).sort((a, b) => b.date.localeCompare(a.date))

/** A typed gym or town: one line, no longer than the share card allows. */
export const cleanPlace = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 40)

/** What someone wrote under a shared workout: trimmed and kept to a sensible length. */
export const cleanCaption = (s: string) => s.trim().slice(0, 500)

/** One lift on a shared workout: its name and the best set (weight and reps). */
export interface PostLift { n: string; w: number; r: number }

const TITLES: Record<string, string> = { Push: 'Push Day', Pull: 'Pull Day', Legs: 'Leg Day', 'Full Body': 'Full Body Day' }
const CHIPS: Record<string, string> = {
  Push: 'PUSH', Pull: 'PULL', Legs: 'LEGS', 'Shoulders + Abs': 'SHOULDERS + ABS', 'Full Body': 'FULL BODY', 'Chest + Triceps': 'CHEST + TRICEPS', 'Back + Biceps': 'BACK + BICEPS', 'Custom workout': 'CUSTOM',
}
/** Older posts called the shoulders session "Shoulders/Abs". */
const clean = (name: string) => (name === 'Shoulders/Abs' ? 'Shoulders + Abs' : name)
export const cardTitle = (name: string) => TITLES[clean(name)] ?? clean(name)
export const cardChip = (name: string) => CHIPS[clean(name)] ?? clean(name).toUpperCase().slice(0, 18)
/** 8400 becomes "8.4k"; small numbers stay as they are. */
export const fmtVolume = (v?: number) => (v === undefined ? '—' : v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)))

const bestSet = (e: LogEntry) => e.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b))

/**
 * What a finished workout shares with the crew: the text people see in lists, and the details the workout card is drawn from.
 * With `shareLifts` off, no weights go out at all: no lift list, no total weight, and a PR is just the lift's name.
 */
export function workoutPost(sum: WorkoutSummary, entries: LogEntry[], day: DayType, shareLifts: boolean, opts: { at?: number; place?: string; caption?: string } = {}): { text: string; meta: Record<string, unknown> } {
  const pr = sum.prs[0]
  const text = `Finished ${sum.title}${sum.minutes ? ` in ${sum.minutes} min` : ''}${pr ? ` · New PR: ${shareLifts ? prLine(pr) : pr.name}` : ''}`
  const lifts: PostLift[] = entries.filter((e) => e.sets.length).slice(0, 3).map((e) => { const s = bestSet(e); return { n: e.name.slice(0, 48), w: s.weight, r: s.reps } })
  const meta: Record<string, unknown> = {
    v: 2, title: sum.title, day, sets: sum.sets, exercises: sum.exercises, streak: sum.streak,
    date: sum.date, // the day it was done, which can be earlier than the day it was posted
    ...(opts.at ? { at: opts.at } : {}), // when it was finished
    ...(opts.place?.trim() ? { place: cleanPlace(opts.place) } : {}), // a gym or town the person typed, never a live location
    ...(opts.caption?.trim() ? { caption: cleanCaption(opts.caption) } : {}), // what they wrote when they shared it
    ...(sum.minutes ? { minutes: sum.minutes } : {}),
    prs: sum.prs.slice(0, 3).map((p) => (shareLifts ? p : { name: p.name })),
    ...(shareLifts ? { volume: sum.volume, lifts } : {}),
  }
  return { text, meta }
}

export interface WorkoutView {
  title: string; chip: string; minutes?: number; exercises: number; sets: number; volume?: number
  prs: { name: string; weight?: number; reps?: number }[]
  lifts: PostLift[]; more: number; streak?: number
  /** The day it was done, and when (milliseconds) it was finished, where the post says so. */
  date?: string
  at?: number
  /** A gym or town the person chose to show. */
  place?: string
  /** What they wrote when they shared it. */
  caption?: string
}

/** Reads any shared workout, new or old, into what the card shows. Older posts only carry a sentence and three numbers. */
export function readWorkoutPost(p: Pick<CrewPost, 'text' | 'meta'>): WorkoutView {
  const m = (p.meta ?? {}) as Record<string, unknown>
  const num = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : undefined)
  const old = /^Finished (.+?)(?: in (\d+) min)?(?: · New PR: (.+))?$/.exec((p.text ?? '').trim())
  const name = typeof m.title === 'string' ? m.title : old ? old[1] : 'Workout'
  const minutes = num(m.minutes) ?? (old?.[2] ? Number(old[2]) : undefined)
  const prs: WorkoutView['prs'] = Array.isArray(m.prs) ? (m.prs as Record<string, unknown>[]).filter((x) => typeof x?.name === 'string').map((x) => ({ name: x.name as string, weight: num(x.weight), reps: num(x.reps) })) : []
  if (!prs.length && old?.[3]) prs.push({ name: old[3] })
  const lifts = Array.isArray(m.lifts) ? (m.lifts as Record<string, unknown>[]).filter((x) => typeof x?.n === 'string').slice(0, 3).map((x) => ({ n: x.n as string, w: num(x.w) ?? 0, r: num(x.r) ?? 0 })) : []
  const exercises = num(m.exercises) ?? 0
  const streak = num(m.streak)
  const date = typeof m.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : undefined
  const at = num(m.at)
  const place = typeof m.place === 'string' && m.place.trim() ? cleanPlace(m.place) : undefined
  const caption = typeof m.caption === 'string' && m.caption.trim() ? cleanCaption(m.caption) : undefined
  return { title: cardTitle(name), chip: cardChip(name), minutes, exercises, sets: num(m.sets) ?? 0, volume: num(m.volume), prs, lifts, more: Math.max(0, exercises - lifts.length), streak: streak && streak >= 2 ? streak : undefined, date, at, place, caption }
}
