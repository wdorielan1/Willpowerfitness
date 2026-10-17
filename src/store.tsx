import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppData } from './types'
import { supabase, fetchCrews, ensureMemberCloud, ensureProfileCard, publishProfile, setMyAvatar, syncMyAvatar } from './cloud'
import { computeStats } from './profileStats'
import { DEFAULT_SETTINGS } from './data'
import { withRequestTimeout, withTimeout } from './photos'
import { GOOGLE_BIRTHDAY_ON, GOOGLE_SCOPES, rememberGoogleToken } from './googleAge'

/** signUp returns this (instead of an error) when the person must confirm their email first */
export const CONFIRM_EMAIL = 'confirm-email'
const SESSION = 'wpf.session'
/** Set when an account has just been deleted, so the signed-out screen can say so once. */
export const DELETED = 'wpf.deleted'
const ACCOUNTS = 'wpf.accounts'
const dataKey = (email: string) => `wpf.data.${email}`

export const blankData = (name: string): AppData => ({
  name, profile: null, joined: [], primary: null, checkins: {}, logs: [], cardio: [], weights: [],
  swaps: {}, short: {}, drafts: {}, meals: {}, messages: [], custom: [], partner: false,
  dayOverride: {}, extras: {}, removed: {}, started: {}, photos: [], qotd: {}, extendHours: {}, posts: [], steps: [], challengesJoined: [], foodLog: {}, customFoods: [], carbOverride: {}, customChallenges: [], mealPlan: {}, settings: DEFAULT_SETTINGS,
})

/** The rest times every new account used to start with. Anyone still on exactly these never picked them, so they move to the 1 minute default. */
const OLD_DEFAULT_REST = { small: 45, medium: 75, large: 120, keyBonus: 30 }
const sameRest = (a?: Partial<AppData['settings']['rest']>) => !!a && (Object.keys(OLD_DEFAULT_REST) as (keyof typeof OLD_DEFAULT_REST)[]).every((k) => a[k] === OLD_DEFAULT_REST[k])

/** Saved data wins, but any setting added in a newer version falls back to its default. */
const withDefaults = (base: AppData, saved: Partial<AppData>): AppData => ({
  ...base, ...saved,
  posts: (saved.posts ?? []).map((p) => ({ ...p, imagePaths: p.imagePaths ?? (p.imagePath ? [p.imagePath] : []), imageIds: p.imageIds ?? (p.imageId ? [p.imageId] : []) })),
  settings: { ...base.settings, ...(saved.settings ?? {}), rest: sameRest(saved.settings?.rest) ? base.settings.rest : { ...base.settings.rest, ...(saved.settings?.rest ?? {}) }, nutrition: { ...base.settings.nutrition, ...(saved.settings?.nutrition ?? {}) } },
})

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
const cacheKey = (id: string) => `wpf.cache.${id}`
const accountData = ({ custom: _custom, ...saved }: AppData) => saved

// An incomplete local snapshot must never replace a completed account.
const newestAccount = (remote: Partial<AppData> | null, cached: Partial<AppData> | null) => {
  if (remote?.profile && !cached?.profile) return remote
  if (cached?.profile && !remote?.profile) return cached
  return remote && cached ? ((cached.ts ?? 0) > (remote.ts ?? 0) ? cached : remote) : remote ?? cached ?? {}
}

async function sha(text: string) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch { return btoa(text) }
}

