import { useApp } from './store'
import { streak, todayISO } from './engine'
import { pushCheckin } from './cloud'

export function useCheckin() {
  const { data, update, userId } = useApp()
  const today = todayISO()
  const c = data.checkins[today] ?? {}
  const set = (patch: { going?: boolean; done?: boolean }) => {
    const merged = { ...data.checkins[today], ...patch }
    update((d) => ({ ...d, checkins: { ...d.checkins, [today]: { ...d.checkins[today], ...patch } } }))
    if (userId && data.primary) {
      const next = { ...data, checkins: { ...data.checkins, [today]: merged } }
      void pushCheckin(data.primary, userId, data.name || 'Member', { going: !!merged.going || !!merged.done, done: !!merged.done }, streak(next))
    }
  }
  const start = () => {
    set({ going: true })
    update((d) => (d.started[today] ? d : { ...d, started: { ...d.started, [today]: Date.now() } }))
  }
  return {
    start,
    started: data.started[today] as number | undefined,
    going: !!c.going || !!c.done,
    done: !!c.done,
    imGoing: () => set({ going: true }),
    complete: () => set({ going: true, done: true }),
    undo: () => set({ done: false }),
    reset: () => set({ going: false, done: false }),
  }
}
