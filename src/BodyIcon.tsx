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

// Plain emoji for now (there is no emoji for a chest or a back, so these are the closest).
const emojiFor = (parts: BodyPart[]) => (parts.includes('legs') ? '🦵' : parts.includes('back') ? '🧗' : parts.includes('abs') ? '🔥' : parts.includes('full') ? '🏋️' : '💪')

/** A small emoji for a workout's body part. Shows nothing if the workout's name is not one we know. */
export function BodyIcon({ name, size = 28 }: { name: string; size?: number }) {
  const parts = bodyPartsFor(name)
  if (!parts.length) return null
  return <span className="body-icon" role="img" aria-label={`Worked: ${parts.join(' and ')}`} style={{ fontSize: Math.round(size * 0.8), lineHeight: 1 }}>{emojiFor(parts)}</span>
}
