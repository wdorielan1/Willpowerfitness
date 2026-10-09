import type { ReactNode } from 'react'

/** Bottom sheet used for pickers. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 40, display: 'grid', alignItems: 'end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--line)', padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '82dvh', overflowY: 'auto', maxWidth: 560, width: '100%', margin: '0 auto', display: 'grid', gap: 12 }}>
        <div className="row"><h2>{title}</h2><button className="ghost small-btn" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  )
}
