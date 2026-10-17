import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store'
import { AI_PROMPT, DEFAULT_EXPORT, buildCSV, buildJSON, buildSummary, download, type ExportOpts } from '../exporter'
import { todayISO } from '../engine'
import { Icon } from '../icons'

const SECTIONS: [Exclude<keyof ExportOpts, 'weeks'>, string][] = [
  ['profile', 'Profile & goals'], ['workouts', 'Workouts'], ['strength', 'Strength'],
  ['body', 'Body weight'], ['cardio', 'Cardio & steps'], ['nutrition', 'Nutrition'],
]

export default function Export() {
  const { data } = useApp()
  const [options, setOptions] = useState<ExportOpts>(DEFAULT_EXPORT)
  const [questions, setQuestions] = useState(false)
  const [copying, setCopying] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const summary = buildSummary(data, options)
  const content = questions ? AI_PROMPT + summary : summary
  const day = todayISO()

  const changeOptions = (patch: Partial<ExportOpts>) => {
    setOptions((current) => ({ ...current, ...patch }))
    setFeedback(null)
  }
  const copy = async () => {
    if (copying) return
    setCopying(true)
    setFeedback(null)
    try {
      await navigator.clipboard.writeText(content)
      setFeedback({ text: questions ? 'Summary and coaching questions copied.' : 'Summary copied.', error: false })
    } catch {
      setFeedback({ text: 'Could not copy. Download the text file instead.', error: true })
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="export-page">
      <header className="export-heading">
        <Link to="/progress" className="quiet-action"><Icon name="back" size={16} />Progress</Link>
        <h1>Export your data</h1>
        <p>Copy a training summary or download your records.</p>
      </header>

      <section className="export-summary" aria-labelledby="export-summary-title">
        <div className="export-section-head">
          <h2 id="export-summary-title">Training summary</h2>
          <Icon name="file" size={20} />
        </div>
        <label className="export-period">Time period
          <select value={options.weeks} disabled={copying} onChange={(event) => changeOptions({ weeks: Number(event.target.value) })}>
            {[4, 8, 12, 26].map((weeks) => <option key={weeks} value={weeks}>Last {weeks} weeks</option>)}
          </select>
        </label>
        <fieldset className="export-sections">
          <legend>Include in your summary</legend>
          <div>{SECTIONS.map(([key, label]) => (
            <label className="export-toggle" key={key}>
              <input type="checkbox" checked={options[key]} disabled={copying} onChange={(event) => changeOptions({ [key]: event.target.checked })} />
              <span>{label}</span>
            </label>
          ))}</div>
        </fieldset>

        <details className="export-preview">
          <summary>Preview summary<Icon name="chevron" size={16} /></summary>
          <pre tabIndex={0} aria-label="Export text preview">{content}</pre>
        </details>
        <div className="export-summary-actions">
          <button className="primary" disabled={copying} onClick={() => void copy()}><Icon name="copy" size={18} />{copying ? 'Copying…' : 'Copy summary'}</button>
          <button className="ghost" onClick={() => download(`willpower-summary-${day}.txt`, content)}><Icon name="download" size={18} />Download text</button>
        </div>
        {feedback && <p className={feedback.error ? 'export-feedback err' : 'export-feedback ok-text'} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}

        <details className="export-coaching">
          <summary>Coaching questions<Icon name="chevron" size={16} /></summary>
          <label className="export-coaching-toggle">
            <input type="checkbox" checked={questions} disabled={copying} onChange={(event) => { setQuestions(event.target.checked); setFeedback(null) }} />
            <span>Add questions about your trends and next steps before the summary.</span>
          </label>
        </details>
      </section>

      <section className="export-section" aria-labelledby="export-downloads-title">
        <h2 id="export-downloads-title">Download files</h2>
        <p className="export-note">These files use your saved history across all dates. Summary selections apply only to the text above.</p>
        <div className="export-downloads">
          <button className="export-download-row" aria-label="Download workout sets CSV" onClick={() => download(`willpower-workouts-${day}.csv`, buildCSV(data), 'text/csv')}>
            <Icon name="file" size={22} />
            <span><b>Workout sets</b><span>CSV · Open in a spreadsheet</span></span>
            <Icon name="download" size={19} />
          </button>
          <button className="export-download-row" aria-label="Download app data JSON" onClick={() => download(`willpower-all-data-${day}.json`, buildJSON(data), 'application/json')}>
            <Icon name="file" size={22} />
            <span><b>App data</b><span>JSON · Saved data and settings</span></span>
            <Icon name="download" size={19} />
          </button>
        </div>
      </section>

      <section className="export-section export-privacy" aria-labelledby="export-privacy-title">
        <h2 id="export-privacy-title">Before sharing</h2>
        <p className="export-note">Exports are generated on your device. The JSON file can include your profile photo, saved area, notes, and other text you entered. Review files before sharing.</p>
        <Link to="/settings" className="quiet-action">Settings<Icon name="chevron" size={16} /></Link>
      </section>
    </div>
  )
}
