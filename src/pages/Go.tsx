import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCheckin } from '../actions'

/** Deep links used by Apple Shortcuts: /#/go/going, /#/go/complete, /#/go/cardio, /#/go/weight, /#/go/today, /#/go/workout */
export default function Go() {
  const { action } = useParams()
  const nav = useNavigate()
  const ci = useCheckin()
  useEffect(() => {
    switch (action) {
      case 'going': ci.imGoing(); nav('/', { replace: true }); break
      case 'complete': ci.complete(); nav('/', { replace: true }); break
      case 'cardio': nav('/log?t=cardio', { replace: true }); break
      case 'weight': nav('/log?t=weight', { replace: true }); break
      case 'workout': nav('/workout', { replace: true }); break
      default: nav('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])
  return null
}
