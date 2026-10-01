import { useApp } from './store'
import { todayISO } from './engine'

export function useCheckin() {
  const { data, update } = useApp()
  const today = todayISO()
  const c = data.checkins[today] ?? {}
  const set = (patch: { going?: boolean; done?: boolean }) =>
    update((d) => ({ ...d, checkins: { ...d.checkins, [today]: { ...d.checkins[today], ...patch } } }))
  return {
    going: !!c.going || !!c.done,
    done: !!c.done,
    imGoing: () => set({ going: true }),
    complete: () => set({ going: true, done: true }),
    undo: () => set({ done: false }),
  }
}
