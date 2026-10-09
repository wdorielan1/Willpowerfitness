import { useState } from 'react'
import { useApp } from '../store'
import { todayISO } from '../engine'
import { questionFor } from '../qotd'
import { usePostActions } from './Feed'

/** Optional question of the day for a crew. Answers show up in the crew feed. Skippable. */
export default function Qotd({ crewId }: { crewId: string }) {
  const { data, update } = useApp()
  const { post } = usePostActions(crewId)
  const today = todayISO()
  const key = `${crewId}|${today}`
  const state = data.qotd[key] ?? {}
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const { q, theme } = questionFor(today)

  const submit = async () => {
    const t = text.trim()
    if (!t) return
    const err = await post({ kind: 'qotd', text: t, meta: { q } })
    if (err) { setErr(err); return }
    setErr(''); update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { answer: t } } })); setText('')
  }
  const skip = () => update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { skipped: true } } }))

  return (
    <section className="card">
      <div className="row"><div className="chips"><span className="tag accent">Question of the day</span>{theme && <span className="tag">{theme}</span>}</div>{!state.answer && !state.skipped && <button className="ghost small-btn" onClick={skip}>Skip</button>}</div>
      <h3>{q}</h3>
      {!state.answer && !state.skipped && (
        <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional. Say hi to your crew" /><button className="primary" onClick={() => void submit()}>Post</button></div>
      )}
      {err && <p className="small err">{err}</p>}
      {state.answer && <p className="small ok-text">✓ You answered. See it in the feed.</p>}
      {state.skipped && <p className="small mute">Skipped for today. Come back tomorrow.</p>}
    </section>
  )
}
