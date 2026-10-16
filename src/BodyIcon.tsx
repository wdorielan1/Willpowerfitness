import type { ReactNode } from 'react'

export type BodyPart = 'chest' | 'back' | 'shoulders' | 'abs' | 'legs' | 'arms' | 'full'

/** The body parts a workout is about, read from its name ("Push", "Back + Biceps", ...). Nothing for a name we do not know. */
export function bodyPartsFor(name: string): BodyPart[] {
  const n = name.toLowerCase().replace(/\s+day$/, '')
  if (n.includes('chest') && n.includes('tricep')) return ['chest', 'arms']
  if (n.includes('back') && n.includes('bicep')) return ['back', 'arms']
  if (n.startsWith('push')) return ['chest', 'shoulders']
  if (n.startsWith('pull')) return ['back']
  if (n.startsWith('leg')) return ['legs']
  if (n.startsWith('shoulder')) return ['shoulders', 'abs']
  if (n.startsWith('full') || n.startsWith('custom')) return ['full']
  return []
}

// A simple mannequin (head, torso, arms, legs as rounded shapes) with the worked areas filled in. One tone, the app's accent; no colour emoji.
const ARM_L = <rect x="4.8" y="7.8" width="2.8" height="7.6" rx="1.4" transform="rotate(12 6.2 11.6)" />
const ARM_R = <rect x="16.4" y="7.8" width="2.8" height="7.6" rx="1.4" transform="rotate(-12 17.8 11.6)" />
const LEG_L = <rect x="8.5" y="16.6" width="3.1" height="6.4" rx="1.5" />
const LEG_R = <rect x="12.4" y="16.6" width="3.1" height="6.4" rx="1.5" />
const TORSO = <path d="M8.4 7.4H15.6Q16.3 7.4 16.2 8.1L15.3 15.1Q15.2 15.8 14.5 15.8H9.5Q8.8 15.8 8.7 15.1L7.8 8.1Q7.7 7.4 8.4 7.4Z" />
const FRONT = <><circle cx="12" cy="3.4" r="2.1" />{TORSO}{ARM_L}{ARM_R}{LEG_L}{LEG_R}</>
const HIT: Record<BodyPart, { front: ReactNode; back?: ReactNode }> = {
  chest: { front: <><path d="M8.9 8.2H11.6V11.6Q10.2 12.4 9.2 11.4Z" /><path d="M15.1 8.2H12.4V11.6Q13.8 12.4 14.8 11.4Z" /></> },
  shoulders: { front: <><circle cx="7.9" cy="8.9" r="1.9" /><circle cx="16.1" cy="8.9" r="1.9" /></> },
  abs: { front: <><rect x="9.8" y="11.6" width="1.9" height="1.5" rx=".6" /><rect x="12.3" y="11.6" width="1.9" height="1.5" rx=".6" /><rect x="9.8" y="13.7" width="1.9" height="1.4" rx=".6" /><rect x="12.3" y="13.7" width="1.9" height="1.4" rx=".6" /></> },
  legs: { front: <>{LEG_L}{LEG_R}</> },
  arms: { front: <>{ARM_L}{ARM_R}</> },
  back: { front: null, back: <><path d="M8.5 8.4 11.5 9.2V14.6L9.2 13.2Z" /><path d="M15.5 8.4 12.5 9.2V14.6L14.8 13.2Z" /></> },
  full: { front: <>{TORSO}{ARM_L}{ARM_R}{LEG_L}{LEG_R}</> },
}

/** A small body-part icon for a workout: who worked what. Shows nothing if the workout's name is not one we know. */
export function BodyIcon({ name, size = 28 }: { name: string; size?: number }) {
  const parts = bodyPartsFor(name)
  if (!parts.length) return null
  const back = parts.includes('back')
  return (
    <svg className="body-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label={`Worked: ${parts.join(' and ')}`} focusable="false">
      <g className="body-base" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".8">{FRONT}{back && <path d="M12 8.4V15" strokeDasharray="1 1.4" />}</g>
      <g className="body-hit" fill="var(--accent)" fillOpacity={parts.includes('full') ? 0.4 : 1}>
        {parts.map((part) => <g key={part}>{(back ? HIT[part].back ?? HIT[part].front : HIT[part].front) ?? null}</g>)}
      </g>
    </svg>
  )
}
