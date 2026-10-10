import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp } from './store'
import { fmtRest } from './engine'
import { Icon } from './icons'

interface Ctx { start: (seconds: number, label: string) => void; stop: () => void }
const C = createContext<Ctx>({ start: () => {}, stop: () => {} })
export const useRestTimer = () => useContext(C)

let audio: AudioContext | null = null
function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audio = audio ?? new AC()
    void audio.resume()
    ;[0, 0.22, 0.44].forEach((t, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain()
      o.frequency.value = i === 2 ? 1175 : 880
      g.gain.setValueAtTime(0.0001, audio!.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.35, audio!.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, audio!.currentTime + t + 0.18)
      o.connect(g).connect(audio!.destination)
      o.start(audio!.currentTime + t); o.stop(audio!.currentTime + t + 0.2)
    })
  } catch { /* audio not available */ }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const { data } = useApp()
  const [t, setT] = useState<{ end: number; total: number; label: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  const fired = useRef(false)

  const start = useCallback((seconds: number, label: string) => {
    fired.current = false
    // unlock audio during the user's tap so the end-of-rest beep is allowed
    try { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; audio = audio ?? new AC(); void audio.resume() } catch { /* ignore */ }
    setNow(Date.now())
    setT({ end: Date.now() + seconds * 1000, total: seconds, label })
  }, [])
  const stop = useCallback(() => setT(null), [])

  useEffect(() => {
    if (!t) return
    const id = setInterval(() => setNow(Date.now()), 250)
    const vis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [t])

  const left = t ? Math.max(0, Math.ceil((t.end - now) / 1000)) : 0
  const over = !!t && left === 0

  useEffect(() => {
    if (!over || fired.current) return
    fired.current = true
    if (data.settings.sound) beep()
    if (data.settings.vibrate) navigator.vibrate?.([200, 100, 200])
    const id = setTimeout(() => setT(null), 5000)
    return () => clearTimeout(id)
  }, [over, data.settings.sound, data.settings.vibrate])

  const adjust = (s: number) => t && setT({ ...t, end: t.end + s * 1000, total: Math.max(5, t.total + s) })
  const pct = t ? Math.min(100, Math.max(0, ((t.total - left) / t.total) * 100)) : 0

  return (
    <C.Provider value={{ start, stop }}>
      {children}
      {t && (
        <div className={`rest-timer ${over ? 'over' : ''}`} role="timer" aria-label="Rest timer">
          <div className="rest-timer-main">
            <div className="rest-timer-info">
              <div className="rest-timer-label"><span><Icon name="clock" />{over ? 'Rest complete' : 'Rest'}</span><span className="small mute">{t.label}</span></div>
              <b className="rest-timer-time" role="status" aria-live={over ? 'polite' : 'off'}>{over ? 'Ready' : fmtRest(left)}</b>
            </div>
            <div className="rest-timer-controls">
              {!over && <button className="ghost small-btn" onClick={() => adjust(-15)}>−15</button>}
              {!over && <button className="ghost small-btn" onClick={() => adjust(15)}>+15</button>}
              <button className="small-btn" onClick={stop}>{over ? 'Done' : 'Skip'}</button>
            </div>
          </div>
          <div className="bar"><i style={{ width: `${over ? 100 : pct}%`, background: over ? 'var(--ok)' : undefined }} /></div>
        </div>
      )}
    </C.Provider>
  )
}
