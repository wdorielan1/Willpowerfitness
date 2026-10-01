import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppData } from './types'

const SESSION = 'wpf.session'
const ACCOUNTS = 'wpf.accounts'
const dataKey = (email: string) => `wpf.data.${email}`

export const blankData = (name: string): AppData => ({
  name, profile: null, joined: [], primary: null, checkins: {}, logs: [], cardio: [], weights: [],
  swaps: {}, short: {}, drafts: {}, meals: {}, messages: [], custom: [], partner: false,
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
  const [data, setData] = useState<AppData>(() => {
    const e = read<string | null>(SESSION, null)
    return e ? read(dataKey(e), blankData('')) : blankData('')
  })

  useEffect(() => { if (email) write(dataKey(email), data) }, [email, data])

  const begin = useCallback((e: string, name: string) => {
    write(SESSION, e)
    setData(read(dataKey(e), blankData(name)))
    setEmail(e)
  }, [])

  const signUp: Ctx['signUp'] = async (name, e, password) => {
    const key = e.trim().toLowerCase()
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
    const acc = read<Record<string, { hash: string; name: string }>>(ACCOUNTS, {})[key]
    if (!acc || acc.hash !== (await sha(password))) return 'Email or password is incorrect.'
    begin(key, acc.name)
    return null
  }
  const googleIn = (e: string, name: string) => begin(e.toLowerCase(), name)
  const logOut = () => { write(SESSION, null); setEmail(null); setData(blankData('')) }
  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), [])

  return <C.Provider value={{ email, data, update, signUp, logIn, googleIn, logOut }}>{children}</C.Provider>
}