interface Ctx {
  email: string | null
  userId: string | null
  /** Their picture: the one they uploaded, else their Google photo. */
  avatarUrl: string | null
  googlePhoto: string | null
  setAvatar: (dataUrl: string | null) => void
  loading: boolean
  accountError: string | null
  syncError: string | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  retryAccount: () => void
  saveAccount: (fn: (d: AppData) => AppData) => Promise<string | null>
  googleOAuth: () => Promise<string | null>
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  signUp: (name: string, email: string, password: string) => Promise<string | null>
  logIn: (email: string, password: string) => Promise<string | null>
  googleIn: (email: string, name: string) => void
  /** Emails a one-time sign-in code to an existing account. Unknown addresses look the same as known ones. Returns a message when it fails. */
  sendCode: (email: string) => Promise<string | null>
  /** Signs in with the emailed code. Asks them to choose a new password straight after (they can skip). Returns a message when it fails. */
  verifyCode: (email: string, code: string) => Promise<string | null>
  /** True while the "Choose a new password" screen is showing after a code sign-in. */
  choosePassword: boolean
  /** Saves the new password, or `null` to skip. Returns a message when it fails. */
  setPassword: (password: string | null) => Promise<string | null>
  /** Deletes the signed-in account for good (and everything it holds), then signs out. Returns a message when it fails. */
  deleteAccount: () => Promise<string | null>
  logOut: () => void
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => read<string | null>(SESSION, null))
  const [userId, setUserId] = useState<string | null>(null)
  const [googlePhoto, setGooglePhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [choosePassword, setChoosePassword] = useState(false)
  const [retry, setRetry] = useState(0)
  const loaded = useRef(false)
  const [data, setData] = useState<AppData>(() => {
    if (supabase) return blankData('')
    const e = read<string | null>(SESSION, null)
    return e ? withDefaults(blankData(''), read<Partial<AppData>>(dataKey(e), {})) : blankData('')
  })

  // ---- local-only mode: persist per email on this device ----
  useEffect(() => { if (!supabase && email) write(dataKey(email), data) }, [email, data])

  // ---- cloud mode: session + load profile ----
  const activeUser = useRef<string | null>(null)
  const hydration = useRef(0)
  const dataRef = useRef(data)
  dataRef.current = data
  const emailRef = useRef(email)
  emailRef.current = email
  const pending = useRef<{ userId: string; data: AppData } | null>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  const persist = useCallback((uid: string, snapshot: AppData) => {
    const run = async () => {
      if (!supabase || activeUser.current !== uid || !loaded.current) throw new Error('Your account needs to reconnect before changes can sync.')
      const { error } = await withRequestTimeout((signal) => supabase!.from('profiles').upsert({ id: uid, name: snapshot.name, data: accountData(snapshot), updated_at: new Date().toISOString() }).abortSignal(signal), 15000, 'Saving your account')
      if (error) throw new Error(error.message)
    }
    // Preserve write order so an older save cannot overwrite onboarding or a newer edit.
    const task = saveQueue.current.then(run, run)
    saveQueue.current = task.catch(() => {})
    return task
  }, [])

  const saveNow = useCallback(async (): Promise<string | null> => {
    const snapshot = pending.current
    if (!snapshot || !supabase) return null
    try {
      await persist(snapshot.userId, snapshot.data)
      if (activeUser.current === snapshot.userId) {
        if (pending.current === snapshot) { pending.current = null; setSaveState('saved') }
        setSyncError(null)
      }
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (activeUser.current === snapshot.userId) { setSyncError(`Changes are saved on this device, but could not sync: ${message}`); setSaveState('error') }
      return message
    }
  }, [persist])

  const retryAccount = useCallback(() => setRetry((n) => n + 1), [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    let authEvents = 0
    let scheduled: ReturnType<typeof setTimeout> | undefined
    const hydrate = async (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!alive) return
      if (!u) {
        hydration.current++; activeUser.current = null; loaded.current = false; pending.current = null
        write(SESSION, null)
        dataRef.current = blankData('')
        setUserId(null); setGooglePhoto(null); setMyAvatar(null, null); setEmail(null); setData(blankData('')); setLoading(false); setChoosePassword(false)
        setAccountError(null); setSyncError(null)
        return
      }
      if (activeUser.current === u.id && loaded.current) return // token refresh / tab focus: keep local edits
      const request = ++hydration.current
      const current = () => alive && hydration.current === request && activeUser.current === u.id
      if (activeUser.current !== u.id) pending.current = null
      activeUser.current = u.id
      loaded.current = false
      setLoading(true); setAccountError(null)
      setUserId(u.id); setEmail(u.email ?? u.id)
      const photo = ((u.user_metadata?.avatar_url as string) || (u.user_metadata?.picture as string) || '').trim()
      setGooglePhoto(/^https:\/\//.test(photo) ? photo : null)
      const cached = read<Partial<AppData> | null>(cacheKey(u.id), null)
      const fallbackName = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0]
      try {
        const { data: row, error } = await withRequestTimeout((signal) => supabase!.from('profiles').select('name,data').eq('id', u.id).abortSignal(signal).maybeSingle(), 15000, 'Loading your account')
        if (!current()) return
        if (error) throw new Error(error.message)
        const remote = (row?.data as Partial<AppData> | undefined) ?? null
        const newest = newestAccount(remote, cached)
        const name = newest.name || (row?.name as string) || fallbackName
        const base = withDefaults(blankData(name), { ...newest, name })
        dataRef.current = base
        write(cacheKey(u.id), accountData(base))
        // Retry a newer local snapshot only after confirming the remote account is readable.
        pending.current = newest === cached && (cached?.ts ?? 0) > (remote?.ts ?? 0) ? { userId: u.id, data: base } : null
        loaded.current = true
        setData(base); setSyncError(null); setLoading(false)
        // Crew availability must not delay or reset a successfully loaded profile.
        void withTimeout(fetchCrews(), 10000, 'Loading crews').then((crews) => {
          if (current()) setData((d) => ({ ...d, custom: crews }))
        }).catch(() => {})
        for (const crewId of base.joined) void ensureMemberCloud(crewId, u.id, base.name).catch(() => {})
        // every account gets a profile card (handle + Google photo) so friends can follow and see them
        const mineUrl = base.avatar || (/^https:\/\//.test(photo) ? photo : null)
        setMyAvatar(u.id, mineUrl)
        void ensureProfileCard(u.id, base.name, mineUrl, u.email ?? null, base.adult).then((r) => {
          const cur = dataRef.current
          // An account whose age is not known yet (made before the age rule) is kept private until they answer the one question on Home.
          const ageUnknown = !!cur.ageConfirmed && cur.adult === undefined
          if (r && (cur.handle === undefined || cur.profilePublic === undefined || (ageUnknown && cur.profilePublic))) {
            update((d) => {
              const next = { ...d, handle: d.handle ?? r.handle, findByHandle: d.findByHandle ?? r.discoverable, profilePublic: d.profilePublic ?? r.isPublic }
              return next.ageConfirmed && next.adult === undefined ? { ...next, profilePublic: false } : next
            })
          }
          return mineUrl ? syncMyAvatar(u.id, mineUrl) : undefined
        }).catch(() => {})
      } catch (error) {
        if (!current()) return
        const message = error instanceof Error ? error.message : String(error)
        if (cached?.profile) {
          const base = withDefaults(blankData(cached.name || fallbackName), cached)
          dataRef.current = base; setData(base)
          setSyncError(`Your saved account is available on this device. Could not connect to sync it: ${message}`)
        } else {
          // An unreadable account is different from a confirmed new account.
          setAccountError(message)
        }
        setLoading(false)
      }
    }
    const schedule = (u: Parameters<typeof hydrate>[0]) => {
      if (scheduled) clearTimeout(scheduled)
      // Keep database requests outside the auth notification callback.
      scheduled = setTimeout(() => { void hydrate(u) }, 0)
    }
    loaded.current = false // an explicit retry must read again
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      // right after Google sign in the session carries Google's own token; keep it in memory to read the birthday once (age page)
      if (session?.provider_token && session.user?.app_metadata?.provider === 'google') rememberGoogleToken(session.provider_token)
      if (ev === 'SIGNED_OUT') { authEvents++; if (scheduled) clearTimeout(scheduled); void hydrate(null) }
      else if ((ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION' || ev === 'TOKEN_REFRESHED') && session?.user) { authEvents++; schedule(session.user) }
    })
    const startedAt = authEvents
    void withTimeout(supabase.auth.getSession(), 15000, 'Restoring your session').then(({ data: s, error }) => {
      if (!alive || authEvents !== startedAt) return
      if (error) throw new Error(error.message)
      schedule(s.session?.user ?? null)
    }).catch((error) => {
      if (alive && authEvents === startedAt) { setAccountError(error instanceof Error ? error.message : String(error)); setLoading(false) }
    })
    return () => { alive = false; hydration.current++; if (scheduled) clearTimeout(scheduled); sub.subscription.unsubscribe() }
  }, [retry])

  useEffect(() => {
    if (!supabase || !userId || !loaded.current || !pending.current) return
    const t = setTimeout(() => { void saveNow() }, 400)
    return () => clearTimeout(t)
  }, [data, userId, saveNow])

  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') void saveNow() }
    const hide = () => { void saveNow() }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', hide)
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', hide) }
  }, [saveNow])

  const begin = useCallback((e: string, name: string) => {
    write(SESSION, e)
    setData(withDefaults(blankData(name), read<Partial<AppData>>(dataKey(e), {})))
    setEmail(e)
  }, [])

  const saveAccount = useCallback(async (fn: (d: AppData) => AppData): Promise<string | null> => {
    const next = { ...fn(dataRef.current), ts: Date.now() }
    const uid = activeUser.current
    if (supabase) {
      if (!uid || !loaded.current) return 'Reconnect to your account before finishing setup.'
      // Keep completed answers even if the request fails or the tab closes.
      write(cacheKey(uid), accountData(next))
      const snapshot = { userId: uid, data: next }
      pending.current = snapshot
      const error = await saveNow()
      if (error) return error
      if (activeUser.current !== uid) return 'Your account changed while saving. Sign in again.'
    } else if (emailRef.current) write(dataKey(emailRef.current), next)
    dataRef.current = next
    setData(next)
    return null
  }, [saveNow])

  const signUp: Ctx['signUp'] = async (name, e, password) => {
    const key = e.trim().toLowerCase()
    if (supabase) {
      if (password.length < 6) return 'Password must be at least 6 characters.'
      const { data: r, error } = await supabase.auth.signUp({ email: key, password, options: { data: { full_name: name } } })
      if (error) return error.message
      if (!r.session) return CONFIRM_EMAIL
      return null
    }
    if (!/^\S+@\S+\.\S+$/.test(key)) return 'Enter a valid email.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    const accounts = read<Record<string, { hash: string; name: string }>>(ACCOUNTS, {})
    if (accounts[key]) return 'That email already has an account. Log in instead.'
    accounts[key] = { hash: await sha(password), name }
    write(ACCOUNTS, accounts)
    begin(key, name)
    return null
  }
  const logIn: Ctx['logIn'] = async (e, password) => {
    const key = e.trim().toLowerCase()
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email: key, password })
      return error ? 'Email or password is incorrect.' : null
    }
    const acc = read<Record<string, { hash: string; name: string }>>(ACCOUNTS, {})[key]
    if (!acc || acc.hash !== (await sha(password))) return 'Email or password is incorrect.'
    begin(key, acc.name)
    return null
  }
  // ---- sign-in codes: forgot password, and signing in without one ----
  const sendCode: Ctx['sendCode'] = async (e) => {
    const key = e.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(key)) return 'Enter a valid email.'
    if (!supabase) return 'Sign-in codes need an online account.'
    // shouldCreateUser: false so a code can never start a sign up (that goes through the age check)
    const { error } = await supabase.auth.signInWithOtp({ email: key, options: { shouldCreateUser: false } })
    if (!error) return null
    const said = `${error.code ?? ''} ${error.message}`.toLowerCase()
    if (error.status === 429 || said.includes('rate') || said.includes('seconds')) return 'Please wait a minute before asking for another code.'
    if (said.includes('otp_disabled') || said.includes('signups not allowed')) return null // no account for that email: answer exactly as if there were one
    return error.message
  }
  const verifyCode: Ctx['verifyCode'] = async (e, code) => {
    if (!supabase) return 'Sign-in codes need an online account.'
    const token = code.replace(/\D/g, '')
    if (token.length < 6) return 'Enter the 6-digit code from the email.'
    setChoosePassword(true) // set first: the code signs them in, and the screen only shows once they are
    const { error } = await supabase.auth.verifyOtp({ email: e.trim().toLowerCase(), token, type: 'email' })
    if (!error) return null
    setChoosePassword(false)
    const said = `${error.code ?? ''} ${error.message}`.toLowerCase()
    if (said.includes('expired') || said.includes('invalid')) return 'That code is wrong or has expired. Use the newest email, or ask for a new code.'
    if (error.status === 429 || said.includes('rate')) return 'Too many tries. Wait a few minutes and ask for a new code.'
    return error.message
  }
  const setPassword: Ctx['setPassword'] = async (password) => {
    if (password !== null) {
      if (password.length < 6) return 'Password must be at least 6 characters.'
      if (!supabase) return 'Sign in first.'
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return (error.code ?? '') === 'same_password' ? 'Pick a password you haven’t used before.' : error.message
    }
    setChoosePassword(false)
    return null
  }
  const googleIn = (e: string, name: string) => begin(e.toLowerCase(), name)
  const googleOAuth = async () => {
    if (!supabase) return 'Backend not configured.'
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, ...(GOOGLE_BIRTHDAY_ON ? { scopes: GOOGLE_SCOPES } : {}) } })
    return error ? error.message : null
  }
  /** Everything this browser kept for the account that was just deleted. */
  const wipeLocal = (uid: string | null, mail: string | null) => {
    try {
      if (uid) localStorage.removeItem(cacheKey(uid))
      if (mail) localStorage.removeItem(dataKey(mail))
      localStorage.removeItem('wpf.invite')
      localStorage.setItem(DELETED, String(Date.now()))
    } catch { /* storage unavailable */ }
    try { indexedDB.deleteDatabase('wpf-photos') } catch { /* nothing stored on this device */ }
  }
  const deleteAccount: Ctx['deleteAccount'] = async () => {
    const mail = emailRef.current
    if (supabase) {
      const uid = activeUser.current
      if (!uid) return 'You’re signed out. Sign in again to delete your account.'
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) {
        const res = (error as { context?: Response }).context
        let detail = ''
        try { detail = res ? ((await res.json()) as { error?: string }).error ?? '' : '' } catch { /* no details sent */ }
        if (res?.status === 404) return 'Account deletion isn’t switched on yet. Please try again later.'
        return `We couldn’t delete your account${detail ? ` (${detail})` : ''}. Try again in a moment.`
      }
      pending.current = null; loaded.current = false // nothing left to save to
      wipeLocal(uid, mail)
      await supabase.auth.signOut({ scope: 'local' }) // the account is gone on the server, so only this browser's sign in needs clearing
      return null
    }
    if (mail) {
      const accounts = read<Record<string, unknown>>(ACCOUNTS, {})
      delete accounts[mail]; write(ACCOUNTS, accounts)
    }
    wipeLocal(null, mail)
    write(SESSION, null); setEmail(null); setData(blankData(''))
    return null
  }
  const logOut = () => {
    if (supabase) {
      // Flush before removing authentication; local cache survives failed/offline saves.
      void saveNow().then(async () => {
        const { error } = await supabase!.auth.signOut()
        if (error) setSyncError(`Could not log out: ${error.message}`)
      })
      return
    }
    write(SESSION, null); setEmail(null); setData(blankData(''))
  }
  // keep the public profile card (bio, on/off, stats) in step with your data
  const lastPublished = useRef('')
  useEffect(() => { lastPublished.current = '' }, [userId])
  useEffect(() => {
    if (!supabase || !userId || !loaded.current || !data.profile) return
    const t = setTimeout(() => {
      const payload = { bio: data.bio ?? null, stats: computeStats(data), ...(data.profilePublic !== undefined ? { is_public: data.profilePublic } : {}) }
      const key = JSON.stringify(payload)
      if (key === lastPublished.current) return
      lastPublished.current = key
      void publishProfile(userId, payload)
    }, 3000)
    return () => clearTimeout(t)
  }, [data, userId])

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const next = { ...fn(dataRef.current), ts: Date.now() }
    dataRef.current = next
    if (supabase && activeUser.current) {
      write(cacheKey(activeUser.current), accountData(next))
      pending.current = { userId: activeUser.current, data: next }
      setSaveState('saving')
    } else if (emailRef.current) { write(dataKey(emailRef.current), next); setSaveState('saved') }
    setData(next)
  }, [])

  const avatarUrl = data.avatar || googlePhoto
  const setAvatar = (dataUrl: string | null) => {
    update((d) => ({ ...d, avatar: dataUrl ?? undefined }))
    const next = dataUrl || googlePhoto
    setMyAvatar(userId, next)
    if (userId) void syncMyAvatar(userId, next)
  }
  return <C.Provider value={{ email, userId, avatarUrl, googlePhoto, setAvatar, loading, accountError, syncError, saveState, retryAccount, saveAccount, googleOAuth, data, update, signUp, logIn, googleIn, deleteAccount, sendCode, verifyCode, choosePassword, setPassword, logOut }}>{children}</C.Provider>
}
