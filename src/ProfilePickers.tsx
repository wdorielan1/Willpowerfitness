import { BODY_AREAS, MAX_FOCUS } from './engine'
import type { BodyArea, Sex } from './types'

/** Pick up to three body parts to emphasise in suggested workouts. */
export function FocusPicker({ value, onChange }: { value: BodyArea[]; onChange: (v: BodyArea[]) => void }) {
  const toggle = (id: BodyArea) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= MAX_FOCUS ? value : [...value, id])
  return (
    <>
      <div className="chips">
        {BODY_AREAS.map((a) => {
          const on = value.includes(a.id)
          return <button key={a.id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && value.length >= MAX_FOCUS} onClick={() => toggle(a.id)}>{a.label}</button>
        })}
      </div>
      <p className="small mute">Pick up to {MAX_FOCUS}. We’ll add more work for them and pick exercises for them first. Leave empty for a balanced plan.</p>
    </>
  )
}

/** Sex is used to size calorie targets. "Prefer not to say" uses a middle estimate. */
export function SexPicker({ value, onChange }: { value?: Sex; onChange: (v: Sex) => void }) {
  const opts: [Sex, string][] = [['male', 'Male'], ['female', 'Female'], ['other', 'Prefer not to say']]
  return (
    <>
      <div className="chips">
        {opts.map(([k, l]) => <button key={k} type="button" className={`chip ${value === k ? 'on' : ''}`} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
      </div>
      <p className="small mute">Used only to size your calorie and macro targets. Not shown to anyone.</p>
    </>
  )
}
