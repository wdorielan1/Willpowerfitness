import { Icon } from './icons'

/** A looping picture of the gestures on a set row, so nobody has to guess: right logs the set, left deletes it. */
export function SwipeDemo({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="swipe-demo">
      <div className="swipe-demo-stage" aria-hidden="true">
        <div className="swipe-demo-bg r"><Icon name="check" size={18} />Log set</div>
        <div className="swipe-demo-bg l">Delete<Icon name="trash" size={18} /></div>
        <div className="swipe-demo-row">
          <span className="n">1</span><span>135</span><span>10</span><span className="swipe-demo-check"><Icon name="check" size={16} /></span>
          <i className="swipe-demo-finger" />
        </div>
      </div>
      <div className="swipe-demo-caption">
        <span><b>Swipe right</b> to log a set. <b>Swipe left</b> to delete it.</span>
        <button type="button" onClick={onDismiss}>Got it</button>
      </div>
    </div>
  )
}
