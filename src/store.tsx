import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppData } from './types'
import { supabase, fetchCrews, ensureMemberCloud } from './cloud'
import { DEFAULT_SETTINGS } from './data'
import { withRequestTimeout, withTimeout } from './photos'

const SESSION = 'wpf.session'
const ACCOUNTS = 'wpf.accounts'
const dataKey = (email: string) => `wpf.data.${email}`

export const blankData = (name: string): AppData => ({
  name, profile: null, joined: [], primary: null, checkins: {}, logs: [], cardio: [], weights: [],
  swaps: {}, short: {}, drafts: {}, meals: {}, messages: [], custom: [], partner: false,
  dayOverride: {}, extras: {}, removed: {}, started: {}, photos: [], qotd: {}, extendHours: {}, posts: [], steps: [], challengesJoined: [], foodLog: {}, customFoods: [], carbOverride: {}, customChallenges: [], mealPlan: {}, settings: DEFAULT_SETTINGS,
})

/** Saved data wins, but any setting added in a newer version falls back to its default. */
const withDefaults = (base: AppData, saved: Partial<AppData>): AppData => ({
  ...base, ...saved,
  posts: (saved.posts ?? []).map((p) => ({ ...p, imagePaths: p.imagePaths ?? (p.imagePath ? [p.imagePath] : []), imageIds: p.imageIds ?? (p.imageId ? [p.imageId] : []) })),
  settings: { ...base.settings, ...(saved.settings ?? {}), rest: { ...base.settings.rest, ...(saved.settings?.rest ?? {}) }, nutrition: { ...base.settings.nutrition, ...(saved.settings?.nutrition ?? {}) } },
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
  loading: boolean
  accountError: string | null
  syncError: string | null
  retryAccount: () => void
  saveAccount: (fn: (d: AppData) => AppData) => Promise<string | null>
  googleOAuth: () => Promise<string | null>
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  signUp: (name: string, email: string, password: string) => Promise<string | null>
  logIn: (email: string, password: string) => Promise<string | null>
  googleIn: (email: string, name: string) => void
  logOut: () => void
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => read<string | null>(SESSION, null))
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
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
        if (pending.current === snapshot) pending.current = null
        setSyncError(null)
      }
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (activeUser.current === snapshot.userId) setSyncError(`Changes are saved on this device, but could not sync: ${message}`)
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
        setUserId(null); setEmail(null); setData(blankData('')); setLoading(false)
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
      if (!r.session) return 'Check your email to confirm your account, then log in.'
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
  const googleIn = (e: string, name: string) => begin(e.toLowerCase(), name)
  const googleOAuth = async () => {
    if (!supabase) return 'Backend not configured.'
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
    return error ? error.message : null
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
  const update = useCallback((fn: (d: AppData) => AppData) => {
    const next = { ...fn(dataRef.current), ts: Date.now() }
    dataRef.current = next
    if (supabase && activeUser.current) {
      write(cacheKey(activeUser.current), accountData(next))
      pending.current = { userId: activeUser.current, data: next }
    } else if (emailRef.current) write(dataKey(emailRef.current), next)
    setData(next)
  }, [])

  return <C.Provider value={{ email, userId, loading, accountError, syncError, retryAccount, saveAccount, googleOAuth, data, update, signUp, logIn, googleIn, logOut }}>{children}</C.Provider>
}
