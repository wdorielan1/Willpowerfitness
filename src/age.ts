/** The youngest age Will Power allows (the Terms and Privacy pages say 13). */
export const MIN_AGE = 13

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

export type AgeCheck = { ok: true } | { ok: false; reason: 'invalid' | 'young'; message: string }
export const YOUNG_MESSAGE = 'Will Power is for people 13 and older, so we can’t create an account for you.'

/** Is this date of birth old enough? The date itself is never stored; only the answer is used. */
export function checkAge(dob: string, now = new Date()): AgeCheck {
  const age = ageFrom(dob, now)
  if (age === null) return { ok: false, reason: 'invalid', message: dob ? 'That doesn’t look like a real date of birth.' : 'Enter your date of birth.' }
  if (age < MIN_AGE) return { ok: false, reason: 'young', message: YOUNG_MESSAGE }
  return { ok: true }
}

// ---- what this device remembers (browser storage; it can come back empty, so every read and write is guarded) ----
const BLOCKED = 'wpf.age.blocked'
const PASSED = 'wpf.age.passed'
const BLOCK_MS = 24 * 3600000 // an under-13 answer stops another try on this device for a day, so the date can't just be retyped
const PASS_MS = 7 * 24 * 3600000 // a pass waits this long for the email to be confirmed

const read = (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

export const markBlocked = () => write(BLOCKED, String(Date.now()))
export const isBlocked = (now = Date.now()) => { const t = Number(read(BLOCKED)); return !!t && now - t < BLOCK_MS }

/**
 * Passing the check at sign up is remembered just long enough to be written onto the new account the first time it loads
 * (the person may confirm their email later, or come back from Google). With an email it only counts for that email.
 */
export const rememberPass = (email?: string) => write(PASSED, JSON.stringify({ ts: Date.now(), email: email?.trim().toLowerCase() }))
export function hasPass(email: string | null, now = Date.now()): boolean {
  try {
    const p = JSON.parse(read(PASSED) ?? 'null') as { ts: number; email?: string } | null
    if (!p) return false
    return p.email ? p.email === (email ?? '').toLowerCase() && now - p.ts < PASS_MS : now - p.ts < 30 * 60000
  } catch { return false }
}
export const clearPass = () => write(PASSED, null)
