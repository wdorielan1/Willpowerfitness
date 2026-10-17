import { useId, useRef, useState } from 'react'
import { useApp } from '../store'
import { todayISO } from '../engine'
import { questionFor } from '../qotd'
import { sendReport, usePostActions } from './Feed'
import { PostTo, useMyCrews } from '../CrewPicker'
import { Icon } from '../icons'

/**
 * The question of the day. There is one for you, not one per crew: you answer it once and say which crew (or crews) it goes to.
 * Answers show up in those crews' feeds. Skippable. `viewing` is the crew you are looking at, picked to start with.
 */
export default function Qotd({ viewing }: { viewing: string }) {
  const { data, update } = useApp()
  const crews = useMyCrews()
  const { postTo } = usePostActions(viewing)
  const today = todayISO()
  // One question a day for everyone: answering (or skipping) in any crew hides it in all of them.
  const old = Object.entries(data.qotd).filter(([k]) => k.endsWith(`|${today}`)).map(([, v]) => v)
  const state = { answer: data.qotd[today]?.answer ?? old.find((v) => v.answer)?.answer, skipped: data.qotd[today]?.skipped ?? old.some((v) => v.skipped) }
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [to, setTo] = useState<string[] | null>(null) // null: just the crew you are looking at
  const [left, setLeft] = useState(false) // some crews did not get the answer yet, so the card stays
  const targets = (to ?? [viewing]).filter((id) => crews.some((c) => c.id === id))
  const pending = useRef(false)
  const titleId = useId()
  const { q, theme } = questionFor(today)

  const submit = async () => {
    const t = text.trim()
    if (!t || pending.current) return
    pending.current = true; setBusy(true); setErr('')
    try {
      const goingTo = targets.length ? targets : [viewing]
      const { ok, errors } = await postTo(goingTo, { kind: 'qotd', text: t, meta: { q } })
      if (ok.length) update((d) => ({ ...d, qotd: { ...d.qotd, [today]: { answer: t, crews: [...new Set([...(d.qotd[today]?.crews ?? []), ...ok])] } } }))
      const report = sendReport(crews, ok, errors)
      if (report) { setLeft(true); setTo(errors.map((e) => e.id)); throw new Error(report) } // keep the answer, aimed at the crews that missed out
      setLeft(false); setText(''); setTo(null)
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error))
    } finally {
      pending.current = false; setBusy(false)
    }
  }
  const skip = () => update((d) => ({ ...d, qotd: { ...d.qotd, [today]: { skipped: true } } }))

  if (state.answer && !left) return null // answered: the card gets out of the way (it returns if the answer is deleted)
  if (state.skipped) return <div className="row"><p className="small mute">Question of the day skipped.</p><button className="quiet-action" onClick={() => update((d) => ({ ...d, qotd: { ...d.qotd, [today]: { skipped: false } } }))}>Answer instead</button></div>

  return (
    <section className="card crew-question" aria-labelledby={titleId}>
      <div className="section-heading"><h2 id={titleId}>Question of the day</h2>{!left && <button className="quiet-action" disabled={busy} onClick={skip}>Skip today</button>}</div>
      {theme && <span className="tag crew-question-theme">{theme}</span>}
      <p className="crew-question-prompt">{q}</p>
      <form className="qotd-answer" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <textarea aria-label="Your answer" value={text} disabled={busy} onChange={(e) => setText(e.target.value)} placeholder={crews.length > 1 ? 'Share your answer with your crews' : 'Share your answer with the crew'} maxLength={1000} rows={2} />
        <PostTo crews={crews} value={targets.length ? targets : [viewing]} onChange={setTo} disabled={busy} />
        <button className="primary small-btn" type="submit" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post answer'}<Icon name="arrow" size={16} /></button>
      </form>
      {err && <p className="small err" role="alert">{err}</p>}
    </section>
  )
}
