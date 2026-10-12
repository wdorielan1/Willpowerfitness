import { addDays, streak, todayISO } from './engine'
import type { AppData } from './types'

export interface ProfileStats {
  streak?: number
  workouts30?: number
  workoutsTotal?: number
  since?: string
  /** dates (YYYY-MM-DD) with a finished workout in the last 12 weeks */
  days?: string[]
  badges?: string[]
  crews?: string[]
}

export const BADGES: { id: string; label: string; emoji: string; hint: string }[] = [
  { id: 'first', label: 'First workout', emoji: '🚀', hint: 'Finished a first workout' },
  { id: 'w10', label: '10 workouts', emoji: '🔟', hint: '10 workouts finished' },
  { id: 'w50', label: '50 workouts', emoji: '💪', hint: '50 workouts finished' },
  { id: 'w100', label: '100 workouts', emoji: '💯', hint: '100 workouts finished' },
  { id: 'streak7', label: '7-day streak', emoji: '🔥', hint: '7 days in a row' },
  { id: 'streak30', label: '30-day streak', emoji: '🏆', hint: '30 days in a row' },
  { id: 'early', label: 'Early bird', emoji: '⏰', hint: 'Started a workout before 6 AM' },
  { id: 'crew', label: 'Crew member', emoji: '👥', hint: 'Joined a crew' },
]

/** What other people can see about you. Built from your own data on this device, then published to your profile card. */
export function computeStats(d: AppData, today = todayISO()): ProfileStats {
  const done = new Set<string>()
  for (const [date, c] of Object.entries(d.checkins)) if (c.done) done.add(date)
  for (const l of d.logs) if (!l.baseline && !l.imported) done.add(l.date)
  const all = [...done].sort()
  const from84 = addDays(today, -83)
  const from30 = addDays(today, -29)
  const st = streak(d, today)
  const early = [...done].some((date) => d.started[date] && new Date(d.started[date]).getHours() < 6)
  const badges: string[] = []
  if (all.length >= 1) badges.push('first')
  if (all.length >= 10) badges.push('w10')
  if (all.length >= 50) badges.push('w50')
  if (all.length >= 100) badges.push('w100')
  if (st >= 7) badges.push('streak7')
  if (st >= 30) badges.push('streak30')
  if (early) badges.push('early')
  if (d.joined.length) badges.push('crew')
  return {
    streak: st,
    workouts30: all.filter((x) => x >= from30).length,
    workoutsTotal: all.length,
    since: all[0],
    days: all.filter((x) => x >= from84),
    badges,
    crews: d.joined,
  }
}
