import { useMemo, useRef, useState } from 'react'
import { addDays, todayISO } from './engine'
import { CHATGPT_PROMPT, parseHistory, type ImportResult } from './importer'

/** Copy a prompt for an AI chat, paste its CSV back, preview it, then hand the parsed result to the caller. */
export default function HistoryImporter({ onImport, importLabel = (n: number) => `Import ${n} sets` }: { onImport: (r: ImportResult) => void; importLabel?: (sets: number) => string }) {
  const [text, setText] = useState('')
  const [kg, setKg] = useState(false)
  const [undated, setUndated] = useState(addDays(todayISO(), -1))
  const [copied, setCopied] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const result = useMemo(() => (text.trim() ? parseHistory(text, { kg, undatedDate: undated }) : null), [text, kg, undated])

  return (
    <>
      <section className="card">
        <h3>Track your lifts in ChatGPT, Claude or another AI?</h3>
        <p className="small mute">Paste this prompt into that chat, then copy its CSV back here. No AI connection or key is needed on our side.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--card2)', borderRadius: 12, padding: 12, fontSize: 13, margin: 0 }}>{CHATGPT_PROMPT}</pre>
        <button className="ghost" onClick={() => { void navigator.clipboard?.writeText(CHATGPT_PROMPT); setCopied(true) }}>{copied ? 'Copied' : 'Copy the prompt'}</button>
      </section>

      <section className="card">
        <h3>Paste it here</h3>
        <p className="small mute">CSV works best (<code>date,exercise,weight,reps,sets</code>). Plain notes like <code>Bench press: 185x8, 185x8, 175x7</code> work too, with a date on its own line above.</p>
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'date,exercise,weight,reps,sets\n2026-09-01,Bench Press,185,8,3'} />
        <input ref={file} type="file" accept=".csv,.txt,text/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
        <div className="row wrap">
          <button className="ghost small-btn" onClick={() => file.current?.click()}>Upload a .csv / .txt file</button>
          <button className={`chip ${kg ? 'on' : ''}`} onClick={() => setKg(!kg)}>{kg ? 'Weights are in kg → convert' : 'Weights in lb'}</button>
        </div>
        <label>Date to use for lines with no date<input type="date" value={undated} max={todayISO()} onChange={(e) => setUndated(e.target.value)} /></label>
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
