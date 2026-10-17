import type { AppData, LogEntry, WorkoutLog } from './types'
import { renderWorkoutCard, type WorkoutCardOptions } from './workoutCardDesign'
import { e1rm, fromISO, streak, workoutName } from './engine'

export interface PR { name: string; weight: number; reps: number; pct: number; e1: number; previousE1?: number }
export interface WorkoutExerciseSummary { name: string; sets: number; weight: number; volume: number }
export interface WorkoutSummary {
  title: string
  date: string
  finishedAt: number
  minutes?: number
  sets: number
  volume: number
  exercises: number
  exerciseDetails?: WorkoutExerciseSummary[]
  volumeChangePct: number | null
  prs: PR[]
  streak: number
  place?: string
}

const best = (e: LogEntry) => e.sets.reduce((b, s) => (e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b))
const volumeOf = (entries: LogEntry[]) => Math.round(entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0))

/** A PR is a better estimated one-rep max than every earlier log of the same lift. A first-ever log is not a PR. */
export function computePRs(entries: LogEntry[], history: WorkoutLog[], date: string): PR[] {
  const past = history.filter((l) => l.date < date && !l.skipped)
  const out: PR[] = []
  for (const e of entries) {
    if (!e.sets.length) continue
    const prior = past.flatMap((l) => l.entries.filter((x) => x.exId === e.exId && x.sets.length)).map((x) => e1rm(best(x).weight, best(x).reps))
    if (!prior.length) continue
    const top = best(e)
    const prev = Math.max(...prior)
    const now = e1rm(top.weight, top.reps)
    if (prev > 0 && now > prev) out.push({ name: e.name, weight: top.weight, reps: top.reps, pct: Math.round(((now - prev) / prev) * 1000) / 10, e1: now, previousE1: prev })
  }
  // heaviest lift leads: a bench PR is a bigger brag than a curl PR with a larger % jump
  return out.sort((a, b) => b.e1 - a.e1)
}

/** Volume change against the most recent earlier session of the same day type. */
export function volumeChange(entries: LogEntry[], history: WorkoutLog[], date: string, dayType: string): number | null {
  const prev = history.filter((l) => l.date < date && !l.skipped && !l.baseline && l.dayType === dayType && l.entries.length).sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!prev) return null
  const before = volumeOf(prev.entries)
  if (!before) return null
  return Math.round(((volumeOf(entries) - before) / before) * 100)
}

export const summarize = (p: { title: string; date: string; finishedAt: number; minutes?: number; entries: LogEntry[]; history: WorkoutLog[]; dayType: string; streak: number; place?: string }): WorkoutSummary => ({
  title: p.title, date: p.date, finishedAt: p.finishedAt, minutes: p.minutes,
  sets: p.entries.reduce((a, e) => a + e.sets.length, 0),
  volume: volumeOf(p.entries),
  exercises: p.entries.length,
  exerciseDetails: p.entries.filter((e) => e.sets.length).map((e) => ({
    name: e.name, sets: e.sets.length, weight: best(e).weight, volume: volumeOf([e]),
  })),
  volumeChangePct: volumeChange(p.entries, p.history, p.date, p.dayType),
  prs: computePRs(p.entries, p.history, p.date),
  streak: p.streak,
  place: p.place?.trim() || undefined,
})

/** Rebuild the finish summary for a workout that is already saved, so it can be shared any time. */
export function summaryFromLog(d: AppData, log: WorkoutLog): WorkoutSummary | null {
  const entries = log.entries.filter((e) => e.sets.length)
  if (!entries.length || log.skipped || log.baseline) return null
  const noon = fromISO(log.date); noon.setHours(12, 0, 0, 0)
  return summarize({
    title: workoutName(log.dayType, d.workoutFocus?.[log.date]),
    date: log.date,
    finishedAt: log.finishedAt ?? noon.getTime(),
    minutes: log.minutes,
    entries,
    // only sessions before that day, so an old workout's PRs match what you saw then
    history: d.logs.filter((l) => l.date < log.date),
    dayType: log.dayType,
    streak: streak(d, log.date),
    place: d.settings.gymName,
  })
}

export const prLine = (pr: PR) => `${pr.name} ${pr.weight} lb × ${pr.reps} (+${pr.pct}%)`

export type CardFormat = 'story' | 'post'

export const fmtDuration = (m?: number) => (!m ? '–' : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`)

/** The preview and exported image use the same renderer and real workout summary. */
export async function buildShareCard(s: WorkoutSummary, format: CardFormat = 'story', options: WorkoutCardOptions = {}): Promise<Blob> {
  return renderWorkoutCard(s, format, options)
}

/** Open the phone's share sheet with the image; fall back to a download. Returns what happened. */
export async function shareCard(blob: Blob, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], 'will-power-workout.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return 'saved'
}
