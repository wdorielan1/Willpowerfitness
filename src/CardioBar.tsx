import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from './store'
import { cardioName, clockText, elapsedMs } from './cardio'

/** A quiet bar at the top of Home while a cardio timer is running or paused, so a forgotten timer gets noticed. */
export function CardioBar() {
  const { data } = useApp()
  const active = data.cardioActive
  const running = !!active && !active.pausedAt
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])
  if (!active) return null
  return (
    <Link to="/cardio" className={`cardio-bar${running ? '' : ' paused'}`} aria-label={`Cardio ${running ? 'running' : 'paused'}: ${cardioName(active)}. Open the timer`}>
      <span className="cardio-bar-dot" aria-hidden="true" />
      <span className="cardio-bar-text"><b>Cardio {running ? 'running' : 'paused'}</b><span>{cardioName(active)}</span></span>
      <time>{clockText(elapsedMs(active, now))}</time>
    </Link>
  )
}
