import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppData } from './types'
import { supabase, fetchCrews } from './cloud'
import { DEFAULT_SETTINGS } from './data'

const SESSION = 'wpf.session'
const ACCOUNTS = 'wpf.accounts'
const dataKey = (email: string) => `wpf.data.${email}`

export const blankData = (name: string): AppData => ({
  name, profile: null, joined: [], primary: null, checkins: {}, logs: [], cardio: [], weights: [],
  swaps: {}, short: {}, drafts: {}, meals: {}, messages: [], custom: [], partner: false,
  dayOverride: {}, extras: {}, removed: {}, started: {}, photos: [], qotd: {}, extendHours: {}, posts: [], steps: [], challengesJoined: [], settings: DEFAULT_SETTINGS,
})

/** Saved data wins, but any setting added in a newer version falls back to its default. */
const withDefaults = (base: AppData, saved: Partial<AppData>): AppData => ({
  ...base, ...saved,
  settings: { ...base.settings, ...(saved.settings ?? {}), rest: { ...base.settings.rest, ...(saved.settings?.rest ?? {}) } },
})

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

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
  const loaded = useRef(false)
  const [data, setData] = useState<AppData>(() => {
    if (supabase) return blankData('')
    const e = read<string | null>(SESSION, null)
    return e ? withDefaults(blankData(''), read<Partial<AppData>>(dataKey(e), {})) : blankData('')
  })

  // ---- local-only mode: persist per email on this device ----
  useEffect(() => { if (!supabase && email) write(dataKey(email), data) }, [email, data])

  // ---- cloud mode: session + load profile ----
  const hydratedFor = useRef<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const cacheKey = (id: string) => `wpf.cache.${id}`

  useEffect(() => {
    if (!supabase) return
    const hydrate = async (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!u) {
        hydratedFor.current = null; loaded.current = false
        setUserId(null); setEmail(null); setData(blankData('')); setLoading(false)
        return
      }
      if (hydratedFor.current === u.id) return // token refresh / tab focus: keep what we have
      hydratedFor.current = u.id
      loaded.current = false
      const { data: row, error } = await supabase!.from('profiles').select('name,data').eq('id', u.id).maybeSingle()
      const cached = read<Partial<AppData> | null>(cacheKey(u.id), null)
      if (error && !cached) {
        // Could not reach the database and nothing cached: do NOT continue with blank data (it would overwrite the real profile).
        hydratedFor.current = null
        setLoading(false)
        return
      }
      const remote = (row?.data as Partial<AppData> | undefined) ?? null
      const name = (row?.name as string) || (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0]
      // use whichever copy is newer
      const newest = remote && cached ? ((cached.ts ?? 0) > (remote.ts ?? 0) ? cached : remote) : remote ?? cached ?? {}
      const base = { ...withDefaults(blankData(name), newest as Partial<AppData>), name: (newest as Partial<AppData>).name || name }
      const crews = await fetchCrews()
      setData({ ...base, custom: crews })
      setUserId(u.id)
      setEmail(u.email ?? u.id)
      loaded.current = true
      setLoading(false)
    }
    void supabase.auth.getSession().then(({ data: s }) => hydrate(s.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === 'SIGNED_OUT') void hydrate(null)
      else if (ev === 'SIGNED_IN' && session?.user) void hydrate(session.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ---- cloud mode: cache on device + save to the database (debounced, and flushed when the app is hidden) ----
  const saveNow = useCallback(() => {
    const uid = userId
    if (!supabase || !uid || !loaded.current) return
    const { custom: _c, ...rest } = dataRef.current
    void _c
    void supabase.from('profiles').upsert({ id: uid, name: dataRef.current.name, data: rest, updated_at: new Date().toISOString() })
  }, [userId])

  useEffect(() => {
    if (!supabase || !userId || !loaded.current) return
    const { custom: _c, ...rest } = data
    void _c
    write(cacheKey(userId), rest)
    const t = setTimeout(saveNow, 400)
    return () => clearTimeout(t)
  }, [data, userId, saveNow])

  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') saveNow() }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', saveNow)
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', saveNow) }
  }, [saveNow])

  const begin = useCallback((e: string, name: string) => {
    write(SESSION, e)
    setData(withDefaults(blankData(name), read<Partial<AppData>>(dataKey(e), {})))
    setEmail(e)
  }, [])

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
    if (supabase) { void supabase.auth.signOut(); return }
    write(SESSION, null); setEmail(null); setData(blankData(''))
  }
  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => ({ ...fn(d), ts: Date.now() })), [])

  return <C.Provider value={{ email, userId, loading, googleOAuth, data, update, signUp, logIn, googleIn, logOut }}>{children}</C.Provider>
}
