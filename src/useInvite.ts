import { useEffect, useState } from 'react'
import { useApp } from './store'
import { cloudEnabled, createInviteCode } from './cloud'

/**
 * Inviting a friend: the link to send, and the share / copy that sends it. A one-time code in the link makes the follow go both
 * ways when they join (supabase/invites.sql). It is made ahead of the tap, because the phone's share sheet only opens straight
 * from a tap. Without one (not set up yet, or offline) the plain link still works.
 */
export function useInvite() {
  const { data, userId } = useApp()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const codeKey = userId ? `wpf.inviteCode.${userId}` : ''
  const freshCode = () => {
    if (!userId || !cloudEnabled) return
    void createInviteCode(userId).then((c) => {
      setInviteCode(c)
      try { if (c) localStorage.setItem(codeKey, `${c}|${Date.now()}`); else localStorage.removeItem(codeKey) } catch { /* storage unavailable */ }
    }).catch(() => {})
  }
  useEffect(() => {
    if (!userId || !cloudEnabled) return
    let kept: string[] = []
    try { kept = (localStorage.getItem(codeKey) ?? '').split('|') } catch { /* storage unavailable */ }
    if (kept[0] && Date.now() - Number(kept[1]) < 7 * 86400000) setInviteCode(kept[0]) // a code nobody has been sent yet
    else freshCode()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  const usedCode = () => { setInviteCode(null); try { localStorage.removeItem(codeKey) } catch { /* storage unavailable */ } freshCode() }

  const link = `${location.origin}${location.pathname}#/join?${[userId ? `u=${userId}` : '', data.handle ? `ref=${encodeURIComponent(data.handle)}` : '', data.primary ? `crew=${encodeURIComponent(data.primary)}` : '', inviteCode ? `inv=${inviteCode}` : ''].filter(Boolean).join('&')}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); if (inviteCode) usedCode() }
    catch { setShowLink(true) }
  }
  const share = async () => {
    const text = 'Train with me on Will Power. Your workout. Your crew.'
    try { if (navigator.share) { await navigator.share({ title: 'Will Power', text, url: link }); if (inviteCode) usedCode(); return } } catch { /* cancelled */ }
    await copy()
  }
  return { link, inviteCode, copied, showLink, share, copy }
}
