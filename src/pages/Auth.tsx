import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../App'
import { useApp } from '../store'
import { TAGLINE } from '../data'
import { cloudEnabled } from '../cloud'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function decodeJwt(token: string): { email: string; name?: string } {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(decodeURIComponent(escape(atob(payload))))
}

export default function Auth() {
  const { signUp, logIn, googleIn, googleOAuth } = useApp()
  const [params] = useSearchParams()
  useEffect(() => {
    const ref = params.get('ref'), crew = params.get('crew')
    if (ref || crew) { try { localStorage.setItem('wpf.invite', JSON.stringify({ ref, crew })) } catch { /* storage unavailable */ } }
  }, [params])
  const [mode, setMode] = useState<'signup' | 'login'>(params.get('m') === 'login' ? 'login' : 'signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demoGoogle, setDemoGoogle] = useState(false)
  const gbtn = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || cloudEnabled) return
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
      <Link to="/" className="small mute">← Back</Link>
      <div className="logo">
        <Logo size={84} />
        <h1>WILPOW</h1>
        <div className="tagline">{TAGLINE}</div>
        <p className="mute">The accountability community for people who need help showing up. Free during beta.</p>
      </div>

      {cloudEnabled ? (
        <button className="google full" onClick={async () => { const r = await googleOAuth(); if (r) setErr(r) }}>Continue with Google</button>
      ) : CLIENT_ID ? (
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
        <p className="small mute" style={{ textAlign: 'center' }}>By continuing you agree to our <Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.</p>
      </form>
    </div>
  )
}
