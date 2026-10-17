/** The youngest age Will Power allows (the Terms and Privacy pages say 13). */
export const MIN_AGE = 13
/** At 18 and over a profile starts public (posts show in Explore); 13 to 17 starts private, with the choice to go public. */
export const ADULT_AGE = 18

const toDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }

/** Whole years old on `now`, or null when `dob` (YYYY-MM-DD) isn't a real date in the past. */
export function ageFrom(dob: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const born = toDate(dob)
  const [y, m, d] = dob.split('-').map(Number)
  if (born.getFullYear() !== y || born.getMonth() !== m - 1 || born.getDate() !== d) return null // 2026-02-31 and the like
  if (y < 1900 || born > now) return null
  let age = now.getFullYear() - y
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--
  return age
}

export type AgeCheck = { ok: true; adult: boolean } | { ok: false; reason: 'invalid' | 'young'; message: string }
export const YOUNG_MESSAGE = 'Will Power is for people 13 and older, so we can’t create an account for you.'
export const NOT_ALLOWED_MESSAGE = 'Will Power is for people 13 and older, so we can’t let you use it.'

/** Is this date of birth old enough, and is the person 18 or older? The date itself is never stored; only those answers are used. */
export function checkAge(dob: string, now = new Date()): AgeCheck {
  const age = ageFrom(dob, now)
  if (age === null) return { ok: false, reason: 'invalid', message: dob ? 'That doesn’t look like a real date of birth.' : 'Enter your date of birth.' }
  if (age < MIN_AGE) return { ok: false, reason: 'young', message: YOUNG_MESSAGE }
  return { ok: true, adult: age >= ADULT_AGE }
}

// ---- what this device remembers (browser storage; it can come back empty, so every read and write is guarded) ----
const BLOCKED = 'wpf.age.blocked'
const BLOCK_MS = 24 * 3600000 // an under-13 answer stops another try on this device for a day, so the date can't just be retyped

const read = (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

export const markBlocked = () => write(BLOCKED, String(Date.now()))
export const isBlocked = (now = Date.now()) => { const t = Number(read(BLOCKED)); return !!t && now - t < BLOCK_MS }
