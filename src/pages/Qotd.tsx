import { useId, useRef, useState } from 'react'
import { useApp } from '../store'
import { todayISO } from '../engine'
import { questionFor } from '../qotd'
import { usePostActions } from './Feed'
import { Icon } from '../icons'

/** Optional question of the day for a crew. Answers show up in the crew feed. Skippable. */
export default function Qotd({ crewId }: { crewId: string }) {
  const { data, update } = useApp()
  const { post } = usePostActions(crewId)
  const today = todayISO()
  const key = `${crewId}|${today}`
  const state = data.qotd[key] ?? {}
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const titleId = useId()
  const { q, theme } = questionFor(today)

  const submit = async () => {
    const t = text.trim()
    if (!t || pending.current) return
    pending.current = true; setBusy(true); setErr('')
    try {
      const error = await post({ kind: 'qotd', text: t, meta: { q } })
      if (error) throw new Error(error)
      update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { answer: t } } })); setText('')
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error))
    } finally {
      pending.current = false; setBusy(false)
    }
  }
  const skip = () => update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { skipped: true } } }))

  return (
    <section className="card crew-question" aria-labelledby={titleId}>
      <div className="section-heading"><h2 id={titleId}>Question of the day</h2>{!state.answer && !state.skipped && <button className="quiet-action" disabled={busy} onClick={skip}>Skip today</button>}</div>
      {theme && <span className="tag crew-question-theme">{theme}</span>}
      <p className="crew-question-prompt">{q}</p>
      {!state.answer && !state.skipped && (
        <form className="qotd-answer" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <textarea aria-label="Your answer" value={text} disabled={busy} onChange={(e) => setText(e.target.value)} placeholder="Share your answer with the crew" maxLength={1000} rows={2} />
          <button className="primary small-btn" type="submit" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post answer'}<Icon name="arrow" size={16} /></button>
        </form>
      )}
      {err && <p className="small err" role="alert">{err}</p>}
      {state.answer && <p className="small ok-text qotd-status"><Icon name="check" size={16} />You answered. See it in the feed.</p>}
      {state.skipped && <div className="row"><p className="small mute">Skipped for today.</p><button className="quiet-action" onClick={() => update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { skipped: false } } }))}>Answer instead</button></div>}
    </section>
  )
}
