import { addDays, fromISO } from './engine'
import type { AppData } from './types'

export type Metric = 'workouts' | 'earlyWorkouts' | 'steps' | 'cardioMin' | 'volume'
export interface ChallengeDef {
  id: string; name: string; emoji: string; blurb: string; rules: string
  period: 'week' | 'biweek' | 'month'; metric: Metric; unit: string
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'gymrat', name: 'Gym Rat', emoji: '🐀', blurb: 'Most workouts this month.', rules: 'Every completed workout counts once per day. Runs the whole calendar month.', period: 'month', metric: 'workouts', unit: 'workouts' },
  { id: '5am', name: '5 AM Challenge', emoji: '⏰', blurb: 'Start your workout before 6:00 AM.', rules: 'Tap Start workout before 6:00 AM and finish the session. Two-week rounds start on the 1st and the 15th.', period: 'biweek', metric: 'earlyWorkouts', unit: 'early workouts' },
  { id: 'steps', name: 'Step Challenge', emoji: '👟', blurb: 'Most steps this week.', rules: 'Log your daily steps under Quick log → Steps (Apple Health sync comes with the iPhone app). Monday to Sunday.', period: 'week', metric: 'steps', unit: 'steps' },
  { id: 'iron', name: 'Iron Tonnage', emoji: '🏋️', blurb: 'Most total weight lifted this month.', rules: 'Weight × reps from every set you log in a workout. Imported history does not count.', period: 'month', metric: 'volume', unit: 'lb lifted' },
  { id: 'cardio', name: 'Cardio Crusher', emoji: '🔥', blurb: 'Most cardio minutes this week.', rules: 'Minutes from the cardio you log. Monday to Sunday.', period: 'week', metric: 'cardioMin', unit: 'minutes' },
]

export interface Instance { def: ChallengeDef; cohort: string; start: string; end: string; daysLeft: number }

const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000)
const monthEnd = (d: string) => { const x = fromISO(d); return addDays(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate() - 1) }

/** The running round of a challenge for a date. Everyone in the same round competes on the same days. */
export function instanceFor(def: ChallengeDef, date: string): Instance {
  let start: string, end: string
  if (def.period === 'week') {
    start = addDays(date, -((fromISO(date).getDay() + 6) % 7)); end = addDays(start, 6)
  } else if (def.period === 'biweek') {
    const x = fromISO(date); const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
    if (x.getDate() <= 14) { start = `${ym}-01`; end = `${ym}-14` } else { start = `${ym}-15`; end = monthEnd(date) }
  } else {
    const x = fromISO(date); start = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`; end = monthEnd(date)
  }
  return { def, cohort: `${def.id}:${start}`, start, end, daysLeft: Math.max(0, daysBetween(date, end) + 1) }
}

export const instanceFromCohort = (cohort: string): Instance | null => {
  const [id, start] = cohort.split(':')
  const def = CHALLENGES.find((c) => c.id === id)
  return def && start ? instanceFor(def, start) : null
}

export function scoreFor(inst: Instance, d: AppData, today: string): number {
  const last = inst.end < today ? inst.end : today
  const inWin = (date: string) => date >= inst.start && date <= last
  switch (inst.def.metric) {
    case 'workouts': return Object.entries(d.checkins).filter(([k, v]) => inWin(k) && v.done).length
    case 'earlyWorkouts': return Object.entries(d.checkins).filter(([k, v]) => inWin(k) && v.done && d.started[k] && new Date(d.started[k]).getHours() < 6).length
    case 'steps': return d.steps.filter((s) => inWin(s.date)).reduce((a, s) => a + s.steps, 0)
    case 'cardioMin': return d.cardio.filter((c) => inWin(c.date)).reduce((a, c) => a + c.minutes, 0)
    case 'volume': return Math.round(d.logs.filter((l) => inWin(l.date) && !l.baseline && !l.imported).reduce((a, l) => a + l.entries.reduce((b, e) => b + e.sets.reduce((c, s) => c + s.weight * s.reps, 0), 0), 0))
  }
}
