import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoneSheet } from '../../src/WorkoutShare'
import * as cards from '../../src/shareCard'
import { previousBest } from '../../src/workoutCardDesign'
import { fixture, noPrFixture } from '../share-sticker/fixture'
import type { Settings } from '../../src/types'
import '../../src/styles.css'

// This dev-only page uses invented data and never connects to a backend.
const params = new URLSearchParams(location.search)
const summary = params.has('no-pr') ? noPrFixture : fixture
const posts: Blob[] = []
const shareCalls: ShareData[] = []
Object.assign(window, { __cards: { cards, fixture, noPrFixture, previousBest, posts, shareCalls } })
Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { shareCalls.push(data) } })
function Harness() {
  const [settings, setSettings] = useState<Partial<Settings>>({})
  return <DoneSheet summary={summary} settings={settings} onPrefs={(patch) => setSettings((s) => ({ ...s, ...patch }))} onClose={() => {}}
    crewPost={params.has('crew') ? { crews: [{ id: 'test-crew', name: 'Test crew' }], done: [], onPost: async (blob) => { if (params.has('fail')) return 'Test crew could not receive this card.'; posts.push(blob); return null } } : undefined} />
}
createRoot(document.getElementById('root')!).render(<Harness />)
