import { useState } from 'react'
import { useApp } from '../store'
import { postMessageCloud, type LiveCrew } from '../cloud'
import { todayISO } from '../engine'
import type { Message } from '../types'

const QUESTIONS = [
  'What is the one song that guarantees a good set?', 'What got you into lifting?', 'What is your favorite lift and why?',
  'What is the best gym advice you ever got?', 'What is your go-to pre-workout meal?', 'What is a small win you are proud of this week?',
  'What time did your alarm go off today?', 'What is your current lift goal?', 'Which exercise do you secretly dread?',
  'What is your favorite way to recover?', 'What is one thing you do to stay consistent?', 'Coffee before training: yes or no?',
  'What is your favorite post-workout meal?', 'Who inspires you to keep showing up?', 'What is your best PR so far?',
  'What is one habit you want to build this month?', 'Leg day: love it or hate it?', 'What do you listen to while you train?',
  'What is the most embarrassing gym moment you can share?', 'What would you tell yourself on day one?', 'Morning, lunch, or evening lifts?',
  'What is your favorite cardio and why?', 'What is one exercise you want to master?', 'How do you get through a day you do not want to train?',
  'What is your favorite gym snack?', 'What is the heaviest thing you have ever lifted?', 'What does your ideal rest day look like?',
  'What are you most grateful for in your fitness journey?', 'If you could train with anyone, who?', 'What is your next fitness milestone?',
]
export const questionFor = (date: string) => QUESTIONS[Math.floor(new Date(date + 'T12:00:00').getTime() / 86400000) % QUESTIONS.length]
export const QOTD_PREFIX = /^\[QOTD:[\d-]+\]\s*/

/** Optional question of the day for a crew. Skippable. */
export default function Qotd({ crewId, live }: { crewId: string; live: LiveCrew | null }) {
  const { data, update, userId } = useApp()
  const today = todayISO()
  const key = `${crewId}|${today}`
  const state = data.qotd[key] ?? {}
  const [text, setText] = useState('')
  const q = questionFor(today)
  const tag = `[QOTD:${today}]`
  const answers = (live ? live.messages.map((m) => ({ id: m.id, who: m.who, text: m.text })) : data.messages.filter((m) => m.community === crewId).map((m) => ({ id: m.id, who: m.who, text: m.text })))
    .filter((m) => m.text.startsWith(tag))

  const post = () => {
    const t = text.trim()
    if (!t) return
    if (userId) void postMessageCloud(crewId, userId, data.name || 'Member', `${tag} ${t}`).then(() => live?.refresh())
    else {
      const m: Message = { id: String(Date.now()), community: crewId, who: data.name || 'You', text: `${tag} ${t}`, ts: Date.now(), mine: true }
      update((d) => ({ ...d, messages: [m, ...d.messages] }))
    }
    update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { answer: t } } }))
    setText('')
  }
  const skip = () => update((d) => ({ ...d, qotd: { ...d.qotd, [key]: { skipped: true } } }))

  return (
    <section className="card">
      <div className="row"><span className="tag accent">Question of the day</span>{!state.answer && !state.skipped && <button className="ghost small-btn" onClick={skip}>Skip</button>}</div>
      <h3>{q}</h3>
      {!state.answer && !state.skipped && (
        <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional. Say hi to your crew" /><button className="primary" onClick={post}>Post</button></div>
      )}
      {state.skipped && <p className="small mute">Skipped for today. You can still read what others said.</p>}
      {answers.slice(0, 6).map((m) => (
        <div key={m.id} className="small"><b>{m.who}:</b> {m.text.replace(QOTD_PREFIX, '')}</div>
      ))}
      {answers.length === 0 && <p className="small mute">No answers yet. Be the first.</p>}
    </section>
  )
}
