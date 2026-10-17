import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCheckin } from '../actions'
import { useApp } from '../store'
import { allCommunities } from './Crew'
import { todayISO, withPlace } from '../engine'

/** Deep links used by Apple Shortcuts: going, complete, cardio, weight, workout, start, arrive, gym, home */
export default function Go() {
  const { action } = useParams()
  const nav = useNavigate()
  const ci = useCheckin()
  const { data, update } = useApp()
  useEffect(() => {
    switch (action) {
      case 'going': ci.imGoing(); nav('/', { replace: true }); break
      case 'complete': ci.complete(); nav('/', { replace: true }); break
      case 'cardio': nav('/cardio?log=1', { replace: true }); break
      case 'weight': nav('/log?t=weight', { replace: true }); break
      case 'workout': nav('/workout', { replace: true }); break
      case 'start': if (!data.cardioActive) ci.start(); nav('/workout', { replace: true }); break // a running cardio timer blocks it; Train explains why
      // the phone (Apple's own location) tells us where they are; the app is only told the answer and never sees a place
      case 'gym':
      case 'home':
        update((d) => withPlace(d, action, todayISO()))
        nav('/workout', { replace: true })
        break
      case 'arrive': {
        update((d) => withPlace(d, 'gym', todayISO()))
        // Automatic start only for members of a crew whose time is within 90 minutes of now.
        const crew = allCommunities(data.custom).find((c) => c.id === data.primary)
        const now = new Date()
        const [h, mi] = (crew?.time ?? '').split(':').map(Number)
        const diff = crew ? Math.abs(now.getHours() * 60 + now.getMinutes() - (h * 60 + mi)) : Infinity
        if (crew && diff <= 90 && !data.cardioActive) ci.start()
        nav('/workout', { replace: true })
        break
      }
      default: nav('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])
  return null
}
