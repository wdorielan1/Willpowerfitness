import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './App'
import { useApp } from './store'
import { todayISO } from './engine'
import { MIN_AGE, YOUNG_MESSAGE, checkAge, clearPass, hasPass, isBlocked, markBlocked } from './age'

/** A date of birth box with its one-line promise. Used on sign up and on the age gate. */
export function DobField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | null }) {
  return (
    <label className="dob">Date of birth
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} min="1900-01-01" max={todayISO()} autoComplete="bday" required aria-invalid={!!error} />
      <span className="small mute">You must be {MIN_AGE} or older. We use this once to check your age and don’t keep it.</span>
    </label>
  )
}

/**
 * Shown to a signed-in account that hasn't had its age checked yet (everyone who signed up before this existed, and anyone
 * who got in through a Log in button). Under 13 can't continue. Only the day the check passed is saved, never the date of birth.
 */
export function AgeGate() {
  const { email, update, logOut } = useApp()
  const [dob, setDob] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [young, setYoung] = useState(() => isBlocked())
  const [fromSignUp] = useState(() => !isBlocked() && hasPass(email)) // they just passed it on the sign up page
  const confirm = () => update((d) => ({ ...d, ageConfirmed: todayISO() }))
  useEffect(() => { if (fromSignUp) { confirm(); clearPass() } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (fromSignUp) return <div className="auth" style={{ justifyItems: 'center' }}><Logo size={64} /></div>

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const r = checkAge(dob)
    if (r.ok) { confirm(); return }
    if (r.reason === 'young') { markBlocked(); setYoung(true); return }
    setErr(r.message)
  }

  return (
    <div className="auth age-gate">
      <div className="logo"><Logo size={64} /><h1>One quick thing</h1></div>
      {young ? (
        <div className="card">
          <p role="alert">{YOUNG_MESSAGE.replace('create an account for you', 'let you use Will Power')}</p>
          <p className="small mute">If you think this is a mistake, see the contact details on our <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy page</Link>.</p>
          <button className="primary" onClick={logOut}>Log out</button>
        </div>
      ) : (
        <form className="card" onSubmit={submit} noValidate>
          <p>Will Power is for people {MIN_AGE} and older. Please confirm your date of birth to keep going.</p>
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
