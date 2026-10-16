import { iso } from './engine'
import { readWorkoutPost } from './workoutPost'
import type { CrewPost } from './types'

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** "Today", "Yesterday" or "Mon, Oct 12, 2026": any other day always says its year, so an old post is never ambiguous. */
export function dayLabel(day: string, now = new Date()): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = iso(now)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (day === today) return 'Today'
  if (day === iso(yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * The line at the top of every crew post: the day and time it was done, and for a workout where, if the person chose to say.
 * A workout says when it was finished ("Finished today at 8:14 AM"); anything else says when it was posted. Never a live location:
 * the place is only a gym or town the person typed.
 */
export function postWhen(p: Pick<CrewPost, 'ts' | 'kind' | 'text' | 'meta'>, now = new Date()): { text: string; place?: string } {
  if (p.kind === 'workout') {
    const w = readWorkoutPost(p)
    const postedDay = iso(new Date(p.ts))
    const at = w.at ?? (w.date && w.date !== postedDay ? undefined : p.ts) // a workout shared later with no finish time has only its day
    const day = at ? iso(new Date(at)) : w.date ?? postedDay
    const label = dayLabel(day, now)
    return { text: `Finished ${label === 'Today' || label === 'Yesterday' ? label.toLowerCase() : label}${at ? ` at ${timeOf(at)}` : ''}`, place: w.place }
  }
  return { text: `${dayLabel(iso(new Date(p.ts)), now)} at ${timeOf(p.ts)}` }
}
