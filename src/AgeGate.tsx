import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './App'
import { useApp } from './store'
import { todayISO } from './engine'
import { MIN_AGE, NOT_ALLOWED_MESSAGE, isBlocked, markBlocked } from './age'
import { googleAge } from './googleAge'
import { DeleteAccountSheet } from './DeleteAccount'

/**
 * The page after sign up (and, once, for anyone who signed up before this existed): a short waiver, "I confirm I am 13 or older", and
 * a yes or no for 18 or older. No date of birth is asked or kept; only the day they confirmed and the 18 answer are saved.
 * "I'm under 13" stops them here.
 */
export function AgeGate() {
  const { update, logOut } = useApp()
  const [confirmed, setConfirmed] = useState(false) // the waiver: I am 13 or older
  const [adult, setAdult] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [young, setYoung] = useState(() => isBlocked())
  const [deleting, setDeleting] = useState(false)
  // someone who just signed in with Google may not need to be asked: Google's own birthday gives the answer (see src/googleAge.ts)
  const [checking, setChecking] = useState(() => !isBlocked() && !!googleAge())
  useEffect(() => {
    const p = isBlocked() ? null : googleAge()
    if (!p) return
    let alive = true
    void p.then((r) => {
      if (!alive) return
      if (r === 'adult' || r === 'ok') update((d) => ({ ...d, ageConfirmed: todayISO(), adult: r === 'adult' }))
      else if (r === 'young') { markBlocked(); setYoung(true) }
      setChecking(false)
    })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!confirmed) { setErr(`Tick the box to confirm you are ${MIN_AGE} or older.`); return }
    if (adult === null) { setErr('Choose yes or no: are you 18 or older?'); return }
    update((d) => ({ ...d, ageConfirmed: todayISO(), adult }))
  }
  const under13 = () => { markBlocked(); setYoung(true) }

  if (checking) return <div className="auth" style={{ justifyItems: 'center' }}><Logo size={64} /></div>

  return (
    <div className="auth age-gate">
      <div className="logo"><Logo size={64} /></div>
      {young ? (
        <div className="card">
          <p role="alert">{NOT_ALLOWED_MESSAGE}</p>
          <p className="small mute">If you think this is a mistake, see the contact details on our <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy page</Link>.</p>
          <button className="primary" onClick={() => setDeleting(true)}>Delete my account</button>
          <button className="ghost" onClick={logOut}>Log out</button>
          {deleting && <DeleteAccountSheet onClose={() => setDeleting(false)} />}
        </div>
      ) : (
        <form className="card" onSubmit={submit} noValidate>
          <h2>Before you start</h2>
          <label className="waiver">
            <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setErr(null) }} aria-invalid={!!err && !confirmed} />
            <span>I confirm that I am {MIN_AGE} years old or older, and I agree to the <Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> and <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link>.</span>
          </label>
          <div className="adult-ask" role="group" aria-label="Are you 18 or older?">
            <b>Are you 18 or older?</b>
            <span className="small mute">Adults start with a public profile, and their posts show in Explore for everyone on Will Power. If you are 13 to 17, your profile starts private and you can choose to make it public later.</span>
            <div className="seg">
              <button type="button" className={adult === true ? 'on' : ''} aria-pressed={adult === true} onClick={() => { setAdult(true); setErr(null) }}>Yes</button>
              <button type="button" className={adult === false ? 'on' : ''} aria-pressed={adult === false} onClick={() => { setAdult(false); setErr(null) }}>No</button>
            </div>
          </div>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="primary">Continue</button>
          <button type="button" className="quiet-action" onClick={under13}>I’m under {MIN_AGE}</button>
          <button type="button" className="ghost" onClick={logOut}>Log out</button>
          <p className="small mute" style={{ textAlign: 'center' }}><Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> · <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link></p>
        </form>
      )}
    </div>
  )
}
