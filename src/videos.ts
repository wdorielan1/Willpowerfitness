export const MAX_VIDEO_SECONDS = 30
/** Clips are deleted this many days after they are posted (the supabase/functions/expire-videos function does the deleting). */
export const KEEP_VIDEO_DAYS = 60
/** Whole days a clip posted at `ts` has left before it is deleted; 0 or less once it is gone. */
export const videoDaysLeft = (ts: number) => KEEP_VIDEO_DAYS - Math.floor((Date.now() - ts) / 86400000)
export const MAX_VIDEO_BYTES = 45 * 1024 * 1024
const KNOWN = /\.(mp4|m4v|mov|webm)$/i
const mb = (n: number) => `${Math.round(n / 1048576)} MB`
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/** `poster` is null and `seconds` is 0 when this device couldn't read the clip: it still posts, just without a cover or length. */
export interface PreparedVideo { file: File; type: string; poster: Blob | null; seconds: number }

/** Resolves when the event fires, rejects on the video's error or after `ms`. */
const once = (el: HTMLVideoElement, ok: string, ms: number) => new Promise<void>((res, rej) => {
  if (el.error) { rej(new Error('video error')); return } // it already failed to load, so don't wait for anything
  const done = (error?: Error) => { clearTimeout(timer); el.removeEventListener(ok, onOk); el.removeEventListener('error', onErr); if (error) rej(error); else res() }
  const onOk = () => done(), onErr = () => done(new Error('video error'))
  const timer = setTimeout(() => done(new Error('timed out')), ms)
  el.addEventListener(ok, onOk); el.addEventListener('error', onErr)
})

/** Length in seconds, or 0 when the browser can't tell. */
async function lengthOf(v: HTMLVideoElement): Promise<number> {
  try { if (v.readyState < 1) await once(v, 'loadedmetadata', 8000) } catch { return 0 }
  if (v.duration === Infinity) { // some recorders leave the length out; seeking far ahead makes the browser work it out
    try { const known = once(v, 'durationchange', 4000); v.currentTime = 1e101; await known; v.currentTime = 0 } catch { return 0 }
  }
  return Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0
}

/** A still from near the start, or null when this device can't draw one (iPhones are fussy about this). */
async function stillFrom(v: HTMLVideoElement, seconds: number): Promise<Blob | null> {
  try {
    if (v.readyState < 2) { try { await once(v, 'loadeddata', 2500) } catch { /* try playing it for a moment */ } }
    if (v.readyState < 2) { // iPhone Safari only loads frames once something plays, even muted
      try { await v.play(); await Promise.race([once(v, 'loadeddata', 2500), sleep(2500)]); v.pause() } catch { /* not allowed or can't play */ }
    }
    const at = Math.min(0.5, (seconds || 1) / 2)
    if (Math.abs(v.currentTime - at) > 0.05) { const seeked = once(v, 'seeked', 4000); v.currentTime = at; await seeked }
    const w = v.videoWidth, h = v.videoHeight
    if (!w || !h) return null
    const scale = Math.min(1, 1280 / Math.max(w, h))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale))
    const g = c.getContext('2d')
    if (!g) return null
    g.drawImage(v, 0, 0, c.width, c.height)
    const blob = await Promise.race([new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.82)), sleep(8000).then(() => null)])
    c.width = c.height = 0
    return blob
  } catch { return null }
}

/**
 * Check a picked clip and, where this device can, read its length and grab a cover frame. Clips are not re-encoded, so
 * the limits are what keep uploads small: up to 30 seconds and 45 MB, about what a phone camera makes at normal quality.
 * Only things that are certainly wrong stop a clip (not a video, too big, known to be too long). A phone that can't
 * preview the clip doesn't block it.
 */
export async function prepareVideo(file: File): Promise<PreparedVideo> {
  const type = file.type || (KNOWN.test(file.name) ? (/\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4') : '')
  if (!type.startsWith('video/')) throw new Error('Choose a video from your camera roll.')
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`That video is ${mb(file.size)} and the limit is ${mb(MAX_VIDEO_BYTES)}, about ${MAX_VIDEO_SECONDS} seconds from a phone camera at normal quality. Trim it or record at a lower quality, then try again.`)
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto'
  v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '')
  // on the page but out of sight: iPhone Safari won't decode frames for a video that isn't in the document
  Object.assign(v.style, { position: 'fixed', left: '-9999px', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' })
  document.body.appendChild(v)
  v.src = url
  try {
    const seconds = await lengthOf(v)
    if (seconds > MAX_VIDEO_SECONDS + 0.5) throw new Error(`That clip is ${Math.round(seconds)} seconds. Clips can be up to ${MAX_VIDEO_SECONDS} seconds, so trim it in your Photos app and try again.`)
    const poster = await stillFrom(v, seconds)
    return { file, type, poster, seconds: seconds ? Math.max(1, Math.round(seconds)) : 0 }
  } finally {
    try { v.pause() } catch { /* nothing playing */ }
    v.removeAttribute('src'); v.load(); v.remove(); URL.revokeObjectURL(url)
  }
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
