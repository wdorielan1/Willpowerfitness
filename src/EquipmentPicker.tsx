import { useState } from 'react'
import { Sheet } from './components'
import { EXERCISES } from './data'
import { EQUIP_KINDS, GEAR_NAME, beyondGear, equipKind, kindUse, useLabel } from './equipment'
import type { EquipKind, EquipUse, Profile } from './types'

const USES: EquipUse[] = ['often', 'sometimes', 'never']
const COUNTS = EXERCISES.reduce((n, x) => (x.mobility ? n : { ...n, [equipKind(x)]: (n[equipKind(x)] ?? 0) + 1 }), {} as Partial<Record<EquipKind, number>>)

type Setup = Pick<Profile, 'gear' | 'equip'>

/** How often someone uses each kind of equipment. Anything they don't touch follows the recommended default for their gear. */
export function EquipmentPicker({ gear, equip, onChange }: { gear: Profile['gear']; equip: Profile['equip']; onChange: (equip: Profile['equip']) => void }) {
  const p: Setup = { gear, equip }
  const allOff = EQUIP_KINDS.every((k) => beyondGear(p, k.id) || kindUse(p, k.id) === 'never')
  const startsOff = (['kettlebells', 'bands'] as EquipKind[]).filter((k) => !beyondGear(p, k) && kindUse(p, k) === 'never' && !equip?.[k])
  return (
    <div className="equip">
      <div className="equip-list">
        {EQUIP_KINDS.map((k) => {
          const locked = beyondGear(p, k.id)
          const use = kindUse(p, k.id)
          return (
            <div key={k.id} className={`equip-row${locked ? ' locked' : ''}`}>
              <div className="equip-name"><b>{k.label}</b><span className="small mute">{k.hint} · {COUNTS[k.id] ?? 0} exercises</span>
                {locked && <span className="small mute">Off while your setup is “{GEAR_NAME[gear]}”. Pick a bigger setup above to use it.</span>}</div>
              {!locked && <div className="seg equip-seg" role="group" aria-label={`${k.label}: how often`}>
                {USES.map((u) => <button key={u} type="button" className={use === u ? 'on' : ''} aria-pressed={use === u} onClick={() => onChange({ ...equip, [k.id]: u })}>{useLabel[u]}</button>)}
              </div>}
            </div>
          )
        })}
      </div>
      {allOff && <p className="small" role="alert" style={{ color: 'var(--warn)' }}>Everything is on Never, so there would be no exercises to plan. Switch at least one kind to Often.</p>}
      <p className="small mute"><b>Often</b> is your regular plan. <b>Sometimes</b> is about one lift in five. <b>Never</b> keeps it out of your plan, Swap, Add and search.</p>
      {startsOff.length > 0 && <p className="small mute">{startsOff.length === 2 ? 'Kettlebells and bands start' : `${EQUIP_KINDS.find((k) => k.id === startsOff[0])!.label} start`} on Never. If you use {startsOff.length === 2 ? 'them' : 'it'}, switch {startsOff.length === 2 ? 'them' : 'it'} on.</p>}
      {equip && Object.keys(equip).length > 0 && <button type="button" className="ghost small-btn" onClick={() => onChange(undefined)}>Back to recommended</button>}
    </div>
  )
}

/** Shown the first time someone starts a workout. Skippable. Changes only count when they tap Save. */
export function EquipmentSheet({ gear, equip, onSave, onSkip, onClose }: { gear: Profile['gear']; equip: Profile['equip']; onSave: (equip: Profile['equip']) => void; onSkip: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(equip)
  return (
    <Sheet title="What do you use?" onClose={onClose} z={60}>
      <p className="small mute">Tell us the equipment you actually use so your plan and your swaps stay on it. It takes about 20 seconds, and you can change it any time in Settings.</p>
      <EquipmentPicker gear={gear} equip={draft} onChange={setDraft} />
      <div className="equip-actions">
        <button className="primary" onClick={() => onSave(draft)}>Save and update my plan</button>
        <button className="ghost" onClick={onSkip}>Skip for now</button>
      </div>
    </Sheet>
  )
}
