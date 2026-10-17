import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../App'
import { CONFIRM_EMAIL, useApp } from '../store'
import { TAGLINE } from '../data'
import { cloudEnabled } from '../cloud'
import { isBlocked, YOUNG_MESSAGE } from '../age'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function decodeJwt(token: string): { email: string; name?: string } {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(decodeURIComponent(escape(atob(payload))))
}

export default function Auth() {
  const { signUp, logIn, googleIn, googleOAuth, sendCode, verifyCode } = useApp()
  const [params] = useSearchParams()
  const nav = useNavigate()
  useEffect(() => {
    const ref = params.get('ref'), crew = params.get('crew'), u = params.get('u')
    const code = params.get('inv'), inv = code && /^[A-Za-z0-9]{16,64}$/.test(code) ? code : null
    if (ref || crew || u || inv) { try { localStorage.setItem('wpf.invite', JSON.stringify({ ref, crew, u, inv })) } catch { /* storage unavailable */ } }
  }, [params])
  const [mode, setMode] = useState<'signup' | 'login'>(params.get('m') === 'login' ? 'login' : 'signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demoGoogle, setDemoGoogle] = useState(false)
  const gbtn = useRef<HTMLDivElement>(null)
  const blocked = isBlocked() // under-13 answer on this device in the last day: no new accounts from here
  // forgot password / sign in with a code: ask for the email, then enter the code we sent
  const [recover, setRecover] = useState<null | 'ask' | 'enter'>(null)
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(0) // seconds until another code can be asked for
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

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
    if (res === CONFIRM_EMAIL) { nav(`/check-email?e=${encodeURIComponent(email.trim().toLowerCase())}`); return }
    if (res) setErr(res)
  }

  const askForCode = async (ev?: React.FormEvent) => {
    ev?.preventDefault()
    if (busy || (recover === 'enter' && wait > 0)) return
    setBusy(true); setErr(null)
    const res = await sendCode(email)
    setBusy(false)
    if (res) { setErr(res); return }
    setCode(''); setWait(60); setRecover('enter')
  }
  const useCode = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setBusy(true); setErr(null)
    const res = await verifyCode(email, code)
    setBusy(false)
    if (res) setErr(res)
  }

  return (
    <div className="auth">
      <Link to="/" className="small mute">← Back</Link>
      <div className="logo">
        <Logo size={84} />
        <h1>WILL POWER</h1>
        <div className="tagline">{TAGLINE}</div>
        <p className="mute">The accountability community for people who need help showing up. Free during beta.</p>
      </div>

      {recover ? (
        <form className="card" onSubmit={recover === 'ask' ? askForCode : useCode}>
          <h2 style={{ margin: 0 }}>{recover === 'ask' ? 'Get a sign-in code' : 'Enter your code'}</h2>
          {recover === 'ask' ? <>
            <p className="small mute">Forgot your password, or don’t want to type it? Enter your email and we’ll send a 6-digit code. Use it to sign in, then pick a new password if you like.</p>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></label>
            {err && <div className="err" role="alert">{err}</div>}
            <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
          </> : <>
            <p className="small mute">If <b style={{ color: 'var(--text)' }}>{email.trim().toLowerCase()}</b> has an account, we’ve sent it a 6-digit code. It can take a minute, and it may land in spam.</p>
            <label>6-digit code<input value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={11} placeholder="123456" required autoFocus style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center' }} /></label>
            {err && <div className="err" role="alert">{err}</div>}
            <button className="primary" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="ghost" disabled={busy || wait > 0} onClick={() => void askForCode()}>{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</button>
            <button type="button" className="quiet-action" onClick={() => { setErr(null); setRecover('ask') }}>Use a different email</button>
          </>}
          <button type="button" className="quiet-action" onClick={() => { setErr(null); setRecover(null); setMode('login') }}>Back to log in</button>
        </form>
      ) : mode === 'signup' && blocked ? (
        <div className="card" role="alert">
          <p>{YOUNG_MESSAGE}</p>
          <button type="button" className="ghost" onClick={() => setMode('login')}>I already have an account</button>
        </div>
      ) : <>
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
        <button className="primary" disabled={busy}>{mode === 'signup' ? 'Join free' : 'Log in'}</button>
        {mode === 'login' && cloudEnabled && <button type="button" className="quiet-action" style={{ justifySelf: 'center', fontSize: 13 }} onClick={() => { setErr(null); setRecover('ask') }}>Forgot password? Email me a code</button>}
        <p className="small mute" style={{ textAlign: 'center' }}>By continuing you agree to our <Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.</p>
      </form>
      </>}
    </div>
  )
}
