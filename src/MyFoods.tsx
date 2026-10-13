import { useMemo, useRef, useState } from 'react'
import { CHATGPT_FOOD_PROMPT, parseFoods } from './foodImport'
import { Icon } from './icons'
import type { FoodItem } from './types'

const r0 = (n: number) => Math.round(n)

/**
 * "My foods": the foods and meals someone eats again and again, as a table. Bring them in from ChatGPT or another
 * AI (CSV or a table), add one with a tap to any meal, and remove the ones you no longer eat.
 */
export default function MyFoods({ foods, mealNames, defaultMeal, onAdd, onSave, onRemove }: {
  foods: FoodItem[]
  mealNames: string[]
  defaultMeal: number
  /** put one serving in a meal today */
  onAdd: (food: FoodItem, meal: number) => void
  /** add foods to My foods */
  onSave: (items: FoodItem[]) => void
  onRemove: (id: string) => void
}) {
  const [meal, setMeal] = useState(Math.min(defaultMeal, mealNames.length - 1))
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [importOpen, setImportOpen] = useState(foods.length === 0)
  const [form, setForm] = useState({ name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' })
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const result = useMemo(() => (text.trim() ? parseFoods(text, foods) : null), [text, foods])
  const shown = foods.filter((f) => !q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase()))
  const flash = (msg: string) => { setNote(msg); window.setTimeout(() => setNote(''), 3500) }

  const add = (f: FoodItem) => { onAdd(f, meal); flash(`Added ${f.name} to ${mealNames[meal]}.`) }
  const num = (s: string) => Math.max(0, parseFloat(s) || 0)
  const saveOne = () => {
    if (!form.name.trim()) return
    const p = num(form.p), c = num(form.c), f = num(form.f)
    const item: FoodItem = { id: `mine-${Date.now()}`, name: form.name.trim(), serving: form.serving.trim() || '1 serving', cal: num(form.cal) || p * 4 + c * 4 + f * 9, p, c, f, cat: 'My foods' }
    onSave([item]); setForm({ name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' }); flash(`Saved ${item.name}.`)
  }

  return (
    <div className="myfoods">
      <section className="card">
        <div className="nutrition-section-heading"><div><h2>My foods</h2><p className="nutrition-help">The foods and meals you eat again and again. Tap Add to log one serving.</p></div></div>
        {foods.length > 0 && <div className="myfoods-controls">
          <label className="myfoods-meal">Add to<select aria-label="Add to which meal" value={meal} onChange={(e) => setMeal(Number(e.target.value))}>{mealNames.map((n, i) => <option key={n + i} value={i}>{n}</option>)}</select></label>
          <label className="myfoods-search"><span className="sr-only">Search my foods</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my foods" /></label>
        </div>}
        {foods.length === 0
          ? <p className="nutrition-empty">Nothing here yet. Import your usual foods from ChatGPT below, or add one yourself.</p>
          : (
            <div className="myfoods-table-wrap">
              <table className="myfoods-table">
                <colgroup><col /><col className="kcal" /><col className="mac" /><col className="mac" /><col className="mac" /><col className="act" /></colgroup>
                <thead><tr><th scope="col" className="food">Food</th><th scope="col">kcal</th><th scope="col">P</th><th scope="col">C</th><th scope="col">F</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {shown.map((f) => (
                    <tr key={f.id}>
                      <th scope="row" className="food"><b>{f.name}</b><span>{f.serving}</span></th>
                      <td>{r0(f.cal)}</td><td>{r0(f.p)}</td><td>{r0(f.c)}</td><td>{r0(f.f)}</td>
                      <td className="act">
                        <button type="button" className="primary myfoods-add" aria-label={`Add ${f.name} to ${mealNames[meal]}`} onClick={() => add(f)}>Add</button>
                        {confirmRemove === f.id
                          ? <button type="button" className="link-danger myfoods-remove" onClick={() => { onRemove(f.id); setConfirmRemove(null) }}>Remove?</button>
                          : <button type="button" className="myfoods-trash" aria-label={`Remove ${f.name} from my foods`} onClick={() => setConfirmRemove(f.id)}><Icon name="trash" size={16} /></button>}
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={6} className="nutrition-empty">No saved food matches that search.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        {foods.length > 0 && <p className="nutrition-help">Per serving. P, C and F are grams of protein, carbs and fat.</p>}
        {note && <p className="small ok-text" role="status">{note}</p>}
      </section>

      <section className="card">
        <button type="button" className="myfoods-toggle" aria-expanded={importOpen} onClick={() => setImportOpen(!importOpen)}><span><h3>Import from ChatGPT or another AI</h3><span className="nutrition-help">Paste a CSV or table of the foods you eat most.</span></span><Icon name="chevron" size={18} /></button>
        {importOpen && <>
          <p className="small mute">Give ChatGPT, Claude or another AI your food log (or just tell it what you usually eat) along with this prompt. Then paste what it gives you back here. Nothing is sent from Will Power.</p>
          <pre className="myfoods-prompt">{CHATGPT_FOOD_PROMPT}</pre>
          <button type="button" className="ghost" onClick={() => { void navigator.clipboard?.writeText(CHATGPT_FOOD_PROMPT); setCopied(true) }}>{copied ? 'Copied' : 'Copy the prompt'}</button>
          <label>Paste it here<textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'name,serving,calories,protein,carbs,fat\nChicken rice bowl,1 bowl,650,48,70,16'} aria-label="Foods to import" /></label>
          <input ref={file} type="file" accept=".csv,.txt,text/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = '' }} />
          <button type="button" className="ghost small-btn" onClick={() => file.current?.click()}>Upload a .csv / .txt file</button>
          {result && (result.foods.length === 0
            ? <p className="err">{result.duplicates > 0 ? 'Those foods are already in My foods.' : 'Couldn’t find any foods yet. Check the format above.'}</p>
            : <div className="myfoods-preview">
                <h3>Preview</h3>
                <div className="myfoods-table-wrap"><table className="myfoods-table">
                  <colgroup><col /><col className="kcal" /><col className="mac" /><col className="mac" /><col className="mac" /></colgroup>
                  <thead><tr><th scope="col" className="food">Food</th><th scope="col">kcal</th><th scope="col">P</th><th scope="col">C</th><th scope="col">F</th></tr></thead>
                  <tbody>{result.foods.slice(0, 15).map((f) => <tr key={f.id}><th scope="row" className="food"><b>{f.name}</b><span>{f.serving}</span></th><td>{r0(f.cal)}</td><td>{r0(f.p)}</td><td>{r0(f.c)}</td><td>{r0(f.f)}</td></tr>)}</tbody>
                </table></div>
                {result.foods.length > 15 && <p className="small mute">…and {result.foods.length - 15} more</p>}
                {result.duplicates > 0 && <p className="small mute">{result.duplicates} already in My foods or listed twice, skipped.</p>}
                {result.skipped.length > 0 && <p className="small mute">{result.skipped.length} line{result.skipped.length === 1 ? '' : 's'} skipped: {result.skipped.slice(0, 2).join(' · ')}{result.skipped.length > 2 ? '…' : ''}</p>}
                <button type="button" className="primary" onClick={() => { onSave(result.foods); flash(`Added ${result.foods.length} food${result.foods.length === 1 ? '' : 's'} to My foods.`); setText(''); setImportOpen(false) }}>Add {result.foods.length} food{result.foods.length === 1 ? '' : 's'} to My foods</button>
              </div>)}
        </>}
      </section>

      <section className="card">
        <details className="myfoods-manual">
          <summary>Add one food yourself</summary>
          <div className="nutrition-custom-fields">
            <label>Food name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chicken rice bowl" /></label>
            <label>One serving<input value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} placeholder="1 bowl" /></label>
            <div className="nutrition-input-grid">
              <label>Calories<input inputMode="decimal" value={form.cal} onChange={(e) => setForm({ ...form, cal: e.target.value })} placeholder="kcal" /></label>
              <label>Protein<input inputMode="decimal" value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} placeholder="g" /></label>
              <label>Carbs<input inputMode="decimal" value={form.c} onChange={(e) => setForm({ ...form, c: e.target.value })} placeholder="g" /></label>
              <label>Fat<input inputMode="decimal" value={form.f} onChange={(e) => setForm({ ...form, f: e.target.value })} placeholder="g" /></label>
            </div>
            <button type="button" className="primary" disabled={!form.name.trim()} onClick={saveOne}>Save to My foods</button>
          </div>
        </details>
      </section>
    </div>
  )
}
