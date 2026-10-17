import { useState } from 'react'

const AIS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Claude', url: 'https://claude.ai/new' },
] as const

/**
 * "Do you use AI?" in one tap: copies the prompt and opens the chat. The prompt itself stays out of the way unless someone
 * wants to read it (or copy it for a different AI). Nothing is sent from Will Power; the person pastes it into the chat themselves.
 */
export function AiPrompt({ prompt, title, hint }: { prompt: string; title: string; hint: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [shown, setShown] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); setState('copied'); return true } catch { setState('failed'); setShown(true); return false }
  }
  const go = (url: string) => {
    // open the chat in the same tap (browsers block it otherwise), and copy at the same time
    const copying = copy()
    window.open(url, '_blank', 'noopener')
    return copying
  }

  return (
    <section className="card ai-prompt">
      <h3>{title}</h3>
      <p className="small mute">{hint}</p>
      <div className="ai-actions">
        <button type="button" className="primary" onClick={() => void go(AIS[0].url)}>Copy and open {AIS[0].name}</button>
        <button type="button" className="ghost" onClick={() => void go(AIS[1].url)}>Copy and open {AIS[1].name}</button>
      </div>
      {state === 'copied' && <p className="small ok-text" role="status">Copied. Paste it into the chat, add your info, then copy the answer and paste it below.</p>}
      {state === 'failed' && <p className="small err" role="alert">Couldn’t copy by itself. Open “Show the prompt” and copy it yourself.</p>}
      <button type="button" className="quiet-action ai-show" aria-expanded={shown} onClick={() => setShown(!shown)}>{shown ? 'Hide the prompt' : 'Show the prompt'}</button>
      {shown && <>
        <pre className="ai-prompt-text">{prompt}</pre>
        <button type="button" className="ghost small-btn" onClick={() => void copy()}>Copy only (for another AI)</button>
      </>}
    </section>
  )
}
