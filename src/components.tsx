import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from './store'
import { todayISO } from './engine'

/** Bottom sheet used for pickers. */
export function Sheet({ title, onClose, children, z = 40 }: { title: string; onClose: () => void; children: ReactNode; z?: number }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: z, display: 'grid', alignItems: 'end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--line)', padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '82dvh', overflowY: 'auto', maxWidth: 560, width: '100%', margin: '0 auto', display: 'grid', gap: 12 }}>
        <div className="row"><h2>{title}</h2><button className="ghost small-btn" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  )
}

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Big running workout clock. */
export function WorkoutClock({ since, compact }: { since: number; compact?: boolean }) {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id) }, [])
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 2, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: compact ? '10px 14px' : '14px 16px' }}>
      <span className="small mute" style={{ letterSpacing: 2, fontWeight: 800 }}>WORKOUT TIME</span>
      <b style={{ fontSize: compact ? 44 : 64, lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', color: 'var(--accent2)' }}>{fmtClock(Date.now() - since)}</b>
    </div>
  )
}

/** Asks "still working out?" after the limit and ends a forgotten workout 30 minutes later. */
export function WorkoutGuard() {
  const { data, update } = useApp()
  const today = todayISO()
  const started = data.started[today]
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id) }, [])
  const doneToday = data.logs.some((l) => l.date === today && !l.baseline)
  const limitMs = (data.settings.maxWorkoutHours + (data.extendHours[today] ?? 0)) * 3600000
  const elapsed = started ? Date.now() - started : 0
  const expired = !!started && !doneToday && elapsed >= limitMs + 30 * 60000
  const ask = !!started && !doneToday && elapsed >= limitMs && !expired

  const end = () => update((d) => { const { [today]: _s, ...rest } = d.started; void _s; return { ...d, started: rest, extendHours: { ...d.extendHours, [today]: 0 } } })
  useEffect(() => { if (expired) end() }, [expired]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ask) return null
  return (
    <Sheet title="Still working out?" onClose={() => {}} z={60}>
      <p>Your workout has been running for {fmtClock(elapsed).split(':')[0]} hours. If you forgot to stop it, we’ll end it automatically in 30 minutes.</p>
      <button className="primary" onClick={() => update((d) => ({ ...d, extendHours: { ...d.extendHours, [today]: (d.extendHours[today] ?? 0) + 1 } }))}>Yes, keep going (+1 hour)</button>
      <button className="ghost" onClick={end}>End the workout timer</button>
    </Sheet>
  )
}

/** "Are you sure?" dialog for anything destructive. */
export function ConfirmSheet({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Sheet title={title} onClose={onCancel} z={70}>
      <p>{message}</p>
      <button className="danger" onClick={onConfirm}>{confirmLabel}</button>
      <button className="ghost" onClick={onCancel}>Cancel</button>
    </Sheet>
  )
}

/** Full-screen photo viewer. Tap outside the photo or the ✕ to close; swipe or use the arrows to move between photos. */
export function Lightbox({ srcs, start = 0, caption, onClose }: { srcs: string[]; start?: number; caption?: string[]; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, srcs.length - 1))
  const x0 = useRef<number | null>(null)
  const go = (k: number) => setI((n) => (n + k + srcs.length) % srcs.length)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-label="Photo viewer" onClick={onClose}
      onTouchStart={(e) => { x0.current = e.touches[0].clientX }}
      onTouchEnd={(e) => { const s = x0.current; x0.current = null; if (s === null || srcs.length < 2) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1) }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.94)', zIndex: 90, display: 'grid', placeItems: 'center' }}>
      <img src={srcs[i]} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100vw', maxHeight: '88dvh', objectFit: 'contain', touchAction: 'pinch-zoom' }} />
      <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 12, background: 'rgba(255,255,255,.15)', borderRadius: 99, minHeight: 44, width: 44, padding: 0, fontSize: 20 }}>✕</button>
      {srcs.length > 1 && <>
        <button onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Previous" style={{ position: 'absolute', left: 8, top: '50%', background: 'rgba(255,255,255,.15)', borderRadius: 99, width: 44, minHeight: 44, padding: 0, fontSize: 22 }}>‹</button>
        <button onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Next" style={{ position: 'absolute', right: 8, top: '50%', background: 'rgba(255,255,255,.15)', borderRadius: 99, width: 44, minHeight: 44, padding: 0, fontSize: 22 }}>›</button>
      </>}
      <div className="small" style={{ position: 'absolute', bottom: 'calc(18px + env(safe-area-inset-bottom))', color: '#ddd' }}>{caption?.[i] ?? ''}{srcs.length > 1 ? `  ${i + 1}/${srcs.length}` : ''}</div>
    </div>
  )
}
