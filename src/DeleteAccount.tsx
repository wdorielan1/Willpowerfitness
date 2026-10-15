import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from './components'
import { useApp } from './store'

/** Delete my account: says plainly what goes, asks them to type DELETE, then the app signs them out. */
export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const { deleteAccount } = useApp()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ready = typed.trim().toLowerCase() === 'delete'
  const go = async () => {
    setBusy(true); setErr(null)
    const e = await deleteAccount() // on success the app signs out, so this sheet goes away with it
    setBusy(false)
    if (e) setErr(e)
  }
  return (
    <Sheet title="Delete your account?" onClose={busy ? () => {} : onClose} z={70}>
      <p>This permanently deletes your Will Power account. It can’t be undone.</p>
      <ul className="small delete-list">
        <li>Your profile, workouts, weights, nutrition and settings</li>
        <li>Your progress photos</li>
        <li>Your crew posts, comments, likes, photos and videos</li>
        <li>Your follows, followers and notifications</li>
        <li>Challenges you created</li>
      </ul>
      <p className="small mute">A crew you started that other people are in passes to its longest-standing member. One nobody else joined is deleted with you.</p>
      <p className="small mute">Want a copy first? <Link to="/export" onClick={onClose} style={{ textDecoration: 'underline' }}>Export your data</Link>. If you signed in with Google, you can also remove Will Power under Third-party apps in your Google Account settings.</p>
      <label>Type DELETE to confirm<input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Type DELETE to confirm" /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="danger" disabled={!ready || busy} onClick={() => void go()}>{busy ? 'Deleting…' : 'Delete my account'}</button>
      <button className="ghost" disabled={busy} onClick={onClose}>Cancel</button>
    </Sheet>
  )
}
