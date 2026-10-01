import { useEffect, useRef, useState } from 'react'
import { Logo } from '../App'
import { useApp } from '../store'
import { TAGLINE } from '../data'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const APPLE_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined
const APPLE_REDIRECT = (import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined) ?? (typeof location !== 'undefined' ? location.origin : '')

function decodeJwt(token: string): { email: string; name?: string; sub?: string } {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(decodeURIComponent(escape(atob(payload))))
}

export default function Auth() {
  const { signUp, logIn, googleIn } = useApp()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demoGoogle, setDemoGoogle] = useState(false)
  const [demoApple, setDemoApple] = useState(false)
  const gbtn = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID) return
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => {
      const g = (window as any).google?.accounts?.id // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!g || !gbtn.current) return
      g.initialize({
        client_id: CLIENT_ID,
        callback: (r: { credential: string }) => {
          const u = decodeJwt(r.credential)
          googleIn(u.email, u.name ?? u.email.split('@')[0])
        },
      })
      g.renderButton(gbtn.current, { theme: 'filled_black', size: 'large', width: 340, text: 'continue_with' })
    }
    document.head.appendChild(s)
    return () => { s.remove() }
  }, [googleIn])

  useEffect(() => {
    if (!APPLE_ID) return
    const s = document.createElement('script')
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
    s.async = true
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).AppleID?.auth.init({ clientId: APPLE_ID, scope: 'name email', redirectURI: APPLE_REDIRECT, usePopup: true })
    }
    document.head.appendChild(s)
    return () => { s.remove() }
  }, [])

  const appleSignIn = async () => {
    setErr(null)
    if (!APPLE_ID) { setDemoApple(true); return }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (window as any).AppleID.auth.signIn()
      const u = decodeJwt(r.authorization.id_token)
      // Apple only sends the name on the very first sign-in; email may be a private relay address.
      const first = r.user?.name?.firstName as string | undefined
      const email = u.email ?? `${u.sub}@apple.id`
      googleIn(email, first ?? email.split('@')[0])
    } catch (e) {
      const code = (e as { error?: string })?.error
      if (code !== 'popup_closed_by_user') setErr('Apple sign-in failed. Try again or use email.')
    }
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setBusy(true)
    setErr(null)
    const res = mode === 'signup' ? await signUp(name.trim() || email.split('@')[0], email, pw) : await logIn(email, pw)
    setBusy(false)
    if (res) setErr(res)
  }

  return (
    <div className="auth">
      <div className="logo">
        <Logo size={84} />
        <h1>WILL POWER FITNESS</h1>
        <div className="tagline">{TAGLINE}</div>
        <p className="mute">The accountability community for people who need help showing up. Free during beta.</p>
      </div>

      {CLIENT_ID ? (
        <div ref={gbtn} style={{ display: 'grid', justifyItems: 'center' }} />
      ) : demoGoogle ? (
        <form className="card" onSubmit={(ev) => { ev.preventDefault(); if (/@gmail\.com$/i.test(email)) googleIn(email, email.split('@')[0]); else setErr('Enter a Gmail address.') }}>
          <label>Gmail address (demo Google sign-in)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoFocus /></label>
          <p className="small mute">Real Google Sign-In turns on once VITE_GOOGLE_CLIENT_ID is configured.</p>
          <button className="primary">Continue</button>
        </form>
      ) : (
        <button className="google full" onClick={() => setDemoGoogle(true)}>Continue with Google</button>
      )}

      {demoApple ? (
        <form className="card" onSubmit={(ev) => { ev.preventDefault(); if (/^\S+@\S+\.\S+$/.test(email)) googleIn(email, email.split('@')[0]); else setErr('Enter a valid email.') }}>
          <label>Email (demo Apple sign-in)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@icloud.com" autoFocus /></label>
          <p className="small mute">Real Sign in with Apple turns on once VITE_APPLE_CLIENT_ID is configured.</p>
          <button className="primary">Continue</button>
        </form>
      ) : (
        <button className="apple full" onClick={appleSignIn}><span aria-hidden></span> Continue with Apple</button>
      )}

      <div className="divider">or use email</div>

      <form className="card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
        </div>
        {mode === 'signup' && <label>First name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></label>}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
        {err && <div className="err">{err}</div>}
        <button className="primary" disabled={busy}>{mode === 'signup' ? 'Join the free beta' : 'Log in'}</button>
      </form>
    </div>
  )
}
