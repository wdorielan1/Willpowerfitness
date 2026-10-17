import { Icon } from './icons'
import { iconFor, pictureFor, pictureUrl } from './cardioMedia'
import { sportOf } from './sports'

/**
 * The picture for the chosen machine or activity: a two-frame photo that flips like a lift's Motion preview, or a group icon for the
 * activities the photo database has nothing for. `paused` holds the flip (a paused timer). Nothing shows for "Other" or an old kind.
 */
export function CardioPicture({ kind, mode, paused }: { kind: string; mode?: string; paused?: boolean }) {
  const pic = pictureFor(kind, mode)
  if (pic) {
    return (
      <div className={`exloop cardio-pic${paused ? ' is-paused' : ''}`} role="img" aria-label={`Photo of ${pic.name}`}>
        <img src={pictureUrl(pic.slug, 0)} alt="" loading="lazy" /><img className="exloop-b" src={pictureUrl(pic.slug, 1)} alt="" loading="lazy" />
      </div>
    )
  }
  const icon = iconFor(kind)
  if (!icon) return null
  return <div className="cardio-pic-icon"><span aria-hidden="true"><Icon name={icon} size={26} /></span><span>{sportOf(kind)?.cat}</span></div>
}
