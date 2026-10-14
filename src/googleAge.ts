import { MIN_AGE, ageFrom } from './age'

/**
 * Lets people who sign in with Google skip the age page: Google already holds a birthday, so we ask Google for it (with the
 * person's OK on Google's own permission screen), work out the age, and throw the date away.
 *
 * It is OFF until VITE_GOOGLE_BIRTHDAY=1 is set (Amplify, then redeploy). The owner must first enable the People API and add
 * the birthday permission on the Google Cloud consent screen, because asking Google for a permission that isn't set up there
 * makes Google refuse the sign in for everyone. See docs/TODO.md (Legal and compliance, item 1).
 */
export const GOOGLE_BIRTHDAY_ON = import.meta.env.VITE_GOOGLE_BIRTHDAY === '1'
export const GOOGLE_AGE_SCOPE = 'https://www.googleapis.com/auth/user.birthday.read'
/** What Google sign in asks for when the birthday is on (profile is needed alongside it to read a birthday). */
export const GOOGLE_SCOPES = `openid email profile ${GOOGLE_AGE_SCOPE}`

let token: string | null = null
let pending: Promise<GoogleAge> | null = null

/** Called with the session Google sign in hands back. The token stays in memory only and is used once. */
export function rememberGoogleToken(t?: string | null) { if (GOOGLE_BIRTHDAY_ON && t && !pending) token = t }

/** ok: 13 or older. young: under 13. unknown: no usable birthday (not shared, no year, not a Google sign in, any error), so ask on the age page. */
export type GoogleAge = 'ok' | 'young' | 'unknown'

type Birthday = { metadata?: { source?: { type?: string } }; date?: { year?: number; month?: number; day?: number } }

export async function checkGoogleAge(t: string, fetcher: typeof fetch = fetch, now = new Date()): Promise<GoogleAge> {
  try {
    const r = await fetcher('https://people.googleapis.com/v1/people/me?personFields=birthdays', { headers: { Authorization: `Bearer ${t}` } })
    if (!r.ok) return 'unknown'
    const list = (((await r.json()) as { birthdays?: Birthday[] }).birthdays ?? []).filter((b) => b.date?.year && b.date.month && b.date.day)
    const pick = list.find((b) => b.metadata?.source?.type === 'ACCOUNT') ?? list[0] // the account's own birthday first
    if (!pick?.date) return 'unknown' // a birthday with no year can't give an age
    const { year, month, day } = pick.date
    const age = ageFrom(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, now)
    return age === null ? 'unknown' : age >= MIN_AGE ? 'ok' : 'young'
  } catch { return 'unknown' }
}

/** The answer for this sign in, or null when there is nothing to check. Asked at most once, however many times the page renders. */
export function googleAge(): Promise<GoogleAge> | null {
  if (!pending && token) { const t = token; token = null; pending = checkGoogleAge(t) }
  return pending
}
