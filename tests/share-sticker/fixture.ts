import { summarize } from '../../src/shareCard'
import type { LogEntry, WorkoutLog } from '../../src/types'

// Deliberately invented regression data, isolated from the app and its persisted workout logs.
const entries = (weights: number[]): LogEntry[] => [
  ['bench', 'Barbell Bench Press'],
  ['incline', 'Incline Dumbbell Press'],
  ['triceps', 'Triceps Pushdown'],
  ['lateral', 'Dumbbell Lateral Raise'],
].map(([exId, name], i) => ({ exId, name, note: '', sets: Array.from({ length: 3 }, () => ({ weight: weights[i], reps: 8 })) }))
const history: WorkoutLog[] = [{ date: '2026-10-05', dayType: 'Push', short: false, entries: entries([135, 50, 30, 15]) }]
export const fixture = summarize({
  title: 'Push', date: '2026-10-12', finishedAt: new Date('2026-10-12T11:45:00Z').getTime(), minutes: 45,
  entries: entries([155, 55, 35, 20]), history, dayType: 'Push', streak: 4,
})
export const noPrFixture = summarize({
  title: 'Push', date: '2026-10-12', finishedAt: fixture.finishedAt, minutes: 32,
  entries: entries([135, 50, 30, 15]), history, dayType: 'Push', streak: 1,
})
