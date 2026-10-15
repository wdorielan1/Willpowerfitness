import { useState } from 'react'
import { Logo } from './App'
import { useApp } from './store'

/** Shown once, straight after someone signs in with an emailed code: pick a new password, or skip it. */
export function ChoosePassword() {
  const { setPassword } = useApp()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setBusy(true); setErr(null)
    const res = await setPassword(pw)
    setBusy(false)
    if (res) setErr(res)
  }
  return (
    <div className="auth">
      <div className="logo"><Logo size={56} /></div>
      <div>
        <h1>Choose a new password</h1>
        <p className="mute">You’re signed in. Pick a password for next time, or skip it and ask for a code whenever you need one.</p>
      </div>
      <form className="card" onSubmit={save}>
        <label>New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus /></label>
        <p className="small mute">At least 6 characters.</p>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        <button type="button" className="ghost" disabled={busy} onClick={() => void setPassword(null)}>Skip for now</button>
      </form>
    </div>
  )
}
