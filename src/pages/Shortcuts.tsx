import { useState } from 'react'

interface Sc { title: string; phrase: string; url?: string; how: string[] }
const base = () => `${location.origin}${location.pathname}#/go/`

const SHORTCUTS: Sc[] = [
  { title: 'Morning gym wake-up call', phrase: 'Wake me up for the gym', url: 'workout', how: ['Add action “Speak Text”: “Time to show up. Your crew is waiting.”', 'Add action “Play Sound” or “Set Volume” to 80%', 'Add “Open URLs” with the link below', 'Automation: Time of Day → your workout time → Run Shortcut'] },
  { title: 'What workout do I have today?', phrase: 'What’s my workout', url: 'workout', how: ['Add “Open URLs” with the link below', 'Name the shortcut “What’s my workout” so Siri responds to it'] },
  { title: 'I’m going to the gym', phrase: 'I’m going to the gym', url: 'going', how: ['Add “Open URLs” with the link below', 'This marks you as “Going” in your crew'] },
  { title: 'Workout complete', phrase: 'Workout complete', url: 'complete', how: ['Add “Open URLs” with the link below', 'Counts toward your streak and group completion'] },
  { title: 'Log cardio', phrase: 'Log cardio', url: 'cardio', how: ['Add “Open URLs” with the link below'] },
  { title: 'Log body weight', phrase: 'Log my weight', url: 'weight', how: ['Add “Open URLs” with the link below'] },
  { title: 'Reminder if I don’t check in', phrase: '(automation)', how: ['Shortcuts → Automation → Time of Day → 30 minutes after your workout time', 'Add “Show Notification”: “You said you’d go. Still on?”', 'Add “Open URLs” with the “I’m going” link'] },
  { title: 'Start my workout', phrase: 'Start my workout', url: 'start', how: ['Add “Open URLs” with the link below', 'Marks you as going and starts the workout timer'] },
  { title: 'Arrive at the gym → start workout', phrase: '(automation)', url: 'arrive', how: ['Shortcuts → Automation → New → Arrive → choose your gym', 'Set it to Run Immediately (or Ask Before Running)', 'Add “Open URLs” with the link below', 'The app starts your workout only if you are in a crew and your crew time is within 90 minutes. Otherwise it just opens your workout. Your phone does the location check, the app never tracks you.'] },
  { title: 'Open today’s workout', phrase: 'Open my workout', url: 'workout', how: ['Add “Open URLs” with the link below'] },
]

export default function Shortcuts() {
  const [copied, setCopied] = useState('')
  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); setCopied(t) } catch { setCopied('') }
  }
  return (
    <>
      <div><h1>Siri & Shortcuts</h1><p className="mute">Wake up. Get nudged. Check in with your voice.</p></div>
      <section className="card hero">
        <h3>Install on iPhone</h3>
        <ol className="steps">
          <li className="step">Open this app in Safari → Share → <b>Add to Home Screen</b></li>
          <li className="step">Open Apple’s Shortcuts app and tap + for each shortcut below</li>
          <li className="step">Paste the link into “Open URLs”, then name it with the Siri phrase</li>
        </ol>
        <p className="small mute">One-tap downloadable .shortcut files are coming with the native iOS release. For now, each shortcut is a 2-step recipe.</p>
      </section>
      {SHORTCUTS.map((s) => (
        <section key={s.title} className="card">
          <div className="row"><h3>{s.title}</h3><span className="tag accent">“{s.phrase}”</span></div>
          <ol className="steps">{s.how.map((h) => <li className="step" key={h}>{h}</li>)}</ol>
          {s.url && <div className="row"><code className="small" style={{ wordBreak: 'break-all' }}>{base() + s.url}</code><button className="small-btn ghost" onClick={() => copy(base() + s.url)}>{copied === base() + s.url ? 'Copied' : 'Copy'}</button></div>}
        </section>
      ))}
    </>
  )
}
