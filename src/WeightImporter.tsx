import { useMemo, useRef, useState } from 'react'
import { fromISO } from './engine'
import { CHATGPT_WEIGHT_PROMPT, mergeWeights, parseWeights } from './importer'
import { WeightChart } from './WeightChart'
import type { WeightLog } from './types'

const fmtDay = (iso: string) => fromISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** Bring in daily weigh-ins: copy a prompt for ChatGPT (or any AI), paste its CSV back, preview it as a graph, then import. */
export default function WeightImporter({ existing, onImport }: { existing: WeightLog[]; onImport: (entries: WeightLog[]) => void }) {
  const [text, setText] = useState('')
  const [kg, setKg] = useState(false)
  const [copied, setCopied] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const result = useMemo(() => (text.trim() ? parseWeights(text, { kg }) : null), [text, kg])
  const merge = useMemo(() => (result ? mergeWeights(existing, result.entries) : null), [result, existing])
  const e = result?.entries ?? []
  const lbs = e.map((w) => w.lbs)
  const first = e[0], last = e[e.length - 1]

  return (
    <>
      <section className="card">
        <h3>Weigh yourself every day?</h3>
        <p className="small mute">If your weigh-ins live in a scale app, Apple Health, a spreadsheet or notes, give them to ChatGPT, Claude or another AI along with this prompt. Then paste the CSV it gives you back here. Nothing is sent from Will Power.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--card2)', borderRadius: 12, padding: 12, fontSize: 13, margin: 0 }}>{CHATGPT_WEIGHT_PROMPT}</pre>
        <button className="ghost" onClick={() => { void navigator.clipboard?.writeText(CHATGPT_WEIGHT_PROMPT); setCopied(true) }}>{copied ? 'Copied' : 'Copy the prompt'}</button>
      </section>

      <section className="card">
        <h3>Paste it here</h3>
        <p className="small mute">CSV works best (<code>date,weight</code>). Lines like <code>Sep 1: 185.4 lb</code> or <code>9/1/2026 84.1 kg</code> work too.</p>
        <textarea rows={8} value={text} onChange={(ev) => setText(ev.target.value)} placeholder={'date,weight\n2026-09-01,185.4\n2026-09-02,184.8'} aria-label="Body weight data" />
        <input ref={file} type="file" accept=".csv,.txt,text/*" hidden onChange={async (ev) => { const f = ev.target.files?.[0]; if (f) setText(await f.text()); ev.target.value = '' }} />
        <div className="row wrap">
          <button className="ghost small-btn" onClick={() => file.current?.click()}>Upload a .csv / .txt file</button>
          <button className={`chip ${kg ? 'on' : ''}`} onClick={() => setKg(!kg)} aria-pressed={kg}>{kg ? 'Weights are in kg → convert' : 'Weights in lb'}</button>
        </div>
      </section>

      {result && (
        <section className="card">
          <h3>Preview</h3>
          {e.length === 0 ? <p className="err">Couldn’t find any weigh-ins yet. Check the format above.</p> : (
            <>
              <WeightChart pts={e.map((w) => ({ x: w.date, y: w.lbs }))} empty="Add at least two weigh-ins to see a graph." label="Preview of imported body weight" />
              <div className="grid3">
                <div className="stat"><b>{e.length}</b><span>weigh-ins</span></div>
                <div className="stat"><b>{first.lbs} → {last.lbs}</b><span>start → latest (lb)</span></div>
                <div className="stat"><b>{Math.min(...lbs)}–{Math.max(...lbs)}</b><span>low–high (lb)</span></div>
              </div>
              <p className="small mute">{fmtDay(first.date)} → {fmtDay(last.date)}{result.duplicates > 0 ? ` · ${result.duplicates} day${result.duplicates === 1 ? '' : 's'} listed twice (kept the last reading)` : ''}</p>
              {merge && merge.kept > 0 && <p className="small mute">{merge.kept} day{merge.kept === 1 ? '' : 's'} you’ve already logged will keep your own number.</p>}
              {result.skipped.length > 0 && <p className="small mute">{result.skipped.length} line{result.skipped.length === 1 ? '' : 's'} skipped: {result.skipped.slice(0, 2).join(' · ')}{result.skipped.length > 2 ? '…' : ''}</p>}
              <button className="primary" disabled={!merge || merge.added === 0} onClick={() => { onImport(e); setText('') }}>{merge && merge.added === 0 ? 'Nothing new to import' : `Import ${merge?.added ?? e.length} weigh-in${merge?.added === 1 ? '' : 's'}`}</button>
            </>
          )}
        </section>
      )}
    </>
  )
}

