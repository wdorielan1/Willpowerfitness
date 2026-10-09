import { AGES, IDENTITIES, VIBES } from './data'
import type { Profile } from './types'

/** The few questions we use to suggest crews. All optional. */
export default function MatchQuestions({ p, onChange }: { p: Profile; onChange: (patch: Partial<Profile>) => void }) {
  const ids = p.identities ?? []
  return (
    <>
      <h3>Your age</h3>
      <div className="chips">
        {AGES.map((a) => <button key={a} className={`chip ${p.age === a ? 'on' : ''}`} onClick={() => onChange({ age: p.age === a ? undefined : a })}>{a}</button>)}
      </div>
      <h3>Which describe you? <span className="small mute">pick any</span></h3>
      <div className="chips">
        {IDENTITIES.map((i) => <button key={i.id} className={`chip ${ids.includes(i.id) ? 'on' : ''}`} onClick={() => onChange({ identities: ids.includes(i.id) ? ids.filter((x) => x !== i.id) : [...ids, i.id] })}>{i.label}</button>)}
      </div>
      <h3>Your gym vibe</h3>
      <div className="chips">
        {VIBES.map((v) => <button key={v.id} className={`chip ${p.vibe === v.id ? 'on' : ''}`} onClick={() => onChange({ vibe: p.vibe === v.id ? undefined : v.id })}>{v.label}</button>)}
      </div>
    </>
  )
}
