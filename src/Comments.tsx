import { useCallback, useEffect, useState } from 'react'
import { Icon } from './icons'
import { addCommentCloud, deleteCommentCloud, fetchComments, reportCommentCloud, type PostComment } from './cloud'

const ago = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  if (m < 43200) return `${Math.round(m / 1440)}d`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Comments under one post. Anyone signed in can write one; the poster can remove any comment on
 * their post, and everyone can remove their own. Signed-out visitors can read and are asked to join.
 */
export function CommentThread({ postId, count: initial = 0, me, postMine = false }: {
  postId: string; count?: number; me: { id: string } | null; postMine?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PostComment[] | null>(null)
  const [count, setCount] = useState(initial)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  useEffect(() => { setCount(initial) }, [initial])

  const load = useCallback(async () => {
    const rows = await fetchComments(postId)
    setItems(rows); setCount(rows.length)
  }, [postId])

  // load when opened, then keep it fresh while it stays open
  useEffect(() => {
    if (!open) return
    void load()
    const id = setInterval(() => { void load() }, 15000)
    return () => clearInterval(id)
  }, [open, load])

  const send = async () => {
    if (!me || busy || !text.trim()) return
    setBusy(true); setErr(''); setNote('')
    const error = await addCommentCloud(postId, me.id, text)
    if (error) setErr(error)
    else { setText(''); await load() }
    setBusy(false)
  }
  const remove = async (id: string) => {
    setConfirmDel(null)
    const error = await deleteCommentCloud(id)
    if (error) setErr(error); else await load()
  }
  const report = async (id: string) => {
    if (!me) return
    const error = await reportCommentCloud(id, me.id)
    setNote(error ? '' : 'Reported. Thank you, we will take a look.'); if (error) setErr(error)
  }

  return (
    <div className="comments">
      <button type="button" className={`post-comments-toggle ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="comment" size={18} />{count === 0 ? 'Comment' : `${count} comment${count === 1 ? '' : 's'}`}
      </button>
      {open && (
        <div className="comments-panel">
          {items === null && <p className="small mute">Loading…</p>}
          {items?.length === 0 && <p className="small mute">No comments yet. Be the first.</p>}
          {items?.map((c) => {
            const mineC = !!me && c.userId === me.id
            return (
              <div key={c.id} className="comment">
                <div className="comment-head"><b>{c.name.split(' ')[0]}{mineC ? ' (you)' : ''}</b><span className="small mute">{ago(c.ts)}</span></div>
                <p>{c.text}</p>
                <div className="comment-actions">
                  {(mineC || postMine) && (confirmDel === c.id
                    ? <><button type="button" className="link-danger" onClick={() => void remove(c.id)}>Yes, delete</button><button type="button" className="quiet-action" onClick={() => setConfirmDel(null)}>Cancel</button></>
                    : <button type="button" className="quiet-action" onClick={() => setConfirmDel(c.id)}>Delete</button>)}
                  {me && !mineC && <button type="button" className="quiet-action" onClick={() => void report(c.id)}>Report</button>}
                </div>
              </div>
            )
          })}
          {me ? (
            <form className="comment-form" onSubmit={(e) => { e.preventDefault(); void send() }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" maxLength={500} aria-label="Add a comment" />
              <button type="submit" className="primary small-btn" disabled={busy || !text.trim()}>{busy ? '…' : 'Send'}</button>
            </form>
          ) : <p className="small mute"><a href="/#/join" style={{ textDecoration: 'underline' }}>Log in or join free</a> to comment.</p>}
          {note && <p className="small ok-text" role="status">{note}</p>}
          {err && <p className="small err" role="alert">{err}</p>}
        </div>
      )}
    </div>
  )
}
