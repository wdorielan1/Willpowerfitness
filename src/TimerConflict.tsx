import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmSheet, Sheet } from './components'
import { useApp } from './store'
import { cardioName, clockText, elapsedMs } from './cardio'

/**
 * Cardio and lifting can't be timed at the same time. Shown when someone starts one while the other is still running:
 * `running` is the one that is already going.
 */
export function TimerConflict({ running, onClose }: { running: 'cardio' | 'workout'; onClose: () => void }) {
  const { data, update } = useApp()
  const nav = useNavigate()
  const [askDiscard, setAskDiscard] = useState(false)
  const active = data.cardioActive

  if (running === 'workout') {
    return (
      <Sheet title="Finish your workout first" onClose={onClose} z={65}>
        <p>Your workout is still running. Cardio and lifting can’t be timed at the same time, so finish the workout, then start your cardio.</p>
        <button type="button" className="primary" onClick={() => { onClose(); nav('/workout') }}>Back to my workout</button>
        <button type="button" className="ghost" onClick={onClose}>Cancel</button>
      </Sheet>
    )
  }
  if (!active) return null
  return (
    <>
      <Sheet title="Finish your cardio first" onClose={onClose} z={65}>
        <p>Your cardio timer is still running ({cardioName(active)}, {clockText(elapsedMs(active))}). You can’t lift and time cardio at the same time, so finish the cardio, then start your workout.</p>
        <button type="button" className="primary" onClick={() => { onClose(); nav('/cardio') }}>Go to my cardio</button>
        <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="link-danger" onClick={() => setAskDiscard(true)}>I forgot it. Discard the cardio timer</button>
      </Sheet>
      {askDiscard && <ConfirmSheet title="Discard the cardio timer?" message="The time so far will not be saved. Then you can start your workout." confirmLabel="Discard it" onConfirm={() => { update((d) => ({ ...d, cardioActive: undefined })); setAskDiscard(false); onClose() }} onCancel={() => setAskDiscard(false)} />}
    </>
  )
}
