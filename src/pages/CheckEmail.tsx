import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../App'
import { supabase } from '../cloud'

/** Shown right after sign-up while the person confirms their email. */
export default function CheckEmail() {
  const [params] = useSearchParams()
  const email = params.get('e') ?? ''
  const [wait, setWait] = useState(45)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const resend = async () => {
    if (!supabase || !email || wait > 0) return
    setMsg('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setMsg(error.message.toLowerCase().includes('rate') ? 'Please wait a minute before asking for another email.' : error.message)
    else { setMsg('Sent again. Check your inbox and spam.'); setWait(60) }
  }

  return (
    <div className="auth" style={{ textAlign: 'center' }}>
      <div className="logo"><Logo size={56} /></div>
      <div className="check-email-icon" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
      </div>
      <div>
        <h1>Check your email</h1>
        <p className="mute">We sent a confirmation link{email ? <> to <b style={{ color: 'var(--text)' }}>{email}</b></> : ''}.</p>
      </div>
      <ol className="steps" style={{ textAlign: 'left' }}>
        <li className="step">Open the email from <b>Will Power</b></li>
        <li className="step">Tap <b>Confirm my email</b></li>
        <li className="step">You’re in. We’ll set up your plan and find your crew.</li>
      </ol>
      <p className="small mute">Can’t see it? Check spam or promotions. If it’s there, tap “Not spam” so the next ones reach your inbox.</p>
      {msg && <p className="small" role="status">{msg}</p>}
      <button className="ghost" disabled={wait > 0} onClick={() => void resend()}>{wait > 0 ? `Send it again in ${wait}s` : 'Send it again'}</button>
      <p className="small mute">Already confirmed? <Link to="/join?m=login" style={{ textDecoration: 'underline' }}>Log in</Link> · Wrong email? <Link to="/join" style={{ textDecoration: 'underline' }}>Start over</Link></p>
    </div>
  )
}
