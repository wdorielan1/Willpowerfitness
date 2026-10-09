import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { AI_PROMPT, DEFAULT_EXPORT, buildCSV, buildJSON, buildSummary, download, type ExportOpts } from '../exporter'
import { todayISO } from '../engine'

const SECTIONS: [keyof ExportOpts, string][] = [['profile', 'Profile & goals'], ['workouts', 'Workouts & consistency'], ['strength', 'Strength trends'], ['body', 'Body weight'], ['cardio', 'Cardio & steps'], ['nutrition', 'Nutrition']]

export default function Export() {
  const { data } = useApp()
  const [o, setO] = useState<ExportOpts>(DEFAULT_EXPORT)
  const [msg, setMsg] = useState('')
  const summary = buildSummary(data, o)
  const forAI = AI_PROMPT + summary
  const copy = async () => { try { await navigator.clipboard.writeText(forAI); setMsg('Copied. Paste it into ChatGPT, Claude, or any AI chat.') } catch { setMsg('Could not copy. Use the download button instead.') } }
  const day = todayISO()

  return (
    <>
      <div><h1>Export your data</h1><p className="mute">Take your numbers anywhere, including an AI coach.</p></div>

      <section className="card hero">
        <h2>🤖 Copy for an AI coach</h2>
        <p className="small mute">Builds a clean summary plus a coaching prompt. Paste it into any AI chat to get feedback on how you’re doing.</p>
        <div className="chips">{SECTIONS.map(([k, label]) => <button key={k} className={`chip ${o[k] ? 'on' : ''}`} onClick={() => setO({ ...o, [k]: !o[k] })}>{label}</button>)}</div>
        <div className="chips">{[4, 8, 12, 26].map((w) => <button key={w} className={`chip ${o.weeks === w ? 'on' : ''}`} onClick={() => setO({ ...o, weeks: w })}>Last {w} weeks</button>)}</div>
        <button className="primary" onClick={() => void copy()}>📋 Copy for AI</button>
        <button className="ghost" onClick={() => download(`will-power-summary-${day}.txt`, forAI)}>Download as a text file</button>
        {msg && <p className="small ok-text">{msg}</p>}
        <details><summary className="small mute" style={{ cursor: 'pointer' }}>Preview what will be copied</summary>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'var(--card2)', borderRadius: 12, padding: 12, maxHeight: 320, overflow: 'auto' }}>{forAI}</pre></details>
      </section>

      <section className="card">
        <h2>Your raw data</h2>
        <button className="ghost" onClick={() => download(`will-power-workouts-${day}.csv`, buildCSV(data), 'text/csv')}>⬇ Workouts as a spreadsheet (.csv)</button>
        <button className="ghost" onClick={() => download(`will-power-all-data-${day}.json`, buildJSON(data), 'application/json')}>⬇ Everything as a data file (.json)</button>
      </section>

      <section className="card">
        <h3>Privacy</h3>
        <p className="small mute">Nothing is sent anywhere when you export. It only goes where you paste or save it. Exports leave out your name, email, handle and photos. Check the preview first, since your numbers will be visible to whichever AI service you paste them into.</p>
        <Link to="/settings" className="small mute" style={{ textDecoration: 'underline' }}>Back to settings</Link>
      </section>
    </>
  )
}
