import { useMemo, useRef, useState } from 'react'
import { addDays, todayISO } from './engine'
import { CHATGPT_PROMPT, parseHistory, type ImportResult } from './importer'
import { AiPrompt } from './AiPrompt'

/** Copy a prompt for an AI chat, paste its CSV back, preview it, then hand the parsed result to the caller. */
export default function HistoryImporter({ onImport, importLabel = (n: number) => `Import ${n} sets` }: { onImport: (r: ImportResult) => void; importLabel?: (sets: number) => string }) {
  const [text, setText] = useState('')
  const [kg, setKg] = useState(false)
  const [undated, setUndated] = useState(addDays(todayISO(), -1))
  const file = useRef<HTMLInputElement>(null)
  const result = useMemo(() => (text.trim() ? parseHistory(text, { kg, undatedDate: undated }) : null), [text, kg, undated])

  return (
    <>
      <AiPrompt title="Do you track your workouts with AI?" hint="Tap a button. We copy the instructions and open the chat. Paste them there with your workouts, then paste the answer below." prompt={CHATGPT_PROMPT} />

      <section className="card">
        <h3>Paste the answer here</h3>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste what ChatGPT or Claude gave you" aria-label="Your workouts from ChatGPT or Claude" />
        <input ref={file} type="file" accept=".csv,.txt,text/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
        <details className="import-more">
          <summary>More options</summary>
          <p className="small mute">CSV works best (<code>date,exercise,weight,reps,sets</code>). Plain notes like <code>Bench press: 185x8, 185x8, 175x7</code> work too, with a date on its own line above.</p>
          <div className="row wrap">
            <button className="ghost small-btn" onClick={() => file.current?.click()}>Upload a .csv / .txt file</button>
            <button className={`chip ${kg ? 'on' : ''}`} onClick={() => setKg(!kg)}>{kg ? 'Weights are in kg → convert' : 'Weights in lb'}</button>
          </div>
          <label>Date to use for lines with no date<input type="date" value={undated} max={todayISO()} onChange={(e) => setUndated(e.target.value)} /></label>
        </details>
      </section>

      {result && (
        <section className="card">
          <h3>Preview</h3>
          {result.logs.length === 0 ? <p className="err">Couldn’t find any sets yet. Check the format above.</p> : (
            <>
              <p>{result.setCount} sets · {result.logs.length} workout day{result.logs.length === 1 ? '' : 's'} · {result.logs[0].date} → {result.logs[result.logs.length - 1].date}</p>
              <div className="people">
                {result.exercises.slice(0, 12).map((e) => (
                  <div className="person" key={e.name}><span className="grow">{e.name}</span><span className={`tag ${e.matched ? 'ok' : 'warn'}`}>{e.matched ? 'matched' : 'custom'}</span><span className="small mute">{e.sets} sets</span></div>
                ))}
                {result.exercises.length > 12 && <p className="small mute">…and {result.exercises.length - 12} more</p>}
              </div>
              {result.skipped.length > 0 && <p className="small mute">{result.skipped.length} line{result.skipped.length === 1 ? '' : 's'} skipped (no sets found).</p>}
              <button className="primary" onClick={() => { onImport(result); setText('') }}>{importLabel(result.setCount)}</button>
            </>
          )}
        </section>
      )}
    </>
  )
}
