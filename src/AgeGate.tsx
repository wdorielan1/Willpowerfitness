import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './App'
import { useApp } from './store'
import { todayISO } from './engine'
import { MIN_AGE, NOT_ALLOWED_MESSAGE, checkAge, isBlocked, markBlocked } from './age'
import { googleAge } from './googleAge'

/** A date of birth box with its one-line note. */
export function DobField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | null }) {
  return (
    <label className="dob">Date of birth
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} min="1900-01-01" max={todayISO()} autoComplete="bday" required aria-invalid={!!error} />
      <span className="small mute">You must be {MIN_AGE} or older. We use this once to check your age and don’t keep it.</span>
    </label>
  )
}

/**
 * The page after sign up (and, once, for anyone who signed up before this existed): asks for a date of birth.
 * Under 13 can't continue. Only the day the check passed is saved, never the date of birth.
 */
export function AgeGate() {
  const { update, logOut } = useApp()
  const [dob, setDob] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [young, setYoung] = useState(() => isBlocked())
  // someone who just signed in with Google may not need to be asked: Google's own birthday gives the answer (see src/googleAge.ts)
  const [checking, setChecking] = useState(() => !isBlocked() && !!googleAge())
  useEffect(() => {
    const p = isBlocked() ? null : googleAge()
    if (!p) return
    let alive = true
    void p.then((r) => {
      if (!alive) return
      if (r === 'ok') update((d) => ({ ...d, ageConfirmed: todayISO() }))
      else if (r === 'young') { markBlocked(); setYoung(true) }
      setChecking(false)
    })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const r = checkAge(dob)
    if (r.ok) { update((d) => ({ ...d, ageConfirmed: todayISO() })); return }
    if (r.reason === 'young') { markBlocked(); setYoung(true); return }
    setErr(r.message)
  }

  if (checking) return <div className="auth" style={{ justifyItems: 'center' }}><Logo size={64} /></div>

  return (
    <div className="auth age-gate">
      <div className="logo"><Logo size={64} /></div>
      {young ? (
        <div className="card">
          <p role="alert">{NOT_ALLOWED_MESSAGE}</p>
          <p className="small mute">If you think this is a mistake, see the contact details on our <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy page</Link>.</p>
          <button className="primary" onClick={logOut}>Log out</button>
        </div>
      ) : (
        <form className="card" onSubmit={submit} noValidate>
          <DobField value={dob} onChange={(v) => { setDob(v); setErr(null) }} error={err} />
          {err && <div className="err" role="alert">{err}</div>}
          <button className="primary">Continue</button>
          <button type="button" className="ghost" onClick={logOut}>Log out</button>
          <p className="small mute" style={{ textAlign: 'center' }}><Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> · <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link></p>
        </form>
      )}
    </div>
  )
}
