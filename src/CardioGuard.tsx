import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from './components'
import { useApp } from './store'
import { CARDIO_ASK_HOURS, CARDIO_GRACE_MIN, cardioName, elapsedMs } from './cardio'

/**
 * "Still doing cardio?" for a cardio timer that has run a long time, like the workout one. Keep going adds an hour; Finish opens the
 * Cardio page's finish sheet. With no answer, the timer is paused where the question came up (never discarded), so the time is kept.
 */
export function CardioGuard() {
  const { data, update } = useApp()
  const nav = useNavigate()
  const active = data.cardioActive
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id) }, [])

  const running = !!active && !active.pausedAt
  const limitMs = ((active?.extendHours ?? 0) + CARDIO_ASK_HOURS) * 3600000
  const elapsed = active && running ? elapsedMs(active) : 0
  const expired = running && elapsed >= limitMs + CARDIO_GRACE_MIN * 60000
  const ask = running && elapsed >= limitMs && !expired

  useEffect(() => {
    if (!expired) return
    update((d) => (d.cardioActive && !d.cardioActive.pausedAt
      ? { ...d, cardioActive: { ...d.cardioActive, pausedAt: d.cardioActive.startedAt + d.cardioActive.pausedMs + limitMs, autoPaused: true } }
      : d))
  }, [expired]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ask || !active) return null
  return (
    <Sheet title="Still doing cardio?" onClose={() => {}} z={60}>
      <p>Your {cardioName(active)} timer has been running for {Math.floor(elapsed / 3600000)} hours. If you forgot to stop it, we’ll pause it in {CARDIO_GRACE_MIN} minutes and keep the time so far.</p>
      <button type="button" className="primary" onClick={() => update((d) => (d.cardioActive ? { ...d, cardioActive: { ...d.cardioActive, extendHours: (d.cardioActive.extendHours ?? 0) + 1 } } : d))}>Yes, keep going (+1 hour)</button>
      <button type="button" className="ghost" onClick={() => nav('/cardio?finish=1')}>Finish it now</button>
    </Sheet>
  )
}
