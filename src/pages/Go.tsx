import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCheckin } from '../actions'
import { useApp } from '../store'
import { allCommunities } from './Crew'

/** Deep links used by Apple Shortcuts: going, complete, cardio, weight, workout, start, arrive */
export default function Go() {
  const { action } = useParams()
  const nav = useNavigate()
  const ci = useCheckin()
  const { data } = useApp()
  useEffect(() => {
    switch (action) {
      case 'going': ci.imGoing(); nav('/', { replace: true }); break
      case 'complete': ci.complete(); nav('/', { replace: true }); break
      case 'cardio': nav('/log?t=cardio', { replace: true }); break
      case 'weight': nav('/log?t=weight', { replace: true }); break
      case 'workout': nav('/workout', { replace: true }); break
      case 'start': ci.start(); nav('/workout', { replace: true }); break
      case 'arrive': {
        // Automatic start only for members of a crew whose time is within 90 minutes of now.
        const crew = allCommunities(data.custom).find((c) => c.id === data.primary)
        const now = new Date()
        const [h, mi] = (crew?.time ?? '').split(':').map(Number)
        const diff = crew ? Math.abs(now.getHours() * 60 + now.getMinutes() - (h * 60 + mi)) : Infinity
        if (crew && diff <= 90) ci.start()
        nav('/workout', { replace: true })
        break
      }
      default: nav('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])
  return null
}
