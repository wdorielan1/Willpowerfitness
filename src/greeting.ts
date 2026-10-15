/** The first name to greet, or '' when the account has no name worth using (an email handle like "wdorielan1" isn't a name). */
export function greetingName(full: string): string {
  const first = full.trim().split(/\s+/)[0] ?? ''
  if (!/^\p{L}[\p{L}'’.-]{0,19}$/u.test(first)) return ''
  return first === first.toLowerCase() ? first[0].toUpperCase() + first.slice(1) : first
}

/** By the phone's own clock: morning 5:00 to 11:59, afternoon 12:00 to 16:59, evening 17:00 to 21:59, late night 22:00 to 4:59. */
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'late'
export function partOfDay(now: Date): PartOfDay {
  const h = now.getHours()
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'late'
}

/**
 * The line at the top of the Today page. Late at night it asks "Late night workout, Will?" when they haven't trained yet;
 * it says "Nice work" if they already did, and "Good night" on a rest day, since the question wouldn't fit.
 */
export function greeting(now: Date, name: string, state: { done: boolean; rest: boolean }): string {
  const n = greetingName(name)
  const who = n ? `, ${n}` : ''
  switch (partOfDay(now)) {
    case 'morning': return `Good morning${who}`
    case 'afternoon': return `Good afternoon${who}`
    case 'evening': return `Good evening${who}`
    default: return state.done ? `Nice work${who}` : state.rest ? `Good night${who}` : `Late night workout${who}?`
  }
}
